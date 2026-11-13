import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Button, Dialog, cx } from '@/components/admin/console/pages/employer/ui';
import { CardLabel, OutlineButton, PlanCard, UsageBar } from '@/components/admin/console/pages/employer/views/PlanUsageView';
import { authErrorCode, authErrorMessage } from './employerAuth';
import {
  cancelEmployerPlan,
  clearOverageCap,
  getEmployerPlan,
  getEmployerPlanPrices,
  resumeEmployerPlan,
  setOverageCap,
  switchEmployerPlanToAnnual,
  type BusinessBillingCycle,
  type EmployerPlan,
  type EmployerPlanPrices,
} from './employerApi';
import { useEmployerCredits } from './creditsContext';
import { businessCheckoutError, openBusinessCheckout } from './businessCheckout';
import { formatInZone } from './jobMapping';
import { formatMoney } from './money';

// Employer-app Plan & Usage: the design (Figma 2451:1052, as in the admin
// console's PlanUsageView) fed by GET /employer/plan. Real where the API has
// it: plan, billing cycle, period end, cancellation, allowance usage, overage
// spent and cap; on Free, the credits left (GET /employer/credits); prices
// from GET /employer/plan/prices (nothing shown while loading or if Stripe is
// unreadable, never a guessed price). Seats and invoices wait for the
// billing portal (past-due has no card-update UI, only the email note): hidden behind
// BILLING_PORTAL_ENABLED (markup kept). Added for the API: subscribe with a
// billing-cycle choice, cancel / resume, the past-due and cap-reached notes,
// and the post-Stripe "confirming" state.

// Seats and the invoice list/download. Off until the billing portal ships.
export const BILLING_PORTAL_ENABLED = false;

const SALES_EMAIL = 'operations@screna.ai';
const mono = 'font-[family-name:var(--font-mono)]';
const usd = (n: number, cents = true) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

const POLL_MS = 2000;
const POLL_LIMIT_MS = 30_000;

const dateOf = (iso: string | null) => (iso ? formatInZone(iso, null, false) : '—');
const dollars = (cents: number) => cents / 100;

