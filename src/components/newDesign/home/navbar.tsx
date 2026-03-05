import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import Logo from '@/assets/logo.png';
import { LayoutDashboard, LogOut, Zap, Gift, ChevronDown, Menu, X, Bot, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function useAuthState() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('screnaIsLoggedIn') === 'true';
  });
  const [userData, setUserData] = useState<{ firstName?: string; lastName?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('screnaUserData');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = () => {
      setIsLoggedIn(localStorage.getItem('screnaIsLoggedIn') === 'true');
      try {
        const raw = localStorage.getItem('screnaUserData');
        setUserData(raw ? JSON.parse(raw) : null);
      } catch {
        setUserData(null);
      }
    };
    window.addEventListener('screna-auth-change', handler);
    return () => window.removeEventListener('screna-auth-change', handler);
  }, []);

  return { isLoggedIn, userData };
}

interface NavbarProps {
  transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isLoggedIn, userData } = useAuthState();

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : userData?.firstName
    ? userData.firstName[0].toUpperCase()
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

  const handleSignOut = () => {
    localStorage.removeItem('screnaIsLoggedIn');
    window.dispatchEvent(new Event('screna-auth-change'));
    setAvatarOpen(false);
    navigate('/');
  };

  const navLinks = [
    { name: 'Jobs', path: '/job-board', hasDropdown: true, hidden: true },
    { name: 'Interview', path: '/mock-interview', hasDropdown: true },
    { name: 'Resources', path: '/question-bank', hasDropdown: true },
    { name: 'Pricing', path: '/pricing', hidden: true },
    { name: 'FAQ', path: '/faq' },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-5 left-0 right-0 mx-auto z-50 w-[calc(100%-2rem)] max-w-[860px]"
    >
      {/* ── Capsule Shell ── */}
      <div
        className={`
          relative flex items-center justify-between
          h-[58px] rounded-[999px] px-6
          border transition-all duration-500 ease-in-out
          ${scrolled
            ? 'bg-white/80 border-slate-200/60 shadow-lg shadow-blue-900/[0.04] backdrop-blur-2xl'
            : 'bg-white/60 border-white/60 shadow-md shadow-blue-900/[0.02] backdrop-blur-xl'
          }
        `}
      >
        {/* ── Left: Logo + Wordmark ── */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src={Logo} alt="Screna AI" className="w-8 h-8 object-contain" />
          <span className="text-[15px] font-bold tracking-tight text-slate-900 hidden sm:block">
            Screna AI
          </span>
        </Link>

        {/* ── Center: Nav Links ── */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <div key={link.name} className={`relative group${link.hidden ? ' hidden' : ''}`}>
              <Link
                to={link.path}
                className="flex items-center gap-1 text-[14px] font-medium text-slate-500 hover:text-blue-600 transition-colors duration-200"
              >
                {link.name}
                {link.hasDropdown && (
                  <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-80 group-hover:translate-y-px transition-all duration-200" />
                )}
              </Link>

              {/* Jobs Dropdown */}
              {link.name === 'Jobs' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
                  <Link 
                    to="/job-board" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                      <Briefcase className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Find Jobs</div>
                      <div className="text-xs text-slate-500">Browse open positions</div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Interview Dropdown */}
              {link.name === 'Interview' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
                  <Link 
                    to="/mock-interview" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                      <Bot className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">AI Mock</div>
                      <div className="text-xs text-slate-500">Practice with AI Interviewer</div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Resources Dropdown */}
              {link.name === 'Resources' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-900/[0.08] border border-slate-100/80 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 p-1.5">
                  <Link 
                    to="/question-bank" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover/item:bg-blue-100 transition-colors shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Question Bank</div>
                      <div className="text-xs text-slate-500">Practice real interview questions</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Right: Auth Area ── */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {isLoggedIn ? (
            <>
              <Link to="/pricing">
                <button className="h-[42px] px-4 rounded-full text-[13px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-white/60 transition-all duration-200">
                  Upgrade
                </button>
              </Link>

              <div className="relative" ref={avatarRef}>
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
                          {userData?.firstName
                            ? `${userData.firstName} ${userData.lastName || ''}`
                            : 'My Account'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Free Plan</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 opacity-50" />
                        Dashboard
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
            <>
              <Link to="/auth">
                <button className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors duration-200 px-1">
                  Log in
                </button>
              </Link>
              <Link to="/auth">
                <button className="h-[42px] px-5 rounded-full bg-blue-600 text-white text-[14px] font-medium hover:bg-blue-700 active:scale-[0.97] shadow-lg shadow-blue-600/20 transition-all duration-200">
                  Try Screna Free
                </button>
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile: Menu Toggle ── */}
        <button 
          className="md:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/50 rounded-full transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
        </button>
      </div>

      {/* ── Mobile Menu Dropdown ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="mt-2 p-2 bg-white/95 backdrop-blur-2xl border border-slate-100/80 rounded-2xl shadow-xl shadow-slate-900/[0.06] origin-top"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`block px-4 py-3 text-[15px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors${link.hidden ? ' hidden' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {!isLoggedIn && (
              <div className="mt-2 pt-2 border-t border-slate-100/60 grid grid-cols-2 gap-2 px-2 pb-1">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full h-[42px] rounded-xl text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    Log in
                  </button>
                </Link>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full h-[42px] rounded-xl bg-blue-600 text-white text-[14px] font-medium hover:bg-blue-700 transition-colors">
                    Try Free
                  </button>
                </Link>
              </div>
            )}
            {isLoggedIn && (
              <div className="mt-2 pt-2 border-t border-slate-100/60 px-2 pb-1">
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-[14px] font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                  Dashboard
                </Link>
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-[14px] font-medium text-red-500 hover:bg-red-50/60 rounded-xl transition-colors">
                  Sign Out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
