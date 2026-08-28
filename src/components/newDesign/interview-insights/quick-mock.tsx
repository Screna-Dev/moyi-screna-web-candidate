import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Coins, Loader2 } from 'lucide-react';
import { getCommunityCompanies, getPostOptions } from '@/services/CommunityService';
import { createQuickMockInterview, parseQuickMockError } from '@/services/InterviewServices';
import { getProfile, getProfilePreferences } from '@/services/ProfileServices';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import {
  DEFAULT_LEVEL,
  LEVELS,
  companySlug,
  inferLevel,
  latestExperienceTitle,
  matchRoleToOptions,
  type Level,
} from '@/utils/quickMockDefaults';

// ============================================================================
// Quick Mock — one-click launcher on the Questions surfaces.
//
// Spec: "Quick Mock One-Click Redesign" (Shelley Xu, 2026-08-05), with the
// 2026-08-20 product decisions applied.
//   • QuickMockWidget     — questions directory: pick a company, press start.
//   • CompanyMockLauncher — company page header: one click, company pre-filled.
//
// Company is the only decision. Role is the one the user picked in their profile,
// difficulty is the default level (see AUTO_LEVEL_ENABLED), and both controls
// live behind "Adjust settings". Each surface creates the session through
// POST /training-plans/interviews/quick-mock and hands the LiveKit credentials to
// /ai-mock — the same chain the retired /quick-mock page used.
//
// The UI is the figma-make design as-is; no controls were added for parameters
// the design doesn't show. Round length has no design surface and is fixed; the
// question count is not a request parameter at all (the backend derives it from
// the duration), so it is copy only — both are in the handoff notes.
// ============================================================================

// Every Quick Mock is the same shape: 3 questions, ~15 minutes (product decision,
// 2026-08-20). The API takes minutes, not questions, so only the duration is
// actually sent; the count is descriptive.
const DEFAULT_DURATION = 15;
const DEFAULT_QUESTION_COUNT = 3;

// Quick Mock is audio-only and pre-deducts 1 credit per minute (same rate as
// /session-confirm), so a round costs DEFAULT_DURATION credits.
const CREDITS_PER_MIN = 1;

const FALLBACK_ROLE = 'Software Engineer';

// Used only until GET /community/companies and GET /community/posts/options
// resolve (or if either fails).
const FALLBACK_COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'OpenAI', 'Anthropic', 'NVIDIA',
  'Databricks', 'ByteDance', 'Stripe', 'Uber', 'Airbnb', 'Figma', 'Notion',
];
const FALLBACK_ROLES = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer',
  'Data Scientist', 'ML Engineer', 'Product Manager', 'Designer', 'Business Analyst',
];

// ─── Company / role vocabularies ──────────────────────────────────────────────
function useQuickMockOptions() {
  const [companies, setCompanies] = useState<string[]>(FALLBACK_COMPANIES);
  const [roles, setRoles] = useState<string[]>(FALLBACK_ROLES);

  useEffect(() => {
    let cancelled = false;
    getCommunityCompanies()
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        const list: string[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.companies) ? data.companies : [];
        if (list.length && !cancelled) setCompanies([...new Set(list)]);
      })
      .catch(() => { /* keep fallbacks */ });

    type Group = { category: string; options: string[] };
    getPostOptions()
      .then((res) => {
        const data = res?.data?.data ?? res?.data;
        if (!data || cancelled) return;
        const groups: Group[] = Array.isArray(data.roles) ? data.roles : [];
        const flat = [...new Set(groups.flatMap((g) => g.options ?? []))];
        if (flat.length) setRoles(flat);
      })
      .catch(() => { /* keep fallbacks */ });

    return () => { cancelled = true; };
  }, []);

  return { companies, roles };
}

