import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Camera, Check, CheckCircle2,
  FileText, Pencil, Plus, Settings, Sparkles, UploadCloud, X,
} from 'lucide-react';
import { WidePageContainer } from '@/components/newDesign/dashboard-page';

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
};

const PROFILE_ROLE_CATEGORIES = [
  { id: 'product', label: 'Product', roles: [
    { id: 'pm', label: 'Product Manager' }, { id: 'apm', label: 'Associate Product Manager' },
    { id: 'gpm', label: 'Growth Product Manager' }, { id: 'tpm', label: 'Technical Product Manager' },
  ]},
  { id: 'engineering', label: 'Engineering', roles: [
    { id: 'swe', label: 'Software Engineer' }, { id: 'fe', label: 'Frontend Engineer' },
    { id: 'be', label: 'Backend Engineer' }, { id: 'fse', label: 'Full Stack Engineer' },
  ]},
  { id: 'data', label: 'Data & AI', roles: [
    { id: 'ds', label: 'Data Scientist' }, { id: 'da', label: 'Data Analyst' },
    { id: 'mle', label: 'Machine Learning Engineer' }, { id: 'ai-eng', label: 'AI Engineer' },
  ]},
  { id: 'design', label: 'Design & Research', roles: [
    { id: 'pd', label: 'Product Designer' }, { id: 'uxd', label: 'UX Designer' }, { id: 'uxr', label: 'UX Researcher' },
  ]},
];

const PROFILE_RECOMMENDED_ROLES = [
  { id: 'pm', label: 'Product Manager', snippet: 'Lead cross-functional teams to define, build, and ship products users love.', match: 93, why: 'Direct match: PM internship + product strategy experience' },
  { id: 'apm', label: 'Associate Product Manager', snippet: 'Entry-level PM role designed for high-potential candidates at top tech companies.', match: 89, why: 'Direct match: SaaS background + cross-functional collaboration' },
  { id: 'gpm', label: 'Growth Product Manager', snippet: 'Drive user acquisition, activation, and retention through product-led growth.', match: 84, why: 'Strong fit: data-driven background + growth project experience' },
  { id: 'tpm', label: 'Technical Product Manager', snippet: 'Bridge engineering and product with strong technical fluency and execution focus.', match: 78, why: 'Good fit: technical coursework + engineering project exposure' },
];

const COMPANY_SUGGESTIONS = [
  'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb',
  'Uber', 'Lyft', 'Figma', 'Notion', 'Linear', 'Vercel', 'Coinbase', 'OpenAI',
  'Canva', 'Atlassian', 'Dropbox', 'Slack', 'Zoom', 'Snowflake', 'Databricks',
  'Ramp', 'Rippling', 'Brex', 'Scale AI', 'Anthropic', 'Mistral', 'Hugging Face',
];

const COMPANY_CATEGORIES = [
  { id: 'faang',   label: 'FAANG / Big Tech',   desc: 'Google, Meta, Apple, Amazon…' },
  { id: 'unicorn', label: 'Unicorn / Scale-up',  desc: 'Stripe, OpenAI, Airbnb…' },
  { id: 'mid',     label: 'Mid-size Company',    desc: 'Figma, Notion, Linear…' },
  { id: 'startup', label: 'Startup',             desc: 'Early-stage & fast-growing' },
  { id: 'open',    label: 'Open to all',         desc: 'No preference on size' },
];

function matchBadgeCls(match: number): string {
  if (match >= 90) return 'bg-green-50 text-green-700 border border-green-200';
  if (match >= 80) return 'bg-primary/10 text-primary border border-primary/25';
  return 'bg-muted text-muted-foreground border border-border';
}

