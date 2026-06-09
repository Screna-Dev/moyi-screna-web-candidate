import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Settings,
  Gift,
  Coins,
  Home,
  LogOut,
  FileText,
  History,
  User,
  ShieldCheck,
} from 'lucide-react';
import logoImg from '../../assets/Navbar.png';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { JobApplyTab } from './job-apply-tab';
import { ProfileTab } from './profile-tab';
import { DashboardHome } from '@/pages/newDesign/dashboard-home';

function LearningActivityChart() {
  return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">Learning Activity Chart — coming soon</div>;
}
function FreshFromCommunity() {
  return <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">Community Feed — coming soon</div>;
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
  { icon: History, label: 'Training History', path: '/history' },
  { icon: FileText, label: 'My Contributions', path: '/contributions' },
];

// Mirrors home/navbar.tsx so the top-nav stays identical across landing & dashboard.
const TOP_NAV_LINKS = [
  { label: 'Coach', path: '/marketplace' },
  { label: 'Jobs', path: '/applications' },
  { label: 'Quick AI Mock', path: '/personalized-practice' },
  { label: 'InterviewPrep Note', path: '/interview-insights' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'FAQ', path: '/help' },
];

const sidebarAccountLinks = [
  { icon: User, label: 'Profile', path: '/profile' },
  // { icon: Gift, label: 'Refer & Earn', path: '/refer' },
  { icon: Settings, label: 'Settings & Payment', path: '/settings' },
];

const adminSidebarLinks = [
  { icon: ShieldCheck, label: 'Dashboard', path: '/admin' },
  { icon: Gift, label: 'Redeem Codes', path: '/redeem-code' },
  { icon: Settings, label: 'Audit Log', path: '/audit-logs' },
];

