import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, ChevronDown, X, CheckCircle2, ExternalLink,
  Pencil, Plus, Shield, AlertCircle, ChevronLeft,
  ChevronRight, Eye, EyeOff, Zap, Building2, DollarSign,
  Globe, Briefcase, Lock, MapPin, Star,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from './ui/dialog';
import { Sheet, SheetContent } from './ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicationSource =
  | 'LinkedIn'
  | 'Workday'
  | 'Glassdoor'
  | 'Indeed'
  | 'Company Website'
  | 'Internal Referral'
  | 'Others'
  | 'watchlist';

type ApplicationWorkflow = 'auto_submitted' | 'manually_submitted' | null;
type ApplicationStatus = 'pending' | 'submitted';

type Application = {
  id: string;
  company: string;
  logoLetter: string;
  logoColor: string;
  title: string;
  department: string;
  jdSummary: string;
  source: ApplicationSource;
  workflow: ApplicationWorkflow;
  status: ApplicationStatus;
  actionRequired: boolean;
  submittedDate: string | null;
  applyUrl: string;
  fullJD: string;
  credentials: { usernameEmail: string; password: string } | null;
  preferenceMatch: string[];
  opsNote: string | null;
  needsReviewOverride: boolean;
};

type UserPreferences = {
  targetRoles: string[];
  cities: string[];
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  minSalary: string;
  visaSponsorship: 'Not required' | 'Required';
  watchlistCompanies: string[];
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PREFERENCES: UserPreferences = {
  targetRoles: ['Senior Product Manager', 'Group PM'],
  cities: ['Bay Area'],
  workMode: 'Remote',
  minSalary: '$120K+',
  visaSponsorship: 'Not required',
  watchlistCompanies: ['Figma', 'Notion'],
};

const SUGGESTED_ROLES = [
  'Product Manager',
  'Senior Product Manager',
  'Group PM',
  'Staff PM',
  'Director of Product',
  'VP of Product',
  'Product Lead',
];

const MOCK_APPLICATIONS: Application[] = [
  {
    id: '1',
    company: 'Stripe',
    logoLetter: 'S',
    logoColor: 'bg-violet-600 text-white',
    title: 'Senior Product Manager',
    department: 'Billing Platform',
    jdSummary: "Lead the Billing platform team to define product vision and strategy for Stripe's core billing infrastructure used by millions of businesses worldwide.",
    source: 'LinkedIn',
    workflow: 'auto_submitted',
    status: 'submitted',
    actionRequired: false,
    submittedDate: '2026-04-13',
    applyUrl: 'https://stripe.com/jobs',
    fullJD: `We are looking for a Senior Product Manager to lead the Billing platform team. You will be responsible for defining the product vision, strategy, and roadmap for Stripe's core billing infrastructure used by millions of businesses.\n\nResponsibilities:\n- Define and execute the product strategy for Stripe Billing\n- Collaborate closely with engineering, design, and go-to-market teams\n- Talk to users constantly to understand their needs and pain points\n- Drive product launches and measure impact\n\nRequirements:\n- 5+ years of product management experience\n- Experience building complex platform products or APIs\n- Strong technical background\n- Excellent communication and leadership skills`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'Scr3na@2026!' },
    preferenceMatch: ['Senior PM role', 'Bay Area location', '$120K+ salary', 'No visa required'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '2',
    company: 'Google',
    logoLetter: 'G',
    logoColor: 'bg-blue-500 text-white',
    title: 'Product Manager, Search',
    department: 'Search & AI',
    jdSummary: 'Drive product strategy for Google Search features that serve billions of users daily. Partner with engineering and UX teams to build the future of information access.',
    source: 'Workday',
    workflow: 'auto_submitted',
    status: 'submitted',
    actionRequired: false,
    submittedDate: '2026-04-11',
    applyUrl: 'https://careers.google.com',
    fullJD: `Join Google's Search team as a Product Manager. You'll work on features that billions of people use every day.\n\nWhat you'll do:\n- Define product vision for Search features\n- Work with cross-functional teams\n- Analyze data to drive decisions\n- Ship products at scale`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'G00gle@scr3na' },
    preferenceMatch: ['Senior PM role', 'Remote-friendly', '$150K+ salary'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '3',
    company: 'Meta',
    logoLetter: 'M',
    logoColor: 'bg-blue-700 text-white',
    title: 'Senior Product Manager',
    department: 'Ads & Commerce',
    jdSummary: 'Own the roadmap for Meta\'s ads infrastructure powering revenue across Facebook and Instagram. Drive strategy on measurement, attribution, and campaign tools.',
    source: 'LinkedIn',
    workflow: 'auto_submitted',
    status: 'pending',
    actionRequired: true,
    submittedDate: null,
    applyUrl: 'https://meta.com/careers',
    fullJD: `Meta is looking for a Senior PM to drive ads infrastructure...\n\nYou will:\n- Own ads measurement roadmap\n- Partner with monetization engineering\n- Drive A/B testing at scale\n- Work with data science teams`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'M3ta@scr3na!' },
    preferenceMatch: ['Senior PM role', 'Remote-friendly', '$150K+ salary'],
    opsNote: 'Application requires additional essay questions. Please review before Screna submits.',
    needsReviewOverride: true,
  },
  {
    id: '4',
    company: 'Microsoft',
    logoLetter: 'M',
    logoColor: 'bg-teal-600 text-white',
    title: 'PM Lead, Azure',
    department: 'Cloud Platform',
    jdSummary: 'Lead product direction for Azure developer tooling used by enterprise clients globally. Define the future of cloud-native development workflows.',
    source: 'Workday',
    workflow: 'auto_submitted',
    status: 'submitted',
    actionRequired: false,
    submittedDate: '2026-04-10',
    applyUrl: 'https://careers.microsoft.com',
    fullJD: `Microsoft Azure is seeking a PM Lead to own developer tooling products.\n\nKey responsibilities:\n- Drive product vision for Azure CLI and SDK tooling\n- Lead cross-functional teams\n- Partner with enterprise customers\n- Ship quarterly releases`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'MS@Azure2026' },
    preferenceMatch: ['PM Lead role', 'Remote OK', '$140K+ salary'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '5',
    company: 'Amazon',
    logoLetter: 'A',
    logoColor: 'bg-orange-500 text-white',
    title: 'Senior PM, AWS',
    department: 'Developer Experience',
    jdSummary: 'Define and execute the product roadmap for AWS developer tools. Work across S3, Lambda, and CloudFormation to simplify cloud-native development.',
    source: 'Glassdoor',
    workflow: 'auto_submitted',
    status: 'pending',
    actionRequired: false,
    submittedDate: null,
    applyUrl: 'https://amazon.jobs',
    fullJD: `Amazon Web Services is seeking a Senior PM for Developer Experience...\n\nYou will own the roadmap for developer tooling across core AWS services.\n\nRequirements:\n- 6+ years PM experience\n- Technical background\n- Experience with cloud platforms`,
    credentials: null,
    preferenceMatch: ['Senior PM', 'Remote-friendly', '$130K+'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '6',
    company: 'Apple',
    logoLetter: 'A',
    logoColor: 'bg-gray-800 text-white',
    title: 'Product Manager, Siri',
    department: 'AI & ML',
    jdSummary: 'Shape the future of conversational AI at Apple. Drive product development for Siri across iOS, macOS, and watchOS platforms used by hundreds of millions of users.',
    source: 'Indeed',
    workflow: 'auto_submitted',
    status: 'submitted',
    actionRequired: false,
    submittedDate: '2026-04-08',
    applyUrl: 'https://apple.com/jobs',
    fullJD: `Apple is seeking a PM for Siri to drive conversational AI features...\n\nYou'll work across the entire Apple ecosystem to improve voice and AI experiences.`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'Appl3@scr3na' },
    preferenceMatch: ['PM role', 'Bay Area', '$140K+ salary'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '7',
    company: 'Figma',
    logoLetter: 'F',
    logoColor: 'bg-rose-500 text-white',
    title: 'Senior Product Manager',
    department: 'Design Systems',
    jdSummary: 'Drive product strategy for Figma\'s Design Systems tools. Help design teams at enterprise companies establish shared component libraries and design tokens.',
    source: 'watchlist',
    workflow: null,
    status: 'pending',
    actionRequired: false,
    submittedDate: null,
    applyUrl: 'https://figma.com/careers',
    fullJD: `Figma is looking for a Senior PM to lead Design Systems...\n\nYou'll work with our enterprise customers to build best-in-class design system tooling.\n\nRequirements:\n- 5+ years PM experience\n- Understanding of design systems\n- Enterprise product experience`,
    credentials: null,
    preferenceMatch: ['Senior PM role', 'Remote-friendly', '$140K+ salary', 'Watchlist company'],
    opsNote: 'Screna found this role at Figma, one of your watchlist companies. Review and approve to apply.',
    needsReviewOverride: false,
  },
  {
    id: '8',
    company: 'Airbnb',
    logoLetter: 'A',
    logoColor: 'bg-red-500 text-white',
    title: 'PM, Trust & Safety',
    department: 'Trust Platform',
    jdSummary: 'Own the product roadmap for Trust & Safety at Airbnb. Build systems that protect hosts, guests, and communities across 220+ countries and regions.',
    source: 'Internal Referral',
    workflow: null,
    status: 'pending',
    actionRequired: false,
    submittedDate: null,
    applyUrl: 'https://airbnb.com/careers',
    fullJD: `Airbnb Trust & Safety team is hiring a PM to build trust infrastructure...\n\nThis role came via an internal referral from the Screna network.\n\nYou will own:\n- Trust scoring systems\n- Fraud detection product\n- Review integrity features`,
    credentials: null,
    preferenceMatch: ['PM role', 'Hybrid - SF', '$130K+ salary'],
    opsNote: 'This opportunity came via an internal referral connection. You may want to reach out to confirm before applying.',
    needsReviewOverride: false,
  },
  {
    id: '9',
    company: 'Salesforce',
    logoLetter: 'S',
    logoColor: 'bg-blue-400 text-white',
    title: 'Senior PM, Einstein AI',
    department: 'AI Products',
    jdSummary: 'Lead product development for Salesforce Einstein AI features embedded across Sales Cloud, Service Cloud, and Marketing Cloud platforms.',
    source: 'Workday',
    workflow: 'auto_submitted',
    status: 'pending',
    actionRequired: false,
    submittedDate: null,
    applyUrl: 'https://salesforce.com/careers',
    fullJD: `Salesforce is seeking a Senior PM for Einstein AI products...\n\nYou will lead AI feature development across the Salesforce platform.`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'SF@Einstein2026' },
    preferenceMatch: ['Senior PM', 'Remote', '$130K+'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '10',
    company: 'HubSpot',
    logoLetter: 'H',
    logoColor: 'bg-orange-600 text-white',
    title: 'Product Manager, CRM',
    department: 'CRM Platform',
    jdSummary: 'Drive product innovation for HubSpot\'s core CRM platform used by 150K+ businesses. Focus on pipeline management, deal tracking, and sales automation.',
    source: 'Others',
    workflow: 'auto_submitted',
    status: 'submitted',
    actionRequired: false,
    submittedDate: '2026-04-06',
    applyUrl: 'https://hubspot.com/jobs',
    fullJD: `HubSpot is hiring a PM for the CRM Platform team...\n\nYou'll work on the core product used by 150,000+ businesses worldwide.`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'Hub$pot@scr3na' },
    preferenceMatch: ['PM role', 'Remote', '$120K+'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '11',
    company: 'Notion',
    logoLetter: 'N',
    logoColor: 'bg-gray-900 text-white',
    title: 'Senior PM, Collaboration',
    department: 'Workspace',
    jdSummary: 'Lead product development for Notion\'s real-time collaboration features. Drive multiplayer editing, comments, and notification systems for teams worldwide.',
    source: 'watchlist',
    workflow: 'manually_submitted',
    status: 'submitted',
    actionRequired: false,
    submittedDate: '2026-04-05',
    applyUrl: 'https://notion.so/careers',
    fullJD: `Notion is hiring a Senior PM for Collaboration features...\n\nYou'll work on multiplayer editing, comments, mentions, and team management.`,
    credentials: null,
    preferenceMatch: ['Senior PM', 'Remote', '$130K+', 'Watchlist company'],
    opsNote: null,
    needsReviewOverride: false,
  },
  {
    id: '12',
    company: 'Airtable',
    logoLetter: 'A',
    logoColor: 'bg-yellow-600 text-white',
    title: 'PM, Platform APIs',
    department: 'Developer Platform',
    jdSummary: 'Build the developer platform strategy for Airtable\'s API ecosystem. Enable third-party developers to extend Airtable for enterprise use cases.',
    source: 'Company Website',
    workflow: 'auto_submitted',
    status: 'pending',
    actionRequired: false,
    submittedDate: null,
    applyUrl: 'https://airtable.com/careers',
    fullJD: `Airtable Developer Platform team is seeking a PM to own API strategy...\n\nYou'll work on enabling the next generation of Airtable apps and integrations.`,
    credentials: { usernameEmail: 'user@gmail.com', password: 'Air@table2026' },
    preferenceMatch: ['PM role', 'Hybrid - SF', '$120K+'],
    opsNote: null,
    needsReviewOverride: false,
  },
];

const SOURCE_LABELS: ApplicationSource[] = [
  'LinkedIn', 'Workday', 'Glassdoor', 'Indeed',
  'Company Website', 'Internal Referral', 'Others',
];

const SALARY_OPTIONS = ['$80K+', '$100K+', '$120K+', '$150K+', '$180K+', '$200K+'];

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSubmittedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const relativeStr = diffDays === 0 ? 'today' : diffDays === 1 ? '1d ago' : `${diffDays}d ago`;
  return `${month} ${day}, ${year} · ${relativeStr}`;
}

