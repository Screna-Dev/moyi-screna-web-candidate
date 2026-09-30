import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Job } from '../types';
import { backendCriteria, backendQuestions } from '../mockData';
import { useEmployerStore } from '../store';
import { BackLink, Button, Card, Dialog, Divider, KV, Pill, cx, statusTone } from '../ui';
import { closeLabel, displayToInput, STEPS, stepValid, windowLabel, type JobPatch } from './wizard/logic';
import { StepJobDetails } from './wizard/StepJobDetails';
import { StepInterview } from './wizard/StepInterview';
import { StepApplication } from './wizard/StepApplication';
import { StepPreview } from './wizard/StepPreview';

// Create / edit / reopen a job. Works on a local copy of the job and only
// writes to the store on Save draft, Save and exit, or Publish. Credits and
// billing from the employer design are left out — the admin controls those.

const CONTINUE_LABELS = ['Continue to interview', 'Continue to application settings', 'Continue to preview'];

// Index of the first step that isn't valid yet (3 when everything is).
function furthestReachable(j: Job): number {
  for (let i = 0; i < 3; i++) if (!stepValid(j, i)) return i;
  return 3;
}

export function CreateJobWizard({ jobId }: { jobId?: string }) {
  const store = useEmployerStore();
  const { company, go } = store;

  const [job, setJob] = useState<Job | null>(() => (jobId ? store.getJob(jobId) ?? null : null));
  const [snapshot, setSnapshot] = useState(() => (job ? JSON.stringify(job) : ''));
  const [originalStatus] = useState(() => job?.status ?? 'Draft');
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(() => (job ? furthestReachable(job) : 0));
  const [errorsStep, setErrorsStep] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAck, setPublishAck] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  // New job: create the draft once. The ref survives StrictMode's double effect.
  const created = useRef(false);
  // A brand-new draft nobody saved is discarded on "Leave without saving"
  // instead of lingering in the jobs list as an untitled row.
  const everSaved = useRef(!!jobId);
  useEffect(() => {
    if (jobId || created.current) return;
    created.current = true;
    const draft = store.createDraftJob();
    setJob(draft);
    setSnapshot(JSON.stringify(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (!job) {
    if (!jobId) return null; // draft is being created
    return (
      <div className="flex flex-col gap-4">
        <BackLink onClick={() => go({ name: 'jobs' })}>Back to jobs</BackLink>
        <Card>
          <p className="text-[14px] text-[#5a6172]">This job no longer exists.</p>
        </Card>
      </div>
    );
  }

  const dirty = JSON.stringify(job) !== snapshot;
  const mode: 'publish' | 'reopen' | 'update' = originalStatus === 'Draft' ? 'publish' : originalStatus === 'Closed' ? 'reopen' : 'update';
  const allValid = stepValid(job, 3);

  const update = (patch: JobPatch) => {
    setJustSaved(false);
    setJob((j) => (j ? { ...j, ...(typeof patch === 'function' ? patch(j) : patch) } : j));
  };

  const persist = () => {
    store.saveJob(job);
    everSaved.current = true;
    setSnapshot(JSON.stringify(job));
    setJustSaved(true);
  };

  const goStep = (n: number) => {
    // Simulated AI generation: entering the interview step with nothing set up
    // seeds the standard criteria and questions for the admin to edit.
    if (n >= 1 && job.criteria.length === 0 && job.questions.length === 0) {
      update({ criteria: backendCriteria.map((c) => ({ ...c })), questions: backendQuestions.map((q) => ({ ...q })) });
      toast('Interview generated from the job details. Review every question.');
    }
    setErrorsStep(null);
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    document.querySelector('main')?.scrollTo({ top: 0 });
  };

  const onContinue = () => {
    if (!stepValid(job, step)) {
      setErrorsStep(step);
      toast.error('Complete the required fields to continue');
      return;
    }
    goStep(step + 1);
  };

  const leave = () => {
    if (!everSaved.current) store.deleteJob(job.id);
    go({ name: 'jobs' });
  };

  const onLeave = () => (dirty ? setLeaveOpen(true) : leave());

  const onFinal = () => {
    if (mode === 'update') {
      persist();
      toast.success('Job updated');
      go({ name: 'jobs' });
      return;
    }
    setPublishAck(false);
    setPublishOpen(true);
  };

  const publish = () => {
    const opens = displayToInput(job.opensAt);
    const status: 'Open' | 'Scheduled' = opens && new Date(opens).getTime() > Date.now() ? 'Scheduled' : 'Open';
    store.saveJob(job);
    store.publishJob(job.id, status);
    everSaved.current = true;
    const live = { ...job, status };
    setJob(live);
    setSnapshot(JSON.stringify(live));
    setPublishOpen(false);
    setLiveOpen(true);
  };

  const jobLink = `${window.location.origin}/opportunities/job/${job.id}`;
  const heading = originalStatus === 'Draft' ? 'Create a new job' : originalStatus === 'Closed' ? 'Reopen job' : 'Edit job';
  const finalLabel = mode === 'publish' ? 'Publish job' : mode === 'reopen' ? 'Reopen job' : 'Save changes';
  const stepProps = { job, update, showErrors: errorsStep === step, company };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[#1e232f] text-[26px] font-semibold leading-8 tracking-tight">{heading}</h1>
          <p className="text-[#5a6172] text-[14px]">Add the role, review the AI-generated interview, and publish when everything looks right.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 mt-1.5">
          {dirty ? (
            <span className="text-[13px] text-[#9ba1b0]">Unsaved changes</span>
          ) : (
            justSaved && (
              <span className="flex items-center gap-1 text-[13px] text-[#15a560]">
                <Check size={14} /> Saved just now
              </span>
            )
          )}
          <Button
            variant="link"
            onClick={() => {
              persist();
              toast.success('Draft saved');
              go({ name: 'jobs' });
            }}
          >
            Save and exit
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-3">
        {STEPS.map((label, i) => {
          const reachable = i <= maxStep;
          const active = i === step;
          const done = i < step || (i !== step && i < maxStep && stepValid(job, i));
          return (
            <li key={label} className="flex items-center gap-3 flex-1 last:flex-none">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => goStep(i)}
                className={cx('flex items-center gap-2 text-[14px] whitespace-nowrap', active ? 'text-[#3c77f6] font-semibold' : reachable ? 'text-[#1e232f] hover:text-[#3c77f6]' : 'text-[#9ba1b0] cursor-default')}
              >
                <span
                  className={cx(
                    'w-6 h-6 rounded-full text-[12px] flex items-center justify-center border',
                    active ? 'bg-[#3c77f6] border-[#3c77f6] text-white' : done ? 'bg-[#eef4ff] border-[#bfd2f6] text-[#3c77f6]' : 'bg-white border-[#d7dce5] text-[#5a6172]',
                  )}
                >
                  {done ? <Check size={13} /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className={cx('h-px flex-1 min-w-6', i < step ? 'bg-[#3c77f6]' : 'bg-[#e1e4ea]')} />}
            </li>
          );
        })}
      </ol>

      {/* Body */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          {step === 0 && <StepJobDetails {...stepProps} />}
          {step === 1 && <StepInterview {...stepProps} />}
          {step === 2 && <StepApplication {...stepProps} />}
          {step === 3 && <StepPreview {...stepProps} />}
        </div>

        <aside className="w-[300px] shrink-0 sticky top-[76px]">
          {step < 3 ? <DraftSummary job={job} companyName={company.name} maxStep={maxStep} /> : <PublishSummary job={job} companyName={company.name} ready={allValid} />}
        </aside>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-white border-t border-[#e5e7eb] flex items-center gap-2 z-[20]">
        <Button variant="ghost" onClick={() => (step === 0 ? onLeave() : goStep(step - 1))}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => {
              persist();
              toast.success('Draft saved');
            }}
          >
            Save draft
          </Button>
          {step < 3 ? (
            <Button variant="primary" onClick={onContinue}>
              {CONTINUE_LABELS[step]} <ArrowRight size={15} />
            </Button>
          ) : (
            <Button variant="primary" disabled={!allValid} onClick={onFinal}>
              {finalLabel} <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>

      {/* Leave without saving */}
      <Dialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Leave without saving?"
        width={460}
        actions={
          <>
            <Button onClick={() => setLeaveOpen(false)}>Keep editing</Button>
            <Button
              variant="danger"
              onClick={() => {
                setLeaveOpen(false);
                leave();
              }}
            >
              Leave without saving
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">Your latest job changes have not been saved.</p>
      </Dialog>

      {/* Publish confirmation */}
      <Dialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title={`${mode === 'reopen' ? 'Reopen' : 'Publish'} ${job.title}?`}
        width={500}
        actions={
          <>
            <Button onClick={() => setPublishOpen(false)}>Back to review</Button>
            <Button variant="primary" disabled={!publishAck} onClick={publish}>
              Confirm and {mode === 'reopen' ? 'reopen' : 'publish'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">
          The job and its structured interview will become available to candidates immediately on behalf of {company.name}.
        </p>
        <div className="bg-[#f9fafb] rounded-xl p-4 flex flex-col gap-2">
          <KV k="Application window" v={windowLabel(job)} />
          <KV k="AI interview" v={`${job.questions.length} questions · ~${job.interviewLength} min`} />
          <KV k="Interview payment" v={job.sponsor === 'employer' ? 'Employer-sponsored' : 'Candidate-paid'} />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-[#1e232f] cursor-pointer">
          <input type="checkbox" checked={publishAck} onChange={(e) => setPublishAck(e.target.checked)} className="w-4 h-4 accent-[#3c77f6]" />
          I confirm this job and interview are ready to go live.
        </label>
      </Dialog>

      {/* Published */}
      <Dialog open={liveOpen} onClose={() => go({ name: 'jobs' })} title="" width={460}>
        <div className="flex flex-col items-center text-center gap-2 -mt-4">
          <span className="w-12 h-12 rounded-full bg-[#ecfdf3] text-[#15a560] flex items-center justify-center">
            <CheckCircle2 size={24} />
          </span>
          <p className="text-[20px] font-semibold text-[#1e232f]">{job.status === 'Scheduled' ? 'Your job is scheduled' : 'Your job is live'}</p>
          <p className="text-[13px] text-[#5a6172]">{job.status === 'Scheduled' ? `${job.title} will open for applications on ${job.opensAt}.` : `${job.title} is now accepting applications.`}</p>
        </div>
        <div className="bg-[#f9fafb] border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-2">
          <KV k="Applications close" v={closeLabel(job)} />
          <KV k="Interview payment" v={job.sponsor === 'employer' ? 'Employer-sponsored' : 'Candidate-paid'} />
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="primary" className="w-full" onClick={() => go({ name: 'board', jobId: job.id })}>
            View job overview
          </Button>
          <Button
            variant="link"
            className="mx-auto"
            onClick={() => {
              navigator.clipboard?.writeText(jobLink).then(
                () => toast.success('Job link copied'),
                () => toast.error('Could not copy the link'),
              );
            }}
          >
            Copy job link
          </Button>
          <Button variant="link" className="mx-auto" onClick={() => go({ name: 'dashboard' })}>
            Back to dashboard
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function StatusCell({ ok, okLabel, pending }: { ok: boolean; okLabel: string; pending: string }) {
  return ok ? (
    <span className="flex items-center gap-1 text-[#15a560]">
      <Check size={13} /> {okLabel}
    </span>
  ) : (
    <span className="text-[#5a6172] font-normal">{pending}</span>
  );
}

function DraftSummary({ job, companyName, maxStep }: { job: Job; companyName: string; maxStep: number }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <span className="text-[15px] font-semibold text-[#1e232f]">Job draft</span>
      <KV k="Job title" v={job.title || '—'} />
      <KV k="Status" v={<Pill tone={statusTone(job.status)}>{job.status}</Pill>} />
      <KV k="Company" v={companyName} />
      <Divider />
      <KV k="Job details" v={<StatusCell ok={stepValid(job, 0)} okLabel="Complete" pending="Incomplete" />} />
      <KV k="Interview" v={<StatusCell ok={stepValid(job, 1)} okLabel="Confirmed" pending="Not reviewed" />} />
      <KV k="Application window" v={<StatusCell ok={!!job.opensAt && !!job.closesAt} okLabel="Set" pending="Not set" />} />
      <KV
        k="Sponsorship"
        v={
          <StatusCell
            ok={maxStep >= 2 && stepValid(job, 2)}
            okLabel={job.sponsor === 'employer' ? 'Employer sponsored' : 'Candidate-paid'}
            pending="Not selected"
          />
        }
      />
      <Divider />
      <p className="text-[12px] text-[#5a6172]">Nothing is visible to candidates until the job is published.</p>
    </Card>
  );
}

function PublishSummary({ job, companyName, ready }: { job: Job; companyName: string; ready: boolean }) {
  const sponsored = job.sponsor === 'employer';
  const missing = [
    !stepValid(job, 0) && 'Job details',
    !stepValid(job, 1) && 'Interview review',
    !stepValid(job, 2) && 'Application & sponsorship',
  ].filter(Boolean) as string[];

  return (
    <Card className="p-5 flex flex-col gap-3">
      <span className="text-[15px] font-semibold text-[#1e232f]">Publish summary</span>
      <KV k="Job title" v={job.title || '—'} />
      <KV k="Company" v={companyName} />
      <KV k="Application window" v={windowLabel(job)} />
      <KV k="AI Interview" v={`${job.questions.length} questions`} />
      <KV k="Estimated duration" v={`Approximately ${job.interviewLength} minutes`} />
      <KV k="Interview sponsor" v={<span className="text-[#3c77f6]">{sponsored ? 'Employer-sponsored' : 'Candidate-paid'}</span>} />
      {sponsored && (
        <>
          <Divider />
          <span className="text-[14px] font-semibold text-[#1e232f]">Sponsorship limits</span>
          <KV k="Total interview budget" v={`${job.sponsorship.totalBudget || '—'} credits`} />
          <KV k="Daily interview budget" v={`${job.sponsorship.dailyBudget || '—'} credits`} />
          <KV k="Maximum sponsored candidates" v={job.sponsorship.maxCandidates || '—'} />
          <p className="text-[12px] text-[#5a6172]">
            All three limits apply. New interviews become self-funded when any limit is reached. Only first interviews are eligible for sponsorship.
          </p>
        </>
      )}
      {!ready ? (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3 text-[12px] text-[#b45309]">
          Before publishing, finish: {missing.join(', ')}.
        </div>
      ) : (
        <div className="bg-[#ecfdf3] border border-[#bbf7d0] rounded-lg p-3 text-[12px] text-[#15a560] font-medium">Ready to publish.</div>
      )}
    </Card>
  );
}
