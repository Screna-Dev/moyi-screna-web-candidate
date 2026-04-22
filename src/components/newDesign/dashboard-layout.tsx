import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Navbar } from './home/navbar';
import {
  LayoutDashboard,
  Settings,
  Menu,
  Briefcase,
  Gift,
  ArrowLeft,
  Coins,
  Home,
  LogOut,
  MessageSquare,
  ChevronDown,
  Bot,
  FileText,
  Target,
  History,
  Users,
  Clock,
  Calendar,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
  Bell,
  TrendingUp,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Pencil,
  UploadCloud,
  Eye,
  Plus,
  ShieldCheck,
  User,
  BadgeCheck,
  Download,
  Building2,
  Lock,
  Star,
} from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import logoImg from '../../assets/Navbar.png';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';

function LearningActivityChart() {
  return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">Learning Activity Chart — coming soon</div>;
}
function FreshFromCommunity() {
  return <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">Community Feed — coming soon</div>;
}
function JobApplyTab() {
  return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">Job Apply — coming soon</div>;
}

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
};

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: History, label: 'Interview History', path: '/history' },
  { icon: FileText, label: 'My Contributions', path: '/contributions' },
];

const sidebarAccountLinks = [
  { icon: Gift, label: 'Refer & Earn', path: '/refer' },
  { icon: Settings, label: 'Settings & Payment', path: '/settings' },
];

