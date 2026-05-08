import { useState } from 'react';
import {
  Sparkles, Check, Pencil, X, Plus, Trash2, BadgeCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const EMP_TYPES = [
  { id: 'full-time',  label: 'Full-time'  },
  { id: 'part-time',  label: 'Part-time'  },
  { id: 'contract',   label: 'Contract'   },
  { id: 'internship', label: 'Internship' },
];
const WORK_MODES = [
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'onsite', label: 'On-site' },
];
const DEGREE_OPTIONS = ["Associate's", "Bachelor's", "Master's", "PhD", "Other"];
const START_OPTIONS = [
  { id: 'immediately', label: 'Immediately' },
  { id: '2weeks',      label: '2 weeks'     },
  { id: '1month',      label: '1 month'     },
  { id: '3months',     label: '3 months'    },
  { id: 'flexible',    label: 'Flexible'    },
];
const COVER_LETTER_OPTIONS = [
  { id: 'auto',     label: 'Auto-generate', desc: 'Screna writes it based on your profile & job' },
  { id: 'template', label: 'Use my template', desc: 'Upload a custom cover letter template' },
  { id: 'skip',     label: 'Skip',           desc: "Don't include a cover letter" },
];

export function ApplicationProfileContent() {
  // ── Personal Details ──
  const [editPersonal, setEditPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    phone:     '+1 (415) 555-0192',
    linkedin:  'linkedin.com/in/alexjohnson',
    portfolio: 'alexjohnson.dev',
    location:  'San Francisco, CA',
  });
  const [personalDraft, setPersonalDraft] = useState({ ...personalForm });

  // ── Education ──
  const [editEducation, setEditEducation] = useState(false);
  const [educationForm, setEducationForm] = useState({
    degree:   "Bachelor's",
    field:    'Computer Science',
    school:   'UC Berkeley',
    gradYear: '2023',
    gpa:      '3.7',
  });
  const [eduDraft, setEduDraft] = useState({ ...educationForm });

  // ── Work Experience ──
  const [experiences, setExperiences] = useState([
    { id: 1, title: 'Product Manager Intern', company: 'Stripe', duration: 'Jun – Aug 2023' },
    { id: 2, title: 'Software Engineer Intern', company: 'Figma', duration: 'Jun – Aug 2022' },
  ]);
  const [addingExp, setAddingExp] = useState(false);
  const [expDraft, setExpDraft] = useState({ title: '', company: '', duration: '' });

  // ── Job Preferences ──
  const [editPreferences, setEditPreferences] = useState(false);
  const [empTypes, setEmpTypes] = useState<string[]>(['full-time']);
  const [workModes, setWorkModes] = useState<string[]>(['remote', 'hybrid']);
  const [salaryMin, setSalaryMin] = useState('120');
  const [salaryMax, setSalaryMax] = useState('160');
  const [locationTags, setLocationTags] = useState(['San Francisco, CA', 'New York, NY', 'Remote']);
  const [locationInput, setLocationInput] = useState('');

  // ── Application Defaults ──
  const [editDefaults, setEditDefaults] = useState(false);
  const [startAvail, setStartAvail] = useState('immediately');
  const [coverLetterStyle, setCoverLetterStyle] = useState('auto');

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
            <span className="flex items-center gap-1 text-xs text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Complete
            </span>
          </div>
          <button
            onClick={() => {
              if (editPersonal) setPersonalForm({ ...personalDraft });
              else setPersonalDraft({ ...personalForm });
              setEditPersonal(v => !v);
            }}
            className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
              editPersonal
                ? 'border-border text-muted-foreground hover:text-foreground'
                : 'border-primary/30 text-primary hover:bg-primary/5'
            }`}
          >
            {editPersonal ? <><Check className="w-3.5 h-3.5" />Save</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
          </button>
        </div>
        <AnimatePresence mode="wait">
          {editPersonal ? (
            <motion.div key="personal-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {([
                { label: 'Phone',             key: 'phone',     placeholder: '+1 (555) 000-0000'        },
                { label: 'Location',          key: 'location',  placeholder: 'City, State'              },
                { label: 'LinkedIn',          key: 'linkedin',  placeholder: 'linkedin.com/in/yourname' },
                { label: 'Portfolio / GitHub',key: 'portfolio', placeholder: 'yoursite.dev'             },
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
                { label: 'Phone',     value: personalForm.phone     },
                { label: 'Location',  value: personalForm.location  },
                { label: 'LinkedIn',  value: personalForm.linkedin  },
                { label: 'Portfolio', value: personalForm.portfolio },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
                  <div className="text-sm text-foreground truncate">{value}</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Education ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-foreground">Education</h3>
            <span className="flex items-center gap-1 text-xs text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Complete
            </span>
          </div>
          <button
            onClick={() => {
              if (editEducation) setEducationForm({ ...eduDraft });
              else setEduDraft({ ...educationForm });
              setEditEducation(v => !v);
            }}
            className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
              editEducation
                ? 'border-border text-muted-foreground hover:text-foreground'
                : 'border-primary/30 text-primary hover:bg-primary/5'
            }`}
          >
            {editEducation ? <><Check className="w-3.5 h-3.5" />Save</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
          </button>
        </div>
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
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{educationForm.degree} · {educationForm.field}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{educationForm.school}</div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground">Class of {educationForm.gradYear}</span>
                    {educationForm.gpa && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border inline-block" />
                        <span className="text-xs text-muted-foreground">GPA {educationForm.gpa}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Work Experience ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h3 className="text-foreground">Work Experience</h3>
            <span className="text-xs text-muted-foreground">{experiences.length} {experiences.length === 1 ? 'role' : 'roles'}</span>
          </div>
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
        </div>
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
                    onClick={() => {
                      if (!expDraft.title.trim() || !expDraft.company.trim()) return;
                      setExperiences(prev => [...prev, { id: Date.now(), ...expDraft }]);
                      setAddingExp(false);
                      setExpDraft({ title: '', company: '', duration: '' });
                    }}
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
                <div key={exp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-secondary/30 group">
                  <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                    {exp.company[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{exp.title}</div>
                    <div className="text-xs text-muted-foreground">{exp.company} · {exp.duration}</div>
                  </div>
                  <button
                    onClick={() => setExperiences(prev => prev.filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">No work experience added yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Job Preferences ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-foreground">Job Preferences</h3>
          <button
            onClick={() => setEditPreferences(v => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
              editPreferences
                ? 'border-border text-muted-foreground hover:text-foreground'
                : 'border-primary/30 text-primary hover:bg-primary/5'
            }`}
          >
            {editPreferences ? <><Check className="w-3.5 h-3.5" />Done</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
          </button>
        </div>
        <div className="px-5 py-5 flex flex-col gap-5">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Employment Type</p>
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
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Work Mode</p>
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
              <div className="text-sm font-medium text-foreground">${salaryMin}K – ${salaryMax}K per year</div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Preferred Locations</p>
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
            {editPreferences && <p className="text-xs text-muted-foreground mt-2">Press Enter to add a location.</p>}
          </div>
        </div>
      </div>

      {/* ── Application Defaults ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <h3 className="text-foreground">Application Defaults</h3>
          <button
            onClick={() => setEditDefaults(v => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium border rounded-md px-3 py-1.5 transition-colors ${
              editDefaults
                ? 'border-border text-muted-foreground hover:text-foreground'
                : 'border-primary/30 text-primary hover:bg-primary/5'
            }`}
          >
            {editDefaults ? <><Check className="w-3.5 h-3.5" />Done</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
          </button>
        </div>
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
                {START_OPTIONS.find(o => o.id === startAvail)?.label ?? 'Immediately'}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Cover Letter</p>
            <div className="flex flex-col gap-2">
              {COVER_LETTER_OPTIONS.map(({ id, label, desc }) => {
                const sel = coverLetterStyle === id;
                return (
                  <button key={id}
                    onClick={() => editDefaults && setCoverLetterStyle(id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-all ${
                      sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                    } ${editDefaults ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                      sel ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    }`}>
                      {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${sel ? 'text-primary' : 'text-foreground'}`}>{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
