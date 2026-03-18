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
  Search,
  Sparkles,
  Link2,
  FileText,
  Eye,
  ChevronDown,
  Share2,
  Bot,
  PartyPopper,
  X,
  Info,
  User,
  MapPin,
  Calendar,
  BarChart,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/newDesign/ui/button';
import { Input } from '../../components/newDesign/ui/input';
import { Textarea } from '../../components/newDesign/ui/textarea';
import { Label } from '../../components/newDesign/ui/label';
import logoImg from '../../assets/Navbar.png';
import { createBulkQuestions } from '../../services/QuestionBankService';

// ─── Step definitions ──────────────────────────────────
const STEPS = [
  { id: 'basics', label: 'Basics', icon: Building2, description: 'Company, role & round details' },
  { id: 'questions', label: 'Questions', icon: Briefcase, description: 'Questions you were asked' },
  { id: 'summary', label: 'Summary & Privacy', icon: Shield, description: 'Review and publish' },
];

// ─── Options ───────────────────────────────────────────
const COMPANIES = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb', 'Uber', 'Spotify', 'Prefer not to say'];

// ─── Role Data (matching Interview Insights) ───────────
const ROLE_CATEGORY_CHIPS = ['Engineering', 'Data / AI', 'Product', 'Design', 'Business / Other'] as const;
type RoleCategoryChip = typeof ROLE_CATEGORY_CHIPS[number];

const ROLE_TOP_LIST = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Data Scientist',
  'ML Engineer', 'Product Manager', 'Product Designer', 'Engineering Manager',
  'TPM', 'DevOps Engineer',
];

const ROLE_ALIASES: Record<string, string> = {
  SWE: 'Software Engineer',
  PM: 'Product Manager',
  FE: 'Frontend Engineer',
  BE: 'Backend Engineer',
  EM: 'Engineering Manager',
  DS: 'Data Scientist',
  MLE: 'ML Engineer',
  SRE: 'Site Reliability Engineer',
  QA: 'QA Engineer',
};

const ROLE_BY_CATEGORY: Record<RoleCategoryChip, string[]> = {
  Engineering: [
    'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer',
    'Mobile Engineer (iOS)', 'Mobile Engineer (Android)', 'Embedded Engineer',
    'DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer',
    'Security Engineer', 'QA Engineer', 'Engineering Manager',
    'Infrastructure Engineer', 'TPM',
  ],
  'Data / AI': [
    'Data Scientist', 'ML Engineer', 'Data Engineer', 'Data Analyst',
    'AI Research Scientist', 'Applied Scientist', 'NLP Engineer',
    'Computer Vision Engineer', 'Analytics Engineer', 'MLOps Engineer',
  ],
  Product: [
    'Product Manager', 'Senior Product Manager', 'Group PM',
    'Product Analyst', 'Growth PM', 'Technical Product Manager',
  ],
  Design: [
    'Product Designer', 'UX Designer', 'UI Designer', 'UX Researcher',
    'Design Manager', 'Interaction Designer', 'Visual Designer',
  ],
  'Business / Other': [
    'Solutions Architect', 'Technical Writer', 'Developer Advocate',
    'Sales Engineer', 'Customer Success Engineer', 'Business Analyst',
    'Consultant', 'IT Manager',
  ],
};

