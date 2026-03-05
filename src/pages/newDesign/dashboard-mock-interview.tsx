import { useState } from 'react';
import { Link } from 'react-router';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '@/components/newDesign/ui/button';
import { Badge } from '@/components/newDesign/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/newDesign/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/newDesign/ui/sheet";
import { 
  Mic, 
  Video, 
  Clock, 
  Play,
  SlidersHorizontal,
  X,
  Target,
  TrendingUp,
  Sparkles,
  Building2,
  BarChart3
} from 'lucide-react';
import { Separator } from '@/components/newDesign/ui/separator';
import { Checkbox } from '@/components/newDesign/ui/checkbox';
import { Label } from '@/components/newDesign/ui/label';

// Types
type Domain = 'all' | 'behavioral' | 'product' | 'system' | 'resume';
type Focus = 'stakeholder' | 'metrics' | 'tradeoffs' | 'leadership' | 'communication' | 'technical';
type Mode = 'text' | 'voice' | 'video';
type Difficulty = 'junior' | 'intermediate' | 'senior' | 'staff';
type SortBy = 'recommended' | 'relevant' | 'recent' | 'difficulty';

interface FilterState {
  domain: Domain;
  focuses: Focus[];
  difficulty: Difficulty[];
  time: string[];
  modes: Mode[];
  companies: string[];
  level: string[];
}

interface SessionData {
  id: number;
  title: string;
  domain: string;
  focus: string;
  time: string;
  difficulty: 'Junior' | 'Intermediate' | 'Senior' | 'Staff';
  mode: 'Text' | 'Voice' | 'Video';
  description: string;
  recommended?: boolean;
}

// Mock Data
const SESSIONS: SessionData[] = [
  {
    id: 1,
    title: "Leadership & Conflict Resolution",
    domain: "Behavioral",
    focus: "Leadership",
    time: "20 min",
    difficulty: "Intermediate",
    mode: "Voice",
    description: "Practice handling team conflicts and demonstrating leadership principles",
    recommended: true
  },
  {
    id: 2,
    title: "Product Metrics & Trade-offs",
    domain: "Product Sense",
    focus: "Metrics",
    time: "30 min",
    difficulty: "Senior",
    mode: "Video",
    description: "Analyze product decisions through data-driven frameworks",
    recommended: true
  },
  {
    id: 3,
    title: "Stakeholder Communication",
    domain: "Behavioral",
    focus: "Communication",
    time: "15 min",
    difficulty: "Junior",
    mode: "Text",
    description: "Effectively communicate technical concepts to non-technical stakeholders"
  },
  {
    id: 4,
    title: "System Design: Rate Limiter",
    domain: "System Design",
    focus: "Technical",
    time: "45 min",
    difficulty: "Staff",
    mode: "Voice",
    description: "Design a distributed rate limiting system with trade-off analysis"
  },
  {
    id: 5,
    title: "Resume Deep Dive: Projects",
    domain: "Resume",
    focus: "Technical",
    time: "25 min",
    difficulty: "Intermediate",
    mode: "Video",
    description: "Answer technical questions about your past projects and achievements"
  },
  {
    id: 6,
    title: "Product Strategy & Vision",
    domain: "Product Sense",
    focus: "Tradeoffs",
    time: "35 min",
    difficulty: "Staff",
    mode: "Video",
    description: "Develop product strategy considering market dynamics and resource constraints",
    recommended: true
  },
  {
    id: 7,
    title: "STAR Method Practice",
    domain: "Behavioral",
    focus: "Communication",
    time: "20 min",
    difficulty: "Junior",
    mode: "Text",
    description: "Master the STAR framework for behavioral interview responses"
  },
  {
    id: 8,
    title: "Data-Driven Decision Making",
    domain: "Product Sense",
    focus: "Metrics",
    time: "30 min",
    difficulty: "Intermediate",
    mode: "Voice",
    description: "Learn to make product decisions backed by data and analytics"
  }
];

const FOCUS_OPTIONS = [
  { value: 'stakeholder', label: 'Stakeholder Management' },
  { value: 'metrics', label: 'Metrics & Analytics' },
  { value: 'tradeoffs', label: 'Trade-offs' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'communication', label: 'Communication' },
  { value: 'technical', label: 'Technical Depth' },
];