function SidebarContent({ currentPath }: { currentPath: string }) {
  const { planData } = useUserPlan();
  const { user, logout } = useAuth();
  const creditBalance = planData.permanentCreditBalance;
  const isAdmin = user?.role === 'ADMIN';

  if (isAdmin) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <nav className="px-3 pt-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Admin</p>
          <div className="space-y-0.5">
            {adminSidebarLinks.map((item) => {
              const isActive = currentPath === item.path;
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
        <div className="px-3 pb-5 mt-auto shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md w-full transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Nav links — Career group */}
      <nav className="px-3 pt-4 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Career</p>
        <div className="space-y-0.5">
          {sidebarLinks.map((item) => {
            const isActive = currentPath === item.path;
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
              (item.path === '/settings' && currentPath.startsWith('/settings')) ||
              (item.path === '/profile' && currentPath === '/profile');
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
  const { user, logout } = useAuth();
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

  const isPathActive = (path: string) => {
    if (path === '/personalized-practice') {
      return currentPath.includes('mock-interview') || currentPath.includes('ai-mock') || currentPath.includes('personalized-practice');
    }
    if (path === '/interview-insights') {
      return currentPath.startsWith('/question-bank') || currentPath.startsWith('/interview-insights');
    }
    if (path === '/applications') {
      return currentPath === '/applications';
    }
    return currentPath === path;
  };

  if (user?.role === 'ADMIN') {
    return (
      <header
        className="sticky top-[var(--topbar-h)] z-50 h-16 flex items-center px-4 sm:px-6"
        style={{
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          background: 'rgba(255,255,255,0.72)',
          borderBottom: '1px solid #E8E8EA',
        }}
      >
        <Link to="/admin" className="flex items-center gap-2">
          <img src={logoImg} alt="Screna" className="h-6 w-auto" />
        </Link>
      </header>
    );
  }

  return (
    <header
      className="sticky top-[var(--topbar-h)] z-50"
      style={{
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        background: 'rgba(255,255,255,0.72)',
        borderBottom: '1px solid #E8E8EA',
      }}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: Logo + Home */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logoImg} alt="Screna" className="h-6 w-auto" />
          </Link>
          <div className="w-px h-5 bg-[#E8E8EA]" />
          <Link
            to="/"
            className="flex items-center gap-1 text-[#8a8f9a] hover:text-[#0A0A0A] transition-colors"
            title="Back to homepage"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Center: Global Nav — identical to landing navbar */}
        <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {TOP_NAV_LINKS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className="text-[14px] whitespace-nowrap hover:text-[#2E5BFF] transition-colors duration-150"
              style={{ fontWeight: 450, color: isPathActive(path) ? '#2E5BFF' : '#2A2A2A' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: Avatar */}
        <div className="flex items-center gap-3 shrink-0">
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
                  className="absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#F0F0F2] overflow-hidden z-50 p-1.5 origin-top-right"
                  style={{ boxShadow: '0 16px 48px -12px rgba(10,10,10,0.12)' }}
                >
                  <div className="px-3 py-2.5 border-b border-[#F0F0F2] mb-1">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                      {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'My Account'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Coins className="w-3 h-3 text-primary" />
                      <span className="text-xs text-[#8a8f9a]">{`${creditBalance} credit${creditBalance !== 1 ? 's' : ''} remaining`}</span>
                    </div>
                  </div>
                  <Link to="/dashboard" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4a4d57] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-lg transition-colors">
                    <LayoutDashboard className="w-4 h-4 opacity-50" /> Dashboard
                  </Link>
                  <Link to="/settings" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4a4d57] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-lg transition-colors">
                    <Settings className="w-4 h-4 opacity-50" /> Settings
                  </Link>
                  <div className="border-t border-[#F0F0F2] mt-1 pt-1">
                    <button onClick={handleSignOut} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50/60 rounded-lg transition-colors">
                      <LogOut className="w-4 h-4 opacity-60" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════
// CAREER COMMAND CENTER
// ════════════════════════════════════════════════════════
function CareerCommandCenter({ userData }: { userData: UserData | null }) {
  return <DashboardHome userData={userData} />;
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

  const isApplications = location.pathname === '/applications';
  // Jobs gets a full-width canvas with no left sidebar.
  const effectiveNoSidebar = noSidebar || isApplications;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Global Top Header ── */}
      <GlobalTopHeader
        firstName={firstName}
        userData={userData}
        currentPath={location.pathname}
      />

      {/* ── Below header: Sidebar + Content ── */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        {!effectiveNoSidebar && (
          <aside className="hidden lg:flex flex-col w-[220px] bg-sidebar border-r border-sidebar-border sticky top-[calc(var(--topbar-h)+4rem)] h-[calc(100vh-4rem-var(--topbar-h))] z-40 shrink-0 overflow-y-auto">
            <SidebarContent currentPath={location.pathname} />
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Page body */}
          <div className="flex-1 w-full max-w-[1600px] mx-auto px-[32px] pt-[20px] pb-[48px]">
            {location.pathname === '/dashboard' ? (
              <CareerCommandCenter userData={userData} />
            ) : isApplications ? (
              <>
                <div className="mt-[40px] mb-8">
                  <PageHero
                    badge="AI-matched roles"
                    title="Jobs"
                    subtitle="Let Screna submit applications to matched roles on your behalf — and track every step in one place."
                  />
                </div>
                <JobApplyTab />
              </>
            ) : location.pathname === '/profile' ? (
              <ProfileTab userData={userData} />
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Shared hero used across Coach / Jobs / Interview Insights so they line up
// visually: pulsing-dot badge → serif h1 → muted subtitle.
export function PageHero({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-sm font-medium mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(221,91%,60%)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(221,91%,60%)]"></span>
        </span>
        {badge}
      </div>
      <h1 className="text-3xl md:text-4xl font-semibold text-[hsl(222,22%,15%)] tracking-tight mb-2 font-[family-name:var(--font-serif)]">
        {title}
      </h1>
      <p className="text-lg text-[hsl(222,12%,45%)] max-w-xl">{subtitle}</p>
    </div>
  );
}