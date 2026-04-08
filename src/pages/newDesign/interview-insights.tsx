import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
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
  ThumbsUp,
  Bookmark,
  Share2,
  Eye,
  ArrowUp,
  Lock,
} from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { Button } from '../../components/newDesign/ui/button';
import { getPosts, getPublicPosts } from '../../services/CommunityService';
import { useAuth } from '../../contexts/AuthContext';
import { ShareExperienceModal } from '../../components/newDesign/share-experience-modal';
import { SharePopover } from '@/components/newDesign/share-popover';
import { Markdown } from '@/components/newDesign/ui/markdown';
import { CompanyLogo } from '../../components/newDesign/ui/company-logo';

// ─── Color Mappings ────────────────────────────────────
const DIFFICULTY_COLORS: Record<string, string> = {
  Junior: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Senior: 'bg-orange-50 text-orange-700 border-orange-200',
  Staff: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Post Interface ─────────────────────────────────────
interface PostQuestion {
  id: string;
  seq: number;
  label: string;
  title: string;
  categories: string[];
  notes: string;
}

interface Post {
  id: string;
  company: string;
  role: string;
  level: string;
  round: string;
  date: string;
  outcome: string;
  location: string;
  questions: PostQuestion[];
  summary: string;
  status: string;
  createdAt: string;
  commentCount?: number;
  tags?: string[];
}

const SORT_OPTIONS = ['Newest', 'Oldest'] as const;
type SortOption = typeof SORT_OPTIONS[number];

const TOP_COMPANIES = ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'LinkedIn', 'Uber', 'Airbnb', 'TikTok', 'OpenAI', 'Anthropic', 'NVIDIA'];

const COMPANY_SIZE_CHIPS = ['FAANG / Big Tech', 'Large Enterprises', 'Mid-sized', 'Startups / Small'] as const;
type CompanySizeChip = typeof COMPANY_SIZE_CHIPS[number];

const COMPANY_BY_SIZE: Record<CompanySizeChip, string[]> = {
  'FAANG / Big Tech': ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'LinkedIn', 'Uber', 'Airbnb', 'TikTok', 'OpenAI', 'Anthropic', 'NVIDIA'],
  'Large Enterprises': ['Oracle', 'SAP', 'IBM', 'Cisco', 'Adobe', 'Intel', 'HP', 'Dell', 'VMware', 'ServiceNow', 'Salesforce', 'Workday'],
  'Mid-sized': ['HubSpot', 'Asana', 'Atlassian', 'Dropbox', 'Twilio', 'Zillow', 'Robinhood', 'Expedia', 'Square / Block', 'DocuSign', 'Cloudflare', 'Reddit'],
  'Startups / Small': ['Early-stage Startup', 'Series A Startup', 'Series B+ Startup'],
};

const TOP_BY_SIZE: Record<CompanySizeChip, string[]> = {
  'FAANG / Big Tech': ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'LinkedIn', 'Uber', 'Airbnb', 'OpenAI'],
  'Large Enterprises': ['Oracle', 'Salesforce', 'Adobe', 'IBM', 'Cisco', 'Intel', 'SAP', 'ServiceNow'],
  'Mid-sized': ['HubSpot', 'Atlassian', 'Cloudflare', 'Dropbox', 'Robinhood', 'Asana'],
  'Startups / Small': ['Early-stage Startup', 'Series A Startup', 'Series B+ Startup'],
};

const ALL_COMPANIES = Object.values(COMPANY_BY_SIZE).flat().filter((v, i, a) => a.indexOf(v) === i).sort();

// ─── Role Data ─────────────────────────────────────────
const ROLE_CATEGORY_CHIPS = ['Product', 'Engineering', 'Data & AI', 'Design & Research', 'Business / Consulting'] as const;
type RoleCategoryChip = typeof ROLE_CATEGORY_CHIPS[number];

