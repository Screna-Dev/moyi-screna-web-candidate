import { useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '../store';
import { BUSINESS_ANNUAL_PRICE, BUSINESS_PRICE, BUSINESS_UNLOCKS } from '../mockData';
import { cx } from '../ui';

// Plan & Usage (Figma 2451:1052). Employer billing has no API yet: usage and
// the overage cap live in the in-memory store; plan changes, seats and invoice
// downloads go through sales until checkout exists.

const SALES_EMAIL = 'operations@screna.ai';
const mono = 'font-[family-name:var(--font-mono)]';

function usd(n: number, cents = true) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
}

function notYet(action: string) {
  toast.info(`${action} isn't self-serve yet. Email ${SALES_EMAIL} and we'll set it up.`);
}

function PlanCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('bg-white border-2 border-[#e8e8ea] rounded-2xl p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)]', className)}>{children}</section>;
}

function CardLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-[16.5px] font-bold uppercase tracking-[0.6px] text-[#90a1b9]">{children}</p>;
}

function OutlineButton({ children, onClick, tone = 'blue' }: { children: ReactNode; onClick: () => void; tone?: 'blue' | 'gray' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'px-[18px] py-2 rounded-lg border-2 text-[13px] leading-[19.5px] font-semibold whitespace-nowrap transition-colors',
        tone === 'blue' ? 'border-[#2e5bff] text-[#2e5bff] hover:bg-[#eef2ff]' : 'border-[#e8e8ea] text-[#4a4d57] hover:bg-[#f5f6fa]',
      )}
    >
      {children}
    </button>
  );
}

function UsageBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[13px] leading-[19.5px]">
        <span className="font-semibold text-[#0a0a0a]">{label}</span>
        <span className={cx('text-[#4a4d57]', mono)}>
          {used} / {total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#e8e8ea] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function PlanUsageView() {
  const { plan, unlocksLeft, setOverageCap } = useEmployerStore();
  const [cap, setCap] = useState(String(plan.overageCap));
  const business = plan.tier === 'business';

  const saveCap = () => {
    const n = Number(cap);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a cap of $0 or more');
      return;
    }
    setOverageCap(Math.round(n));
    toast.success(`Overage cap set to ${usd(Math.round(n), false)}`);
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      <h1 className="text-[24px] leading-9 font-extrabold text-[#0a0a0a]">Plan &amp; Usage</h1>

      {business ? (
        <PlanCard>
          <CardLabel>Current plan</CardLabel>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[22px] leading-[33px] font-extrabold text-[#0a0a0a]">Business</span>
                <span className="px-2.5 py-[3px] rounded-full bg-[#eef2ff] text-[#2e5bff] text-[12px] leading-[18px] font-semibold">{usd(BUSINESS_PRICE, false)}/month</span>
              </div>
              <p className="text-[13px] leading-[19.5px] text-[#4a4d57]">
                Renews {plan.renewsOn} · {plan.seatsUsed} of {plan.seats} seats in use
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OutlineButton onClick={() => notYet('Switching to annual billing')}>Switch to annual · {usd(BUSINESS_ANNUAL_PRICE, false)}</OutlineButton>
              <OutlineButton tone="gray" onClick={() => notYet('Changing seats')}>
                Manage seats
              </OutlineButton>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t-2 border-[#e8e8ea] flex flex-col gap-4">
            <p className="text-[12px] leading-[18px] font-bold uppercase tracking-[0.5px] text-[#90a1b9]">Usage this period</p>
            <UsageBar label="Report unlocks" used={plan.unlocksUsed} total={plan.unlockAllowance} color="#2e5bff" />
            <UsageBar label="Sponsored interviews" used={plan.sponsoredUsed} total={plan.sponsoredAllowance} color="#22c55e" />
          </div>
        </PlanCard>
      ) : (
        <PlanCard className="border-dashed bg-[rgba(248,250,252,0.6)] shadow-none">
          <CardLabel>Current plan</CardLabel>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[16px] leading-6 font-bold text-[#0a0a0a]">Free</span>
              <span className="text-[13px] leading-[19.5px] text-[#4a4d57]">
                {unlocksLeft} of {plan.unlockAllowance} free unlocks left
              </span>
            </div>
            <OutlineButton onClick={() => window.open('/employers#pricing', '_blank', 'noopener')}>See Business</OutlineButton>
          </div>
        </PlanCard>
      )}

      {business && (
        <PlanCard>
          <CardLabel>Overage</CardLabel>
          <p className="pt-4 text-[14px] leading-[22.4px] text-[#4a4d57]">
            When you exceed your monthly limits, additional usage is billed at standard overage rates. Set a cap to prevent unexpected charges.
          </p>
          <div className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-[41px] items-center rounded-lg border-2 border-[#e8e8ea] overflow-hidden focus-within:border-[#2e5bff]">
              <span className="h-full flex items-center px-3 bg-[#f5f6fa] border-r-2 border-[#e8e8ea] text-[14px] text-[#4a4d57]">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCap()}
                aria-label="Monthly overage cap in dollars"
                className={cx('w-[100px] h-full px-3 outline-none text-[14px] text-[#0a0a0a] bg-white', mono)}
              />
            </div>
            <button type="button" onClick={saveCap} className="px-[18px] py-2 rounded-lg bg-[#2e5bff] hover:bg-[#2449d6] text-white text-[13px] leading-[19.5px] font-semibold">
              Save cap
            </button>
          </div>
          <div className="inline-flex items-center gap-1.5 px-4 py-3 rounded-[10px] bg-[#f5f6fa] text-[13px] leading-[19.5px]">
            <span className="text-[#4a4d57]">Overage this month:</span>
            <span className={cx('font-bold text-[#0a0a0a]', mono)}>{usd(plan.overageThisMonth)}</span>
          </div>
        </PlanCard>
      )}

      <section className="rounded-2xl px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[linear-gradient(178deg,#2e5bff_0%,#1231b8_100%)]">
        <div className="flex flex-col gap-1">
          <p className="text-[16px] leading-6 font-bold text-white">Need more than {BUSINESS_UNLOCKS} unlocks or custom workflows?</p>
          <p className="text-[13px] leading-[19.5px] text-white/75">Enterprise plans include unlimited seats, custom reporting, and a dedicated account manager.</p>
        </div>
        <a href={`mailto:${SALES_EMAIL}?subject=Screna%20Enterprise`} className="self-start md:self-auto px-[22px] py-2.5 rounded-lg bg-white text-[#2e5bff] text-[13px] leading-[19.5px] font-bold whitespace-nowrap hover:bg-[#eef2ff]">
          Talk to sales
        </a>
      </section>

      <PlanCard>
        <CardLabel>Invoices</CardLabel>
        {plan.invoices.length === 0 ? (
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
                {plan.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b-2 border-[#e8e8ea] last:border-b-0">
                    <td className={cx('py-[14px] text-[#4a4d57]', mono)}>{inv.date}</td>
                    <td className="py-[14px] text-[#0a0a0a]">{inv.description}</td>
                    <td className={cx('py-[14px] font-bold text-[#0a0a0a]', mono)}>{usd(inv.amount)}</td>
                    <td className="py-[14px] text-right">
                      <button
                        type="button"
                        onClick={() => notYet('Invoice download')}
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
    </div>
  );
}
