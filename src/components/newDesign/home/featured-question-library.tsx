import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Search, Filter, ChevronRight, Lock, Sparkles, ThumbsUp, MessageSquare, Share2, Bookmark, FolderOpen, Plus, Check } from 'lucide-react';
import { Button } from '../ui/button';

// Mock data for the question library
const questions = [
  {
    id: 1,
    title: "Explain the difference between a stack and a queue.",
    preview: "A stack is a linear data structure that follows the Last In First Out (LIFO) principle, while a queue follows the First In First Out (FIFO) principle.",
    role: "Software Engineer",
    company: "Google",
    askedAt: ["2023-01-15", "2023-02-20"],
    difficulty: "Junior",
    likes: 15,
    comments: 3,
    tags: ["Algorithms", "Data Structures"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 2,
    title: "What is the difference between a shallow copy and a deep copy?",
    preview: "A shallow copy creates a new object but copies the references of nested objects, whereas a deep copy creates a new object and recursively copies all objects found within the original.",
    role: "Software Engineer",
    company: "Meta",
    askedAt: ["2023-03-10", "2023-04-25"],
    difficulty: "Intermediate",
    likes: 20,
    comments: 5,
    tags: ["JavaScript", "Data Structures"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 3,
    title: "How would you design a system to handle a large number of concurrent users?",
    preview: "To handle a large number of concurrent users, I would design a scalable architecture using load balancers, microservices, and a distributed database.",
    role: "Engineering Manager",
    company: "Amazon",
    askedAt: ["2023-05-05", "2023-06-30"],
    difficulty: "Senior",
    likes: 25,
    comments: 7,
    tags: ["System Design", "Scalability"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 4,
    title: "What is the difference between a RESTful API and a GraphQL API?",
    preview: "RESTful APIs use HTTP methods to perform CRUD operations on resources, while GraphQL APIs use a single endpoint to query and mutate data.",
    role: "Software Engineer",
    company: "Microsoft",
    askedAt: ["2023-07-15", "2023-08-30"],
    difficulty: "Intermediate",
    likes: 30,
    comments: 10,
    tags: ["API Design", "GraphQL"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 5,
    title: "How would you handle a situation where a user reports a bug in your product?",
    preview: "When a user reports a bug, I would first acknowledge the report, reproduce the issue, and then prioritize it based on its severity and impact on the user experience.",
    role: "Product Manager",
    company: "Netflix",
    askedAt: ["2023-09-01", "2023-10-15"],
    difficulty: "Junior",
    likes: 35,
    comments: 12,
    tags: ["Product Management", "Bug Reporting"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 6,
    title: "What is the difference between a synchronous and an asynchronous function?",
    preview: "A synchronous function executes in a blocking manner, meaning it waits for the operation to complete before moving on to the next line of code. An asynchronous function, on the other hand, allows the program to continue executing other code while waiting for the operation to complete.",
    role: "Software Engineer",
    company: "Apple",
    askedAt: ["2023-11-01", "2023-12-15"],
    difficulty: "Intermediate",
    likes: 40,
    comments: 15,
    tags: ["JavaScript", "Asynchronous Programming"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 7,
    title: "How would you design a recommendation system for a streaming service?",
    preview: "To design a recommendation system for a streaming service, I would use collaborative filtering techniques to analyze user behavior and preferences, and then use machine learning algorithms to generate personalized recommendations.",
    role: "Data Scientist",
    company: "Netflix",
    askedAt: ["2023-01-01", "2023-02-15"],
    difficulty: "Senior",
    likes: 45,
    comments: 18,
    tags: ["Machine Learning", "Recommendation Systems"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 8,
    title: "What is the difference between a monolithic and a microservices architecture?",
    preview: "A monolithic architecture is a single, unified application that is built and deployed as a single unit. A microservices architecture, on the other hand, is composed of many small, independent services that communicate with each other through APIs.",
    role: "Engineering Manager",
    company: "Google",
    askedAt: ["2023-03-01", "2023-04-15"],
    difficulty: "Senior",
    likes: 50,
    comments: 20,
    tags: ["System Design", "Microservices"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 9,
    title: "How would you handle a situation where a user reports a bug in your product?",
    preview: "When a user reports a bug, I would first acknowledge the report, reproduce the issue, and then prioritize it based on its severity and impact on the user experience.",
    role: "Product Manager",
    company: "Meta",
    askedAt: ["2023-05-01", "2023-06-15"],
    difficulty: "Junior",
    likes: 55,
    comments: 22,
    tags: ["Product Management", "Bug Reporting"],
    logo: "https://via.placeholder.com/50"
  },
  {
    id: 10,
    title: "What is the difference between a RESTful API and a GraphQL API?",
    preview: "RESTful APIs use HTTP methods to perform CRUD operations on resources, while GraphQL APIs use a single endpoint to query and mutate data.",
    role: "Software Engineer",
    company: "Amazon",
    askedAt: ["2023-07-01", "2023-08-15"],
    difficulty: "Intermediate",
    likes: 60,
    comments: 25,
    tags: ["API Design", "GraphQL"],
    logo: "https://via.placeholder.com/50"
  }
];

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

const FeaturedQuestionLibrary = () => {
  const [savedTo, setSavedTo] = useState<Record<number, string[]>>({});
  const [bookmarkOpen, setBookmarkOpen] = useState<number | null>(null);
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

  const filteredQuestions = questions.filter(q => {
    if (appliedFilters.Role.length > 0 && !appliedFilters.Role.includes(q.role)) return false;
    if (appliedFilters.Company.length > 0 && !appliedFilters.Company.includes(q.company)) return false;
    if (appliedFilters.Category.length > 0 && !q.tags.some(t => appliedFilters.Category.includes(t))) return false;
    return true;
  });

  const toggleSaveToFolder = (questionId: number, folderId: string) => {
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
              {filteredQuestions.length === 0 && (
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
              {filteredQuestions.map((q) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white rounded-2xl p-6 border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/30 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/5 transition-all duration-300 cursor-pointer relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-white border border-[hsl(220,16%,90%)] p-1 shrink-0 overflow-hidden shadow-sm flex items-center justify-center">
                        <img 
                          src={q.logo} 
                          alt={q.company} 
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            const img = e.currentTarget;
                            const parent = img.parentElement;
                            img.style.display = 'none';
                            if (parent) {
                              parent.innerText = q.company[0];
                              parent.className = "w-7 h-7 rounded-full bg-[hsl(220,20%,98%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-[hsl(222,22%,15%)] text-xs font-bold shrink-0";
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-[hsl(222,12%,45%)] flex flex-wrap items-center gap-1 leading-none pt-2.5">
                          Asked at <span className="font-semibold text-[hsl(222,22%,15%)]">{q.askedAt.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      q.difficulty === 'Junior' ? 'bg-green-50 text-green-700 border-green-200' :
                      q.difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      q.difficulty === 'Senior' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {q.difficulty}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-[hsl(222,22%,15%)] mb-3 group-hover:text-[hsl(221,91%,60%)] transition-colors">
                    {q.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {q.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 rounded-md bg-[hsl(220,20%,98%)] text-[hsl(222,12%,45%)] text-xs border border-[hsl(220,16%,90%)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="bg-[hsl(220,20%,98%)] rounded-xl p-4 mb-4 border border-[hsl(220,16%,90%)] group-hover:bg-white transition-colors relative">
                    <div className="absolute top-3 right-3 text-[hsl(221,91%,60%)]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-[hsl(222,12%,45%)] line-clamp-2 italic">
                      "{q.preview}"
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-[hsl(222,12%,45%)] text-sm">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1.5 hover:text-[hsl(222,22%,15%)] transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{q.likes}</span>
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-[hsl(222,22%,15%)] transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        <span>{q.comments}</span>
                      </button>
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
              
              <div className="text-center pt-4">
                <Button variant="outline" className="text-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)]/20 hover:bg-[hsl(221,91%,60%)]/5">
                  Load more questions
                </Button>
              </div>
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