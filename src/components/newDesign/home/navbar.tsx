import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import logoImg from '../../../assets/Navbar.png';
import { LayoutDashboard, LogOut, Zap, Gift, ChevronDown, Menu, X, Bot, Briefcase, MessageSquare, Target, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  transparent?: boolean;
}

const NAV_ITEMS = [
  {
    label: 'Practice',
    items: [
      {
        title: 'Personalized Mock',
        desc: 'AI-powered mock interviews tailored to your role and goals.',
        path: '/personalized-practice',
      },
    ],
  },
  {
    label: 'Community',
    items: [
      {
        title: 'Interview Insights',
        desc: 'Learn from real interview experiences shared by other candidates.',
        path: '/interview-insights',
      },
    ],
  },
];

export function Navbar({ transparent: _transparent = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setAvatarOpen(false);
    await logout();
  };

  const navLinks = [
    { name: 'Service', path: '#service', hasDropdown: true },
    { name: 'Practice', path: '#practice', hasDropdown: true },
    { name: 'Community', path: '#community', hasDropdown: true },
    { name: 'Pricing', path: '/pricing' },
  ];

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-[calc(var(--topbar-h)+1.25rem)] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[960px]"
    >
      <div
        className={`
          relative grid grid-cols-[auto_1fr_auto] items-center
          h-[58px] rounded-[999px] px-8
          border transition-all duration-500 ease-in-out
          ${scrolled
            ? 'bg-white/80 border-slate-200/60 shadow-lg shadow-blue-900/[0.04] backdrop-blur-2xl'
            : 'bg-white/60 border-white/60 shadow-md shadow-blue-900/[0.02] backdrop-blur-xl'
          }
        `}
      >
        {/* ── Left: Logo + Wordmark ── */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src={logoImg} alt="Screna" className="h-8 w-auto" />
        </Link>

        {/* Center nav — absolutely centered */}
        <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {/* Coach (plain link) */}
          <Link
            to="/marketplace"
            className="text-[14px] text-[#2A2A2A] hover:text-[#2E5BFF] transition-colors duration-150"
            style={{ fontWeight: 450 }}
          >
            Coach
          </Link>

          {NAV_ITEMS.map(({ label, items }) => (
            <div key={label} className="relative group">
              <button className="flex items-center gap-1 text-[14px] text-[#2A2A2A] hover:text-[#2E5BFF] transition-colors duration-150" style={{ fontWeight: 450 }}>
                {label}
                <svg
                  className="opacity-55 group-hover:rotate-180 transition-transform duration-200 shrink-0"
                  width="10" height="10" viewBox="0 0 10 10"
                  fill="none" stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M2 3.5l3 3 3-3"/>
                </svg>
              </button>
              {/* Hover bridge + dropdown */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
                <div
                  className="w-64 bg-white/95 backdrop-blur-xl rounded-2xl border border-[#F0F0F2] p-2 shadow-xl -translate-y-1.5 group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-200"
                  style={{ boxShadow: '0 16px 48px -12px rgba(10,10,10,0.12), 0 0 0 1px #F0F0F2' }}
                >
                  {items.map(({ title, desc, path }) => (
                    <Link
                      key={path}
                      to={path}
                      className="flex flex-col gap-1 px-3.5 py-3 rounded-[10px] hover:bg-[#F7F9FF] transition-colors"
                    >
                      <span
                        style={{ fontFamily: "'Playfair Display', serif" }}
                        className="text-[16px] font-[500] text-[#0A0A0A] tracking-[-0.01em] leading-[1.2]"
                      >
                        {title}
                      </span>
                      <span className="text-[12.5px] text-[#4a4d57] leading-[1.5]">{desc}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Practice Dropdown */}
              {link.name === 'Practice' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
                  <Link 
                    to="/mock-interview" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                      <Bot className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Trending Roles</div>
                      <div className="text-xs text-slate-500">Practice for popular roles</div>
                    </div>
                  </Link>
                  <Link 
                    to="/personalized-practice" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover/item:bg-violet-100 transition-colors shrink-0">
                      <Target className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Personalized Practice</div>
                      <div className="text-xs text-slate-500">AI-tailored mock sessions</div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Community Dropdown */}
              {link.name === 'Community' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
                  <Link 
                    to="/interview-insights" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Interview Insights</div>
                      <div className="text-xs text-slate-500">Real interview experiences</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          ))}

          {/* Pricing */}
          <Link
            to="/pricing"
            className="text-[14px] text-[#2A2A2A] hover:text-[#2E5BFF] transition-colors duration-150"
            style={{ fontWeight: 450 }}
          >
            Pricing
          </Link>

          {/* FAQ — points to existing Help Center */}
          <Link
            to="/help"
            className="text-[14px] text-[#2A2A2A] hover:text-[#2E5BFF] transition-colors duration-150"
            style={{ fontWeight: 450 }}
          >
            FAQ
          </Link>
        </nav>

        {/* ── Right: Auth Area + Mobile Toggle ── */}
        <div className="flex items-center justify-end gap-4">
          {isLoggedIn ? (
            <>
              <div className="hidden md:block relative" ref={avatarRef}>
                <button
                  onClick={() => setAvatarOpen((v) => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[13px] transition-all duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                >
                  {initials}
                </button>

                {/* User Dropdown */}
                <AnimatePresence>
                  {avatarOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full right-0 mt-3 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden z-50 p-1.5 origin-top-right"
                    >
                      <div className="px-3 py-2.5 border-b border-slate-100/60 mb-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {user?.name || 'My Account'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">12 Credits remaining</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 opacity-50" />
                        Personal Center
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 opacity-50" />
                        Messages
                      </Link>
                      <Link
                        to="/refer"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Gift className="w-4 h-4 opacity-50" />
                        Refer & Earn
                      </Link>
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
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link to="/auth">
                <button className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors duration-200 px-1">
                  Log in
                </button>
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center h-[34px] px-4 rounded-full bg-[#2E5BFF] text-white text-[13px] font-[500] hover:bg-[#1E48E6] transition-colors"
                style={{ boxShadow: '0 4px 12px -4px rgba(46,91,255,0.4)' }}
              >
                Start free
              </Link>
            </div>
          )}

          {/* ── Mobile: Menu Toggle ── */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
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
            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-[15px] font-[500] text-[#0A0A0A] hover:bg-[#F7F9FF] rounded-xl transition-colors mt-2"
            >
              Coach
            </Link>
            {NAV_ITEMS.map(({ label, items }) => (
              <div key={label}>
                <p
                  className="text-[11px] font-[600] uppercase tracking-[0.1em] text-[#8a8f9a] px-3 pt-4 pb-1.5"
                >
                  {label}
                </p>
                {items.map(({ title, path }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-[15px] font-[500] text-[#0A0A0A] hover:bg-[#F7F9FF] rounded-xl transition-colors"
                  >
                    {title}
                  </Link>
                ))}
              </div>
            ))}
            <div className="border-t border-[#E8E8EA] mt-3 pt-1">
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-[15px] font-[500] text-[#0A0A0A] hover:bg-[#F7F9FF] rounded-xl transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-[15px] font-[500] text-[#0A0A0A] hover:bg-[#F7F9FF] rounded-xl transition-colors"
              >
                FAQ
              </Link>
            </div>
            {!isLoggedIn && (
              <div className="mt-2 pt-2 border-t border-slate-100/60 grid grid-cols-2 gap-2 px-2 pb-1">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full h-[42px] rounded-xl text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Log in
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
                  Dashboard
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