// ─── Auto-filled defaults (spec §2 / §3) ──────────────────────────────────────
//
// Role: the target role the user picked in their profile
// (GET /profile/preferences → `target_roles`), snapped onto the question bank's
// vocabulary. Titles parsed off the resume are the next-best source, then
// `fallbackRole` (the company's most common role on a company page).
//
// Difficulty: the API's `level`, mapped from GET /profile/resume signals — but
// the mapping is gated off for now (spec Open Question #1), so everyone starts at
// Intermediate.
function useAutoDefaults(roleOptions: string[], fallbackRole?: string) {
  // Roles the user selected for themselves — authoritative over anything inferred.
  const [profileRoles, setProfileRoles] = useState<string[]>([]);
  // Titles straight off the resume — used when the profile has no target role.
  const [resumeTitles, setResumeTitles] = useState<string[]>([]);
  const [level, setLevel] = useState<Level>(DEFAULT_LEVEL);
  const [levelSource, setLevelSource] = useState<'auto' | 'default'>('default');
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfilePreferences()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? res.data;
        const roles: string[] = Array.isArray(data?.target_roles) ? data.target_roles : [];
        setProfileRoles(roles.filter((r) => typeof r === 'string' && r.trim()));
      })
      .catch(() => { /* fall through to the resume titles */ });
    return () => { cancelled = true; };
  }, []);

  // Resume signals for the level mapping, and to tell "no resume" apart from
  // "resume we couldn't read" for the hint under the button.
  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data ?? res.data;
        const resume = data?.structured_resume ?? data;
        const latestTitle = latestExperienceTitle(resume?.experience);
        const jobTitles: string[] = Array.isArray(resume?.job_titles) ? resume.job_titles : [];
        // Most recent role first, then the parsed job_titles list, then the headline.
        setResumeTitles(
          [latestTitle, ...jobTitles, resume?.profile?.headline].filter(
            (t): t is string => typeof t === 'string' && t.trim().length > 0
          )
        );
        const inferred = inferLevel({
          totalYearsExperience: resume?.profile?.total_years_experience ?? null,
          latestTitle: latestTitle ?? jobTitles[0] ?? null,
        });
        setHasResume(inferred.reason !== 'no_resume');
        setLevel(inferred.level);
        setLevelSource(inferred.source === 'auto' ? 'auto' : 'default');
      })
      .catch(() => { if (!cancelled) setHasResume(false); });
    return () => { cancelled = true; };
  }, []);

  // Resolution order: the user's own profile selection → titles on the resume →
  // the company's most common role → a generic default.
  const role = useMemo(() => {
    for (const picked of profileRoles) {
      const matched = matchRoleToOptions(picked, roleOptions);
      if (matched) return { value: matched, source: 'profile' as const };
    }
    // A selected role that isn't in the bank vocabulary is still the user's own
    // answer, so prefer it over anything inferred.
    if (profileRoles[0]) return { value: profileRoles[0], source: 'profile' as const };

    for (const title of resumeTitles) {
      const matched = matchRoleToOptions(title, roleOptions);
      if (matched) return { value: matched, source: 'resume' as const };
    }

    const fallback = matchRoleToOptions(fallbackRole, roleOptions) ?? fallbackRole;
    if (fallback) return { value: fallback, source: 'fallback' as const };
    if (roleOptions.includes(FALLBACK_ROLE)) return { value: FALLBACK_ROLE, source: 'fallback' as const };
    return { value: roleOptions[0] ?? FALLBACK_ROLE, source: 'fallback' as const };
  }, [profileRoles, resumeTitles, roleOptions, fallbackRole]);

  return {
    role: role.value,
    roleSource: role.source,
    level,
    levelIsFromResume: levelSource === 'auto',
    hasResume,
  };
}

