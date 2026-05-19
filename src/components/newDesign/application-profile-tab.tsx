import { useState, useEffect } from 'react';
import {
  Sparkles, Check, Pencil, X, Plus, Trash2, BadgeCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { getJobsPreferences, upsertJobsPreferences } from '../../services/ProfileServices';

// ── Constants ────────────────────────────────────────────────────────────────

const EMP_TYPES = [
  { id: 'Full-time',  label: 'Full-time'  },
  { id: 'Part-time',  label: 'Part-time'  },
  { id: 'Contract',   label: 'Contract'   },
  { id: 'Internship', label: 'Internship' },
];
const WORK_MODES = [
  { id: 'Remote',   label: 'Remote'  },
  { id: 'Hybrid',   label: 'Hybrid'  },
  { id: 'On-site',  label: 'On-site' },
];
const DEGREE_OPTIONS = ["Associate's", "Bachelor's", "Master's", "PhD", "Other"];
const START_OPTIONS = [
  { id: 'Immediately', label: 'Immediately' },
  { id: '2 weeks',     label: '2 weeks'     },
  { id: '1 month',     label: '1 month'     },
  { id: '2 months',    label: '2 months'    },
  { id: '3 months',    label: '3 months'    },
];

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className ?? ''}`} />;
}

function SectionSkeleton() {
  return (
    <div className="px-5 py-4 flex flex-col gap-3">
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-3/4" />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ResumeExperience = {
  title?: string;
  company?: string;
  employment_type?: string | null;
  location?: string | null;
  start_date?: string;
  end_date?: string;
  achievements?: string[];
};

type ResumeEducation = {
  institution?: string;
  degree?: string;
  field_of_study?: string;
  start_year?: string;
  end_year?: string;
  gpa?: number | null;
  honors?: string[];
};

type StructuredResume = {
  profile?: Record<string, unknown>;
  summary?: string;
  job_titles?: string[];
  skills?: unknown[];
  experience?: ResumeExperience[];
  education?: ResumeEducation[];
  certifications?: unknown[];
  projects?: unknown[];
  links?: { linkedin?: string | null; github?: string | null; website?: string | null; other?: string[] };
};

type ApplyPrefs = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  employment_types?: string[];
  work_modes?: string[];
  salary_min?: number;
  salary_max?: number;
  target_locations?: string[];
  earliest_start_date?: string;
  [key: string]: unknown;
};

// ── ApplicationProfileContent ─────────────────────────────────────────────────

export function ApplicationProfileContent() {
  const [loading, setLoading] = useState(true);

  // ── Server-side state ──
  const [applyPrefs, setApplyPrefs]           = useState<ApplyPrefs>({});
  const [structuredResume, setStructuredResume] = useState<StructuredResume>({});

  // ── Personal Details edit ──
  const [editPersonal, setEditPersonal] = useState(false);
  const [personalDraft, setPersonalDraft] = useState({
    phone: '', linkedin: '', portfolio: '', github: '', location: '',
  });

  // ── Education edit ──
  const [editEducation, setEditEducation] = useState(false);
  const [eduDraft, setEduDraft] = useState({
    degree: '', field: '', school: '', gradYear: '', gpa: '',
  });

  // ── Work Experience ──
  const [addingExp, setAddingExp] = useState(false);
  const [expDraft, setExpDraft] = useState({ title: '', company: '', duration: '' });

  // ── Job Preferences edit ──
  const [editPreferences, setEditPreferences] = useState(false);
  const [empTypes, setEmpTypes]         = useState<string[]>([]);
  const [workModes, setWorkModes]       = useState<string[]>([]);
  const [salaryMin, setSalaryMin]       = useState('');
  const [salaryMax, setSalaryMax]       = useState('');
  const [locationTags, setLocationTags] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

  // ── Application Defaults edit ──
  const [editDefaults, setEditDefaults] = useState(false);
  const [startAvail, setStartAvail]     = useState('Immediately');

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    getJobsPreferences()
      .then((res: { data: { data?: { candidate_apply_preferences?: ApplyPrefs; candidate_structured_resume?: StructuredResume } } }) => {
        const prefs: ApplyPrefs       = res.data?.data?.candidate_apply_preferences  ?? {};
        const resume: StructuredResume = res.data?.data?.candidate_structured_resume ?? {};

        setApplyPrefs(prefs);
        setStructuredResume(resume);

        // Seed job-preference UI state
        setEmpTypes(prefs.employment_types ?? []);
        setWorkModes(prefs.work_modes ?? []);
        setSalaryMin(prefs.salary_min != null ? String(Math.round(prefs.salary_min / 1000)) : '');
        setSalaryMax(prefs.salary_max != null ? String(Math.round(prefs.salary_max / 1000)) : '');
        setLocationTags(prefs.target_locations ?? []);
        setStartAvail(prefs.earliest_start_date ?? 'Immediately');

        // Seed personal-details draft
        const city  = prefs.address_city  ?? '';
        const state = prefs.address_state ?? '';
        setPersonalDraft({
          phone:     prefs.phone         ?? '',
          linkedin:  prefs.linkedin_url  ?? '',
          portfolio: prefs.portfolio_url ?? '',
          github:    prefs.github_url    ?? '',
          location:  [city, state].filter(Boolean).join(', '),
        });

        // Seed education draft
        const firstEdu = resume.education?.[0];
        setEduDraft({
          degree:   firstEdu?.degree        ?? '',
          field:    firstEdu?.field_of_study ?? '',
          school:   firstEdu?.institution    ?? '',
          gradYear: firstEdu?.end_year       ?? '',
          gpa:      firstEdu?.gpa != null    ? String(firstEdu.gpa) : '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Save helpers ──────────────────────────────────────────────────────────

  // Required fields must always be present (null when empty); optional blanks are omitted
  const REQUIRED_FIELDS = ['first_name', 'middle_name', 'last_name', 'email', 'phone'] as const;
  type RequiredField = typeof REQUIRED_FIELDS[number];

  const toApiPayload = (obj: ApplyPrefs): ApplyPrefs => {
    const out: ApplyPrefs = {};
    for (const [k, v] of Object.entries(obj)) {
      if ((REQUIRED_FIELDS as readonly string[]).includes(k)) {
        out[k] = (v === '' || v === undefined) ? null : v;
      } else if (v !== '' && v !== null && v !== undefined) {
        out[k] = v;
      }
    }
    // Ensure all required fields are present even if not in obj yet
    for (const f of REQUIRED_FIELDS) {
      if (!(f in out)) out[f as RequiredField] = null;
    }
    return out;
  };

  const saveApplyPrefs = (patch: Partial<ApplyPrefs>) => {
    const merged = { ...applyPrefs, ...patch };
    setApplyPrefs(merged);
    upsertJobsPreferences({ candidate_apply_preferences: toApiPayload(merged) }).catch(() => {});
  };

  const saveStructuredResume = (patch: Partial<StructuredResume>) => {
    const merged = { ...structuredResume, ...patch };
    setStructuredResume(merged);
    upsertJobsPreferences({ candidate_structured_resume: merged }).catch(() => {});
  };

  const handlePersonalSave = () => {
    // Split "City, State" back into separate fields
    const [city, ...stateParts] = personalDraft.location.split(',').map(s => s.trim());
    saveApplyPrefs({
      phone:         personalDraft.phone,
      linkedin_url:  personalDraft.linkedin,
      github_url:    personalDraft.github,
      portfolio_url: personalDraft.portfolio,
      address_city:  city ?? '',
      address_state: stateParts.join(', ') ?? '',
    });
    setEditPersonal(false);
  };

  const handleEduSave = () => {
    const gpaNum = parseFloat(eduDraft.gpa);
    const updatedEdu: ResumeEducation[] = [{
      ...(structuredResume.education?.[0] ?? {}),
      institution:    eduDraft.school,
      degree:         eduDraft.degree,
      field_of_study: eduDraft.field,
      end_year:       eduDraft.gradYear,
      gpa:            isNaN(gpaNum) ? undefined : gpaNum,
    }];
    const rest = structuredResume.education?.slice(1) ?? [];
    saveStructuredResume({ education: [...updatedEdu, ...rest] });
    setEditEducation(false);
  };

  const handleAddExp = () => {
    if (!expDraft.title.trim() || !expDraft.company.trim()) return;
    const newExp: ResumeExperience = {
      title:        expDraft.title,
      company:      expDraft.company,
      start_date:   expDraft.duration,
      end_date:     '',
      achievements: [],
    };
    saveStructuredResume({ experience: [...(structuredResume.experience ?? []), newExp] });
    setAddingExp(false);
    setExpDraft({ title: '', company: '', duration: '' });
  };

  const handleRemoveExp = (idx: number) => {
    saveStructuredResume({ experience: (structuredResume.experience ?? []).filter((_, i) => i !== idx) });
  };

  const handlePrefsSave = () => {
    saveApplyPrefs({
      employment_types: empTypes,
      work_modes:       workModes,
      salary_min:       salaryMin ? parseInt(salaryMin) * 1000 : undefined,
      salary_max:       salaryMax ? parseInt(salaryMax) * 1000 : undefined,
      target_locations: locationTags,
    });
    setEditPreferences(false);
  };

  const handleDefaultsSave = () => {
    saveApplyPrefs({ earliest_start_date: startAvail });
    setEditDefaults(false);
  };

  // ── Derived display values ────────────────────────────────────────────────

  const fullName      = [applyPrefs.first_name, applyPrefs.last_name].filter(Boolean).join(' ');
  const phone         = applyPrefs.phone ?? '';
  const location      = [applyPrefs.address_city, applyPrefs.address_state].filter(Boolean).join(', ');
  const firstEdu      = structuredResume.education?.[0];
  const experiences   = structuredResume.experience ?? [];
  const personalIsSet = !!(phone || applyPrefs.linkedin_url || applyPrefs.github_url);
  const eduIsSet      = !!(firstEdu?.institution || firstEdu?.degree);

  return (
    <div className="flex flex-col gap-6">

      {/* Context banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/15">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80 leading-relaxed">
          This profile is used by Screna's <span className="font-medium text-foreground">managed apply</span> feature.
          The more complete it is, the more accurately Screna can apply to jobs on your behalf.
        </p>
      </div>

      {/* ── Personal Details ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-foreground">Personal Details</h3>
            {!loading && personalIsSet && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Complete
              </span>
            )}
          </div>
          {!loading && (
            <button
              onClick={() => editPersonal ? handlePersonalSave() : setEditPersonal(true)}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                editPersonal
                  ? 'border-border text-muted-foreground hover:text-foreground'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              }`}
            >
              {editPersonal ? <><Check className="w-3.5 h-3.5" />Save</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
            </button>
          )}
        </div>
        {loading ? <SectionSkeleton /> : (
          <AnimatePresence mode="wait">
            {editPersonal ? (
              <motion.div key="personal-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {([
                  { label: 'Phone',              key: 'phone',     placeholder: '+1 (555) 000-0000'        },
                  { label: 'Location',           key: 'location',  placeholder: 'City, State'              },
                  { label: 'LinkedIn',           key: 'linkedin',  placeholder: 'linkedin.com/in/yourname' },
                  { label: 'GitHub',             key: 'github',    placeholder: 'github.com/username'      },
                  { label: 'Portfolio / Website',key: 'portfolio', placeholder: 'yoursite.dev'             },
                ] as { label: string; key: keyof typeof personalDraft; placeholder: string }[]).map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
                    <input
                      value={personalDraft[key]}
                      onChange={e => setPersonalDraft(d => ({ ...d, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="personal-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-5"
              >
                {[
                  { label: 'Name',      value: fullName                  || '—' },
                  { label: 'Phone',     value: phone                     || '—' },
                  { label: 'Location',  value: location                  || '—' },
                  { label: 'LinkedIn',  value: applyPrefs.linkedin_url   || '—' },
                  { label: 'GitHub',    value: applyPrefs.github_url     || '—' },
                  { label: 'Portfolio', value: applyPrefs.portfolio_url  || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
                    <div className="text-sm text-foreground truncate">{value}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Education ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-foreground">Education</h3>
            {!loading && eduIsSet && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Complete
              </span>
            )}
          </div>
          {!loading && (
            <button
              onClick={() => editEducation ? handleEduSave() : setEditEducation(true)}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                editEducation
                  ? 'border-border text-muted-foreground hover:text-foreground'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              }`}
            >
              {editEducation ? <><Check className="w-3.5 h-3.5" />Save</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
            </button>
          )}
        </div>
        {loading ? <SectionSkeleton /> : (
          <AnimatePresence mode="wait">
            {editEducation ? (
              <motion.div key="edu-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-5 py-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Degree</label>
                    <select value={eduDraft.degree} onChange={e => setEduDraft(d => ({ ...d, degree: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select degree</option>
                      {DEGREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Field of Study</label>
                    <input value={eduDraft.field} onChange={e => setEduDraft(d => ({ ...d, field: e.target.value }))}
                      placeholder="e.g. Computer Science"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">University / School</label>
                    <input value={eduDraft.school} onChange={e => setEduDraft(d => ({ ...d, school: e.target.value }))}
                      placeholder="e.g. UC Berkeley"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Grad Year</label>
                      <input value={eduDraft.gradYear} onChange={e => setEduDraft(d => ({ ...d, gradYear: e.target.value }))}
                        placeholder="2024"
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">GPA <span className="normal-case font-normal">(opt.)</span></label>
                      <input value={eduDraft.gpa} onChange={e => setEduDraft(d => ({ ...d, gpa: e.target.value }))}
                        placeholder="3.8"
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="edu-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-5 py-4"
              >
                {eduIsSet ? (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {[firstEdu?.degree, firstEdu?.field_of_study].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">{firstEdu?.institution || '—'}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {firstEdu?.end_year && (
                          <span className="text-xs text-muted-foreground">Class of {firstEdu.end_year}</span>
                        )}
                        {firstEdu?.gpa != null && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-border inline-block" />
                            <span className="text-xs text-muted-foreground">GPA {firstEdu.gpa}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <p className="text-sm text-muted-foreground">No education found — upload a resume to populate this.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Work Experience ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-foreground">Work Experience</h3>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {experiences.length} {experiences.length === 1 ? 'role' : 'roles'}
              </span>
            )}
          </div>
          {!loading && (
            <button
              onClick={() => { setAddingExp(v => !v); setExpDraft({ title: '', company: '', duration: '' }); }}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                addingExp
                  ? 'border-border text-muted-foreground hover:text-foreground'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              }`}
            >
              {addingExp ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />Add role</>}
            </button>
          )}
        </div>
        {loading ? <SectionSkeleton /> : (
          <div className="px-5 py-4 flex flex-col gap-3">
            <AnimatePresence>
              {addingExp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5 mb-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Job Title</label>
                        <input value={expDraft.title} onChange={e => setExpDraft(d => ({ ...d, title: e.target.value }))}
                          placeholder="e.g. PM Intern"
                          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Company</label>
                        <input value={expDraft.company} onChange={e => setExpDraft(d => ({ ...d, company: e.target.value }))}
                          placeholder="e.g. Stripe"
                          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Duration</label>
                        <input value={expDraft.duration} onChange={e => setExpDraft(d => ({ ...d, duration: e.target.value }))}
                          placeholder="e.g. Jun – Aug 2023"
                          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                      </div>
                    </div>
                    <button
                      onClick={handleAddExp}
                      className="self-start flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Check className="w-3.5 h-3.5" />Add Experience
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {experiences.length > 0 ? (
              <div className="flex flex-col gap-2">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-secondary/30 group">
                    <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                      {(exp.company ?? '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{exp.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {[exp.company, [exp.start_date, exp.end_date].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveExp(idx)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No experience found — upload a resume to populate this.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Job Preferences ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-foreground">Job Preferences</h3>
          {!loading && (
            <button
              onClick={() => editPreferences ? handlePrefsSave() : setEditPreferences(true)}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                editPreferences
                  ? 'border-border text-muted-foreground hover:text-foreground'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              }`}
            >
              {editPreferences ? <><Check className="w-3.5 h-3.5" />Done</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
            </button>
          )}
        </div>
        {loading ? <SectionSkeleton /> : (
          <div className="px-5 py-5 flex flex-col gap-5">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Employment Type</p>
              {empTypes.length === 0 && !editPreferences ? (
                <p className="text-sm text-muted-foreground">Not set</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {EMP_TYPES.map(({ id, label }) => {
                    const sel = empTypes.includes(id);
                    return (
                      <button key={id}
                        onClick={() => editPreferences && setEmpTypes(prev => sel ? prev.filter(t => t !== id) : [...prev, id])}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          sel ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground bg-card'
                        } ${editPreferences ? 'cursor-pointer hover:border-primary/40' : 'cursor-default'}`}
                      >
                        {sel && <Check className="w-3 h-3 shrink-0" />}{label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Work Mode</p>
              {workModes.length === 0 && !editPreferences ? (
                <p className="text-sm text-muted-foreground">Not set</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map(({ id, label }) => {
                    const sel = workModes.includes(id);
                    return (
                      <button key={id}
                        onClick={() => editPreferences && setWorkModes(prev => sel ? prev.filter(m => m !== id) : [...prev, id])}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          sel ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground bg-card'
                        } ${editPreferences ? 'cursor-pointer hover:border-primary/40' : 'cursor-default'}`}
                      >
                        {sel && <Check className="w-3 h-3 shrink-0" />}{label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Desired Salary Range (USD / year)</p>
              {editPreferences ? (
                <div className="flex items-center gap-3 max-w-[320px]">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="120" />
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">to</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" placeholder="160" />
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">K</span>
                </div>
              ) : (
                <div className="text-sm font-medium text-foreground">
                  {salaryMin || salaryMax
                    ? `${salaryMin ? '$' + salaryMin + 'K' : '—'} – ${salaryMax ? '$' + salaryMax + 'K' : '—'} per year`
                    : <span className="text-muted-foreground font-normal">Not set</span>
                  }
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Preferred Locations</p>
              {locationTags.length === 0 && !editPreferences ? (
                <p className="text-sm text-muted-foreground">Not set</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locationTags.map(loc => (
                    <div key={loc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary text-sm text-foreground">
                      {loc}
                      {editPreferences && (
                        <button onClick={() => setLocationTags(prev => prev.filter(l => l !== loc))}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editPreferences && (
                    <input value={locationInput} onChange={e => setLocationInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && locationInput.trim()) { setLocationTags(prev => [...prev, locationInput.trim()]); setLocationInput(''); } }}
                      placeholder="Add location…"
                      className="px-3 py-1.5 rounded-full border border-dashed border-primary/40 text-primary text-sm bg-transparent focus:outline-none focus:border-primary w-[140px] placeholder:text-primary/40"
                    />
                  )}
                </div>
              )}
              {editPreferences && <p className="text-xs text-muted-foreground mt-2">Press Enter to add a location.</p>}
            </div>
          </div>
        )}
      </div>

      {/* ── Application Defaults ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-foreground">Application Defaults</h3>
          {!loading && (
            <button
              onClick={() => editDefaults ? handleDefaultsSave() : setEditDefaults(true)}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
                editDefaults
                  ? 'border-border text-muted-foreground hover:text-foreground'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              }`}
            >
              {editDefaults ? <><Check className="w-3.5 h-3.5" />Done</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
            </button>
          )}
        </div>
        {loading ? <SectionSkeleton /> : (
          <div className="px-5 py-5 flex flex-col gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Available to Start</p>
              {editDefaults ? (
                <div className="flex flex-wrap gap-2">
                  {START_OPTIONS.map(({ id, label }) => (
                    <button key={id} onClick={() => setStartAvail(id)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                        startAvail === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/40'
                      }`}
                    >{label}</button>
                  ))}
                </div>
              ) : (
                <div className="text-sm font-medium text-foreground">
                  {START_OPTIONS.find(o => o.id === startAvail)?.label ?? startAvail}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
