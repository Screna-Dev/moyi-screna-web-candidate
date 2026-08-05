import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Copy, Gift, Check, Link2, Share2, User, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { getReferralOverview, getReferralHistory } from '@/services/ReferralServices';
import { toast } from 'sonner';

// ─── Clipboard helper (falls back to execCommand) ─────────
function copyText(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => execFallback(text));
  }
  return execFallback(text);
}
function execFallback(text: string): Promise<void> {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(el); }
  return Promise.resolve();
}

// ─── Color tokens ─────────────────────────────────────────
const C = {
  blue:    '#3F76EF',
  green:   '#22A280',
  greenBg: '#E8F3F1',
  text:    '#1E232E',
  muted:   '#6B7280',
  border:  '#E5EAF2',
  segEmpty:'#DDE3EE',
};

// Credits it takes to run one full AI Mock — used only to translate the earned
// credit balance into a "≈ N free Mocks" hint. Same rate the reward copy uses.
const CREDITS_PER_MOCK = 30;

// ─── Types ────────────────────────────────────────────────
type ReferralStatus = 'PENDING' | 'REWARDED' | 'VOIDED';

interface Referral {
  referredUserId: string;
  referredUserName: string;
  referrerCreditAmount: number;
  referrerRewardedAt: string | null;
  status: ReferralStatus;
}

interface Overview {
  referralCode: string;
  totalEarnedCredits: number;
  successfulReferrals: number;
  pendingInvites: number;
}

interface PageMeta {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

// ─── 2-segment progress bar ───────────────────────────────
// Segment 1 = signed up with the code (true for every row that exists at all),
// segment 2 = finished onboarding by uploading a resume (i.e. reward granted).
function TwoSegBar({ signedUp, resumeUploaded }: { signedUp: boolean; resumeUploaded: boolean }) {
  return (
    <div className="flex gap-1 my-1" style={{ width: 72 }}>
      <div className="h-1 flex-1 rounded-full transition-colors" style={{ background: signedUp ? C.blue : C.segEmpty }} />
      <div className="h-1 flex-1 rounded-full transition-colors" style={{ background: resumeUploaded ? C.blue : C.segEmpty }} />
    </div>
  );
}

// ─── Referral row ─────────────────────────────────────────
function ReferralRow({ referral, last }: { referral: Referral; last: boolean }) {
  const name = referral.referredUserName || 'Screna user';
  const initials = name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const rewarded = referral.referrerRewardedAt !== null;
  const voided = referral.status === 'VOIDED';
  const date = formatDate(referral.referrerRewardedAt);

  return (
    <div
      className={`flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-black/[0.015] ${last ? '' : 'border-b'}`}
      style={{ borderColor: C.border, opacity: voided ? 0.55 : 1 }}
    >
      {/* Left */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ fontFamily: 'var(--font-sans)', background: 'rgba(63,118,239,0.1)', color: C.blue }}
        >
          {initials || '·'}
        </div>
        <div>
          <p
            className="text-sm font-medium"
            style={{ fontFamily: 'var(--font-sans)', color: C.text, margin: 0, textDecoration: voided ? 'line-through' : 'none' }}
          >
            {name}
          </p>
          <TwoSegBar signedUp={!voided} resumeUploaded={rewarded} />
          <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: C.muted, margin: 0 }}>
            {rewarded ? date : voided ? 'Invite cancelled' : 'Signed up'}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {referral.status === 'REWARDED' && <>
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-sans)', color: C.green, margin: 0, lineHeight: 1 }}>+{referral.referrerCreditAmount}</p>
          <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: C.muted, margin: 0 }}>Credited</p>
        </>}
        {referral.status === 'PENDING' && <>
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-sans)', color: C.muted, margin: 0, lineHeight: 1 }}>+{referral.referrerCreditAmount}</p>
          <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: C.muted, margin: 0 }}>Waiting on resume</p>
        </>}
        {referral.status === 'VOIDED' && <>
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-sans)', color: C.muted, margin: 0, lineHeight: 1 }}>—</p>
          <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: C.muted, margin: 0 }}>Cancelled</p>
        </>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
