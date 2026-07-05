import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X, LayoutDashboard, Settings, Coins, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { getPersonalInfo } from '../../../services/ProfileServices';

interface NavbarProps {
  transparent?: boolean;
}

const NAV_LINKS = [
  { label: 'Coach', path: '/marketplace' },
  // Jobs feature temporarily hidden for this release — restore when re-launching.
  // { label: 'Jobs', path: '/applications' },
  { label: 'Quick AI Mock', path: '/personalized-practice' },
  { label: 'InterviewPrep Note', path: '/interview-insights' },
  { label: 'Pricing', path: '/#pricing' },
  { label: 'FAQ', path: '/help' },
];

export function Navbar({ transparent: _transparent = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  const { planData, isLoading: isPlanLoading } = useUserPlan();

  const nameParts = (user?.name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : firstName
      ? firstName[0].toUpperCase()
      : 'U';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch the profile avatar so the icon matches the personal center header.
  useEffect(() => {
    if (!isLoggedIn) return;
    getPersonalInfo()
      .then((res: { data: { data?: { avatarUrl?: string } } }) => {
        const url = (res.data?.data ?? res.data)?.avatarUrl;
        if (url) setAvatarUrl(url);
      })
      .catch(() => {});
  }, [isLoggedIn]);

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
    setAvatarOpen(false);
    logout();
  };

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 z-50"
      style={{
        top: 'var(--topbar-h, 0px)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        background: 'rgba(255,255,255,0.72)',
        borderBottom: `1px solid ${scrolled ? '#E8E8EA' : 'transparent'}`,
        transition: 'border-color 200ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        className="flex items-center justify-between h-16 mx-auto"
        style={{ maxWidth: '1320px', padding: '0 clamp(20px, 4vw, 40px)' }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <img src="/landing/logo-full.png" alt="Screna" className="h-[22px] w-auto" />
        </Link>

        {/* Center nav — absolutely centered */}
        <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className="text-[14px] whitespace-nowrap text-[#2A2A2A] hover:text-[#2E5BFF] transition-colors duration-150"
              style={{ fontWeight: 450 }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: auth */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {isLoggedIn ? (
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-semibold text-[12px] transition-all duration-200 text-white hover:opacity-90 ${
                  user?.role === 'ADMIN'
                    ? 'bg-red-500 border-2 border-red-300 ring-2 ring-red-200'
                    : 'bg-[hsl(221,91%,60%)] border border-[hsl(221,91%,55%)]'
                }`}
              >
                {avatarUrl || user?.avatar ? (
                  <img src={avatarUrl || user?.avatar} alt={initials} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </button>
              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full right-0 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#F0F0F2] overflow-hidden z-50 p-1.5 origin-top-right"
                    style={{ boxShadow: '0 16px 48px -12px rgba(10,10,10,0.12)' }}
                  >
                    <div className="px-3 py-2.5 border-b border-[#F0F0F2] mb-1">
                      <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                        {user?.name || 'My Account'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Coins className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                        <span className="text-xs text-[#8a8f9a]">
                          {isPlanLoading
                            ? 'Loading…'
                            : `${planData.permanentCreditBalance} credit${planData.permanentCreditBalance !== 1 ? 's' : ''} remaining`}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4a4d57] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 opacity-50" />
                      Personal Center
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#4a4d57] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 opacity-50" />
                      Settings
                    </Link>
                    <div className="border-t border-[#F0F0F2] mt-1 pt-1">
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
          ) : (
            <>
              <Link
                to="/auth?login=true"
                className="text-[14px] text-[#2A2A2A] hover:text-[#2E5BFF] transition-colors duration-150"
                style={{ fontWeight: 450 }}
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center h-[34px] px-4 rounded-full bg-[#2E5BFF] text-white text-[13px] font-[500] hover:bg-[#1E48E6] transition-colors"
                style={{ boxShadow: '0 4px 12px -4px rgba(46,91,255,0.4)' }}
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center text-[#4a4d57] hover:text-[#0A0A0A] rounded-full hover:bg-[#F7F7F7] transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-t border-[#E8E8EA] px-4 pb-4"
          >
            {NAV_LINKS.map(({ label, path }, i) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 text-[15px] font-[500] text-[#0A0A0A] hover:bg-[#F7F9FF] rounded-xl transition-colors${i === 0 ? ' mt-2' : ''}`}
              >
                {label}
              </Link>
            ))}
            {!isLoggedIn && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/auth?login=true" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full h-[42px] rounded-xl text-[14px] font-[500] text-[#2A2A2A] hover:bg-[#F7F7F7] transition-colors">
                    Sign in
                  </button>
                </Link>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full h-[42px] rounded-xl bg-[#2E5BFF] text-white text-[14px] font-[500] hover:bg-[#1E48E6] transition-colors">
                    Start free
                  </button>
                </Link>
              </div>
            )}
            {isLoggedIn && (
              <div className="mt-3 border-t border-[#E8E8EA] pt-1">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-[14px] font-[500] text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-xl transition-colors"
                >
                  Personal Center
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-[14px] font-[500] text-[#0A0A0A] hover:bg-[#F7F7F7] rounded-xl transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-[14px] font-[500] text-red-500 hover:bg-red-50/60 rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}