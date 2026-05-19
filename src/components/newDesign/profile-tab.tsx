import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Sparkles, Check, Pencil, X, Plus, Search, ArrowRight,
  UploadCloud, FileText, Eye, Download, ShieldCheck, Settings,
  BadgeCheck, Building2, Coins, Lock,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ApplicationProfileContent } from './application-profile-tab';
import { getProfile, getUserInsights, saveUserInsights, uploadResume, updateProfile, getPersonalInfo, getJobsPreferences, upsertJobsPreferences } from '../../services/ProfileServices';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog';
import { PageHead } from '@/components/newDesign/page-head';
import { T, panelTitleStyle, primaryButtonStyle } from '@/lib/design-tokens';

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
};

// ── Static data ──────────────────────────────────────────────────────────────

const PROFILE_ROLE_CATEGORIES = [
  { id: 'product', label: 'Product', roles: [
    { id: 'pm',  label: 'Product Manager'           },
    { id: 'apm', label: 'Associate Product Manager' },
    { id: 'gpm', label: 'Growth Product Manager'    },
    { id: 'tpm', label: 'Technical Product Manager' },
  ]},
  { id: 'engineering', label: 'Engineering', roles: [
    { id: 'swe', label: 'Software Engineer'    },
    { id: 'fe',  label: 'Frontend Engineer'    },
    { id: 'be',  label: 'Backend Engineer'     },
    { id: 'fse', label: 'Full Stack Engineer'  },
  ]},
  { id: 'data', label: 'Data & AI', roles: [
    { id: 'ds',     label: 'Data Scientist'             },
    { id: 'da',     label: 'Data Analyst'               },
    { id: 'mle',    label: 'Machine Learning Engineer'  },
    { id: 'ai-eng', label: 'AI Engineer'                },
  ]},
  { id: 'design', label: 'Design & Research', roles: [
    { id: 'pd',  label: 'Product Designer' },
    { id: 'uxd', label: 'UX Designer'      },
    { id: 'uxr', label: 'UX Researcher'    },
  ]},
];


const COMPANY_SUGGESTIONS = [
  'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb',
  'Uber', 'Lyft', 'Figma', 'Notion', 'Linear', 'Vercel', 'Coinbase', 'OpenAI',
  'Canva', 'Atlassian', 'Dropbox', 'Slack', 'Zoom', 'Snowflake', 'Databricks',
  'Ramp', 'Rippling', 'Brex', 'Scale AI', 'Anthropic', 'Mistral', 'Hugging Face',
];

const COMPANY_CATEGORIES = [
  { id: 'faang',   label: 'FAANG / Big Tech',  desc: 'Google, Meta, Apple, Amazon…'  },
  { id: 'unicorn', label: 'Unicorn / Scale-up', desc: 'Stripe, OpenAI, Airbnb…'       },
  { id: 'mid',     label: 'Mid-size Company',   desc: 'Figma, Notion, Linear…'        },
  { id: 'startup', label: 'Startup',            desc: 'Early-stage & fast-growing'    },
  { id: 'open',    label: 'Open to all',        desc: 'No preference on size'         },
];

// Maps between API companyTypes values and internal category IDs
const API_TYPE_TO_CATEGORY: Record<string, string> = {
  FAANG: 'faang',
  LARGE: 'unicorn',
  MID_SIZE: 'mid',
  STARTUP: 'startup',
};
const CATEGORY_TO_API_TYPE: Record<string, string> = {
  faang: 'FAANG',
  unicorn: 'LARGE',
  mid: 'MID_SIZE',
  startup: 'STARTUP',
};

type UserInsights = {
  role?: string;
  goalClarityLevel?: string;
  companyTypes?: string[];
  companies?: string[];
  jobSearchStage?: string;
  priorityNeeds?: string[];
};

const VISA_OPTIONS = [
  { id: 'OPT',        label: 'OPT (F-1)',          sub: 'Requires OPT/H1B sponsorship' },
  { id: 'CPT',        label: 'CPT',                sub: 'Requires CPT sponsorship'     },
  { id: 'H1B',        label: 'H-1B',               sub: 'Employer sponsored'           },
  { id: 'F1',         label: 'F1 Student Visa',    sub: 'Student visa'                 },
  { id: 'Green Card', label: 'Permanent Resident', sub: 'Green Card holder'            },
  { id: 'US Citizen', label: 'US Citizen',         sub: 'No sponsorship required'      },
  { id: 'Other',      label: 'Other',              sub: ''                             },
];

