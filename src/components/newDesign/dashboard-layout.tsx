import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Settings,
  Gift,
  Coins,
  LogOut,
  FileText,
  History,
  User,
  ShieldCheck,
  Users,
  Bot,
  Target,
  BookOpen,
  ChevronRight,
  Menu,
} from 'lucide-react';
import logoImg from '../../assets/Navbar.png';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { JobApplyTab } from './job-apply-tab';
import { ProfileTab } from './profile-tab';
import { WidePageContainer } from './dashboard-page';
import { getPersonalInfo } from '../../services/ProfileServices';
import { DashboardHome } from '@/components/newDesign/dashboard-home-design';
import {
  MENTOR_DASHBOARD_PATH,
  isDualRole,
  setStoredDashboardMode,
} from '@/components/mentor/dashboard-mode';

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
};

// Career group — primary product surfaces, mapped to this app's real routes.
const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Questions', path: '/interview-insights' },
  { icon: Bot, label: 'Quick Mock', path: '/quick-mock', ai: true },
  { icon: Target, label: 'Practices', path: '/personalized-practice', ai: true },
  { icon: Users, label: 'Coaching', path: '/coaching' },
];

const sidebarAccountLinks = [
  { icon: BookOpen, label: 'My Sessions', path: '/history' },
  { icon: FileText, label: 'My Contributions', path: '/contributions' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const adminSidebarLinks = [
  { icon: ShieldCheck, label: 'Dashboard', path: '/admin' },
  { icon: Gift, label: 'Redeem Codes', path: '/redeem-code' },
  { icon: Settings, label: 'Audit Log', path: '/audit-logs' },
];

// Page titles shown in the top header (serif). headerTitle prop takes precedence.
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/coaching': 'Coaching',
  '/marketplace': 'Mentorship Marketplace',
  '/mentor-details': 'Mentor Profile',
  '/interview-insights': 'InterviewPrep Note',
  '/quick-mock': 'Quick Mock',
  '/mock-interview': 'Quick Mock',
  '/personalized-practice': 'Personalized Practice',
  '/history': 'My Sessions',
  '/contributions': 'My Contributions',
  '/dashboard/contributions': 'My Contributions',
  '/profile': 'Profile',
  '/settings': 'Settings & Payment',
  '/refer': 'Refer & Earn',
  '/library': 'My Library',
};

function navItemClass(isActive: boolean) {
  return `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
  }`;
}

// ════════════════════════════════════════════════════════
// SIDEBAR — full-height, logo at top
// ════════════════════════════════════════════════════════
function SidebarContent({ currentPath }: { currentPath: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  // Dual-role accounts (candidate + mentor) can jump to the mentor dashboard.
  const canSwitchToMentor = isDualRole(user);
  const switchToMentor = () => {
    setStoredDashboardMode('mentor');
    navigate(MENTOR_DASHBOARD_PATH);
  };

  const isLinkActive = (path: string) => {
    if (path === '/coaching') return currentPath === '/coaching' || currentPath === '/marketplace' || currentPath === '/mentor-details';
    if (path === '/interview-insights') return currentPath.startsWith('/interview-insights');
    if (path === '/quick-mock') return currentPath === '/quick-mock' || currentPath.includes('mock-interview') || currentPath.includes('ai-mock');
    if (path === '/personalized-practice') return currentPath === '/personalized-practice';
    if (path === '/contributions') return currentPath === '/contributions' || currentPath === '/dashboard/contributions';
    return currentPath === path;
  };

  // ── Logo (shared) ──
  const Logo = (
    <div className="flex items-center px-6 shrink-0" style={{ height: '72px', borderBottom: '1px solid #E5E7EB' }}>
      <Link to="/" className="flex items-center">
        <img src={logoImg} alt="Screna" className="h-6 w-auto" />
      </Link>
    </div>
  );

  if (isAdmin) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        {Logo}
        <nav className="px-3 pt-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Admin</p>
          <div className="space-y-0.5">
            {adminSidebarLinks.map((item) => (
              <Link key={item.label} to={item.path} className={navItemClass(currentPath === item.path)}>
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="px-3 pb-6 mt-auto shrink-0">
          <button onClick={logout} className={navItemClass(false) + ' w-full'}>
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {Logo}

      {/* Nav links — Career group */}
      <nav className="px-3 pt-4 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Career</p>
        <div className="space-y-0.5">
          {sidebarLinks.map((item) => (
            <Link key={item.label} to={item.path} className={navItemClass(isLinkActive(item.path))}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-sm">{item.label}</span>
              {item.ai && (
                <span className="ml-auto text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                  AI
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-border" />

      {/* Nav links — Activity & Account group */}
      <nav className="px-3 pb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-2">Activity & Account</p>
        <div className="space-y-0.5">
          {sidebarAccountLinks.map((item) => (
            <Link key={item.label} to={item.path} className={navItemClass(isLinkActive(item.path))}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Switch View — dedicated section for dual-role accounts */}
      {canSwitchToMentor && (
        <>
          <div className="mx-3 my-1 border-t border-border" />
          <nav className="px-3 pb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-2">Switch View</p>
            <button
              onClick={switchToMentor}
              className="flex items-center gap-3 px-3 py-2 rounded-md w-full font-medium transition-colors text-[hsl(165,60%,30%)] bg-[hsl(165,82%,90%)] hover:bg-[hsl(165,82%,84%)]"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="text-sm">Switch to Mentor Dashboard</span>
            </button>
          </nav>
        </>
      )}

      {/* Bottom utility area */}
      <div className="px-3 pb-6 mt-auto shrink-0 flex flex-col gap-0">
        {/* Refer & Earn card — hidden per request, keep for later re-enable */}
        {/* <Link to="/refer" className="block mb-5 rounded-2xl p-4 no-underline hover:opacity-90 transition-opacity" style={{ background: '#EEF4FF' }}>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 shrink-0 text-primary" />
            <span className="flex-1 text-sm font-medium text-foreground">Refer &amp; Earn</span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="my-2.5 border-t border-primary/10" />
          <p className="text-xs text-foreground/70 leading-relaxed">
            Invite friends or share on LinkedIn to earn extra rewards!
          </p>
        </Link> */}

        {/* Settings & Payment row */}
        <Link to="/settings" className={navItemClass(currentPath.startsWith('/settings'))}>
          <Settings className="w-4 h-4 shrink-0" />
          <span className="text-sm">Settings &amp; Payment</span>
        </Link>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// GLOBAL TOP HEADER — offset to the right of the sidebar
// ════════════════════════════════════════════════════════
function GlobalTopHeader({
  firstName,
  userData,
  currentPath,
  hasSidebar,
  pageTitle,
  breadcrumb,
}: {
  firstName: string;
  userData: UserData | null;
  currentPath: string;
  hasSidebar: boolean;
  pageTitle?: string;
  breadcrumb?: { label: string; path: string };
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { planData } = useUserPlan();
  const creditBalance = planData.permanentCreditBalance;
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPersonalInfo()
      .then((res: { data: { data?: { avatarUrl?: string } } }) => {
        const url = (res.data?.data ?? res.data)?.avatarUrl;
        if (url) setAvatarUrl(url);
      })
      .catch(() => {});
  }, []);

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

  const isLinkActive = (path: string) => currentPath === path || currentPath.startsWith(path);

  return (
    <header
      className="fixed top-0 right-0 z-40 border-b flex items-center px-4 sm:px-6 lg:px-8 left-0 lg:left-[240px]"
      style={{ height: '72px', background: '#FFFFFF', borderColor: '#E5E7EB' }}
    >
      {/* Left: mobile menu + logo (mobile / no-sidebar) or page title (desktop) */}
      <div className="flex items-center gap-3 min-w-0 mr-4">
        {hasSidebar && (
          <Sheet>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:bg-secondary transition-colors" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[240px] border-r border-border">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Personal center navigation</SheetDescription>
              <SidebarContent currentPath={currentPath} />
            </SheetContent>
          </Sheet>
        )}

        {/* Logo: shown on mobile when sidebar exists, or always when there is no sidebar.
            Links to the marketing home page (matches the sidebar logo). */}
        <Link to="/" className={hasSidebar ? 'lg:hidden flex items-center' : 'flex items-center'}>
          <img src={logoImg} alt="Screna" className="h-6 w-auto" />
        </Link>

        {/* Page title / breadcrumb (desktop; or alongside logo when no sidebar) */}
        <div className={hasSidebar ? 'hidden lg:flex items-center min-w-0' : 'hidden sm:flex items-center min-w-0 pl-1'}>
          {breadcrumb ? (
            <div className="flex items-center gap-2 min-w-0" style={{ fontFamily: 'var(--font-serif)' }}>
              <Link
                to={breadcrumb.path}
                style={{ fontSize: '22px', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', textDecoration: 'none' }}
              >
                {breadcrumb.label}
              </Link>
              {pageTitle && (
                <>
                  <span style={{ fontSize: '18px', color: 'var(--muted-foreground)', fontWeight: 400, lineHeight: 1 }}>›</span>
                  <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', fontFamily: 'var(--font-serif)' }}>
                    {pageTitle}
                  </span>
                </>
              )}
            </div>
          ) : pageTitle ? (
            <span
              className="truncate"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}
            >
              {pageTitle}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-4 sm:gap-7">
        {/* Right: Global Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            to="/#pricing"
            className={`text-sm font-medium transition-colors ${isLinkActive('/pricing') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Pricing
          </Link>
          <Link
            to="/#faq"
            className={`text-sm font-medium transition-colors ${isLinkActive('/help') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            FAQ
          </Link>
        </nav>

        {/* Avatar */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-medium text-sm transition-all bg-primary text-primary-foreground hover:opacity-90"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt={firstName || 'Profile'} className="w-full h-full object-cover" />
              : initials}
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-56 bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/[0.08] border border-border/60 overflow-hidden z-50 p-2 origin-top-right"
              >
                <div className="px-4 py-2.5 border-b border-border mb-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'My Account'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Coins className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground">{`${creditBalance} credit${creditBalance !== 1 ? 's' : ''} remaining`}</span>
                  </div>
                </div>
                <Link to="/dashboard" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-xl transition-colors">
                  <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Personal Center
                </Link>
                <Link to="/settings" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-xl transition-colors">
                  <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                </Link>
                <div className="border-t border-border mt-1 pt-1">
                  <button onClick={handleSignOut} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
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
  // Ported new-design pages bring their own page container/padding (e.g.
  // WidePageContainer), so they opt out of the layout's default padded wrapper.
  fullBleed?: boolean;
}

export function DashboardLayout({ children, headerTitle, noSidebar = false, fullBleed = false }: DashboardLayoutProps) {
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

  const isApplications = location.pathname === '/applications';
  // Marketplace & Jobs get a full-width canvas with no left sidebar.
  const hasSidebar = !noSidebar && !isApplications && location.pathname !== '/marketplace';

  // Title shown in the header: explicit prop wins, else mapped from path.
  const pageTitle = headerTitle ?? PAGE_TITLES[location.pathname];

  const breadcrumb =
    location.pathname === '/mentor-details'
      ? { label: 'Coaching', path: '/coaching' }
      : location.pathname.startsWith('/interview-insights/') || location.pathname.startsWith('/experience/')
      ? { label: 'InterviewPrep Note', path: '/interview-insights' }
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Fixed Left Sidebar (logo + menu) — desktop only ── */}
      {hasSidebar && (
        <aside
          className="hidden lg:flex fixed top-0 left-0 z-50 flex-col overflow-y-auto bg-sidebar w-[240px]"
          style={{ height: '100vh', borderRight: '1px solid #E5E7EB' }}
        >
          <SidebarContent currentPath={location.pathname} />
        </aside>
      )}

      {/* ── Fixed Top Header (offset right of sidebar) ── */}
      <GlobalTopHeader
        firstName={firstName}
        userData={userData}
        currentPath={location.pathname}
        hasSidebar={hasSidebar}
        pageTitle={pageTitle}
        breadcrumb={breadcrumb}
      />

      {/* ── Main content (offset by sidebar + top header) ── */}
      <main
        className={`min-h-screen bg-[#F9FAFB] ${hasSidebar ? 'lg:ml-[240px]' : ''}`}
        style={{ paddingTop: '72px' }}
      >
        {/* Profile renders the pre-redesign ProfileTab (API-connected), which self-pads via WidePageContainer. */}
        {location.pathname === '/profile' ? (
          <ProfileTab userData={userData} />
        ) : location.pathname === '/dashboard' ? (
          // Dashboard self-pads via the same WidePageContainer as every other
          // ported page, so its content gutters line up with them exactly.
          <WidePageContainer maxWidth="none" paddingTop={32}>
            <CareerCommandCenter userData={userData} />
          </WidePageContainer>
        ) : fullBleed ? (
          children
        ) : (
          <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
            {isApplications ? (
              <>
                <div className="mb-8">
                  <PageHero
                    badge="AI-matched roles"
                    title="Jobs"
                    subtitle="Let Screna submit applications to matched roles on your behalf — and track every step in one place."
                  />
                </div>
                <JobApplyTab />
              </>
            ) : (
              children
            )}
          </div>
        )}
      </main>
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