export function ReferEarnPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const referralCode = overview?.referralCode ?? '';
  const inviteLink = referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : '';

  // Overview — code + earnings. Loaded once.
  useEffect(() => {
    let cancelled = false;
    getReferralOverview()
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data ?? res.data;
        setOverview(data ?? null);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to load referral overview:', err);
        toast.error('Could not load your invite code. Please refresh.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // History — paged, 10 per page (page size is fixed server-side).
  const loadHistory = useCallback((p: number) => {
    setHistoryLoading(true);
    getReferralHistory(p)
      .then(res => {
        const data = res.data?.data ?? res.data;
        setReferrals(data?.content ?? []);
        setPageMeta(data?.pageMeta ?? null);
      })
      .catch(err => {
        console.error('Failed to load referral history:', err);
        toast.error('Could not load your referral history.');
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { loadHistory(page); }, [page, loadHistory]);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await copyText(referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Please copy manually.');
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    copyText(inviteLink)
      .then(() => toast.success('Invite link copied!'))
      .catch(() => toast.error('Could not copy. Please copy manually.'));
  };

  const totalEarned = overview?.totalEarnedCredits ?? 0;
  const freeMocks = Math.floor(totalEarned / CREDITS_PER_MOCK);
  const invited = pageMeta?.totalElements ?? 0;
  const joined = overview?.successfulReferrals ?? 0;
  const pending = overview?.pendingInvites ?? 0;
  const totalPages = pageMeta?.totalPages ?? 0;

  return (
    <DashboardLayout headerTitle="Refer & Earn">
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── BLOCK 1: HERO ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, #3E78EF, #39A9E4)',
            borderRadius: 16, padding: '36px 32px', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(63,118,239,0.2)', position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Decorative ghost icon */}
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 24, opacity: 0.07, pointerEvents: 'none' }}>
            <Gift style={{ width: 160, height: 160, color: '#fff', transform: 'rotate(12deg)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 500, margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '26px', fontWeight: 700, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>
              Give a Mock, Get a Mock
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14.5px', color: 'rgba(255,255,255,0.88)', margin: '0 0 24px', lineHeight: 1.55 }}>
              You and your friend each get 30 credits — about one full AI Mock — once they sign up and upload their resume.
            </p>

            {/* Code label */}
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
              Your invite code
            </p>

            {/* Code field */}
            <div style={{
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
              borderRadius: 12, padding: '6px 6px 6px 18px',
              display: 'flex', alignItems: 'center', gap: 8,
              maxWidth: 360, margin: '0 auto 14px',
              border: '1px solid rgba(255,255,255,0.22)',
            }}>
              <span style={{ flex: 1, textAlign: 'left', fontFamily: 'monospace', fontSize: '17px', letterSpacing: '0.12em', fontWeight: 600, color: '#fff' }}>
                {loading ? '········' : referralCode || '—'}
              </span>
              <Button
                onClick={handleCopy}
                disabled={!referralCode}
                style={{ background: '#fff', color: C.blue, fontFamily: 'var(--font-sans)', fontWeight: 600, minWidth: 86, boxShadow: 'none', flexShrink: 0 }}
                className="hover:opacity-90 transition-opacity"
              >
                {copied
                  ? <><Check style={{ width: 13, height: 13, marginRight: 5 }} />Copied</>
                  : <><Copy style={{ width: 13, height: 13, marginRight: 5 }} />Copy</>}
              </Button>
            </div>

            {/* Copy invite link */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <button
                onClick={handleCopyLink}
                disabled={!inviteLink}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: '12.5px', fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)', background: 'none', border: 'none',
                  padding: 0, cursor: inviteLink ? 'pointer' : 'default',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
                className="hover:opacity-75 transition-opacity"
              >
                <Link2 style={{ width: 13, height: 13 }} />
                Copy invite link instead
              </button>
            </div>

            {/* Pill */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500,
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 999, padding: '4px 14px', display: 'inline-block',
              }}>
                New friends start with 60 credits
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── BLOCK 2: STEPS STRIP (no card) ─────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '4px 8px', flexWrap: 'wrap' as const }}
        >
          {[
            { Icon: Share2, label: 'Share your code' },
            { Icon: User,   label: 'They sign up & upload a resume' },
            { Icon: Gift,   label: 'You both get 30 credits' },
          ].map(({ Icon, label }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {i > 0 && (
                <ArrowRight style={{ width: 14, height: 14, color: C.segEmpty, flexShrink: 0, margin: '0 10px' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon style={{ width: 14, height: 14, color: C.muted, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: C.muted, whiteSpace: 'nowrap' as const }}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── BLOCK 3: COMBINED CARD ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}
        >
          {/* Card header row — stats */}
          <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const }}>
            {/* Left: icon + credits + mocks */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Gift style={{ width: 16, height: 16, color: C.green }} />
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 700, color: C.text }}>
                {totalEarned} credits
              </span>
              {freeMocks > 0 && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: C.muted }}>
                  ≈ {freeMocks} free {freeMocks === 1 ? 'Mock' : 'Mocks'}
                </span>
              )}
            </div>
            {/* Right: rewarded / pending split */}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: C.muted, flexShrink: 0 }}>
              {joined} rewarded · {pending} pending
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: C.border }} />

          {/* History sub-header */}
          <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13.5px', fontWeight: 600, color: C.text }}>
              Referral History
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: C.muted }}>
              {invited} invited · {joined} joined
            </span>
          </div>

          {/* Rows */}
          {historyLoading ? (
            <div style={{ padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: `1px solid ${C.border}` }}>
              <Loader2 style={{ width: 18, height: 18, color: C.muted }} className="animate-spin" />
            </div>
          ) : referrals.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderTop: `1px solid ${C.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Gift style={{ width: 18, height: 18, color: '#9CA3AF' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: C.text, margin: 0 }}>No invites yet</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: C.muted, margin: 0 }}>Share your code to start earning credits.</p>
              <button
                onClick={handleCopyLink}
                disabled={!inviteLink}
                style={{
                  marginTop: 4, fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500,
                  color: '#fff', background: C.blue, border: 'none',
                  borderRadius: 8, padding: '8px 18px', cursor: inviteLink ? 'pointer' : 'default',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Link2 style={{ width: 13, height: 13 }} />
                Copy invite link
              </button>
            </div>
          ) : (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {referrals.map((r, i) => (
                <ReferralRow key={r.referredUserId} referral={r} last={i === referrals.length - 1} />
              ))}
            </div>
          )}

          {/* Pagination — page size is fixed at 10 server-side */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: C.muted }}>
                Page {page + 1} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={pageMeta?.first ?? page === 0}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--font-sans)', fontSize: '12.5px',
                    color: (pageMeta?.first ?? page === 0) ? '#C3CAD6' : C.text,
                    background: 'none', border: `1px solid ${C.border}`, borderRadius: 7,
                    padding: '5px 10px', cursor: (pageMeta?.first ?? page === 0) ? 'default' : 'pointer',
                  }}
                >
                  <ChevronLeft style={{ width: 13, height: 13 }} />Prev
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={pageMeta?.last ?? true}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--font-sans)', fontSize: '12.5px',
                    color: (pageMeta?.last ?? true) ? '#C3CAD6' : C.text,
                    background: 'none', border: `1px solid ${C.border}`, borderRadius: 7,
                    padding: '5px 10px', cursor: (pageMeta?.last ?? true) ? 'default' : 'pointer',
                  }}
                >
                  Next<ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── FOOTER LINE ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#A0AABA', margin: 0 }}>
            Credits land automatically once your friend uploads a resume ·{' '}
            <button
              onClick={() => setShowTerms(v => !v)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#A0AABA', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Terms
            </button>
          </p>
        </div>

        {/* Terms expand */}
        {showTerms && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#F9FAFB', borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 18px' }}
          >
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: C.muted, margin: 0, lineHeight: 1.7 }}>
              One invite code per person. Credits have no cash value and {"can't"} be transferred. Screna may withhold credits for invites that appear to be duplicate or inauthentic accounts.
            </p>
          </motion.div>
        )}

      </div>
    </DashboardLayout>
  );
}
