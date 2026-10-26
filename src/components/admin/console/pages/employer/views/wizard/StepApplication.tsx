import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Circle, Info, Sparkles } from 'lucide-react';
import type { InterviewSponsor, Job, Sponsorship } from '../../types';
import { Card, Divider, Field, KV, Select, TextInput, cx } from '../../ui';
import { CardTitle, ErrorHint } from './shared';
import { applicationErrors, displayToInput, inputToDisplay, numberOf, TIME_ZONES, type StepProps } from './logic';

// Billing is out of scope for the admin-run employer flow, so this step
// configures sponsorship limits only — no balance checks or top-up prompts.
export function StepApplication({ job, update, showErrors }: StepProps) {
  const err = showErrors ? applicationErrors(job) : ({} as Record<string, boolean>);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[#1e232f] text-[18px] font-semibold leading-7">Set the application window and interview sponsorship</h2>
        <p className="text-[#5a6172] text-[13px]">Choose whether this employer sponsors candidates' first interviews and set the spending limits.</p>
      </div>

      <ApplicationWindowCard job={job} update={update} err={err} />
      <SponsorCard job={job} update={update} err={err} />
    </div>
  );
}

// Errors are true (shows "Required") or a message.
type CardErrors = Record<string, boolean | string | undefined>;
const msg = (e: boolean | string | undefined) => (typeof e === 'string' ? e : undefined);

const pad2 = (n: number) => String(n).padStart(2, '0');
// Browser-local "now" as a datetime-local value.
function localNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// opensOptional: the employer API opens the job on publish when opensAt is blank.
// opensLocked: the job is already open, so only the close date can move.
// now: the current time as a datetime-local value in the JOB's time zone (the
// inputs hold wall-clock time there); defaults to the browser's clock.
// The pickers disable the past, and closing times at or before the opening
// time; an out-of-order pair typed by hand is flagged right away.
export function ApplicationWindowCard({
  job,
  update,
  err,
  opensOptional,
  opensLocked,
  now,
}: {
  job: Job;
  update: StepProps['update'];
  err: CardErrors;
  opensOptional?: boolean;
  opensLocked?: boolean;
  now?: string;
}) {
  const nowInput = now ?? localNow();
  const opens = displayToInput(job.opensAt);
  const closes = displayToInput(job.closesAt);
  // Same-format strings compare in time order.
  const closesMin = opens && !opensLocked && opens > nowInput ? opens : nowInput;
  const outOfOrder = !!opens && !!closes && closes <= opens;
  const closesError = outOfOrder ? 'Must be after the opening time' : err.closesAt;
  return (
    <Card className="p-6 flex flex-col gap-4">
      <CardTitle>Application window</CardTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Applications open"
          required={!opensOptional}
          hint={
            err.opensAt ? (
              <ErrorHint show>{msg(err.opensAt)}</ErrorHint>
            ) : opensLocked ? (
              'This job is already open.'
            ) : opensOptional ? (
              'Leave blank to open as soon as the job is published.'
            ) : undefined
          }
        >
          <TextInput
            type="datetime-local"
            disabled={opensLocked}
            min={opensLocked ? undefined : nowInput}
            value={opens}
            onChange={(e) => update({ opensAt: inputToDisplay(e.target.value) })}
            className={opensLocked ? 'opacity-60' : undefined}
          />
        </Field>
        <Field label="Applications close" required hint={<ErrorHint show={!!closesError}>{msg(closesError)}</ErrorHint>}>
          <TextInput type="datetime-local" min={closesMin} value={closes} onChange={(e) => update({ closesAt: inputToDisplay(e.target.value) })} />
        </Field>
        <Field label="Time zone" required hint={<ErrorHint show={!!err.timeZone} />}>
          <Select value={job.timeZone} onChange={(v) => update({ timeZone: v })} options={TIME_ZONES} />
        </Field>
        <Field label="Maximum applicants" hint={err.maxApplicants ? <ErrorHint show>{msg(err.maxApplicants)}</ErrorHint> : 'Leave blank if you do not want to set a maximum.'}>
          <TextInput value={job.maxApplicants} onChange={(e) => update({ maxApplicants: e.target.value })} placeholder="Unlimited (e.g. 100)" inputMode="numeric" />
        </Field>
      </div>
      <div className="flex items-center gap-2 bg-[#f9fafb] rounded-lg px-3 py-2.5 text-[13px] text-[#5a6172]">
        <Info size={14} className="shrink-0" />
        Candidate rankings use each candidate's highest-scoring completed assessment.
      </div>
    </Card>
  );
}