// ─── Session creation + handoff to /ai-mock ───────────────────────────────────
function useQuickMockLauncher() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (opts: {
      company: string;
      role: string;
      level: Level;
      /** Where `role` came from: 'profile' / 'resume' / 'fallback' / 'manual'. */
      roleSource: string;
      levelIsAuto: boolean;
      settingsAdjusted: boolean;
    }) => {
      setStarting(true);
      setError(null);

      // quick_mock_started —— spec §6。question_count 上报的是产品默认值 3：
      // 前端无法指定题数，实际题数由后端按时长推导，等 API 支持 questionCount 再改为真实值。
      safeCapture(posthog, EVENTS.QUICK_MOCK_STARTED, {
        company_id: companySlug(opts.company),
        company_name: opts.company,
        role: opts.role,
        role_source: opts.roleSource,
        difficulty: opts.level,
        difficulty_source: opts.levelIsAuto ? 'auto' : 'manual',
        question_count: DEFAULT_QUESTION_COUNT,
        question_count_is_requested: false,
        duration_minutes: DEFAULT_DURATION,
        settings_adjusted: opts.settingsAdjusted,
      });

      try {
        const level = opts.level;
        const res = await createQuickMockInterview({
          company: opts.company,
          role: opts.role,
          level,
          durationMinutes: DEFAULT_DURATION,
        });
        const d = res.data?.data ?? res.data;
        const url = d?.url ?? d?.liveKitUrl;
        const token = d?.token ?? d?.liveKitToken;
        if (!url || !token) {
          throw new Error('Session did not return valid credentials. Please try again.');
        }
        const prefetchedSession = {
          liveKitUrl: url,
          liveKitToken: token,
          maxInterviewDuration: d?.max_interview_duration ?? null,
        };
        const params = new URLSearchParams({
          interviewId: String(d?.session_id ?? ''),
          difficulty: String(level).toLowerCase(),
          duration: String(DEFAULT_DURATION),
          mode: 'voice',
        });
        // source —— 供 /ai-mock 的 mock_started / mock_completed 上报入口漏斗
        navigate(`/ai-mock?${params.toString()}`, {
          state: { prefetchedSession, source: 'quick_ai_mock' },
        });
      } catch (err) {
        setError(parseQuickMockError(err));
        setStarting(false);
      }
      // On success we navigate away; `starting` stays true so the button remains
      // disabled through the route transition.
    },
    [navigate, posthog]
  );

  return { start, starting, error, setError };
}

// Credits are pre-deducted when the session is created, so the price is shown
// before the user commits: a 15-minute round costs 15 credits.
function useCreditCheck() {
  const { planData, isLoading } = useUserPlan();
  const cost = DEFAULT_DURATION * CREDITS_PER_MIN;
  const balance = planData.permanentCreditBalance;
  return { cost, balance, hasEnough: isLoading || balance >= cost };
}

// ─── Shared bits ──────────────────────────────────────────────────────────────
function QMCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="var(--primary)" />
      <path d="M4.6 8.1L6.75 10.25L11.35 5.65" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.55" />
    </svg>
  );
}

// Only rendered after a failed start (422 not_enough_insights, validation, or a
// short credit balance) — the design has no error state, and a dead button is
// worse than a line of text.
function StartError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6,
        padding: '10px 12px', borderRadius: 10,
        background: 'hsl(0 84% 60% / 0.06)', border: '1px solid hsl(0 84% 60% / 0.25)',
      }}
    >
      <AlertCircle style={{ width: 15, height: 15, color: 'hsl(0 72% 45%)', flexShrink: 0, marginTop: 1 }} />
      <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: '17px', color: 'hsl(0 72% 38%)', whiteSpace: 'pre-line' }}>
        {message}
      </p>
    </div>
  );
}

function insufficientCreditsMessage(cost: number, balance: number) {
  return `This mock costs ${cost} credits and you have ${balance}. Add credits in Settings → Billing to start.`;
}

// The price of a round, shown wherever a mock can be started. `cost` comes from
// useCreditCheck so the number can never drift from what gets deducted.
function CreditLine({ cost }: { cost: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted-foreground)' }}>
      <Coins style={{ width: 12, height: 12, color: '#F59E0B', flexShrink: 0 }} />
      Uses {cost} credit{cost !== 1 ? 's' : ''} ({DEFAULT_DURATION} min · {CREDITS_PER_MIN}/min)
    </span>
  );
}

