import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Info } from 'lucide-react';
import type { InterviewSponsor, Sponsorship } from '../../types';
import { Card, Divider, Field, KV, Select, TextInput, cx } from '../../ui';
import { CardTitle, ErrorHint } from './shared';
import { applicationErrors, displayToInput, inputToDisplay, numberOf, TIME_ZONES, type StepProps } from './logic';

// Billing is out of scope for the admin-run employer flow, so this step
// configures sponsorship limits only — no balance checks or top-up prompts.
export function StepApplication({ job, update, showErrors }: StepProps) {
  const err = showErrors ? applicationErrors(job) : ({} as Record<string, boolean>);
  const sp = job.sponsorship;
  const setSp = (patch: Partial<Sponsorship>) => update((j) => ({ sponsorship: { ...j.sponsorship, ...patch } }));

  const maxCandidates = numberOf(sp.maxCandidates);
  const estimate = maxCandidates * job.interviewLength;
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[#1e232f] text-[18px] font-semibold leading-7">Set the application window and interview sponsorship</h2>
        <p className="text-[#5a6172] text-[13px]">Choose whether this employer sponsors candidates' first interviews and set the spending limits.</p>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <CardTitle>Application window</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Applications open" required hint={<ErrorHint show={!!err.opensAt} />}>
            <TextInput type="datetime-local" value={displayToInput(job.opensAt)} onChange={(e) => update({ opensAt: inputToDisplay(e.target.value) })} />
          </Field>
          <Field label="Applications close" required hint={<ErrorHint show={!!err.closesAt} />}>
            <TextInput type="datetime-local" value={displayToInput(job.closesAt)} onChange={(e) => update({ closesAt: inputToDisplay(e.target.value) })} />
          </Field>
          <Field label="Time zone" required hint={<ErrorHint show={!!err.timeZone} />}>
            <Select value={job.timeZone} onChange={(v) => update({ timeZone: v })} options={TIME_ZONES} />
          </Field>
          <Field label="Maximum applicants" hint="Leave blank if you do not want to set a maximum.">
            <TextInput value={job.maxApplicants} onChange={(e) => update({ maxApplicants: e.target.value })} placeholder="Unlimited (e.g. 100)" inputMode="numeric" />
          </Field>
        </div>
        <div className="flex items-center gap-2 bg-[#f9fafb] rounded-lg px-3 py-2.5 text-[13px] text-[#5a6172]">
          <Info size={14} className="shrink-0" />
          Candidate rankings use each candidate's highest-scoring completed assessment.
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <CardTitle>Who pays for interviews?</CardTitle>

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
                <Suffixed suffix="credits">
                  <TextInput value={sp.dailyBudget} onChange={(e) => setSp({ dailyBudget: e.target.value })} placeholder="300" inputMode="numeric" className="pr-16" />
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
              <KV k="Interview rate" v="1 credit / minute" />
              <KV k="Typical interview duration" v={`Approximately ${job.interviewLength} minutes`} />
              <KV k="Maximum sponsored candidates" v={maxCandidates ? fmt(maxCandidates) : '—'} />
              <KV k={<span className="font-semibold text-[#1e232f]">Estimated usage{maxCandidates ? ` for ${fmt(maxCandidates)} interviews` : ''}</span>} v={<span className="text-[#3c77f6]">{estimate ? `Approximately ${fmt(estimate)} credits` : '—'}</span>} strong />
              <KV k="Total interview budget" v={sp.totalBudget ? `${sp.totalBudget} credits` : '—'} />
              <KV k="Daily interview budget" v={sp.dailyBudget ? `${sp.dailyBudget} credits` : '—'} />
              <Divider className="my-1" />
              <p className="text-[12px] text-[#5a6172]">
                Estimate based on {maxCandidates ? fmt(maxCandidates) : 'the maximum'} candidates × {job.interviewLength} minutes. Actual usage depends on interview duration; the limits may allow fewer candidates to receive sponsorship.
              </p>
            </div>

            <p className="text-[12px] text-[#5a6172]">
              All three limits apply. Sponsorship stops for new interviews when any limit is reached. Additional candidates can continue using their own credits.
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
          body="Candidates pay for their interviews using their own Interview Credits."
        />
      </Card>
    </div>
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
  current: InterviewSponsor;
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
