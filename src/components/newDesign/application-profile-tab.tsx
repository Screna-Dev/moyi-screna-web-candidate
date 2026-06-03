import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, Pencil, Plus, X, Eye, EyeOff, Lock, ShieldCheck, AlertTriangle,
  Briefcase, FileText, User, Building2, MessageSquare,
  SlidersHorizontal, Trash2, GraduationCap, Sparkles, ArrowRight, Zap,
  Award, Scale, Upload, FileIcon,
} from 'lucide-react';
import { getJobsPreferences, upsertJobsPreferences, getProfile, updateProfile } from '../../services/ProfileServices';

// ─── Constants ───────────────────────────────────────────────────────────────
const MANAGED_APPLY_THRESHOLD = 9;

const INPUT = 'w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring';
const SELECT = 'w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring';

const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const SHIFT_OPTIONS = ['Morning (6am-2pm)', 'Day (9am-5pm)', 'Evening (2pm-10pm)', 'Flexible'];
const TRAVEL_OPTIONS = ['None', 'Up to 10%', 'Up to 25%', 'Up to 50%', '50%+'];
const DEGREE_OPTIONS = ["Associate's", "Bachelor's", "Master's", "PhD", "Other"];
const CLEARANCE_OPTIONS = ['None', 'Public Trust', 'Secret', 'Top Secret', 'TS/SCI'];
const VISA_TYPES = ['None', 'F-1 OPT', 'F-1 CPT', 'H-1B', 'H-4 EAD', 'L-1', 'O-1', 'TN', 'Other'];
const LANGUAGES_LIST = ['English', 'Mandarin', 'Spanish', 'Hindi', 'French', 'German', 'Japanese', 'Arabic', 'Portuguese', 'Korean'];
const YES_NO = ['Yes', 'No'];
const CLOUD_CERT_SUGGESTIONS = ['AWS Certified', 'Google Cloud Professional', 'Azure', 'GCP'];
const START_OPTIONS = ['Immediately', '2 weeks', '1 month', '2 months', '3 months'];

// ─── Types ───────────────────────────────────────────────────────────────────
type WorkEntry = {
  id: number; company: string; title: string; location: string;
  type: string; startDate: string; endDate: string; current: boolean; description: string;
};
type EduEntry = {
  id: number; school: string; field: string; degree: string;
  startDate: string; endDate: string;
  gpa?: number | null;
  honors?: string[];
};
type QAEntry = { id: number; question: string; answer: string };
type CertFile = { id: number; name: string; size: number };

type EEO = {
  veteran?: string;
  ethnicity?: string;
  gender?: string;
  orientation?: string;
  disability?: string;
};

type ScreeningAnswers = {
  relatives_at_company?: string;
  relatives_at_company_details?: string;
  previously_employed_here?: string;
  government_affiliation?: string;
  government_affiliation_details?: string;
};

type ApplyPrefs = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  current_company?: string;
  current_title?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  employment_types?: string[];
  work_modes?: string[];
  shift_preferences?: string[];
  target_locations?: string[];
  relocate_willing?: string;
  travel_willingness?: string;
  address_line1?: string;
  address_line2?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  postal_code?: string;
  degree_level?: string;
  professional_certifications?: string[];
  cloud_certifications?: string[];
  citizenship?: string;
  work_auth_yes_no?: string;
  needs_sponsorship?: string;
  target_roles?: string[];
  company_size_categories?: string[];
  target_companies?: string[];
  work_authorization?: string;
  earliest_start_date?: string;
  overtime_available?: string;
  security_clearance?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  languages?: string[];
  eeo?: EEO;
  driving_license?: string;
  driving_license_expiry?: string;
  screening_answers?: ScreeningAnswers;
  suggestions?: string;
  [key: string]: unknown;
};

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

// ─── Helper: Status badge ────────────────────────────────────────────────────
function StatusBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="flex items-center gap-1 text-xs text-green-700 shrink-0">
      <Check className="w-3 h-3 text-green-600" strokeWidth={2.5} />Complete
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />Incomplete
    </span>
  );
}

// ─── Helper: Milestone banner ────────────────────────────────────────────────
function MilestoneBadge({ doneCount, total }: { doneCount: number; total: number }) {
  const remaining = MANAGED_APPLY_THRESHOLD - doneCount;

  if (doneCount >= total) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 border border-green-200 text-xs font-medium text-green-700">
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
        </div>
        Profile complete — Screna is fully equipped to apply on your behalf
      </div>
    );
  }
  if (doneCount >= MANAGED_APPLY_THRESHOLD) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 border border-green-200 text-xs font-medium text-green-700">
        <Zap className="w-3.5 h-3.5 text-green-600 shrink-0" />
        Managed apply is active — {total - doneCount} optional section{total - doneCount !== 1 ? 's' : ''} remaining
      </div>
    );
  }
  if (remaining <= 2) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
        <span className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{remaining}</span>
        Complete {remaining} more section{remaining !== 1 ? 's' : ''} to enable managed apply
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/8 border border-primary/20 text-xs font-medium text-primary">
      <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">{remaining}</span>
      Complete {remaining} more sections to enable managed apply
    </div>
  );
}