function SidebarContent({ currentPath }: { currentPath: string }) {
  const { planData } = useUserPlan();
  const creditBalance = planData.permanentCreditBalance;
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Nav links — Career group */}
      <nav className="px-3 pt-4 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Career</p>
        <div className="space-y-0.5">
          {sidebarLinks.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path === '/marketplace' && currentPath === '/marketplace');
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-border" />

      {/* Nav links — Activity & Account group */}
      <nav className="px-3 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-2">Activity & Account</p>
        <div className="space-y-0.5">
          {sidebarAccountLinks.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path === '/settings' && currentPath.startsWith('/settings'));
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom: Credits / Upgrade */}
      <div className="px-3 pb-5 mt-auto shrink-0">
        <div className="rounded-md bg-primary p-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4" />
            <span className="text-sm font-medium">{creditBalance <= 5 ? 'Low on Credits' : `${creditBalance} credit${creditBalance !== 1 ? 's' : ''}`}</span>
          </div>
          <p className="text-xs text-primary-foreground/80 mb-3 leading-relaxed">
            {creditBalance <= 5
              ? 'Top up credits to keep practicing mock interviews'
              : `You have ${creditBalance} credit${creditBalance !== 1 ? 's' : ''} remaining`}
          </p>
          <Link to="/pricing">
            <button className="w-full py-1.5 bg-background text-primary rounded-md text-xs font-medium hover:bg-background/90 transition-colors">
              Buy Credits
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// GLOBAL TOP HEADER
// ════════════════════════════════════════════════════════
function GlobalTopHeader({
  firstName,
  userData,
  currentPath,
}: {
  firstName: string;
  userData: UserData | null;
  currentPath: string;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { planData } = useUserPlan();
  const creditBalance = planData.permanentCreditBalance;
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : userData?.firstName
    ? userData.firstName[0].toUpperCase()
    : 'U';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('screnaIsLoggedIn');
    window.dispatchEvent(new Event('screna-auth-change'));
    setAvatarOpen(false);
    logout();
    navigate('/');
  };

  const isLinkActive = (path: string) => {
    if (path === '/job-board') return currentPath.startsWith('/job-board') || currentPath === '/jobs';
    if (path === '/mock-interview') return currentPath.includes('mock-interview') || currentPath.includes('ai-mock') || currentPath.includes('personalized-practice');
    if (path === '/question-bank') return currentPath.startsWith('/question-bank') || currentPath.startsWith('/interview-insights');
    return currentPath === path;
  };

  return (
    <header className="sticky top-[var(--topbar-h)] z-50 bg-background border-b border-border h-14 flex items-center px-4 sm:px-6">
      {/* Left: Logo + Home */}
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logoImg} alt="Screna" className="h-6 w-auto" />
        </Link>
        <div className="w-px h-5 bg-border" />
        <Link
          to="/"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Back to homepage"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-xs hidden sm:inline">Home</span>
        </Link>
      </div>

      {/* Center: Global Nav Links */}
      <nav className="hidden md:flex items-center gap-5 mx-auto">
        {/* Jobs dropdown */}
        <div className="relative group">
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-card border border-border rounded-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1">
            <Link
              to="/job-board"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Find Jobs</div>
                <div className="text-xs text-muted-foreground">Browse open positions</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Interview dropdown */}
        <div className="relative group">
          <button
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              isLinkActive('/mock-interview')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Interview
            <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-80 group-hover:translate-y-px transition-all duration-200" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-card border border-border rounded-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1">
            <Link
              to="/mock-interview"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Trending Mocks</div>
                <div className="text-xs text-muted-foreground">Trending mock interviews</div>
              </div>
            </Link>
            <Link
              to="/personalized-practice"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-secondary text-muted-foreground flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Personalized Practice</div>
                <div className="text-xs text-muted-foreground">AI-tailored mock sessions</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Community dropdown */}
        <div className="relative group">
          <button
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              isLinkActive('/question-bank')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Community
            <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-80 group-hover:translate-y-px transition-all duration-200" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-card border border-border rounded-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1">
            <Link
              to="/interview-insights"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Interview Insights</div>
                <div className="text-xs text-muted-foreground">Real interview experiences</div>
              </div>
            </Link>
          </div>
        </div>

        <Link
          to="/faq"
          className={`text-sm font-medium transition-colors ${
            isLinkActive('/faq') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          FAQ
        </Link>

        <Link
          to="/pricing"
          className={`text-sm font-medium transition-colors ${
            isLinkActive('/pricing') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pricing
        </Link>

        {/* Service dropdown */}
        <div className="relative group">
          <button
            className={`flex items-center gap-1 text-sm font-medium transition-colors ${
              currentPath === '/marketplace' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Service
            <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-80 group-hover:translate-y-px transition-all duration-200" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-60 bg-card border border-border rounded-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1">
            <Link
              to="/marketplace"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">Mentorship</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">Pro</span>
                </div>
                <div className="text-xs text-muted-foreground">Book 1:1 sessions with mentors</div>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Right: Avatar */}
      <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
        <Link to="/pricing" />

        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all bg-primary text-primary-foreground hover:opacity-90"
          >
            {initials}
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-md overflow-hidden z-50 p-1 origin-top-right"
              >
                {/* User Info */}
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userData?.firstName
                      ? `${userData.firstName} ${userData.lastName || ''}`
                      : 'My Account'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Coins className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground">{`${creditBalance} credit${creditBalance !== 1 ? 's' : ''} remaining`}</span>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                  Dashboard
                </Link>
                <Link
                  to="/messages"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Messages
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Settings
                </Link>

                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════
// CAREER COMMAND CENTER (module-level — stable reference)
// ════════════════════════════════════════════════════════
function CareerCommandCenter({ userData }: { userData: UserData | null }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('learning');
  // mentorshipState: 'hasSession' | 'noSession' | 'nonMember'
  const [mentorshipState] = useState<'hasSession' | 'noSession' | 'nonMember'>('hasSession');

  const pastSessions = [
    { id: 1, initials: 'RK', name: 'Riya Kapoor', type: 'Career Strategy', date: 'Apr 8', reviewed: true, rating: 5 },
    { id: 2, initials: 'TN', name: 'Tom Nakamura', type: 'Resume Review', date: 'Mar 29', reviewed: false, rating: 0 },
    { id: 3, initials: 'AL', name: 'Amy Liu', type: 'Mock Interview', date: 'Mar 20', reviewed: true, rating: 4 },
  ];

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      {/* ── Tab Navigation (underline style) ── */}
      <div className="flex items-center border-b border-border mb-8">
        {['Learning', 'Job Apply', 'Profile'].map((tab) => {
          const tabId = tab.toLowerCase().replace(' ', '-');
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`pb-3 px-1 mr-6 text-sm font-bold transition-colors relative ${ isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground' }`}
            >
              {tab}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── LEARNING TAB ── */}
      {activeTab === 'learning' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* ── Learning Activity ── */}
            <LearningActivityChart />

            {/* Recent Mock Summary */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h3 className="text-foreground">Recent Mock Summary</h3>
                  <span className="text-sm text-muted-foreground hidden sm:inline">Oct 24, 2023</span>
                </div>
                <span className="px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-md text-xs font-medium">
                  85/100 Score
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h4 className="text-foreground font-medium">Product Manager — Behavioral</h4>
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium self-start sm:self-auto">
                      Senior Level
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">
                    Great structured responses. You effectively used the STAR method for behavioral questions. Consider being more concise when discussing technical tradeoffs to keep the interviewer engaged.
                  </p>

                  {/* Feedback tags */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-md text-xs font-medium">
                      + Structured Answers
                    </span>
                    <span className="px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-md text-xs font-medium">
                      + Product Sense
                    </span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                      − Conciseness
                    </span>
                  </div>

                  <button className="border border-border bg-background text-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    View Full Report
                  </button>
                </div>
              </div>
            </div>

            {/* Focus on These Next */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-5">
                <h3 className="text-foreground">Focus on these next</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { title: 'Technical Depth', desc: 'Focus on system design tradeoffs for high-traffic scenarios.', cta: 'Practice System Design' },
                  { title: 'Conciseness', desc: 'Keep behavioral answers under the 2-minute mark for better impact.', cta: 'Practice Behavioral' }
                ].map((rec, i) => (
                  <div key={i} className="flex flex-col p-4 rounded-md bg-secondary border border-border">
                    <h4 className="text-sm font-medium text-foreground mb-2">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{rec.desc}</p>
                    <button className="text-primary text-sm font-medium flex items-center gap-1 self-start hover:opacity-80 transition-opacity">
                      {rec.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Fresh from Community */}
            <FreshFromCommunity />

          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-5">

            {/* Start Practice — Primary CTA card */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-foreground mb-1">Ready to practice?</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Start a new AI mock session tailored exactly to your current career stage.
              </p>
              {/* Primary CTA — one per page */}
              <button className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                Start Practice Session
              </button>
            </div>

            {/* Mentorship Module */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Module header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <span className="text-sm font-medium text-foreground">Mentorship</span>
                <button className="text-xs text-primary hover:opacity-80 transition-opacity">Browse mentors ↗</button>
              </div>

              {mentorshipState === 'nonMember' ? (
                /* State 3: Non-member locked state */
                <div className="mx-4 mb-4 bg-secondary border border-dashed border-border rounded-lg p-6 flex flex-col items-center text-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Unlock 1:1 mentorship</span>
                  <p className="text-xs text-muted-foreground text-center">Get matched with industry experts for personalized 1:1 career coaching sessions tailored to your goals.</p>
                  <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity">
                    Upgrade to unlock
                  </button>
                </div>
              ) : (
                <div className="px-4 pb-4 flex flex-col gap-3">
                  {mentorshipState === 'hasSession' ? (
                    /* State 1: Has upcoming session card */
                    <div className="border border-border rounded-lg overflow-hidden">
                      {/* Card header */}
                      <div className="bg-primary/10 flex items-center justify-between px-3 py-2">
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-md">Upcoming session</span>
                        <span className="text-xs text-primary">Mon Apr 14, 2:00 PM</span>
                      </div>
                      {/* Card body */}
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-[38px] h-[38px] rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                            SJ
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">Sarah Jenkins</div>
                            <div className="text-xs text-muted-foreground">Senior PM · TechCorp</div>
                          </div>
                        </div>
                        {/* Session goal block */}
                        <div className="bg-secondary rounded-md p-3 mb-3">
                          <div className="text-xs text-muted-foreground mb-1">Session goal</div>
                          <div className="text-sm font-medium text-foreground mb-2">Mock Interview: Product Strategy</div>
                          <div className="text-xs text-muted-foreground mb-1">Mentor note</div>
                          <div className="text-xs text-secondary-foreground">"Please bring 2 product ideas you'd like to discuss."</div>
                        </div>
                        {/* Countdown row */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-xs text-primary">In 14 hours — get prepared</span>
                        </div>
                        {/* Primary CTA */}
                        <button className="w-full bg-primary text-primary-foreground rounded-md py-2 text-xs font-medium hover:opacity-90 transition-opacity">
                          Join session
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* State 2: No upcoming session empty state */
                    <div className="border border-dashed border-border rounded-lg p-5 flex flex-col items-center text-center gap-3">
                      <p className="text-sm text-muted-foreground">No upcoming sessions. Ready for your next 1:1?</p>
                      <button className="border border-primary text-primary bg-background rounded-md px-3 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors">
                        Browse mentors ↗
                      </button>
                    </div>
                  )}

                  {/* Past sessions list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Past sessions</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        {pastSessions.length} <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {pastSessions.map((session) => (
                        <div
                          key={session.id}
                          className="bg-card border border-border rounded-md p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => navigate(`/session-detail/${session.id}`)}
                        >
                          <div className="w-[30px] h-[30px] rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                            {session.initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{session.name}</div>
                            <div className="text-xs text-muted-foreground">{session.type} · {session.date}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {session.reviewed ? (
                              <>
                                <span className="px-1.5 py-0.5 bg-accent/15 text-accent-foreground text-xs font-medium rounded-sm">Reviewed</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-2.5 h-2.5 ${s <= session.rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                                    />
                                  ))}
                                </div>
                              </>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-medium rounded-sm">Review pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full text-center text-xs text-muted-foreground mt-2 hover:text-primary transition-colors">
                      Show all sessions ↗
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── JOB APPLY TAB ── */}
      {activeTab === 'job-apply' && <JobApplyTab />}

      {false && (() => {
        const applications = [
          { id: 1, company: 'Stripe', initials: 'S', logoColor: 'bg-muted text-foreground', role: 'Product Manager', status: 'interview', statusLabel: 'Interview Scheduled', daysAgo: 3 },
          { id: 2, company: 'Figma', initials: 'F', logoColor: 'bg-muted text-foreground', role: 'Senior PM — Design', status: 'pending', statusLabel: 'Awaiting Response', daysAgo: 7 },
          { id: 3, company: 'Notion', initials: 'N', logoColor: 'bg-muted text-foreground', role: 'Product Manager', status: 'interview', statusLabel: 'Interview Scheduled', daysAgo: 5 },
          { id: 4, company: 'Linear', initials: 'L', logoColor: 'bg-muted text-foreground', role: 'PM — Growth', status: 'pending', statusLabel: 'Awaiting Response', daysAgo: 10 },
          { id: 5, company: 'Vercel', initials: 'V', logoColor: 'bg-muted text-foreground', role: 'Product Lead', status: 'noresponse', statusLabel: 'No Response', daysAgo: 14 },
          { id: 6, company: 'Airbnb', initials: 'A', logoColor: 'bg-muted text-foreground', role: 'Product Manager', status: 'rejected', statusLabel: 'Rejected', daysAgo: 12 },
          { id: 7, company: 'Spotify', initials: 'Sp', logoColor: 'bg-muted text-foreground', role: 'Associate PM', status: 'rejected', statusLabel: 'Rejected', daysAgo: 18 },
          { id: 8, company: 'Rippling', initials: 'R', logoColor: 'bg-muted text-foreground', role: 'Product Manager', status: 'pending', statusLabel: 'Awaiting Response', daysAgo: 4 },
        ];
        const filterMap: Record<string, string[]> = {
          all: ['interview', 'pending', 'noresponse', 'rejected'],
          interview: ['interview'],
          pending: ['pending', 'noresponse'],
          rejected: ['rejected'],
        };
        const filtered = applications.filter(a => (filterMap[activeJobFilter] ?? []).includes(a.status));

        // Token-based status badge styles (rounded-md per spec)
        const statusStyle: Record<string, string> = {
          interview: 'bg-accent/20 text-accent-foreground',
          pending:   'bg-muted text-muted-foreground',
          noresponse:'bg-muted text-muted-foreground',
          rejected:  'bg-destructive/10 text-destructive',
        };

        return (
          <div className="flex flex-col gap-6">

            {/* ── Stat Blocks (bg-muted per spec) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Applied',     value: 28, trend: '+5 this week' },
                { label: 'In Progress', value: 12, trend: '3 need action' },
                { label: 'Interviews',  value: 4,  trend: 'Next: Tomorrow' },
                { label: 'Rejected',    value: 8,  trend: '2 this week' },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted rounded-md p-4">
                  <div className="text-2xl font-medium text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.trend}</div>
                </div>
              ))}
            </div>

            {/* ── Main 2-col ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left: Application Pipeline */}
              <div className="lg:col-span-7 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-foreground">Application Pipeline</h3>
                    <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                      {applications.length}
                    </span>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm">
                    Sort
                  </button>
                </div>

                {/* Filters — underline style */}
                <div className="flex items-center gap-0 px-5 py-0 border-b border-border bg-background">
                  {[
                    { key: 'all',       label: 'All',       count: applications.length },
                    { key: 'interview', label: 'Interview', count: applications.filter(a => a.status === 'interview').length },
                    { key: 'pending',   label: 'Pending',   count: applications.filter(a => ['pending','noresponse'].includes(a.status)).length },
                    { key: 'rejected',  label: 'Rejected',  count: applications.filter(a => a.status === 'rejected').length },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setActiveJobFilter(f.key)}
                      className={`py-3 px-3 mr-2 text-sm font-medium transition-colors relative border-b-2 ${
                        activeJobFilter === f.key
                          ? 'text-foreground border-primary'
                          : 'text-muted-foreground border-transparent hover:text-foreground'
                      }`}
                    >
                      {f.label}
                      <span className="ml-1.5 text-xs text-muted-foreground">({f.count})</span>
                    </button>
                  ))}
                </div>

                {/* Application Rows — table style per spec */}
                <div className="flex flex-col flex-1">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <p className="text-sm">No applications in this category</p>
                    </div>
                  ) : filtered.map((app) => (
                    <div key={app.id} className="flex items-center gap-3 px-5 border-b border-border last:border-0 py-3 hover:bg-muted/50 cursor-pointer transition-colors group">
                      <div className={`w-9 h-9 rounded-md ${app.logoColor} flex items-center justify-center font-medium text-sm shrink-0 border border-border`}>
                        {app.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{app.company}</div>
                        <div className="text-sm text-muted-foreground truncate">{app.role}</div>
                      </div>
                      <span className={`text-sm text-muted-foreground shrink-0 hidden sm:inline`}>{app.daysAgo}d ago</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${statusStyle[app.status] ?? ''}`}>
                        {app.statusLabel}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border bg-background flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Showing {filtered.length} of {applications.length}</span>
                  <button className="text-primary text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity">
                    View all
                  </button>
                </div>
              </div>

              {/* Right: Actions Needed */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-foreground">Actions Needed</h3>
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-xs font-medium">5 tasks</span>
                </div>

                {[
                  {
                    title: 'Interview at Stripe',
                    desc: 'Tomorrow at 2:00 PM — Product Manager Role',
                    cta: 'Prepare Now',
                    tag: 'Tomorrow',
                  },
                  {
                    title: 'No response — Vercel',
                    desc: '14 days since application. Time to follow up.',
                    cta: 'Send Follow-up',
                    tag: '14d no reply',
                  },
                  {
                    title: 'Applied to 5 new roles',
                    desc: 'New applications sent this week based on your profile.',
                    cta: 'Review Applications',
                    tag: 'New this week',
                  },
                  {
                    title: 'Review job preferences',
                    desc: "Your target roles haven't been updated in 3 weeks.",
                    cta: 'Update Preferences',
                    tag: '3w old',
                  },
                  {
                    title: 'Approve 3 shortlisted jobs',
                    desc: 'AI curated 3 high-match roles awaiting your approval.',
                    cta: 'Review Shortlist',
                    tag: 'AI Curated',
                  },
                ].map((action, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground truncate">{action.title}</span>
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium shrink-0">{action.tag}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{action.desc}</p>
                        <button className="border border-border bg-background text-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors">
                          {action.cta}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Outreach & Networking ── */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                <h3 className="text-foreground">Outreach & Networking</h3>
                <button className="text-primary text-sm font-medium hover:opacity-80 transition-opacity">
                  View all
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
                {[
                  { label: 'Outreach Sent',      value: 47, sub: 'To recruiters & hiring mgrs' },
                  { label: 'Recruiter Replies',  value: 8,  sub: '17% reply rate' },
                  { label: 'Follow-up Due',      value: 3,  sub: 'Action required today' },
                  { label: 'Referrals Available',value: 2,  sub: 'From your network' },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                    <div>
                      <div className="text-2xl font-medium text-foreground">{metric.value}</div>
                      <div className="text-sm font-medium text-foreground mt-0.5">{metric.label}</div>
                      <div className="text-sm text-muted-foreground">{metric.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (() => {
        const displayName = userData?.firstName
          ? `${userData.firstName}${userData.lastName ? ' ' + userData.lastName : ''}`
          : 'Alex Johnson';
        const targetRole = userData?.role || 'Product Manager';
        const expLevel = userData?.experienceLevel || 'Mid-level (3–5 yrs)';
        const targetCompanies: string[] = (userData?.targetCompanies as string[] | undefined) ?? ['Stripe', 'Figma', 'Linear', 'Notion', 'Vercel'];
        const completedSections = 3;
        const totalSections = 5;
        const completePct = Math.round((completedSections / totalSections) * 100);

        return (
          <div className="flex flex-col gap-6">

            {/* ── Profile Header + Completeness ── */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-6 py-5 border-b border-border">
                <div className="flex items-center gap-4">
                  {/* Avatar — no gradient, flat bg-primary */}
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm shrink-0">
                    {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-foreground">{displayName}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-muted-foreground">{targetRole}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{expLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="flex items-center gap-1.5 sm:justify-end mb-1">
                    <span className="text-sm font-medium text-foreground">{completePct}% profile complete</span>
                  </div>
                  <p className="text-sm text-muted-foreground sm:max-w-[220px]">
                    Complete your profile to unlock better job matches.
                  </p>
                </div>
              </div>

              {/* Progress bar per design token spec */}
              <div className="px-6 py-4 bg-secondary">
                <div className="flex items-center justify-between mb-3">
                  {[
                    { label: 'Resume',      done: true  },
                    { label: 'Target Role', done: true  },
                    { label: 'Companies',   done: false },
                    { label: 'Visa Status', done: false },
                    { label: 'Basic Info',  done: true  },
                  ].map((step, i) => (
                    <div key={step.label} className="flex flex-col items-center gap-1.5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                        step.done
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-border text-muted-foreground'
                      }`}>
                        <span className="text-xs font-medium">{i + 1}</span>
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${step.done ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
                {/* Track: bg-muted, Fill: bg-primary, h-1 */}
                <div className="relative h-1 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${completePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ── Grid Row 1: Resume + Target Role ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Resume Card */}
              <div className="lg:col-span-7 bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-foreground">Resume</h3>
                    <p className="text-sm text-muted-foreground">Used for job matching & mock tailoring</p>
                  </div>
                  <span className="px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-md text-xs font-medium">
                    Active
                  </span>
                </div>
                <div className="px-5 py-4">
                  {/* File Preview */}
                  <div className="flex items-center gap-4 p-4 rounded-md bg-secondary border border-border mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate mb-0.5">Alex_Johnson_PM_Resume_2024.pdf</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Uploaded Oct 18, 2024</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">284 KB</span>
                      </div>
                    </div>
                  </div>
                  {/* CTAs */}
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium">
                      Preview
                    </button>
                    <button className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium">
                      Download
                    </button>
                    <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium ml-auto">
                      Replace Resume
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Role Card */}
              <div className="lg:col-span-5 bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-foreground">Target Role</h3>
                    <p className="text-sm text-muted-foreground">Shapes your practice & job matching</p>
                  </div>
                  <button className="text-primary text-sm font-medium hover:opacity-80 transition-opacity">
                    Edit
                  </button>
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 p-4 bg-secondary rounded-md border border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Target</span>
                    <span className="text-xl font-medium text-foreground">{targetRole}</span>
                    <span className="text-sm text-muted-foreground">{expLevel}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Used for</span>
                    {[
                      { text: 'AI mock interview tailoring' },
                      { text: 'Job matching & applications' },
                      { text: 'Mentor pairing recommendations' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-sm text-muted-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Grid Row 2: Target Companies + Visa Status ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Target Companies */}
              <div className="lg:col-span-7 bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-foreground">Target Companies</h3>
                    <p className="text-sm text-muted-foreground">We prioritize outreach to these companies</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="border border-border bg-background text-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors">
                      Edit
                    </button>
                    <button className="text-primary text-sm font-medium hover:opacity-80 transition-opacity">
                      Add
                    </button>
                  </div>
                </div>
                <div className="px-5 py-4">
                  {targetCompanies.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {targetCompanies.map((company: string) => (
                          <div
                            key={company}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary text-sm font-medium text-foreground"
                          >
                            <div className="w-5 h-5 rounded-md bg-card border border-border flex items-center justify-center text-xs font-medium shrink-0">
                              {company[0]}
                            </div>
                            {company}
                          </div>
                        ))}
                        <button className="px-3 py-1.5 rounded-md border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors text-sm font-medium">
                          Add more
                        </button>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-secondary rounded-md border border-border">
                        <p className="text-sm text-muted-foreground">
                          Screna targets outreach and applies to open roles at these companies on your behalf.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <p className="text-sm font-medium text-foreground mb-1">No target companies added</p>
                      <p className="text-sm text-muted-foreground mb-4">Add companies to activate outreach.</p>
                      <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity mx-auto">
                        Add target companies
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Visa Status Card */}
              <div className="lg:col-span-5 bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                  <div>
                    <h3 className="text-foreground">Work Authorization</h3>
                    <p className="text-sm text-muted-foreground">Affects job matching eligibility</p>
                  </div>
                  <button className="text-primary text-sm font-medium hover:opacity-80 transition-opacity">
                    Edit
                  </button>
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                  <div className="p-4 bg-secondary rounded-md border border-border">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">Current Status</span>
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-md bg-muted text-foreground flex items-center justify-center font-medium text-xs shrink-0">
                        OPT
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">OPT (F-1)</div>
                        <div className="text-sm text-muted-foreground">Requires H-1B sponsorship</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-wider mb-1">Sponsorship options</span>
                    {[
                      { label: 'OPT / F-1', active: true },
                      { label: 'H-1B', active: false },
                      { label: 'Green Card / PR', active: false },
                      { label: 'US Citizen', active: false },
                    ].map((opt) => (
                      <div key={opt.label} className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm ${
                        opt.active
                          ? 'bg-secondary border-border font-medium text-foreground'
                          : 'border-border text-muted-foreground'
                      }`}>
                        <span>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Basic Info (full width) ── */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                <div>
                  <h3 className="text-foreground">Basic Info</h3>
                  <p className="text-sm text-muted-foreground">Your account details</p>
                </div>
                <button className="border border-border bg-background text-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors">
                  Edit Profile
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {/* Name */}
                <div className="px-5 py-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Full Name</div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center shrink-0">
                      {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-foreground">{displayName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">{expLevel}</span>
                  </div>
                </div>
                {/* Email */}
                <div className="px-5 py-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Email Address</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm text-foreground truncate">
                      {userData?.firstName ? `${userData.firstName.toLowerCase()}@gmail.com` : 'alex.johnson@gmail.com'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-xs text-muted-foreground font-medium">Verified</span>
                  </div>
                </div>
                {/* Account */}
                <div className="px-5 py-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Account</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm text-foreground font-medium">Joined Sep 2024</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
                      Pro Plan
                    </span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                      12 credits
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Account Actions ── */}
            <div className="bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h3 className="text-foreground mb-0.5">Account Actions</h3>
                  <p className="text-sm text-muted-foreground">Manage your data and account settings</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button className="border border-border bg-background text-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                    Export My Data
                  </button>
                  <button className="border border-destructive/30 text-destructive rounded-md px-4 py-2 text-sm font-medium hover:bg-destructive/10 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ════════════════════════════════════════════════════════
interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
  noSidebar?: boolean;
}

export function DashboardLayout({ children, headerTitle, noSidebar = false }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      navigate('/auth');
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      setUserData((prev) => {
        const nameParts = (user.name || '').trim().split(' ');
        const firstName = nameParts[0] || prev?.firstName || '';
        const lastName = nameParts.slice(1).join(' ') || prev?.lastName || '';
        return {
          ...prev,
          firstName,
          lastName,
          role: user.role || prev?.role,
        };
      });
    }
  }, [user]);

  const firstName = userData?.firstName || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayTitle = headerTitle || `${greeting}, ${firstName}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Global Top Header ── */}
      {location.pathname === '/marketplace' || location.pathname === '/mentor-details' ? (
        <Navbar />
      ) : (
        <GlobalTopHeader
          firstName={firstName}
          userData={userData}
          currentPath={location.pathname}
        />
      )}

      {/* ── Below header: Sidebar + Content ── */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        {!noSidebar && (
          <aside className="hidden lg:flex flex-col w-[220px] bg-sidebar border-r border-sidebar-border sticky top-[calc(var(--topbar-h)+3.5rem)] h-[calc(100vh-3.5rem-var(--topbar-h))] z-40 shrink-0 overflow-y-auto">
            <SidebarContent currentPath={location.pathname} />
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Context sub-header */}
          {!noSidebar && (
            <div className="sticky top-[calc(var(--topbar-h)+3.5rem)] z-20 bg-background/90 backdrop-blur-sm border-b border-border px-6 sm:px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile sidebar trigger */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                      <Menu className="w-5 h-5 text-foreground" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SheetDescription className="sr-only">Main navigation links</SheetDescription>
                    <SidebarContent currentPath={location.pathname} />
                  </SheetContent>
                </Sheet>

                {!sidebarLinks.some(link => location.pathname === link.path) && (
                  null
                )}

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                    {location.pathname.startsWith('/settings') || location.pathname.startsWith('/billing') || location.pathname.startsWith('/refer') ? 'Activity & Account' : 'Career'}
                  </p>
                  <h1 className="text-foreground font-[Playfair_Display]">
                    {location.pathname === '/history' ? 'Interview History' : displayTitle}
                  </h1>
                </div>
              </div>
            </div>
          )}

          {/* Page body */}
          <div className="flex-1 px-6 sm:px-8 pt-6 pb-12 w-full max-w-[1600px] mx-auto">
            {location.pathname === '/dashboard' ? (
              <CareerCommandCenter userData={userData} />
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
