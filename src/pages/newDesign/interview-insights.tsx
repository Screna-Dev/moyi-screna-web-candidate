import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  Search,
  ChevronDown,
  Flame,
  Plus,
  Clock,
  Shield,
  X,
  ListFilter,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { Button } from '../../components/newDesign/ui/button';
import { searchQuestions } from '../../services/QuestionBankService';

// ─── Color Mappings ────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  Junior: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Senior: 'bg-orange-50 text-orange-700 border-orange-200',
  Staff: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Question Interface ─────────────────────────────────
interface Question {
  id: string;
  question: string;
  company: string;
  role: string;
  level: string;
  round: string;
  category: string;
  createdAt: string;
}

const SORT_OPTIONS = ['Newest', 'Oldest'] as const;

const TOP_COMPANIES = ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'Stripe', 'Uber', 'Airbnb', 'Salesforce', 'Adobe', 'LinkedIn'];

const COMPANY_SIZE_CHIPS = ['FAANG / Big Tech', 'Large Enterprises', 'Mid-sized', 'Small'] as const;
type CompanySizeChip = typeof COMPANY_SIZE_CHIPS[number];

const COMPANY_BY_SIZE: Record<CompanySizeChip, string[]> = {
  'FAANG / Big Tech': ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'Nvidia', 'ByteDance'],
  'Large Enterprises': ['Oracle', 'SAP', 'IBM', 'Cisco', 'Intel', 'Qualcomm', 'AMD', 'VMware', 'Salesforce', 'Adobe', 'ServiceNow', 'Workday', 'Splunk', 'LinkedIn'],
  'Mid-sized': ['Stripe', 'Uber', 'Airbnb', 'Spotify', 'Snap', 'Pinterest', 'DoorDash', 'Instacart', 'Lyft', 'Shopify', 'Atlassian', 'Twilio', 'Datadog', 'Snowflake', 'Palantir', 'Databricks', 'Cloudflare', 'CrowdStrike', 'Palo Alto Networks', 'HubSpot', 'Okta', 'Zoom', 'Slack', 'Block (Square)', 'Roblox', 'Epic Games', 'Unity', 'Coinbase', 'Robinhood', 'MongoDB', 'Canva'],
  'Small': ['Dropbox', 'Twitter / X', 'Figma', 'Notion', 'HashiCorp'],
};

const TOP_BY_SIZE: Record<CompanySizeChip, string[]> = {
  'FAANG / Big Tech': ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'Nvidia', 'ByteDance'],
  'Large Enterprises': ['Oracle', 'Salesforce', 'Adobe', 'IBM', 'Cisco', 'Intel', 'SAP', 'ServiceNow'],
  'Mid-sized': ['Stripe', 'Uber', 'Airbnb', 'Spotify', 'Shopify', 'Snowflake', 'Databricks', 'DoorDash', 'Cloudflare', 'Coinbase'],
  'Small': ['Figma', 'Notion', 'Dropbox', 'HashiCorp', 'Twitter / X'],
};

const ALL_COMPANIES = [
  ...TOP_COMPANIES,
  'Spotify', 'Snap', 'Pinterest', 'Twitter / X', 'Dropbox', 'Coinbase', 'Robinhood', 'Databricks',
  'Snowflake', 'Palantir', 'DoorDash', 'Instacart', 'Lyft', 'Block (Square)', 'Figma', 'Notion',
  'Canva', 'Shopify', 'Atlassian', 'Twilio', 'Datadog', 'HashiCorp', 'MongoDB', 'Cloudflare',
  'Roblox', 'Epic Games', 'Unity', 'ByteDance', 'Nvidia', 'AMD', 'Intel', 'Qualcomm',
  'Oracle', 'SAP', 'IBM', 'Cisco', 'VMware', 'ServiceNow', 'Workday', 'Splunk',
  'Zoom', 'Slack', 'HubSpot', 'Okta', 'CrowdStrike', 'Palo Alto Networks',
].filter((v, i, a) => a.indexOf(v) === i).sort();

// ─── Role Data ─────────────────────────────────────────
const ROLE_CATEGORY_CHIPS = ['Engineering', 'Data / AI', 'Product', 'Design', 'Business / Other'] as const;
type RoleCategoryChip = typeof ROLE_CATEGORY_CHIPS[number];