export function DashboardMockInterviewPage() {
  const [filters, setFilters] = useState<FilterState>({
    domain: 'all',
    focuses: [],
    difficulty: [],
    time: [],
    modes: [],
    companies: [],
    level: []
  });
  
  const [sortBy, setSortBy] = useState<SortBy>('recommended');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get user data
  const userData = JSON.parse(localStorage.getItem('screnaUserData') || '{}');
  const targetRole = userData?.role || 'Product Manager';
  const experienceLevel = userData?.experienceLevel || 'Senior';

  // Handle filter changes
  const updateDomain = (domain: Domain) => {
    setFilters(prev => ({ ...prev, domain }));
  };

  const toggleFocus = (focus: Focus) => {
    setFilters(prev => ({
      ...prev,
      focuses: prev.focuses.includes(focus)
        ? prev.focuses.filter(f => f !== focus)
        : [...prev.focuses, focus]
    }));
  };

  const toggleAdvancedFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[category] as string[];
      return {
        ...prev,
        [category]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      domain: 'all',
      focuses: [],
      difficulty: [],
      time: [],
      modes: [],
      companies: [],
      level: []
    });
    setSortBy('recommended');
  };

  const hasActiveFilters = 
    filters.domain !== 'all' ||
    filters.focuses.length > 0 ||
    filters.difficulty.length > 0 ||
    filters.time.length > 0 ||
    filters.modes.length > 0 ||
    filters.companies.length > 0 ||
    filters.level.length > 0;

  // Filter sessions
  const filteredSessions = SESSIONS.filter(session => {
    if (filters.domain !== 'all' && session.domain.toLowerCase() !== filters.domain) {
      return false;
    }
    if (filters.difficulty.length > 0 && !filters.difficulty.includes(session.difficulty.toLowerCase() as Difficulty)) {
      return false;
    }
    if (filters.modes.length > 0 && !filters.modes.includes(session.mode.toLowerCase() as Mode)) {
      return false;
    }
    return true;
  });

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty.toLowerCase()) {
      case 'junior': return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'senior': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'staff': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Get mode icon
  const getModeIcon = (mode: string) => {
    switch(mode.toLowerCase()) {
      case 'voice': return <Mic className="w-3 h-3" />;
      case 'video': return <Video className="w-3 h-3" />;
      default: return <BarChart3 className="w-3 h-3" />;
    }
  };

  return (
    <DashboardLayout headerTitle="Mock Interview Sessions">
      <div className="space-y-6">
        
        {/* Personalized Context */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                Personalized recommendations based on your resume, profile, and target role.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 font-medium">
                  <Target className="w-3 h-3 mr-1" />
                  For: {targetRole}
                </Badge>
                <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 font-medium">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {experienceLevel} Level
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Domain Dropdown */}
            <Select value={filters.domain} onValueChange={(value) => updateDomain(value as Domain)}>
              <SelectTrigger className="w-[180px] bg-white border-slate-200">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="product">Product Sense</SelectItem>
                <SelectItem value="system">System Design</SelectItem>
                <SelectItem value="resume">Resume Deep Dive</SelectItem>
              </SelectContent>
            </Select>

            {/* Focus Multi-Select Dropdown */}
            <Select>
              <SelectTrigger className="w-[200px] bg-white border-slate-200">
                <SelectValue placeholder={
                  filters.focuses.length === 0 
                    ? "Focus Area" 
                    : `${filters.focuses.length} selected`
                } />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 space-y-2">
                  {FOCUS_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <Checkbox
                        id={option.value}
                        checked={filters.focuses.includes(option.value as Focus)}
                        onCheckedChange={() => toggleFocus(option.value as Focus)}
                      />
                      <label
                        htmlFor={option.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </SelectContent>
            </Select>

            {/* More Filters Sheet */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="bg-white border-slate-200 gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  More filters
                  {(filters.difficulty.length + filters.time.length + filters.modes.length + filters.companies.length + filters.level.length) > 0 && (
                    <Badge className="ml-1 bg-blue-600 text-white h-5 px-1.5 text-xs">
                      {filters.difficulty.length + filters.time.length + filters.modes.length + filters.companies.length + filters.level.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Advanced Filters</SheetTitle>
                  <SheetDescription>
                    Fine-tune your session recommendations
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  
                  {/* Difficulty */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">Difficulty</Label>
                    <div className="space-y-2">
                      {['junior', 'intermediate', 'senior', 'staff'].map(diff => (
                        <div key={diff} className="flex items-center space-x-2">
                          <Checkbox
                            id={`diff-${diff}`}
                            checked={filters.difficulty.includes(diff as Difficulty)}
                            onCheckedChange={() => toggleAdvancedFilter('difficulty', diff)}
                          />
                          <label htmlFor={`diff-${diff}`} className="text-sm capitalize cursor-pointer">
                            {diff}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Time Duration */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">Time Duration</Label>
                    <div className="space-y-2">
                      {['15 min', '20 min', '30 min', '45 min'].map(time => (
                        <div key={time} className="flex items-center space-x-2">
                          <Checkbox
                            id={`time-${time}`}
                            checked={filters.time.includes(time)}
                            onCheckedChange={() => toggleAdvancedFilter('time', time)}
                          />
                          <label htmlFor={`time-${time}`} className="text-sm cursor-pointer">
                            {time}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Mode */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">Interview Mode</Label>
                    <div className="space-y-2">
                      {['text', 'voice', 'video'].map(mode => (
                        <div key={mode} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mode-${mode}`}
                            checked={filters.modes.includes(mode as Mode)}
                            onCheckedChange={() => toggleAdvancedFilter('modes', mode)}
                          />
                          <label htmlFor={`mode-${mode}`} className="text-sm capitalize cursor-pointer">
                            {mode} Mode
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Company Style */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">Company Style</Label>
                    <div className="space-y-2">
                      {['FAANG', 'Startup', 'Mid-size', 'Enterprise'].map(company => (
                        <div key={company} className="flex items-center space-x-2">
                          <Checkbox
                            id={`company-${company}`}
                            checked={filters.companies.includes(company)}
                            onCheckedChange={() => toggleAdvancedFilter('companies', company)}
                          />
                          <label htmlFor={`company-${company}`} className="text-sm cursor-pointer">
                            {company}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Experience Level */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">Experience Level</Label>
                    <div className="space-y-2">
                      {['Entry', 'Mid', 'Senior', 'Staff+'].map(level => (
                        <div key={level} className="flex items-center space-x-2">
                          <Checkbox
                            id={`level-${level}`}
                            checked={filters.level.includes(level)}
                            onCheckedChange={() => toggleAdvancedFilter('level', level)}
                          />
                          <label htmlFor={`level-${level}`} className="text-sm cursor-pointer">
                            {level}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="mt-6 flex gap-3">
                  <SheetClose asChild>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      Apply Filters
                    </Button>
                  </SheetClose>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilters({
                        domain: filters.domain,
                        focuses: filters.focuses,
                        difficulty: [],
                        time: [],
                        modes: [],
                        companies: [],
                        level: []
                      });
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-[180px] bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="relevant">Most Relevant</SelectItem>
                <SelectItem value="recent">Recently Practiced</SelectItem>
                <SelectItem value="difficulty">By Difficulty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Active filters:</span>
              
              {filters.domain !== 'all' && (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-200">
                  Domain: {filters.domain}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-blue-900" 
                    onClick={() => updateDomain('all')}
                  />
                </Badge>
              )}
              
              {filters.focuses.map(focus => (
                <Badge key={focus} variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-200">
                  {FOCUS_OPTIONS.find(f => f.value === focus)?.label}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-blue-900" 
                    onClick={() => toggleFocus(focus)}
                  />
                </Badge>
              ))}

              {filters.difficulty.map(diff => (
                <Badge key={diff} variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-200 capitalize">
                  {diff}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-blue-900" 
                    onClick={() => toggleAdvancedFilter('difficulty', diff)}
                  />
                </Badge>
              ))}

              {filters.modes.map(mode => (
                <Badge key={mode} variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-200 capitalize">
                  {mode} mode
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-blue-900" 
                    onClick={() => toggleAdvancedFilter('modes', mode)}
                  />
                </Badge>
              ))}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={clearAllFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Session Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map(session => (
            <div 
              key={session.id} 
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-5 pb-4 flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                    {session.title}
                  </h3>
                  {session.recommended && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 shadow-none font-medium text-[10px] px-2 py-0.5 shrink-0">
                      Recommended
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {session.description}
                </p>

                {/* Meta Pills */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal text-xs">
                    {session.domain}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal text-xs">
                    {session.focus}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.time}
                  </Badge>
                  <Badge variant="outline" className={`font-medium text-xs border ${getDifficultyColor(session.difficulty)}`}>
                    {session.difficulty}
                  </Badge>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  {getModeIcon(session.mode)}
                  <span>{session.mode} Mode</span>
                </div>
                <Button 
                  size="sm" 
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-8 px-4 text-xs font-medium gap-1.5"
                >
                  <Play className="w-3 h-3" />
                  Start Session
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredSessions.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <SlidersHorizontal className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No sessions found</h3>
            <p className="text-sm text-slate-600 mb-4">
              Try adjusting your filters to see more sessions
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
