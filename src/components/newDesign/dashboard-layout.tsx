import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalInfo } from '@/services/ProfileServices';
import {
  LayoutDashboard,
  Mic,
  ClipboardList,
  BookOpen,
  BarChart2,
  Settings,
  Zap,
  Menu,
  Briefcase,
  Bookmark,
  CreditCard,
  Gift,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
  avatarUrl?: string;
};

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  { icon: Mic, label: 'Mock Interview', path: '/dashboard/mock-interview' },
  { icon: Bookmark, label: 'My Library', path: '/library' },
  { icon: ClipboardList, label: 'Interview History', path: '/history' },
  { icon: Gift, label: 'Refer & Earn', path: '/refer' },
  { icon: Settings, label: 'Settings & Payment', path: '/settings' },
];

function SidebarContent({ currentPath }: { currentPath: string }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[hsl(220,16%,90%)] shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] flex items-center justify-center">
            <span className="text-white font-semibold text-sm">S</span>
          </div>
          <span className="text-lg font-semibold text-[hsl(222,22%,15%)]">Screna AI</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map((item) => {
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

      {/* Bottom: Upgrade + Settings */}
      <div className="px-3 pb-5 space-y-2 mt-auto shrink-0">
        {/* Upgrade CTA */}
        <div className="rounded-xl bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-semibold">Go Pro</span>
          </div>
          <p className="text-xs text-white/80 mb-3 leading-relaxed">
            Unlock unlimited interviews & advanced analytics
          </p>
          <Link to="/pricing">
            <button className="w-full py-1.5 bg-white text-[hsl(221,91%,55%)] rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors">
              Upgrade Now
            </button>
          </Link>
        </div>


      </div>
    </div>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
  headerTitle?: string;
}

export function DashboardLayout({ children, headerTitle }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);

  // Redirect to auth only once auth check finishes and user is not logged in
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    // 1. Load from localStorage first (instant, no flicker)
    try {
      const raw = localStorage.getItem('screnaUserData');
      if (raw) {
        setUserData(JSON.parse(raw));
      } else if (user) {
        const [firstName, ...rest] = (user.name || '').split(' ');
        setUserData({ firstName, lastName: rest.join(' ') });
      }
    } catch {
      setUserData(null);
    }

    // 2. Fetch from API and merge (avatar + real name)
    const fetchPersonalInfo = async () => {
      try {
        const res = await getPersonalInfo();
        const info = res.data?.data ?? res.data;
        if (!info) return;
        setUserData((prev) => {
          const updated: UserData = { ...prev };
          if (info.name) {
            const [first, ...rest] = (info.name as string).split(' ');
            updated.firstName = first;
            updated.lastName  = rest.join(' ');
          }
          if (info.avatarUrl) updated.avatarUrl = info.avatarUrl;
          return updated;
        });
      } catch { /* silent — localStorage data remains */ }
    };

    fetchPersonalInfo();
  }, [isAuthLoading, isAuthenticated, user, navigate]);

  const handleRoleSwitch = (newRole: string) => {
    const updatedData = { ...userData, role: newRole };
    setUserData(updatedData);
    localStorage.setItem('screnaUserData', JSON.stringify(updatedData));
    // Force reload to ensure all child components and pages update their content based on the new role
    window.location.reload();
  };

  const firstName = userData?.firstName || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayTitle = headerTitle || `${greeting}, ${firstName} 👋`;

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)] flex">
      {/* Desktop Sidebar */}
      {/* Changed from fixed to sticky to prevent overflow issues and allow scrolling if content is tall */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-[hsl(220,16%,90%)] sticky top-0 h-screen z-40 shrink-0 overflow-y-auto">
        <SidebarContent currentPath={location.pathname} />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[hsl(220,16%,90%)] px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5 text-[hsl(222,22%,15%)]" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                 <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                 <SheetDescription className="sr-only">Main navigation links</SheetDescription>
                <SidebarContent currentPath={location.pathname} />
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-xs text-[hsl(222,12%,55%)] uppercase tracking-wider mb-0.5">
                {location.pathname === '/dashboard' ? 'Dashboard' : location.pathname.slice(1).replace('-', ' ').replace('/', ' / ')}
              </p>
              <h1 className="text-xl font-semibold text-[hsl(222,22%,15%)] capitalize">
                {displayTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/pricing">
              <Button className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] text-white hover:opacity-90 transition-opacity shadow-sm text-sm">
                <Zap className="w-3.5 h-3.5" />
                Upgrade
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-full bg-[hsl(220,16%,90%)] overflow-hidden border border-[hsl(220,16%,85%)]">
              {userData?.avatarUrl ? (
                <img src={userData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[hsl(221,91%,60%)] text-white text-xs font-bold">
                  {firstName[0]}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
          
          {/* Role Switcher Context Bar */}
          <div className="flex justify-end mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Target Role
                </div>
                {[
                  'Product Manager', 
                  'Software Engineer', 
                  'Product Designer', 
                  'Data Scientist', 
                  'Marketing Manager',
                  'Engineering Manager'
                ].map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span>{role}</span>
                    {userData?.role === role && <Check className="w-4 h-4 text-[hsl(221,91%,60%)]" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}