const TOP_BY_CATEGORY: Record<RoleCategoryChip, string[]> = {
  Engineering: ['Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'DevOps Engineer', 'Engineering Manager', 'Full-Stack Engineer', 'Platform Engineer', 'TPM'],
  'Data / AI': ['Data Scientist', 'ML Engineer', 'Data Engineer', 'Data Analyst', 'AI Research Scientist', 'Applied Scientist'],
  Product: ['Product Manager', 'Senior Product Manager', 'Growth PM', 'Technical Product Manager'],
  Design: ['Product Designer', 'UX Designer', 'UX Researcher', 'Design Manager'],
  'Business / Other': ['Solutions Architect', 'Sales Engineer', 'Developer Advocate', 'Technical Writer'],
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
const OUTCOMES = ['Offer', 'Rejected', 'No response', 'Pending', 'Prefer not to say'];
const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  {
    label: 'Product & Business Strategy',
    tags: ['Product Strategy', 'Product Sense & Ideation', 'Go-to-Market (GTM)', 'Pricing & Monetization'],
  },
  {
    label: 'Data & Analytics',
    tags: ['Data Modeling', 'Product Analytics & Metrics', 'Root Cause Analysis', 'A/B Testing & Experimentation'],
  },
  {
    label: 'Technical & Architecture',
    tags: ['System Design', 'API & Integrations', 'Technical Trade-offs', 'Algorithms & Data Structures'],
  },
  {
    label: 'Execution & Delivery',
    tags: ['Roadmap Prioritization', 'Cross-functional Alignment', 'Agile / Sprint Management'],
  },
  {
    label: 'Behavioral & Leadership',
    tags: ['Stakeholder Management', 'Conflict Resolution', 'Adaptability & Ambiguity'],
  },
];
const QUESTION_TAGS = TAG_CATEGORIES.flatMap(c => c.tags);

// ─── API Enum Maps ──────────────────────────────────────
const ROLE_TO_ENUM: Record<string, string> = {
  'Software Engineer': 'SOFTWARE_ENGINEER',
  'Frontend Engineer': 'FRONTEND_ENGINEER',
  'Backend Engineer': 'BACKEND_DEVELOPER',
  'Full-Stack Engineer': 'FULL_STACK_ENGINEER',
  'Mobile Engineer (iOS)': 'MOBILE_ENGINEER_IOS',
  'Mobile Engineer (Android)': 'MOBILE_ENGINEER_ANDROID',
  'Embedded Engineer': 'EMBEDDED_ENGINEER',
  'DevOps Engineer': 'DEVOPS_ENGINEER',
  'Site Reliability Engineer': 'SITE_RELIABILITY_ENGINEER',
  'Platform Engineer': 'PLATFORM_ENGINEER',
  'Security Engineer': 'SECURITY_ENGINEER',
  'QA Engineer': 'QA_ENGINEER',
  'Engineering Manager': 'ENGINEERING_MANAGER',
  'Infrastructure Engineer': 'INFRASTRUCTURE_ENGINEER',
  'TPM': 'TPM',
  'Data Scientist': 'DATA_SCIENTIST',
  'ML Engineer': 'ML_ENGINEER',
  'Data Engineer': 'DATA_ENGINEER',
  'Data Analyst': 'DATA_ANALYST',
  'AI Research Scientist': 'AI_RESEARCH_SCIENTIST',
  'Applied Scientist': 'APPLIED_SCIENTIST',
  'NLP Engineer': 'NLP_ENGINEER',
  'Computer Vision Engineer': 'COMPUTER_VISION_ENGINEER',
  'Analytics Engineer': 'ANALYTICS_ENGINEER',
  'MLOps Engineer': 'MLOPS_ENGINEER',
  'Product Manager': 'PRODUCT_MANAGER',
  'Senior Product Manager': 'SENIOR_PRODUCT_MANAGER',
  'Group PM': 'GROUP_PM',
  'Product Analyst': 'PRODUCT_ANALYST',
  'Growth PM': 'GROWTH_PM',
  'Technical Product Manager': 'TECHNICAL_PRODUCT_MANAGER',
  'Product Designer': 'PRODUCT_DESIGNER',
  'UX Designer': 'UX_DESIGNER',
  'UI Designer': 'UI_DESIGNER',
  'UX Researcher': 'UX_RESEARCHER',
  'Design Manager': 'DESIGN_MANAGER',
  'Interaction Designer': 'INTERACTION_DESIGNER',
  'Visual Designer': 'VISUAL_DESIGNER',
  'Solutions Architect': 'SOLUTIONS_ARCHITECT',
  'Technical Writer': 'TECHNICAL_WRITER',
  'Developer Advocate': 'DEVELOPER_ADVOCATE',
  'Sales Engineer': 'SALES_ENGINEER',
  'Customer Success Engineer': 'CUSTOMER_SUCCESS_ENGINEER',
  'Business Analyst': 'BUSINESS_ANALYST',
  'Consultant': 'CONSULTANT',
  'IT Manager': 'IT_MANAGER',
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
  'Product Strategy': 'PRODUCT_STRATEGY',
  'Product Sense & Ideation': 'PRODUCT_SENSE',
  'Go-to-Market (GTM)': 'GO_TO_MARKET',
  'Pricing & Monetization': 'PRICING_MONETIZATION',
  'Data Modeling': 'DATA_MODELING',
  'Product Analytics & Metrics': 'PRODUCT_ANALYTICS',
  'Root Cause Analysis': 'ROOT_CAUSE_ANALYSIS',
  'A/B Testing & Experimentation': 'AB_TESTING',
  'System Design': 'SYSTEM_DESIGN',
  'API & Integrations': 'API_INTEGRATIONS',
  'Technical Trade-offs': 'TECHNICAL_TRADEOFFS',
  'Algorithms & Data Structures': 'ALGORITHMS',
  'Roadmap Prioritization': 'ROADMAP_PRIORITIZATION',
  'Cross-functional Alignment': 'CROSS_FUNCTIONAL',
  'Agile / Sprint Management': 'AGILE',
  'Stakeholder Management': 'STAKEHOLDER_MANAGEMENT',
  'Conflict Resolution': 'CONFLICT_RESOLUTION',
  'Adaptability & Ambiguity': 'ADAPTABILITY',
};

const toRoleEnum = (v: string) => ROLE_TO_ENUM[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
const toRoundEnum = (v: string) => ROUND_TO_ENUM[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
const toCategoryEnum = (v: string) => CATEGORY_TO_ENUM[v] ?? v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

// ─── Canonical question bank (mock) ────────────────────
const CANONICAL_QUESTIONS = [
  { id: 'c1', title: 'Design a URL shortener', tags: ['System Design'], hintsAvailable: true },
  { id: 'c2', title: 'Implement an LRU cache', tags: ['Algorithms & Data Structures'], hintsAvailable: true },
  { id: 'c3', title: 'Design a real-time collaborative editor', tags: ['System Design', 'Distributed Systems'], hintsAvailable: true },
  { id: 'c4', title: 'How would you improve Instagram Stories?', tags: ['Product Sense & Ideation'], hintsAvailable: true },
  { id: 'c5', title: 'Find the minimum window substring', tags: ['Algorithms & Data Structures'], hintsAvailable: true },
  { id: 'c6', title: 'Design a notification delivery system', tags: ['System Design'], hintsAvailable: true },
  { id: 'c7', title: 'How would you measure success for a new feature?', tags: ['Product Analytics & Metrics'], hintsAvailable: false },
  { id: 'c8', title: 'Tell me about a time you handled conflict', tags: ['Behavioral', 'Conflict Resolution'], hintsAvailable: true },
  { id: 'c9', title: 'Design an A/B testing framework', tags: ['A/B Testing & Experimentation', 'System Design'], hintsAvailable: true },
  { id: 'c10', title: 'How would you prioritize tech debt vs features?', tags: ['Roadmap Prioritization'], hintsAvailable: false },
  { id: 'c11', title: 'Explain the CAP theorem with a real example', tags: ['System Design', 'Technical Trade-offs'], hintsAvailable: true },
  { id: 'c12', title: 'Design a rate limiter', tags: ['System Design', 'API & Integrations'], hintsAvailable: true },
];

interface QuestionEntry {
  id: string;
  title: string;
  tags: string[];
  notes: string;
  linkedCanonicalId: string | null;
  isNew: boolean;
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
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
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
        {optional && <span className="text-[hsl(222,12%,70%)] text-xs ml-1">(optional)</span>}
      </Label>
      <div className="relative">
        <div
          className={`w-full h-11 px-3 rounded-xl border bg-[hsl(220,20%,99%)] flex items-center gap-2.5 transition-all ${
            open ? 'border-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20' : 'border-[hsl(220,16%,90%)] hover:border-[hsl(220,16%,82%)]'
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
}: {
  value: string;
  onChange: (v: string) => void;
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
      <Label className="text-[hsl(222,12%,45%)] text-sm flex items-center gap-1">Role</Label>
      <div className="relative">
        <div
          className={`w-full h-11 px-3 rounded-xl border bg-[hsl(220,20%,99%)] flex items-center gap-2.5 transition-all ${
            open ? 'border-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20' : 'border-[hsl(220,16%,90%)] hover:border-[hsl(220,16%,82%)]'
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

// ─── Question auto-suggest ─────────────────────────────
function QuestionAutoSuggest({
  value,
  onChange,
  onLink,
  onCreateNew,
}: {
  value: string;
  onChange: (v: string) => void;
  onLink: (q: typeof CANONICAL_QUESTIONS[0]) => void;
  onCreateNew: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = value.length >= 2
    ? CANONICAL_QUESTIONS.filter(q => q.title.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
    : [];

  const showDropdown = focused && value.length >= 2;

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
        <input
          type="text"
          placeholder="Search existing questions or type a new one..."
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,99%)] text-sm outline-none focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 transition-all"
        />
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 overflow-hidden"
          >
            {suggestions.length > 0 && (
              <div className="p-1.5">
                <p className="px-2.5 py-1.5 text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">Existing questions</p>
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onLink(s)}
                    className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-[hsl(220,20%,98%)] transition-colors group/sug"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[hsl(222,22%,15%)] group-hover/sug:text-[hsl(221,91%,60%)] transition-colors">{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {s.tags.slice(0, 2).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-md bg-[hsl(220,20%,97%)] text-[hsl(222,12%,55%)] text-[10px]">{t}</span>
                          ))}
                          {s.hintsAvailable && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-medium flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              Hints available
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 px-2 py-0.5 rounded-full flex items-center gap-1 mt-0.5">
                        <Link2 className="w-2.5 h-2.5" />
                        Link
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {value.length >= 2 && (
              <div className="border-t border-[hsl(220,16%,94%)] p-1.5">
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-[hsl(220,20%,98%)] transition-colors flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-[hsl(221,91%,60%)]/10 flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[hsl(222,22%,15%)]">Create new: "{value}"</p>
                    <p className="text-[10px] text-[hsl(222,12%,55%)]">AI Hints will be generated after publishing</p>
                  </div>
                </button>
              </div>
            )}
            {suggestions.length === 0 && value.length >= 2 && (
              <div className="px-3 py-3 text-xs text-[hsl(222,12%,55%)] text-center border-b border-[hsl(220,16%,94%)]">
                No matching questions found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Month / Year Picker ───────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i);

function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parts = value.split(' ');
  const selectedMonth = parts[0] || '';
  const selectedYear = parts[1] || '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (month: string, year: string) => {
    const m = month || selectedMonth;
    const y = year || selectedYear;
    if (m && y) {
      onChange(`${m} ${y}`);
      setOpen(false);
    } else {
      onChange(`${m} ${y}`.trim());
    }
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[hsl(222,12%,45%)] text-sm flex items-center gap-1">
        Date
        <span className="text-[hsl(222,12%,70%)] text-xs ml-1">(optional)</span>
      </label>
      <div className="relative">
        {/* Using div instead of button to avoid nested-button hydration error */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(!open)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(!open); }}
          className={`w-full h-11 px-3 rounded-xl border bg-[hsl(220,20%,99%)] flex items-center gap-2.5 cursor-pointer transition-all ${
            open
              ? 'border-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20'
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
              {/* Year */}
              <p className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-2">Year</p>
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => pick(selectedMonth, String(y))}
                    className={`flex-1 min-w-[3.5rem] py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedYear === String(y)
                        ? 'bg-[hsl(221,91%,60%)] text-white'
                        : 'bg-[hsl(220,20%,97%)] text-[hsl(222,22%,15%)] hover:bg-[hsl(221,91%,60%)]/10 hover:text-[hsl(221,91%,60%)]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* Month */}
              <p className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider mb-2">Month</p>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pick(m, selectedYear)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedMonth === m
                        ? 'bg-[hsl(221,91%,60%)] text-white'
                        : 'bg-[hsl(220,20%,97%)] text-[hsl(222,22%,15%)] hover:bg-[hsl(221,91%,60%)]/10 hover:text-[hsl(221,91%,60%)]'
                    }`}
                  >
                    {m}
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
function TagSelector({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[hsl(220,16%,85%)] text-xs text-[hsl(222,12%,55%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)] transition-colors"
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
            className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-xl z-50 max-h-64 overflow-y-auto"
          >
            {TAG_CATEGORIES.map(category => (
              <div key={category.label}>
                <div className="px-3 pt-2.5 pb-1 sticky top-0 bg-white">
                  <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">{category.label}</span>
                </div>
                <div className="px-1.5 pb-1 space-y-0.5">
                  {category.tags.map(tag => (
                    <label key={tag} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer">
                      <input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)} className="w-3.5 h-3.5 accent-[hsl(221,91%,60%)]" />
                      <span className="text-xs text-[hsl(222,22%,15%)]">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
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
    { id: '1', title: '', tags: [], notes: '', linkedCanonicalId: null, isNew: true },
  ]);

  // Step 3: Summary & Privacy
  const [overallSummary, setOverallSummary] = useState('');
  const [anonymity, setAnonymity] = useState<'full' | 'partial' | 'anonymous'>('partial');
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions([...questions, {
      id: Math.random().toString(36).substring(7),
      title: '', tags: [], notes: '', linkedCanonicalId: null, isNew: true,
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

  const linkQuestion = (qId: string, canonical: typeof CANONICAL_QUESTIONS[0]) => {
    updateQuestion(qId, {
      title: canonical.title,
      tags: canonical.tags,
      linkedCanonicalId: canonical.id,
      isNew: false,
    });
  };

  const canNext = () => {
    if (step === 0) return company && role && level && round;
    if (step === 1) return questions.some(q => q.title.trim().length > 0);
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
          question: q.title.trim(),
          category: toCategoryEnum(q.tags[0] ?? ''),
          ...(q.notes.trim() ? { answer: q.notes.trim() } : {}),
        }));
      await createBulkQuestions({
        company,
        role: toRoleEnum(role),
        level,
        round: toRoundEnum(round),
        questions: questionItems,
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
              <div className="w-7 h-7 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-xs font-bold text-[hsl(222,22%,15%)]">
                {company === 'Prefer not to say' ? '?' : company[0]}
              </div>
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
            <Link to="/dashboard/contributions">
              <Button className="w-full bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl h-11 gap-2">
                <Eye className="w-4 h-4" />
                View in My Contributions
              </Button>
            </Link>
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
                    <DropdownSelect label="Company" icon={Building2} placeholder="Select company" options={COMPANIES} value={company} onChange={setCompany} />
                    <RoleSelect value={role} onChange={setRole} />
                    <DropdownSelect label="Level" icon={BarChart} placeholder="Select level" options={LEVELS} value={level} onChange={setLevel} />
                    <DropdownSelect label="Round type" icon={FileText} placeholder="Select round" options={ROUNDS} value={round} onChange={setRound} />
                    <MonthYearPicker value={date} onChange={setDate} />
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
                    <p className="text-sm text-[hsl(222,12%,55%)]">Add 1–10 questions from this round. Link to existing questions for instant hints.</p>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, qi) => (
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
                            {q.linkedCanonicalId ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-medium flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                Hints ready
                              </span>
                            ) : q.title.trim() ? (
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

                        {/* Title with auto-suggest */}
                        <div className="mb-4">
                          <Label className="text-xs text-[hsl(222,12%,55%)] mb-1.5 block">Question title</Label>
                          <QuestionAutoSuggest
                            value={q.title}
                            onChange={v => updateQuestion(q.id, { title: v, linkedCanonicalId: null, isNew: true })}
                            onLink={canonical => linkQuestion(q.id, canonical)}
                            onCreateNew={() => updateQuestion(q.id, { isNew: true, linkedCanonicalId: null })}
                          />
                        </div>

                        {/* Tags */}
                        <div className="mb-4">
                          <Label className="text-xs text-[hsl(222,12%,55%)] mb-1.5 block">Tags</Label>
                          <TagSelector selected={q.tags} onChange={tags => updateQuestion(q.id, { tags })} />
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
                    ))}

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

                  {/* Anonymity Options */}
                  <div>
                    <Label className="text-[hsl(222,12%,45%)] text-sm mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      How should your name appear?
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { value: 'full' as const, label: 'Full name', desc: 'e.g. Sarah Miller', icon: '👤' },
                        { value: 'partial' as const, label: 'First + initial', desc: 'e.g. Sarah M.', icon: '🙂' },
                        { value: 'anonymous' as const, label: 'Anonymous', desc: 'Completely hidden', icon: '🕶️' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnonymity(opt.value)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            anonymity === opt.value
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
                      <div className="w-7 h-7 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-xs font-bold text-[hsl(222,22%,15%)]">
                        {company === 'Prefer not to say' ? '?' : (company?.[0] || '?')}
                      </div>
                      <span className="text-sm font-semibold text-[hsl(222,22%,15%)]">{company || '—'}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-sm text-[hsl(222,12%,45%)]">{role || '—'}</span>
                      <span className="text-[hsl(222,12%,70%)]">·</span>
                      <span className="text-sm text-[hsl(222,12%,45%)]">{round || '—'}</span>
                    </div>
                    <p className="text-xs text-[hsl(222,12%,55%)]">
                      by {anonymity === 'anonymous' ? 'Anonymous' : anonymity === 'partial' ? 'User N.' : 'User Name'} · {date || 'Date'} · {level || 'Level'}
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
            onClick={() => setStep(Math.max(0, step - 1))}
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
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                  className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,20%)] text-white rounded-xl px-6 h-10 text-sm gap-2 disabled:opacity-40"
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