// Searchable single-select dropdown — the design's control for Company and Role.
function OptionSelect({
  value, options, placeholder, onChange, searchPlaceholder, variant = 'filled',
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
  searchPlaceholder: string;
  variant?: 'filled' | 'outline';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const filtered = useMemo(
    () => (query.trim() ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query]
  );

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
        style={{
          width: '100%', height: variant === 'filled' ? 44 : 42,
          background: variant === 'filled' ? 'var(--secondary)' : 'var(--card)',
          borderRadius: variant === 'filled' ? 10 : 9,
          border: '1px solid var(--border)', padding: '0 12px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
        }}
      >
        <span style={{
          fontSize: 13, color: value ? 'var(--foreground)' : 'var(--muted-foreground)',
          fontWeight: value ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value || placeholder}
        </span>
        <span style={{ fontSize: 14, color: 'var(--muted-foreground)', flexShrink: 0, marginLeft: 8 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60,
          background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)',
          boxShadow: '0 4px 16px rgba(29,42,68,0.10)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%', height: 34, borderRadius: 7, border: '1px solid var(--border)',
                padding: '0 10px', fontFamily: 'var(--font-sans)', fontSize: 12,
                color: 'var(--foreground)', background: 'var(--input-background)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0 6px' }}>
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: '8px 12px', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--muted-foreground)' }}>
                No results
              </p>
            )}
            {filtered.map((opt) => {
              const active = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                    background: active ? 'hsl(221 91% 60% / 0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13,
                    color: active ? 'var(--primary)' : 'var(--foreground)', fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--secondary)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AutoBadge() {
  return (
    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 9, color: 'var(--primary)', background: 'hsl(221 91% 60% / 0.08)', borderRadius: 999, padding: '2px 6px' }}>
      AUTO
    </span>
  );
}

// Role + Difficulty — the only two editable parameters, shared by the widget's
// "Adjust settings" panel and the company page's launcher window so both offer
// exactly the same controls.
function RoleLevelFields({
  roles, role, level, roleIsAuto, levelIsAuto, roleHint, levelHint, onRoleChange, onLevelChange,
}: {
  roles: string[];
  role: string;
  level: Level;
  roleIsAuto: boolean;
  levelIsAuto: boolean;
  roleHint: string;
  levelHint: string;
  onRoleChange: (v: string) => void;
  onLevelChange: (v: Level) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--foreground)' }}>Role</span>
          {roleIsAuto && <AutoBadge />}
        </div>
        <OptionSelect
          variant="outline"
          value={role}
          options={roles}
          placeholder="Select a role"
          onChange={onRoleChange}
          searchPlaceholder="Search roles…"
        />
        <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 10, color: 'var(--muted-foreground)', lineHeight: '14px' }}>
          {roleHint}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--foreground)' }}>Difficulty</span>
          {levelIsAuto && <AutoBadge />}
        </div>
        <OptionSelect
          variant="outline"
          value={level}
          options={LEVELS}
          placeholder="Select a difficulty"
          onChange={(v) => onLevelChange(v as Level)}
          searchPlaceholder="Search difficulty…"
        />
        <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 10, color: 'var(--muted-foreground)', lineHeight: '14px' }}>
          {levelHint}
        </p>
      </div>
    </div>
  );
}

// Hints shared by both surfaces, so the wording can't drift apart.
function roleHintFor(source: string) {
  if (source === 'profile') return 'The target role you picked in your profile';
  if (source === 'resume') return 'Suggested from your latest resume';
  return 'Pick the role you want to be interviewed for';
}
function levelHintFor(isFromResume: boolean) {
  return isFromResume
    ? 'Matched to the experience on your resume'
    : 'Intermediate by default — upload a resume to personalize it';
}