// ─── Helper: Masked sensitive value ──────────────────────────────────────────
function MaskedVal({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-foreground select-none">
          {show ? value : '•'.repeat(Math.min(value.length || 8, 14))}
        </span>
        <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Helper: Read-only field ─────────────────────────────────────────────────
function RO({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-foreground">{value || '—'}</div>
    </div>
  );
}

// ─── Helper: Form label wrapper ───────────────────────────────────────────────
function FL({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">
        {label}{optional && <span className="ml-1 normal-case font-normal">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Helper: Multi-select chips ───────────────────────────────────────────────
function Chips({ options, selected, onChange, disabled }: {
  options: string[]; selected: string[];
  onChange: (v: string[]) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const sel = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => !disabled && onChange(sel ? selected.filter(s => s !== opt) : [...selected, opt])}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
              sel ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground bg-card'
            } ${!disabled ? 'cursor-pointer hover:border-primary/40' : 'cursor-default'}`}
          >
            {sel && <Check className="w-3 h-3 shrink-0" />}{opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Helper: Single-select pills ─────────────────────────────────────────────
function Pills({ options, value, onChange, disabled }: {
  options: string[]; value: string;
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => !disabled && onChange(opt)}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            value === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground bg-card'
          } ${!disabled ? 'cursor-pointer hover:border-primary/40' : 'cursor-default'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Helper: Tag input ────────────────────────────────────────────────────────
function TagInput({ tags, onAdd, onRemove, inputValue, onInputChange, placeholder, suggestions }: {
  tags: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void;
  inputValue: string; onInputChange: (v: string) => void;
  placeholder?: string; suggestions?: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-sm text-primary font-medium">
            {tag}
            <button onClick={() => onRemove(tag)} className="text-primary/60 hover:text-primary transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && inputValue.trim()) {
              onAdd(inputValue.trim());
              onInputChange('');
            }
          }}
          placeholder={placeholder || 'Type and press Enter…'}
          className="px-3 py-1.5 rounded-full border border-dashed border-primary/40 text-primary text-sm bg-transparent focus:outline-none focus:border-primary w-[180px] placeholder:text-primary/40"
        />
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center">Quick add:</span>
          {suggestions.filter(s => !tags.includes(s)).map(s => (
            <button
              key={s}
              onClick={() => onAdd(s)}
              className="text-xs px-2 py-1 rounded-md border border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
type SectionVariant = 'default' | 'sensitive' | 'critical';

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  variant?: SectionVariant;
  complete?: boolean;
  editing: boolean;
  onToggle: () => void;
  addMode?: boolean;
  emptyPrompt?: string;
  children: React.ReactNode;
}

function SectionCard({
  icon: Icon, title, description, variant = 'default',
  complete, editing, onToggle, addMode, emptyPrompt, children,
}: SectionCardProps) {
  const cardBorder = variant === 'critical'
    ? 'border-destructive/25 hover:border-destructive/35'
    : variant === 'sensitive'
    ? 'border-amber-200/80 hover:border-amber-300'
    : complete === false
    ? 'border-border hover:border-amber-300/60'
    : 'border-border hover:border-primary/40';

  const iconBg = variant === 'critical' ? 'bg-destructive/10' : variant === 'sensitive' ? 'bg-amber-100/70' : 'bg-secondary border border-border';
  const iconCls = variant === 'critical' ? 'text-destructive' : variant === 'sensitive' ? 'text-amber-600' : 'text-muted-foreground';
  const headerBg = variant === 'critical' ? 'bg-destructive/[0.025]' : variant === 'sensitive' ? 'bg-amber-50/40' : '';

  return (
    <div className={`bg-card border rounded-lg overflow-hidden transition-colors ${cardBorder}`}>
      <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b border-border ${headerBg}`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconCls}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {complete !== undefined && <StatusBadge complete={complete} />}
          <button
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-card hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            {editing
              ? <X className="w-3.5 h-3.5" />
              : addMode
                ? <Plus className="w-3.5 h-3.5" />
                : <Pencil className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {children}
        {!editing && !addMode && complete === false && emptyPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">{emptyPrompt}</p>
            <button
              onClick={onToggle}
              className="shrink-0 flex items-center gap-1 text-xs text-primary font-medium hover:underline transition-colors"
            >
              Complete now <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Inline add-entry form ────────────────────────────────────────────────────
function AddForm({ show, onConfirm, onCancel, confirmLabel, children }: {
  show: boolean; onConfirm: () => void; onCancel: () => void;
  confirmLabel: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
        >
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex flex-col gap-3 mb-1">
            {children}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={onConfirm}
                className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                <Check className="w-3.5 h-3.5" />{confirmLabel}
              </button>
              <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Empty state for multi-entry sections ──────────────────────────────────────
function MultiEmptyState({ icon: Icon, title, body, onAdd }: {
  icon: React.ElementType; title: string; body: string; onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-5 px-4">
      <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-[280px] leading-relaxed">{body}</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus className="w-3.5 h-3.5" />Get started
      </button>
    </div>
  );
}

// ─── Resume <-> UI converters ─────────────────────────────────────────────────
let wid = 1;
let eid = 1;
const nextWid = () => wid++;
const nextEid = () => eid++;

function expFromApi(e: ResumeExperience): WorkEntry {
  return {
    id: nextWid(),
    company:    e.company ?? '',
    title:      e.title ?? '',
    location:   e.location ?? '',
    type:       e.employment_type ?? 'Full-time',
    startDate:  e.start_date ?? '',
    endDate:    (e.end_date === 'Present' || !e.end_date) ? '' : e.end_date,
    current:    e.end_date === 'Present' || !e.end_date,
    description: (e.achievements ?? []).join('\n'),
  };
}

function expToApi(w: WorkEntry): ResumeExperience {
  return {
    title:           w.title,
    company:         w.company,
    location:        w.location || null,
    employment_type: w.type || null,
    start_date:      w.startDate,
    end_date:        w.current ? 'Present' : w.endDate,
    achievements:    w.description ? w.description.split('\n').filter(Boolean) : [],
  };
}

function eduFromApi(e: ResumeEducation): EduEntry {
  return {
    id: nextEid(),
    school:    e.institution ?? '',
    field:     e.field_of_study ?? '',
    degree:    e.degree ?? "Bachelor's",
    startDate: e.start_year ?? '',
    endDate:   e.end_year ?? '',
    gpa:       e.gpa ?? undefined,
    honors:    e.honors,
  };
}

function eduToApi(e: EduEntry): ResumeEducation {
  const out: ResumeEducation = {
    institution:    e.school,
    degree:         e.degree,
    field_of_study: e.field,
    start_year:     e.startDate,
    end_year:       e.endDate,
  };
  if (e.gpa != null) out.gpa = e.gpa;
  if (e.honors && e.honors.length) out.honors = e.honors;
  return out;
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function ApplicationProfileContent() {
  const [loading, setLoading] = useState(true);

  // ── Server-side state ──
  const [applyPrefs, setApplyPrefs] = useState<ApplyPrefs>({});
  const [structuredResume, setStructuredResume] = useState<StructuredResume>({});

  // ── S1: Job Preferences ──
  const [editJobPrefs, setEditJobPrefs] = useState(false);
  const [salary, setSalary] = useState({ min: '', max: '' });
  const [empTypes, setEmpTypes] = useState<string[]>([]);
  const [workModes, setWorkModes] = useState<string[]>([]);
  const [shiftPrefs, setShiftPrefs] = useState<string[]>([]);
  const [willingRelocate, setWillingRelocate] = useState('');
  const [willingTravel, setWillingTravel] = useState('');
  const [prefCities, setPrefCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');

  // ── S2: Personal Information ──
  const [editPersonal, setEditPersonal] = useState(false);
  const [personal, setPersonal] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', phone: '',
    appPassword: '',
  });
  const [pDraft, setPDraft] = useState({ ...personal });

  // ── S3: Residential ──
  const [editRes, setEditRes] = useState(false);
  const [res, setRes] = useState({
    line1: '', line2: '', city: '', state: '', country: '', zip: '',
  });
  const [rDraft, setRDraft] = useState({ ...res });

  // ── S5: Work Experience ──
  const [workList, setWorkList] = useState<WorkEntry[]>([]);
  const [addingWork, setAddingWork] = useState(false);
  const [wDraft, setWDraft] = useState<Omit<WorkEntry, 'id'>>({ company: '', title: '', location: '', type: 'Full-time', startDate: '', endDate: '', current: false, description: '' });

  // ── S6: Education ──
  const [eduList, setEduList] = useState<EduEntry[]>([]);
  const [addingEdu, setAddingEdu] = useState(false);
  const [eDraft, setEDraft] = useState<Omit<EduEntry, 'id'>>({ school: '', field: '', degree: "Bachelor's", startDate: '', endDate: '' });

  // ── S7: Certifications & Credentials ──
  const [editCerts, setEditCerts] = useState(false);
  const [profCerts, setProfCerts] = useState<string[]>([]);
  const [cloudCerts, setCloudCerts] = useState<string[]>([]);
  const [certFiles, setCertFiles] = useState<CertFile[]>([]);
  const [profCertInput, setProfCertInput] = useState('');
  const [cloudCertInput, setCloudCertInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── S8: Job Application Profile ──
  const [editJobApp, setEditJobApp] = useState(false);
  const [jobApp, setJobApp] = useState({
    usCitizen: '', workAuth: '', sponsorship: '', visaType: '',
    linkedin: '', github: '', portfolio: '',
    startDate: 'Immediately', overtime: '', clearance: 'None',
  });
  const [jaDraft, setJaDraft] = useState({ ...jobApp });
  const [selLangs, setSelLangs] = useState<string[]>([]);

  // ── S9: Miscellaneous (EEO + driving license) ──
  const [editMisc, setEditMisc] = useState(false);
  const [misc, setMisc] = useState({
    veteran: '', ethnicity: '', gender: '',
    orientation: '', disability: '',
    drivingLicense: '', licenseExpiry: '',
  });
  const [mDraft, setMDraft] = useState({ ...misc });

  // ── S10: Compliance & Legal (screening answers) ──
  const [editCompliance, setEditCompliance] = useState(false);
  const [compliance, setCompliance] = useState({
    relativesAtCompany: '',
    relativesDetails: '',
    previouslyEmployed: '',
    governmentAffiliation: '',
    governmentDetails: '',
  });
  const [cDraft, setCDraft] = useState({ ...compliance });

  // ── S11: Security Q&A (LOCAL ONLY — no API field) ──
  const [qaList, setQaList] = useState<QAEntry[]>([]);
  const [addingQA, setAddingQA] = useState(false);
  const [qaDraft, setQaDraft] = useState({ question: '', answer: '' });

  // ── S12: Suggestions ──
  const [editSug, setEditSug] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [sugDraft, setSugDraft] = useState('');

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([getJobsPreferences(), getProfile()])
      .then(([prefsRes, profileRes]) => {
        let prefs: ApplyPrefs = {};
        if (prefsRes.status === 'fulfilled') {
          const data = (prefsRes.value as { data: { data?: { candidate_apply_preferences?: ApplyPrefs } } }).data?.data;
          prefs = data?.candidate_apply_preferences ?? {};
        }

        let resume: StructuredResume = {};
        let resumeProfile: Record<string, unknown> = {};
        let resumeLinks: { linkedin?: string | null; github?: string | null; website?: string | null } = {};
        if (profileRes.status === 'fulfilled') {
          const sr = (profileRes.value as { data: { data?: { structured_resume?: StructuredResume }; structured_resume?: StructuredResume } }).data;
          resume = sr?.data?.structured_resume ?? sr?.structured_resume ?? {};
          resumeProfile = (resume.profile ?? {}) as Record<string, unknown>;
          resumeLinks = (resume.links ?? {}) as typeof resumeLinks;
        }

        // Seed missing required personal fields from the resume profile
        const missingPersonal = !prefs.first_name || !prefs.last_name || !prefs.email || !prefs.phone;
        if (missingPersonal) {
          const fullName: string = (resumeProfile.full_name as string) ?? '';
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] ?? '';
          const lastName  = nameParts.slice(1).join(' ');

          const patch: Partial<ApplyPrefs> = {};
          if (!prefs.first_name && firstName)               patch.first_name    = firstName;
          if (!prefs.last_name  && lastName)                patch.last_name     = lastName;
          if (!prefs.email      && resumeProfile.email)     patch.email         = resumeProfile.email as string;
          if (!prefs.phone      && resumeProfile.phone)     patch.phone         = resumeProfile.phone as string;
          if (!prefs.linkedin_url  && resumeLinks.linkedin) patch.linkedin_url  = resumeLinks.linkedin ?? undefined;
          if (!prefs.github_url    && resumeLinks.github)   patch.github_url    = resumeLinks.github ?? undefined;
          if (!prefs.portfolio_url && resumeLinks.website)  patch.portfolio_url = resumeLinks.website ?? undefined;

          if (Object.keys(patch).length > 0) {
            prefs = { ...prefs, ...patch };
            upsertJobsPreferences({ candidate_apply_preferences: toApiPayload(prefs) }).catch(() => {});
          }
        }

        setApplyPrefs(prefs);
        setStructuredResume(resume);

        // S1
        setSalary({
          min: prefs.salary_min != null ? String(Math.round(prefs.salary_min / 1000)) : '',
          max: prefs.salary_max != null ? String(Math.round(prefs.salary_max / 1000)) : '',
        });
        setEmpTypes(prefs.employment_types ?? []);
        setWorkModes(prefs.work_modes ?? []);
        setShiftPrefs(prefs.shift_preferences ?? []);
        setWillingRelocate(prefs.relocate_willing ?? '');
        setWillingTravel(prefs.travel_willingness ?? '');
        setPrefCities(prefs.target_locations ?? []);

        // S2
        const p = {
          firstName: prefs.first_name ?? '',
          middleName: prefs.middle_name ?? '',
          lastName: prefs.last_name ?? '',
          email: prefs.email ?? '',
          phone: prefs.phone ?? '',
          appPassword: '',
        };
        setPersonal(p);
        setPDraft(p);

        // S3
        const r = {
          line1: prefs.address_line1 ?? '',
          line2: prefs.address_line2 ?? '',
          city: prefs.address_city ?? '',
          state: prefs.address_state ?? '',
          country: prefs.address_country ?? '',
          zip: prefs.postal_code ?? '',
        };
        setRes(r);
        setRDraft(r);

        // S5
        setWorkList((resume.experience ?? []).map(expFromApi));

        // S6
        setEduList((resume.education ?? []).map(eduFromApi));

        // S7
        setProfCerts(prefs.professional_certifications ?? []);
        setCloudCerts(prefs.cloud_certifications ?? []);

        // S8
        const ja = {
          usCitizen: prefs.citizenship ?? '',
          workAuth: prefs.work_auth_yes_no ?? '',
          sponsorship: prefs.needs_sponsorship ?? '',
          visaType: prefs.work_authorization ?? '',
          linkedin: prefs.linkedin_url ?? '',
          github: prefs.github_url ?? '',
          portfolio: prefs.portfolio_url ?? '',
          startDate: prefs.earliest_start_date ?? 'Immediately',
          overtime: prefs.overtime_available ?? '',
          clearance: prefs.security_clearance ?? 'None',
        };
        setJobApp(ja);
        setJaDraft(ja);
        setSelLangs(prefs.languages ?? []);

        // S9
        const e = prefs.eeo ?? {};
        const m = {
          veteran: e.veteran ?? '',
          ethnicity: e.ethnicity ?? '',
          gender: e.gender ?? '',
          orientation: e.orientation ?? '',
          disability: e.disability ?? '',
          drivingLicense: prefs.driving_license ?? '',
          licenseExpiry: prefs.driving_license_expiry ?? '',
        };
        setMisc(m);
        setMDraft(m);

        // S10
        const sa = prefs.screening_answers ?? {};
        const c = {
          relativesAtCompany: sa.relatives_at_company ?? '',
          relativesDetails: sa.relatives_at_company_details ?? '',
          previouslyEmployed: sa.previously_employed_here ?? '',
          governmentAffiliation: sa.government_affiliation ?? '',
          governmentDetails: sa.government_affiliation_details ?? '',
        };
        setCompliance(c);
        setCDraft(c);

        // S12
        setSuggestions(prefs.suggestions ?? '');
        setSugDraft(prefs.suggestions ?? '');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Save helpers ──────────────────────────────────────────────────────────
  const REQUIRED_FIELDS = ['first_name', 'middle_name', 'last_name', 'email', 'phone'] as const;

  function toApiPayload(obj: ApplyPrefs): ApplyPrefs {
    const out: ApplyPrefs = {};
    for (const [k, v] of Object.entries(obj)) {
      if ((REQUIRED_FIELDS as readonly string[]).includes(k)) {
        out[k] = (v === '' || v === undefined) ? null : v;
      } else if (v !== '' && v !== null && v !== undefined) {
        if (Array.isArray(v) && v.length === 0) continue;
        out[k] = v;
      }
    }
    for (const f of REQUIRED_FIELDS) {
      if (!(f in out)) out[f] = null;
    }
    return out;
  }

  const saveApplyPrefs = (patch: Partial<ApplyPrefs>) => {
    setApplyPrefs(prev => {
      const merged = { ...prev, ...patch };
      upsertJobsPreferences({ candidate_apply_preferences: toApiPayload(merged) }).catch(() => {});
      return merged;
    });
  };

  const saveResume = (next: StructuredResume) => {
    setStructuredResume(next);
    updateProfile(next).catch(() => {});
  };

  // ── S5/S6 sync to API on any change ──
  const commitWorkList = (list: WorkEntry[]) => {
    setWorkList(list);
    saveResume({ ...structuredResume, experience: list.map(expToApi) });
  };
  const commitEduList = (list: EduEntry[]) => {
    setEduList(list);
    saveResume({ ...structuredResume, education: list.map(eduToApi) });
  };

  // ── Completion ─────────────────────────────────────────────────────────────
  type Importance = 'core' | 'recommended' | 'optional';
  const SECTIONS: { label: string; done: boolean; hint: string; importance: Importance }[] = [
    {
      label: 'Job Preferences', importance: 'recommended',
      hint: 'Set your salary range and work preferences',
      done: salary.min.length > 0 && prefCities.length > 0,
    },
    {
      label: 'Personal Info', importance: 'core',
      hint: 'Add your full name, email, and phone',
      done: personal.firstName.length > 0 && personal.email.length > 0,
    },
    {
      label: 'Residential', importance: 'core',
      hint: 'Add your mailing address',
      done: res.line1.length > 0 && res.city.length > 0,
    },
    {
      label: 'Work Experience', importance: 'core',
      hint: 'Add your work history and internships',
      done: workList.length > 0,
    },
    {
      label: 'Education', importance: 'recommended',
      hint: 'Add your degree and school',
      done: eduList.length > 0,
    },
    {
      label: 'Certifications & Credentials', importance: 'optional',
      hint: 'Add professional or cloud certifications',
      done: profCerts.length > 0 || cloudCerts.length > 0 || certFiles.length > 0,
    },
    {
      label: 'Job Application Profile', importance: 'core',
      hint: 'Set work authorization and start date',
      done: jobApp.workAuth.length > 0,
    },
    {
      label: 'Miscellaneous', importance: 'optional',
      hint: 'Add identity and diversity information',
      done: misc.veteran.length > 0,
    },
    {
      label: 'Compliance & Legal', importance: 'optional',
      hint: 'Answer standard compliance questions',
      done: compliance.relativesAtCompany.length > 0 && compliance.previouslyEmployed.length > 0 && compliance.governmentAffiliation.length > 0,
    },
    {
      label: 'Security', importance: 'optional',
      hint: 'Add security Q&As for portal accounts',
      done: qaList.length > 0,
    },
    {
      label: 'Suggestions', importance: 'optional',
      hint: 'Leave special instructions for Screna',
      done: suggestions.trim().length > 0,
    },
  ];

  const doneCount = SECTIONS.filter(s => s.done).length;
  const donePct = Math.round((doneCount / SECTIONS.length) * 100);
  const incompleteSections = SECTIONS.filter(s => !s.done);
  const importanceOrder: Importance[] = ['core', 'recommended', 'optional'];
  const nextSteps = [...incompleteSections]
    .sort((a, b) => importanceOrder.indexOf(a.importance) - importanceOrder.indexOf(b.importance))
    .slice(0, 3);

  const fmtSize = (bytes: number) =>
    bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)}KB` : `${(bytes / 1048576).toFixed(1)}MB`;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="bg-card border border-border rounded-lg p-5">
            <div className="animate-pulse bg-muted rounded h-4 w-40 mb-3" />
            <div className="animate-pulse bg-muted rounded h-4 w-full mb-2" />
            <div className="animate-pulse bg-muted rounded h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Context / progress banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/15">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-sm text-foreground/80 leading-relaxed">
            This profile is used by Screna's <span className="font-medium text-foreground">managed apply</span> feature.
            The more complete it is, the more accurately Screna can apply to jobs on your behalf.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <MilestoneBadge doneCount={doneCount} total={SECTIONS.length} />
            <span className="text-xs text-muted-foreground">{doneCount} / {SECTIONS.length} sections complete · {donePct}%</span>
          </div>
          {nextSteps.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="text-xs text-muted-foreground">Next:</span>
              {nextSteps.map(s => (
                <span key={s.label} className="text-xs px-2 py-0.5 rounded-md bg-card border border-border text-foreground">
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── S1: Job Preference Information ── */}
      <SectionCard
        icon={SlidersHorizontal}
        title="Job Preference Information"
        description="Salary expectations, work preferences, and availability."
        complete={SECTIONS[0].done}
        editing={editJobPrefs}
        onToggle={() => {
          if (editJobPrefs) {
            const hasSalary = !!(salary.min || salary.max);
            saveApplyPrefs({
              salary_min: salary.min ? parseInt(salary.min) * 1000 : undefined,
              salary_max: salary.max ? parseInt(salary.max) * 1000 : undefined,
              salary_currency: hasSalary ? 'USD' : undefined,
              employment_types: empTypes,
              work_modes: workModes,
              shift_preferences: shiftPrefs,
              relocate_willing: willingRelocate || undefined,
              travel_willingness: willingTravel || undefined,
              target_locations: prefCities,
            });
          }
          setEditJobPrefs(v => !v);
        }}
        emptyPrompt="Tell Screna your ideal salary range, work mode, and where you want to be based."
      >
        {!editJobPrefs ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <RO label="Desired Salary" value={salary.min || salary.max ? `$${salary.min || '—'}K – $${salary.max || '—'}K / yr` : ''} />
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Employment Type</div>
              <div className="flex flex-wrap gap-1">
                {empTypes.length ? empTypes.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">{t}</span>) : <span className="text-sm text-foreground">—</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Work Mode</div>
              <div className="flex flex-wrap gap-1">
                {workModes.length ? workModes.map(m => <span key={m} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">{m}</span>) : <span className="text-sm text-foreground">—</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Preferred Cities</div>
              <div className="flex flex-wrap gap-1">
                {prefCities.length ? prefCities.map(c => <span key={c} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs text-foreground">{c}</span>) : <span className="text-sm text-foreground">—</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Shift Preference</div>
              <div className="flex flex-wrap gap-1">
                {shiftPrefs.length ? shiftPrefs.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs text-foreground">{s}</span>) : <span className="text-sm text-foreground">—</span>}
              </div>
            </div>
            <RO label="Willing to Relocate" value={willingRelocate} />
            <RO label="Willing to Travel" value={willingTravel} />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Desired Salary Range (USD / year)</label>
              <div className="flex items-center gap-3 max-w-[320px]">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input value={salary.min} onChange={e => setSalary(s => ({ ...s, min: e.target.value }))} className={`${INPUT} pl-7`} placeholder="120" />
                </div>
                <span className="text-muted-foreground text-sm shrink-0">to</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input value={salary.max} onChange={e => setSalary(s => ({ ...s, max: e.target.value }))} className={`${INPUT} pl-7`} placeholder="160" />
                </div>
                <span className="text-muted-foreground text-sm shrink-0">K</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Employment Type</label>
              <Chips options={EMP_TYPES} selected={empTypes} onChange={setEmpTypes} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Work Mode</label>
              <Chips options={WORK_MODES} selected={workModes} onChange={setWorkModes} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Shift / Schedule Preferences</label>
              <Chips options={SHIFT_OPTIONS} selected={shiftPrefs} onChange={setShiftPrefs} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Preferred Work Cities</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {prefCities.map(c => (
                  <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary text-sm text-foreground">
                    {c}
                    <button onClick={() => setPrefCities(prev => prev.filter(x => x !== c))} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <input
                  value={cityInput} onChange={e => setCityInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && cityInput.trim()) { setPrefCities(p => [...p, cityInput.trim()]); setCityInput(''); } }}
                  placeholder="Add city…"
                  className="px-3 py-1.5 rounded-full border border-dashed border-primary/40 text-primary text-sm bg-transparent focus:outline-none focus:border-primary w-[130px] placeholder:text-primary/40"
                />
              </div>
              <p className="text-xs text-muted-foreground">Press Enter to add.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Willing to Relocate</label>
                <Pills options={YES_NO} value={willingRelocate} onChange={setWillingRelocate} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Willing to Travel</label>
                <Pills options={TRAVEL_OPTIONS} value={willingTravel} onChange={setWillingTravel} />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── S2: Personal Information ── */}
      <SectionCard
        icon={User}
        title="Personal Information"
        description="Basic identifying information used to fill application forms."
        complete={SECTIONS[1].done}
        editing={editPersonal}
        onToggle={() => {
          if (editPersonal) {
            setPersonal({ ...pDraft });
            saveApplyPrefs({
              first_name: pDraft.firstName,
              middle_name: pDraft.middleName,
              last_name: pDraft.lastName,
              email: pDraft.email,
              phone: pDraft.phone,
            });
          } else setPDraft({ ...personal });
          setEditPersonal(v => !v);
        }}
        emptyPrompt="Your name, email, and phone are required on every application."
      >
        {!editPersonal ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <RO label="First Name" value={personal.firstName} />
              <RO label="Middle Name" value={personal.middleName || '—'} />
              <RO label="Last Name" value={personal.lastName} />
              <RO label="Email Address" value={personal.email} />
              <RO label="Phone Number" value={personal.phone} />
            </div>
            {personal.appPassword && (
              <div className="pt-3 mt-1 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 shrink-0" />Sensitive — local only (not synced)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <MaskedVal label="Application Password" value={personal.appPassword} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { k: 'firstName', l: 'First Name' },
              { k: 'middleName', l: 'Middle Name', optional: true },
              { k: 'lastName', l: 'Last Name' },
              { k: 'email', l: 'Email Address' },
              { k: 'phone', l: 'Phone Number' },
              { k: 'appPassword', l: 'Application Password (local only)', type: 'password', optional: true },
            ] as { k: keyof typeof pDraft; l: string; optional?: boolean; ph?: string; type?: string }[]).map(({ k, l, optional, ph, type }) => (
              <FL key={k} label={l} optional={optional}>
                <input type={type || 'text'} value={pDraft[k]} onChange={e => setPDraft(d => ({ ...d, [k]: e.target.value }))} placeholder={ph} className={INPUT} />
              </FL>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── S3: Residential Information ── */}
      <SectionCard
        icon={Building2}
        title="Residential Information"
        description="Current mailing address used on applications."
        complete={SECTIONS[2].done}
        editing={editRes}
        onToggle={() => {
          if (editRes) {
            setRes({ ...rDraft });
            saveApplyPrefs({
              address_line1: rDraft.line1,
              address_line2: rDraft.line2,
              address_city: rDraft.city,
              address_state: rDraft.state,
              address_country: rDraft.country,
              postal_code: rDraft.zip,
            });
          } else setRDraft({ ...res });
          setEditRes(v => !v);
        }}
        emptyPrompt="Many applications require a mailing address — add yours here."
      >
        {!editRes ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <RO label="Address Line 1" value={res.line1} />
            <RO label="Address Line 2" value={res.line2} />
            <RO label="City" value={res.city} />
            <RO label="State / Province" value={res.state} />
            <RO label="Country" value={res.country} />
            <RO label="ZIP / Postal Code" value={res.zip} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { k: 'line1', l: 'Address Line 1' },
              { k: 'line2', l: 'Address Line 2', optional: true },
              { k: 'city', l: 'City' },
              { k: 'state', l: 'State / Province' },
              { k: 'country', l: 'Country' },
              { k: 'zip', l: 'ZIP / Postal Code' },
            ] as { k: keyof typeof rDraft; l: string; optional?: boolean }[]).map(({ k, l, optional }) => (
              <FL key={k} label={l} optional={optional}>
                <input value={rDraft[k]} onChange={e => setRDraft(d => ({ ...d, [k]: e.target.value }))} className={INPUT} />
              </FL>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── S5: Work Experience ── */}
      <SectionCard
        icon={Briefcase}
        title="Work Experience"
        description="Previous roles used to pre-fill experience sections on applications."
        complete={SECTIONS[3].done}
        editing={addingWork}
        onToggle={() => { setAddingWork(v => !v); setWDraft({ company: '', title: '', location: '', type: 'Full-time', startDate: '', endDate: '', current: false, description: '' }); }}
        addMode
      >
        <div className="flex flex-col gap-3">
          {workList.map(exp => (
            <div key={exp.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-secondary/30 group">
              <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground mt-0.5">
                {(exp.company[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div>
                    <div className="text-sm font-medium text-foreground">{exp.title}</div>
                    <div className="text-xs text-muted-foreground">{[exp.company, exp.location, exp.type].filter(Boolean).join(' · ')}</div>
                    <div className="text-xs text-muted-foreground">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</div>
                  </div>
                  <button onClick={() => commitWorkList(workList.filter(e => e.id !== exp.id))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {exp.description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2 whitespace-pre-line">{exp.description}</p>}
              </div>
            </div>
          ))}
          {workList.length === 0 && !addingWork && (
            <MultiEmptyState
              icon={Briefcase}
              title="No work experience added"
              body="Add your past roles and internships. Screna uses this to fill experience sections and tailor your applications."
              onAdd={() => setAddingWork(true)}
            />
          )}
          <AddForm show={addingWork}
            onConfirm={() => {
              if (!wDraft.company.trim() || !wDraft.title.trim()) return;
              commitWorkList([...workList, { id: nextWid(), ...wDraft }]);
              setAddingWork(false);
            }}
            onCancel={() => setAddingWork(false)}
            confirmLabel="Add Experience"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FL label="Company"><input value={wDraft.company} onChange={e => setWDraft(d => ({ ...d, company: e.target.value }))} placeholder="e.g. Stripe" className={INPUT} /></FL>
              <FL label="Job Title"><input value={wDraft.title} onChange={e => setWDraft(d => ({ ...d, title: e.target.value }))} placeholder="e.g. PM Intern" className={INPUT} /></FL>
              <FL label="Location"><input value={wDraft.location} onChange={e => setWDraft(d => ({ ...d, location: e.target.value }))} placeholder="City, State" className={INPUT} /></FL>
              <FL label="Employment Type">
                <select value={wDraft.type} onChange={e => setWDraft(d => ({ ...d, type: e.target.value }))} className={SELECT}>
                  {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FL>
              <FL label="Start Date"><input value={wDraft.startDate} onChange={e => setWDraft(d => ({ ...d, startDate: e.target.value }))} placeholder="Jun 2023" className={INPUT} /></FL>
              <FL label="End Date"><input value={wDraft.endDate} onChange={e => setWDraft(d => ({ ...d, endDate: e.target.value, current: false }))} placeholder="Aug 2023 or leave blank for Present" className={INPUT} /></FL>
            </div>
            <FL label="Description" optional>
              <textarea value={wDraft.description} onChange={e => setWDraft(d => ({ ...d, description: e.target.value }))} rows={2} placeholder="Brief description of your role and impact..." className={`${INPUT} resize-none`} />
            </FL>
          </AddForm>
          {workList.length > 0 && !addingWork && (
            <button onClick={() => setAddingWork(true)} className="self-start flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" />Add Another Role
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── S6: Education ── */}
      <SectionCard
        icon={GraduationCap}
        title="Education"
        description="Academic background used to fill education sections on applications."
        complete={SECTIONS[4].done}
        editing={addingEdu}
        onToggle={() => { setAddingEdu(v => !v); setEDraft({ school: '', field: '', degree: "Bachelor's", startDate: '', endDate: '' }); }}
        addMode
      >
        <div className="flex flex-col gap-3">
          {eduList.map(edu => (
            <div key={edu.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-secondary/30 group">
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{[edu.degree, edu.field].filter(Boolean).join(' · ')}</div>
                <div className="text-xs text-muted-foreground">{edu.school}</div>
                <div className="text-xs text-muted-foreground">{[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}</div>
              </div>
              <button onClick={() => commitEduList(eduList.filter(e => e.id !== edu.id))}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {eduList.length === 0 && !addingEdu && (
            <MultiEmptyState
              icon={GraduationCap}
              title="No education added"
              body="Add your degree and school. Required by most application forms and used to match you to entry-level and graduate roles."
              onAdd={() => setAddingEdu(true)}
            />
          )}
          <AddForm show={addingEdu}
            onConfirm={() => {
              if (!eDraft.school.trim()) return;
              commitEduList([...eduList, { id: nextEid(), ...eDraft }]);
              setAddingEdu(false);
            }}
            onCancel={() => setAddingEdu(false)}
            confirmLabel="Add Education"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FL label="School / University"><input value={eDraft.school} onChange={e => setEDraft(d => ({ ...d, school: e.target.value }))} placeholder="e.g. UC Berkeley" className={INPUT} /></FL>
              <FL label="Field of Study"><input value={eDraft.field} onChange={e => setEDraft(d => ({ ...d, field: e.target.value }))} placeholder="e.g. Computer Science" className={INPUT} /></FL>
              <FL label="Degree">
                <select value={eDraft.degree} onChange={e => setEDraft(d => ({ ...d, degree: e.target.value }))} className={SELECT}>
                  {DEGREE_OPTIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </FL>
              <div className="grid grid-cols-2 gap-2">
                <FL label="Start Year"><input value={eDraft.startDate} onChange={e => setEDraft(d => ({ ...d, startDate: e.target.value }))} placeholder="2019" className={INPUT} /></FL>
                <FL label="End Year"><input value={eDraft.endDate} onChange={e => setEDraft(d => ({ ...d, endDate: e.target.value }))} placeholder="2023" className={INPUT} /></FL>
              </div>
            </div>
          </AddForm>
          {eduList.length > 0 && !addingEdu && (
            <button onClick={() => setAddingEdu(true)} className="self-start flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" />Add Another Degree
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── S7: Certifications & Credentials ── */}
      <SectionCard
        icon={Award}
        title="Certifications & Credentials"
        description="Professional and technical certifications that strengthen your applications."
        complete={SECTIONS[5].done}
        editing={editCerts}
        onToggle={() => {
          if (editCerts) {
            saveApplyPrefs({
              professional_certifications: profCerts,
              cloud_certifications: cloudCerts,
            });
          }
          setEditCerts(v => !v);
        }}
        emptyPrompt="Add certifications like PMP, AWS Certified, or CFA to stand out in specialized roles."
      >
        {!editCerts ? (
          <div className="flex flex-col gap-4">
            {profCerts.length === 0 && cloudCerts.length === 0 && certFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No certifications added yet.</p>
            ) : (
              <>
                {profCerts.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Professional Certifications</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profCerts.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {cloudCerts.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Cloud & Tech Certifications</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cloudCerts.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs text-foreground">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {certFiles.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Certificate Files (local only)</div>
                    <div className="flex flex-col gap-1.5">
                      {certFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-sm text-foreground">
                          <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{f.name}</span>
                          <span className="text-xs text-muted-foreground">({fmtSize(f.size)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <FL label="Professional Certifications" optional>
              <TagInput
                tags={profCerts}
                onAdd={v => { if (!profCerts.includes(v)) setProfCerts(p => [...p, v]); }}
                onRemove={v => setProfCerts(p => p.filter(c => c !== v))}
                inputValue={profCertInput}
                onInputChange={setProfCertInput}
                placeholder="e.g. PMP, CFA, CPA…"
              />
            </FL>
            <FL label="Cloud & Tech Certifications" optional>
              <TagInput
                tags={cloudCerts}
                onAdd={v => { if (!cloudCerts.includes(v)) setCloudCerts(p => [...p, v]); }}
                onRemove={v => setCloudCerts(p => p.filter(c => c !== v))}
                inputValue={cloudCertInput}
                onInputChange={setCloudCertInput}
                placeholder="Type and press Enter…"
                suggestions={CLOUD_CERT_SUGGESTIONS}
              />
            </FL>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">
                Certificate Files <span className="ml-1 normal-case font-normal">(local only — not synced to backend)</span>
              </label>
              <div className="flex flex-col gap-2">
                {certFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/40 group">
                    <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtSize(f.size)}</span>
                    <button
                      onClick={() => setCertFiles(p => p.filter(x => x.id !== f.id))}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setCertFiles(p => [
                      ...p,
                      ...files.map(f => ({ id: Date.now() + Math.random(), name: f.name, size: f.size })),
                    ]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors self-start"
                >
                  <Upload className="w-3.5 h-3.5" />Upload PDF or image
                </button>
                <p className="text-xs text-muted-foreground">Accepted: PDF, PNG, JPG. Max 10 MB per file.</p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── S8: Job Application Profile ── */}
      <SectionCard
        icon={FileText}
        title="Job Application Profile"
        description="Work authorization, professional profiles, and application eligibility."
        complete={SECTIONS[6].done}
        editing={editJobApp}
        onToggle={() => {
          if (editJobApp) {
            setJobApp({ ...jaDraft });
            saveApplyPrefs({
              citizenship: jaDraft.usCitizen || undefined,
              work_auth_yes_no: jaDraft.workAuth || undefined,
              needs_sponsorship: jaDraft.sponsorship || undefined,
              work_authorization: jaDraft.visaType || undefined,
              linkedin_url: jaDraft.linkedin,
              github_url: jaDraft.github,
              portfolio_url: jaDraft.portfolio,
              earliest_start_date: jaDraft.startDate || undefined,
              overtime_available: jaDraft.overtime || undefined,
              security_clearance: jaDraft.clearance || undefined,
              languages: selLangs,
            });
          } else setJaDraft({ ...jobApp });
          setEditJobApp(v => !v);
        }}
        emptyPrompt="Work authorization status is required on most application forms. Takes 2 minutes."
      >
        {!editJobApp ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <RO label="U.S. Citizen" value={jobApp.usCitizen} />
            <RO label="Authorized to Work" value={jobApp.workAuth} />
            <RO label="Needs Sponsorship" value={jobApp.sponsorship} />
            <RO label="Visa Type" value={jobApp.visaType} />
            <RO label="Earliest Start Date" value={jobApp.startDate} />
            <RO label="Overtime Available" value={jobApp.overtime} />
            <RO label="Security Clearance" value={jobApp.clearance} />
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Languages</div>
              <div className="flex flex-wrap gap-1">
                {selLangs.length ? selLangs.map(l => <span key={l} className="px-2 py-0.5 rounded-full bg-secondary border border-border text-xs text-foreground">{l}</span>) : <span className="text-sm text-foreground">—</span>}
              </div>
            </div>
            <RO label="LinkedIn" value={jobApp.linkedin} />
            <RO label="GitHub" value={jobApp.github} />
            <RO label="Portfolio / Website" value={jobApp.portfolio} />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                { k: 'usCitizen', l: 'U.S. Citizen', opts: YES_NO },
                { k: 'workAuth', l: 'Authorized to Work in U.S.', opts: YES_NO },
                { k: 'sponsorship', l: 'Requires Sponsorship', opts: YES_NO },
                { k: 'visaType', l: 'Visa Type', opts: VISA_TYPES },
                { k: 'startDate', l: 'Earliest Start Date', opts: START_OPTIONS },
                { k: 'overtime', l: 'Overtime Available', opts: YES_NO },
                { k: 'clearance', l: 'Security Clearance', opts: CLEARANCE_OPTIONS },
              ] as { k: keyof typeof jaDraft; l: string; opts: string[] }[]).map(({ k, l, opts }) => (
                <FL key={k} label={l}>
                  <select value={jaDraft[k]} onChange={e => setJaDraft(d => ({ ...d, [k]: e.target.value }))} className={SELECT}>
                    <option value="">—</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </FL>
              ))}
              <FL label="LinkedIn URL"><input value={jaDraft.linkedin} onChange={e => setJaDraft(d => ({ ...d, linkedin: e.target.value }))} className={INPUT} /></FL>
              <FL label="GitHub URL"><input value={jaDraft.github} onChange={e => setJaDraft(d => ({ ...d, github: e.target.value }))} className={INPUT} /></FL>
              <FL label="Portfolio / Website"><input value={jaDraft.portfolio} onChange={e => setJaDraft(d => ({ ...d, portfolio: e.target.value }))} className={INPUT} /></FL>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Languages</label>
              <Chips options={LANGUAGES_LIST} selected={selLangs} onChange={setSelLangs} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── S9: Miscellaneous (EEO + driving license) ── */}
      <SectionCard
        icon={AlertTriangle}
        title="Miscellaneous Information"
        description="Diversity, identity, and driving credentials used on certain application forms."
        variant="sensitive"
        complete={SECTIONS[7].done}
        editing={editMisc}
        onToggle={() => {
          if (editMisc) {
            setMisc({ ...mDraft });
            saveApplyPrefs({
              eeo: {
                veteran: mDraft.veteran || undefined,
                ethnicity: mDraft.ethnicity || undefined,
                gender: mDraft.gender || undefined,
                orientation: mDraft.orientation || undefined,
                disability: mDraft.disability || undefined,
              },
              driving_license: mDraft.drivingLicense || undefined,
              driving_license_expiry: mDraft.drivingLicense === 'Yes' ? (mDraft.licenseExpiry || undefined) : undefined,
            });
          } else setMDraft({ ...misc });
          setEditMisc(v => !v);
        }}
        emptyPrompt="Some applications ask for EEOC demographic fields. Optional but useful."
      >
        {!editMisc ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <RO label="Veteran Status" value={misc.veteran} />
            <RO label="Ethnicity" value={misc.ethnicity} />
            <RO label="Gender" value={misc.gender} />
            <RO label="Sexual Orientation" value={misc.orientation} />
            <RO label="Disability Status" value={misc.disability} />
            <RO label="Driving License" value={misc.drivingLicense} />
            {misc.drivingLicense === 'Yes' && <RO label="License Expiry" value={misc.licenseExpiry} />}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { k: 'veteran', l: 'Veteran Status', opts: ['Yes', 'No', 'Prefer not to say'] },
              { k: 'ethnicity', l: 'Ethnicity', opts: ['Asian', 'White', 'Hispanic or Latino', 'Black or African American', 'Two or more races', 'Other', 'Prefer not to say'] },
              { k: 'gender', l: 'Gender', opts: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
              { k: 'orientation', l: 'Sexual Orientation', opts: ['Straight / Heterosexual', 'Gay or Lesbian', 'Bisexual', 'Prefer not to say'] },
              { k: 'disability', l: 'Disability Status', opts: ['Yes', 'No', 'Prefer not to say'] },
              { k: 'drivingLicense', l: 'Driving License', opts: YES_NO },
            ] as { k: keyof typeof mDraft; l: string; opts: string[] }[]).map(({ k, l, opts }) => (
              <FL key={k} label={l}>
                <select value={mDraft[k]} onChange={e => setMDraft(d => ({ ...d, [k]: e.target.value }))} className={SELECT}>
                  <option value="">—</option>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </FL>
            ))}
            {mDraft.drivingLicense === 'Yes' && (
              <FL label="License Expiry Date">
                <input value={mDraft.licenseExpiry} onChange={e => setMDraft(d => ({ ...d, licenseExpiry: e.target.value }))} placeholder="YYYY-MM-DD" className={INPUT} />
              </FL>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── S10: Compliance & Legal ── */}
      <SectionCard
        icon={Scale}
        title="Compliance & Legal"
        description="Standard compliance questions required by Workday, ATS, and government contractors."
        variant="sensitive"
        complete={SECTIONS[8].done}
        editing={editCompliance}
        onToggle={() => {
          if (editCompliance) {
            setCompliance({ ...cDraft });
            saveApplyPrefs({
              screening_answers: {
                relatives_at_company: cDraft.relativesAtCompany || undefined,
                relatives_at_company_details: cDraft.relativesAtCompany === 'Yes' ? (cDraft.relativesDetails || undefined) : undefined,
                previously_employed_here: cDraft.previouslyEmployed || undefined,
                government_affiliation: cDraft.governmentAffiliation || undefined,
                government_affiliation_details: cDraft.governmentAffiliation === 'Yes' ? (cDraft.governmentDetails || undefined) : undefined,
              },
            });
          } else setCDraft({ ...compliance });
          setEditCompliance(v => !v);
        }}
        emptyPrompt="Some employers use Workday or government-compliant ATS forms that require these answers."
      >
        {!editCompliance ? (
          <div className="flex flex-col gap-4">
            <div className="px-3 py-2.5 rounded-md bg-amber-50/60 border border-amber-200/60 text-xs text-amber-700 leading-relaxed">
              These answers are used by Screna to auto-fill compliance sections on Workday and similar ATS platforms. They are never shared with employers independently.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <RO label="Relatives at Company" value={compliance.relativesAtCompany} />
                {compliance.relativesAtCompany === 'Yes' && compliance.relativesDetails && (
                  <p className="text-xs text-muted-foreground mt-1">{compliance.relativesDetails}</p>
                )}
              </div>
              <RO label="Previously Employed Here" value={compliance.previouslyEmployed} />
              <div>
                <RO label="Government Affiliation" value={compliance.governmentAffiliation} />
                {compliance.governmentAffiliation === 'Yes' && compliance.governmentDetails && (
                  <p className="text-xs text-muted-foreground mt-1">{compliance.governmentDetails}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="px-3 py-2.5 rounded-md bg-amber-50/60 border border-amber-200/60 text-xs text-amber-700 leading-relaxed">
              These answers are used by Screna to auto-fill compliance sections on Workday and similar ATS platforms. They are never shared with employers independently.
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Do you have any relatives currently employed at the company you're applying to?</label>
                <Pills options={YES_NO} value={cDraft.relativesAtCompany} onChange={v => setCDraft(d => ({ ...d, relativesAtCompany: v }))} />
                <AnimatePresence>
                  {cDraft.relativesAtCompany === 'Yes' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <input
                        value={cDraft.relativesDetails}
                        onChange={e => setCDraft(d => ({ ...d, relativesDetails: e.target.value }))}
                        placeholder="Name and relationship (e.g. Jane Doe, Sister)"
                        className={INPUT}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Have you previously been employed by this company?</label>
                <p className="text-xs text-muted-foreground -mt-1">Screna will answer "No" by default unless you specify otherwise.</p>
                <Pills options={YES_NO} value={cDraft.previouslyEmployed} onChange={v => setCDraft(d => ({ ...d, previouslyEmployed: v }))} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Do you have any government, military, or political affiliations to disclose?</label>
                <Pills options={YES_NO} value={cDraft.governmentAffiliation} onChange={v => setCDraft(d => ({ ...d, governmentAffiliation: v }))} />
                <AnimatePresence>
                  {cDraft.governmentAffiliation === 'Yes' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <input
                        value={cDraft.governmentDetails}
                        onChange={e => setCDraft(d => ({ ...d, governmentDetails: e.target.value }))}
                        placeholder="Describe the affiliation briefly"
                        className={INPUT}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── S11: Security Information (LOCAL ONLY — no API field) ── */}
      <SectionCard
        icon={ShieldCheck}
        title="Security Information"
        description="Security questions used to verify your identity on certain job portals. Local only — not synced to backend."
        variant="critical"
        complete={SECTIONS[9].done}
        editing={addingQA}
        onToggle={() => { setAddingQA(v => !v); setQaDraft({ question: '', answer: '' }); }}
        addMode
      >
        <div className="flex flex-col gap-3">
          {qaList.map(qa => (
            <div key={qa.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-destructive/15 bg-destructive/[0.025] group">
              <ShieldCheck className="w-4 h-4 text-destructive/50 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground mb-2">{qa.question}</div>
                <MaskedVal label="Answer" value={qa.answer} />
              </div>
              <button onClick={() => setQaList(p => p.filter(q => q.id !== qa.id))}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {qaList.length === 0 && !addingQA && (
            <MultiEmptyState
              icon={ShieldCheck}
              title="No security questions added"
              body="Some job portals ask for security questions to verify your identity. Add them here so Screna can complete those forms on your behalf."
              onAdd={() => setAddingQA(true)}
            />
          )}
          <AddForm show={addingQA}
            onConfirm={() => {
              if (!qaDraft.question.trim() || !qaDraft.answer.trim()) return;
              setQaList(p => [...p, { id: Date.now(), ...qaDraft }]);
              setAddingQA(false);
            }}
            onCancel={() => setAddingQA(false)}
            confirmLabel="Add Q&A"
          >
            <FL label="Security Question">
              <input value={qaDraft.question} onChange={e => setQaDraft(d => ({ ...d, question: e.target.value }))} placeholder="e.g. What is your mother's maiden name?" className={INPUT} />
            </FL>
            <FL label="Answer">
              <input value={qaDraft.answer} onChange={e => setQaDraft(d => ({ ...d, answer: e.target.value }))} type="password" placeholder="Your answer" className={INPUT} />
            </FL>
          </AddForm>
          {qaList.length > 0 && !addingQA && (
            <button onClick={() => setAddingQA(true)} className="self-start flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" />Add Security Q&amp;A
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── S12: Suggestions to Screna ── */}
      <SectionCard
        icon={MessageSquare}
        title="Suggestions to Screna"
        description="Special instructions Screna should follow when applying on your behalf."
        complete={SECTIONS[10].done}
        editing={editSug}
        onToggle={() => {
          if (editSug) {
            setSuggestions(sugDraft);
            saveApplyPrefs({ suggestions: sugDraft });
          } else setSugDraft(suggestions);
          setEditSug(v => !v);
        }}
        emptyPrompt="Leave instructions like preferred company sizes, things to avoid, or your preferred tone for cover letters."
      >
        {!editSug ? (
          suggestions.trim()
            ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{suggestions}</p>
            : <p className="text-sm text-muted-foreground italic">No instructions added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={sugDraft}
              onChange={e => setSugDraft(e.target.value.slice(0, 2000))}
              rows={5}
              maxLength={2000}
              placeholder="Share any requirements or instructions you want Screna to keep in mind when applying on your behalf. For example: preferred company sizes, things to avoid, cover letter tone, or application preferences."
              className={`${INPUT} resize-none`}
            />
            <p className="text-xs text-muted-foreground">{sugDraft.length} / 2000 characters</p>
          </div>
        )}
      </SectionCard>

    </div>
  );
}
