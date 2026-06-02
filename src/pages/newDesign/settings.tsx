import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router';
import { User, Shield, CreditCard, Mail, Lock, CheckCircle2, Eye, EyeOff, KeyRound, Send, Loader2 } from 'lucide-react';
import { DashboardLayout } from '../../components/newDesign/dashboard-layout';
import { Input } from '../../components/newDesign/ui/input';
import { Label } from '../../components/newDesign/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalInfo, savePersonalInfo, changePassword } from '@/services/ProfileServices';
import { BillingTab } from './billing';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',       label: 'Account',       icon: User       },
  { id: 'security',      label: 'Security',      icon: Shield     },
  // { id: 'notifications', label: 'Notifications', icon: Bell       },
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

// ─── Shared primitives ────────────────────────────────────────────────────────

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

// ─── Set Password Modal (Google-only users) ───────────────────────────────────

function SetPasswordModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 800);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className="bg-card w-[400px] rounded-xl shadow-2xl p-8 flex flex-col items-center text-center"
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-foreground mb-2">Check your inbox</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We sent a secure link to{' '}
              <span className="text-foreground font-medium">{email}</span>.
              The link expires in 24 hours.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
            <p className="text-xs text-muted-foreground mt-4">You can still log in with Google at any time.</p>
          </>
        ) : (
          <>
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-card shadow-sm flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                  <Mail className="w-2.5 h-2.5 text-primary" />
                </div>
              </div>
            </div>
            <h2 className="text-foreground mb-2">Set a password for your account</h2>
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
              We'll send a secure link to{' '}
              <span className="text-foreground font-medium">{email}</span>.
              Click the link to create a password for email login.
            </p>
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {sending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
              ) : (
                <><Send className="w-3.5 h-3.5" />Send me the link</>
              )}
            </button>
            <button onClick={onClose} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <p className="text-xs text-muted-foreground mt-5">You can still log in with Google at any time.</p>
          </>
        )}
      </motion.div>
    </motion.div>
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

