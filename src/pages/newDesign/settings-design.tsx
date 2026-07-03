import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Globe,
  Lock,
  Check,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Zap,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Info,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { MediumPageContainer } from '@/components/newDesign/dashboard-page';
import { Input } from '@/components/newDesign/ui/input';
import { Label } from '@/components/newDesign/ui/label';
import { BillingTab } from '@/components/newDesign/billing-tab-design';
import memberBg from '@/assets/newDesign/member-bg.png';
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

function GhostBtn({ onClick, children, danger }: { onClick?: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
        danger
          ? 'border-destructive/40 text-destructive hover:bg-destructive/5'
          : 'border-border text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </button>
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
          className="bg-card w-[480px] rounded-xl shadow-2xl p-6"
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
  const [emailFlow, setEmailFlow] = useState<'closed' | 'open' | 'sent'>('closed');
  const [curPwd,    setCurPwd]    = useState('');
  const [newEmail,  setNewEmail]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1>(0);

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
    try {
      const name = [firstName, lastName].filter(Boolean).join(' ');
      await savePersonalInfo({ name, timezone });
    } catch {
      // silently fail
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
            Update your account's profile information and email address.
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 ml-6">
          <span className="text-primary font-semibold text-base">{firstName[0]}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pr-20"
            />
            {emailFlow === 'closed' && (
              <button
                type="button"
                onClick={() => setEmailFlow('open')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/70 px-2 py-1 rounded transition-colors"
              >
                Change
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            A verification link will be sent to your new email address.
          </p>

          {/* Inline email-change panel */}
          <AnimatePresence>
            {emailFlow === 'open' && (
              <motion.div
                key="email-open"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-4 bg-secondary border border-border rounded-lg space-y-3">
                  <p className="text-sm font-medium text-foreground">Change email address</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="curPwdEmail">Current password</Label>
                    <Input
                      id="curPwdEmail"
                      type="password"
                      value={curPwd}
                      onChange={e => setCurPwd(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newEmailAddr">New email address</Label>
                    <Input
                      id="newEmailAddr"
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="you@newdomain.com"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <DarkBtn onClick={() => setEmailFlow('sent')}>Send verification email</DarkBtn>
                    <GhostBtn onClick={() => setEmailFlow('closed')}>Cancel</GhostBtn>
                  </div>
                </div>
              </motion.div>
            )}

            {emailFlow === 'sent' && (
              <motion.div
                key="email-sent"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-sm font-medium text-green-700">Verification email sent</p>
                  </div>
                  <p className="text-sm text-green-600/80 ml-6">
                    Check your new inbox and click the link to confirm. The link expires in 24 hours.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

        <div className="pt-2">
          <DarkBtn type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </DarkBtn>
        </div>
      </form>

      {/* ── Data & Account ── */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Data &amp; Account</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Export row */}
          

          {/* Delete account row */}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently erase all your data, interview history, and progress.</p>
              </div>
              {deleteStep === 0 && (
                <button
                  onClick={() => setDeleteStep(1)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-destructive/40 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors shrink-0 ml-4"
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete account
                </button>
              )}
            </div>

            <AnimatePresence>
              {deleteStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex items-start gap-3 px-4 py-3.5 rounded-lg border border-destructive/30 bg-destructive/5">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-destructive">Are you sure you want to delete your account?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This will permanently erase all your data, interview history, and progress. This action cannot be undone.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDeleteStep(0)}
                        className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { /* TODO: actual delete */ setDeleteStep(0); }}
                        className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Yes, delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

// ─── Billing Tab → /src/app/components/billing-tab.tsx (imported above) ──────

/* Old billing helpers below are superseded — kept only to avoid ref errors while cleanup completes */

const FEATURES_COL1 = [
  'AI Interview Mock (credits included)',
  'Dedicated 1:1 job search advisor',
  'Resume submission & recruiter outreach',
  'Daily application progress updates',
  'Application progress tracking dashboard',
  'Proactive support during search',
  'Pre-interview warm-up reminders',
];

const FEATURES_COL2 = [
  'Full Mentor Marketplace access',
  'Mock interview sessions',
  'Resume review',
  'Salary negotiation & career planning',
  'Priority resume exposure',
  'Auto-apply',
  'Weekly members-only live sessions',
  'Annual networking events (2/year)',
  '48-hour early event registration',
  'Interview Insights Community (Unlimited)',
];

// State A feature columns (non-member upsell — all 17 items)
const STATE_A_COL1 = [
  'AI Interview Mock (credits included)',
  'Dedicated 1:1 job search advisor',
  'Resume submission & recruiter outreach',
  'Daily application progress updates',
  'Application progress tracking dashboard',
  'Proactive support during search',
  'Pre-interview warm-up reminders',
  'Annual networking events (2/year)',
  'Interview Insights Community (Unlimited)',
];

const STATE_A_COL2 = [
  'Full Mentor Marketplace access',
  'Mock interview sessions',
  'Resume review',
  'Salary negotiation & career planning',
  'Priority resume exposure',
  'Auto-apply',
  'Weekly members-only live sessions',
  '48-hour early event registration',
];

function FeatureItem({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center"
        style={{ background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.95)' }}
      >
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.8 7L9 1" stroke={dark ? '#FFFFFF' : '#2B7FFF'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.70)' : '#0f1f3d', fontWeight: 400, lineHeight: 1.4 }}>
        {label}
      </span>
    </div>
  );
}

function MembershipBanner({ isPremium, userName = 'Alex' }: { isPremium: boolean; userName?: string }) {
  if (isPremium) {
    /* ── State B: Active member — blue gradient image background ── */
    return (
      <div
        className="relative w-full overflow-hidden mb-6"
        style={{ borderRadius: 20, padding: 24 }}
      >
        {/* Background image */}
        <img
          src={memberBg}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ zIndex: 0 }}
        />
        {/* Overlay for readability */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(10,40,90,0) 0%, rgba(10,40,90,0.22) 100%)',
            zIndex: 1,
          }}
        />
        {/* Content */}
        <div className="relative" style={{ zIndex: 2 }}>
          <p style={{ fontSize: 24, fontWeight: 500, color: '#0f1f3d', marginBottom: 16, lineHeight: 1.3 }}>
            Thanks for being a Premium Member, {userName} 🎉
          </p>
          <div className="grid grid-cols-2" style={{ gap: '8px 32px' }}>
            <div className="flex flex-col gap-2">
              {FEATURES_COL1.map(f => <FeatureItem key={f} label={f} />)}
            </div>
            <div className="flex flex-col gap-2">
              {FEATURES_COL2.map(f => <FeatureItem key={f} label={f} />)}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 16 }}>
            Next billing: Jul 24, 2026 · $387.00
          </p>
        </div>
      </div>
    );
  }

  /* ── State A: Non-member — dark navy ── */
  return (
    <div
      className="relative w-full overflow-hidden mb-6"
      style={{ borderRadius: 20, padding: 24, background: '#0A1628' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(43,127,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(43,127,255,0.07) 0%, transparent 60%)',
          zIndex: 0,
        }}
      />
      <div className="relative" style={{ zIndex: 1 }}>
        <p style={{ fontSize: 24, fontWeight: 500, color: '#FFFFFF', marginBottom: 8, lineHeight: 1.3 }}>
          Unlock everything Screna has to offer
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 20, lineHeight: 1.5 }}>
          Join as a member to access mentorship, auto-apply, personalized coaching, and more.
        </p>
        <div className="grid grid-cols-2" style={{ gap: '8px 32px', marginBottom: 20 }}>
          <div className="flex flex-col gap-2">
            {STATE_A_COL1.map(f => <FeatureItem key={f} label={f} dark />)}
          </div>
          <div className="flex flex-col gap-2">
            {STATE_A_COL2.map(f => <FeatureItem key={f} label={f} dark />)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="px-5 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-90"
            style={{ background: '#FFFFFF', color: '#0f1f3d', fontSize: 14 }}
          >
            Upgrade to Member
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            From $99 / mo · Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Remove Card Modal ────────────────────────────────────────────────────────

function RemoveCardModal({ last4, onClose, onConfirm }: { last4: string; onClose: () => void; onConfirm: () => void }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    setRemoving(true);
    setTimeout(() => { onConfirm(); }, 900);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (!removing && e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className="bg-card w-[400px] rounded-2xl p-6"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-foreground mb-3" style={{ fontSize: 18 }}>Remove payment method?</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed" style={{ fontSize: 14 }}>
          Visa ending in {last4} will be removed from your account. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={removing}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-70"
            style={{ background: removing ? '#B42318' : '#D92D20' }}
            onMouseEnter={e => { if (!removing) e.currentTarget.style.background = '#B42318'; }}
            onMouseLeave={e => { if (!removing) e.currentTarget.style.background = '#D92D20'; }}
          >
            {removing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {removing ? 'Removing...' : 'Remove card'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add / Change Card Modal ──────────────────────────────────────────────────

function AddCardModal({ title, onClose, onSave }: {
  title: string;
  onClose: () => void;
  onSave: (last4: string, expiry: string, brand: string) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry,     setExpiry]     = useState('');
  const [cvc,        setCvc]        = useState('');
  const [name,       setName]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [focused,    setFocused]    = useState('');

  // Card brand detection from first digit
  const brand = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') || cardNumber.startsWith('2') ? 'Mastercard' : '';

  // Format card number with spaces every 4 digits
  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  // Format expiry MM / YY
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2);
    if (digits.length === 2) return digits + ' / ';
    return digits;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const rawNum = cardNumber.replace(/\s/g, '');
    if (rawNum.length < 16) e.cardNumber = 'Invalid card number';
    const rawExp = expiry.replace(/\s/g, '').replace('/', '');
    if (rawExp.length < 4) e.expiry = 'Invalid expiry date';
    else {
      const month = parseInt(rawExp.slice(0, 2));
      if (month < 1 || month > 12) e.expiry = 'Invalid expiry date';
      else {
        const yr = 2000 + parseInt(rawExp.slice(2));
        const now = new Date();
        if (yr < now.getFullYear() || (yr === now.getFullYear() && month < now.getMonth() + 1)) e.expiry = 'Card expired';
      }
    }
    if (cvc.length < 3) e.cvc = 'Required';
    if (!name.trim()) e.name = 'Required';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      const rawNum = cardNumber.replace(/\s/g, '');
      const last4  = rawNum.slice(-4);
      const rawExp = expiry.replace(/\s|\//g, '');
      const exp    = rawExp.slice(0, 2) + '/' + rawExp.slice(2);
      onSave(last4, exp, brand || 'Card');
    }, 900);
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    border: `1px solid ${errors[field] ? '#D92D20' : focused === field ? '#2B7FFF' : 'var(--color-border, #E5E5E5)'}`,
    boxShadow: focused === field && !errors[field] ? '0 0 0 3px rgba(43,127,255,0.12)' : 'none',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    background: saving ? '#F9F9F9' : 'var(--color-card, #fff)',
    color: 'var(--color-foreground, #111)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (!saving && e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className="bg-card w-[440px] rounded-2xl p-6"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="font-medium text-foreground" style={{ fontSize: 18 }}>{title}</p>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Card number */}
        <div className="mb-4">
          <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>Card number</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="•••• •••• •••• ____"
              value={cardNumber}
              disabled={saving}
              onChange={e => { setCardNumber(formatCardNumber(e.target.value)); setErrors(er => ({ ...er, cardNumber: '' })); }}
              onFocus={() => setFocused('cardNumber')}
              onBlur={() => setFocused('')}
              style={inputStyle('cardNumber')}
            />
            {brand && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ background: brand === 'Visa' ? '#1A1F71' : '#EB001B', color: '#fff' }}
              >
                {brand}
              </span>
            )}
          </div>
          {errors.cardNumber && <p style={{ fontSize: 12, color: '#D92D20', marginTop: 4 }}>{errors.cardNumber}</p>}
        </div>

        {/* Expiry + CVC */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>Expiry date</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="MM / YY"
              value={expiry}
              disabled={saving}
              onChange={e => { setExpiry(formatExpiry(e.target.value)); setErrors(er => ({ ...er, expiry: '' })); }}
              onFocus={() => setFocused('expiry')}
              onBlur={() => setFocused('')}
              style={inputStyle('expiry')}
            />
            {errors.expiry && <p style={{ fontSize: 12, color: '#D92D20', marginTop: 4 }}>{errors.expiry}</p>}
          </div>
          <div className="flex-1">
            <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>CVC</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="•••"
              value={cvc}
              disabled={saving}
              onChange={e => { setCvc(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors(er => ({ ...er, cvc: '' })); }}
              onFocus={() => setFocused('cvc')}
              onBlur={() => setFocused('')}
              style={inputStyle('cvc')}
            />
            {errors.cvc && <p style={{ fontSize: 12, color: '#D92D20', marginTop: 4 }}>{errors.cvc}</p>}
          </div>
        </div>

        {/* Name on card */}
        <div className="mb-6">
          <label className="block mb-1.5 font-medium text-foreground" style={{ fontSize: 13 }}>Name on card</label>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            disabled={saving}
            onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: '' })); }}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused('')}
            style={inputStyle('name')}
          />
          {errors.name && <p style={{ fontSize: 12, color: '#D92D20', marginTop: 4 }}>{errors.name}</p>}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-80"
            style={{ background: '#2B7FFF' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1A6CE8'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#2B7FFF'; }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving...' : 'Save card'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function PaymentToast({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={() => {
          setTimeout(onDone, 2800);
        }}
        className="fixed top-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-lg"
        style={{ background: '#F0FDF4', border: '1px solid #86EFAC', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#166534' }} />
        <p style={{ fontSize: 14, color: '#166534', fontWeight: 500 }}>{message}</p>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Old Billing Tab (superseded by /src/app/components/billing-tab.tsx) ─────

function _OldBillingTab_DO_NOT_USE() {
  const [switchPlanOpen,   setSwitchPlanOpen]   = useState(false);
  const [selectedPlan,     setSelectedPlan]     = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [cancelOpen,       setCancelOpen]       = useState(false);
  const [cancelReason,     setCancelReason]     = useState('');
  const [cancelComment,    setCancelComment]    = useState('');
  const [cancelSubmitted,  setCancelSubmitted]  = useState(false);
  const [showCancelModal,  setShowCancelModal]  = useState(false);
  // Demo toggle: true = within first 3 days (refund eligible)
  const [isRefundEligible, setIsRefundEligible] = useState(true);

  // Payment method state
  const [hasCard,          setHasCard]          = useState(true);
  const [pmHasMembership,  setPmHasMembership]  = useState(true);
  const [showRemoveModal,  setShowRemoveModal]  = useState(false);
  const [removingSecondary,setRemovingSecondary]= useState(false);
  const [tooltipVisible,   setTooltipVisible]   = useState(false);
  const [cardData,         setCardData]         = useState({ last4: '1733', expiry: '12/28', brand: 'Visa' });
  const [secondaryCard,    setSecondaryCard]    = useState<{ last4: string; expiry: string; brand: string } | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [addCardTitle,     setAddCardTitle]     = useState('Add payment method');
  const [toastMsg,         setToastMsg]         = useState<string | null>(null);

  const fireToast = (msg: string) => {
    setToastMsg(null);
    requestAnimationFrame(() => setToastMsg(msg));
  };

  const openAddCard = (title: string) => { setAddCardTitle(title); setShowAddCardModal(true); };

  const handleAddCardSave = (last4: string, expiry: string, brand: string) => {
    setShowAddCardModal(false);
    if (addCardTitle === 'Change payment method') {
      setCardData({ last4, expiry, brand });
      fireToast('Payment method updated');
    } else if (addCardTitle === 'Add new payment method') {
      setSecondaryCard(cardData);
      setCardData({ last4, expiry, brand });
      fireToast('Payment method added');
    } else {
      setHasCard(true);
      setCardData({ last4, expiry, brand });
      fireToast('Payment method added');
    }
  };

  const handleRemoveConfirm = () => {
    setShowRemoveModal(false);
    if (removingSecondary) {
      setSecondaryCard(null);
      setRemovingSecondary(false);
    } else {
      setHasCard(false);
      setPmHasMembership(false);
      setSecondaryCard(null);
    }
    fireToast('Payment method removed');
  };

  const PLANS = [
    { id: 'monthly',   name: 'Monthly',   price: '$159/mo', desc: 'billed monthly',          badge: null },
    { id: 'quarterly', name: 'Quarterly', price: '$129/mo', desc: '$387 every 3 months',      badge: { text: 'Current',  color: 'blue'  } },
    { id: 'annual',    name: 'Annual',    price: '$99/mo',  desc: '$1,188/year',              badge: { text: 'Save 38%', color: 'green' } },
  ] as const;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showCancelModal && <CancelConfirmModal onClose={() => setShowCancelModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAddCardModal && (
          <AddCardModal
            title={addCardTitle}
            onClose={() => setShowAddCardModal(false)}
            onSave={handleAddCardSave}
          />
        )}
      </AnimatePresence>
      {toastMsg && <PaymentToast message={toastMsg} onDone={() => setToastMsg(null)} />}

      {/* ── Membership Banner ── */}
      <MembershipBanner isPremium={pmHasMembership} />

      {/* ── Section 1: Membership ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Membership</p>
          {/* Demo state toggle */}
          <button
            onClick={() => { setIsRefundEligible(v => !v); setCancelOpen(false); setCancelSubmitted(false); }}
            className="px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            Demo: {isRefundEligible ? 'State A (refund eligible)' : 'State B (no refund)'}
          </button>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {/* Row 1 — Current plan */}
          <div className="px-5 py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Quarterly plan · $129/mo</span>
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Next billing: Jul 24, 2026 · $387.00</p>
              </div>
              <button
                onClick={() => setSwitchPlanOpen(v => !v)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors shrink-0 ml-4"
              >
                Switch plan
              </button>
            </div>

            {/* Switch plan panel */}
            <AnimatePresence>
              {switchPlanOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 bg-secondary rounded-lg overflow-hidden border border-border/60">
                    {PLANS.map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border/50 last:border-0 transition-colors ${
                          selectedPlan === plan.id ? 'bg-primary/5' : 'hover:bg-muted'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{plan.name}</span>
                            {plan.badge && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                plan.badge.color === 'blue'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-green-100 text-green-700'
                              }`}>{plan.badge.text}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{plan.price} · {plan.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-border bg-card'
                        }`}>
                          {selectedPlan === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 px-4 py-3 bg-card border-t border-border">
                      <button className="px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity">
                        Confirm change
                      </button>
                      <button
                        onClick={() => setSwitchPlanOpen(false)}
                        className="px-4 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Row 2 — Subscription history */}
          <div className="px-5 py-4 border-t border-border">
            <p className="text-xs font-medium text-foreground mb-3">Subscription history</p>
            <div className="space-y-2">
              {[
                { label: 'Quarterly plan started',              date: 'Jan 24, 2026' },
                { label: 'Upgraded from monthly to quarterly',  date: 'Jan 24, 2026' },
                { label: 'Monthly plan started',                date: 'Dec 10, 2025' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-4">{item.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3 — Cancel subscription */}
          <div className="px-5 py-4 border-t border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-destructive">Cancel subscription</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRefundEligible
                    ? 'Your access continues until Jul 24, 2026.'
                    : 'No refund applies. Access continues until Jul 24, 2026.'}
                </p>
              </div>
              {/* State A: ghost button  |  State B: plain text link */}
              {isRefundEligible ? (
                <button
                  onClick={() => setCancelOpen(v => !v)}
                  className="px-3 py-1.5 rounded-lg border border-destructive/50 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors shrink-0 ml-4"
                >
                  Request cancellation
                </button>
              ) : (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs text-destructive/60 hover:text-destructive transition-colors shrink-0 ml-4 hover:underline underline-offset-2"
                >
                  Cancel subscription
                </button>
              )}
            </div>

            {/* ── State A: inline expandable panel ── */}
            {isRefundEligible && (
              <AnimatePresence>
                {cancelOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {cancelSubmitted ? (
                      /* Submitted — gray confirmation */
                      <div className="mt-3 bg-secondary border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
                          <p className="text-xs font-medium text-foreground">Cancellation request submitted</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Our team will review your request within 24 hours. You'll receive an email confirmation
                          once approved, along with refund details to Visa ending 4242.
                        </p>
                      </div>
                    ) : (
                      /* Red form */
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-4">
                        <p className="text-xs font-medium text-red-600 mb-1">Request cancellation</p>
                        <p className="text-xs text-red-500/80 mb-3">
                          Tell us why you're leaving — our team will review and process your request within 24 hours.
                        </p>
                        <select
                          value={cancelReason}
                          onChange={e => setCancelReason(e.target.value)}
                          className="w-full h-8 rounded-lg border border-red-200 bg-white px-2.5 text-xs text-foreground mb-2.5 focus:outline-none focus:ring-1 focus:ring-red-300"
                        >
                          <option value="">Select a reason...</option>
                          <option>Found a job</option>
                          <option>Too expensive</option>
                          <option>Not using it enough</option>
                          <option>Missing features I need</option>
                          <option>Other</option>
                        </select>
                        <textarea
                          value={cancelComment}
                          onChange={e => setCancelComment(e.target.value)}
                          placeholder="Any additional comments (optional)"
                          rows={3}
                          className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs text-foreground mb-3 resize-none focus:outline-none focus:ring-1 focus:ring-red-300 placeholder:text-muted-foreground"
                        />
                        {/* Refund info row */}
                        <div className="flex items-start gap-2.5 bg-secondary rounded-lg px-3 py-2.5 mb-3">
                          <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Refund of <span className="text-foreground font-medium">$387.00</span> will be returned to
                            Visa ending 4242 within 5–10 business days upon approval.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCancelSubmitted(true)}
                            className="px-4 py-1.5 rounded-lg bg-destructive text-white text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            Submit request
                          </button>
                          <button
                            onClick={() => setCancelOpen(false)}
                            className="px-4 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50/80 transition-colors"
                          >
                            Keep subscription
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Credit balance ── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Credit balance</p>
        <div className="grid grid-cols-2 gap-3">

          {/* Left — dark card */}
          <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: '#111827' }}>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>Credit balance</span>
            </div>
            <div>
              <p className="leading-none font-medium text-white" style={{ fontSize: 32 }}>120</p>
              <p className="text-xs mt-1.5" style={{ color: '#6B7280' }}>1 interview ≈ 10 credits</p>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              <button className="w-full py-2 rounded-lg bg-white text-xs font-medium hover:opacity-90 transition-opacity" style={{ color: '#111827' }}>
                + Buy extra credits
              </button>
              <button className="w-full py-2 rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity" style={{ background: '#2563EB' }}>
                Redeem code
              </button>
            </div>
          </div>

          {/* Right — usage card */}
          <div className="rounded-xl bg-card border border-border p-5">
            <p className="text-xs font-medium text-foreground mb-4">This month's usage</p>
            <div className="space-y-3.5">
              {[
                { label: 'AI interviews',      used: 12, total: 30,  pct: 40, color: '#3B82F6' },
                { label: 'View Premium Posts', used: 8,  total: 20,  pct: 40, color: '#F59E0B' },
                { label: 'Job matches',        used: 45, total: 200, pct: 22, color: '#10B981' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs text-muted-foreground">{row.used} / {row.total}</span>
                  </div>
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">ⓘ Resets Mar 18, 2026</p>
          </div>
        </div>
      </div>

      {/* ── Section 3: Payment method ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>Payment method</p>
          {/* Demo state cycle: State 1 → State 2 → State 3 → repeat */}
          <button
            onClick={() => {
              if (hasCard && !pmHasMembership)     { setHasCard(true);  setPmHasMembership(true);  }
              else if (hasCard && pmHasMembership) { setHasCard(false); setPmHasMembership(false); }
              else                                 { setHasCard(true);  setPmHasMembership(false); }
            }}
            className="px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            {hasCard && !pmHasMembership  ? 'Demo: State 1 (card, no membership)' :
             hasCard && pmHasMembership   ? 'Demo: State 2 (card + membership)'   :
                                           'Demo: State 3 (no card)'}
          </button>
        </div>

        <AnimatePresence>
          {showRemoveModal && (
            <RemoveCardModal
              last4={removingSecondary ? (secondaryCard?.last4 ?? '') : cardData.last4}
              onClose={() => { setShowRemoveModal(false); setRemovingSecondary(false); }}
              onConfirm={handleRemoveConfirm}
            />
          )}
        </AnimatePresence>

        <div
          className="bg-card border border-border rounded-xl overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
        >
          {hasCard ? (
            /* ── States 1 & 2: card on file (+ optional two-card layout) ── */
            <div className="px-5 py-4">
              {secondaryCard ? (
                /* ── Two-card layout (after Flow C) ── */
                <>
                  {/* Default card */}
                  <p className="uppercase tracking-wider text-muted-foreground mb-2" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em' }}>Default</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6', border: '1px solid #E5E5E5' }}>
                        <CreditCard className="w-4 h-4" style={{ color: '#374151' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground" style={{ fontSize: 15 }}>{cardData.brand} ending in {cardData.last4}</p>
                          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 500, background: '#EFF6FF', color: '#2563EB' }}>Default</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>Expires {cardData.expiry}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openAddCard('Change payment method')}
                      className="font-medium transition-colors"
                      style={{ fontSize: 14, color: '#2B7FFF' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#1A6CE8')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#2B7FFF')}
                    >
                      Change
                    </button>
                  </div>

                  <div className="border-t border-border my-3" />

                  {/* Secondary card */}
                  <p className="uppercase tracking-wider text-muted-foreground mb-2" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.05em' }}>Also saved</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6', border: '1px solid #E5E5E5' }}>
                        <CreditCard className="w-4 h-4" style={{ color: '#374151' }} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground" style={{ fontSize: 15 }}>{secondaryCard.brand} ending in {secondaryCard.last4}</p>
                        <p className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>Expires {secondaryCard.expiry}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setRemovingSecondary(true); setShowRemoveModal(true); }}
                      className="font-medium transition-colors"
                      style={{ fontSize: 14, color: '#D92D20' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#B42318')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D92D20')}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="border-t border-border mt-3 pt-3">
                    <button
                      onClick={() => openAddCard('Add payment method')}
                      className="font-medium transition-colors"
                      style={{ fontSize: 13, color: '#2B7FFF' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#1A6CE8')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#2B7FFF')}
                    >
                      + Add another payment method
                    </button>
                  </div>
                </>
              ) : (
                /* ── Single card (States 1 & 2) ── */
                <>
                  {/* Card row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6', border: '1px solid #E5E5E5' }}>
                        <CreditCard className="w-4 h-4" style={{ color: '#374151' }} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground" style={{ fontSize: 15 }}>{cardData.brand} ending in {cardData.last4}</p>
                        <p className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>Expires {cardData.expiry}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openAddCard('Change payment method')}
                      className="font-medium transition-colors"
                      style={{ fontSize: 14, color: '#2B7FFF' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#1A6CE8')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#2B7FFF')}
                    >
                      Change
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border my-3" />

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {pmHasMembership ? (
                      /* State 2: disabled remove + tooltip + change payment method CTA */
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="cursor-not-allowed" style={{ fontSize: 14, color: '#A0A0A0' }}>
                            Remove payment method
                          </span>
                          <div className="relative">
                            <button
                              onMouseEnter={() => setTooltipVisible(true)}
                              onMouseLeave={() => setTooltipVisible(false)}
                              className="flex items-center"
                            >
                              <Info className="w-4 h-4" style={{ color: '#A0A0A0' }} />
                            </button>
                            {tooltipVisible && (
                              <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[220px] rounded-md px-3 py-2 z-10 pointer-events-none"
                                style={{ background: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                              >
                                <p className="text-white leading-relaxed" style={{ fontSize: 12 }}>
                                  You have an active membership. Add a new card first, or cancel your membership to remove this one.
                                </p>
                                <div
                                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                                  style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1A1A1A' }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => openAddCard('Add new payment method')}
                          className="flex items-center gap-1 font-medium transition-colors w-fit"
                          style={{ fontSize: 14, color: '#2B7FFF' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#1A6CE8')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#2B7FFF')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Change payment method
                        </button>
                      </div>
                    ) : (
                      /* State 1: add + remove */
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openAddCard('Add payment method')}
                          className="flex items-center gap-1 font-medium transition-colors w-fit"
                          style={{ fontSize: 14, color: '#2B7FFF' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#1A6CE8')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#2B7FFF')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add payment method
                        </button>
                        <button
                          onClick={() => { setRemovingSecondary(false); setShowRemoveModal(true); }}
                          className="w-fit hover:underline underline-offset-2 transition-colors"
                          style={{ fontSize: 14, color: '#D92D20' }}
                        >
                          Remove payment method
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── State 3: no card ── */
            <div className="flex flex-col items-center text-center px-6 py-8">
              <CreditCard className="w-8 h-8 mb-3" style={{ color: '#D0D0D0' }} />
              <p className="font-medium text-foreground mb-1" style={{ fontSize: 15 }}>No payment method saved</p>
              <p className="text-muted-foreground mb-5" style={{ fontSize: 13 }}>Add a card to enable future purchases.</p>
              <button
                onClick={() => openAddCard('Add payment method')}
                className="font-medium text-foreground rounded-lg border border-border transition-colors hover:bg-secondary"
                style={{ padding: '8px 16px', fontSize: 14 }}
              >
                + Add payment method
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Invoices ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Invoices</p>
          <p className="text-xs text-muted-foreground">Sent to alex@example.com</p>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 bg-secondary px-5 py-2.5 border-b border-border">
            {['Date', 'Amount', 'Status', 'Invoice'].map(h => (
              <span key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {[
              { date: 'Apr 24, 2026', amount: '$387.00' },
              { date: 'Jan 24, 2026', amount: '$387.00' },
              { date: 'Dec 10, 2025', amount: '$159.00' },
            ].map((inv, i) => (
              <div key={i} className="grid grid-cols-4 items-center px-5 py-3.5">
                <span className="text-xs text-muted-foreground">{inv.date}</span>
                <span className="text-xs text-primary">{inv.amount}</span>
                <span>
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">Paid</span>
                </span>
                <button className="text-xs font-medium text-primary hover:text-primary/70 transition-colors text-left flex items-center gap-1">
                  <Download className="w-3 h-3" />Download
                </button>
              </div>
            ))}
          </div>
        </div>
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
      <div className="flex gap-8 items-start">
        {/* Left sidebar nav */}
        <aside className="w-48 shrink-0">
          <nav className="flex flex-col gap-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left w-full transition-colors ${
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
        <main className="flex-1 min-w-0">
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