const TOP_ROLES = [
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

const FILTER_OPTIONS: Record<string, string[]> = {
  Role: ALL_ROLES,
  Company: ALL_COMPANIES,
};

export function InterviewInsightsPage() {
  const [activeSort, setActiveSort] = useState<string>('Newest');
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({});
  const [tempFilters, setTempFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companySizeChip, setCompanySizeChip] = useState<CompanySizeChip | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleCategoryChip, setRoleCategoryChip] = useState<RoleCategoryChip | null>(null);

  // API state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchQuestions = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true);
    try {
      const res = await searchQuestions({
        search: searchQuery || undefined,
        role: appliedFilters.Role?.[0] || undefined,
        company: appliedFilters.Company?.[0] || undefined,
        page: pageNum,
      });
      const data = res.data?.data ?? res.data;
      const content: Question[] = data?.content ?? (Array.isArray(data) ? data : []);
      const pageMeta = data?.pageMeta;
      setQuestions(prev => reset ? content : [...prev, ...content]);
      setHasMore(pageMeta ? !pageMeta.last : false);
      setPage(pageNum);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [searchQuery, appliedFilters]);

  useEffect(() => {
    fetchQuestions(1, true);
  }, [fetchQuestions]);

  const handleLoadMore = () => {
    fetchQuestions(page + 1, false);
  };

  const toggleTempFilter = (filter: string, option: string) => {
    setTempFilters(prev => {
      const current = prev[filter] || [];
      return { ...prev, [filter]: current.includes(option) ? current.filter(o => o !== option) : [...current, option] };
    });
  };

  const applyFilter = (filter: string) => {
    setAppliedFilters(prev => ({ ...prev, [filter]: [...(tempFilters[filter] || [])] }));
    setOpenFilter(null);
  };

  const resetFilter = (filter: string) => {
    setTempFilters(prev => ({ ...prev, [filter]: [] }));
  };

  const handleOpenFilter = (filter: string) => {
    if (openFilter === filter) {
      setOpenFilter(null);
    } else {
      setTempFilters(prev => ({ ...prev, [filter]: [...(appliedFilters[filter] || [])] }));
      setOpenFilter(filter);
      if (filter === 'Company') setCompanySearch('');
      if (filter === 'Company') setCompanySizeChip(null);
      if (filter === 'Role') setRoleSearch('');
      if (filter === 'Role') setRoleCategoryChip(null);
    }
  };

  const totalApplied = Object.values(appliedFilters).reduce((sum, arr) => sum + arr.length, 0);

  const clearAllFilters = () => {
    setAppliedFilters({});
    setTempFilters({});
  };

  // Client-side sort
  const sorted = [...questions].sort((a, b) => {
    if (activeSort === 'Oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newest
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-24 pb-20 bg-[#f9fafb]">
        {/* ─── Hero Header ─── */}
        <div className="max-w-7xl mx-auto px-6 mx-[386px] my-[40px]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-sm font-medium mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(221,91%,60%)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(221,91%,60%)]"></span>
                </span>
                Community-sourced
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[hsl(222,22%,15%)] tracking-tight mb-2">
                Interview Insights
              </h1>
              <p className="text-lg text-[hsl(222,12%,45%)] max-w-xl">
                Real interview experiences shared by the community. Learn what to expect before you walk in.
              </p>
            </div>
            <Link to="/add-experience">
              <Button className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl shadow-lg shadow-[hsl(221,91%,60%)]/20 h-11 px-6 text-sm gap-2 shrink-0">
                <Plus className="w-4 h-4" />
                Share Your Experience
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ─── Left: Post Feed ─── */}
            <div className="flex-1 space-y-5 min-w-0">
              {/* Controls Bar */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
                {/* Sort Dropdown */}
                <div className="relative md:order-last md:ml-auto">
                  <button
                    onClick={() => setOpenFilter(openFilter === '__sort__' ? null : '__sort__')}
                    className="flex items-center gap-1.5 text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                  >
                    <ListFilter className="w-4 h-4" />
                    Sort: {activeSort}
                  </button>
                  {openFilter === '__sort__' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                      <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden p-1">
                        {SORT_OPTIONS.map(sort => (
                          <button
                            key={sort}
                            onClick={() => { setActiveSort(sort); setOpenFilter(null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              activeSort === sort
                                ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                                : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
                            }`}
                          >
                            {sort}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 relative z-20">
                  {Object.keys(FILTER_OPTIONS).map(filter => {
                    const isOpen = openFilter === filter;
                    const count = appliedFilters[filter]?.length || 0;
                    return (
                      <div key={filter} className="relative">
                        <button
                          onClick={() => handleOpenFilter(filter)}
                          className={`h-8 px-3 rounded-full bg-white border text-xs font-medium transition-all flex items-center gap-1.5 select-none ${
                            isOpen
                              ? 'border-[hsl(221,91%,60%)] text-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20'
                              : count > 0
                                ? 'border-[hsl(221,91%,60%)]/40 text-[hsl(221,91%,60%)]'
                                : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)]'
                          }`}
                        >
                          {filter}
                          {count > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[hsl(221,91%,60%)] text-white text-[9px] flex items-center justify-center">
                              {count}
                            </span>
                          )}
                          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                            {filter === 'Company' ? (
                              /* ─── Enhanced Company Dropdown with Size Chips ─── */
                              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                {/* Size category chips */}
                                <div className="p-2 flex flex-wrap gap-1.5 border-b border-[hsl(220,16%,92%)]">
                                  {COMPANY_SIZE_CHIPS.map(chip => (
                                    <button
                                      key={chip}
                                      onClick={() => setCompanySizeChip(companySizeChip === chip ? null : chip)}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                        companySizeChip === chip
                                          ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                          : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                      }`}
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>

                                {/* Search input */}
                                <div className="p-2 border-b border-[hsl(220,16%,92%)]">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                                    <input
                                      type="text"
                                      placeholder="Search company…"
                                      value={companySearch}
                                      onChange={e => setCompanySearch(e.target.value)}
                                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                <div className="max-h-56 overflow-y-auto">
                                  {(() => {
                                    const sizePool = companySizeChip ? COMPANY_BY_SIZE[companySizeChip] : ALL_COMPANIES;
                                    const topList = companySizeChip ? TOP_BY_SIZE[companySizeChip] : TOP_COMPANIES;
                                    const q = companySearch.trim().toLowerCase();

                                    if (q) {
                                      const matched = sizePool.filter(c => c.toLowerCase().includes(q)).sort();
                                      return matched.length === 0 ? (
                                        <p className="text-sm text-[hsl(222,12%,55%)] text-center py-4">No companies found</p>
                                      ) : (
                                        <div className="p-2 space-y-0.5">
                                          {matched.map(option => (
                                            <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                              <input type="checkbox" checked={(tempFilters['Company'] || []).includes(option)} onChange={() => toggleTempFilter('Company', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                              <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                            </label>
                                          ))}
                                        </div>
                                      );
                                    }

                                    const restList = [...sizePool].filter(c => !topList.includes(c)).sort();
                                    return (
                                      <>
                                        <div className="px-3 pt-2.5 pb-1">
                                          <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">
                                            {companySizeChip ? `Top ${companySizeChip}` : 'Top companies'}
                                          </span>
                                        </div>
                                        <div className="px-2 pb-1 space-y-0.5">
                                          {topList.map(option => (
                                            <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                              <input type="checkbox" checked={(tempFilters['Company'] || []).includes(option)} onChange={() => toggleTempFilter('Company', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                              <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                            </label>
                                          ))}
                                        </div>
                                        {restList.length > 0 && (
                                          <>
                                            <div className="px-3 pt-2 pb-1 border-t border-[hsl(220,16%,94%)]">
                                              <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">All companies</span>
                                            </div>
                                            <div className="px-2 pb-1 space-y-0.5">
                                              {restList.map(option => (
                                                <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                                  <input type="checkbox" checked={(tempFilters['Company'] || []).includes(option)} onChange={() => toggleTempFilter('Company', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                                  <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => { resetFilter('Company'); setCompanySizeChip(null); setCompanySearch(''); }} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Company')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            ) : filter === 'Role' ? (
                              /* ─── Enhanced Role Dropdown with Category Chips ─── */
                              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                {/* Category chips */}
                                <div className="p-2 flex flex-wrap gap-1.5 border-b border-[hsl(220,16%,92%)]">
                                  {ROLE_CATEGORY_CHIPS.map(chip => (
                                    <button
                                      key={chip}
                                      onClick={() => setRoleCategoryChip(roleCategoryChip === chip ? null : chip)}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                        roleCategoryChip === chip
                                          ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                          : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                      }`}
                                    >
                                      {chip}
                                    </button>
                                  ))}
                                </div>

                                {/* Search input */}
                                <div className="p-2 border-b border-[hsl(220,16%,92%)]">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                                    <input
                                      type="text"
                                      placeholder="Search role…"
                                      value={roleSearch}
                                      onChange={e => setRoleSearch(e.target.value)}
                                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                                      autoFocus
                                    />
                                  </div>
                                </div>

                                <div className="max-h-56 overflow-y-auto">
                                  {(() => {
                                    const categoryPool = roleCategoryChip ? ROLE_BY_CATEGORY[roleCategoryChip] : ALL_ROLES;
                                    const topList = roleCategoryChip ? TOP_BY_CATEGORY[roleCategoryChip] : TOP_ROLES;
                                    const q = roleSearch.trim().toLowerCase();

                                    if (q) {
                                      // Also resolve alias matches (e.g. "PM" → "Product Manager")
                                      const aliasMatches = new Set<string>();
                                      const matchedAliasLookup = new Map<string, string>();
                                      Object.entries(ROLE_ALIASES).forEach(([alias, fullName]) => {
                                        if (alias.toLowerCase().includes(q) && categoryPool.includes(fullName)) {
                                          aliasMatches.add(fullName);
                                          matchedAliasLookup.set(fullName, alias);
                                        }
                                      });

                                      const matched = categoryPool.filter(r =>
                                        r.toLowerCase().includes(q) || aliasMatches.has(r)
                                      ).sort();

                                      return matched.length === 0 ? (
                                        <p className="text-sm text-[hsl(222,12%,55%)] text-center py-4">No roles found</p>
                                      ) : (
                                        <div className="p-2 space-y-0.5">
                                          {matched.map(option => (
                                            <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                              <input type="checkbox" checked={(tempFilters['Role'] || []).includes(option)} onChange={() => toggleTempFilter('Role', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                              <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                              {matchedAliasLookup.has(option) && (
                                                <span className="ml-auto text-[10px] text-[hsl(222,12%,55%)] bg-[hsl(220,20%,96%)] px-1.5 py-0.5 rounded">
                                                  {matchedAliasLookup.get(option)}
                                                </span>
                                              )}
                                            </label>
                                          ))}
                                        </div>
                                      );
                                    }

                                    const restList = [...categoryPool].filter(r => !topList.includes(r)).sort();
                                    return (
                                      <>
                                        <div className="px-3 pt-2.5 pb-1">
                                          <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">
                                            {roleCategoryChip ? `Top ${roleCategoryChip}` : 'Top roles'}
                                          </span>
                                        </div>
                                        <div className="px-2 pb-1 space-y-0.5">
                                          {topList.map(option => (
                                            <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                              <input type="checkbox" checked={(tempFilters['Role'] || []).includes(option)} onChange={() => toggleTempFilter('Role', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                              <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                            </label>
                                          ))}
                                        </div>
                                        {restList.length > 0 && (
                                          <>
                                            <div className="px-3 pt-2 pb-1 border-t border-[hsl(220,16%,94%)]">
                                              <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">All roles</span>
                                            </div>
                                            <div className="px-2 pb-2 space-y-0.5">
                                              {restList.map(option => (
                                                <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                                  <input type="checkbox" checked={(tempFilters['Role'] || []).includes(option)} onChange={() => toggleTempFilter('Role', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                                  <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>

                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => { resetFilter('Role'); setRoleCategoryChip(null); setRoleSearch(''); }} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Role')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            ) : (
                              /* ─── Default Filter Dropdown ─── */
                              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
                                  {FILTER_OPTIONS[filter].map(option => (
                                    <label key={option} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={(tempFilters[filter] || []).includes(option)}
                                        onChange={() => toggleTempFilter(filter, option)}
                                        className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]"
                                      />
                                      <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => resetFilter(filter)} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter(filter)} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {totalApplied > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="h-8 px-3 rounded-full text-xs font-medium text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Loading state */}
              {loading && questions.length === 0 && (
                <div className="flex items-center justify-center gap-3 py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <Loader2 className="w-5 h-5 animate-spin text-[hsl(221,91%,60%)]" />
                  <span className="text-sm text-[hsl(222,12%,45%)]">Loading questions...</span>
                </div>
              )}

              {/* Empty state */}
              {!loading && sorted.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-[hsl(222,12%,45%)] font-medium mb-2">No questions found</p>
                  {totalApplied > 0 && (
                    <button onClick={clearAllFilters} className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline">Clear all filters</button>
                  )}
                </div>
              )}

              {sorted.map((q, i) => (
                <motion.article
                  key={q.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group bg-white rounded-2xl border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/25 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/[0.04] transition-all duration-300"
                >
                  <div className="p-6">
                    {/* ── Card Header ── */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-sm font-bold text-[hsl(222,22%,15%)] shrink-0">
                          {q.company?.[0] ?? '?'}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm flex-wrap">
                          <span className="font-semibold text-[hsl(222,22%,15%)]">{q.company}</span>
                          {q.role && (
                            <>
                              <span className="text-[hsl(222,12%,70%)]">·</span>
                              <span className="text-[hsl(222,12%,45%)]">{q.role.replace(/_/g, ' ')}</span>
                            </>
                          )}
                          {q.round && (
                            <>
                              <span className="text-[hsl(222,12%,70%)]">·</span>
                              <span className="text-[hsl(222,12%,45%)]">{q.round}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {q.level && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${DIFFICULTY_COLORS[q.level] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {q.level}
                        </span>
                      )}
                    </div>

                    {/* ── Meta ── */}
                    <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                      {q.category && (
                        <span className="px-2 py-0.5 rounded-full bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-[hsl(222,12%,45%)]">
                          {q.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* ── Question text ── */}
                    <p className="text-sm text-[hsl(222,12%,25%)] font-medium leading-relaxed line-clamp-2 mb-5">
                      {q.question}
                    </p>

                    {/* ── Actions ── */}
                    <div className="flex items-center justify-end pt-4 border-t border-[hsl(220,16%,94%)]">
                      <Link
                        to={`/question-detail/${q.id}`}
                        className="px-4 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium hover:bg-[hsl(222,22%,20%)] transition-colors"
                      >
                        View Question
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}

              {/* Load more */}
              {!loading && hasMore && sorted.length > 0 && (
                <div className="text-center pt-4 pb-2">
                  <Button
                    onClick={handleLoadMore}
                    className="bg-[hsl(222,22%,15%)] text-[hsl(221,91%,60%)] hover:bg-[hsl(222,22%,20%)] rounded-xl border-0"
                  >
                    Load more questions
                  </Button>
                </div>
              )}

              {/* Loading more spinner */}
              {loading && questions.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-[hsl(221,91%,60%)]" />
                  <span className="text-sm text-[hsl(222,12%,45%)]">Loading more...</span>
                </div>
              )}
            </div>

            {/* ─── Right Sidebar ─── */}
            <div className="lg:w-80 space-y-5 shrink-0">
              {/* Search */}
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-sm p-[16px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                  />
                </div>
              </div>

              {/* Recent Questions */}
              <div className="bg-white rounded-2xl p-5 border border-[hsl(220,16%,90%)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-orange-500" />
                    </div>
                    <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)]">Recent questions</h4>
                  </div>
                  <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">Latest</span>
                </div>

                {loading && questions.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-[hsl(221,91%,60%)]" />
                    <span className="text-xs text-[hsl(222,12%,55%)]">Loading...</span>
                  </div>
                ) : questions.length === 0 ? (
                  <p className="text-xs text-[hsl(222,12%,55%)] text-center py-4">No questions yet</p>
                ) : (
                  <div className="space-y-1">
                    {questions.slice(0, 5).map((item, i) => (
                      <Link key={item.id} to={`/question-detail/${item.id}`} className="block group/hot">
                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[hsl(220,20%,98%)] transition-colors">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            i < 3 ? 'bg-gradient-to-br from-[hsl(221,91%,55%)] to-[hsl(221,91%,45%)] text-white' : 'bg-[hsl(220,20%,96%)] text-[hsl(222,12%,50%)]'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-[hsl(222,22%,15%)] line-clamp-2 group-hover/hot:text-[hsl(221,91%,60%)] transition-colors leading-snug">
                              {item.question}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-[hsl(222,12%,55%)]">{item.company}</span>
                              {item.level && (
                                <span className="text-[10px] text-[hsl(222,12%,55%)]">· {item.level}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Community Guidelines */}
              <div className="bg-white rounded-2xl p-5 border border-[hsl(220,16%,90%)] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)]">Community Guidelines</h4>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Share genuine interview experiences',
                    'Never reveal recruiter or interviewer names',
                    'Keep proprietary questions confidential',
                    'Be respectful and constructive',
                  ].map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[hsl(222,12%,45%)] leading-relaxed">
                      <span className="w-1 h-1 rounded-full bg-[hsl(222,12%,65%)] mt-1.5 shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