// credits: the employer's available Interview Credits. Passing it (employer
// app) switches to the credits version of the design (Figma "Application &
// credits"): publishing-cost and balance rows, a low-balance warning with
// onAddCredits, the report-unlocking note and the cost summary. Without it the
// card is the admin console's original. The three limits are form-only in the
// employer app for now: the jobs API has no fields for them.
export function SponsorCard({
  job,
  update,
  err,
  credits,
  onAddCredits,
}: {
  job: Job;
  update: StepProps['update'];
  err: CardErrors;
  credits?: number | null;
  onAddCredits?: () => void;
}) {
  const creditsMode = credits !== undefined;
  const lowBalance = creditsMode && credits !== null && credits < job.interviewLength;
  const sp = job.sponsorship;
  const setSp = (patch: Partial<Sponsorship>) => update((j) => ({ sponsorship: { ...j.sponsorship, ...patch } }));

  const maxCandidates = numberOf(sp.maxCandidates);
  const estimate = maxCandidates * job.interviewLength;
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <Card className="p-6 flex flex-col gap-4">
      <CardTitle>Who pays for interviews?</CardTitle>
      <ErrorHint show={!!err.sponsor}>Choose who pays for interviews to continue</ErrorHint>

      <SponsorOption
        value="employer"
        current={job.sponsor}
        onSelect={(sponsor) => update({ sponsor })}
        title="Sponsor candidates' first interviews"
        body="Cover eligible candidates' first interviews at 1 Interview Credit per minute. Candidates pay for their own retakes."
      >
        <div className="border border-[#e1e4ea] rounded-xl bg-white p-4 flex flex-col gap-4">
          <span className="text-[14px] font-semibold text-[#1e232f]">Sponsorship limits</span>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total interview budget" required hint={err.totalBudget ? <ErrorHint show /> : 'Maximum sponsored interview usage for this job.'}>
              <Suffixed suffix="credits">
                <TextInput value={sp.totalBudget} onChange={(e) => setSp({ totalBudget: e.target.value })} placeholder="1,500" inputMode="numeric" className="pr-16" />
              </Suffixed>
            </Field>
            <Field label="Daily interview budget" required hint={err.dailyBudget ? <ErrorHint show /> : 'Daily limit resets at midnight in the selected job time zone.'}>
              <Suffixed suffix={creditsMode ? 'Interview Credits' : 'credits'}>
                <TextInput value={sp.dailyBudget} onChange={(e) => setSp({ dailyBudget: e.target.value })} placeholder="300" inputMode="numeric" className={creditsMode ? 'pr-32' : 'pr-16'} />
              </Suffixed>
            </Field>
            <Field label="Maximum sponsored candidates" required hint={err.maxCandidates ? <ErrorHint show /> : 'Each candidate can receive sponsorship for their first interview only.'}>
              <Suffixed suffix="candidates">
                <TextInput value={sp.maxCandidates} onChange={(e) => setSp({ maxCandidates: e.target.value })} placeholder="50" inputMode="numeric" className="pr-24" />
              </Suffixed>
            </Field>
          </div>

          <div className="border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-2.5">
            <span className="text-[14px] font-semibold text-[#1e232f]">Estimated sponsorship usage</span>
            {creditsMode && <KV k="Publishing cost" v={<span className="text-[#15a560]">Free · 0 credits</span>} />}
            <KV k="Interview rate" v="1 credit / minute" />
            <KV k="Typical interview duration" v={`Approximately ${job.interviewLength} minutes`} />
            <KV k="Maximum sponsored candidates" v={maxCandidates ? fmt(maxCandidates) : '—'} />
            <KV k={<span className="font-semibold text-[#1e232f]">Estimated usage{maxCandidates ? ` for ${fmt(maxCandidates)} interviews` : ''}</span>} v={<span className="text-[#3c77f6]">{estimate ? `Approximately ${fmt(estimate)} credits` : '—'}</span>} strong />
            <KV k="Total interview budget" v={sp.totalBudget ? `${sp.totalBudget} credits` : '—'} />
            <KV k="Daily interview budget" v={sp.dailyBudget ? `${sp.dailyBudget} credits` : '—'} />
            {creditsMode && <KV k="Current available balance" v={<span className="text-[#3c77f6]">{credits === null ? '—' : `${fmt(credits)} Interview Credits`}</span>} />}
            <Divider className="my-1" />
            <p className="text-[12px] text-[#5a6172]">
              {creditsMode
                ? `Estimate based on ${maxCandidates ? fmt(maxCandidates) : 'the maximum'} candidates × ${job.interviewLength} minutes. Actual charges depend on interview duration. Your limits may allow fewer candidates to receive sponsorship.`
                : `Estimate based on ${maxCandidates ? fmt(maxCandidates) : 'the maximum'} candidates × ${job.interviewLength} minutes. Actual usage depends on interview duration; the limits may allow fewer candidates to receive sponsorship.`}
            </p>
            {lowBalance && (
              <div className="flex items-start gap-2 rounded-lg border-l-2 border-[#f5c451] bg-[#fffbeb] px-3 py-3 text-[12px] text-[#b45309]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold">Your balance may not cover a typical {job.interviewLength}-minute sponsored interview.</span>
                  <span>
                    You can still publish for free. Add Interview Credits to fund sponsorship. Candidates will be shown self-funded pricing before starting if sponsorship is unavailable.
                  </span>
                  {onAddCredits && (
                    <button type="button" onClick={onAddCredits} className="w-fit text-[12px] font-semibold hover:underline">
                      Add Interview Credits →
                    </button>
                  )}
                  <span className="text-[11px]">Sponsorship availability is checked before each interview starts.</span>
                </div>
              </div>
            )}
            {creditsMode && (
              <div className="flex items-start gap-2 rounded-lg bg-[#f3f4f7] px-3 py-3 text-[12px] text-[#5a6172]">
                <Sparkles size={14} className="shrink-0 mt-0.5 text-[#3c77f6]" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[#1e232f]">Report unlocking is separate</span>
                  <span>Unlocking a candidate's report costs 1 Report Credit for that candidate and job. Publishing and sponsoring an interview do not unlock reports automatically.</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[12px] text-[#5a6172]">
            {creditsMode
              ? 'All three limits apply. Sponsorship stops for new interviews when any limit is reached or your available Interview Credits are insufficient. Additional candidates can continue using their own credits.'
              : 'All three limits apply. Sponsorship stops for new interviews when any limit is reached. Additional candidates can continue using their own credits.'}
          </p>
          <div className="flex items-start gap-2 bg-[#f9fafb] rounded-lg px-3 py-2.5 text-[12px] text-[#5a6172]">
            <Info size={14} className="shrink-0 mt-0.5" />
            Sponsorship is allocated in the order candidates start their first interview. An interview that has already started with sponsorship remains sponsored until it ends.
          </div>
        </div>
      </SponsorOption>

      <SponsorOption
        value="candidate"
        current={job.sponsor}
        onSelect={(sponsor) => update({ sponsor })}
        title="Candidates use their own credits"
        body={creditsMode ? 'Publishing remains free. Candidates pay for their interviews using their own Interview Credits.' : 'Candidates pay for their interviews using their own Interview Credits.'}
      />
      {creditsMode && (
        <div className="flex flex-col text-[12px] text-[#5a6172]">
          <span className="font-semibold text-[#1e232f]">
            Your interview sponsorship cost: {job.sponsor === 'employer' && estimate ? `up to ${fmt(Math.min(estimate, numberOf(sp.totalBudget) || estimate))} credits` : '0 credits'}
          </span>
          <span>Report unlocking is charged separately.</span>
        </div>
      )}
    </Card>
  );
}

function SponsorOption({
  value,
  current,
  onSelect,
  title,
  body,
  children,
}: {
  value: InterviewSponsor;
  current: InterviewSponsor | null;
  onSelect: (v: InterviewSponsor) => void;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const on = value === current;
  return (
    <div className={cx('rounded-xl border p-4 flex flex-col gap-4 transition-colors', on ? 'border-[#3c77f6] bg-[#f8fbff]' : 'border-[#e1e4ea] bg-white')}>
      <button type="button" onClick={() => onSelect(value)} className="flex items-start gap-3 text-left w-full" aria-pressed={on}>
        <span className="flex-1">
          <span className="block text-[14px] font-semibold text-[#1e232f]">{title}</span>
          <span className="block text-[13px] text-[#5a6172] mt-0.5">{body}</span>
        </span>
        {on ? <CheckCircle2 size={18} className="text-[#3c77f6] shrink-0" /> : <Circle size={18} className="text-[#c7ccd6] shrink-0" />}
      </button>
      {on && children}
    </div>
  );
}

function Suffixed({ suffix, children }: { suffix: string; children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#5a6172] pointer-events-none">{suffix}</span>
    </div>
  );
}
