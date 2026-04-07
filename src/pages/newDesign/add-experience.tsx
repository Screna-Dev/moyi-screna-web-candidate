import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Briefcase,
  Shield,
  Check,
  Plus,
  Trash2,
  FileText,
  Eye,
  ChevronDown,
  X,
  Info,
  User,
  MapPin,
  Calendar,
  BarChart,
  Clock,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Button } from '../../components/newDesign/ui/button';
import { Input } from '../../components/newDesign/ui/input';
import { Textarea } from '../../components/newDesign/ui/textarea';
import { Label } from '../../components/newDesign/ui/label';
import logoImg from '../../assets/Navbar.png';
import { createPost } from '../../services/CommunityService';
import { CompanyLogo } from '../../components/newDesign/ui/company-logo';

// ─── Step definitions ──────────────────────────────────
const STEPS = [
  { id: 'basics', label: 'Basics', icon: Building2, description: 'Company, role & round details' },
  { id: 'questions', label: 'Questions', icon: Briefcase, description: 'Questions you were asked' },
  { id: 'summary', label: 'Summary & Privacy', icon: Shield, description: 'Review and publish' },
];

// ─── Options ───────────────────────────────────────────
const COMPANIES = [
  // FAANG / Big Tech
  'Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'LinkedIn', 'Uber', 'Airbnb', 'TikTok', 'OpenAI', 'Anthropic', 'NVIDIA',
  // Large Enterprises
  'Oracle', 'SAP', 'IBM', 'Cisco', 'Adobe', 'Intel', 'HP', 'Dell', 'VMware', 'ServiceNow', 'Salesforce', 'Workday',
  // Mid-sized
  'HubSpot', 'Asana', 'Atlassian', 'Dropbox', 'Twilio', 'Zillow', 'Robinhood', 'Expedia', 'Square / Block', 'DocuSign', 'Cloudflare', 'Reddit',
  // Startups / Small
  'Early-stage Startup', 'Series A Startup', 'Series B+ Startup',
  'Prefer not to say',
];

// ─── Role Data (matching Interview Insights) ───────────
const ROLE_CATEGORY_CHIPS = ['Product', 'Engineering', 'Data & AI', 'Design & Research', 'Business / Consulting'] as const;
type RoleCategoryChip = typeof ROLE_CATEGORY_CHIPS[number];

const ROLE_TOP_LIST = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
  'Product Manager', 'Data Scientist', 'Machine Learning Engineer', 'Product Designer',
  'DevOps Engineer', 'Business Analyst',
];

const ROLE_ALIASES: Record<string, string> = {
  SWE: 'Software Engineer',
  PM: 'Product Manager',
  APM: 'Associate Product Manager',
  FE: 'Frontend Engineer',
  BE: 'Backend Engineer',
  DS: 'Data Scientist',
  MLE: 'Machine Learning Engineer',
  QA: 'QA / Test Engineer',
};

const ROLE_BY_CATEGORY: Record<RoleCategoryChip, string[]> = {
  Product: [
    'Product Manager', 'Associate Product Manager', 'Growth Product Manager', 'Technical Product Manager',
  ],
  Engineering: [
    'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
    'Mobile Engineer', 'DevOps Engineer', 'QA / Test Engineer',
  ],
  'Data & AI': [
    'Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'AI Engineer',
  ],
  'Design & Research': [
    'Product Designer', 'UX Designer', 'UX Researcher',
  ],
  'Business / Consulting': [
    'Business Analyst', 'Consultant',
  ],
};

const TOP_BY_CATEGORY: Record<RoleCategoryChip, string[]> = {
  Product: ['Product Manager', 'Associate Product Manager', 'Growth Product Manager', 'Technical Product Manager'],
  Engineering: ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'DevOps Engineer'],
  'Data & AI': ['Data Scientist', 'Machine Learning Engineer', 'Data Analyst', 'AI Engineer'],
  'Design & Research': ['Product Designer', 'UX Designer', 'UX Researcher'],
  'Business / Consulting': ['Business Analyst', 'Consultant'],
};

const ALL_ROLES = Object.values(ROLE_BY_CATEGORY).flat().filter((v, i, a) => a.indexOf(v) === i).sort();

