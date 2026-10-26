import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { EmploymentType, PayPeriod, WorkplaceType } from '../../types';
import { Card, Divider, Field, Segmented, Select, TextArea, TextInput } from '../../ui';
import { BulletListEditor, CardTitle, ErrorHint } from './shared';
import { CURRENCIES, EMPLOYMENT_TYPES, jobDetailsErrors, type StepProps } from './logic';

const OVERVIEW_MAX = 2000;

// showPhone: the employer jobs API has no HR contact number field.
export function StepJobDetails({ job, update, showErrors, showPhone = true }: StepProps & { showPhone?: boolean }) {
  const err = showErrors ? jobDetailsErrors(job) : ({} as Record<string, boolean>);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[#1e232f] text-[18px] font-semibold leading-7">Tell candidates about the role</h2>
        <p className="text-[#5a6172] text-[13px]">Add the core information candidates need before deciding to apply.</p>
      </div>

      <Card className="p-6 flex flex-col gap-5">
        <CardTitle>Role information</CardTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job title" required hint={<ErrorHint show={!!err.title} />}>
            <TextInput value={job.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Backend Engineer" />
          </Field>
          <Field label="Department">
            <TextInput value={job.department} onChange={(e) => update({ department: e.target.value })} placeholder="e.g. Engineering" />
          </Field>
          <Field label="Employment type" required>
            <Select value={job.employmentType} onChange={(v) => update({ employmentType: v as EmploymentType })} options={[...EMPLOYMENT_TYPES]} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#1e232f]">
              Workplace type<span className="text-[#ef4444] ml-0.5">*</span>
            </span>
            <Segmented<WorkplaceType>
              value={job.workplace}
              onChange={(v) => update({ workplace: v })}
              options={[
                { value: 'On-site', label: 'On-site' },
                { value: 'Hybrid', label: 'Hybrid' },
                { value: 'Remote', label: 'Remote' },
              ]}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job location" required hint={<ErrorHint show={!!err.location} />}>
            <TextInput value={job.location} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Chicago, Illinois" />
          </Field>
          {showPhone && (
            <Field label="HR contact number">
              <TextInput
                type="tel"
                autoComplete="tel"
                value={job.hrContactPhone}
                onChange={(e) => update({ hrContactPhone: e.target.value })}
                placeholder="e.g. (312) 555-0148"
              />
            </Field>
          )}
        </div>

        <Divider />

        <CardTitle>Salary range</CardTitle>
        <div className="grid grid-cols-4 gap-4 items-end">
          <Field label="Minimum salary">
            <TextInput value={job.salaryMin} onChange={(e) => update({ salaryMin: e.target.value })} placeholder="120,000" inputMode="numeric" />
          </Field>
          <Field label="Maximum salary">
            <TextInput value={job.salaryMax} onChange={(e) => update({ salaryMax: e.target.value })} placeholder="150,000" inputMode="numeric" />
          </Field>
          <Field label="Currency">
            <Select value={job.currency} onChange={(v) => update({ currency: v })} options={CURRENCIES} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#1e232f]">Pay period</span>
            <Segmented<PayPeriod>
              value={job.payPeriod}
              onChange={(v) => update({ payPeriod: v })}
              options={[
                { value: 'Hourly', label: 'Hourly' },
                { value: 'Annual', label: 'Annual' },
              ]}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[#1e232f] w-fit cursor-pointer">
          <input type="checkbox" checked={job.showSalary} onChange={(e) => update({ showSalary: e.target.checked })} className="w-4 h-4 accent-[#3c77f6]" />
          Show salary range on this job post
        </label>
      </Card>

      <Card className="p-6 flex flex-col gap-5">
        <CardTitle>Job description</CardTitle>
        <Field
          label="Role overview"
          required
          right={`${job.overview.length} / ${OVERVIEW_MAX} chars`}
          hint={showErrors && err.overview ? <ErrorHint show /> : 'Describe the role and its impact.'}
        >
          <TextArea rows={5} maxLength={OVERVIEW_MAX} value={job.overview} onChange={(e) => update({ overview: e.target.value })} />
        </Field>

        <BulletListEditor
          label="Key responsibilities"
          required
          items={job.responsibilities}
          onChange={(responsibilities) => update({ responsibilities })}
          addLabel="Add another responsibility"
          error={err.responsibilities}
        />
        <BulletListEditor
          label="Requirements"
          required
          items={job.requirements}
          onChange={(requirements) => update({ requirements })}
          addLabel="Add another requirement"
          error={err.requirements}
        />
        <BulletListEditor
          label="Preferred qualifications (Optional)"
          items={job.preferred}
          onChange={(preferred) => update({ preferred })}
          addLabel="Add another preferred qualification"
        />

        <Divider />
        <button
          type="button"
          onClick={() => toast('AI writing assist is not connected yet')}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#3c77f6] hover:underline w-fit"
        >
          <Sparkles size={14} /> Improve writing with AI
        </button>
      </Card>
    </div>
  );
}
