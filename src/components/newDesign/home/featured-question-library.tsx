import { motion } from 'motion/react';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Search, Filter, ChevronRight, Lock, Sparkles, ThumbsUp, MessageSquare, Share2, Bookmark, FolderOpen, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { searchQuestions } from '../../../services/QuestionBankService';
import { CompanyLogo } from '../ui/company-logo';

const bookmarkFolders = [
  {
    id: "1",
    name: "Favorites",
    icon: "🌟",
    count: 5
  },
  {
    id: "2",
    name: "Interview Prep",
    icon: "📚",
    count: 10
  },
  {
    id: "3",
    name: "Technical",
    icon: "💻",
    count: 3
  }
];

const trendingCompanies = ["Google", "Meta", "Amazon", "Microsoft", "Netflix", "Apple"];

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

const FeaturedQuestionLibrary = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedTo, setSavedTo] = useState<Record<string, string[]>>({});
  const [bookmarkOpen, setBookmarkOpen] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({
    Role: [],
    Company: [],
    Category: [],
  });
  const [tempFilters, setTempFilters] = useState<Record<string, string[]>>({
    Role: [],
    Company: [],
    Category: [],
  });

  const fetchQuestions = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pageNum };
      if (searchInput) params.search = searchInput;
      if (appliedFilters.Role.length > 0) params.role = appliedFilters.Role[0];
      if (appliedFilters.Company.length > 0) params.company = appliedFilters.Company[0];
      if (appliedFilters.Category.length > 0) params.category = appliedFilters.Category[0];
      const res = await searchQuestions(params);
      const data = res.data?.data ?? res.data;
      const content: Question[] = data?.content ?? [];
      const pageMeta = data?.pageMeta ?? {};
      setQuestions(prev => reset ? content : [...prev, ...content]);
      setHasMore(!pageMeta.last);
    } catch {
      // keep existing questions on error
    } finally {
      setLoading(false);
    }
  }, [searchInput, appliedFilters]);

  useEffect(() => {
    setPage(1);
    fetchQuestions(1, true);
  }, [appliedFilters, searchInput]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuestions(nextPage, false);
  };

  const toggleTempFilter = (filter: string, option: string) => {
    setTempFilters(prev => {
      const current = prev[filter] || [];
      if (current.includes(option)) {
        return { ...prev, [filter]: current.filter(o => o !== option) };
      }
      return { ...prev, [filter]: [...current, option] };
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
    }
  };

  const toggleSaveToFolder = (questionId: string, folderId: string) => {
    setSavedTo(prev => {
      const current = prev[questionId] || [];
      if (current.includes(folderId)) {
        return { ...prev, [questionId]: current.filter(f => f !== folderId) };
      }
      return { ...prev, [questionId]: [...current, folderId] };
    });
  };

  return (
    <section className="py-24 bg-[#F9FAFB] relative overflow-hidden" id="question-bank">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[hsl(220,16%,90%)] to-transparent" />
      <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-b from-[hsl(221,91%,60%)]/5 to-transparent blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(221,91%,60%)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(221,91%,60%)]"></span>
            </span>
            Live Question Library Preview
          </div>
          
          <h2 className="text-3xl md:text-4xl font-semibold text-[hsl(222,22%,15%)] mb-4 tracking-tight">
            Explore 4,401 real interview questions
          </h2>
          <p className="text-lg text-[hsl(222,12%,45%)]">
            Community-sourced questions from top tech companies. Updated daily.
          </p>
        </div>

        {/* Content Container */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column: Question Cards */}
          <div className="flex-1 space-y-6">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 mb-8 relative z-20">
              {/* Hot Button (Moved to Start) */}
              <button className="px-4 py-2 rounded-full bg-white border border-[hsl(220,16%,90%)] text-[hsl(222,22%,15%)] text-sm font-medium flex items-center gap-2 hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)] transition-colors shadow-sm">
                <span className="text-orange-500">🔥</span> Hot
              </button>

              <div className="h-6 w-px bg-[hsl(220,16%,90%)] mx-2 hidden sm:block" />

              {/* Filters with Popups */}
              {['Role', 'Company', 'Category'].map((filter) => {
                const isOpen = openFilter === filter;
                const appliedCount = appliedFilters[filter]?.length || 0;
                return (
                <div key={filter} className="relative">
                  <button
                    onClick={() => handleOpenFilter(filter)}
                    className={`px-4 py-2 rounded-full bg-white border text-sm font-medium transition-all cursor-pointer flex items-center gap-2 select-none ${
                      isOpen
                        ? 'border-[hsl(221,91%,60%)] text-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20'
                        : appliedCount > 0
                          ? 'border-[hsl(221,91%,60%)]/40 text-[hsl(221,91%,60%)]'
                          : 'border-[hsl(220,16%,90%)] text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)]'
                    }`}
                  >
                    {filter}
                    {appliedCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[hsl(221,91%,60%)] text-white text-[10px] flex items-center justify-center">
                        {appliedCount}
                      </span>
                    )}
                    <ChevronRight className={`w-3 h-3 transition-transform duration-200 opacity-50 ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {/* Popup Content */}
                  {isOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent cursor-default"
                        onClick={() => setOpenFilter(null)}
                      />
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                        <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
                          <div className="text-xs font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider mb-2 px-2">
                            Select {filter}
                          </div>
                          {filter === 'Category' ? (
                            [
                              { group: 'Product & Business Strategy', items: ['Product Strategy', 'Product Sense & Ideation', 'Go-to-Market (GTM)', 'Pricing & Monetization'] },
                              { group: 'Data & Analytics', items: ['Data Modeling', 'Product Analytics & Metrics', 'Root Cause Analysis', 'A/B Testing & Experimentation'] },
                              { group: 'Technical & Architecture', items: ['System Design', 'API & Integrations', 'Technical Trade-offs', 'Algorithms & Data Structures'] },
                              { group: 'Execution & Delivery', items: ['Roadmap Prioritization', 'Cross-functional Alignment', 'Agile / Sprint Management'] },
                              { group: 'Behavioral & Leadership', items: ['Stakeholder Management', 'Conflict Resolution', 'Adaptability & Ambiguity'] },
                            ].map((section, si) => (
                              <div key={section.group} className={si > 0 ? 'pt-2' : ''}>
                                <div className="text-[11px] font-semibold text-[hsl(222,12%,60%)] uppercase tracking-wider px-2 py-1.5">
                                  {section.group}
                                </div>
                                {section.items.map((option) => (
                                  <label key={option} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer group/item transition-colors">
                                    <input 
                                      type="checkbox" 
                                      checked={(tempFilters[filter] || []).includes(option)}
                                      onChange={() => toggleTempFilter(filter, option)}
                                      className="w-4 h-4 rounded border-[hsl(220,16%,90%)] text-[hsl(221,91%,60%)] focus:ring-[hsl(221,91%,60%)] cursor-pointer accent-[hsl(221,91%,60%)]" 
                                    />
                                    <span className="text-sm text-[hsl(222,22%,15%)] group-hover/item:text-[hsl(221,91%,60%)] transition-colors">{option}</span>
                                  </label>
                                ))}
                              </div>
                            ))
                          ) : (
                            (filter === 'Role' ? ['Product Manager', 'Software Engineer', 'Data Scientist', 'UX Designer', 'Engineering Manager'] :
                              ['Google', 'Meta', 'Amazon', 'Microsoft', 'Netflix', 'Apple']
                            ).map((option) => (
                              <label key={option} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer group/item transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={(tempFilters[filter] || []).includes(option)}
                                  onChange={() => toggleTempFilter(filter, option)}
                                  className="w-4 h-4 rounded border-[hsl(220,16%,90%)] text-[hsl(221,91%,60%)] focus:ring-[hsl(221,91%,60%)] cursor-pointer accent-[hsl(221,91%,60%)]" 
                                />
                                <span className="text-sm text-[hsl(222,22%,15%)] group-hover/item:text-[hsl(221,91%,60%)] transition-colors">{option}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <div className="p-3 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between items-center">
                          <button 
                            className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] transition-colors font-medium"
                            onClick={() => resetFilter(filter)}
                          >
                            Reset
                          </button>
                          <button 
                            className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,60%)]/90 transition-colors"
                            onClick={() => applyFilter(filter)}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                );
              })}

              {/* Filter Icon Button (Far Right) */}
              <div className="ml-auto">
                
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {!loading && questions.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <p className="text-[hsl(222,12%,45%)] text-sm mb-2">No questions match your filters.</p>
                  <button
                    className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline"
                    onClick={() => {
                      setAppliedFilters({ Role: [], Company: [], Category: [] });
                      setTempFilters({ Role: [], Company: [], Category: [] });
                    }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}
              {questions.map((q) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white overflow-hidden rounded-2xl p-6 border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/30 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/5 transition-all duration-300 cursor-pointer relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <CompanyLogo company={q.company} size="sm" className="rounded-full" />
                      <div className="space-y-1">
                        <div className="text-xs text-[hsl(222,12%,45%)] flex flex-wrap items-center gap-1 leading-none pt-2.5">
                          <span className="font-semibold text-[hsl(222,22%,15%)]">{q.company}</span>
                          {q.round && <><span>·</span><span>{q.round}</span></>}
                        </div>
                      </div>
                    </div>

                    {q.level && (
                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        q.level === 'JUNIOR' ? 'bg-green-50 text-green-700 border-green-200' :
                        q.level === 'MID' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        q.level === 'SENIOR' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {q.level}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-3 group-hover:text-[hsl(221,91%,60%)] transition-colors">
                    {q.question}
                  </h3>

                  {q.category && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 rounded-md bg-[hsl(220,20%,98%)] text-[hsl(222,12%,45%)] text-xs border border-[hsl(220,16%,90%)]">
                        {q.category.replace(/_/g, ' ')}
                      </span>
                      {q.role && (
                        <span className="px-2 py-1 rounded-md bg-[hsl(220,20%,98%)] text-[hsl(222,12%,45%)] text-xs border border-[hsl(220,16%,90%)]">
                          {q.role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[hsl(222,12%,45%)] text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[hsl(222,12%,45%)]">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center hover:text-[hsl(222,22%,15%)] transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <div className="relative flex items-center">
                        <button 
                          className={`hover:text-[hsl(222,22%,15%)] transition-colors relative z-20 ${
                            (savedTo[q.id]?.length || 0) > 0 ? 'text-[hsl(221,91%,60%)]' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBookmarkOpen(bookmarkOpen === q.id ? null : q.id);
                          }}
                        >
                          <Bookmark className={`w-4 h-4 ${(savedTo[q.id]?.length || 0) > 0 ? 'fill-current' : ''}`} />
                        </button>

                        {/* Bookmark Folder Popover */}
                        {bookmarkOpen === q.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setBookmarkOpen(null);
                              }} 
                            />
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-40 overflow-hidden">
                              <div className="p-3 border-b border-[hsl(220,16%,90%)]">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider">
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  Save to folder
                                </div>
                              </div>
                              <div className="p-1.5 max-h-48 overflow-y-auto">
                                {bookmarkFolders.map((folder) => {
                                  const isSaved = (savedTo[q.id] || []).includes(folder.id);
                                  return (
                                    <button
                                      key={folder.id}
                                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        isSaved 
                                          ? 'bg-[hsl(221,91%,60%)]/5 text-[hsl(221,91%,60%)]' 
                                          : 'hover:bg-[hsl(220,20%,98%)] text-[hsl(222,22%,15%)]'
                                      }`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleSaveToFolder(q.id, folder.id);
                                      }}
                                    >
                                      <span className="text-sm">{folder.icon}</span>
                                      <span className="flex-1 text-left">{folder.name}</span>
                                      <span className="text-xs text-[hsl(222,12%,45%)]">{folder.count}</span>
                                      {isSaved && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="p-1.5 border-t border-[hsl(220,16%,90%)]">
                                <button 
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[hsl(222,12%,45%)] hover:bg-[hsl(220,20%,98%)] hover:text-[hsl(221,91%,60%)] transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Create new folder</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle hover gradient overlay */}
                  <a href={`/question/${q.id}`} className="absolute inset-0 bg-gradient-to-r from-[hsl(221,91%,60%)]/0 to-[hsl(221,91%,60%)]/0 group-hover:to-[hsl(221,91%,60%)]/5 transition-all duration-500 cursor-pointer" />
                </motion.div>
              ))}
              
              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(221,91%,60%)]" />
                </div>
              )}
              {!loading && hasMore && questions.length > 0 && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={handleLoadMore} className="text-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)]/20 hover:bg-[hsl(221,91%,60%)]/5">
                    Load more questions
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Add Interview Experience Button */}
            <Link to="/add-experience" className="block w-full">
              <Button 
                className="w-full bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl shadow-lg shadow-[hsl(221,91%,60%)]/20 hover:shadow-xl hover:shadow-[hsl(221,91%,60%)]/30 transition-all duration-300 h-11 text-sm gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Interview Experience
              </Button>
            </Link>

            {/* Search Box */}
            <div className="bg-white rounded-2xl p-4 border border-[hsl(220,16%,90%)] shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,45%)]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                />
              </div>
            </div>

            {/* Unlock Premium Banner */}
            <div className="bg-gradient-to-br from-[hsl(222,45%,12%)] to-[hsl(221,40%,18%)] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[hsl(221,91%,60%)]/20 rounded-full blur-2xl group-hover:bg-[hsl(221,91%,60%)]/30 transition-all duration-500" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 text-[hsl(165,82%,51%)]">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-lg mb-1">Unlock Full Access</h4>
                <p className="text-white/70 text-sm mb-4">Get unlimited access to all 4,000+ questions and AI answers.</p>
                <Button size="sm" className="w-full bg-white text-[hsl(222,45%,12%)] hover:bg-white/90">
                  Upgrade to Pro
                </Button>
              </div>
            </div>

            {/* Popular Roles */}
            

            {/* Trending Companies */}
            <div className="bg-white rounded-2xl p-5 border border-[hsl(220,16%,90%)]">
              <h4 className="text-sm font-semibold text-[hsl(222,12%,45%)] uppercase tracking-wider mb-4">
                Trending Companies
              </h4>
              <div className="space-y-3">
                {trendingCompanies.map(company => (
                  <button key={company} className="flex items-center justify-between w-full group">
                    <span className="text-[hsl(222,22%,15%)] text-sm group-hover:text-[hsl(221,91%,60%)] transition-colors">{company}</span>
                    <ChevronRight className="w-4 h-4 text-[hsl(220,16%,90%)] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export { FeaturedQuestionLibrary };