export function EmployerPlanView({ checkout }: { checkout?: 'success' | 'cancelled' }) {
  const store = useEmployerStore();
  const { credits, plan: shellPlan, refresh: refreshShell } = useEmployerCredits();
  // The shell has usually loaded the plan already: show it at once, then the
  // fresh read below replaces it.
  const [plan, setPlan] = useState<EmployerPlan | null>(shellPlan ?? null);
  const [loadError, setLoadError] = useState(false);
  const [confirming, setConfirming] = useState(checkout === 'success');
  const [busy, setBusy] = useState<string | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cap, setCap] = useState(shellPlan?.overage?.capCents == null ? '' : String(dollars(shellPlan.overage.capCents)));
  const [prices, setPrices] = useState<EmployerPlanPrices | null>(null);

  const apply = useCallback((p: EmployerPlan) => {
    setPlan(p);
    setCap(p.overage?.capCents == null ? '' : String(dollars(p.overage.capCents)));
  }, []);

  // Fresh numbers on every visit: usage changes server-side (a candidate
  // starting a sponsored interview) without anything happening in this tab.
  useEffect(() => {
    refreshShell();
    // Once per visit; refreshShell is a new function on every shell render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    getEmployerPlan()
      .then((p) => !cancelled && apply(p))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Live prices; on error (500 when Stripe is unreadable) prices stay null and
  // every price label is left out.
  useEffect(() => {
    let cancelled = false;
    getEmployerPlanPrices()
      .then((p) => !cancelled && setPrices(p))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Back from Stripe: the subscription lands by webhook, usually in seconds.
  useEffect(() => {
    if (checkout === 'cancelled') {
      toast('Checkout cancelled. Nothing was charged.', { id: 'employer-plan-checkout' });
      return;
    }
    if (checkout !== 'success') return;
    let cancelled = false;
    const deadline = Date.now() + POLL_LIMIT_MS;
    (async () => {
      for (;;) {
        try {
          const p = await getEmployerPlan();
          if (cancelled) return;
          if (p.plan === 'BUSINESS') {
            apply(p);
            refreshShell();
            toast.success("You're on Business.", { id: 'employer-plan-checkout' });
            break;
          }
        } catch {
          /* keep polling until the deadline */
        }
        if (Date.now() > deadline) {
          toast('Your payment is still processing. Refresh in a moment.', { id: 'employer-plan-checkout' });
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (cancelled) return;
      }
      if (!cancelled) setConfirming(false);
    })();
    return () => {
      cancelled = true;
    };
    // refreshShell is a fresh function per shell render; poll once per return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, apply]);

  const run = async (label: string, fn: () => Promise<EmployerPlan>, done: string) => {
    if (busy) return;
    setBusy(label);
    try {
      apply(await fn());
      refreshShell();
      toast.success(done);
    } catch (err) {
      const code = authErrorCode(err);
      toast.error(
        code === 'PLAN_PAYMENT_FAILED'
          ? "The payment for annual billing didn't go through, so your plan hasn't changed. Check your payment method and try again."
          : code === 'CONFLICT'
            ? 'Your subscription is syncing. Try again in a moment.'
            : authErrorMessage(err) || 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  // Stays busy until the redirect: a second checkout would be a second charge.
  const subscribe = async (cycle: BusinessBillingCycle) => {
    setBusy('subscribe');
    try {
      await openBusinessCheckout(cycle);
    } catch (err) {
      toast.error(businessCheckoutError(err));
      setBusy(null);
    }
  };

  const saveCap = () => {
    const raw = cap.trim();
    // Blank = no cap (DELETE); 0 = no overage at all.
    if (!raw) return void run('cap', clearOverageCap, 'Overage cap removed');
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a cap of $0 or more');
      return;
    }
    void run('cap', () => setOverageCap(Math.round(n * 100)), `Overage cap set to ${usd(n, false)}`);
  };

  if (!plan) {
    return (
      <div className="flex flex-col gap-5 pb-12">
        <h1 className="text-[24px] leading-9 font-extrabold text-[#0a0a0a]">Plan &amp; Usage</h1>
        <p className="text-[13px] text-[#4a4d57] flex items-center gap-2">
          {loadError ? (
            'Could not load your plan. Refresh to try again.'
          ) : (
            <>
              <RefreshCw size={14} className="animate-spin" /> Loading…
            </>
          )}
        </p>
      </div>
    );
  }

  const business = plan.plan === 'BUSINESS';
  const annual = plan.billingCycle === 'ANNUAL';
  const pastDue = plan.status === 'past_due';
  const a = plan.allowance;
  const o = plan.overage;
  // Sample: the API has no seats or invoices yet (only shown with BILLING_PORTAL_ENABLED).
  const sample = store.plan;
  const monthlyPrice = prices ? formatMoney(prices.business.monthly) : null;
  const annualPrice = prices ? formatMoney(prices.business.annual) : null;
  const currentPrice = annual ? annualPrice && `${annualPrice}/year` : monthlyPrice && `${monthlyPrice}/month`;
  const unlocksIncluded = a?.reports.included ?? prices?.business.reportAllowance ?? null;

  return (
    <div className="flex flex-col gap-5 pb-12">
      <h1 className="text-[24px] leading-9 font-extrabold text-[#0a0a0a]">Plan &amp; Usage</h1>

      {confirming && (
        <div className="flex items-center gap-2 rounded-xl border border-[#e8e8ea] bg-[#f5f6fa] px-4 py-3 text-[13px] text-[#4a4d57]">
          <RefreshCw size={14} className="animate-spin" /> Confirming your payment… This usually takes a few seconds.
        </div>
      )}

      {business ? (
        <PlanCard>
          <CardLabel>Current plan</CardLabel>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[22px] leading-[33px] font-extrabold text-[#0a0a0a]">Business</span>
                {currentPrice && (
                  <span className="px-2.5 py-[3px] rounded-full bg-[#eef2ff] text-[#2e5bff] text-[12px] leading-[18px] font-semibold">{currentPrice}</span>
                )}
              </div>
              <p className="text-[13px] leading-[19.5px] text-[#4a4d57]">
                {plan.cancelAtPeriodEnd ? `Ends ${dateOf(plan.currentPeriodEnd)}, then returns to Free` : `Renews ${dateOf(plan.currentPeriodEnd)}`}
                {BILLING_PORTAL_ENABLED && ` · ${sample.seatsUsed} of ${sample.seats} seats in use`}
              </p>
              {pastDue && (
                <p className="text-[13px] leading-[19.5px] text-[#dc2626]">
                  {/* No self-serve card update (billing portal postponed): the email route is the only fix. */}
                  Your last payment failed. Your allowance still works, but no overage until billing is up to date. Email {SALES_EMAIL} to update your payment method.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!annual && !pastDue && !plan.cancelAtPeriodEnd && (
                <OutlineButton onClick={() => void run('annual', switchEmployerPlanToAnnual, 'Switched to annual billing')}>
                  {busy === 'annual' ? 'Switching…' : annualPrice ? `Switch to annual · ${annualPrice}` : 'Switch to annual'}
                </OutlineButton>
              )}
              {BILLING_PORTAL_ENABLED && (
                <OutlineButton tone="gray" onClick={() => toast.info(`Changing seats isn't self-serve yet. Email ${SALES_EMAIL} and we'll set it up.`)}>
                  Manage seats
                </OutlineButton>
              )}
              {plan.cancelAtPeriodEnd ? (
                <OutlineButton onClick={() => void run('resume', resumeEmployerPlan, 'Your Business plan will keep renewing')}>
                  {busy === 'resume' ? 'Resuming…' : 'Resume'}
                </OutlineButton>
              ) : (
                <OutlineButton tone="gray" onClick={() => setCancelOpen(true)}>
                  Cancel plan
                </OutlineButton>
              )}
            </div>
          </div>
          <div className="mt-5 pt-5 border-t-2 border-[#e8e8ea] flex flex-col gap-4">
            <p className="text-[12px] leading-[18px] font-bold uppercase tracking-[0.5px] text-[#90a1b9]">
              Usage this period{a ? ` · ${dateOf(a.periodStart)} – ${dateOf(a.periodEnd)}` : ''}
            </p>
            <UsageBar label="Report unlocks" used={a?.reports.used ?? 0} total={a?.reports.included ?? 0} color="#2e5bff" />
            <UsageBar
              label="Sponsored interviews"
              used={a ? a.interviews.used + a.interviews.held : 0}
              total={a?.interviews.included ?? 0}
              color="#22c55e"
            />
            {a && a.interviews.held > 0 && (
              <p className="text-[12px] text-[#4a4d57]">{a.interviews.held} held for interviews in progress.</p>
            )}
          </div>
        </PlanCard>
      ) : (
        <PlanCard className="border-dashed bg-[rgba(248,250,252,0.6)] shadow-none">
          <CardLabel>Current plan</CardLabel>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[16px] leading-6 font-bold text-[#0a0a0a]">Free</span>
              <span className="text-[13px] leading-[19.5px] text-[#4a4d57]">
                {/* A Free org's unlocks and sponsored interviews are its Report / Interview
                    Credits (GET /employer/credits, same as the sidebar). The API has no
                    "of N" total, so only what's left is shown. */}
                {credits ? `${credits.report} free unlocks left · ${credits.interview} sponsored interviews left` : 'Loading your balance…'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <OutlineButton onClick={() => window.open('/employers#pricing', '_blank', 'noopener')}>See Business</OutlineButton>
              <button
                type="button"
                disabled={busy === 'subscribe' || confirming}
                onClick={() => setSubscribeOpen(true)}
                className="px-[18px] py-2 rounded-lg bg-[#2e5bff] hover:bg-[#2449d6] text-white text-[13px] leading-[19.5px] font-semibold disabled:opacity-60"
              >
                Upgrade to Business
              </button>
            </div>
          </div>
        </PlanCard>
      )}

      {business && (
        <PlanCard>
          <CardLabel>Overage</CardLabel>
          <p className="pt-4 text-[14px] leading-[22.4px] text-[#4a4d57]">
            When you exceed your monthly limits, additional usage is billed at standard overage rates. Set a cap to prevent unexpected charges.
            {o ? ` Overage is ${usd(dollars(o.reportUnitCents))} per report unlock and ${usd(dollars(o.interviewUnitCents))} per sponsored interview.` : ''}
          </p>
          <div className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-[41px] items-center rounded-lg border-2 border-[#e8e8ea] overflow-hidden focus-within:border-[#2e5bff]">
              <span className="h-full flex items-center px-3 bg-[#f5f6fa] border-r-2 border-[#e8e8ea] text-[14px] text-[#4a4d57]">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={cap}
                placeholder="No cap"
                onChange={(e) => setCap(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCap()}
                aria-label="Monthly overage cap in dollars"
                className={cx('w-[100px] h-full px-3 outline-none text-[14px] text-[#0a0a0a] bg-white', mono)}
              />
            </div>
            <button
              type="button"
              disabled={busy === 'cap'}
              onClick={saveCap}
              className="px-[18px] py-2 rounded-lg bg-[#2e5bff] hover:bg-[#2449d6] text-white text-[13px] leading-[19.5px] font-semibold disabled:opacity-60"
            >
              Save cap
            </button>
          </div>
          <div className="inline-flex items-center gap-1.5 px-4 py-3 rounded-[10px] bg-[#f5f6fa] text-[13px] leading-[19.5px] w-fit">
            <span className="text-[#4a4d57]">Overage this month:</span>
            <span className={cx('font-bold text-[#0a0a0a]', mono)}>{usd(dollars(o?.spentCents ?? 0))}</span>
          </div>
          {o?.capReached && (
            <p className="pt-3 text-[13px] text-[#b45309]">
              You've reached your overage cap. Report unlocks and new sponsored interviews pause until next month or until you raise the cap.
            </p>
          )}
        </PlanCard>
      )}

      <section className="rounded-2xl px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[linear-gradient(178deg,#2e5bff_0%,#1231b8_100%)]">
        <div className="flex flex-col gap-1">
          <p className="text-[16px] leading-6 font-bold text-white">{unlocksIncluded !== null ? `Need more than ${unlocksIncluded} unlocks or custom workflows?` : 'Need more unlocks or custom workflows?'}</p>
          <p className="text-[13px] leading-[19.5px] text-white/75">Enterprise plans include unlimited seats, custom reporting, and a dedicated account manager.</p>
        </div>
        <a
          href={`mailto:${SALES_EMAIL}?subject=Screna%20Enterprise`}
          className="self-start md:self-auto px-[22px] py-2.5 rounded-lg bg-white text-[#2e5bff] text-[13px] leading-[19.5px] font-bold whitespace-nowrap hover:bg-[#eef2ff]"
        >
          Talk to sales
        </a>
      </section>

      {/* Sample: no invoice API yet. */}
      {BILLING_PORTAL_ENABLED && (
      <PlanCard>
        <CardLabel>Invoices</CardLabel>
        {sample.invoices.length === 0 ? (
          <p className="pt-4 text-[13px] text-[#4a4d57]">No invoices yet.</p>
        ) : (
          <div className="pt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px] leading-[19.5px]">
              <thead>
                <tr className="border-b-2 border-[#e8e8ea] text-[11px] leading-[16.5px] font-bold uppercase tracking-[0.5px] text-[#90a1b9]">
                  <th className="pb-2.5 font-bold w-[27%]">Date</th>
                  <th className="pb-2.5 font-bold w-[34%]">Description</th>
                  <th className="pb-2.5 font-bold w-[16%]">Amount</th>
                  <th className="pb-2.5" />
                </tr>
              </thead>
              <tbody>
                {sample.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b-2 border-[#e8e8ea] last:border-b-0">
                    <td className={cx('py-[14px] text-[#4a4d57]', mono)}>{inv.date}</td>
                    <td className="py-[14px] text-[#0a0a0a]">{inv.description}</td>
                    <td className={cx('py-[14px] font-bold text-[#0a0a0a]', mono)}>{usd(inv.amount)}</td>
                    <td className="py-[14px] text-right">
                      <button
                        type="button"
                        onClick={() => toast.info(`Invoice download isn't self-serve yet. Email ${SALES_EMAIL} and we'll set it up.`)}
                        className="inline-flex items-center gap-1 text-[#2e5bff] font-semibold hover:underline"
                      >
                        <Download size={13} /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PlanCard>
      )}

      <Dialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        title="Upgrade to Business"
        actions={
          <Button variant="ghost" onClick={() => setSubscribeOpen(false)}>
            Cancel
          </Button>
        }
      >
        <p className="text-[14px] text-[#5a6172]">Choose how you'd like to be billed. You'll finish payment on Stripe. Annual billing can't be changed back to monthly.</p>
        <div className="flex flex-col gap-2">
          <Button variant="primary" disabled={busy === 'subscribe'} onClick={() => void subscribe('MONTHLY')}>
            {monthlyPrice ? `Monthly · ${monthlyPrice}/month` : 'Monthly'}
          </Button>
          <Button disabled={busy === 'subscribe'} onClick={() => void subscribe('ANNUAL')}>
            {annualPrice ? `Annual · ${annualPrice}/year` : 'Annual'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Business?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep Business
            </Button>
            <Button
              variant="danger"
              disabled={busy === 'cancel'}
              onClick={() => {
                setCancelOpen(false);
                void run('cancel', cancelEmployerPlan, `Business ends ${dateOf(plan.currentPeriodEnd)}`);
              }}
            >
              Cancel plan
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">
          You keep Business and its allowance until {dateOf(plan.currentPeriodEnd)}, then return to Free. Any overage not yet billed is charged then. You can resume before
          that date.
        </p>
      </Dialog>
    </div>
  );
}