// ════════════════════════════════════════════════════════
// PROFILE — CORE CONTENT (sub-tab 1)
// ════════════════════════════════════════════════════════
function ProfileCoreContent({ userData }: { userData: UserData | null }) {
  const displayName = userData?.firstName
    ? `${userData.firstName}${userData.lastName ? ' ' + userData.lastName : ''}`
    : 'Alex Johnson';
  const targetRole = userData?.role || 'Product Manager';
  const expLevel = userData?.experienceLevel || 'Mid-level (3–5 yrs)';
  // legacy — no longer used for display; kept for future Supabase sync
  const _defaultCompanies: string[] = (userData?.targetCompanies as string[] | undefined) ?? [];
  const completedSections = 3;
  const totalSections = 5;
  const completePct = Math.round((completedSections / totalSections) * 100);
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const profileSteps = [
    { label: 'Resume', done: true }, { label: 'Target Role', done: true },
    { label: 'Companies', done: false }, { label: 'Visa', done: false }, { label: 'Basic Info', done: true },
  ];

  // ── Resume upload state ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [resumeState, setResumeState] = useState<'idle' | 'uploading' | 'success'>('success');
  const [resumeProgress, setResumeProgress] = useState(0);
  const [resumeFile, setResumeFile] = useState<{ name: string; size: string } | null>({
    name: 'Alex_Johnson_PM_Resume_2024.pdf', size: '284 KB · Updated Oct 18, 2024',
  });
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processResumeFile = (file: File) => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!['.pdf', '.doc', '.docx'].includes(ext) || file.size > 5 * 1024 * 1024) return;
    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB · Just uploaded`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB · Just uploaded`;
    setResumeFile({ name: file.name, size: sizeStr });
    setResumeState('uploading');
    setResumeProgress(0);
    let p = 0;
    resumeTimerRef.current = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        clearInterval(resumeTimerRef.current!);
        setResumeProgress(100);
        setTimeout(() => setResumeState('success'), 300);
      } else setResumeProgress(Math.round(p));
    }, 90);
  };

  useEffect(() => () => { if (resumeTimerRef.current) clearInterval(resumeTimerRef.current); }, []);

  // ── Target Role state ──
  const [roleMode, setRoleMode] = useState<'view' | 'recommend' | 'manual'>('view');
  const [selectedRoleId, setSelectedRoleId] = useState('pm');
  const [roleQuery, setRoleQuery] = useState('');

  const filteredRoleCategories = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    if (!q) return PROFILE_ROLE_CATEGORIES;
    return PROFILE_ROLE_CATEGORIES
      .map(cat => ({ ...cat, roles: cat.roles.filter(r => r.label.toLowerCase().includes(q)) }))
      .filter(cat => cat.roles.length > 0);
  }, [roleQuery]);

  const selectedRoleLabel = PROFILE_RECOMMENDED_ROLES.find(r => r.id === selectedRoleId)?.label
    ?? PROFILE_ROLE_CATEGORIES.flatMap(c => c.roles).find(r => r.id === selectedRoleId)?.label
    ?? targetRole;

  // ── Work Authorization state ──
  const [editingVisa, setEditingVisa] = useState(false);
  const [visaStatus, setVisaStatus] = useState<'opt' | 'cpt' | 'h1b' | 'pr' | 'citizen'>('opt');

  const VISA_OPTIONS = [
    { id: 'opt',     label: 'OPT (F-1)',           sub: 'Requires OPT/H1B sponsorship' },
    { id: 'cpt',     label: 'CPT',                 sub: 'Requires CPT sponsorship' },
    { id: 'h1b',     label: 'H-1B',                sub: 'Employer sponsored' },
    { id: 'pr',      label: 'Permanent Resident',  sub: 'Green Card holder' },
    { id: 'citizen', label: 'US Citizen',           sub: 'No sponsorship required' },
  ] as const;

  // ── Target Companies state ──
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['faang', 'startup']);
  const [specificCompanies, setSpecificCompanies] = useState<string[]>(['Stripe', 'Figma', 'Linear']);
  const [companyQuery, setCompanyQuery] = useState('');
  const [editingCompanies, setEditingCompanies] = useState(false);

  const totalCompanyCount = selectedCategories.length + specificCompanies.length;

  const filteredSuggestions = COMPANY_SUGGESTIONS.filter(
    c => !specificCompanies.includes(c) && c.toLowerCase().includes(companyQuery.toLowerCase())
  );

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 pt-2">
        <div className="shrink-0">
          <label className="relative group cursor-pointer block w-16 h-16">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                setAvatarUrl(url);
              }}
            />
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-primary/15"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg ring-4 ring-primary/15">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-[Playfair_Display] text-foreground mb-0.5">{displayName}</h2>
          <p className="text-sm text-muted-foreground mb-4">{selectedRoleLabel} · {expLevel}</p>
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

      {/* ── Grid Row 1: Resume + Target Role ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.3fr)_minmax(360px,1fr)]" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Resume */}
        <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <h3 className="text-foreground">Resume</h3>
              {resumeState === 'success' && <span className="flex items-center gap-1 text-xs text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Active</span>}
            </div>
            {resumeState === 'success' && (
              <button onClick={() => resumeInputRef.current?.click()} className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors">
                <UploadCloud className="w-3.5 h-3.5" />Replace Resume
              </button>
            )}
          </div>
          <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) processResumeFile(f); }} />
          <div className="px-5 py-4 flex flex-col gap-3">
            <AnimatePresence mode="wait">
              {resumeState === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processResumeFile(f); }}
                  className={`rounded-lg border-[1.5px] transition-all duration-200 flex flex-col items-center justify-center py-8 cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-dashed border-border hover:border-primary/50 hover:bg-secondary/50'}`}
                  onClick={() => resumeInputRef.current?.click()}
                >
                  <UploadCloud className={`w-5 h-5 mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-sm font-medium text-foreground mb-1">{isDragging ? 'Release to upload' : 'Drag & drop your resume'}</p>
                  <p className="text-xs text-muted-foreground mb-3">PDF or DOCX · Max 5MB</p>
                  <button onClick={e => { e.stopPropagation(); resumeInputRef.current?.click(); }} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                    <FileText className="w-3.5 h-3.5" />Choose File
                  </button>
                </motion.div>
              )}
              {resumeState === 'uploading' && resumeFile && (
                <motion.div key="uploading" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3"><FileText className="w-5 h-5 text-primary" /></div>
                  <p className="text-sm font-medium text-foreground mb-0.5 truncate max-w-[240px]">{resumeFile.name}</p>
                  <p className="text-xs text-muted-foreground mb-4">Uploading…</p>
                  <div className="w-full max-w-[280px]">
                    <div className="flex justify-between mb-1.5"><span className="text-xs text-muted-foreground">Processing</span><span className="text-xs font-medium text-primary">{resumeProgress}%</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><motion.div className="h-full bg-primary rounded-full" style={{ width: `${resumeProgress}%` }} /></div>
                  </div>
                </motion.div>
              )}
              {resumeState === 'success' && resumeFile && (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-secondary/50">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{resumeFile.name}</div>
                      <div className="text-xs text-muted-foreground">{resumeFile.size}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button className="text-xs text-primary hover:underline">Preview</button>
                      <button className="text-xs text-muted-foreground hover:text-foreground">Download</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 px-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">Active · used for AI mock interview tailoring and job matching</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Target Role */}
        <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <h3 className="text-foreground">Target Role</h3>
              {roleMode === 'view' && <span className="flex items-center gap-1 text-xs text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Set</span>}
            </div>
            {roleMode === 'view' ? (
              <button onClick={() => setRoleMode('recommend')} className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors"><Pencil className="w-3.5 h-3.5" />Edit</button>
            ) : (
              <button onClick={() => setRoleMode('view')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"><X className="w-3.5 h-3.5" />Cancel</button>
            )}
          </div>
          {roleMode === 'view' && (
            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Current Target</span>
                <div className="text-lg font-medium text-foreground">{selectedRoleLabel}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{expLevel}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Used for</span>
                <div className="flex flex-col gap-2">
                  {[{emoji:'🎯',label:'AI mock interview tailoring'},{emoji:'💼',label:'Job matching & applications'},{emoji:'🤝',label:'Mentor pairing recommendations'}].map(item => (
                    <div key={item.label} className="flex items-center gap-2"><span className="text-sm">{item.emoji}</span><span className="text-sm text-muted-foreground">{item.label}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {(roleMode === 'recommend' || roleMode === 'manual') && (
            <div className="px-5 py-4 flex flex-col gap-3">
              {roleMode === 'recommend' && (
                <>
                  <p className="text-xs text-muted-foreground">Roles matched to your resume</p>
                  <div className="flex flex-col gap-2">
                    {PROFILE_RECOMMENDED_ROLES.map(r => (
                      <button key={r.id} onClick={() => setSelectedRoleId(r.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border ${selectedRoleId === r.id ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-secondary/50'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedRoleId === r.id ? 'border-primary' : 'border-muted-foreground/30'}`}>
                          {selectedRoleId === r.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1 min-w-0"><span className="text-sm font-medium text-foreground">{r.label}</span></div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setRoleMode('manual'); setRoleQuery(''); }} className="text-center text-xs text-primary hover:underline transition-colors py-1">None of these fit — choose manually</button>
                  <button onClick={() => setRoleMode('view')} className="flex items-center justify-center gap-2 w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity mt-1">Confirm Role <ArrowRight className="w-3.5 h-3.5" /></button>
                </>
              )}
              {roleMode === 'manual' && (
                <>
                  <button onClick={() => setRoleMode('recommend')} className="flex items-center gap-1.5 text-xs text-primary hover:underline self-start"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
                  <input type="text" value={roleQuery} onChange={e => setRoleQuery(e.target.value)} placeholder="Search roles…" className="w-full rounded-lg px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {filteredRoleCategories.map(cat => (
                      <div key={cat.label}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">{cat.label}</p>
                        {cat.roles.map(r => (
                          <button key={r.id} onClick={() => { setSelectedRoleId(r.id); setRoleMode('view'); }} className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors">{r.label}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Target Companies — full width ── */}
      {/* Target Companies */}
        <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <h3 className="text-foreground">Target Companies</h3>
              {totalCompanyCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedCategories.length > 0 && `${selectedCategories.length} ${selectedCategories.length === 1 ? 'type' : 'types'}`}
                  {selectedCategories.length > 0 && specificCompanies.length > 0 && ' · '}
                  {specificCompanies.length > 0 && `${specificCompanies.length} specific`}
                </span>
              )}
            </div>
            <button onClick={() => { setEditingCompanies(!editingCompanies); setCompanyQuery(''); }}
              className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${editingCompanies ? 'border-border text-muted-foreground hover:text-foreground' : 'border-primary/30 text-primary hover:bg-primary/5'}`}>
              {editingCompanies ? <><Check className="w-3.5 h-3.5" />Done</> : <><Plus className="w-3.5 h-3.5" />Add company</>}
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            <AnimatePresence>
              {editingCompanies && (
                <motion.div key="edit-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex flex-col gap-4 pb-1">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Company type</p>
                      <div className="flex flex-wrap gap-2">
                        {COMPANY_CATEGORIES.map(cat => (
                          <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedCategories.includes(cat.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground">or add specific</span><div className="flex-1 h-px bg-border" /></div>
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <input type="text" value={companyQuery} onChange={e => setCompanyQuery(e.target.value)} placeholder="Search company name…" className="w-full rounded-lg px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      {companyQuery && (
                        <div className="flex flex-wrap gap-1.5">
                          {filteredSuggestions.slice(0, 8).map(c => (
                            <button key={c} onClick={() => { setSpecificCompanies(prev => [...prev, c]); setCompanyQuery(''); }}
                              className="px-2.5 py-1 rounded-md text-xs border border-border hover:border-primary/30 transition-colors">
                              + {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {specificCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {specificCompanies.map(c => (
                  <span key={c} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border text-xs font-medium text-foreground">
                    {c}
                    <button onClick={() => setSpecificCompanies(prev => prev.filter(x => x !== c))} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {totalCompanyCount === 0 && !editingCompanies && (
              <div className="py-4 text-center">
                <p className="text-sm font-medium text-foreground mb-1">No target companies added</p>
                <p className="text-sm text-muted-foreground mb-4">Add companies to activate outreach.</p>
                <button onClick={() => setEditingCompanies(true)} className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity mx-auto">Add target companies <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </div>

            {/* ── Basic Info ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-foreground">Basic Info</h3>
          </div>
          <button className="flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors">
            <Settings className="w-3.5 h-3.5" />Change in Settings
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Full Name</div>
            <div className="text-sm font-medium text-foreground mb-2">{displayName}</div>
            
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Email Address</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm text-foreground truncate">
                {userData?.firstName ? `${userData.firstName.toLowerCase()}@gmail.com` : 'alex.johnson@gmail.com'}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                <BadgeCheck className="w-3 h-3" />Verified
              </span>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Account</div>
            <div className="text-sm text-foreground font-medium mb-2">Joined Sep 2024</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/15 border border-amber-400/50 shadow-[0_0_10px_hsl(38_95%_55%/0.18)]">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </span>
                  <span className="text-xs font-semibold text-amber-600 tracking-wide">Premium</span>
                </span>
              <button className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors">
                12 credits
              </button>
            </div>
          </div>
        </div>
      </div>



    </div>
  );
}

export function ProfileTab({ userData }: { userData: UserData | null }) {
  return (
    <WidePageContainer maxWidth="none">
      <ProfileCoreContent userData={userData} />
    </WidePageContainer>
  );
}
