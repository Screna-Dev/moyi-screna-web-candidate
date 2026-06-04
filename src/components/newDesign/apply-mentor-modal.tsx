import { useState, useEffect, useRef } from 'react';
import { Loader2, X, Calendar, Plus, ArrowRight, Check } from 'lucide-react';
import { applyMentor, getCalendarAuthUrl, connectCalendar } from '../../services/MentorService';
import { getProfile } from '../../services/ProfileServices';
import type { ProfileData } from '../../types/profile';

// dayOfWeek follows ISO 8601: 1 = Monday … 7 = Sunday.
interface OfficeHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const OFFICE_HOUR_DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

// Google's redirect URI must be byte-identical to what was sent to /authorize
// and to what's registered in Google Cloud. Keep it pinned to /marketplace so
// the existing OAuth client config keeps working — users starting the flow on
// /mentor-marketplace will be returned to /marketplace, where this modal still
// auto-opens via the OAuth-return effect.
const OAUTH_REDIRECT_URI = (): string => `${window.location.origin}/marketplace`;

const emptyForm = {
  headline: '',
  currentRole: '',
  currentCompany: '',
  yearsOfExperience: '',
  bio: '',
  expertiseTags: [] as string[],
  expertiseInput: '',
  careerBackground: [] as { company: string; role: string; startYear: string; endYear: string }[],
  officeHours: [] as OfficeHour[],
  topics: [
    { title: 'Mock Interview',              enabled: false, price30: '50', price60: '100', description: '', mentorNote: '' },
    { title: 'Resume & LinkedIn Review',    enabled: false, price30: '50', price60: '100', description: '', mentorNote: '' },
    { title: 'Career Strategy Session',     enabled: false, price30: '50', price60: '100', description: '', mentorNote: '' },
    { title: 'Offer & Salary Negotiation',  enabled: false, price30: '50', price60: '100', description: '', mentorNote: '' },
  ] as Array<{ title: string; enabled: boolean; price30: string; price60: string; description: string; mentorNote: string; custom?: boolean }>,
};