function PwdInput({ id, value, onChange, show, onToggle, placeholder }: {
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
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const score = getStrengthScore(newPwd);
  const isValid = curPwd.length > 0 && score >= 3 && confirmPwd.length > 0 && newPwd === confirmPwd;

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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              <div className="space-y-1.5 mb-4">
                <Label htmlFor="cp-cur">Current password</Label>
                <PwdInput id="cp-cur" value={curPwd} onChange={setCurPwd} show={showCur} onToggle={() => setShowCur(v => !v)} />
              </div>
              <div className="space-y-1.5 mb-4">
                <Label htmlFor="cp-new">New password</Label>
                <PwdInput id="cp-new" value={newPwd} onChange={setNewPwd} show={showNew} onToggle={() => setShowNew(v => !v)} />
                {newPwd.length > 0 && <SegmentBar score={score} />}
                <p className="text-xs text-muted-foreground mt-1.5">At least 8 characters, 1 number, 1 uppercase</p>
              </div>
              <div className="space-y-1.5 mb-4">
                <Label htmlFor="cp-confirm">Confirm new password</Label>
                <PwdInput id="cp-confirm" value={confirmPwd} onChange={setConfirmPwd} show={showConf} onToggle={() => setShowConf(v => !v)} placeholder="Re-enter new password" />
                {confirmPwd.length > 0 && newPwd !== confirmPwd && (
                  <p className="text-xs text-destructive mt-1">Passwords don't match</p>
                )}
              </div>
              {error && <p className="text-xs text-destructive mb-4">{error}</p>}
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuth();
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [timezone,    setTimezone]    = useState('Pacific Time (US & Canada)');
  const [avatarUrl,   setAvatarUrl]   = useState('');
  const [emailFlow,   setEmailFlow]   = useState<'closed' | 'open' | 'sent'>('closed');
  const [curPwd,      setCurPwd]      = useState('');
  const [newEmail,    setNewEmail]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleteStep,  setDeleteStep]  = useState<0 | 1>(0);

  useEffect(() => {
    getPersonalInfo()
      .then((res: { data: { data?: Record<string, string>; name?: string; email?: string; timezone?: string; avatarUrl?: string } }) => {
        const info = res.data?.data ?? res.data;
        if (!info) return;
        const [first, ...rest] = (info.name || '').trim().split(' ');
        setFirstName(first || '');
        setLastName(rest.join(' ') || '');
        setEmail(info.email || '');
        setTimezone(info.timezone || 'Pacific Time (US & Canada)');
        setAvatarUrl(info.avatarUrl || '');
      })
      .catch(() => {
        if (user) {
          const parts = (user.name || '').trim().split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
          setEmail(user.email || '');
          setAvatarUrl(user.avatar || '');
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

  const initials = (firstName[0] || email[0] || '?').toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-foreground">Account Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Update your account's profile information and email address.</p>
        </div>
        {avatarUrl ? (
          <img src={avatarUrl} alt={firstName} className="w-12 h-12 rounded-full object-cover border border-border shrink-0 ml-6" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 ml-6">
            <span className="text-primary font-semibold text-base">{initials}</span>
          </div>
        )}
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
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pr-20" />
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
          <p className="text-xs text-muted-foreground">A verification link will be sent to your new email address.</p>

          <AnimatePresence>
            {emailFlow === 'open' && (
              <motion.div key="email-open" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                <div className="mt-2 p-4 bg-secondary border border-border rounded-lg space-y-3">
                  <p className="text-sm font-medium text-foreground">Change email address</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="curPwdEmail">Current password</Label>
                    <Input id="curPwdEmail" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="Enter your password" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newEmailAddr">New email address</Label>
                    <Input id="newEmailAddr" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="you@newdomain.com" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <DarkBtn onClick={() => setEmailFlow('sent')}>Send verification email</DarkBtn>
                    <GhostBtn onClick={() => setEmailFlow('closed')}>Cancel</GhostBtn>
                  </div>
                </div>
              </motion.div>
            )}
            {emailFlow === 'sent' && (
              <motion.div key="email-sent" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-sm font-medium text-green-700">Verification email sent</p>
                  </div>
                  <p className="text-sm text-green-600/80 ml-6">Check your new inbox and click the link to confirm. The link expires in 24 hours.</p>
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
          <DarkBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</DarkBtn>
        </div>
      </form>

      {/* Data & Account */}
      {/* <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Data &amp; Account</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="mt-3 flex items-start gap-3 px-4 py-3.5 rounded-lg border border-destructive/30 bg-destructive/5">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-destructive">Are you sure you want to delete your account?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This will permanently erase all your data, interview history, and progress. This action cannot be undone.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setDeleteStep(0)} className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => setDeleteStep(0)} className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                        Yes, delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div> */}
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const { user } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showSetPwd,    setShowSetPwd]    = useState(false);
  const [hasPassword,   setHasPassword]   = useState(false);

  const email = user?.email ?? '';

  return (
    <>
      <AnimatePresence>
        {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
        {showSetPwd    && <SetPasswordModal email={email} onClose={() => setShowSetPwd(false)} />}
      </AnimatePresence>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-border flex items-start justify-between">
          <div>
            <h2 className="text-foreground">Security</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your password and connected login methods.</p>
          </div>
          <button
            onClick={() => setHasPassword(v => !v)}
            className="shrink-0 ml-4 px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            Demo: {hasPassword ? 'Has password' : 'Google only'}
          </button>
        </div>

        <div className="divide-y divide-border">
          {/* Password row */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasPassword ? 'Last changed 3 months ago' : 'Not set — Google login only'}
                </p>
              </div>
            </div>
            {hasPassword ? (
              <button
                onClick={() => setShowChangePwd(true)}
                className="px-3.5 py-1.5 rounded-md border border-foreground/70 bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Change password
              </button>
            ) : (
              <button
                onClick={() => setShowSetPwd(true)}
                className="px-3.5 py-1.5 rounded-md border border-primary/60 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                Set a password
              </button>
            )}
          </div>

          {/* Google login row */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
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
                <p className="text-xs text-muted-foreground mt-0.5">Connected · {email}</p>
              </div>
            </div>
            <button className="px-3.5 py-1.5 rounded-md border border-destructive/60 bg-card text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors">
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

const NOTIF_ITEMS = [
  { key: 'applicationUpdates', title: 'Application updates',      desc: 'When a job application changes status',           default: true  },
  { key: 'actionNeeded',       title: 'Action needed',            desc: 'When a job requires your review before submitting', default: true  },
  { key: 'mentorReminders',    title: 'Mentor session reminders', desc: '24 hours before a scheduled session',            default: true  },
  { key: 'preInterview',       title: 'Pre-interview warm-up',    desc: 'Morning of a scheduled interview',               default: false },
] as const;

function NotificationsTab() {
  const [state, setState] = useState(() =>
    Object.fromEntries(NOTIF_ITEMS.map(({ key, default: d }) => [key, d]))
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Choose what updates you want to receive.</p>
      </div>
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
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TAB_PANELS: Record<string, React.ReactNode> = {
  profile:       <ProfileTab />,
  security:      <SecurityTab />,
  notifications: <NotificationsTab />,
  billing:       <BillingTab />,
};

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const validIds = new Set(TABS.map(t => t.id));
  const [activeTab, setActiveTab] = useState((urlTab && validIds.has(urlTab) ? urlTab : null) ?? 'profile');

  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]);

  return (
    <DashboardLayout headerTitle="Settings">
      <div>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Activity &amp; Account
          </p>
          <h1 className="text-foreground">Settings</h1>
        </div>

        <div className="flex gap-8 items-start">
          {/* Sidebar */}
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
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
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
      </div>
    </DashboardLayout>
  );
}
