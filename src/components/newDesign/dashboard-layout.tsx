import { useState, useEffect, ReactNode, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
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
  History,
  Target,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import logoImg from '../../assets/Navbar.png';
import { AnimatePresence, motion } from 'motion/react';
import { useUserPlan } from '@/hooks/useUserPlan';

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
  avatar?: string;
};

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  // { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  // { icon: FileText, label: 'My Contributions', path: '/dashboard/contributions' },
  // { icon: Gift, label: 'Refer & Earn', path: '/refer' },
  { icon: History, label: 'Interview History', path: '/history' },
  { icon: Settings, label: 'Settings & Payment', path: '/settings' },
];

const adminSidebarLinks = [
  { icon: ShieldCheck, label: 'Dashboard', path: '/admin' },
  { icon: Gift, label: 'Redeem Codes', path: '/redeem-code' },
  { icon: Settings, label: 'Audit Log', path: '/audit-logs' },
];

function SidebarContent({ currentPath, creditBalance, isPlanLoading }: { currentPath: string; creditBalance: number; isPlanLoading: boolean }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const links = isAdmin ? adminSidebarLinks : sidebarLinks;

  return (
    <div className="flex flex-col h-full">
      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {isAdmin && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
        )}
        {links.map((item) => {
          const isActive = currentPath === item.path || (item.path === '/settings' && currentPath.startsWith('/settings'));
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                  : 'text-[hsl(222,12%,45%)] hover:bg-[hsl(220,18%,96%)] hover:text-[hsl(222,22%,15%)]'
              }`}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Credits CTA (hidden for admins) */}
      {!isAdmin && <div className="px-3 pb-5 space-y-2 mt-auto shrink-0">
        <div className="rounded-xl bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] p-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-semibold">Credits</span>
            </div>
            {!isPlanLoading && (
              <span className="text-sm font-bold tabular-nums">{creditBalance}</span>
            )}
          </div>
          <p className="text-xs text-white/80 mb-3 leading-relaxed">
            {isPlanLoading
              ? 'Loading your balance…'
              : creditBalance === 0
                ? 'You have no credits left. Top up to continue.'
                : creditBalance <= 5
                  ? 'Running low — top up to keep practicing.'
                  : 'Top up credits to keep practicing mock interviews'}
          </p>
          <Link to="/pricing">
            <button className="w-full py-1.5 bg-white text-[hsl(221,91%,55%)] rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors">
              {creditBalance === 0 ? 'Buy Credits Now' : 'Buy More Credits'}
            </button>
          </Link>
        </div>
      </div>}
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
  creditBalance,
  isPlanLoading,
}: {
  firstName: string;
  userData: UserData | null;
  currentPath: string;
  creditBalance: number;
  isPlanLoading: boolean;
}) {
  const navigate = useNavigate();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : userData?.firstName
    ? userData.firstName[0].toUpperCase()
    : 'U';
  const { user, logout } = useAuth();

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

  // Check if a global nav link is "active"
  const isLinkActive = (path: string) => {
    if (path === '/job-board') return currentPath.startsWith('/job-board') || currentPath === '/jobs';
    if (path === '/mock-interview') return currentPath.includes('mock-interview') || currentPath.includes('ai-mock') || currentPath.includes('personalized-practice');
    if (path === '/question-bank') return currentPath.startsWith('/question-bank') || currentPath.startsWith('/interview-insights');
    return currentPath === path;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[hsl(220,16%,90%)] h-14 flex items-center px-4 sm:px-6">
      {/* Left: Logo + Home */}
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logoImg} alt="Screna" className="h-6 w-auto" />
        </Link>
        <div className="w-px h-5 bg-slate-200" />
        <Link
          to="/"
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
          title="Back to homepage"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-xs hidden sm:inline">Home</span>
        </Link>
      </div>

      {/* Center: Global Nav Links (matching landing page hierarchy) */}
      <nav className="hidden md:flex items-center gap-5 mx-auto">
        {/* Jobs — with dropdown */}
        <div className="relative group">
          
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
            <Link
              to="/job-board"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Find Jobs</div>
                <div className="text-[11px] text-slate-500">Browse open positions</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Interview — with dropdown */}
        <div className="relative group">
          <button
            className={`flex items-center gap-1 text-[13px] font-medium transition-colors duration-200 ${
              isLinkActive('/mock-interview')
                ? 'text-[hsl(221,91%,60%)]'
                : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            Practice
            <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-80 group-hover:translate-y-px transition-all duration-200" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
            <Link
              to="/mock-interview"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Trending Roles</div>
                <div className="text-[11px] text-slate-500">Practice for popular roles</div>
              </div>
            </Link>
            <Link
              to="/personalized-practice"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover/item:bg-violet-100 transition-colors shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Personalized Practice</div>
                <div className="text-[11px] text-slate-500">AI-tailored mock sessions</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Community — with dropdown */}
        <div className="relative group">
          <button
            className={`flex items-center gap-1 text-[13px] font-medium transition-colors duration-200 ${
              isLinkActive('/question-bank')
                ? 'text-[hsl(221,91%,60%)]'
                : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            Community
            <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-80 group-hover:translate-y-px transition-all duration-200" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
            <Link
              to="/interview-insights"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Interview Insights</div>
                <div className="text-[11px] text-slate-500">Real interview experiences</div>
              </div>
            </Link>
          </div>
        </div>

        {/* FAQ — flat link */}
        <Link
          to="/faq"
          className={`text-[13px] font-medium transition-colors duration-200 ${
            isLinkActive('/faq')
              ? 'text-[hsl(221,91%,60%)]'
              : 'text-slate-500 hover:text-blue-600'
          }`}
        >
          FAQ
        </Link>

        {/* Pricing — flat link */}
        <Link
          to="/pricing"
          className={`text-[13px] font-medium transition-colors duration-200 ${
            isLinkActive('/pricing')
              ? 'text-[hsl(221,91%,60%)]'
              : 'text-slate-500 hover:text-blue-600'
          }`}
        >
          Pricing
        </Link>
      </nav>

      {/* Right: Credits + Avatar */}
      <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
        {userData?.role !== 'ADMIN' && (
          <Link
            to="/pricing"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            title="Buy more credits"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 tabular-nums">
              {isPlanLoading ? '—' : `${creditBalance} credit${creditBalance !== 1 ? 's' : ''}`}
            </span>
          </Link>
        )}

        {/* Avatar + Dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-semibold text-[12px] transition-all duration-200 text-white hover:opacity-90 ${
              userData?.role === 'ADMIN'
                ? 'bg-red-500 border-2 border-red-300 ring-2 ring-red-200'
                : 'bg-[hsl(221,91%,60%)] border border-[hsl(221,91%,55%)]'
            }`}
          >
            {userData?.avatar ? (
              <img src={userData.avatar} alt={initials} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden z-50 p-1.5 origin-top-right"
              >
                {/* User Info */}
                <div className="px-3 py-2.5 border-b border-slate-100/60 mb-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {userData?.firstName
                      ? `${userData.firstName} ${userData.lastName || ''}`
                      : 'My Account'}
                  </p>
                  {userData?.role !== 'ADMIN' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Coins className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-slate-500">
                        {isPlanLoading ? 'Loading…' : `${creditBalance} credit${creditBalance !== 1 ? 's' : ''} remaining`}
                      </span>
                    </div>
                  )}
                  {userData?.role === 'ADMIN' && (
                    <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>

                {userData?.role === 'ADMIN' ? (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 opacity-50" />
                      Admin Dashboard
                    </Link>
                    <Link
                      to="/redeem-code"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Gift className="w-4 h-4 opacity-50" />
                      Redeem Codes
                    </Link>
                    <Link
                      to="/audit-logs"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 opacity-50" />
                      Audit Log
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 opacity-50" />
                      Dashboard
                    </Link>
                    {/* <Link
                      to="/messages"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 opacity-50" />
                      Messages
                    </Link> */}
                    <Link
                      to="/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 opacity-50" />
                      Settings
                    </Link>
                  </>
                )}

                <div className="border-t border-slate-100/60 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50/60 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 opacity-60" />
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
// DASHBOARD LAYOUT
// ════════════════════════════════════════════════════════
interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
}

export function DashboardLayout({ children, headerTitle }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const { planData, isLoading: isPlanLoading } = useUserPlan();
  const creditBalance = planData.permanentCreditBalance;
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    const [firstName, ...rest] = (user.name || '').split(' ');
    setUserData({ firstName, lastName: rest.join(' ') || undefined, role: user.role, avatar: user.avatar });
  }, [user, isLoading, navigate]);

  const firstName = userData?.firstName || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayTitle = headerTitle || `${greeting}, ${firstName}`;

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)] flex flex-col">
      {/* ── Global Top Header (full width) ── */}
      <GlobalTopHeader
        firstName={firstName}
        userData={userData}
        currentPath={location.pathname}
        creditBalance={creditBalance}
        isPlanLoading={isPlanLoading}
      />

      {/* ── Below header: Sidebar + Content ── */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-[hsl(220,16%,90%)] sticky top-14 h-[calc(100vh-3.5rem)] z-40 shrink-0 overflow-y-auto">
          <SidebarContent currentPath={location.pathname} creditBalance={creditBalance} isPlanLoading={isPlanLoading} />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Context sub-header: page title + breadcrumb */}
          <div className="sticky top-14 z-20 bg-[hsl(220,20%,97%)]/90 backdrop-blur-sm border-b border-[hsl(220,16%,92%)] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                    <Menu className="w-5 h-5 text-[hsl(222,22%,15%)]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">Main navigation links</SheetDescription>
                  <SidebarContent currentPath={location.pathname} creditBalance={creditBalance} isPlanLoading={isPlanLoading} />
                </SheetContent>
              </Sheet>

              {/* {location.pathname === '/history' && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )} */}

              <div>
                <p className="text-[11px] text-[hsl(222,12%,55%)] uppercase tracking-wider mb-0.5">
                  {location.pathname === '/dashboard' ? 'Dashboard'
                    : location.pathname.startsWith('/settings') || location.pathname.startsWith('/billing') ? 'PERSONAL'
                    : location.pathname.slice(1).replace('-', ' ').replace('/', ' / ')}
                </p>
                <h1 className="text-lg font-semibold text-[hsl(222,22%,15%)]">
                  {displayTitle}
                </h1>
              </div>
            </div>

            {/* Credits indicator (compact, visible on sub-header for quick reference) */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="tabular-nums">
                {isPlanLoading ? '—' : creditBalance} credit{!isPlanLoading && creditBalance === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Page body */}
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}