const LEVELS = ['Junior', 'Intermediate', 'Senior', 'Staff'];
const ROUNDS = [
  'Recruiter / HR Screen', 'Online Assessment (OA)', 'Technical Phone Screen',
  'Hiring Manager Screen', 'Take-home Assignment',
  'Onsite - Coding / Algorithms', 'Onsite - System Design / Architecture',
  'Onsite - Behavioral / Leadership', 'Onsite - Product Sense / Strategy',
  'Onsite - Cross-functional / Panel', 'Executive / Final Round',
];
const OUTCOMES = ['Offer', 'Rejected', 'Pass', 'No response', 'Pending', 'Prefer not to say'];
const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  {
    label: 'Core Interview Types',
    tags: ['Behavioral', 'Technical', 'Situational / Judgment'],
  },
  {
    label: 'Product / Business',
    tags: ['Product Sense', 'Execution', 'Strategy', 'Analytical / Metrics', 'Case Study'],
  },
  {
    label: 'Engineering',
    tags: ['Coding', 'System Design', 'Debugging / Troubleshooting'],
  },
  {
    label: 'Leadership & Communication',
    tags: ['Leadership', 'Communication', 'Stakeholder Management', 'Collaboration / Conflict'],
  },
  {
    label: 'Career / Background',
    tags: ['Resume / Background', 'Experience Deep Dive', 'Career Motivation', 'Company-specific Questions'],
  },
];
const QUESTION_TAGS = TAG_CATEGORIES.flatMap(c => c.tags);

// ─── API Enum Maps ──────────────────────────────────────
const ROLE_TO_ENUM: Record<string, string> = {
  'Product Manager': 'PRODUCT_MANAGER',
  'Associate Product Manager': 'ASSOCIATE_PRODUCT_MANAGER',
  'Growth Product Manager': 'GROWTH_PRODUCT_MANAGER',
  'Technical Product Manager': 'TECHNICAL_PRODUCT_MANAGER',
  'Software Engineer': 'SOFTWARE_ENGINEER',
  'Frontend Engineer': 'FRONTEND_ENGINEER',
  'Backend Engineer': 'BACKEND_ENGINEER',
  'Full Stack Engineer': 'FULL_STACK_ENGINEER',
  'Mobile Engineer': 'MOBILE_ENGINEER',
  'DevOps Engineer': 'DEVOPS_ENGINEER',
  'QA / Test Engineer': 'QA_TEST_ENGINEER',
  'Data Scientist': 'DATA_SCIENTIST',
  'Data Analyst': 'DATA_ANALYST',
  'Machine Learning Engineer': 'ML_ENGINEER',
  'AI Engineer': 'AI_ENGINEER',
  'Product Designer': 'PRODUCT_DESIGNER',
  'UX Designer': 'UX_DESIGNER',
  'UX Researcher': 'UX_RESEARCHER',
  'Business Analyst': 'BUSINESS_ANALYST',
  'Consultant': 'CONSULTANT',
};

const ROUND_TO_ENUM: Record<string, string> = {
  'Recruiter / HR Screen': 'RECRUITER',
  'Online Assessment (OA)': 'ONLINE_ASSESSMENT',
  'Technical Phone Screen': 'TECHNICAL_PHONE_SCREEN',
  'Hiring Manager Screen': 'HIRING_MANAGER',
  'Take-home Assignment': 'TAKE_HOME',
  'Onsite - Coding / Algorithms': 'ONSITE_CODING',
  'Onsite - System Design / Architecture': 'ONSITE_SYSTEM_DESIGN',
  'Onsite - Behavioral / Leadership': 'ONSITE_BEHAVIORAL',
  'Onsite - Product Sense / Strategy': 'ONSITE_PRODUCT',
  'Onsite - Cross-functional / Panel': 'ONSITE_PANEL',
  'Executive / Final Round': 'EXECUTIVE',
};

const CATEGORY_TO_ENUM: Record<string, string> = {
  'Behavioral': 'BEHAVIORAL',
  'Technical': 'TECHNICAL',
  'Situational / Judgment': 'SITUATIONAL_JUDGMENT',
  'Product Sense': 'PRODUCT_SENSE',
  'Execution': 'EXECUTION',
  'Strategy': 'STRATEGY',
  'Analytical / Metrics': 'ANALYTICAL_METRICS',
  'Case Study': 'CASE_STUDY',
  'Coding': 'CODING',
  'System Design': 'SYSTEM_DESIGN',
  'Debugging / Troubleshooting': 'DEBUGGING_TROUBLESHOOTING',
  'Leadership': 'LEADERSHIP',
  'Communication': 'COMMUNICATION',
  'Stakeholder Management': 'STAKEHOLDER_MANAGEMENT',
  'Collaboration / Conflict': 'COLLABORATION_CONFLICT',
  'Resume / Background': 'RESUME_BACKGROUND',
  'Experience Deep Dive': 'EXPERIENCE_DEEP_DIVE',
  'Career Motivation': 'CAREER_MOTIVATION',
  'Company-specific Questions': 'COMPANY_SPECIFIC',
};

