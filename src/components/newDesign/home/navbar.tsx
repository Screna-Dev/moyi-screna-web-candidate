import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Menu, X, LayoutDashboard, Settings, Coins, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { getPersonalInfo } from '@/services/ProfileServices';
import imgLogo from '@/imports/Frame1/2ac62cf8d338510e851fc6fd6ab9ce46a7956ad5.png';

// Anchor links resolve to the home page + hash so they work from any page
// (blog, goal, etc.), not just the landing page itself.
const NAV_LINKS = [
  { label: 'Features', to: '/#features' },
  { label: 'Interview Questions', to: '/interview-insights' },
  { label: 'Blog', to: '/blog' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'FAQ', to: '/#faq' },
];

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { planData, isLoading: isPlanLoading } = useUserPlan();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const avatarRef = useRef<HTMLDivElement>(null);

  const goAuth = () => navigate('/auth');

  // Initials for the logged-in avatar fallback.
  const nameParts = (user?.name || '').trim().split(' ');
  const avatarInitials =
    nameParts[0] && nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0]
      ? nameParts[0][0].toUpperCase()
      : 'U';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch the profile avatar so the icon matches the personal center header.
  useEffect(() => {
    if (!user) return;
    getPersonalInfo()
      .then((res: { data: { data?: { avatarUrl?: string } } }) => {
        const url = (res.data?.data ?? res.data)?.avatarUrl;
        if (url) setAvatarUrl(url);
      })
      .catch(() => {});
  }, [user]);

  // Close the avatar dropdown when clicking outside of it.
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
    navigate('/');
  };

  return (
    <nav
      className="fixed left-0 right-0 z-50"
      style={{
        top: 'var(--topbar-h, 0px)',
        height: 72,
        backgroundColor: scrolled ? 'rgba(255,255,255,0.82)' : '#ffffff',
        backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid #E8E8EA',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.04)' : 'none',
        transition:
          'background-color 220ms ease-out, backdrop-filter 220ms ease-out, -webkit-backdrop-filter 220ms ease-out, border-color 220ms ease-out, box-shadow 220ms ease-out',
      }}
    >
      <div className="relative max-w-[1440px] mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center">
          <img src={imgLogo} alt="Screna" className="h-6 w-auto object-contain" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-[14px] transition-colors duration-150"
              style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#2E5BFF')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#4A4D57')}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative hidden md:block" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((v) => !v)}
                aria-label="Account menu"
                title={user.name || 'My Account'}
                className="inline-flex w-9 h-9 rounded-full overflow-hidden items-center justify-center font-semibold text-[13px] text-white transition-all duration-150 hover:opacity-90 active:scale-95 bg-[#2E5BFF] border border-[#2E5BFF]"
              >
                {avatarUrl || user.avatar ? (
                  <img src={avatarUrl || user.avatar} alt={avatarInitials} className="w-full h-full object-cover" />
                ) : (
                  avatarInitials
                )}
              </button>
              {avatarOpen && (
                <div
                  className="absolute top-full right-0 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl border border-[#F0F0F2] overflow-hidden z-50 p-1.5 origin-top-right"
                  style={{ boxShadow: '0 16px 48px -12px rgba(10,10,10,0.12)' }}
                >
                  <div className="px-3 py-2.5 border-b border-[#F0F0F2] mb-1">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                      {user.name || 'My Account'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Coins className="w-3 h-3 text-[#2E5BFF]" />
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
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={goAuth}
                className="hidden md:inline-flex items-center justify-center h-9 px-4 rounded-[7px] text-[14px] font-medium transition-all duration-150"
                style={{ color: '#4A4D57', fontFamily: "'Inter', sans-serif", background: 'transparent' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#0A0A0A')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#4A4D57')}
              >
                Log in
              </button>
              <button
                onClick={goAuth}
                className="hidden md:inline-flex items-center justify-center h-9 px-5 rounded-full text-[14px] font-medium text-white transition-all duration-150 active:scale-95"
                style={{ background: '#2E5BFF', fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#1E48E6')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#2E5BFF')}
              >
                Sign up
              </button>
            </>
          )}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: '#0A0A0A' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden bg-white border-t px-6 py-4 flex flex-col gap-4"
          style={{ borderColor: '#E8E8EA' }}
        >
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-[15px]"
              style={{ color: '#4A4D57' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[15px]"
                style={{ color: '#4A4D57' }}
              >
                Personal Center
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[15px]"
                style={{ color: '#4A4D57' }}
              >
                Settings
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium w-full"
                style={{ color: '#EF4444', background: 'transparent', border: '1px solid #FCA5A5' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={goAuth}
                className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium w-full"
                style={{ color: '#4A4D57', background: 'transparent' }}
              >
                Log in
              </button>
              <button
                onClick={goAuth}
                className="inline-flex items-center justify-center h-10 px-5 rounded-[7px] text-[14px] font-medium text-white w-full"
                style={{ background: '#2E5BFF' }}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