const TOP_ROLES = [
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

// ─── Round Data (grouped chips) ────────────
const ROUND_GROUPS = [
  {
    label: 'Early Stage',
    options: ['Resume Screen', 'Recruiter Call', 'Phone Screen'],
  },
  {
    label: 'Technical',
    options: ['Technical Phone Screen', 'Take-Home Assignment', 'Coding Challenge'],
  },
  {
    label: 'Onsite / Final',
    options: ['Onsite - Coding', 'Onsite - System Design', 'Onsite - Behavioral', 'Onsite - Mixed', 'Onsite - Multi Round' , 'Final Round'],
  },
  {
    label: 'Other',
    options: ['Bar Raiser', 'Culture Fit', 'Executive Round', 'Reference Check'],
  },
] as const;

const ALL_ROUNDS = ROUND_GROUPS.flatMap(g => g.options);

// ─── Tag / Category Data ───────────────────────────────
const TAG_GROUPS: { label: string; tags: string[] }[] = [
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

const ALL_TAGS = TAG_GROUPS.flatMap(g => g.tags);

const FILTER_OPTIONS: Record<string, string[]> = {
  Role: ALL_ROLES,
  Company: ALL_COMPANIES,
  Round: ALL_ROUNDS,
  Level: ['Junior', 'Intermediate', 'Senior', 'Staff'],
  Category: ALL_TAGS,
};

const OUTCOME_COLORS: Record<string, string> = {
  Offer: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-600',
  'No response': 'bg-slate-50 text-slate-500',
  Pending: 'bg-blue-50 text-blue-600',
};

export function InterviewInsightsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeSort, setActiveSort] = useState<SortOption>('Newest');
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({});
  const [tempFilters, setTempFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companySizeChip, setCompanySizeChip] = useState<CompanySizeChip | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleCategoryChip, setRoleCategoryChip] = useState<RoleCategoryChip | null>(null);

  // API state
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Interaction state
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const toggleSave = (postId: string) => {
    setSavedPosts(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  // Filter posts based on applied filters and search
  const filteredPosts = useMemo(() => {
    let result = [...allPosts];
    
    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(post => {
        const company = (post.company || '').toLowerCase();
        const role = (post.role || '').toLowerCase();
        const summary = (post.summary || '').toLowerCase();
        const questions = post.questions || [];
        const hasMatchingQuestion = questions.some(q => 
          (q.title || '').toLowerCase().includes(query)
        );
        
        return company.includes(query) || 
              role.includes(query) || 
              summary.includes(query) || 
              hasMatchingQuestion;
      });
    }
    
    // Apply role filter
    if (appliedFilters.Role?.length) {
      result = result.filter(post => {
        const postRole = post.role || '';
        return appliedFilters.Role.some(filterRole => 
          postRole.toLowerCase() === filterRole.toLowerCase()
        );
      });
    }
    
    // Apply company filter
    if (appliedFilters.Company?.length) {
      result = result.filter(post => {
        const postCompany = post.company || '';
        return appliedFilters.Company.some(filterCompany => 
          postCompany.toLowerCase() === filterCompany.toLowerCase()
        );
      });
    }
    
    // Apply round filter
    if (appliedFilters.Round?.length) {
      result = result.filter(post => {
        const postRound = post.round || '';
        return appliedFilters.Round.some(filterRound => 
          postRound.toLowerCase() === filterRound.toLowerCase()
        );
      });
    }
    
    // Apply level filter
    if (appliedFilters.Level?.length) {
      result = result.filter(post => {
        const postLevel = post.level || '';
        return appliedFilters.Level.some(filterLevel =>
          postLevel.toLowerCase() === filterLevel.toLowerCase()
        );
      });
    }

    // Apply category/tag filter
    if (appliedFilters.Category?.length) {
      result = result.filter(post =>
        post.questions?.some(q =>
          q.categories?.some(cat =>
            appliedFilters.Category.some(fc => cat.toLowerCase() === fc.toLowerCase())
          )
        )
      );
    }

    return result;
  }, [allPosts, debouncedSearchQuery, appliedFilters]);

  // Sort posts locally
  const sortedPosts = useMemo(() => {
    const sorted = [...filteredPosts];
    
    if (activeSort === 'Newest') {
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        
        return dateB - dateA;
      });
    } else if (activeSort === 'Oldest') {
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        
        return dateA - dateB;
      });
    }
    
    return sorted;
  }, [filteredPosts, activeSort]);

  // Sidebar: top 5 newest posts as "hot this week"
  const hotThisWeek = useMemo(() => {
    return [...allPosts]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: `${p.company} · ${p.role}`,
        author: 'Community',
        views: 0,
        trend: '+new',
      }));
  }, [allPosts]);

  const fetchPosts = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true);
    setError(null);
    try {
      // Build API params - only filters that the API supports
      const params: any = {
        page: pageNum,
      };

      // Only send filters that the API actually supports
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      if (appliedFilters.Role?.[0]) params.role = appliedFilters.Role[0];
      if (appliedFilters.Company?.[0]) params.company = appliedFilters.Company[0];
      if (appliedFilters.Round?.[0]) params.round = appliedFilters.Round[0];
      if (appliedFilters.Level?.[0]) params.level = appliedFilters.Level[0];

      // Use public API for non-authenticated users, only fetch first page
      const fetchFn = isAuthenticated ? getPosts : getPublicPosts;
      const res = await fetchFn(isAuthenticated ? params : { page: 0 });
      const data = res.data?.data ?? res.data;
      const content: Post[] = data?.content ?? (Array.isArray(data) ? data : []);
      const pageMeta = data?.pageMeta;

      setAllPosts(prev => reset ? content : [...prev, ...content]);
      setHasMore(isAuthenticated ? (pageMeta ? !pageMeta.last : false) : false);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('Failed to load experiences. Please try again.');
      if (reset) {
        setAllPosts([]);
      }
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [debouncedSearchQuery, appliedFilters, isAuthenticated]);

  // Refetch when filters or search changes (reset to first page)
  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, false);
    }
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
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  // Safe date formatter
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Safe question access
  const getQuestions = (post: Post) => {
    return post.questions || [];
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* <ShareExperienceModal delayMs={5000} /> */}
      <main className="pt-24 pb-20 bg-[#f9fafb]">
        {/* ─── Hero Header ─── */}
        <div className="max-w-7xl mx-auto px-6 my-[40px]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-sm font-medium mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(221,91%,60%)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(221,91%,60%)]"></span>
                </span>
                Community-sourced
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[hsl(222,22%,15%)] tracking-tight mb-2 font-[family-name:var(--font-serif)]">
                Interview Insights
              </h1>
              <p className="text-lg text-[hsl(222,12%,45%)] max-w-xl">
                Real interview experiences shared by the community. Learn what to expect before you walk in.
              </p>
            </div>
            <Link to={isAuthenticated ? '/add-experience' : '/auth'} state={!isAuthenticated ? { from: { pathname: '/interview-insights' } } : undefined}>
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
                            {sort === 'Hot' && <span className="mr-1">🔥</span>}
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
                            {/* Company Filter Dropdown */}
                            {filter === 'Company' && (
                              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
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
                                  <div className="p-2 space-y-0.5">
                                    {ALL_COMPANIES.filter(c => 
                                      companySearch ? c.toLowerCase().includes(companySearch.toLowerCase()) : true
                                    ).slice(0, 50).map(option => (
                                      <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                        <input type="checkbox" checked={(tempFilters['Company'] || []).includes(option)} onChange={() => toggleTempFilter('Company', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                        <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => { resetFilter('Company'); setCompanySizeChip(null); setCompanySearch(''); }} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Company')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            )}
                            
                            {/* Role Filter Dropdown */}
                            {filter === 'Role' && (
                              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
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
                                  <div className="p-2 space-y-0.5">
                                    {ALL_ROLES.filter(r => 
                                      roleSearch ? r.toLowerCase().includes(roleSearch.toLowerCase()) : true
                                    ).slice(0, 50).map(option => (
                                      <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                        <input type="checkbox" checked={(tempFilters['Role'] || []).includes(option)} onChange={() => toggleTempFilter('Role', option)} className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                        <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => { resetFilter('Role'); setRoleCategoryChip(null); setRoleSearch(''); }} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Role')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            )}
                            
                            {/* Round Filter Dropdown */}
                            {filter === 'Round' && (
                              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                <div className="max-h-64 overflow-y-auto">
                                  {ROUND_GROUPS.map((group, gi) => (
                                    <div key={group.label}>
                                      {gi > 0 && <div className="mx-3 border-t border-[hsl(220,16%,94%)]" />}
                                      <div className="px-3 pt-2 pb-1.5">
                                        <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">{group.label}</span>
                                      </div>
                                      <div className="px-2.5 pb-2 flex flex-wrap gap-1.5">
                                        {group.options.map(option => {
                                          const isSelected = (tempFilters['Round'] || []).includes(option);
                                          return (
                                            <button
                                              key={option}
                                              onClick={() => toggleTempFilter('Round', option)}
                                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                                isSelected
                                                  ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                                  : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                              }`}
                                            >
                                              {option}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => resetFilter('Round')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Round')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            )}
                            
                            {/* Level Filter Dropdown */}
                            {filter === 'Level' && (
                              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
                                  {FILTER_OPTIONS.Level.map(option => (
                                    <label key={option} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={(tempFilters['Level'] || []).includes(option)}
                                        onChange={() => toggleTempFilter('Level', option)}
                                        className="w-3.5 h-3.5 rounded border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]"
                                      />
                                      <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => resetFilter('Level')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Level')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                </div>
                              </div>
                            )}

                            {/* Category Filter Dropdown */}
                            {filter === 'Category' && (
                              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                <div className="max-h-72 overflow-y-auto">
                                  {TAG_GROUPS.map((group, gi) => (
                                    <div key={group.label}>
                                      {gi > 0 && <div className="mx-3 border-t border-[hsl(220,16%,94%)]" />}
                                      <div className="px-3 pt-2 pb-1.5">
                                        <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">{group.label}</span>
                                      </div>
                                      <div className="px-2.5 pb-2 flex flex-wrap gap-1.5">
                                        {group.tags.map(tag => {
                                          const isSelected = (tempFilters['Category'] || []).includes(tag);
                                          return (
                                            <button
                                              key={tag}
                                              onClick={() => toggleTempFilter('Category', tag)}
                                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                                isSelected
                                                  ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                                  : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                              }`}
                                            >
                                              {tag}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                  <button onClick={() => resetFilter('Category')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                  <button onClick={() => applyFilter('Category')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
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
                  
              {/* Initial Loading State */}
              {isInitialLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
                  <p className="mt-2 text-[hsl(222,12%,45%)]">Loading experiences...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && !isInitialLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-red-200">
                  <p className="text-red-600 mb-2">{error}</p>
                  <button 
                    onClick={() => fetchPosts(0, true)} 
                    className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && !isInitialLoading && sortedPosts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <p className="text-[hsl(222,12%,45%)] mb-2">No experiences match your filters.</p>
                  <button onClick={clearAllFilters} className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline">Clear all filters</button>
                </div>
              )}

              {/* Posts List */}
              {sortedPosts.map((post, i) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.5) }}
                  className={`group bg-white rounded-2xl border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/25 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/[0.04] transition-all duration-300 ${!isAuthenticated ? 'cursor-pointer' : ''}`}
                  onClick={!isAuthenticated ? () => navigate('/auth', { state: { from: { pathname: '/interview-insights' } } }) : undefined}
                >
                  <div className="p-6">
                    {/* ── Card Header (always visible) ── */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CompanyLogo company={post.company} />
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-semibold text-[hsl(222,22%,15%)]">{post.company || 'Unknown'}</span>
                          <span className="text-[hsl(222,12%,70%)]">·</span>
                          <span className="text-[hsl(222,12%,45%)]">{post.role || 'Unknown Role'}</span>
                          <span className="text-[hsl(222,12%,70%)]">·</span>
                          <span className="text-[hsl(222,12%,45%)]">{post.round || 'Not specified'}</span>
                        </div>
                      </div>
                      {post.outcome && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${OUTCOME_COLORS[post.outcome] || 'bg-slate-50 text-slate-500'}`}>
                          {post.outcome}
                        </span>
                      )}
                    </div>

                    {/* ── Blurred content for non-authenticated users ── */}
                    {!isAuthenticated ? (
                      <div className="relative">
                        <div className="blur-sm select-none pointer-events-none">
                          <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(post.date)}
                            </span>
                          </div>
                          <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed line-clamp-2 mb-4">
                            {post.summary ? <Markdown className="text-sm text-[hsl(222,12%,35%)]">{post.summary}</Markdown> : 'No summary available'}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-5">
                            {getQuestions(post).length > 0 ? (
                              getQuestions(post).slice(0, 3).map((q, qi) => (
                                <span
                                  key={q.id || qi}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)] max-w-[220px] truncate"
                                >
                                  <span className="w-1 h-1 rounded-full bg-[hsl(221,91%,60%)] mr-2 shrink-0" />
                                  {q.title || 'Question'}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[hsl(222,12%,55%)]">No questions available</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 border border-[hsl(220,16%,90%)] shadow-sm">
                            <Lock className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                            <span className="text-sm font-medium text-[hsl(222,22%,15%)]">Sign in to view details</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ── Meta ── */}
                        <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(post.date)}
                          </span>
                        </div>

                        {/* ── Summary ── */}
                        <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed line-clamp-2 mb-4">
                          {post.summary ? <Markdown className="text-sm text-[hsl(222,12%,35%)]">{post.summary}</Markdown> : 'No summary available'}
                        </div>

                        {/* ── Question Preview Chips ── */}
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                          {getQuestions(post).length > 0 ? (
                            <>
                              {getQuestions(post).slice(0, 3).map((q, qi) => (
                                <span
                                  key={q.id || qi}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)] max-w-[220px] truncate"
                                >
                                  <span className="w-1 h-1 rounded-full bg-[hsl(221,91%,60%)] mr-2 shrink-0" />
                                  {q.title || 'Question'}
                                </span>
                              ))}
                              {getQuestions(post).length > 3 && (
                                <span className="px-2.5 py-1 rounded-lg bg-[hsl(221,91%,60%)]/8 text-[hsl(221,91%,60%)] text-xs font-medium">
                                  +{getQuestions(post).length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-[hsl(222,12%,55%)]">No questions available</span>
                          )}
                        </div>

                        {/* ── Actions ── */}
                        <div className="flex items-center justify-between pt-4 border-t border-[hsl(220,16%,94%)]">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                likedPosts.has(post.id) ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              {likedPosts.has(post.id) ? 1 : 0}
                            </button>
                            <span className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)]">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {post.commentCount ?? 0}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSave(post.id); }}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                savedPosts.has(post.id) ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'
                              }`}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${savedPosts.has(post.id) ? 'fill-current' : ''}`} />
                              {savedPosts.has(post.id) ? 1 : 0}
                            </button>
                            
                            {/* Share Popover - Fixed implementation */}
                            <SharePopover 
                              data={{
                                title: `${post.company} — ${post.round || 'Interview Experience'}`,
                                subtitle: post.role,
                                tags: [post.level, post.outcome, post.round].filter(Boolean),
                                summary: post.summary || `Interview experience at ${post.company} for ${post.role} position`,
                                url: `${window.location.origin}/experience/${post.id}`,
                              }}
                            >
                              <button 
                                type="button"
                                className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                              >
                                <div className="w-6 h-6 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center pointer-events-none">
                                  <Share2 className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            </SharePopover>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to={`/experience/${post.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium hover:bg-[hsl(222,22%,20%)] transition-colors"
                            >
                              View Post
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.article>
              ))}

              {/* Load More Button */}
              {sortedPosts.length > 0 && hasMore && !loading && (
                <div className="text-center pt-4 pb-2">
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore}
                    className="text-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)]/20 hover:bg-[hsl(221,91%,60%)]/5 rounded-xl"
                  >
                    Load more experiences
                  </Button>
                </div>
              )}

              {/* Loading More Indicator */}
              {loading && sortedPosts.length > 0 && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
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
                    placeholder="Search experiences..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Hot This Week */}
              {hotThisWeek.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-[hsl(220,16%,90%)] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)]">Hot this week</h4>
                    </div>
                    <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">Trending</span>
                  </div>
                  <div className="space-y-1">
                    {hotThisWeek.map((item, i) => (
                      <Link key={item.id} to={isAuthenticated ? `/experience/${item.id}` : '/auth'} state={!isAuthenticated ? { from: { pathname: '/interview-insights' } } : undefined} className="block group/hot">
                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[hsl(220,20%,98%)] transition-colors">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            i < 3 ? 'bg-gradient-to-br from-[hsl(221,91%,55%)] to-[hsl(221,91%,45%)] text-white' : 'bg-[hsl(220,20%,96%)] text-[hsl(222,12%,50%)]'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-[hsl(222,22%,15%)] truncate group-hover/hot:text-[hsl(221,91%,60%)] transition-colors leading-snug">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-[hsl(222,12%,55%)]">{item.author}</span>
                              <div className="flex items-center gap-0.5 text-[10px] text-[hsl(222,12%,55%)]">
                                <Eye className="w-2.5 h-2.5" />
                                {item.views >= 1000 ? `${(item.views / 1000).toFixed(1)}k` : item.views}
                              </div>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] text-[9px] font-semibold">
                                <ArrowUp className="w-2 h-2" />
                                {item.trend}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

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