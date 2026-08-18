import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { MediumPageContainer } from '@/components/newDesign/dashboard-page';
import { Input } from '@/components/newDesign/ui/input';
import { Label } from '@/components/newDesign/ui/label';
import { BillingTab } from '@/components/newDesign/billing-tab-design';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalInfo, savePersonalInfo, changePassword } from '@/services/ProfileServices';

const TABS = [
  { id: 'profile',       label: 'Account',       icon: User },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing',       label: 'Billing',       icon: CreditCard },
];

const TIMEZONES = [
  'Pacific Time (US & Canada)',
  'Mountain Time (US & Canada)',
  'Central Time (US & Canada)',
  'Eastern Time (US & Canada)',
  'Greenwich Mean Time (UTC)',
  'Central European Time (CET)',
];

// ─── Shared primitives ────────────────────────────────────────��──────────────��

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function DarkBtn({ type = 'button', disabled, onClick, children }: {
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="px-5 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function getStrengthScore(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

function SegmentBar({ score }: { score: number }) {
  const color = (i: number) => {
    if (score === 0 || i >= score) return 'bg-border';
    if (score <= 2) return 'bg-amber-400';
    return 'bg-green-500';
  };
  return (
    <div className="flex gap-1 mt-2">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${color(i)}`} />
      ))}
    </div>
  );
}

function PwdInput({
  id, value, onChange, show, onToggle, placeholder,
}: {
  id: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [curPwd,     setCurPwd]     = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCur,     setShowCur]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const score = getStrengthScore(newPwd);
  const isValid =
    curPwd.length > 0 &&
    score >= 3 &&
    confirmPwd.length > 0 &&
    newPwd === confirmPwd;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    setError('');
    try {
      await changePassword({ oldPassword: curPwd, newPassword: newPwd, confirmNewPassword: confirmPwd });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.16 }}
          className="bg-card w-full max-w-[480px] mx-4 rounded-xl shadow-2xl p-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Title */}
          <h2 className="text-foreground mb-6">Change password</h2>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-foreground">Password updated successfully</p>
            </div>
          ) : (
            <>
              {/* Current password */}
              <div className="space-y-1.5 mb-4">
                <Label htmlFor="cp-cur">Current password</Label>
                <PwdInput
                  id="cp-cur" value={curPwd} onChange={setCurPwd}
                  show={showCur} onToggle={() => setShowCur(v => !v)}
                />
              </div>

              {/* New password */}
              <div className="space-y-1.5 mb-4">
                <Label htmlFor="cp-new">New password</Label>
                <PwdInput
                  id="cp-new" value={newPwd} onChange={setNewPwd}
                  show={showNew} onToggle={() => setShowNew(v => !v)}
                />
                {newPwd.length > 0 && <SegmentBar score={score} />}
                <p className="text-xs text-muted-foreground mt-1.5">
                  At least 8 characters, 1 number, 1 uppercase
                </p>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5 mb-6">
                <Label htmlFor="cp-confirm">Confirm new password</Label>
                <PwdInput
                  id="cp-confirm" value={confirmPwd} onChange={setConfirmPwd}
                  show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                  placeholder="Re-enter new password"
                />
                {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                  <p className="text-xs text-destructive mt-1">Passwords don't match</p>
                )}
              </div>

              {error && <p className="text-xs text-destructive mb-4">{error}</p>}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isValid || saving}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [timezone,  setTimezone]  = useState('Pacific Time (US & Canada)');
  const [saving,    setSaving]    = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    getPersonalInfo()
      .then((res: { data: { data?: Record<string, string>; name?: string; email?: string; timezone?: string } }) => {
        const info = res.data?.data ?? res.data;
        if (!info) return;
        const [first, ...rest] = (info.name || '').trim().split(' ');
        setFirstName(first || '');
        setLastName(rest.join(' ') || '');
        setEmail(info.email || '');
        setTimezone(info.timezone || 'Pacific Time (US & Canada)');
      })
      .catch(() => {
        if (user) {
          const parts = (user.name || '').trim().split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
          setEmail(user.email || '');
          setTimezone(user.timezone || 'Pacific Time (US & Canada)');
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveState('idle');
    setSaveError('');
    try {
      const name = [firstName, lastName].filter(Boolean).join(' ');
      await savePersonalInfo({ name, timezone, country: 'United States' });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err: unknown) {
      setSaveError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to save changes. Please try again.'
      );
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {/* Header row with avatar */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-foreground">Account Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update your account's profile information.
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 ml-6">
          <span className="text-primary font-semibold text-base">{firstName[0]}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        {/* Email — read-only (no change-email endpoint available yet) */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            className="bg-secondary text-muted-foreground cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Your email is used to sign in and can't be changed here. Contact support to update it.
          </p>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
          </select>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <DarkBtn type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </DarkBtn>
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Changes saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </span>
          )}
        </div>
      </form>

      {/* ── Data & Account ── */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Data &amp; Account</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Delete account row — coming soon (no API yet) */}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">Delete account</p>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] font-medium">Coming soon</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently erasing your account isn't available yet. To delete your data now, contact support.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-border text-sm font-medium text-muted-foreground shrink-0 cursor-not-allowed opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />Delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const { user } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  // Whether the account has an email/password credential (vs. Google-only).
  // Google accounts have no password credential: they sign in through Google
  // and can't set or change a password here. Derived from the authenticated
  // user; see detectHasPassword in AuthContext.
  const hasPassword = !!user?.hasPassword;
  const email = user?.email || '';

  return (
    <>
      <AnimatePresence>
        {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
      </AnimatePresence>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="px-6 pt-6 pb-5 border-b border-border">
          <h2 className="text-foreground">Security</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasPassword ? 'Manage your account password.' : 'Manage how you sign in.'}
          </p>
        </div>

        {hasPassword ? (
          /* Password row — email/password accounts */
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground mt-0.5">Email &amp; password login enabled</p>
              </div>
            </div>
            <button
              onClick={() => setShowChangePwd(true)}
              className="px-3.5 py-1.5 rounded-md border border-foreground/70 bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Change password
            </button>
          </div>
        ) : (
          /* Google accounts: sign-in is managed by Google — no password controls */
          <div className="divide-y divide-border">
            {/* Google login (informational; sign-in can't be disconnected here) */}
            <div className="flex items-center gap-3 px-6 py-5">
              <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google login</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {email ? `Connected · ${email}` : 'Connected'}
                </p>
              </div>
            </div>
            {/* Password not available for Google accounts */}
            <div className="px-6 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">You sign in with Google</p>
              <p className="text-xs text-muted-foreground mt-1">
                Password settings aren't available for Google accounts, so you can't change your password here.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const NOTIF_ITEMS = [
  { key: 'mentorReminders',    title: 'Mentor session reminders',  desc: '24 hours before a scheduled session',           default: true },
] as const;

function NotificationsTab() {
  const [state, setState] = useState(() =>
    Object.fromEntries(NOTIF_ITEMS.map(({ key, default: d }) => [key, d]))
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <SectionHeader title="Notifications" subtitle="Choose what updates you want to receive." />
      <div className="divide-y divide-border">
        {NOTIF_ITEMS.map(({ key, title, desc }) => {
          const on = state[key];
          return (
            <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setState(s => ({ ...s, [key]: !s[key] }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 transition-colors ${on ? 'bg-primary' : 'bg-border'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const TAB_PANELS: Record<string, React.ReactNode> = {
  profile:       <ProfileTab />,
  security:      <SecurityTab />,
  notifications: <NotificationsTab />,
  billing:       <BillingTab />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.id === tabParam) ? (tabParam as string) : 'profile',
  );

  // Keep the URL in sync so tabs (esp. Billing) are deep-linkable.
  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardLayout headerTitle="Settings" fullBleed>
    <MediumPageContainer>
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-stretch lg:items-start">
        {/* Left sidebar nav — horizontal scroll strip on mobile, vertical rail on desktop */}
        <aside className="w-full lg:w-48 shrink-0">
          <nav
            className="flex lg:flex-col gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 border-b border-border pb-2 lg:border-b-0 lg:pb-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left w-auto lg:w-full shrink-0 whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-sans)' }}>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right content panel */}
        <main className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
            >
              {TAB_PANELS[activeTab]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </MediumPageContainer>
    </DashboardLayout>
  );
}