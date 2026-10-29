import type { ReactNode } from 'react';
import { Calendar, Check, Info } from 'lucide-react';
import type { AfterSponsorshipLimit, InterviewSponsor, Job, Sponsorship } from '@/components/admin/console/pages/employer/types';
import { Card, TextInput, cx } from '@/components/admin/console/pages/employer/ui';
import { ErrorHint } from '@/components/admin/console/pages/employer/views/wizard/shared';
import { numberOf, type StepProps } from '@/components/admin/console/pages/employer/views/wizard/logic';
import { addDays, closingRange, dateOf, withDate } from './jobMapping';

// Employer-app sections of the create-job wizard that follow the 2026-10-28
// design (Figma c-雇主端, "Create Job — Wizard Page (Step 1 Active)" and
// "Create Job / Step Content - Application & Credits"). The admin console's
// mock wizard keeps the older shared cards.

// Errors are true (shows "Required") or a message.
type SectionErrors = Record<string, boolean | string | undefined>;
const msg = (e: boolean | string | undefined) => (typeof e === 'string' ? e : undefined);

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[13px] font-semibold text-[#1e232f]">
      {children}
      {required && <span className="text-[#ff383c]">*</span>}
    </span>
  );
}

// The design shows "Oct 23, 2026" with a calendar icon. A transparent native
// date input sits on top, so clicking anywhere opens the browser's picker.
function DateField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onChange: (date: string) => void;
}) {
  const shown = value
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
    : 'Select a date';
  return (
    <div className={cx('relative h-10 rounded-lg border border-[#e1e4ea] bg-white px-3.5 flex items-center justify-between', disabled && 'opacity-60')}>
      <span className={cx('text-[14px] truncate', value ? 'text-[#1e232f]' : 'text-[#9ba1b0]')}>{shown}</span>
      <Calendar size={14} className="text-[#5a6172] shrink-0" />
      <input
        type="date"
        aria-label={label}
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* not supported: the browser's own click handling applies */
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ─── Step 1: Application window (inside the Role information card) ──────────

// Dates only: the job opens at the start of the opening date and closes at the
// end of the closing date, in the job's time zone. today: that zone's date
// (YYYY-MM-DD). opensLocked: the job is already open, so only the closing
// date can move.
export function ApplicationWindowSection({
  job,
  update,
  err,
  today,
  opensLocked,
}: {
  job: Job;
  update: StepProps['update'];
  err: SectionErrors;
  today: string;
  opensLocked?: boolean;
}) {
  const opens = dateOf(job.opensAt);
  const closes = dateOf(job.closesAt);
  // The picker offers only allowed closing dates: 3 days to 1 month after opening, not in the past.
  const range = opens ? closingRange(opens) : null;
  const closesMin = range && range.min > today ? range.min : today;

  // "The closing date defaults to 7 days after the opening date": moving the
  // opening date carries a default (or now out-of-range) closing date along.
  const setOpens = (date: string) =>
    update((j) => {
      const prevOpens = dateOf(j.opensAt);
      const prevCloses = dateOf(j.closesAt);
      const range = date ? closingRange(date) : null;
      const outOfRange = !!range && (prevCloses < range.min || prevCloses > range.max);
      const followDefault = !prevCloses || (prevOpens && prevCloses === addDays(prevOpens, 7)) || outOfRange;
      return {
        opensAt: date ? withDate(date, '00:00') : '',
        ...(date && followDefault ? { closesAt: withDate(addDays(date, 7), '23:59') } : {}),
      };
    });

  return (
    <div className="flex flex-col gap-3.5 pt-3">
      <span className="text-[14px] font-bold text-[#1e232f]">Application window</span>
      <p className="text-[13px] text-[#5a6172]">Choose when candidates can apply. The closing date defaults to 7 days after the opening date.</p>
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <Label required>Opening date</Label>
          <DateField label="Opening date" disabled={opensLocked} min={opensLocked ? undefined : today} value={opens} onChange={setOpens} />
          {err.opensAt ? <ErrorHint show>{msg(err.opensAt)}</ErrorHint> : opensLocked && <span className="text-[12px] text-[#5a6172]">This job is already open.</span>}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <Label required>Closing date</Label>
          <DateField
            label="Closing date"
            min={closesMin}
            max={range?.max}
            value={closes}
            onChange={(date) => update({ closesAt: date ? withDate(date, '23:59') : '' })}
          />
          <ErrorHint show={!!err.closesAt}>{msg(err.closesAt)}</ErrorHint>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Who pays for interviews ─────────────────────────────────────────

function ChoiceCard({
  selected,
  onSelect,
  title,
  body,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'w-full rounded-xl p-[18px] flex flex-col gap-4 transition-colors',
        selected ? 'border-2 border-[#3c77f6] bg-[rgba(60,119,246,0.08)]' : 'border border-[#e1e4ea] bg-white',
      )}
    >
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="flex items-center justify-between gap-3 text-left w-full">
        <span className="flex-1 max-w-[500px] flex flex-col gap-1">
          <span className="text-[15px] font-bold text-[#1e232f]">{title}</span>
          {body && <span className="text-[13px] leading-[18px] text-[#5a6172]">{body}</span>}
        </span>
        {selected ? (
          <span className="w-[18px] h-[18px] rounded-full bg-[#3c77f6] flex items-center justify-center shrink-0">
            <Check size={10} strokeWidth={3} className="text-white" />
          </span>
        ) : (
          <span className="w-[18px] h-[18px] rounded-full border border-[#e1e4ea] bg-white shrink-0" />
        )}
      </button>
      {selected && children}
    </div>
  );
}

const AFTER_LIMIT: { value: AfterSponsorshipLimit; title: string; body: string }[] = [
  { value: 'keep', title: 'Keep accepting candidates', body: 'Additional candidates can continue by using their own interview allowance or paying for the interview.' },
  { value: 'close', title: 'Close the job automatically', body: 'The job will stop accepting new candidates when all sponsored interview spots have been used.' },
];

// Maximum sponsored candidates and the after-limit choice are not in the jobs
// API yet: they live in the form only (see formOnlySponsorship in the wizard).
export function SponsorshipCard({ job, update, err }: { job: Job; update: StepProps['update']; err: SectionErrors }) {
  const sp = job.sponsorship;
  const setSp = (patch: Partial<Sponsorship>) => update((j) => ({ sponsorship: { ...j.sponsorship, ...patch } }));
  const setSponsor = (sponsor: InterviewSponsor) => update({ sponsor });
  const maxCandidates = numberOf(sp.maxCandidates);
  // 1 Interview Credit per completed sponsored interview.
  const cost = job.sponsor === 'employer' ? maxCandidates : 0;

  return (
    <Card className="p-6 flex flex-col gap-5 rounded-2xl">
      <span className="text-[15px] font-bold text-[#1e232f]">Who pays for interviews?</span>
      <ErrorHint show={!!err.sponsor}>Choose who pays for interviews to continue</ErrorHint>

      <div role="radiogroup" aria-label="Who pays for interviews?" className="flex flex-col gap-5">
        <ChoiceCard selected={job.sponsor === 'employer'} onSelect={() => setSponsor('employer')} title="Sponsor candidates' first interviews">
          <div className="bg-white border border-[#e1e4ea] rounded-lg p-4 flex flex-col gap-4">
            <span className="text-[14px] font-bold text-[#1e232f]">Sponsorship limits</span>

            <label className="flex flex-col gap-1.5">
              <Label required>Maximum sponsored candidates</Label>
              <div className="relative w-[420px] max-w-full">
                <TextInput
                  aria-label="Maximum sponsored candidates"
                  value={sp.maxCandidates}
                  onChange={(e) => setSp({ maxCandidates: e.target.value })}
                  placeholder="50"
                  inputMode="numeric"
                  className="h-10 pr-24 border-[#d1d5db]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#5a6172] pointer-events-none">candidates</span>
              </div>
              {err.maxCandidates ? (
                <ErrorHint show>{msg(err.maxCandidates)}</ErrorHint>
              ) : (
                <span className="text-[12px] text-[#5a6172] w-[420px] max-w-full">Each candidate can receive sponsorship for their first interview only.</span>
              )}
            </label>

            <div className="flex flex-col gap-3">
              <Label required>After the sponsorship limit is reached</Label>
              <p className="text-[13px] leading-[18px] text-[#5a6172]">Choose what happens after all sponsored interview spots have been used.</p>
              <ErrorHint show={!!err.afterLimit}>Choose what happens after the limit is reached</ErrorHint>
              <div role="radiogroup" aria-label="After the sponsorship limit is reached" className="flex flex-col gap-3">
                {AFTER_LIMIT.map((o) => (
                  <ChoiceCard key={o.value} selected={sp.afterLimit === o.value} onSelect={() => setSp({ afterLimit: o.value })} title={o.title} body={o.body} />
                ))}
              </div>
            </div>

            <p className="text-[13px] leading-[18px] text-[#5a6172]">
              All three limits apply. Sponsorship stops for new interviews when any limit is reached or your available Interview Credits are insufficient.
            </p>
            <div className="flex items-center gap-2.5 bg-[#f3f4f7] rounded-lg p-3 text-[13px] leading-[18px] text-[#5a6172]">
              <Info size={16} className="shrink-0" />
              Sponsorship is allocated in the order candidates start their first interview. An interview that has already started with sponsorship remains sponsored until it ends.
            </div>
          </div>
        </ChoiceCard>

        <ChoiceCard
          selected={job.sponsor === 'candidate'}
          onSelect={() => setSponsor('candidate')}
          title="Candidates use their own credits"
          body="Publishing remains free. Candidates pay for their interviews using their own Interview Credits."
        />
      </div>

      <div className="flex flex-col gap-1 text-[13px] text-[#5a6172]">
        <span className="font-semibold">Your interview sponsorship cost: {cost ? `up to ${cost.toLocaleString('en-US')} credits` : '0 credits'}</span>
        <span>Report unlocking is charged separately.</span>
      </div>
    </Card>
  );
}
