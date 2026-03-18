import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Clock,
  ArrowRight,
  Coins,
  Zap,
  BarChart2,
  Building2,
  RefreshCw,
  Flame,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '../../../components/newDesign/ui/button';
import { Badge } from '../../../components/newDesign/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/newDesign/ui/select';
import { Navbar } from '../../../components/newDesign/home/navbar';
import { Footer } from '../../../components/newDesign/home/footer';

// ─── Types ─────────────────────────────────────────────
interface PracticeSet {
  id: number;
  title: string;
  role: string;
  focus: string;
  time: string;
  difficulty: 'Junior' | 'Intermediate' | 'Senior' | 'Staff';
  credits: number;
  practiced: number;
  popular?: boolean;
  category: string;
  company: string;
}

// ─── Data ──────────────────────────────────────────────
const PRACTICE_SETS: PracticeSet[] = [
  {
    id: 1,
    title: 'Product Sense Essentials',
    role: 'Product Manager',
    focus: 'Product',
    time: '30 min',
    difficulty: 'Intermediate',
    credits: 5,
    practiced: 539,
    popular: true,
    category: 'product',
    company: 'FAANG / Big Tech',
  },
  {
    id: 2,
    title: 'Behavioral STAR Method',
    role: 'General',
    focus: 'Behavioral',
    time: '45 min',
    difficulty: 'Junior',
    credits: 8,
    practiced: 198,
    popular: true,
    category: 'behavioral',
    company: 'Mid-size tech',
  },
  {
    id: 3,
    title: 'System Design Scalability',
    role: 'Software Engineer',
    focus: 'System',
    time: '48 min',
    difficulty: 'Senior',
    credits: 10,
    practiced: 340,
    category: 'system-design',
    company: 'FAANG / Big Tech',
  },
  {
    id: 4,
    title: 'React Frontend Core',
    role: 'Software Engineer',
    focus: 'Technical',
    time: '20 min',
    difficulty: 'Intermediate',
    credits: 5,
    practiced: 181,
    category: 'technical',
    company: 'Startups',
  },
  {
    id: 5,
    title: 'A/B Testing & Metrics',
    role: 'Data Scientist',
    focus: 'Analytical',
    time: '30 min',
    difficulty: 'Staff',
    credits: 10,
    practiced: 198,
    category: 'analytical',
    company: 'FAANG / Big Tech',
  },
  {
    id: 6,
    title: 'Leadership Principles',
    role: 'Engineering Manager',
    focus: 'Behavioral',
    time: '25 min',
    difficulty: 'Senior',
    credits: 5,
    practiced: 831,
    popular: true,
    category: 'behavioral',
    company: 'Mid-size tech',
  },
  {
    id: 7,
    title: 'PM Strategy & Vision',
    role: 'Product Manager',
    focus: 'Product',
    time: '35 min',
    difficulty: 'Senior',
    credits: 8,
    practiced: 412,
    category: 'product',
    company: 'FAANG / Big Tech',
  },
  {
    id: 8,
    title: 'API Design Patterns',
    role: 'Software Engineer',
    focus: 'Technical',
    time: '25 min',
    difficulty: 'Intermediate',
    credits: 5,
    practiced: 267,
    category: 'technical',
    company: 'Mid-size tech',
  },
];

const TRENDING_ROLES_POOL = [
  { rank: '#1', role: 'Product Manager', count: '1.2k' },
  { rank: '#2', role: 'Frontend Engineer', count: '850' },
  { rank: '#3', role: 'Data Scientist', count: '620' },
  { rank: '#4', role: 'UX Designer', count: '580' },
  { rank: '#5', role: 'Backend Engineer', count: '540' },
  { rank: '#6', role: 'DevOps Engineer', count: '470' },
  { rank: '#7', role: 'Machine Learning Engineer', count: '430' },
  { rank: '#8', role: 'iOS Developer', count: '390' },
  { rank: '#9', role: 'Solutions Architect', count: '350' },
];

// ─── Helpers ───────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Product Manager': 'bg-blue-50 text-blue-700 border-blue-200/60',
  General: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Software Engineer': 'bg-slate-50 text-slate-700 border-slate-200',
  'Data Scientist': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Engineering Manager': 'bg-amber-50 text-amber-700 border-amber-200/60',
};

