import { useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import type { Job } from '../../types';
import { Card, Segmented } from '../../ui';
import { closeLabel, salaryLabel, type StepProps } from './logic';

type Tab = 'posting' | 'interview';

export function StepPreview({ job, company }: StepProps) {
  const [tab, setTab] = useState<Tab>('posting');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[#1e232f] text-[18px] font-semibold leading-7">Review everything before publishing</h2>
        <p className="text-[#5a6172] text-[13px]">Preview the candidate experience before the job goes live.</p>
      </div>

      <Segmented<Tab>
        className="w-fit min-w-[320px]"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'posting', label: 'Job posting' },
          { value: 'interview', label: 'Interview experience' },
        ]}
      />

      <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#5a6172]">{tab === 'posting' ? 'Candidate preview' : 'Interview preview'}</span>

      {tab === 'posting' ? <PostingPreview job={job} companyName={company.name} initials={company.initials} /> : <InterviewPreview job={job} />}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  const list = items.filter((i) => i.trim());
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1 text-[14px] text-[#5a6172] leading-[22px]">
      {list.map((i, k) => (
        <li key={k}>{i}</li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: string }) {
  return <span className="text-[12px] bg-[#f3f4f7] border border-[#e1e4ea] rounded-md px-2 py-0.5 text-[#1e232f]">{children}</span>;
}

function PostingPreview({ job, companyName, initials }: { job: Job; companyName: string; initials: string }) {
  const salary = salaryLabel(job);
  return (
    <Card className="p-7 flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-xl bg-[#eef4ff] text-[#3c77f6] text-[15px] font-bold flex items-center justify-center">{initials}</span>
        <div>
          <p className="text-[20px] font-semibold text-[#1e232f] leading-7">{job.title || 'Untitled job'}</p>
          <p className="text-[13px] text-[#5a6172]">
            {companyName}
            {job.location && <> &nbsp;•&nbsp; {job.location}</>}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip>{job.workplace}</Chip>
        <Chip>{job.employmentType}</Chip>
        {salary && <Chip>{salary}</Chip>}
        <Chip>{job.sponsor === 'employer' ? 'Employer-sponsored interview' : 'Candidate-paid interview'}</Chip>
      </div>
      <div className="h-px bg-[#e1e4ea]" />

      <section className="flex flex-col gap-2">
        <h4 className="text-[15px] font-semibold text-[#1e232f]">About this role</h4>
        <p className="text-[14px] text-[#5a6172] leading-[22px] whitespace-pre-line">{job.overview}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h4 className="text-[15px] font-semibold text-[#1e232f]">Responsibilities</h4>
        <Bullets items={job.responsibilities} />
      </section>
      <section className="flex flex-col gap-2">
        <h4 className="text-[15px] font-semibold text-[#1e232f]">Requirements</h4>
        <Bullets items={job.requirements} />
      </section>
      {job.preferred.some((p) => p.trim()) && (
        <section className="flex flex-col gap-2">
          <h4 className="text-[15px] font-semibold text-[#1e232f]">Preferred qualifications</h4>
          <Bullets items={job.preferred} />
        </section>
      )}

      <div className="bg-[#f3f4f7] rounded-xl px-5 py-4 flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-[#1e232f]">Application details</span>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#5a6172]">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} /> Applications close: {closeLabel(job)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> Estimated interview: {job.interviewLength} minutes
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled className="bg-[#e5e7eb] text-[#5a6172] text-[14px] font-medium px-6 py-2 rounded-xl cursor-not-allowed">
          Apply
        </button>
        <span className="text-[12px] italic text-[#5a6172]">Preview only</span>
      </div>
    </Card>
  );
}

function InterviewPreview({ job }: { job: Job }) {
  const first = job.questions[0];
  return (
    <Card className="p-7 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-[18px] font-semibold text-[#1e232f]">Structured AI Interview</p>
        <p className="text-[14px] text-[#5a6172] leading-[22px]">
          This structured AI interview helps us evaluate your experience, reasoning, and communication through a consistent set of recorded responses.
        </p>
      </div>
      <div className="flex gap-2">
        <Chip>{`${job.questions.length} Questions`}</Chip>
        <Chip>{`${job.interviewLength} min duration`}</Chip>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-[#1e232f]">Core evaluation areas</span>
        <div className="flex flex-wrap gap-1.5">
          {job.criteria.map((c) => (
            <span key={c.id} className="text-[12px] bg-[#eef4ff] text-[#3c77f6] rounded-md px-2 py-0.5">
              {c.name}
            </span>
          ))}
        </div>
      </div>
      <div className="h-px bg-[#e1e4ea]" />
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-[#1e232f]">Candidate Instructions</span>
        <p className="text-[14px] text-[#5a6172] leading-[22px] whitespace-pre-line">{job.candidateInstructions}</p>
      </div>
      {first && (
        <div className="bg-[#f3f4f7] rounded-xl px-5 py-4 flex flex-col gap-2">
          <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#3c77f6]">Sample question 1</span>
          <p className="text-[14px] font-semibold text-[#1e232f] leading-[22px]">{first.text}</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="button" disabled className="bg-[#e5e7eb] text-[#5a6172] text-[14px] font-medium px-5 py-2 rounded-xl cursor-not-allowed">
          Begin interview
        </button>
        <span className="text-[12px] italic text-[#5a6172]">Preview only</span>
      </div>
    </Card>
  );
}