// ════════════════════════════════════════════════════════════════════════════
// QuickMockWidget — questions directory. Company → Start mock (spec §5).
// ════════════════════════════════════════════════════════════════════════════
export function QuickMockWidget() {
  const posthog = usePostHog();
  const { companies, roles } = useQuickMockOptions();
  const auto = useAutoDefaults(roles);
  const { start, starting, error, setError } = useQuickMockLauncher();
  const { cost, balance, hasEnough } = useCreditCheck();

  const [company, setCompany] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Overrides from "Adjust settings"; null means "still on the auto value".
  const [roleOverride, setRoleOverride] = useState<string | null>(null);
  const [levelOverride, setLevelOverride] = useState<Level | null>(null);

  // Drafts, so the panel's Cancel discards edits (design has Cancel / Apply).
  const [draftRole, setDraftRole] = useState<string | null>(null);
  const [draftLevel, setDraftLevel] = useState<Level | null>(null);

  const role = roleOverride ?? auto.role;
  const level = levelOverride ?? auto.level;
  const settingsAdjusted = roleOverride !== null || levelOverride !== null;

  const canStart = Boolean(company) && Boolean(role) && !starting;

  useEffect(() => {
    safeCapture(posthog, EVENTS.MOCK_QUICK_VIEWED, { entry: 'questions_directory' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSettings = () => {
    if (!settingsOpen) {
      setDraftRole(roleOverride);
      setDraftLevel(levelOverride);
      // quick_mock_settings_opened —— spec §6
      safeCapture(posthog, EVENTS.QUICK_MOCK_SETTINGS_OPENED, {
        company_id: company ? companySlug(company) : null,
      });
    }
    setSettingsOpen((o) => !o);
  };

  // quick_mock_settings_changed —— spec §6，逐项上报 old → new
  const trackChange = (field: string, oldValue: unknown, newValue: unknown) => {
    if (oldValue === newValue) return;
    safeCapture(posthog, EVENTS.QUICK_MOCK_SETTINGS_CHANGED, {
      field_changed: field,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      company_id: company ? companySlug(company) : null,
    });
  };

  const handleStart = () => {
    if (!canStart) return;
    if (!hasEnough) {
      setError(insufficientCreditsMessage(cost, balance));
      return;
    }
    start({
      company,
      role,
      level,
      roleSource: roleOverride !== null ? 'manual' : auto.roleSource,
      levelIsAuto: levelOverride === null && auto.levelIsFromResume,
      settingsAdjusted,
    });
  };

  // Confirmation line under the button (spec §5). Names the real source of each
  // value: the profile role is the user's own pick, not something we inferred.
  const summary = (() => {
    const roleLabel = roleOverride !== null
      ? role
      : auto.roleSource === 'profile' ? `From your profile · ${role}`
      : auto.roleSource === 'resume' ? `From your resume · ${role}`
      : role;
    const levelLabel = levelOverride === null && auto.levelIsFromResume
      ? level
      : `${level} (default)`;
    return `${roleLabel} · ${levelLabel}`;
  })();

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="flex flex-col md:flex-row md:items-center gap-8 md:gap-20"
        style={{
          background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)',
          padding: '28px 24px', overflow: 'visible',
        }}
      >
        {/* Left — unchanged by the redesign: the checklist that lowers anxiety */}
        <div className="flex flex-col gap-1 shrink-0">
          <div className="self-start flex items-center" style={{ background: 'hsl(221 91% 60% / 0.08)', borderRadius: 999, padding: '3px 8px' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, color: 'var(--primary)', letterSpacing: '0.07em' }}>
              AI QUICK MOCK
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 18, color: 'var(--foreground)', letterSpacing: '-0.15px', lineHeight: '24px' }}>
            Practice anytime, anywhere
          </p>
          <div className="flex flex-col gap-1.5 mt-2">
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--muted-foreground)', lineHeight: '16px' }}>
              What you'll get
            </p>
            {/* Fixed shape for every Quick Mock: 3 questions, ~15 minutes. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 20, rowGap: 6, justifyContent: 'start' }}>
              {[
                'Company-specific questions',
                `${DEFAULT_QUESTION_COUNT} Questions by default`,
                'Structured feedback report',
                `~${DEFAULT_DURATION}mins / round`,
              ].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <QMCheckIcon />
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: 'var(--foreground)', lineHeight: '18px', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="block md:hidden" style={{ height: 1, background: 'var(--border)' }} />
        <div className="hidden md:block shrink-0 self-stretch" style={{ width: 1, background: 'var(--border)' }} />

        {/* Right — company + start, nothing else (spec §5) */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--foreground)', lineHeight: '16px' }}>
            Company
          </p>

          <div className="flex flex-wrap gap-2.5 items-center">
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <OptionSelect
                value={company}
                options={companies}
                placeholder="Select a company"
                onChange={(v) => { setCompany(v); setError(null); }}
                searchPlaceholder="Search companies…"
              />
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              style={{
                height: 44, padding: '0 18px', borderRadius: 10, border: 'none',
                background: company ? 'var(--primary)' : 'hsl(221 91% 60% / 0.5)',
                cursor: canStart ? 'pointer' : 'default',
                fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13, color: '#fff',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              {starting ? (
                <>
                  Starting…
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                </>
              ) : (
                'Start mock  →'
              )}
            </button>
          </div>

          {/* Auto-detected values, shown as confirmation (spec §5) */}
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <span className="truncate" style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--muted-foreground)' }}>
              {summary}
            </span>
            <button
              type="button"
              onClick={toggleSettings}
              className="shrink-0"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--primary)', whiteSpace: 'nowrap' }}
            >
              {`Adjust settings  ${settingsOpen ? '▴' : '▾'}`}
            </button>
          </div>

          {/* Price of the round — credits are pre-deducted on start. */}
          <CreditLine cost={cost} />

          {/* Spec §3 edge case: no resume → Intermediate, with a prompt to upload one. */}
          {auto.hasResume === false && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted-foreground)' }}>
              <Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 500 }}>Upload your resume</Link>
              {' '}for a personalized difficulty.
            </span>
          )}
          {error && <StartError message={error} />}
        </div>
      </div>

      {/* Adjust settings — the controls the one-click flow hides (spec §2) */}
      {settingsOpen && (
        <div
          style={{
            marginTop: 6, background: 'var(--card)', borderRadius: 14,
            border: '1px solid var(--border)',
            boxShadow: '0px 3px 4px rgba(29,42,68,0.06), 0px 14px 14px rgba(29,42,68,0.12)',
            padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, color: 'var(--foreground)', lineHeight: '20px' }}>
              Personalized settings
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--muted-foreground)', lineHeight: '16px' }}>
              {auto.roleSource === 'profile'
                ? 'Taken from your profile and resume.'
                : 'Set the role and difficulty for this mock.'}
            </p>
          </div>
          <div style={{ height: 1, background: 'var(--border)' }} />

          <RoleLevelFields
            roles={roles}
            role={draftRole ?? auto.role}
            level={draftLevel ?? auto.level}
            roleIsAuto={draftRole === null && auto.roleSource !== 'fallback'}
            levelIsAuto={draftLevel === null && auto.levelIsFromResume}
            roleHint={roleHintFor(draftRole === null ? auto.roleSource : 'manual')}
            levelHint={levelHintFor(draftLevel === null && auto.levelIsFromResume)}
            onRoleChange={(v) => { trackChange('role', draftRole ?? auto.role, v); setDraftRole(v); }}
            onLevelChange={(v) => { trackChange('difficulty', draftLevel ?? auto.level, v); setDraftLevel(v); }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 10, color: 'var(--muted-foreground)' }}>
              Changed something by mistake?
            </span>
            <button
              type="button"
              onClick={() => { setDraftRole(null); setDraftLevel(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--primary)' }}
            >
              Reset to auto match
            </button>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              style={{ height: 36, width: 84, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--foreground)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setRoleOverride(draftRole); setLevelOverride(draftLevel); setSettingsOpen(false); }}
              style={{ height: 36, width: 118, borderRadius: 8, border: 'none', background: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: '#fff' }}
            >
              Apply settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CompanyMockLauncher — company page header (spec §5).
//
// The company is already known, so clicking opens a small window with the
// auto-filled Role and Difficulty (same controls as the widget's Adjust
// settings) and one Start button.
// ════════════════════════════════════════════════════════════════════════════
export function CompanyMockLauncher({
  company,
  companyId,
  fallbackRole,
}: {
  company: string;
  /** Route slug, for analytics. Derived from the name when absent. */
  companyId?: string;
  /** The company's most common role — spec's fallback when the profile yields none. */
  fallbackRole?: string;
}) {
  const posthog = usePostHog();
  const { roles } = useQuickMockOptions();
  const auto = useAutoDefaults(roles, fallbackRole);
  const { start, starting, error, setError } = useQuickMockLauncher();
  const { cost, balance, hasEnough } = useCreditCheck();

  const [open, setOpen] = useState(false);
  const [roleOverride, setRoleOverride] = useState<string | null>(null);
  const [levelOverride, setLevelOverride] = useState<Level | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const role = roleOverride ?? auto.role;
  const level = levelOverride ?? auto.level;

  // Outside clicks dismiss the window — except mid-create, when hiding it would
  // hide the pending state too.
  useEffect(() => {
    if (!open || starting) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, starting]);

  const handleCtaClick = () => {
    if (starting) return;
    // mock_company_cta_clicked —— spec §6
    safeCapture(posthog, EVENTS.MOCK_COMPANY_CTA_CLICKED, {
      source: 'company_header',
      company_id: companyId ?? companySlug(company),
      company_name: company,
    });
    setError(null);
    setOpen((o) => !o);
  };

  // quick_mock_settings_changed —— spec §6，逐项上报 old → new
  const trackChange = (field: string, oldValue: unknown, newValue: unknown) => {
    if (oldValue === newValue) return;
    safeCapture(posthog, EVENTS.QUICK_MOCK_SETTINGS_CHANGED, {
      field_changed: field,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      company_id: companyId ?? companySlug(company),
    });
  };

  const handleStart = () => {
    if (starting || !role) return;
    if (!hasEnough) {
      setError(insufficientCreditsMessage(cost, balance));
      return;
    }
    start({
      company,
      role,
      level,
      roleSource: roleOverride !== null ? 'manual' : auto.roleSource,
      levelIsAuto: levelOverride === null && auto.levelIsFromResume,
      settingsAdjusted: roleOverride !== null || levelOverride !== null,
    });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleCtaClick}
        disabled={starting}
        title={`Starts a ${DEFAULT_DURATION}-minute mock · ${cost} credits`}
        className="mock-cta-btn flex items-center justify-center gap-2 w-full text-sm font-semibold"
        style={{
          padding: '10px 22px',
          background: 'linear-gradient(135deg, #F59E0B 0%, #EAB308 100%)',
          color: '#FFFFFF', border: 'none', borderRadius: 12,
          boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
          cursor: starting ? 'default' : 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
          transition: 'box-shadow 0.15s, transform 0.15s', whiteSpace: 'nowrap',
          opacity: starting ? 0.8 : 1,
        }}
        onMouseEnter={(e) => {
          if (starting) return;
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(245,158,11,0.5)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(245,158,11,0.3)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {starting ? (
          <>
            Starting…
            <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, lineHeight: 1 }}>▶</span>
            Mock {company} Questions
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60,
            // Stay inside the viewport on narrow screens.
            width: 'min(320px, calc(100vw - 48px))',
            background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)',
            boxShadow: '0px 3px 4px rgba(29,42,68,0.06), 0px 14px 14px rgba(29,42,68,0.12)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--foreground)' }}>
              Mock {company} questions
            </p>
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--muted-foreground)', lineHeight: '16px' }}>
              {DEFAULT_QUESTION_COUNT} questions · ~{DEFAULT_DURATION} min · drawn from real {company} interviews
            </p>
          </div>
          <div style={{ height: 1, background: 'var(--border)' }} />

          <RoleLevelFields
            roles={roles}
            role={role}
            level={level}
            roleIsAuto={roleOverride === null && auto.roleSource !== 'fallback'}
            levelIsAuto={levelOverride === null && auto.levelIsFromResume}
            roleHint={roleHintFor(roleOverride === null ? auto.roleSource : 'manual')}
            levelHint={levelHintFor(levelOverride === null && auto.levelIsFromResume)}
            onRoleChange={(v) => { trackChange('role', role, v); setRoleOverride(v); }}
            onLevelChange={(v) => { trackChange('difficulty', level, v); setLevelOverride(v); }}
          />

          {auto.hasResume === false && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted-foreground)' }}>
              <Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 500 }}>Upload your resume</Link>
              {' '}for a personalized difficulty.
            </span>
          )}

          {/* Price of the round — this window is the confirmation step, so the
              cost sits directly above the button that spends it. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <CreditLine cost={cost} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted-foreground)' }}>
              Balance {balance}
            </span>
          </div>
          {error && <StartError message={error} />}

          <button
            type="button"
            onClick={handleStart}
            disabled={starting || !role}
            style={{
              height: 40, borderRadius: 10, border: 'none',
              background: role ? 'var(--primary)' : 'hsl(221 91% 60% / 0.5)',
              cursor: starting || !role ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {starting ? (
              <>
                Starting…
                <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
              </>
            ) : (
              'Start mock  →'
            )}
          </button>
        </div>
      )}

      {/* Errors from a click that never opened the window (e.g. short balance). */}
      {!open && error && <StartError message={error} />}
    </div>
  );
}