const TRENDING_CARD_STYLES = [
  {
    gradient: 'from-blue-500/[0.06] via-blue-400/[0.03] to-transparent',
    accent: 'text-blue-600',
    border: 'border-blue-200/40 hover:border-blue-300/60',
    rankBg: 'bg-blue-600',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
  },
  {
    gradient: 'from-violet-500/[0.06] via-violet-400/[0.03] to-transparent',
    accent: 'text-violet-600',
    border: 'border-violet-200/40 hover:border-violet-300/60',
    rankBg: 'bg-violet-600',
    btnClass: 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600',
  },
  {
    gradient: 'from-emerald-500/[0.06] via-emerald-400/[0.03] to-transparent',
    accent: 'text-emerald-600',
    border: 'border-emerald-200/40 hover:border-emerald-300/60',
    rankBg: 'bg-emerald-600',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600',
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Junior: 'text-emerald-600',
  Intermediate: 'text-blue-600',
  Senior: 'text-amber-600',
  Staff: 'text-rose-600',
};

const AVATAR_COLOR_SETS = [
  ['bg-rose-200 text-rose-700', 'bg-blue-200 text-blue-700', 'bg-amber-200 text-amber-700'],
  ['bg-purple-200 text-purple-700', 'bg-green-200 text-green-700', 'bg-pink-200 text-pink-700'],
  ['bg-cyan-200 text-cyan-700', 'bg-orange-200 text-orange-700', 'bg-indigo-200 text-indigo-700'],
];

const INITIALS = ['A', 'N', 'J', 'M', 'S', 'K', 'R', 'T'];


// ════════════════════════════════════════════════════════
// TRENDING CARD
// ════════════════════════════════════════════════════════
function TrendingCard({
  item,
  style,
  onStart,
}: {
  item: { rank: string; role: string; count: string };
  style: typeof TRENDING_CARD_STYLES[number];
  onStart: () => void;
}) {
  return (
    <div
      className={`relative flex-1 min-w-[260px] rounded-2xl border ${style.border} bg-gradient-to-br ${style.gradient} backdrop-blur-sm p-5 transition-all duration-200 hover:shadow-md hover:shadow-slate-900/[0.04]`}
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-[22px] font-bold text-blue-600">
          {item.rank}
        </span>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Users className="w-3 h-3" />
          <span>{item.count} practicing</span>
        </div>
      </div>

      {/* Role name */}
      <h3 className="text-[16px] font-bold text-slate-900 mb-4 leading-tight">
        {item.role}
      </h3>

      {/* Start button */}
      <Button
        size="sm"
        className={`w-full h-9 text-xs font-semibold rounded-lg transition-all ${style.btnClass} shadow-none`}
        onClick={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        Start Practice
      </Button>
    </div>
  );
}


// ════════════════════════════════════════════════════════
// PRACTICE SET CARD
// ════════════════════════════════════════════════════════
function PracticeSetCard({ set }: { set: PracticeSet }) {
  const colorSet = AVATAR_COLOR_SETS[set.id % AVATAR_COLOR_SETS.length];
  const visibleAvatars = 3;

  return (
    <Link
      to={`/session-confirm?session=${set.id}`}
      className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/[0.06] transition-all duration-250 overflow-hidden flex flex-col"
    >
      {/* Top: Role + Popular badge */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <Badge
            variant="outline"
            className={`font-medium text-xs rounded-full px-3 py-1 ${
              ROLE_COLORS[set.role] || 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {set.role}
          </Badge>
          {set.popular && (
            <Badge className="bg-blue-600 text-white hover:bg-blue-600 border-blue-600 shadow-none font-semibold text-[11px] px-2.5 py-0.5 shrink-0 rounded-full gap-1">
              <Sparkles className="w-3 h-3" />
              Popular
            </Badge>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-5 pt-3 pb-0 flex-1">
        <h3 className="text-[18px] font-bold text-[#0F172A] leading-snug group-hover:text-blue-600 transition-colors mb-4">
          {set.title}
        </h3>

        {/* Metadata chips row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Coins className="w-3.5 h-3.5 text-amber-500" style={{ strokeWidth: 1.5 }} />
            <span className="font-semibold text-slate-700">{set.credits} Credits</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Zap className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span>{set.focus}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span>{set.time}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span className={`font-medium ${DIFFICULTY_COLORS[set.difficulty] || 'text-slate-600'}`}>{set.difficulty}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-full px-2.5 py-1 border border-slate-100">
            <Building2 className="w-3.5 h-3.5 text-slate-400" style={{ strokeWidth: 1.5 }} />
            <span>{set.company}</span>
          </div>
        </div>
      </div>

      {/* Footer – Social proof */}
      <div className="px-5 py-4 mt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-1.5">
            {colorSet.slice(0, visibleAvatars).map((color, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-[10px] font-semibold border-[1.5px] border-white`}
              >
                {INITIALS[(set.id + i) % INITIALS.length]}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400">
            +{set.practiced.toLocaleString()} practiced
          </span>
        </div>
        <div className="w-7 h-7 rounded-full border border-transparent flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export function MockInterviewPage() {
  const navigate = useNavigate();

  // Role filter for practice sets
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Trending Today shuffle
  const [trendingGroupIndex, setTrendingGroupIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);

  const trendingGroups: typeof TRENDING_ROLES_POOL[] = [];
  for (let i = 0; i < TRENDING_ROLES_POOL.length; i += 3) {
    trendingGroups.push(TRENDING_ROLES_POOL.slice(i, i + 3));
  }
  const currentTrendingRoles = trendingGroups[trendingGroupIndex] || trendingGroups[0];

  const handleShuffleTrending = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setTrendingGroupIndex((prev) => (prev + 1) % trendingGroups.length);
      setIsShuffling(false);
    }, 300);
  };

  // ─── Filtered sets ─────────────────────────────
  const filteredSets = PRACTICE_SETS.filter((set) => {
    if (roleFilter !== 'all' && set.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        set.title.toLowerCase().includes(q) ||
        set.role.toLowerCase().includes(q) ||
        set.focus.toLowerCase().includes(q) ||
        set.company.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => (b.practiced || 0) - (a.practiced || 0));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 pt-[150px] pb-16">
          {/* ─── Page Header ─────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-[#0F172A] mb-2 font-bold text-[40px]">Trendings</h1>
            <p className="text-slate-500 max-w-lg">
              See what roles are trending today — updated daily.
            </p>
          </div>

          {/* ─── Trending Hero Strip ────────────────── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Trending Today
                </div>
                <span className="text-[11px] text-slate-400 bg-slate-50 rounded-full px-2 py-0.5">Updated daily</span>
              </div>
              <button
                onClick={handleShuffleTrending}
                disabled={isShuffling}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
                Shuffle
              </button>
            </div>

            <div
              className="flex gap-4 overflow-x-auto transition-opacity duration-300"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', opacity: isShuffling ? 0.3 : 1 }}
            >
              {currentTrendingRoles.map((item, idx) => (
                <TrendingCard
                  key={item.rank}
                  item={item}
                  style={{
                    gradient: 'from-blue-50/60 to-white',
                    accent: 'text-slate-900',
                    border: 'border-blue-100/80 hover:border-blue-200/90 shadow-sm shadow-blue-900/[0.03]',
                    rankBg: idx === 0 ? 'bg-blue-600' : 'bg-slate-100 !text-slate-500',
                    btnClass: 'bg-white hover:bg-blue-50/60 !text-blue-700 border border-blue-200/70',
                  }}
                  onStart={() => navigate('/ai-mock')}
                />
              ))}
            </div>
          </div>

          {/* ─── Curated Practice Sets ────────────────  */}
          <div className="mb-12">
            {/* Section header + filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-[#0F172A] font-bold text-[24px]">Curated Practice Sets</h2>
              <div className="flex items-center gap-3">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all placeholder:text-slate-400"
                  />
                </div>
                {/* Role filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200 w-[140px] rounded-lg">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(222,22%,15%)] border-[hsl(222,22%,25%)] text-white">
                    <SelectItem value="all" className="text-white focus:bg-[hsl(160,70%,50%)] focus:text-white data-[state=checked]:bg-[hsl(160,70%,50%)] data-[state=checked]:text-white">All Roles</SelectItem>
                    <SelectItem value="Product Manager" className="text-white focus:bg-[hsl(160,70%,50%)] focus:text-white data-[state=checked]:bg-[hsl(160,70%,50%)] data-[state=checked]:text-white">Product Manager</SelectItem>
                    <SelectItem value="Software Engineer" className="text-white focus:bg-[hsl(160,70%,50%)] focus:text-white data-[state=checked]:bg-[hsl(160,70%,50%)] data-[state=checked]:text-white">Software Engineer</SelectItem>
                    <SelectItem value="Data Scientist" className="text-white focus:bg-[hsl(160,70%,50%)] focus:text-white data-[state=checked]:bg-[hsl(160,70%,50%)] data-[state=checked]:text-white">Data Scientist</SelectItem>
                    <SelectItem value="Engineering Manager" className="text-white focus:bg-[hsl(160,70%,50%)] focus:text-white data-[state=checked]:bg-[hsl(160,70%,50%)] data-[state=checked]:text-white">Eng. Manager</SelectItem>
                    <SelectItem value="General" className="text-white focus:bg-[hsl(160,70%,50%)] focus:text-white data-[state=checked]:bg-[hsl(160,70%,50%)] data-[state=checked]:text-white">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cards Grid – 24px gap */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSets.map((set) => (
                <PracticeSetCard key={set.id} set={set} />
              ))}
            </div>

            {/* Empty state */}
            {filteredSets.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-slate-500 mb-3">No practice sets match your search.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRoleFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}