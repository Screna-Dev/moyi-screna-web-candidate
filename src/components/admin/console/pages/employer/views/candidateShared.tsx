import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useEmployerStore } from '../store';
import type { Candidate, HiringDecision, Job } from '../types';
import { Button, Dialog, Pill, cx } from '../ui';

// Helpers shared by the applications / board / report / contact views.

export async function copyText(text: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('Could not copy to clipboard');
  }
}

export function jobLink(job: Job) {
  return `https://screna.ai/jobs/${job.id}`;
}

export function displayName(c: Candidate) {
  return c.unlocked ? c.name : c.anonLabel;
}

export function initialsOf(name: string) {
  return name.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function DecisionPill({ decision }: { decision: HiringDecision }) {
  if (decision === 'moved_forward') return <Pill tone="green">Moved forward</Pill>;
  if (decision === 'rejected') return <Pill tone="red">Rejected</Pill>;
  return <Pill tone="gray">Awaiting decision</Pill>;
}

export function ContactPill({ contacted }: { contacted: boolean }) {
  return contacted ? <Pill tone="green">Contacted</Pill> : <Pill tone="gray">Not contacted</Pill>;
}

function dotColor(i: number, met: number) {
  if (i < met) return 'bg-[#15a560]';
  return met >= 2 ? 'bg-[#f97316]' : 'bg-[#ef4444]';
}

export function ScreeningDots({ met, total }: { met: number; total: number }) {
  const tone = met === total ? 'text-[#15a560]' : met >= 2 ? 'text-[#f97316]' : 'text-[#ef4444]';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cx('w-2 h-2 rounded-full', dotColor(i, met))} />
        ))}
      </span>
      <span className={cx('text-[13px] font-semibold', tone)}>
        {met}/{total}
      </span>
    </span>
  );
}

const SEG: Record<'green' | 'amber' | 'orange', string> = {
  green: 'bg-[#15a560]',
  amber: 'bg-[#f5a524]',
  orange: 'bg-[#f97316]',
};

export function PerformanceBar({ segments, label }: { segments: Candidate['performance']; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {segments.map((s, i) => (
          <span key={i} className={cx('h-1.5 w-6 rounded-full', SEG[s])} />
        ))}
      </div>
      <span className="text-[12px] text-[#5a6172]">{label}</span>
    </div>
  );
}

// Figma 2451:4352. Shows what the unlock costs under the employer's plan:
// included in the allowance, billed as overage, or blocked (free pool spent /
// overage cap reached) with a way to the Plan & Usage page.
export function UnlockDialog({
  candidate,
  job,
  onClose,
  onUnlocked,
}: {
  candidate: Candidate | null;
  job: Job | undefined;
  onClose: () => void;
  onUnlocked?: (c: Candidate) => void;
}) {
  const { plan, unlockQuote, unlockCandidate, go } = useEmployerStore();
  const quote = unlockQuote();
  const planName = plan.tier === 'business' ? 'Business' : 'Free';
  const blocked = quote.kind === 'blocked';

  const confirm = () => {
    if (!candidate) return;
    if (!unlockCandidate(candidate.id)) {
      toast.error('No report unlocks left on your plan');
      return;
    }
    toast.success(`${candidate.anonLabel} unlocked`);
    onUnlocked?.(candidate);
    onClose();
  };

  return (
    <Dialog
      open={!!candidate}
      onClose={onClose}
      serifTitle
      width={560}
      title={candidate ? `Unlock ${candidate.anonLabel}’s report?` : ''}
      actions={
        <>
          <Button onClick={onClose} className="!rounded-lg h-10 font-semibold text-[#5a6172]">
            Cancel
          </Button>
          {blocked ? (
            <Button
              variant="primary"
              className="!rounded-lg h-10 font-semibold"
              onClick={() => {
                onClose();
                go({ name: 'plan' });
              }}
            >
              {quote.reason === 'free_exhausted' ? 'See Business' : 'Raise overage cap'}
            </Button>
          ) : (
            <Button variant="primary" className="!rounded-lg h-10 font-semibold" onClick={confirm}>
              Unlock Report
            </Button>
          )}
        </>
      }
    >
      <p className="-mt-2 text-[14px] leading-5 text-[#5a6172]">
        Unlock this candidate&rsquo;s resume, full interview report, recorded responses, and contact email for {job ? job.title : 'this role'}.
      </p>
      <div className="h-px bg-[#e1e4ea] my-2" />
      <div className="bg-[#f3f4f7] rounded-xl p-4 flex flex-col">
        <p className="text-[12px] leading-[18px] font-semibold text-[#3c77f6]">
          {quote.kind === 'overage' ? `Over your ${planName} plan allowance` : `Included in your ${planName} plan`}
        </p>
        <div className="flex flex-col gap-3 pt-4 text-[13px] leading-[19.5px]">
          <SummaryRow label="Report unlocks remaining" value={plan.unlockAllowance - plan.unlocksUsed > 0 ? plan.unlockAllowance - plan.unlocksUsed : 0} />
          <SummaryRow
            label="This action"
            value={quote.kind === 'overage' ? `$${quote.price} overage` : quote.kind === 'blocked' ? 'Not available' : 'Uses 1 report unlock'}
          />
          <div className="h-px bg-[#e1e4ea]" />
          {quote.kind === 'included' && <SummaryRow strong label="Remaining after unlock" value={quote.remaining - 1} />}
          {quote.kind === 'overage' && <SummaryRow strong label="Overage cap left after unlock" value={`$${quote.capLeft - quote.price}`} />}
          {quote.kind === 'blocked' && (
            <p className="font-semibold text-[#dc2626]">
              {quote.reason === 'free_exhausted'
                ? `You've used all ${plan.unlockAllowance} free report unlocks. Upgrade to Business to keep unlocking.`
                : `This month's $${plan.overageCap} overage cap is reached. Raise the cap to keep unlocking.`}
            </p>
          )}
        </div>
        {plan.tier === 'business' && <p className="pt-4 text-[11px] leading-4 text-[#5a6172]">Monthly allowance resets {plan.resetsOn}.</p>}
      </div>
      <p className="text-[11px] leading-4 text-[#5a6172]">
        This unlock applies only to this candidate and role. Unlocking this candidate&rsquo;s report for another role uses another report unlock.
      </p>
    </Dialog>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? 'font-semibold text-[#1e232f]' : 'text-[#5a6172]'}>{label}</span>
      <span className={cx('text-[#1e232f]', strong ? 'font-bold' : 'font-semibold')}>{value}</span>
    </div>
  );
}