const toRoleEnum = (v: string) => ROLE_TO_ENUM[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
const toRoundEnum = (v: string) => ROUND_TO_ENUM[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
const toCategoryEnum = (v: string) => CATEGORY_TO_ENUM[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');


interface QuestionEntry {
  id: string;
  title: string;
  tags: string[];
  notes: string;
}

// ─── Dropdown select component ─────────────────────────
function DropdownSelect({
  label,
  icon: Icon,
  placeholder,
  options,
  value,
  onChange,
  optional = false,
  hasError = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        // Commit whatever the user typed when clicking away
        if (inputValue.trim() && inputValue !== value) {
          onChange(inputValue.trim());
        } else if (!inputValue.trim()) {
          setInputValue(value); // revert to last committed value
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inputValue, value, onChange]);

  const filtered = options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));
  const exactMatch = options.find(o => o.toLowerCase() === inputValue.toLowerCase());

  const handleSelect = (opt: string) => {
    onChange(opt);
    setInputValue(opt);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        // If there's an exact match, use the properly cased version
        onChange(exactMatch || inputValue.trim());
        setInputValue(exactMatch || inputValue.trim());
      }
      setOpen(false);
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setInputValue(value);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <Label className="text-[hsl(222,12%,45%)] text-sm flex items-center gap-1">
        {label}
        {!optional && <span className="text-red-400">*</span>}
        {optional && <span className="text-[hsl(222,12%,70%)] text-xs ml-1">(optional)</span>}
      </Label>
      <div className="relative">
        <div
          className={`w-full h-11 px-3 rounded-xl border bg-[hsl(220,20%,99%)] flex items-center gap-2.5 transition-all ${
            open ? 'border-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20' : hasError && !value ? 'border-red-400 ring-2 ring-red-400/20' : 'border-[hsl(220,16%,90%)] hover:border-[hsl(220,16%,82%)]'
          }`}
        >
          <Icon className="w-4 h-4 text-[hsl(222,12%,55%)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,60%)] outline-none"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(''); onChange(''); inputRef.current?.focus(); }}
              className="text-[hsl(222,12%,60%)] hover:text-[hsl(222,12%,40%)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[hsl(222,12%,55%)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus(); }}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 overflow-hidden"
            >
              {/* Suggestions header */}
              {inputValue && filtered.length > 0 && (
                <div className="px-3 pt-2.5 pb-1.5">
                  <p className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">Suggestions</p>
                </div>
              )}
              {!inputValue && (
                <div className="px-3 pt-2.5 pb-1.5">
                  <p className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">Popular options</p>
                </div>
              )}
              <div className="max-h-52 overflow-y-auto p-1">
                {filtered.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      value === opt ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium' : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
                    }`}
                  >
                    <span>{opt}</span>
                    {value === opt && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />}
                  </button>
                ))}
                {filtered.length === 0 && inputValue && (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-[hsl(222,12%,50%)] mb-1">No matches found</p>
                    <p className="text-[11px] text-[hsl(222,12%,60%)]">
                      Press <kbd className="px-1.5 py-0.5 bg-[hsl(220,20%,96%)] rounded text-[10px] font-mono border border-[hsl(220,16%,90%)]">Enter</kbd> to use "<span className="font-medium text-[hsl(222,22%,15%)]">{inputValue}</span>"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Role Select (Interview Insights style) ────────────
function RoleSelect({
  value,
  onChange,
  hasError = false,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [categoryChip, setCategoryChip] = useState<RoleCategoryChip | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (inputValue.trim() && inputValue !== value) onChange(inputValue.trim());
        else if (!inputValue.trim()) setInputValue(value);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inputValue, value, onChange]);

  const handleSelect = (opt: string) => { onChange(opt); setInputValue(opt); setOpen(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        const exact = ALL_ROLES.find(r => r.toLowerCase() === inputValue.toLowerCase());
        onChange(exact || inputValue.trim());
        setInputValue(exact || inputValue.trim());
      }
      setOpen(false);
    }
    if (e.key === 'Escape') { setOpen(false); setInputValue(value); inputRef.current?.blur(); }
  };

  const categoryPool = categoryChip ? ROLE_BY_CATEGORY[categoryChip] : ALL_ROLES;
  const topList = categoryChip ? TOP_BY_CATEGORY[categoryChip] : ROLE_TOP_LIST;
  const q = inputValue.trim().toLowerCase();

  const renderRoleList = () => {
    if (q) {
      const aliasMatches = new Set<string>();
      const matchedAliasLookup = new Map<string, string>();
      Object.entries(ROLE_ALIASES).forEach(([alias, fullName]) => {
        if (alias.toLowerCase().includes(q)) {
          aliasMatches.add(fullName);
          if (!fullName.toLowerCase().includes(q)) matchedAliasLookup.set(fullName, alias);
        }
      });
      const matched = categoryPool.filter(c => c.toLowerCase().includes(q) || aliasMatches.has(c)).sort();
      if (matched.length === 0) {
        return (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-[hsl(222,12%,50%)] mb-1">No roles found</p>
            <p className="text-[11px] text-[hsl(222,12%,60%)]">
              Press <kbd className="px-1.5 py-0.5 bg-[hsl(220,20%,96%)] rounded text-[10px] font-mono border border-[hsl(220,16%,90%)]">Enter</kbd> to use "<span className="font-medium text-[hsl(222,22%,15%)]">{inputValue}</span>"
            </p>
          </div>
        );
      }
      return (
        <div className="p-1.5 space-y-0.5">
          {matched.map(option => (
            <button key={option} type="button" onClick={() => handleSelect(option)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                value === option ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium' : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
              }`}>
              <span>
                {option}
                {matchedAliasLookup.has(option) && <span className="ml-1.5 text-[11px] text-[hsl(222,12%,55%)]">({matchedAliasLookup.get(option)})</span>}
              </span>
              {value === option && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />}
            </button>
          ))}
        </div>
      );
    }
    const restList = [...categoryPool].filter(c => !topList.includes(c)).sort();
    return (
      <>
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">
            {categoryChip ? `Top ${categoryChip}` : 'Top roles'}
          </span>
        </div>
        <div className="px-1.5 pb-1 space-y-0.5">
          {topList.map(option => (
            <button key={option} type="button" onClick={() => handleSelect(option)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                value === option ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium' : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
              }`}>
              <span>{option}</span>
              {value === option && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />}
            </button>
          ))}
        </div>
        {restList.length > 0 && (
          <>
            <div className="px-3 pt-2 pb-1 border-t border-[hsl(220,16%,94%)]">
              <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">All roles</span>
            </div>
            <div className="px-1.5 pb-1 space-y-0.5">
              {restList.map(option => (
                <button key={option} type="button" onClick={() => handleSelect(option)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    value === option ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium' : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
                  }`}>
                  <span>{option}</span>
                  {value === option && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />}
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <Label className="text-[hsl(222,12%,45%)] text-sm flex items-center gap-1">Role <span className="text-red-400">*</span></Label>
      <div className="relative">
        <div
          className={`w-full h-11 px-3 rounded-xl border bg-[hsl(220,20%,99%)] flex items-center gap-2.5 transition-all ${
            open ? 'border-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20' : hasError && !value ? 'border-red-400 ring-2 ring-red-400/20' : 'border-[hsl(220,16%,90%)] hover:border-[hsl(220,16%,82%)]'
          }`}
        >
          <Briefcase className="w-4 h-4 text-[hsl(222,12%,55%)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search role…"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,60%)] outline-none"
          />
          {inputValue && (
            <button type="button" onClick={() => { setInputValue(''); onChange(''); inputRef.current?.focus(); }}
              className="text-[hsl(222,12%,60%)] hover:text-[hsl(222,12%,40%)] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[hsl(222,12%,55%)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus(); }}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 overflow-hidden"
            >
              {/* Category chips */}
              <div className="p-2 flex flex-wrap gap-1.5 border-b border-[hsl(220,16%,92%)]">
                {ROLE_CATEGORY_CHIPS.map(chip => (
                  <button key={chip} type="button"
                    onClick={() => setCategoryChip(categoryChip === chip ? null : chip)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      categoryChip === chip
                        ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                        : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                    }`}>
                    {chip}
                  </button>
                ))}
              </div>
              {/* Role list */}
              <div className="max-h-56 overflow-y-auto">
                {renderRoleList()}
              </div>
              {/* Footer */}
              <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                <button type="button" onClick={() => { setCategoryChip(null); setInputValue(''); onChange(''); }}
                  className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                <button type="button" onClick={() => setOpen(false)}
                  className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Done</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Question title input ───────────────────────────────
function QuestionTitleInput({
  value,
  onChange,
  hasError = false,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Type your interview question..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(220,20%,99%)] text-sm outline-none focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 transition-all ${
          hasError && !value.trim() ? 'border-red-400 ring-2 ring-red-400/20' : 'border-[hsl(220,16%,90%)]'
        }`}
      />
    </div>
  );
}

// ─── Month / Year Picker ───────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => CURRENT_YEAR - i);

function MonthYearPicker({ value, onChange, hasError = false }: { value: string; onChange: (v: string) => void; hasError?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pendingMonth, setPendingMonth] = useState('');
  const [pendingYear, setPendingYear] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const parts = value.split(' ');
  const selectedMonth = parts[0] || '';
  const selectedYear = parts[1] || '';

  // Sync pending state when picker opens
  useEffect(() => {
    if (open) {
      setPendingMonth(selectedMonth);
      setPendingYear(selectedYear);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const confirm = (month: string, year: string) => {
    if (month && year) {
      onChange(`${month} ${year}`);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[hsl(222,12%,45%)] text-sm flex items-center gap-1">
        Date <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(!open)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(!open); }}
          className={`w-full h-11 px-3 rounded-xl border bg-[hsl(220,20%,99%)] flex items-center gap-2.5 cursor-pointer transition-all ${
            open
              ? 'border-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20'
              : hasError && !value
                ? 'border-red-400 ring-2 ring-red-400/20'
                : 'border-[hsl(220,16%,90%)] hover:border-[hsl(220,16%,82%)]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[hsl(222,12%,55%)] shrink-0" />
          <span className={`flex-1 text-left text-sm ${value ? 'text-[hsl(222,22%,15%)]' : 'text-[hsl(222,12%,60%)]'}`}>
            {value || 'Select month & year'}
          </span>
          {value ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="text-[hsl(222,12%,60%)] hover:text-[hsl(222,12%,40%)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 text-[hsl(222,12%,55%)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 p-3"
            >
              {/* Month */}
              <p className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-2">Month</p>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {MONTHS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setPendingMonth(m); confirm(m, pendingYear); }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pendingMonth === m
                        ? 'bg-[hsl(221,91%,60%)] text-white'
                        : 'bg-[hsl(220,20%,97%)] text-[hsl(222,22%,15%)] hover:bg-[hsl(221,91%,60%)]/10 hover:text-[hsl(221,91%,60%)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Year */}
              <p className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-2">Year</p>
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setPendingYear(String(y)); confirm(pendingMonth, String(y)); }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pendingYear === String(y)
                        ? 'bg-[hsl(221,91%,60%)] text-white'
                        : 'bg-[hsl(220,20%,97%)] text-[hsl(222,22%,15%)] hover:bg-[hsl(221,91%,60%)]/10 hover:text-[hsl(221,91%,60%)]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Tag selector ──────────────────────────────────────
function TagSelector({ selected, onChange, hasError }: { selected: string[]; onChange: (tags: string[]) => void; hasError?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setTagSearch('');
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else if (selected.length < 3) {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-xs transition-colors ${hasError ? 'border-red-400 text-red-400 hover:border-red-500 hover:text-red-500' : 'border-[hsl(220,16%,85%)] text-[hsl(222,12%,55%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)]'}`}
      >
        <Plus className="w-3 h-3" />
        {selected.length > 0 ? `${selected.length} tag${selected.length > 1 ? 's' : ''}` : 'Add tags'}
      </button>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-[10px] font-medium">
              {t}
              <button type="button" onClick={() => toggle(t)} className="hover:text-red-500 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 flex flex-col max-h-72"
          >
            {/* Search input */}
            <div className="px-2.5 pt-2.5 pb-1.5 border-b border-[hsl(220,16%,92%)] shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search or add custom tag..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,65%)] focus:outline-none focus:border-[hsl(221,91%,60%)] focus:ring-1 focus:ring-[hsl(221,91%,60%)]/20 transition-colors"
                />
              </div>
            </div>

            {/* Filtered results */}
            <div className="overflow-y-auto flex-1">
              {(() => {
                const q = tagSearch.trim().toLowerCase();
                const filteredCategories = TAG_CATEGORIES.map(category => ({
                  ...category,
                  tags: category.tags.filter(tag => !q || tag.toLowerCase().includes(q)),
                })).filter(category => category.tags.length > 0);

                const exactMatch = TAG_CATEGORIES.some(c => c.tags.some(t => t.toLowerCase() === q));
                const alreadySelected = selected.some(t => t.toLowerCase() === q);
                const showCustom = q.length > 0 && !exactMatch && !alreadySelected;

                return (
                  <>
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(category => (
                        <div key={category.label}>
                          <div className="px-3 pt-2.5 pb-1 sticky top-0 bg-white">
                            <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">{category.label}</span>
                          </div>
                          <div className="px-1.5 pb-1 space-y-0.5">
                            {category.tags.map(tag => (
                              <label key={tag} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer">
                                <input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)} className="w-3.5 h-3.5 accent-[hsl(221,91%,60%)]" />
                                <span className="text-xs text-[hsl(222,22%,15%)]">
                                  {q ? (() => {
                                    const idx = tag.toLowerCase().indexOf(q);
                                    if (idx === -1) return tag;
                                    return <>{tag.slice(0, idx)}<span className="text-[hsl(221,91%,60%)] font-medium">{tag.slice(idx, idx + q.length)}</span>{tag.slice(idx + q.length)}</>;
                                  })() : tag}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : !showCustom ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-[hsl(222,12%,55%)]">No matching tags found</p>
                      </div>
                    ) : null}

                    {/* Custom tag option */}
                    {showCustom && (
                      <div className="px-1.5 pb-1.5 pt-1 border-t border-[hsl(220,16%,92%)]">
                        <button
                          type="button"
                          onClick={() => {
                            const customTag = tagSearch.trim();
                            if (customTag && !selected.includes(customTag) && selected.length < 3) {
                              onChange([...selected, customTag]);
                              setTagSearch('');
                            }
                          }}
                          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-[hsl(221,91%,60%)]/5 transition-colors text-left group"
                        >
                          <div className="w-5 h-5 rounded-md bg-[hsl(221,91%,60%)]/10 flex items-center justify-center shrink-0">
                            <Plus className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                          </div>
                          <span className="text-xs text-[hsl(222,22%,15%)]">
                            Add <span className="font-medium text-[hsl(221,91%,60%)]">"{tagSearch.trim()}"</span> as custom tag
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ────────────────────────────────────
export function AddExperiencePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(false);

  // Step 1: Basics
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [round, setRound] = useState('');
  const [date, setDate] = useState('');
  const [outcome, setOutcome] = useState('');
  const [location, setLocation] = useState('');

  // Step 2: Questions
  const [questions, setQuestions] = useState<QuestionEntry[]>([
    { id: '1', title: '', tags: [], notes: '' },
  ]);

  // Step 3: Summary & Privacy
  const [overallSummary, setOverallSummary] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions([...questions, {
      id: Math.random().toString(36).substring(7),
      title: '', tags: [], notes: '',
    }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, updates: Partial<QuestionEntry>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const canNext = () => {
    if (step === 0) return company && role && level && round && date;
    if (step === 1) {
      const filled = questions.filter(q => q.title.trim().length > 0);
      return filled.length > 0 && filled.every(q => q.tags.length >= 1 && q.tags.length <= 3);
    }
    if (step === 2) return safetyChecked;
    return false;
  };

  const handlePublish = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const questionItems = questions
        .filter(q => q.title.trim().length > 0)
        .map(q => ({
          title: q.title.trim(),
          categories: q.tags.map(toCategoryEnum),
          notes: q.notes.trim(),
        }));
      await createPost({
        company,
        role: toRoleEnum(role),
        level,
        round: toRoundEnum(round),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        outcome,
        location,
        questions: questionItems,
        summary: overallSummary,
        isAnonymous,
      });
      setPublished(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Published Success Screen ────────────────────────
  if (published) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,99%)] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-2">Submitted for Review</h1>
          <p className="text-[hsl(222,12%,45%)] mb-8 leading-relaxed">
            Thank you for sharing! Your experience is now under review by our moderation team. You'll be notified once it's approved and live.
          </p>

          <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-3">
              <CompanyLogo company={company === 'Prefer not to say' ? undefined : company} size="sm" />
              <div>
                <p className="text-sm font-semibold text-[hsl(222,22%,15%)]">{company} · {role}</p>
                <p className="text-xs text-[hsl(222,12%,55%)]">{round} · {level}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[hsl(222,12%,55%)]">{questions.filter(q => q.title).length} questions shared</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                Pending review
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* <Link to="/dashboard/contributions">
              <Button className="w-full bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl h-11 gap-2">
                <Eye className="w-4 h-4" />
                View in My Contributions
              </Button>
            </Link> */}
            <div className="flex gap-3">
              <Link to="/interview-insights" className="flex-1">
                <Button variant="outline" className="w-full rounded-xl h-10 text-sm gap-2">
                  Browse experiences
                </Button>
              </Link>
              <Link to="/add-experience" className="flex-1" onClick={() => window.location.reload()}>
                <Button variant="outline" className="flex-1 w-full rounded-xl h-10 text-sm gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Share another
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,99%)] flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="h-14 border-b border-[hsl(220,16%,92%)] bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/interview-insights')}
            className="flex items-center gap-2 text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-5 w-px bg-[hsl(220,16%,90%)]" />
          <img src={logoImg} alt="Screna" className="h-6 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(222,12%,65%)]">Draft saved</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar: Step Navigation ─── */}
        <div className="hidden md:flex w-72 border-r border-[hsl(220,16%,92%)] bg-white p-6 flex-col shrink-0">
          <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-1">Add Experience</h2>
          <p className="text-xs text-[hsl(222,12%,55%)] mb-8">Share your interview journey</p>

          <nav className="space-y-1 flex-1">
            {STEPS.map((s, i) => {
              const isActive = step === i;
              const isDone = step > i;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => { if (i <= step) setStep(i); }}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[hsl(221,91%,60%)]/8'
                      : isDone
                        ? 'hover:bg-[hsl(220,20%,98%)]'
                        : 'opacity-50 cursor-not-allowed'
                  }`}
                  disabled={i > step}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-600'
                      : isActive
                        ? 'bg-[hsl(221,91%,60%)] text-white'
                        : 'bg-[hsl(220,20%,97%)] text-[hsl(222,12%,55%)]'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-[hsl(221,91%,60%)]' : isDone ? 'text-[hsl(222,22%,15%)]' : 'text-[hsl(222,12%,55%)]'}`}>
                      {s.label}
                    </p>
                    <p className="text-[11px] text-[hsl(222,12%,60%)] mt-0.5">{s.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Progress */}
          <div className="mt-auto pt-6 border-t border-[hsl(220,16%,94%)]">
            <div className="flex items-center justify-between text-xs text-[hsl(222,12%,55%)] mb-2">
              <span>Progress</span>
              <span className="font-medium">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-[hsl(220,20%,94%)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[hsl(221,91%,60%)] rounded-full"
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Mobile step indicator */}
          <div className="md:hidden px-6 py-4 border-b border-[hsl(220,16%,94%)] bg-white">
            <div className="flex items-center gap-2 mb-3">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step > i ? 'bg-emerald-50 text-emerald-600' : step === i ? 'bg-[hsl(221,91%,60%)] text-white' : 'bg-[hsl(220,20%,96%)] text-[hsl(222,12%,55%)]'
                  }`}>
                    {step > i ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${step > i ? 'bg-emerald-200' : 'bg-[hsl(220,16%,92%)]'}`} />}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-[hsl(222,22%,15%)]">{STEPS[step].label}</p>
          </div>

          <div className="max-w-2xl mx-auto px-6 py-8">
            <AnimatePresence mode="wait">
              {/* ─── Step 1: Basics ─── */}
              {step === 0 && (
                <motion.div
                  key="basics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-1">Basic Details</h2>
                    <p className="text-sm text-[hsl(222,12%,55%)]">Tell us about the company and interview round.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <DropdownSelect label="Company" icon={Building2} placeholder="Select company" options={COMPANIES} value={company} onChange={setCompany} hasError={showErrors && !company} />
                    <RoleSelect value={role} onChange={setRole} hasError={showErrors && !role} />
                    <DropdownSelect label="Level" icon={BarChart} placeholder="Select level" options={LEVELS} value={level} onChange={setLevel} hasError={showErrors && !level} />
                    <DropdownSelect label="Round type" icon={FileText} placeholder="Select round" options={ROUNDS} value={round} onChange={setRound} hasError={showErrors && !round} />
                    <MonthYearPicker value={date} onChange={setDate} hasError={showErrors && !date} />
                    <DropdownSelect label="Outcome" icon={Check} placeholder="Select outcome" options={OUTCOMES} value={outcome} onChange={setOutcome} optional />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[hsl(222,12%,45%)] text-sm flex items-center gap-1">
                      Location
                      <span className="text-[hsl(222,12%,70%)] text-xs ml-1">(optional)</span>
                    </Label>
                    <div className="relative max-w-xs">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
                      <Input
                        type="text"
                        placeholder="e.g. San Francisco, Remote"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="h-11 pl-10 rounded-xl border-[hsl(220,16%,90%)] bg-[hsl(220,20%,99%)]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Step 2: Questions ─── */}
              {step === 1 && (
                <motion.div
                  key="questions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-1">Interview Questions</h2>
                    <p className="text-sm text-[hsl(222,12%,55%)]">Add 1–10 questions from this round. At least one question is required.</p>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, qi) => {
                      const noFilledQuestions = questions.every(qq => !qq.title.trim());
                      const titleError = showErrors && !q.title.trim() && noFilledQuestions;
                      const tagsError = showErrors && q.title.trim().length > 0 && q.tags.length === 0;
                      return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-xl border border-[hsl(220,16%,90%)] p-5 relative group"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[hsl(221,91%,60%)]/10 flex items-center justify-center text-[11px] font-bold text-[hsl(221,91%,60%)]">
                              {qi + 1}
                            </span>
                            <span className="text-sm font-medium text-[hsl(222,22%,15%)]">Question {qi + 1}</span>
                            {/* Status */}
                            {q.title.trim() ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-medium">
                                AI Hints after publish
                              </span>
                            ) : null}
                          </div>
                          {questions.length > 1 && (
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[hsl(222,12%,55%)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Title */}
                        <div className="mb-4">
                          <Label className="text-xs text-[hsl(222,12%,55%)] mb-1.5 block">
                            Question title <span className="text-red-400">*</span>
                          </Label>
                          <QuestionTitleInput
                            value={q.title}
                            onChange={v => updateQuestion(q.id, { title: v })}
                            hasError={titleError}
                          />
                        </div>

                        {/* Tags */}
                        <div className="mb-4">
                          <Label className={`text-xs mb-1.5 block ${tagsError ? 'text-red-500' : 'text-[hsl(222,12%,55%)]'}`}>Category <span className="text-red-400">*</span> <span className="text-[hsl(222,12%,70%)]">(1–3)</span></Label>
                          <TagSelector selected={q.tags} onChange={tags => updateQuestion(q.id, { tags })} hasError={tagsError} />
                        </div>

                        {/* Notes */}
                        <div>
                          <Label className="text-xs text-[hsl(222,12%,55%)] mb-1.5 flex items-center gap-1">
                            Notes — what worked, pitfalls
                            <span className="text-[hsl(222,12%,70%)]">(optional)</span>
                          </Label>
                          <Textarea
                            value={q.notes}
                            onChange={e => updateQuestion(q.id, { notes: e.target.value })}
                            placeholder="Share your approach, what went well, what you'd do differently..."
                            className="rounded-xl border-[hsl(220,16%,90%)] bg-[hsl(220,20%,99%)] min-h-[80px] resize-y text-sm"
                          />
                        </div>
                      </motion.div>
                    );
                    })}

                    {questions.length < 10 && (
                      <button
                        onClick={addQuestion}
                        className="w-full py-3.5 rounded-xl border-2 border-dashed border-[hsl(220,16%,88%)] text-sm font-medium text-[hsl(222,12%,55%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,60%)]/5 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add another question ({questions.length}/10)
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─── Step 3: Summary & Privacy ─── */}
              {step === 2 && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-2xl font-semibold text-[hsl(222,22%,15%)] mb-1">Summary & Privacy</h2>
                    <p className="text-sm text-[hsl(222,12%,55%)]">Add a summary and choose how you want to appear.</p>
                  </div>

                  {/* Overall Summary */}
                  <div>
                    <Label className="text-[hsl(222,12%,45%)] text-sm mb-1.5 flex items-center gap-1">
                      Overall summary
                      <span className="text-[hsl(222,12%,70%)] text-xs ml-1">(optional)</span>
                    </Label>
                    <Textarea
                      value={overallSummary}
                      onChange={e => setOverallSummary(e.target.value)}
                      placeholder="Describe your overall experience — how was the process, tips for future candidates..."
                      className="rounded-xl border-[hsl(220,16%,90%)] bg-[hsl(220,20%,99%)] min-h-[120px] resize-y text-sm"
                    />
                  </div>

                  {/* Anonymity */}
                  <div>
                    <Label className="text-[hsl(222,12%,45%)] text-sm mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      How your name appears
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: true, label: 'Anonymous', desc: 'Identity completely hidden', icon: '🕶️' },
                        { value: false, label: 'Public', desc: 'Show your display name', icon: '👤' },
                      ].map(opt => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => setIsAnonymous(opt.value)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            isAnonymous === opt.value
                              ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5'
                              : 'border-[hsl(220,16%,92%)] hover:border-[hsl(220,16%,82%)]'
                          }`}
                        >
                          <span className="text-lg mb-2 block">{opt.icon}</span>
                          <p className="text-sm font-medium text-[hsl(222,22%,15%)]">{opt.label}</p>
                          <p className="text-[11px] text-[hsl(222,12%,55%)] mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Safety Checklist */}
                  <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-100">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-900">Safety Checklist</p>
                        <p className="text-xs text-amber-700 mt-0.5">Please confirm before publishing</p>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={safetyChecked}
                        onChange={e => setSafetyChecked(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-[hsl(221,91%,60%)]"
                      />
                      <span className="text-sm text-amber-800 leading-relaxed group-hover:text-amber-900">
                        I confirm this post does not contain personal information about any recruiter or interviewer
                        (names, emails, phone numbers, social profiles).
                      </span>
                    </label>
                  </div>

                  {/* Preview */}
                  <div className="bg-white rounded-xl border border-[hsl(220,16%,90%)] p-5">
                    <p className="text-xs font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-3">Preview</p>
                    <div className="flex items-center gap-2 mb-2">
                      <CompanyLogo company={company === 'Prefer not to say' ? undefined : company} size="sm" />
                      <span className="text-sm font-semibold text-[hsl(222,22%,15%)]">{company || '—'}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-sm text-[hsl(222,12%,45%)]">{role || '—'}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-sm text-[hsl(222,12%,45%)]">{round || '—'}</span>
                    </div>
                    <p className="text-xs text-[hsl(222,12%,55%)]">
                      by {isAnonymous ? 'Anonymous' : 'You'} · {date || 'Date'} · {level || 'Level'}
                    </p>
                    {overallSummary && <p className="text-sm text-[hsl(222,12%,35%)] mt-3 line-clamp-2">{overallSummary}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {questions.filter(q => q.title).slice(0, 3).map((q, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-[11px] text-[hsl(222,22%,25%)] truncate max-w-[180px]">
                          {q.title}
                        </span>
                      ))}
                      {questions.filter(q => q.title).length > 3 && (
                        <span className="px-2 py-0.5 rounded-lg bg-[hsl(221,91%,60%)]/8 text-[hsl(221,91%,60%)] text-[11px] font-medium">
                          +{questions.filter(q => q.title).length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── Sticky Bottom Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(220,16%,92%)] z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto md:ml-[calc(18rem+((100%-18rem)/2)-16rem)] px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => { setStep(Math.max(0, step - 1)); setShowErrors(false); }}
            disabled={step === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              step === 0 ? 'text-[hsl(222,12%,70%)] cursor-not-allowed' : 'text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex flex-col items-end gap-2">
            {submitError && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 max-w-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {submitError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[hsl(222,12%,65%)] hidden sm:block">Step {step + 1} of {STEPS.length}</span>
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => {
                    if (canNext()) {
                      setShowErrors(false);
                      setStep(step + 1);
                    } else {
                      setShowErrors(true);
                    }
                  }}
                  className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,20%)] text-white rounded-xl px-6 h-10 text-sm gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={!canNext() || submitting}
                  className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl px-6 h-10 text-sm gap-2 shadow-lg shadow-[hsl(221,91%,60%)]/20 disabled:opacity-40"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Submit for Review</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}