export function ApplyMentorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mentorStep, setMentorStep] = useState(1);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [mentorSubmitting, setMentorSubmitting] = useState(false);
  const [mentorSubmitted, setMentorSubmitted] = useState(false);
  const [mentorError, setMentorError] = useState('');
  const [profilePrefilled, setProfilePrefilled] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [mentorForm, setMentorForm] = useState(emptyForm);

  // The modal opens itself when a Google OAuth redirect lands on the page with
  // ?code & ?state. That signal arrives before the parent has any chance to
  // toggle `open`, so we track an internal flag and OR it with the prop.
  const [oauthForcedOpen, setOauthForcedOpen] = useState(false);
  const isOpen = open || oauthForcedOpen;

  const resetMentorModal = () => {
    setMentorStep(1);
    setCalendarConnected(false);
    setMentorSubmitted(false);
    setMentorError('');
    setProfilePrefilled(false);
    setMentorForm(emptyForm);
  };

  const handleClose = () => {
    setOauthForcedOpen(false);
    resetMentorModal();
    onClose();
  };

  // Google Calendar OAuth return: full-page redirect lands back on the page
  // with ?code & ?state (or ?error). Exchange the code, surface result in the
  // mentor modal, then strip the params so a refresh doesn't replay the call.
  const oauthReturnHandled = useRef(false);
  useEffect(() => {
    if (oauthReturnHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    if (!code && !error) return;
    oauthReturnHandled.current = true;

    const cleanUrl = () => {
      window.history.replaceState({}, '', window.location.pathname);
    };

    setOauthForcedOpen(true);
    setMentorSubmitted(true);

    if (error || !code || !state) {
      setMentorError(error ? decodeURIComponent(error) : 'Missing authorization parameters.');
      sessionStorage.removeItem('mentorCalendarRedirectUri');
      cleanUrl();
      return;
    }

    // Use the exact redirectUri that was sent to /authorize. Google requires
    // the token exchange to use a byte-identical value.
    const redirectUri =
      sessionStorage.getItem('mentorCalendarRedirectUri') ?? OAUTH_REDIRECT_URI();
    setCalendarLoading(true);
    connectCalendar({ code, redirectUri, state })
      .then(() => {
        setCalendarConnected(true);
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to connect Google Calendar. Please try again.';
        setMentorError(msg);
      })
      .finally(() => {
        setCalendarLoading(false);
        sessionStorage.removeItem('mentorCalendarRedirectUri');
        cleanUrl();
      });
  }, []);

  // Auto-fill form from resume when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setProfileLoading(true);
    getProfile()
      .then((res: { data: { data?: { structured_resume?: ProfileData }; structured_resume?: ProfileData } }) => {
        const sr: ProfileData | undefined =
          res.data?.data?.structured_resume ?? res.data?.structured_resume;
        if (!sr) return;

        const profile = sr.profile;
        const extractYear = (d: string) => d?.match(/\d{4}/)?.[0] ?? '';

        const expertiseTags = sr.skills
          .flatMap(s => s.items.map(i => i.name))
          .filter(Boolean)
          .slice(0, 10);

        const careerBackground = sr.experience.map(exp => ({
          role: exp.title,
          company: exp.company,
          startYear: extractYear(exp.start_date),
          endYear: extractYear(exp.end_date),
        }));

        const latestExp = sr.experience[0];

        setMentorForm(f => ({
          ...f,
          headline: f.headline || profile.headline || '',
          currentRole: f.currentRole || latestExp?.title || sr.job_titles[0] || '',
          currentCompany: f.currentCompany || latestExp?.company || '',
          yearsOfExperience: f.yearsOfExperience || (profile.total_years_experience ? String(profile.total_years_experience) : ''),
          bio: f.bio || profile.summary || '',
          expertiseTags: f.expertiseTags.length > 0 ? f.expertiseTags : expertiseTags,
          careerBackground: f.careerBackground.length > 0 ? f.careerBackground : careerBackground,
        }));
        setProfilePrefilled(true);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [isOpen]);

  const handleConnectCalendar = async () => {
    setCalendarLoading(true);
    setMentorError('');
    try {
      const redirectUri = OAUTH_REDIRECT_URI();
      const res = await getCalendarAuthUrl(redirectUri);
      const data: Record<string, string> = res.data?.data ?? {};
      const authUrl = data.authUrl ?? data.url ?? (Object.values(data).find(v => typeof v === 'string' && v.startsWith('http')) as string | undefined);
      if (!authUrl) throw new Error('No auth URL returned');

      sessionStorage.setItem('mentorCalendarRedirectUri', redirectUri);
      window.location.assign(authUrl);
    } catch {
      setMentorError('Failed to start Google authorization. Please try again.');
      setCalendarLoading(false);
    }
  };

  const handleMentorSubmit = async () => {
    setMentorError('');
    const toCents = (v: string) => Math.round((parseFloat(v) || 0) * 100);
    const enabledTopics = mentorForm.topics
      .filter(t => t.enabled)
      .map(t => ({
        title: t.title,
        description: t.description,
        mentorNote: t.mentorNote,
        price30min: toCents(t.price30),
        price60min: toCents(t.price60),
        bothPricesSet: true,
      }));
    if (enabledTopics.some(t => !t.title.trim())) {
      setMentorError('Give each enabled service a name.');
      return;
    }
    // Backend requires both prices ≥ 1000 cents ($10) for every enabled service.
    if (enabledTopics.some(t => t.price30min < 1000 || t.price60min < 1000)) {
      setMentorError('Each enabled service must price both 30- and 60-minute sessions at $10 or more.');
      return;
    }
    setMentorSubmitting(true);
    try {
      await applyMentor({
        bio: mentorForm.bio,
        headline: mentorForm.headline,
        expertiseTags: mentorForm.expertiseTags,
        currentRole: mentorForm.currentRole,
        currentCompany: mentorForm.currentCompany,
        yearsOfExperience: parseInt(mentorForm.yearsOfExperience) || 0,
        careerBackground: mentorForm.careerBackground.map(e => ({
          company: e.company,
          role: e.role,
          startYear: parseInt(e.startYear) || 0,
          endYear: e.endYear ? parseInt(e.endYear) : undefined,
        })),
        officeHours: mentorForm.officeHours,
        ...(enabledTopics.length > 0 ? { topics: enabledTopics } : {}),
      });

      setMentorSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.toLowerCase().includes('mentor profile already exists')) {
        setMentorSubmitted(true);
      } else {
        setMentorError(msg ?? 'Submission failed. Please try again.');
      }
    } finally {
      setMentorSubmitting(false);
    }
  };

  const toggleOfficeHourDay = (dayOfWeek: number) => {
    setMentorForm(f => {
      const exists = f.officeHours.some(o => o.dayOfWeek === dayOfWeek);
      const officeHours: OfficeHour[] = exists
        ? f.officeHours.filter(o => o.dayOfWeek !== dayOfWeek)
        : [...f.officeHours, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      return { ...f, officeHours };
    });
  };

  const updateOfficeHour = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setMentorForm(f => ({
      ...f,
      officeHours: f.officeHours.map(o =>
        o.dayOfWeek === dayOfWeek ? { ...o, [field]: value } : o
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-card rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-foreground text-[16px]" style={{ fontWeight: 600 }}>
              {mentorSubmitted ? 'Application Submitted' : 'Become a Mentor'}
            </h2>
            {!mentorSubmitted && (
              <p className="text-muted-foreground text-[12px] mt-0.5">Step {mentorStep} of 6</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        {!mentorSubmitted && (
          <div className="flex gap-1.5 px-6 pt-4 shrink-0">
            {[1, 2, 3, 4, 5, 6].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= mentorStep ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        )}

        {/* Profile pre-fill banner */}
        {!mentorSubmitted && mentorStep <= 3 && (
          <div className="px-6 pt-3 shrink-0">
            {profileLoading ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading your profile…
              </div>
            ) : profilePrefilled ? (
              <div className="flex items-center gap-1.5 text-[12px] text-primary/80">
                <Check className="w-3 h-3" />
                Pre-filled from your profile — edit any field below.
              </div>
            ) : null}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Final success state (submitted + calendar connected) */}
          {mentorSubmitted && calendarConnected && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground text-[16px] mb-2" style={{ fontWeight: 600 }}>You're all set!</h3>
                <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                  Your application is under review. We'll reach out within a few business days.
                </p>
              </div>
            </div>
          )}

          {/* Post-submit: Connect Google Calendar */}
          {mentorSubmitted && !calendarConnected && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-foreground text-[15.5px] mb-1.5" style={{ fontWeight: 600 }}>Application submitted</h3>
                  <p className="text-muted-foreground text-[13px] leading-relaxed">
                    One last step — connect your Google Calendar so candidates can book sessions.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/20 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Calendar className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>Connect Google Calendar</p>
                    <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">
                      Required so Screna can create and manage booking events on your calendar automatically.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleConnectCalendar}
                  disabled={calendarLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-[13px] text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  style={{ fontWeight: 500 }}
                >
                  {calendarLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Connecting…</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Connect with Google
                    </>
                  )}
                </button>
              </div>

              {mentorError && (
                <p className="text-[12.5px] text-destructive">{mentorError}</p>
              )}
            </div>
          )}

          {/* Step 1: Professional Info */}
          {!mentorSubmitted && mentorStep === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Headline</p>
                <input
                  value={mentorForm.headline}
                  onChange={e => setMentorForm(f => ({ ...f, headline: e.target.value }))}
                  placeholder="e.g. Helping engineers land FAANG roles"
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Current Role</p>
                  <input
                    value={mentorForm.currentRole}
                    onChange={e => setMentorForm(f => ({ ...f, currentRole: e.target.value }))}
                    placeholder="e.g. Senior Engineer"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Company</p>
                  <input
                    value={mentorForm.currentCompany}
                    onChange={e => setMentorForm(f => ({ ...f, currentCompany: e.target.value }))}
                    placeholder="e.g. Google"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Years of Experience</p>
                <input
                  type="number" min="0" max="50"
                  value={mentorForm.yearsOfExperience}
                  onChange={e => setMentorForm(f => ({ ...f, yearsOfExperience: e.target.value }))}
                  placeholder="e.g. 7"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Step 2: Bio + Expertise Tags */}
          {!mentorSubmitted && mentorStep === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Bio</p>
                <textarea
                  value={mentorForm.bio}
                  onChange={e => setMentorForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell candidates about your background, what you help with, and your mentoring style…"
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Expertise Tags</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {mentorForm.expertiseTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary text-[12px]">
                      {tag}
                      <button onClick={() => setMentorForm(f => ({ ...f, expertiseTags: f.expertiseTags.filter(t => t !== tag) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={mentorForm.expertiseInput}
                  onChange={e => setMentorForm(f => ({ ...f, expertiseInput: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && mentorForm.expertiseInput.trim()) {
                      setMentorForm(f => ({
                        ...f,
                        expertiseTags: [...f.expertiseTags, f.expertiseInput.trim()],
                        expertiseInput: '',
                      }));
                    }
                  }}
                  placeholder="Type a tag and press Enter (e.g. System Design)"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Step 3: Career Background */}
          {!mentorSubmitted && mentorStep === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground">Add your work history. At least one entry is recommended.</p>
              {mentorForm.careerBackground.map((entry, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border bg-secondary/30 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] text-muted-foreground uppercase tracking-wider">Entry {idx + 1}</span>
                    <button
                      onClick={() => setMentorForm(f => ({ ...f, careerBackground: f.careerBackground.filter((_, i) => i !== idx) }))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={entry.role}
                      onChange={e => setMentorForm(f => ({ ...f, careerBackground: f.careerBackground.map((en, i) => i === idx ? { ...en, role: e.target.value } : en) }))}
                      placeholder="Role"
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      value={entry.company}
                      onChange={e => setMentorForm(f => ({ ...f, careerBackground: f.careerBackground.map((en, i) => i === idx ? { ...en, company: e.target.value } : en) }))}
                      placeholder="Company"
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      value={entry.startYear}
                      onChange={e => setMentorForm(f => ({ ...f, careerBackground: f.careerBackground.map((en, i) => i === idx ? { ...en, startYear: e.target.value } : en) }))}
                      placeholder="Start year"
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      value={entry.endYear}
                      onChange={e => setMentorForm(f => ({ ...f, careerBackground: f.careerBackground.map((en, i) => i === idx ? { ...en, endYear: e.target.value } : en) }))}
                      placeholder="End year (or blank)"
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setMentorForm(f => ({ ...f, careerBackground: [...f.careerBackground, { company: '', role: '', startYear: '', endYear: '' }] }))}
                className="flex items-center gap-2 text-[13px] text-primary border border-dashed border-primary/30 rounded-xl px-4 py-2.5 hover:bg-primary/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add position
              </button>
            </div>
          )}

          {/* Step 4: Office Hours */}
          {!mentorSubmitted && mentorStep === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-foreground text-[14px]" style={{ fontWeight: 500 }}>Set your office hours</p>
                <p className="text-muted-foreground text-[12.5px] leading-relaxed mt-1">
                  Mentees can only book sessions during these hours. Select at least one day.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {OFFICE_HOUR_DAYS.map(day => {
                  const entry = mentorForm.officeHours.find(o => o.dayOfWeek === day.value);
                  const enabled = Boolean(entry);
                  return (
                    <div
                      key={day.value}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                        enabled ? 'border-primary/30 bg-primary/[4%]' : 'border-border bg-secondary/20'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer select-none w-[110px] shrink-0">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleOfficeHourDay(day.value)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-1 focus:ring-ring cursor-pointer"
                        />
                        <span className={`text-[13px] ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {day.label}
                        </span>
                      </label>
                      <div className={`flex items-center gap-2 ml-auto transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <input
                          type="time"
                          value={entry?.startTime ?? '09:00'}
                          onChange={e => updateOfficeHour(day.value, 'startTime', e.target.value)}
                          disabled={!enabled}
                          className="px-2 py-1 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <span className="text-[12px] text-muted-foreground">to</span>
                        <input
                          type="time"
                          value={entry?.endTime ?? '17:00'}
                          onChange={e => updateOfficeHour(day.value, 'endTime', e.target.value)}
                          disabled={!enabled}
                          className="px-2 py-1 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {mentorForm.officeHours.length === 0 && (
                <p className="text-[12px] text-muted-foreground">At least one day is required.</p>
              )}
            </div>
          )}

          {/* Step 5: Services & Rates */}
          {!mentorSubmitted && mentorStep === 5 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-foreground text-[14px]" style={{ fontWeight: 500 }}>Services you'll offer</p>
                <p className="text-muted-foreground text-[12.5px] leading-relaxed mt-1">
                  Enable at least one service. You can edit pricing, descriptions, and prep notes anytime later.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                {mentorForm.topics.map((t, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-colors ${t.enabled ? 'border-primary/40 bg-primary/[4%]' : 'border-border bg-secondary/20'}`}
                  >
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      {t.custom ? (
                        <input
                          value={t.title}
                          onChange={e => setMentorForm(f => ({
                            ...f,
                            topics: f.topics.map((tt, i) => i === idx ? { ...tt, title: e.target.value } : tt),
                          }))}
                          placeholder="Service name"
                          maxLength={200}
                          className="flex-1 min-w-0 px-2.5 py-1 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      ) : (
                        <span className={`text-[13px] ${t.enabled ? 'text-foreground' : 'text-muted-foreground'}`} style={{ fontWeight: 500 }}>
                          {t.title}
                        </span>
                      )}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <label className="flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={t.enabled}
                            onChange={() => setMentorForm(f => ({
                              ...f,
                              topics: f.topics.map((tt, i) => i === idx ? { ...tt, enabled: !tt.enabled } : tt),
                            }))}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-1 focus:ring-ring cursor-pointer"
                          />
                        </label>
                        {t.custom && (
                          <button
                            type="button"
                            onClick={() => setMentorForm(f => ({ ...f, topics: f.topics.filter((_, i) => i !== idx) }))}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove service"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {t.enabled && (
                      <div className="px-3 pb-3 flex flex-col gap-2.5 border-t border-border/50 pt-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1">Price · 30 min ($)</p>
                            <input
                              type="number" min={10}
                              value={t.price30}
                              onChange={e => setMentorForm(f => ({
                                ...f,
                                topics: f.topics.map((tt, i) => i === idx ? { ...tt, price30: e.target.value } : tt),
                              }))}
                              className="w-full px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div>
                            <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1">Price · 60 min ($)</p>
                            <input
                              type="number" min={10}
                              value={t.price60}
                              onChange={e => setMentorForm(f => ({
                                ...f,
                                topics: f.topics.map((tt, i) => i === idx ? { ...tt, price60: e.target.value } : tt),
                              }))}
                              className="w-full px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1">Description (shown to students)</p>
                          <textarea
                            rows={2}
                            value={t.description}
                            onChange={e => setMentorForm(f => ({
                              ...f,
                              topics: f.topics.map((tt, i) => i === idx ? { ...tt, description: e.target.value } : tt),
                            }))}
                            placeholder="What students get from this session…"
                            className="w-full px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1">Note to student after booking (optional)</p>
                          <textarea
                            rows={2}
                            value={t.mentorNote}
                            maxLength={2000}
                            onChange={e => setMentorForm(f => ({
                              ...f,
                              topics: f.topics.map((tt, i) => i === idx ? { ...tt, mentorNote: e.target.value } : tt),
                            }))}
                            placeholder="How to prepare, what to bring, links to read…"
                            className="w-full px-2.5 py-1.5 text-[13px] border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMentorForm(f => ({
                    ...f,
                    topics: [...f.topics, { title: '', enabled: true, price30: '50', price60: '100', description: '', mentorNote: '', custom: true }],
                  }))}
                  className="flex items-center gap-2 text-[13px] text-primary border border-dashed border-primary/30 rounded-xl px-4 py-2.5 hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add custom service
                </button>
              </div>
              {mentorForm.topics.every(t => !t.enabled) && (
                <p className="text-[12px] text-muted-foreground">Enable at least one service so students can book you.</p>
              )}
            </div>
          )}

          {/* Step 6: Review + Submit */}
          {!mentorSubmitted && mentorStep === 6 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-foreground text-[14px]" style={{ fontWeight: 500 }}>Ready to submit?</p>
                <p className="text-muted-foreground text-[12.5px] leading-relaxed mt-1">
                  Submitting grants you the Mentor role so you can connect your Google Calendar on the next step. Your profile stays in review until our team approves it.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[12px] text-muted-foreground uppercase tracking-wider mb-3">What happens next</p>
                <ul className="flex flex-col gap-2">
                  {[
                    'Submit your application — Mentor role is granted immediately',
                    'Connect your Google Calendar with the new permissions',
                    'Our team reviews your profile (1–3 business days) before it goes live',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                      <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {mentorError && (
                <p className="text-[12.5px] text-destructive">{mentorError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!mentorSubmitted && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
            <button
              onClick={() => mentorStep > 1 ? setMentorStep(s => s - 1) : handleClose()}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {mentorStep === 1 ? 'Cancel' : '← Back'}
            </button>
            {mentorStep < 6 ? (
              <button
                onClick={() => setMentorStep(s => s + 1)}
                disabled={
                  (mentorStep === 1 && (!mentorForm.headline.trim() || !mentorForm.currentRole.trim() || !mentorForm.currentCompany.trim())) ||
                  (mentorStep === 2 && !mentorForm.bio.trim()) ||
                  (mentorStep === 4 && mentorForm.officeHours.length === 0)
                }
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontWeight: 500 }}
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleMentorSubmit}
                disabled={mentorSubmitting || mentorForm.officeHours.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontWeight: 500 }}
              >
                {mentorSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Submitting…</> : 'Submit Application'}
              </button>
            )}
          </div>
        )}

        {/* Post-submit, calendar pending — primary action is in the body */}
        {mentorSubmitted && !calendarConnected && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-center shrink-0">
            <button
              onClick={handleClose}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              I'll connect later
            </button>
          </div>
        )}

        {/* Fully done */}
        {mentorSubmitted && calendarConnected && (
          <div className="px-6 py-4 border-t border-border shrink-0">
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] hover:bg-primary/90 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplyMentorModal;