// ── ProfileCoreContent ────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className ?? ''}`} />;
}

function ProfileCoreContent({ userData }: { userData: UserData | null }) {
  const expLevel = userData?.experienceLevel || '';
  const completedSections = 3;
  const totalSections = 5;
  const completePct = Math.round((completedSections / totalSections) * 100);

  const { subscription, credits, isLoading: isSubLoading } = useSubscription();

  // ── Loading states ──
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [loadingResume, setLoadingResume] = useState(true);

  // ── Personal info state (from /profile/personal-info) ──
  const [personalName, setPersonalName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [timezone, setTimezone] = useState('');

  const displayName = personalName || (userData?.firstName
    ? `${userData.firstName}${userData.lastName ? ' ' + userData.lastName : ''}`
    : '');
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // ── Resume state ──
  const [resumeState, setResumeState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [resumeProgress, setResumeProgress] = useState(0);
  const [resumeFile, setResumeFile] = useState<{ name: string; size: string } | null>(null);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Target Role state ──
  const [roleMode, setRoleMode] = useState<'view' | 'edit'>('view');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleQuery, setRoleQuery] = useState('');

  // ── Work Authorization state ──
  const [editingVisa, setEditingVisa] = useState(false);
  const [visaStatus, setVisaStatus] = useState<string>('');
  const [showVisaDialog, setShowVisaDialog] = useState(false);
  const [pendingVisaStatus, setPendingVisaStatus] = useState<string>('');
  const [structuredResume, setStructuredResume] = useState<Record<string, unknown> | null>(null);

  // ── User insights (kept for merging on save) ──
  const [userInsights, setUserInsights] = useState<UserInsights | null>(null);

  // ── Target Companies state (driven by /profile/preferences) ──
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [specificCompanies, setSpecificCompanies] = useState<string[]>([]);
  const [companyQuery, setCompanyQuery] = useState('');
  const [editingCompanies, setEditingCompanies] = useState(false);

  // ── Saved targetRoles from /profile/preferences ──
  const [targetRoles, setTargetRoles] = useState<string[]>([]);

  const processResumeFile = async (file: File) => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.pdf', '.doc', '.docx'].includes(ext) || file.size > 5 * 1024 * 1024) return;
    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB · Just uploaded`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB · Just uploaded`;
    setResumeFile({ name: file.name, size: sizeStr });
    setResumeState('uploading');
    setResumeProgress(0);

    // Animate progress while upload is in flight
    let p = 0;
    resumeTimerRef.current = setInterval(() => {
      // Slow down as it approaches 90% — waits for server response
      p += p < 70 ? Math.random() * 12 + 6 : Math.random() * 2 + 0.5;
      if (p < 90) setResumeProgress(Math.round(p));
    }, 120);

    try {
      const res = await uploadResume(file);
      const data = res.data?.data ?? res.data;
      clearInterval(resumeTimerRef.current!);
      setResumeProgress(100);

      if (data?.resume_path) {
        setResumePath(data.resume_path);
        const displayName = data?.structured_resume?.profile?.full_name
          ? `${data.structured_resume.profile.full_name.replace(/ /g, '_')}_Resume.pdf`
          : file.name;
        setResumeFile({ name: displayName, size: sizeStr });
      }

      // Save structured resume to profile
      if (data?.structured_resume) {
        setStructuredResume(data.structured_resume as Record<string, unknown>);
        const vs = data.structured_resume?.profile?.visa_status;
        if (vs) setVisaStatus(vs);
        try {
          await updateProfile(data.structured_resume);
        } catch {
          // Upload succeeded; silent fail on save — profile still usable
        }
        // If visa status is missing, prompt user
        if (!vs) {
          setPendingVisaStatus('');
          setShowVisaDialog(true);
        }
      }

      setTimeout(() => setResumeState('success'), 300);
    } catch {
      clearInterval(resumeTimerRef.current!);
      setResumeState('idle');
      setResumeFile(null);
    }
  };

  useEffect(() => {
    // Fetch resume data
    getProfile().then((res: { data: { data?: { resume_path?: string; structured_resume?: { profile?: { full_name?: string; visa_status?: string } } } } }) => {
      const data = res.data?.data ?? res.data;
      if (data?.structured_resume) {
        setStructuredResume(data.structured_resume as Record<string, unknown>);
        const vs = data.structured_resume?.profile?.visa_status;
        if (vs) setVisaStatus(vs);
      }
      if (data?.resume_path) {
        const path = data.resume_path as string;
        setResumePath(path);
        const filename = path.split('/').pop() || 'Resume.pdf';
        const displayName = data?.structured_resume?.profile?.full_name
          ? `${data.structured_resume.profile.full_name.replace(/ /g, '_')}_Resume.pdf`
          : filename;
        setResumeFile({ name: displayName, size: 'Stored in your profile' });
        setResumeState('success');
      }
    }).catch(() => {}).finally(() => setLoadingResume(false));

    // Fetch apply preferences (target roles, company size categories, target companies, work authorization)
    getJobsPreferences().then((res: { data: { data?: { candidate_apply_preferences?: { target_roles?: string[]; company_size_categories?: string[]; target_companies?: string[]; work_authorization?: string } } } }) => {
      const prefs = res.data?.data?.candidate_apply_preferences ?? {};
      if (prefs.target_roles) setTargetRoles(prefs.target_roles);
      if (prefs.company_size_categories) {
        setSelectedCategories(
          prefs.company_size_categories.map((t: string) => {
            const lower = t.toLowerCase();
            return API_TYPE_TO_CATEGORY[t] ?? API_TYPE_TO_CATEGORY[lower] ?? lower;
          }).filter(Boolean)
        );
      }
      if (prefs.target_companies) setSpecificCompanies(prefs.target_companies);
      if (prefs.work_authorization) setVisaStatus(prefs.work_authorization);
    }).catch(() => {}).finally(() => setLoadingPreferences(false));

    // Fetch user insights (role display + company types fallback)
    getUserInsights().then((res: { data: { data?: UserInsights } }) => {
      const data = (res.data?.data ?? res.data) as UserInsights;
      setUserInsights(data);
      if (data?.role) {
        const allRoles = PROFILE_ROLE_CATEGORIES.flatMap(c => c.roles);
        const match = allRoles.find(r => r.label.toLowerCase() === data.role!.toLowerCase());
        if (match) setSelectedRoleId(match.id);
      }
    }).catch(() => {});

    // Fetch personal info (name, email, timezone)
    getPersonalInfo().then((res: { data: { data?: { name?: string; email?: string; timezone?: string } } }) => {
      const data = res.data?.data ?? res.data;
      if (data?.name) setPersonalName(data.name);
      if (data?.email) setPersonalEmail(data.email);
      if (data?.timezone) setTimezone(data.timezone);
    }).catch(() => {}).finally(() => setLoadingPersonal(false));

    return () => { if (resumeTimerRef.current) clearInterval(resumeTimerRef.current); };
  }, []);

  const filteredRoleCategories = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    if (!q) return PROFILE_ROLE_CATEGORIES;
    return PROFILE_ROLE_CATEGORIES
      .map(cat => ({ ...cat, roles: cat.roles.filter(r => r.label.toLowerCase().includes(q)) }))
      .filter(cat => cat.roles.length > 0);
  }, [roleQuery]);

  // Label of the currently highlighted option in the edit UI (used when saving)
  const selectedRoleLabel = PROFILE_ROLE_CATEGORIES.flatMap(c => c.roles).find(r => r.id === selectedRoleId)?.label ?? '';

  // Source-of-truth role for display — prefer preferences targetRoles, then insights role
  const displayRole = (targetRoles.length > 0 ? targetRoles[0] : null) ?? userInsights?.role ?? selectedRoleLabel;

  const totalCompanyCount = selectedCategories.length + specificCompanies.length;

  const filteredSuggestions = COMPANY_SUGGESTIONS.filter(
    c => !specificCompanies.includes(c) && c.toLowerCase().includes(companyQuery.toLowerCase())
  );

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const savePreferences = (patch: { targetRoles?: string[]; companySizeCategories?: string[]; targetCompanies?: string[]; workAuthorization?: string }) => {
    const apiCompanyTypes = (patch.companySizeCategories ?? selectedCategories.map(c => CATEGORY_TO_API_TYPE[c]).filter(Boolean)) as string[];
    const wa = patch.workAuthorization ?? visaStatus;
    upsertJobsPreferences({
      candidate_apply_preferences: {
        target_roles:            patch.targetRoles    ?? targetRoles,
        company_size_categories: apiCompanyTypes,
        target_companies:        patch.targetCompanies ?? specificCompanies,
        ...(wa ? { work_authorization: wa } : {}),
      },
    }).catch(() => {});
  };

  const handleCompanyDone = () => {
    setEditingCompanies(false);
    setCompanyQuery('');
    const apiCompanyTypes = selectedCategories.map(c => CATEGORY_TO_API_TYPE[c]).filter(Boolean);
    savePreferences({ companySizeCategories: apiCompanyTypes, targetCompanies: specificCompanies });
  };

  const handleVisaDone = () => {
    setEditingVisa(false);
    if (!visaStatus) return;
    savePreferences({ workAuthorization: visaStatus });
    if (structuredResume) {
      const updated = {
        ...structuredResume,
        profile: { ...(structuredResume.profile as Record<string, unknown>), visa_status: visaStatus },
      };
      updateProfile(updated).then(() => setStructuredResume(updated)).catch(() => {});
    }
  };

  const handleVisaModalSave = () => {
    if (!pendingVisaStatus) return;
    setVisaStatus(pendingVisaStatus);
    setShowVisaDialog(false);
    savePreferences({ workAuthorization: pendingVisaStatus });
    const base = structuredResume ?? {};
    const updated = {
      ...base,
      profile: { ...(base.profile as Record<string, unknown>), visa_status: pendingVisaStatus },
    };
    updateProfile(updated).then(() => setStructuredResume(updated)).catch(() => {});
  };

  const handleRoleConfirm = () => {
    setRoleMode('view');
    const newRole = selectedRoleLabel;
    const newRoles = newRole ? [newRole] : targetRoles;
    setTargetRoles(newRoles);
    setUserInsights(prev => ({ ...(prev ?? {}), role: newRole }));
    saveUserInsights({ ...(userInsights ?? {}), role: newRole }).catch(() => {});
    savePreferences({ targetRoles: newRoles });
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 pt-2">
        <div className="shrink-0">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg ring-4 ring-primary/15">
            {initials}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-[Playfair_Display] text-foreground mb-0.5">{displayName}</h2>
          <p className="text-sm text-muted-foreground mb-4">{displayRole} · {expLevel}</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completePct}%` }}
                transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completePct}% complete</span>
          </div>
        </div>
      </div>

      {/* ── Row 1: Resume + Target Role ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Resume Card */}
        <div
          className="lg:col-span-7 overflow-hidden transition-colors"
          style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12 }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <h3 style={panelTitleStyle}>Resume</h3>
              {resumeState === 'success' && (
                <span className="flex items-center gap-1 text-xs text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Active
                </span>
              )}
            </div>
            {resumeState === 'success' && (
              <button
                onClick={() => resumeInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />Replace Resume
              </button>
            )}
          </div>

          <div className="px-5 py-4 flex flex-col gap-3">
            {loadingResume && (
              <div className="flex items-center gap-3 px-3 py-3 rounded-md border border-border bg-secondary/30 animate-pulse">
                <SkeletonBlock className="w-8 h-8 rounded-md shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <SkeletonBlock className="h-3.5 w-40" />
                  <SkeletonBlock className="h-3 w-28" />
                </div>
              </div>
            )}
            <AnimatePresence mode="wait">
              {!loadingResume && resumeState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processResumeFile(f); }}
                  className={`rounded-lg border-[1.5px] transition-all duration-200 flex flex-col items-center justify-center py-10 cursor-pointer ${
                    isDragging
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_3px_hsl(221,91%,60%,0.12)]'
                      : 'border-dashed border-border hover:border-primary/50 hover:bg-secondary/50'
                  }`}
                  onClick={() => resumeInputRef.current?.click()}
                >
                  <motion.div
                    animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      isDragging ? 'bg-primary shadow-[0_6px_20px_rgba(67,118,248,0.3)]' : 'bg-secondary border border-border'
                    }`}
                  >
                    <UploadCloud className={`w-5 h-5 transition-colors ${isDragging ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </motion.div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isDragging ? 'Release to upload' : 'Drag & drop your resume here'}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">PDF or DOCX · Max 5MB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); resumeInputRef.current?.click(); }}
                    style={primaryButtonStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
                  >
                    <FileText className="w-3.5 h-3.5" />Choose File to Upload
                  </button>
                </motion.div>
              )}

              {!loadingResume && resumeState === 'uploading' && resumeFile && (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-0.5 truncate max-w-[240px]">{resumeFile.name}</p>
                  <p className="text-xs text-muted-foreground mb-4">Uploading…</p>
                  <div className="w-full max-w-[280px]">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Processing</span>
                      <span className="text-xs font-medium text-primary">{resumeProgress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${resumeProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {!loadingResume && resumeState === 'success' && resumeFile && (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-secondary/50">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{resumeFile.name}</div>
                      <div className="text-xs text-muted-foreground">{resumeFile.size}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => resumePath && window.open(resumePath, '_blank')}
                        disabled={!resumePath}
                        className="text-xs text-primary hover:opacity-70 transition-opacity font-medium flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Eye className="w-3.5 h-3.5" />Preview
                      </button>
                      <button
                        onClick={() => {
                          if (!resumePath) return;
                          const a = document.createElement('a');
                          a.href = resumePath;
                          a.download = resumeFile?.name || 'Resume.pdf';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        disabled={!resumePath}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />Download
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 px-1">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                      className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0"
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <p className="text-xs text-muted-foreground flex-1">Resume is active — Screna uses it for every application & practice session.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setResumeState('idle'); setTimeout(() => processResumeFile(f), 50); } e.target.value = ''; }}
            />

            {!loadingResume && resumeState === 'idle' && (
              <p className="text-xs text-muted-foreground text-center">Keep your resume current — we use it for every application.</p>
            )}
          </div>
        </div>

        {/* Target Role Card */}
        <div
          className="lg:col-span-5 overflow-hidden transition-colors"
          style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12 }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <h3 style={panelTitleStyle}>Target Role</h3>
              {!loadingPreferences && roleMode === 'view' && displayRole && (
                <span className="flex items-center gap-1 text-xs text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Set
                </span>
              )}
            </div>
            {!loadingPreferences && (roleMode === 'view' ? (
              <button
                onClick={() => { setRoleMode('edit'); setRoleQuery(''); }}
                className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />Edit
              </button>
            ) : (
              <button onClick={() => setRoleMode('view')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />Cancel
              </button>
            ))}
          </div>

          {loadingPreferences && (
            <div className="px-5 py-4 flex flex-col gap-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-4 w-32" />
              <div className="flex flex-col gap-2 mt-2">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-full" />
              </div>
            </div>
          )}

          {!loadingPreferences && roleMode === 'view' && (
            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Current Target</span>
                <div className="text-lg font-medium text-foreground">
                  {displayRole || <span className="text-muted-foreground text-base">Not set</span>}
                </div>
                {expLevel && <div className="text-sm text-muted-foreground mt-0.5">{expLevel}</div>}
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Used for</span>
                <div className="flex flex-col gap-2">
                  {[
                    { emoji: '🎯', label: 'AI mock interview tailoring' },
                    { emoji: '💼', label: 'Job matching & applications' },
                    { emoji: '🤝', label: 'Mentor pairing recommendations' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-sm">{item.emoji}</span>
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setRoleMode('edit'); setRoleQuery(''); }}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-md border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
              >
                Update Target Role <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!loadingPreferences && roleMode === 'edit' && (
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={roleQuery}
                  onChange={e => setRoleQuery(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto flex flex-col gap-3 pr-1">
                {filteredRoleCategories.map(cat => (
                  <div key={cat.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.roles.map(role => {
                        const sel = selectedRoleId === role.id;
                        return (
                          <button
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                              sel
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-foreground hover:border-primary/50 hover:text-primary'
                            }`}
                          >
                            {role.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleRoleConfirm}
                disabled={!selectedRoleLabel}
                className="disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ ...primaryButtonStyle, width: '100%', justifyContent: 'center', height: 36, marginTop: 4 }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = T.blue600; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.blue500; }}
              >
                Confirm Role <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Target Companies + Work Authorization ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Target Companies */}
        <div
          className="lg:col-span-7 overflow-hidden transition-colors"
          style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12 }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <h3 style={panelTitleStyle}>Target Companies</h3>
              {totalCompanyCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedCategories.length > 0 && `${selectedCategories.length} ${selectedCategories.length === 1 ? 'type' : 'types'}`}
                  {selectedCategories.length > 0 && specificCompanies.length > 0 && ' · '}
                  {specificCompanies.length > 0 && `${specificCompanies.length} specific`}
                </span>
              )}
            </div>
            <button
              onClick={() => editingCompanies ? handleCompanyDone() : setEditingCompanies(true)}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                editingCompanies
                  ? 'border-border text-muted-foreground hover:text-foreground'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              }`}
            >
              {editingCompanies
                ? <><Check className="w-3.5 h-3.5" />Done</>
                : <><Plus className="w-3.5 h-3.5" />Add company</>}
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {loadingPreferences && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <SkeletonBlock className="h-8 w-32 rounded-full" />
                  <SkeletonBlock className="h-8 w-24 rounded-full" />
                  <SkeletonBlock className="h-8 w-28 rounded-full" />
                </div>
                <SkeletonBlock className="h-3 w-64 mt-1" />
              </div>
            )}
            <AnimatePresence>
              {!loadingPreferences && editingCompanies && (
                <motion.div
                  key="edit-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 pb-1">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                        Company type
                        <span className="ml-1.5 font-normal normal-case tracking-normal">(select all that apply)</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {COMPANY_CATEGORIES.map(({ id, label, desc }) => {
                          const sel = selectedCategories.includes(id);
                          return (
                            <button
                              key={id}
                              onClick={() => toggleCategory(id)}
                              title={desc}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                                sel
                                  ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
                                  : 'border-border text-foreground hover:border-primary/40 hover:text-primary bg-card'
                              }`}
                            >
                              {sel && <Check className="w-3 h-3 shrink-0" />}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or search a specific company</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          value={companyQuery}
                          onChange={e => setCompanyQuery(e.target.value)}
                          placeholder="e.g. Figma, Rippling, Databricks…"
                          className="w-full pl-8 pr-10 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const trimmed = companyQuery.trim();
                              if (trimmed && !specificCompanies.includes(trimmed)) {
                                setSpecificCompanies(prev => [...prev, trimmed]);
                                setCompanyQuery('');
                              }
                            }
                          }}
                        />
                        {companyQuery.trim() && !specificCompanies.includes(companyQuery.trim()) && (
                          <button
                            onClick={() => {
                              const trimmed = companyQuery.trim();
                              setSpecificCompanies(prev => [...prev, trimmed]);
                              setCompanyQuery('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-3 h-3" />Add
                          </button>
                        )}
                      </div>
                      {(companyQuery.trim().length > 0 ? filteredSuggestions : COMPANY_SUGGESTIONS.filter(c => !specificCompanies.includes(c))).slice(0, 12).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(companyQuery.trim().length > 0 ? filteredSuggestions : COMPANY_SUGGESTIONS.filter(c => !specificCompanies.includes(c))).slice(0, 12).map(company => (
                            <button
                              key={company}
                              onClick={() => { setSpecificCompanies(prev => [...prev, company]); setCompanyQuery(''); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 hover:border-primary transition-colors"
                            >
                              <Plus className="w-3 h-3" />{company}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!loadingPreferences && totalCompanyCount > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(catId => {
                    const cat = COMPANY_CATEGORIES.find(c => c.id === catId);
                    if (!cat) return null;
                    return (
                      <div key={catId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-sm font-medium text-primary">
                        <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        {cat.label}
                        {editingCompanies && (
                          <button onClick={() => toggleCategory(catId)} className="ml-0.5 text-primary/60 hover:text-destructive transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {specificCompanies.map(company => (
                    <div key={company} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary text-sm font-medium text-foreground">
                      <span className="w-4 h-4 rounded-sm bg-card border border-border flex items-center justify-center text-xs font-medium shrink-0">
                        {company[0]}
                      </span>
                      {company}
                      {editingCompanies && (
                        <button onClick={() => setSpecificCompanies(prev => prev.filter(c => c !== company))} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!editingCompanies && (
                  <p className="text-xs text-muted-foreground -mt-1">Screna targets outreach and applies to open roles at these companies on your behalf.</p>
                )}
              </>
            ) : (
              !loadingPreferences && !editingCompanies && (
                <div className="py-4 text-center">
                  <p className="text-sm font-medium text-foreground mb-1">No target companies added</p>
                  <p className="text-sm text-muted-foreground mb-4">Add companies to activate outreach.</p>
                  <button
                    onClick={() => setEditingCompanies(true)}
                    style={{ ...primaryButtonStyle, margin: '0 auto' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
                  >
                    Add target companies <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Work Authorization */}
        <div
          className="lg:col-span-5 overflow-hidden transition-colors"
          style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12 }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <h3 style={panelTitleStyle}>Work Authorization</h3>
            {!loadingPreferences && (
              <button
                onClick={() => editingVisa ? handleVisaDone() : setEditingVisa(true)}
                className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                  editingVisa
                    ? 'border-border text-muted-foreground hover:text-foreground'
                    : 'border-primary/30 text-primary hover:bg-primary/5'
                }`}
              >
                {editingVisa ? <><Check className="w-3.5 h-3.5" />Done</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
              </button>
            )}
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {loadingPreferences && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <SkeletonBlock className="w-8 h-8 rounded-md shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-3 w-28" />
                  </div>
                </div>
                <SkeletonBlock className="h-3 w-56" />
              </div>
            )}
            <AnimatePresence mode="wait">
              {!loadingPreferences && editingVisa ? (
                <motion.div key="visa-edit" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="flex flex-col gap-2">
                  {VISA_OPTIONS.map(({ id, label, sub }) => {
                    const sel = visaStatus === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setVisaStatus(id)}
                        className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg border text-left transition-all ${
                          sel ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]' : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${sel ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          sel ? 'border-primary bg-primary' : 'border-border bg-card'
                        }`}>
                          {sel && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="visa-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      {visaStatus ? (
                        <>
                          <span className="text-sm font-medium text-foreground">{VISA_OPTIONS.find(v => v.id === visaStatus)?.label ?? visaStatus}</span>
                          {VISA_OPTIONS.find(v => v.id === visaStatus)?.sub && (
                            <>
                              <span className="text-sm text-muted-foreground mx-1.5">·</span>
                              <span className="text-sm text-muted-foreground">{VISA_OPTIONS.find(v => v.id === visaStatus)?.sub}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not set — click Edit to add</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">This affects which jobs we match you to.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <div
        className="overflow-hidden transition-colors"
        style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12 }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 style={panelTitleStyle}>Basic Info</h3>
          <Link to="/settings">
            <button className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors">
              <Settings className="w-3.5 h-3.5" />Change in Settings
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Full Name</div>
            {loadingPersonal
              ? <SkeletonBlock className="h-4 w-32" />
              : <div className="text-sm font-medium text-foreground mb-2">{displayName || <span className="text-muted-foreground">—</span>}</div>
            }
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Email Address</div>
            {loadingPersonal
              ? <SkeletonBlock className="h-4 w-48" />
              : <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm text-foreground truncate">
                    {personalEmail || <span className="text-muted-foreground">—</span>}
                  </span>
                  {personalEmail && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      <BadgeCheck className="w-3 h-3" />Verified
                    </span>
                  )}
                </div>
            }
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Timezone</div>
            {loadingPersonal
              ? <SkeletonBlock className="h-4 w-40 mb-2" />
              : <div className="text-sm text-foreground font-medium mb-2">{timezone || <span className="text-muted-foreground font-normal">—</span>}</div>
            }
            <div className="flex items-center gap-2 flex-wrap">
              {isSubLoading ? (
                <>
                  <SkeletonBlock className="h-5 w-20 rounded-full" />
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                </>
              ) : (
                <>
                  {subscription?.plan && (
                    <span className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/15 border border-amber-400/50 shadow-[0_0_10px_hsl(38_95%_55%/0.18)]">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm shrink-0">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      </span>
                      <span className="text-xs font-semibold text-amber-600 tracking-wide capitalize">{subscription.plan}</span>
                    </span>
                  )}
                  <button className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
                    <Coins className="w-3 h-3" />{credits.totalBalance} credits
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ── Visa Status Dialog (shown after resume upload when visa is missing) ── */}
      <Dialog open={showVisaDialog} onOpenChange={setShowVisaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Your Work Authorization</DialogTitle>
            <DialogDescription>
              Your resume didn't include a visa status. Please select your current work authorization so we can match you with the right employers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {VISA_OPTIONS.map(({ id, label, sub }) => {
              const sel = pendingVisaStatus === id;
              return (
                <button
                  key={id}
                  onClick={() => setPendingVisaStatus(id)}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg border text-left transition-all ${
                    sel ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${sel ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    sel ? 'border-primary bg-primary' : 'border-border bg-card'
                  }`}>
                    {sel && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setShowVisaDialog(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleVisaModalSave}
              disabled={!pendingVisaStatus}
              className="disabled:opacity-40 disabled:cursor-not-allowed"
              style={primaryButtonStyle}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = T.blue600; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = T.blue500; }}
            >
              <Check className="w-3.5 h-3.5" />Save & Continue
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── ProfileTab (with sub-tabs) ────────────────────────────────────────────────

export function ProfileTab({ userData }: { userData: UserData | null }) {
  const navigate = useNavigate();
  const { isElite, isLoading: isPlanLoading } = useUserPlan();
  const [subTab, setSubTab] = useState<'profile' | 'application'>('profile');

  // If a non-Premium user somehow lands on the application sub-tab (e.g. plan
  // downgrades while open), bounce them back to Profile.
  useEffect(() => {
    if (!isPlanLoading && !isElite && subTab === 'application') {
      setSubTab('profile');
    }
  }, [isElite, isPlanLoading, subTab]);

  return (
    <div className="flex flex-col gap-6">

      <PageHead
        title="Profile"
        subtitle="Your career profile, target roles, and saved preferences."
      />

      {/* Second-level tabs */}
      <div className="flex items-center border-b border-border -mt-2">
        {([
          { id: 'profile' as const,     label: 'Profile',             premium: false },
          { id: 'application' as const, label: 'Application Profile', premium: true  },
        ]).map(({ id, label, premium }) => {
          const isActive = subTab === id;
          const locked   = premium && !isElite;
          return (
            <button
              key={id}
              onClick={() => !locked && setSubTab(id)}
              disabled={locked}
              aria-disabled={locked}
              title={locked ? 'Upgrade to Premium to access Application Profile' : undefined}
              className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                locked   ? 'text-muted-foreground/50 cursor-not-allowed' :
                isActive ? 'text-foreground' :
                           'text-muted-foreground hover:text-foreground'
              }`}
            >
              {locked && <Lock className="w-3 h-3 shrink-0" />}
              {label}
              {premium && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/15 border border-amber-400/50">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-600">Premium</span>
                </span>
              )}
              {isActive && !locked && (
                <motion.div layoutId="profileSubTab" className="absolute bottom-0 left-0 w-full h-[2px] bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {subTab === 'profile' && (
          <motion.div key="profile-core" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <ProfileCoreContent userData={userData} />
          </motion.div>
        )}
        {subTab === 'application' && isElite && (
          <motion.div key="application-profile" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <ApplicationProfileContent />
          </motion.div>
        )}
        {subTab === 'application' && !isElite && (
          <motion.div key="application-locked" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <div
              className="flex flex-col items-center text-center gap-3"
              style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: 40 }}
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Application Profile is Premium-only</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Upgrade to Premium to let us submit job applications on your behalf using your saved personal information and preferences.
              </p>
              <button
                onClick={() => navigate('/pricing')}
                style={{ ...primaryButtonStyle, marginTop: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
                onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade to Premium
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