function getWorkflowType(app: Application): 'needs_review' | 'auto_submit' {
  if (app.source === 'Internal Referral' || app.source === 'watchlist' || app.needsReviewOverride) {
    return 'needs_review';
  }
  return 'auto_submit';
}

// ─── Preference Bar ───────────────────────────────────────────────────────────

function PreferenceBar({
  prefs,
  onEdit,
}: {
  prefs: UserPreferences;
  onEdit: () => void;
}) {
  const rolesDisplay = prefs.targetRoles.length > 0
    ? prefs.targetRoles.slice(0, 2).join(' · ') + (prefs.targetRoles.length > 2 ? ` +${prefs.targetRoles.length - 2}` : '')
    : '—';

  const locationParts = [...prefs.cities.slice(0, 2), prefs.workMode].filter(Boolean);
  const locationDisplay = locationParts.join(' · ') || '—';

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-5 flex-wrap">
        <PrefItem icon={Briefcase} label="Roles" value={rolesDisplay} />
        <div className="w-px h-4 bg-border" />
        <PrefItem icon={MapPin} label="Location" value={locationDisplay} />
        <div className="w-px h-4 bg-border" />
        <PrefItem icon={DollarSign} label="Salary" value={prefs.minSalary || '—'} />
        <div className="w-px h-4 bg-border" />
        <PrefItem icon={Globe} label="Visa" value={prefs.visaSponsorship} />
        <div className="w-px h-4 bg-border" />
        <PrefItem
          icon={Star}
          label="Watchlist"
          value={`${prefs.watchlistCompanies.length} ${prefs.watchlistCompanies.length === 1 ? 'company' : 'companies'}`}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={onEdit}
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit preferences
      </Button>
    </div>
  );
}

function PrefItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// ─── Edit Preferences Modal ───────────────────────────────────────────────────

function EditPreferencesModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
}) {
  const [draft, setDraft] = useState<UserPreferences>(initial);
  const [roleInput, setRoleInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');

  useEffect(() => {
    if (open) {
      setDraft({ ...initial });
      setRoleInput('');
      setCityInput('');
      setCompanyInput('');
    }
  }, [open, initial]);

  const addRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || draft.targetRoles.includes(trimmed)) return;
    setDraft((d) => ({ ...d, targetRoles: [...d.targetRoles, trimmed] }));
    setRoleInput('');
  };

  const removeRole = (r: string) =>
    setDraft((d) => ({ ...d, targetRoles: d.targetRoles.filter((x) => x !== r) }));

  const addCity = (city: string) => {
    const trimmed = city.trim();
    if (!trimmed || draft.cities.includes(trimmed)) return;
    setDraft((d) => ({ ...d, cities: [...d.cities, trimmed] }));
    setCityInput('');
  };

  const removeCity = (c: string) =>
    setDraft((d) => ({ ...d, cities: d.cities.filter((x) => x !== c) }));

  const addCompany = (company: string) => {
    const trimmed = company.trim();
    if (!trimmed || draft.watchlistCompanies.includes(trimmed)) return;
    setDraft((d) => ({ ...d, watchlistCompanies: [...d.watchlistCompanies, trimmed] }));
    setCompanyInput('');
  };

  const removeCompany = (c: string) =>
    setDraft((d) => ({ ...d, watchlistCompanies: d.watchlistCompanies.filter((x) => x !== c) }));

  const suggestedRoles = SUGGESTED_ROLES.filter(
    (r) => !draft.targetRoles.includes(r) &&
      (roleInput === '' || r.toLowerCase().includes(roleInput.toLowerCase())),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Preferences</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update your job preferences. Screna will use these to find and submit matching jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Target Roles */}
          <section>
            <label className="text-sm font-medium text-foreground block mb-1">Target roles</label>
            <p className="text-xs text-muted-foreground mb-2">Add roles to target. AI-suggested based on your resume.</p>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Type a role or select below..."
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && roleInput.trim()) {
                    e.preventDefault();
                    addRole(roleInput);
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addRole(roleInput)}
                disabled={!roleInput.trim()}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {suggestedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {suggestedRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => addRole(r)}
                    className="px-2.5 py-1 text-xs bg-background border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            )}
            {draft.targetRoles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.targetRoles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {r}
                    <button onClick={() => removeRole(r)} className="hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Cities / Regions */}
          <section>
            <label className="text-sm font-medium text-foreground block mb-1">Cities or regions</label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="e.g. Bay Area, New York..."
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cityInput.trim()) {
                    e.preventDefault();
                    addCity(cityInput);
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCity(cityInput)}
                disabled={!cityInput.trim()}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {draft.cities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.cities.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                  >
                    {c}
                    <button onClick={() => removeCity(c)}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Work Mode */}
          <section>
            <label className="text-sm font-medium text-foreground block mb-2">Work mode</label>
            <div className="flex gap-2">
              {(['Remote', 'Hybrid', 'On-site'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDraft((d) => ({ ...d, workMode: mode }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    draft.workMode === mode
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          {/* Min Salary */}
          <section>
            <label className="text-sm font-medium text-foreground block mb-2">Minimum salary</label>
            <Select
              value={draft.minSalary}
              onValueChange={(v) => setDraft((d) => ({ ...d, minSalary: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Visa Sponsorship */}
          <section>
            <label className="text-sm font-medium text-foreground block mb-2">Visa sponsorship</label>
            <Select
              value={draft.visaSponsorship}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, visaSponsorship: v as UserPreferences['visaSponsorship'] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not required">Not required</SelectItem>
                <SelectItem value="Required">Required</SelectItem>
              </SelectContent>
            </Select>
          </section>

          {/* Watchlist Companies */}
          <section>
            <label className="text-sm font-medium text-foreground block mb-1">Watchlist companies</label>
            <p className="text-xs text-muted-foreground mb-2">
              Screna will alert you when matching jobs appear at these companies.
            </p>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="e.g. Figma, Notion..."
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && companyInput.trim()) {
                    e.preventDefault();
                    addCompany(companyInput);
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCompany(companyInput)}
                disabled={!companyInput.trim()}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {draft.watchlistCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.watchlistCompanies.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                  >
                    {c}
                    <button onClick={() => removeCompany(c)}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(draft); onOpenChange(false); }}>
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Source Filter Tabs ───────────────────────────────────────────────────────

function SourceFilterTabs({
  applications,
  activeSource,
  onSelect,
}: {
  applications: Application[];
  activeSource: ApplicationSource | 'all';
  onSelect: (s: ApplicationSource | 'all') => void;
}) {
  const counts: Record<string, number> = { all: applications.length };
  for (const src of SOURCE_LABELS) {
    counts[src] = applications.filter((a) => a.source === src).length;
  }

  const tabs: { key: ApplicationSource | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    ...SOURCE_LABELS.map((s) => ({ key: s as ApplicationSource, label: s })),
  ];

  return (
    <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
      {tabs.map(({ key, label }) => {
        const count = counts[key] ?? 0;
        const isActive = activeSource === key;
        const isEmpty = key !== 'all' && count === 0;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 relative top-[1px] transition-colors ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent hover:text-foreground hover:bg-muted/30 rounded-t-md ' +
                  (isEmpty ? 'text-muted-foreground/40' : 'text-muted-foreground')
            }`}
          >
            {label}
            <span
              className={`text-xs tabular-nums ${
                isActive
                  ? 'text-primary font-semibold'
                  : isEmpty
                  ? 'text-muted-foreground/40'
                  : 'text-muted-foreground'
              }`}
            >
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Workflow Filter Chips ────────────────────────────────────────────────────

type WorkflowFilter = 'all' | 'auto_submitted' | 'watchlist' | 'manually_submitted';

function WorkflowFilterChips({
  applications,
  active,
  onSelect,
}: {
  applications: Application[];
  active: WorkflowFilter;
  onSelect: (f: WorkflowFilter) => void;
}) {
  const chips: { key: WorkflowFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All workflows', count: applications.length },
    {
      key: 'auto_submitted',
      label: 'Auto-submitted',
      count: applications.filter((a) => a.workflow === 'auto_submitted').length,
    },
    {
      key: 'watchlist',
      label: 'Watchlist',
      count: applications.filter((a) => a.source === 'watchlist').length,
    },
    {
      key: 'manually_submitted',
      label: 'Manually submitted',
      count: applications.filter((a) => a.workflow === 'manually_submitted').length,
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            active === key
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
          }`}
        >
          {label}
          <span className="tabular-nums">({count})</span>
        </button>
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, actionRequired }: { status: ApplicationStatus; actionRequired: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
          status === 'submitted'
            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
        }`}
      >
        {status === 'submitted' ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
        {status === 'submitted' ? 'Submitted' : 'Pending'}
      </span>
      {actionRequired && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
          <AlertCircle className="w-3 h-3" />
          Action needed
        </span>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  app,
  onViewDetails,
}: {
  app: Application;
  onViewDetails: (app: Application) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${app.logoColor}`}
        >
          {app.logoLetter}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {app.company} · {app.title}
                {app.department && (
                  <span className="font-normal text-muted-foreground"> — {app.department}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Source tag */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border whitespace-nowrap">
                {app.source === 'watchlist' ? 'Watchlist' : app.source}
              </span>
              {/* Watchlist tag */}
              {app.source === 'watchlist' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                  Watchlist
                </span>
              )}
            </div>
          </div>

          {/* JD Summary */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
            {app.jdSummary}
          </p>

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={app.status} actionRequired={app.actionRequired} />
              {app.status === 'submitted' && app.submittedDate && (
                <span className="text-xs text-muted-foreground">
                  {formatSubmittedDate(app.submittedDate)}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => onViewDetails(app)}
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job Detail Drawer ────────────────────────────────────────────────────────

function JobDetailDrawer({
  app,
  open,
  onOpenChange,
  onApproveSubmit,
  onNotInterested,
}: {
  app: Application | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApproveSubmit: (id: string) => void;
  onNotInterested: (id: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) setShowPassword(false);
  }, [open]);

  if (!app) return null;

  const workflowType = getWorkflowType(app);
  const daysSinceSubmit = app.submittedDate
    ? Math.floor((new Date().getTime() - new Date(app.submittedDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const showFooterButtons = app.source === 'watchlist' && app.status !== 'submitted';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${app.logoColor}`}
          >
            {app.logoLetter}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{app.company}</p>
            <p className="text-xs text-muted-foreground truncate">
              {app.title}{app.department ? ` — ${app.department}` : ''}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">

          {/* Application Method */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Application Method
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Applied via" value={app.source === 'watchlist' ? 'Watchlist' : app.source} />
              <InfoCell
                label="Submitted"
                value={app.submittedDate ? formatSubmittedDate(app.submittedDate).split(' · ')[0] : '—'}
              />
              <InfoCell
                label="Days since"
                value={daysSinceSubmit !== null ? `${daysSinceSubmit}d` : '—'}
              />
              <InfoCell
                label="Current status"
                value={app.status === 'submitted' ? 'Submitted' : 'Pending'}
                valueClassName={
                  app.status === 'submitted'
                    ? 'text-green-600 dark:text-green-400 font-semibold'
                    : 'text-amber-600 dark:text-amber-400 font-semibold'
                }
              />
            </div>
          </section>

          {/* Job Link */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Job Link
            </h4>
            <a
              href={app.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {app.applyUrl}
            </a>
          </section>

          {/* Job Description */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Job Description
            </h4>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border">
              {app.fullJD}
            </div>
          </section>

          {/* Application Credentials */}
          {app.credentials && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Application Credentials
              </h4>
              <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Username / Email</span>
                  <span className="text-xs font-medium text-foreground font-mono">
                    {app.credentials.usernameEmail}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground font-mono">
                      {showPassword ? app.credentials.password : '••••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Workflow Type */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Workflow Type
            </h4>
            {workflowType === 'needs_review' ? (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
                <span className="text-base">🟠</span>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Needs Review
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                    {app.source === 'Internal Referral'
                      ? 'This job came via an internal referral and requires your review before applying.'
                      : app.source === 'watchlist'
                      ? 'This job is from one of your watchlist companies. Approve to submit your application.'
                      : 'This job has been flagged for manual review by the Screna team.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-muted/30">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-submit ⚡</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Screna automatically submitted this application on your behalf.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Preference Match */}
          {app.preferenceMatch.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preference Match
              </h4>
              <div className="space-y-1.5">
                {app.preferenceMatch.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ops Note */}
          {app.opsNote && (
            <section>
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Note from Screna
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                  {app.opsNote}
                </p>
              </div>
            </section>
          )}

          {/* Footer buttons for watchlist */}
          {showFooterButtons && (
            <section className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={() => { onApproveSubmit(app.id); onOpenChange(false); }}
              >
                Approve and submit
              </Button>
              <Button
                variant="outline"
                onClick={() => { onNotInterested(app.id); onOpenChange(false); }}
              >
                Not interested
              </Button>
            </section>
          )}

          {/* Spacer so content isn't hidden behind security note */}
          <div className="h-2" />
        </div>

        {/* Security Note — sticky bottom */}
        <div className="shrink-0 px-5 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              Credentials are encrypted and only used to submit your application. Screna never stores passwords in plain text.
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-foreground ${valueClassName ?? ''}`}>{value}</p>
    </div>
  );
}

// ─── Trust Section ────────────────────────────────────────────────────────────

function TrustSection() {
  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
        <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground mb-0.5">
            Your data is secure with Screna
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All application credentials are encrypted at rest and in transit. Screna only accesses your information to submit applications on your behalf and never shares it with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sort Dropdown ────────────────────────────────────────────────────────────

type SortOption = 'newest' | 'action_first' | 'company_az';

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const labels: Record<SortOption, string> = {
    newest: 'Newest',
    action_first: 'Action needed first',
    company_az: 'Company A–Z',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground bg-card border border-border rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors"
      >
        Sort: {labels[value]}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-card border border-border rounded-md shadow-md py-1 z-10">
          {(Object.keys(labels) as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                value === opt
                  ? 'bg-primary/5 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {labels[opt]}
              {value === opt && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyState({
  kind,
  keyword,
  onClearFilters,
  onEditPreferences,
}: {
  kind: 'no_jobs' | 'filter_empty' | 'search_empty';
  keyword?: string;
  onClearFilters?: () => void;
  onEditPreferences?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Briefcase className="w-6 h-6 text-muted-foreground opacity-60" />
      </div>
      {kind === 'no_jobs' && (
        <>
          <p className="text-sm font-medium text-foreground mb-1">No applications yet</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            Start by setting your preferences. Screna will match and submit jobs on your behalf.
          </p>
          <Button onClick={onEditPreferences} size="sm" className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            Edit Preferences
          </Button>
        </>
      )}
      {kind === 'filter_empty' && (
        <>
          <p className="text-sm font-medium text-foreground mb-1">No jobs match this filter</p>
          <p className="text-xs text-muted-foreground mb-4">
            Try adjusting your filters to see more applications.
          </p>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Try clearing filters
          </Button>
        </>
      )}
      {kind === 'search_empty' && (
        <>
          <p className="text-sm font-medium text-foreground mb-1">
            No results for "{keyword}"
          </p>
          <p className="text-xs text-muted-foreground">
            Try a different search term.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JobApplyTab() {
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [prefModalOpen, setPrefModalOpen] = useState(false);

  const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState<ApplicationSource | 'all'>('all');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const [drawerApp, setDrawerApp] = useState<Application | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (app: Application) => {
    setDrawerApp(app);
    setDrawerOpen(true);
  };

  const handleApproveSubmit = (id: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: 'submitted', workflow: 'manually_submitted', submittedDate: new Date().toISOString().split('T')[0] }
          : a,
      ),
    );
  };

  const handleNotInterested = (id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSource, activeWorkflow, sortBy]);

  const filtered = useMemo(() => {
    let result = [...applications];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.jdSummary.toLowerCase().includes(q),
      );
    }

    // Source filter
    if (activeSource !== 'all') {
      result = result.filter((a) => a.source === activeSource);
    }

    // Workflow filter
    if (activeWorkflow === 'auto_submitted') {
      result = result.filter((a) => a.workflow === 'auto_submitted');
    } else if (activeWorkflow === 'watchlist') {
      result = result.filter((a) => a.source === 'watchlist');
    } else if (activeWorkflow === 'manually_submitted') {
      result = result.filter((a) => a.workflow === 'manually_submitted');
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => {
        const da = a.submittedDate ?? '0000';
        const db = b.submittedDate ?? '0000';
        return db.localeCompare(da);
      });
    } else if (sortBy === 'action_first') {
      result.sort((a, b) => Number(b.actionRequired) - Number(a.actionRequired));
    } else if (sortBy === 'company_az') {
      result.sort((a, b) => a.company.localeCompare(b.company));
    }

    return result;
  }, [applications, searchQuery, activeSource, activeWorkflow, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const clearFilters = () => {
    setSearchQuery('');
    setActiveSource('all');
    setActiveWorkflow('all');
  };

  const hasFilters =
    searchQuery.trim() !== '' || activeSource !== 'all' || activeWorkflow !== 'all';

  const emptyKind: 'no_jobs' | 'filter_empty' | 'search_empty' | null =
    filtered.length === 0
      ? applications.length === 0
        ? 'no_jobs'
        : searchQuery.trim()
        ? 'search_empty'
        : 'filter_empty'
      : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Preference Bar */}
      <PreferenceBar prefs={preferences} onEdit={() => setPrefModalOpen(true)} />

      {/* Search + Filters row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search company, title, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="ml-auto">
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* Source Filter Tabs */}
      <SourceFilterTabs
        applications={applications}
        activeSource={activeSource}
        onSelect={(s) => setActiveSource(s)}
      />

      {/* Workflow Filter Chips */}
      <WorkflowFilterChips
        applications={
          activeSource === 'all'
            ? applications
            : applications.filter((a) => a.source === activeSource)
        }
        active={activeWorkflow}
        onSelect={(f) => setActiveWorkflow(f)}
      />

      {/* Job Card List */}
      {emptyKind ? (
        <EmptyState
          kind={emptyKind}
          keyword={searchQuery.trim()}
          onClearFilters={clearFilters}
          onEditPreferences={() => setPrefModalOpen(true)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} application{filtered.length !== 1 ? 's' : ''}
              {hasFilters ? ' matching filters' : ''}
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {paginated.map((app) => (
              <JobCard key={app.id} app={app} onViewDetails={openDrawer} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Trust Section */}
      <TrustSection />

      {/* Edit Preferences Modal */}
      <EditPreferencesModal
        open={prefModalOpen}
        onOpenChange={setPrefModalOpen}
        initial={preferences}
        onSave={setPreferences}
      />

      {/* Job Detail Drawer */}
      <JobDetailDrawer
        app={drawerApp}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onApproveSubmit={handleApproveSubmit}
        onNotInterested={handleNotInterested}
      />
    </div>
  );
}
