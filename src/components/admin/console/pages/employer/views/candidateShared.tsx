import { Info } from 'lucide-react';
import { toast } from 'sonner';
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

export function UnlockDialog({
  candidate,
  job,
  onClose,
  onUnlocked,
  unlock,
}: {
  candidate: Candidate | null;
  job: Job | undefined;
  onClose: () => void;
  onUnlocked?: (c: Candidate) => void;
  unlock: (id: string) => void;
}) {
  return (
    <Dialog
      open={!!candidate}
      onClose={onClose}
      serifTitle
      width={560}
      title={candidate ? `Unlock ${candidate.anonLabel}?` : ''}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!candidate) return;
              unlock(candidate.id);
              toast.success(`${candidate.anonLabel} unlocked`);
              onUnlocked?.(candidate);
              onClose();
            }}
          >
            Unlock report
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-5 text-[#5a6172]">
        Unlock the candidate's resume, full interview report, recorded responses, and contact email for {job?.title ?? 'this job'}.
      </p>
      <div className="h-px bg-[#e1e4ea]" />
      <p className="flex items-start gap-2 text-[12px] text-[#5a6172]">
        <Info size={14} className="shrink-0 mt-0.5" />
        This unlock applies only to this candidate and job. A report for the same candidate on another job is unlocked separately.
      </p>
    </Dialog>
  );
}
