import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Job } from '@/components/admin/console/pages/employer/types';
import { blankJob } from '@/components/admin/console/pages/employer/mockData';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { BackLink, Button, Card, Dialog, KV, TextInput, cx } from '@/components/admin/console/pages/employer/ui';
import {
  STEPS,
  applicationErrors,
  closeLabel,
  interviewErrors,
  jobDetailsErrors,
  numberOf,
  stepValid,
  windowLabel,
  type InterviewAI,
  type JobPatch,
} from '@/components/admin/console/pages/employer/views/wizard/logic';
import { StepJobDetails } from '@/components/admin/console/pages/employer/views/wizard/StepJobDetails';
import { StepInterview } from '@/components/admin/console/pages/employer/views/wizard/StepInterview';
import { ApplicationWindowCard, SponsorCard } from '@/components/admin/console/pages/employer/views/wizard/StepApplication';
import { StepPreview } from '@/components/admin/console/pages/employer/views/wizard/StepPreview';
import { DraftSummary, PublishSummary } from '@/components/admin/console/pages/employer/views/CreateJobWizard';
import { authErrorCode, authErrorMessage } from './employerAuth';
import {
  createJob,
  errorData,
  getCredits,
  getJob,
  getPublishCheck,
  publishJob,
  saveInterviewSettings,
  saveJobAssessment,
  saveJobDetails,
  saveJobPosting,
  startCreditsCheckout,
  suggestCriteria,
  suggestQuestions,
  updateJobWindow,
  type ApiJob,
  type PublishCheck,
  type PublishResult,
} from './employerApi';
import {
  apiToJob,
  assessmentBody,
  criteriaIdsByName,
  defaultTimeZoneLabel,
  defaultWindow,
  detailsBody,
  displayToIso,
  isoToWall,
  serverIdsOf,
  settingsBody,
  timeZoneIana,
} from './jobMapping';
import { FIELD_LABELS } from './orgOptions';

// Employer-app create / edit job wizard, backed by /employer/jobs. It follows
// the design (Figma "Create Job", Application & credits version); the API is
// expected to follow the design later. The admin console keeps the mock
// CreateJobWizard; both share the step components and summary cards.
//
// Design steps vs API saves (each PUT is a full replace of its body):
//   1 Job details                      → details body (POST the first time)
//   2 Interview (criteria, questions, length/instructions/language)
//                                      → assessment body; interview settings too
//                                        once who-pays is known
//   3 Application & credits (window, who pays, sponsorship limits)
//                                      → details body (window) + interview settings
//   4 Preview & publish
// The API needs a closing time when the draft is created, so a new job starts
// with a default window (opens tomorrow 9:00, closes in 30 days 17:00) that
// step 3 lets the employer change. HR contact number and the sponsorship
// limits are in the design but not in the API yet: they live in the form only.
//
// Nothing saves while typing; a step saves when the employer leaves it or
// presses Save draft. Published jobs open the same wizard as "Edit job": the
// API only lets the posting and the window change, so the interview step and
// who-pays are shown read-only.

const CONTINUE_LABELS = ['Continue to interview', 'Continue to application settings', 'Continue to preview'];

// Request bodies: 0 details, 1 assessment, 2 interview settings.
type SavedBodies = [string, string, string];
// Which bodies each design step edits.
const STEP_BODIES: number[][] = [[0], [1, 2], [0, 2]];

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// JOB_NOT_READY.missing → the step that fixes it.
const MISSING: Record<string, { label: string; step: number }> = {
  title: { label: 'Job title', step: 0 },
  employmentType: { label: 'Employment type', step: 0 },
  workplaceType: { label: 'Workplace type', step: 0 },
  location: { label: 'Job location', step: 0 },
  roleOverview: { label: 'Role overview', step: 0 },
  timezone: { label: 'Time zone', step: 2 },
  closesAt: { label: 'A closing date in the future', step: 2 },
  criteria: { label: 'Evaluation criteria', step: 1 },
  questions: { label: 'Interview questions', step: 1 },
  questionCriteria: { label: 'A criterion on every question', step: 1 },
  interviewPayer: { label: 'Who pays for interviews', step: 2 },
};

const DRAFT_NOTE = 'Publishing is free. Interview Credits are used only for sponsored interview time. Report Credits are used only when you unlock reports.';

function errorText(err: unknown, fallback: string): string {
  if (authErrorCode(err) === 'HIRING_AI_UNAVAILABLE') return 'AI suggestions are unavailable right now. Add them manually instead.';
  return authErrorMessage(err) || (err instanceof Error && !axios.isAxiosError(err) ? err.message : '') || fallback;
}

// Application window rules (design: both dates required) plus what the API
// enforces on save, publish or window change.
function windowErrors(job: Job, opensLocked = false): Record<string, boolean | string> {
  const closes = displayToIso(job.closesAt, job.timeZone);
  const opens = displayToIso(job.opensAt, job.timeZone);
  const max = job.maxApplicants.trim();
  const maxN = numberOf(max);
  return {
    opensAt: !opensLocked && !opens,
    closesAt: !closes
      ? true
      : opens && Date.parse(closes) <= Date.parse(opens)
        ? 'Must be after the opening time'
        : Date.parse(closes) <= Date.now()
          ? 'Must be in the future'
          : false,
    timeZone: !job.timeZone,
    maxApplicants: !!max && (!/^\d[\d,]*$/.test(max) || maxN < 1 || maxN > 10000) ? 'Enter a whole number from 1 to 10,000' : false,
  };
}

const none = (e: Record<string, unknown>) => !Object.values(e).some(Boolean);

// What blocks leaving a design step.
function stepErrors(job: Job, step: number, opensLocked = false): Record<string, boolean | string> {
  if (step === 0) return jobDetailsErrors(job);
  if (step === 1) return interviewErrors(job, true);
  if (step === 2) {
    // Sponsorship limits are form-only (no API fields yet) but required by the design.
    const { totalBudget, dailyBudget, maxCandidates } = applicationErrors(job);
    return { ...windowErrors(job, opensLocked), sponsor: !job.sponsor, totalBudget, dailyBudget, maxCandidates };
  }
  return {};
}

// What blocks a save of one request body (Save draft / going back). Lighter
// than stepErrors: only what the API itself rejects.
function bodyErrors(job: Job, body: number): Record<string, boolean | string> {
  if (body === 0) {
    const w = windowErrors(job);
    return { ...jobDetailsErrors(job), closesAt: w.closesAt, timeZone: w.timeZone, maxApplicants: w.maxApplicants };
  }
  if (body === 1) return interviewErrors(job, true);
  return { sponsor: !job.sponsor };
}

// Every body, so "dirty" means "differs from what the server has".
function snapshot(j: Job, a: ApiJob | null, areas: string[]): SavedBodies {
  return [JSON.stringify(detailsBody(j, a)), JSON.stringify(assessmentBody(j, a ? serverIdsOf(a) : new Set(), areas)), JSON.stringify(settingsBody(j, a))];
}

// Current time as a datetime-local value in the job's own time zone.
const nowIn = (job: Job) => isoToWall(new Date().toISOString(), timeZoneIana(job.timeZone));

function newJob(companyId: string): Job {
  const timeZone = defaultTimeZoneLabel();
  // Who pays starts unselected: the employer has to choose on step 3.
  return { ...blankJob(companyId, ''), timeZone, ...defaultWindow(timeZone), sponsor: null };
}

export function EmployerJobWizard({ jobId, checkout }: { jobId?: string; checkout?: 'success' | 'cancelled' }) {
  const { company, go } = useEmployerStore();

  const [api, setApi] = useState<ApiJob | null>(null);
  const [job, setJob] = useState<Job | null>(() => (jobId ? null : newJob(company.id)));
  const [initial, setInitial] = useState<Job | null>(null); // published jobs: the loaded form
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState<SavedBodies>(() => (job ? snapshot(job, null, []) : ['', '', '']));
  const [areas, setAreas] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [errorsStep, setErrorsStep] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [check, setCheck] = useState<PublishCheck | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAck, setPublishAck] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [live, setLive] = useState<PublishResult | null>(null);
  // Interview Credits balance for the sponsorship estimate (step 3).
  const [credits, setCredits] = useState<number | null>(null);

  // ── Load an existing job ──
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    getJob(jobId)
      .then((res) => {
        if (cancelled) return;
        const form = apiToJob(res, company.id);
        setApi(res);
        setJob(form);
        setInitial(form);
        setAreas(res.assessmentAreas ?? []);
        setSaved(snapshot(form, res, res.assessmentAreas ?? []));
        if (res.status === 'DRAFT') {
          // wizardStep = furthest step reached (1-based); back from Stripe → preview.
          const at = checkout ? 3 : Math.min(3, Math.max(0, res.wizardStep - 1));
          setStep(at);
          setMaxStep(Math.max(at, res.wizardStep - 1));
        } else {
          setMaxStep(3); // editing a live job: every step is reachable
        }
      })
      .catch((err) => !cancelled && setLoadError(axios.isAxiosError(err) && err.response?.status === 404 ? 'This job no longer exists.' : errorText(err, 'Could not load this job.')));
    return () => {
      cancelled = true;
    };
    // company.id is only used to tag the form; reload per job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const draft = !api || api.status === 'DRAFT';
  const opensLocked = api?.status === 'OPEN';

  // ── AI ──
  const aiJobId = api && draft ? api.id : null;
  const ai = useMemo<InterviewAI | undefined>(
    () =>
      aiJobId
        ? {
            suggestCriteria: async () => {
              try {
                const task = await suggestCriteria(aiJobId);
                return (task.criteria ?? []).map((c) => ({ id: uid('cr'), name: c.name, description: c.description ?? '', source: 'AI' as const }));
              } catch (err) {
                throw new Error(errorText(err, 'Could not load suggestions.'));
              }
            },
            suggestQuestions: async (criteria) => {
              const named = criteria.filter((c) => c.name.trim());
              try {
                const task = await suggestQuestions(aiJobId, named.map((c) => ({ name: c.name.trim(), description: c.description.trim() || null })));
                if (task.assessmentAreas) setAreas(task.assessmentAreas);
                return (task.questions ?? []).map((q) => ({
                  id: uid('q'),
                  text: q.text,
                  minutes: q.estimatedMinutes ?? 5,
                  criteriaIds: criteriaIdsByName(q.criterionNames, named),
                  source: 'AI' as const,
                  edited: false,
                }));
              } catch (err) {
                throw new Error(errorText(err, 'Could not generate questions.'));
              }
            },
          }
        : undefined,
    [aiJobId],
  );

  // First visit to step 2 with an empty interview: draft criteria, then questions from them.
  const generatedFor = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 1 || !ai || !job || job.criteria.length || job.questions.length || generatedFor.current === api?.id) return;
    generatedFor.current = api?.id ?? null;
    setGenerating(true);
    (async () => {
      try {
        const criteria = await ai.suggestCriteria();
        setJob((j) => (j ? { ...j, criteria, interviewConfirmed: false } : j));
        const questions = criteria.length ? await ai.suggestQuestions(criteria) : [];
        setJob((j) => (j ? { ...j, questions } : j));
        if (criteria.length) toast('Interview generated from the job details. Review every question.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not draft the interview.');
      } finally {
        setGenerating(false);
      }
    })();
  }, [step, ai, job, api?.id]);

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    getCredits()
      .then((c) => !cancelled && setCredits(c.interview))
      .catch(() => !cancelled && setCredits(null));
    return () => {
      cancelled = true;
    };
  }, [step]);

  // ── Preview: what still blocks publishing ──
  const refreshCheck = async (id: string) => {
    setCheckLoading(true);
    try {
      const c = await getPublishCheck(id);
      setCheck(c);
      return c;
    } catch {
      setCheck(null);
      return null;
    } finally {
      setCheckLoading(false);
    }
  };

  useEffect(() => {
    if (step === 3 && api && draft) void refreshCheck(api.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, api?.id]);

  // Back from Stripe: credits arrive by webhook, so poll until they show up (≤30s).
  useEffect(() => {
    if (!checkout || !api) return;
    if (checkout === 'cancelled') {
      toast('Payment cancelled. No credits were added.', { id: 'employer-checkout' });
      return;
    }
    const id = api.id;
    const deadline = Date.now() + 30_000;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const c = await refreshCheck(id);
      if (cancelled) return;
      if (c?.enoughCredits) return void toast.success('Interview Credits added.', { id: 'employer-checkout' });
      if (Date.now() > deadline) return void toast('Your payment is still processing. Refresh in a moment to see your credits.', { id: 'employer-checkout' });
      timer = setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, api?.id]);

  // ── Render guards ──
  if (loadError || (!job && jobId)) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink onClick={() => go({ name: 'jobs' })}>Back to jobs</BackLink>
        <Card>
          {loadError ? (
            <p className="text-[14px] text-[#5a6172]">{loadError}</p>
          ) : (
            <p className="text-[14px] text-[#5a6172] flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Loading job…
            </p>
          )}
        </Card>
      </div>
    );
  }
  if (!job) return null;

  if (api?.status === 'CLOSED') {
    return (
      <div className="flex flex-col gap-4">
        <BackLink onClick={() => go({ name: 'jobs' })}>Back to jobs</BackLink>
        <Card>
          <p className="text-[14px] text-[#5a6172]">This job is closed. Repost it from the Jobs page to hire for it again.</p>
        </Card>
      </div>
    );
  }

  // ── Dirty tracking ──
  const bodies = snapshot(job, api, areas);
  const dirtyBody = (b: number) => bodies[b] !== saved[b];
  // Published jobs: only the posting and window can change (dates compared through the same conversion).
  const iso = (j: Job, f: 'opensAt' | 'closesAt') => displayToIso(j[f], j.timeZone);
  const postingOf = (j: Job) => JSON.stringify({ ...detailsBody(j, api), opensAt: null, closesAt: '' });
  const windowChanged =
    !!initial && (iso(job, 'closesAt') !== iso(initial, 'closesAt') || job.timeZone !== initial.timeZone || (!opensLocked && iso(job, 'opensAt') !== iso(initial, 'opensAt')));
  const postingChanged = !!initial && postingOf(job) !== postingOf(initial);
  const dirty = draft ? (!api ? bodies[0] !== saved[0] : [0, 1, 2].some(dirtyBody)) : postingChanged || windowChanged;
  const valid = (s: number) => none(stepErrors(job, s, opensLocked));

  const update = (patch: JobPatch) => {
    setJustSaved(false);
    setJob((j) => (j ? { ...j, ...(typeof patch === 'function' ? patch(j) : patch) } : j));
  };

  const bodyOf = (b: number, form: Job, current: ApiJob | null) =>
    JSON.stringify(b === 0 ? detailsBody(form, current) : b === 1 ? assessmentBody(form, current ? serverIdsOf(current) : new Set(), areas) : settingsBody(form, current));

  // A body needs a PUT when it differs from the server, and the first time its
  // step is passed: wizardStep only moves (and the questions only count as
  // reviewed, and interviewPayer only gets stored) once that PUT has happened.
  const needsSave = (b: number, uiStep: number, form: Job, current: ApiJob | null, base: SavedBodies) =>
    !current ||
    (b === 1 && current.wizardStep < 3) ||
    (b === 2 && uiStep === 2 && current.wizardStep < 4) ||
    bodyOf(b, form, current) !== base[b];

  // Saves one body and folds the response back into the form. Returns the new
  // server copy, or null after showing the error.
  const saveBody = async (b: number, form: Job, current: ApiJob | null, base: SavedBodies, uiStep: number) => {
    try {
      let res: ApiJob;
      let next = form;
      if (b === 0) {
        const body = detailsBody(form, current);
        res = current ? await saveJobDetails(current.id, body) : await createJob(body);
        next = { ...form, id: res.id };
      } else if (b === 1) {
        res = await saveJobAssessment(current!.id, assessmentBody(form, serverIdsOf(current!), areas));
        // Created rows now have server ids; take the server's criteria/questions.
        const fresh = apiToJob(res, company.id);
        next = { ...form, criteria: fresh.criteria, questions: fresh.questions, interviewConfirmed: true };
      } else {
        res = await saveInterviewSettings(current!.id, settingsBody(form, current));
      }
      const snap = snapshot(next, res, areas);
      const out = [...base] as SavedBodies;
      out[b] = snap[b];
      // Creating the draft also stores default interview settings: rebase the rest.
      if (!current) [out[1], out[2]] = [snap[1], snap[2]];
      setApi(res);
      setJob(next);
      setSaved(out);
      return { api: res, job: next, base: out };
    } catch (err) {
      if (authErrorCode(err) === 'VALIDATION_ERROR') {
        setStep(uiStep);
        setErrorsStep(uiStep);
      }
      toast.error(errorText(err, 'Could not save the draft.'));
      return null;
    }
  };

  // Moving forward: every step in range must be valid; then save what changed.
  // Interview settings saved from step 2 only once who-pays is chosen (the API
  // requires it); otherwise they wait for step 3.
  const advanceThrough = async (steps: number[]): Promise<boolean> => {
    let form = job;
    let current = api;
    let base = saved;
    for (const s of steps) {
      if (!none(stepErrors(form, s))) {
        setStep(s);
        setErrorsStep(s);
        toast.error('Complete the required fields to continue');
        return false;
      }
      for (const b of STEP_BODIES[s]) {
        if (b === 2 && !form.sponsor) continue;
        if (!needsSave(b, s, form, current, base)) continue;
        const r = await saveBody(b, form, current, base, s);
        if (!r) return false;
        ({ api: current, job: form, base } = r);
      }
    }
    return true;
  };

  // Save draft / going back: save each changed body that the API would accept.
  // stopOnInvalid: Save draft reports what's missing; going back just skips it.
  const saveChangedBodies = async (stopOnInvalid: boolean): Promise<boolean> => {
    let form = job;
    let current = api;
    let base = saved;
    for (const b of [0, 1, 2]) {
      const changed = (b === 0 && !current) || bodyOf(b, form, current) !== base[b];
      if (!changed || (b === 2 && !form.sponsor)) continue;
      if (!none(bodyErrors(form, b))) {
        if (!stopOnInvalid) continue;
        const at = b === 1 ? 1 : b === 0 && !none(jobDetailsErrors(form)) ? 0 : 2;
        setStep(at);
        setErrorsStep(at);
        toast.error(!current ? 'Fill in the job details to save a draft' : 'Complete the required fields to save');
        return false;
      }
      const r = await saveBody(b, form, current, base, b === 1 ? 1 : 0);
      if (!r) return false;
      ({ api: current, job: form, base } = r);
    }
    return true;
  };

  const goStep = async (to: number) => {
    if (busy || to === step) return;
    // Published jobs save only on "Save changes".
    if (!draft) {
      setStep(to);
      document.querySelector('main')?.scrollTo({ top: 0 });
      return;
    }
    setBusy('Saving…');
    try {
      if (to > step) {
        if (!(await advanceThrough([0, 1, 2].filter((s) => s >= step && s < to)))) return;
      } else if (api) {
        await saveChangedBodies(false);
      }
      setErrorsStep(null);
      setStep(to);
      setMaxStep((m) => Math.max(m, to));
      document.querySelector('main')?.scrollTo({ top: 0 });
    } finally {
      setBusy(null);
    }
  };

  // Published jobs: PUT posting (dates carried as they are, since that PUT
  // ignores them but still cross-checks) and PUT window when dates changed.
  const saveLiveChanges = async (exit: boolean): Promise<boolean> => {
    if (!api) return false;
    const errs = { ...jobDetailsErrors(job), ...windowErrors(job, opensLocked) };
    if (!none(errs)) {
      const at = none(jobDetailsErrors(job)) ? 2 : 0;
      setStep(at);
      setErrorsStep(at);
      toast.error('Complete the required fields to save');
      return false;
    }
    if (!postingChanged && !windowChanged) {
      if (exit) go({ name: 'jobs' });
      return true;
    }
    setBusy('Saving…');
    try {
      if (postingChanged) await saveJobPosting(api.id, { ...detailsBody(job, api), opensAt: api.opensAt, closesAt: api.closesAt ?? '' });
      const closesAt = iso(job, 'closesAt');
      if (windowChanged && closesAt) await updateJobWindow(api.id, { opensAt: opensLocked ? api.opensAt : iso(job, 'opensAt'), closesAt });
      setInitial(job);
      setJustSaved(true);
      toast.success('Job updated');
      if (exit) go({ name: 'jobs' });
      return true;
    } catch (err) {
      const missing = authErrorCode(err) === 'JOB_NOT_READY' ? errorData<{ missing?: string[] }>(err)?.missing : undefined;
      toast.error(missing ? `These fields can't be empty: ${missing.map((m) => MISSING[m]?.label ?? m).join(', ')}` : errorText(err, 'Could not update the job.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  // Save draft: everything changed (creating the draft from step 1 if needed), then optionally leave.
  const saveDraft = async (exit: boolean): Promise<boolean> => {
    if (busy) return false;
    if (!draft) return saveLiveChanges(exit);
    setBusy('Saving…');
    try {
      if (!(await saveChangedBodies(true))) return false;
      setJustSaved(true);
      if (exit) {
        toast.success('Draft saved');
        go({ name: 'jobs' });
      } else toast.success('Draft saved');
      return true;
    } finally {
      setBusy(null);
    }
  };

  const onLeave = () => (dirty ? setLeaveOpen(true) : go({ name: 'jobs' }));

  const publish = async () => {
    if (!api || busy) return;
    setBusy('Publishing…');
    try {
      const res = await publishJob(api.id);
      setPublishOpen(false);
      setLive(res);
    } catch (err) {
      setPublishOpen(false);
      const code = authErrorCode(err);
      if (code === 'INSUFFICIENT_CREDITS') {
        setCreditsOpen(true);
      } else if (code === 'JOB_NOT_READY') {
        const missing = errorData<{ missing?: string[] }>(err)?.missing ?? [];
        setCheck((c) => (c ? { ...c, ready: false, missing } : c));
        toast.error(`Before publishing, fix: ${missing.map((m) => MISSING[m]?.label ?? m).join(', ')}`);
      } else {
        if (code === 'ORGANIZATION_PROFILE_INCOMPLETE') toast.error('Complete your company profile before publishing.');
        else toast.error(errorText(err, 'Could not publish the job.'));
      }
      void refreshCheck(api.id);
    } finally {
      setBusy(null);
    }
  };

  const stepProps = { job, update, showErrors: errorsStep === step, company, ai };
  const allValid = stepValid(job, 3);
  // Employer app gates on publish-check; the design shows it in the summary card.
  const gated = !!check && (!check.profileComplete || check.missing.length > 0);
  const finalLabel = draft ? 'Publish job' : 'Save changes';
  const lockedNote = (
    <div className="flex items-start gap-2 rounded-xl border border-[#e1e4ea] bg-[#f9fafb] px-4 py-3 text-[13px] text-[#5a6172]">
      <Lock size={15} className="shrink-0 mt-0.5" />
      The interview can't be changed after the job is published, so every candidate is assessed the same way.
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[#1e232f] text-[26px] font-semibold leading-8 tracking-tight">{draft ? 'Create a new job' : 'Edit job'}</h1>
          <p className="text-[#5a6172] text-[14px]">Add the role, review the AI-generated interview, and publish when everything looks right.</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 mt-1.5">
          {busy ? (
            <span className="text-[13px] text-[#9ba1b0]">{busy}</span>
          ) : dirty ? (
            <span className="text-[13px] text-[#9ba1b0]">Unsaved changes</span>
          ) : (
            justSaved && (
              <span className="flex items-center gap-1 text-[13px] text-[#15a560]">
                <Check size={14} /> Saved just now
              </span>
            )
          )}
          <Button variant="link" disabled={!!busy} onClick={() => void saveDraft(true)}>
            Save and exit
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-3">
        {STEPS.map((label, i) => {
          const reachable = i <= maxStep;
          const active = i === step;
          const done = i < step || (i !== step && i < maxStep && valid(i));
          return (
            <li key={label} className="flex items-center gap-3 flex-1 last:flex-none">
              <button
                type="button"
                disabled={!reachable || !!busy}
                onClick={() => void goStep(i)}
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
                {i === 2 ? 'Application & credits' : label}
              </button>
              {i < STEPS.length - 1 && <span className={cx('h-px flex-1 min-w-6', i < step ? 'bg-[#3c77f6]' : 'bg-[#e1e4ea]')} />}
            </li>
          );
        })}
      </ol>

      {/* Body */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {step === 0 && <StepJobDetails {...stepProps} />}
          {step === 1 && (
            <>
              {generating && (
                <div className="flex items-center gap-2 rounded-xl border border-[#bfd2f6] bg-[#f8fbff] px-4 py-3 text-[14px] text-[#3c77f6]">
                  <Sparkles size={16} className="shrink-0" /> Generating the interview from the job details…
                </div>
              )}
              {!draft && lockedNote}
              <fieldset disabled={!draft} className={cx('min-w-0', !draft && 'opacity-60')}>
                <StepInterview {...stepProps} />
              </fieldset>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-[#1e232f] text-[18px] font-semibold leading-7">Set the application window and interview sponsorship</h2>
                <p className="text-[#5a6172] text-[13px]">Publishing is free. Choose whether to sponsor candidates' first interviews and set your spending limits.</p>
              </div>
              <ApplicationWindowCard job={job} update={update} err={errorsStep === 2 ? windowErrors(job, opensLocked) : {}} opensLocked={opensLocked} now={nowIn(job)} />
              <fieldset disabled={!draft} className={cx('min-w-0', !draft && 'opacity-60')}>
                <SponsorCard
                  job={job}
                  update={update}
                  err={errorsStep === 2 ? stepErrors(job, 2, opensLocked) : {}}
                  credits={credits}
                  onAddCredits={api ? () => setCreditsOpen(true) : undefined}
                />
              </fieldset>
            </>
          )}
          {step === 3 && (
            <>
              <StepPreview {...stepProps} />
              {draft && (
                <PublishBlockers check={check} loading={checkLoading} onFix={(s) => void goStep(s)} onProfile={() => go({ name: 'profile', returnJobId: api?.id })} onBuy={() => setCreditsOpen(true)} />
              )}
            </>
          )}
        </div>

        <aside className="w-[300px] shrink-0 sticky top-[76px]">
          {step < 3 ? (
            <DraftSummary job={job} companyName={company.name} maxStep={maxStep} note={DRAFT_NOTE} sponsoredLabel="Recruiter sponsored" />
          ) : (
            // A live job has nothing left to publish.
            <PublishSummary job={job} companyName={company.name} ready={!draft || (allValid && (!check || check.ready))} gated={draft && gated} />
          )}
        </aside>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-white border-t border-[#e5e7eb] flex items-center gap-2 z-[20]">
        <Button variant="ghost" disabled={!!busy} onClick={() => (step === 0 ? onLeave() : void goStep(step - 1))}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button disabled={!!busy} onClick={() => void saveDraft(false)}>
            Save draft
          </Button>
          {step < 3 ? (
            <Button variant="primary" disabled={!!busy || generating} onClick={() => void goStep(step + 1)}>
              {CONTINUE_LABELS[step]} <ArrowRight size={15} />
            </Button>
          ) : (
            <Button
              variant="primary"
              // Publishing: credits are the one blocker the button itself
              // resolves; when the check failed to load, the publish call decides.
              disabled={!!busy || (draft && (checkLoading || !allValid || gated))}
              onClick={() => {
                if (!draft) return void saveLiveChanges(true);
                if (check && !check.enoughCredits) return setCreditsOpen(true);
                setPublishAck(false);
                setPublishOpen(true);
              }}
            >
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
                go({ name: 'jobs' });
              }}
            >
              Leave without saving
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">Your latest job changes have not been saved.</p>
      </Dialog>

      {/* Publish confirmation (design copy) */}
      <Dialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title={`Publish ${job.title}?`}
        width={500}
        actions={
          <>
            <Button onClick={() => setPublishOpen(false)}>Back to review</Button>
            <Button variant="primary" disabled={!publishAck || !!busy} onClick={() => void publish()}>
              {busy === 'Publishing…' ? 'Publishing…' : 'Confirm and publish'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">The job and its structured interview will become available to candidates immediately on behalf of {company.name}.</p>
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

      {api && <BuyCreditsDialog open={creditsOpen} onClose={() => setCreditsOpen(false)} jobId={api.id} check={check} beforeCheckout={() => saveDraft(false)} />}

      {/* Published (design copy) */}
      <Dialog open={!!live} onClose={() => go({ name: 'jobs' })} title="" width={460}>
        {live && (
          <>
            <div className="flex flex-col items-center text-center gap-2 -mt-4">
              <span className="w-12 h-12 rounded-full bg-[#ecfdf3] text-[#15a560] flex items-center justify-center">
                <CheckCircle2 size={24} />
              </span>
              <p className="text-[20px] font-semibold text-[#1e232f]">{live.status === 'SCHEDULED' ? 'Your job is scheduled' : 'Your job is live'}</p>
              <p className="text-[13px] text-[#5a6172]">{live.status === 'SCHEDULED' ? `${job.title} will open for applications on ${job.opensAt}.` : `${job.title} is now accepting applications.`}</p>
            </div>
            <div className="bg-[#f9fafb] border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-2">
              <KV k="Applications close" v={closeLabel(job)} />
              <KV k="Interview payment" v={job.sponsor === 'employer' ? 'Employer-sponsored' : 'Candidate-paid'} />
            </div>
            <div className="flex flex-col gap-2">
              {/* The candidate board is still mock; it opens once the board API is wired. */}
              <Button variant="primary" className="w-full" onClick={() => go({ name: 'board', jobId: live.jobId })}>
                View job overview
              </Button>
              <Button
                variant="link"
                className="mx-auto"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/opportunities/job/${live.jobId}`).then(
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
          </>
        )}
      </Dialog>
    </div>
  );
}

// ─── Publish blockers (from GET publish-check) ────────────────────────────────

function PublishBlockers({
  check,
  loading,
  onFix,
  onProfile,
  onBuy,
}: {
  check: PublishCheck | null;
  loading: boolean;
  onFix: (step: number) => void;
  onProfile: () => void;
  onBuy: () => void;
}) {
  if (loading && !check) {
    return (
      <p className="text-[13px] text-[#5a6172] flex items-center gap-2">
        <RefreshCw size={13} className="animate-spin" /> Checking whether the job is ready to publish…
      </p>
    );
  }
  if (!check || check.ready) return null;
  return (
    <div className="flex flex-col gap-3">
      {check.missing.length > 0 && (
        <Blocker title="Finish the job before publishing.">
          <ul className="flex flex-col gap-1">
            {check.missing.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span>• {MISSING[m]?.label ?? m}</span>
                {MISSING[m] && (
                  <button type="button" onClick={() => onFix(MISSING[m].step)} className="text-[#3c77f6] font-medium hover:underline">
                    Fix
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Blocker>
      )}
      {!check.profileComplete && (
        <Blocker title="Complete your company profile before publishing.">
          <span>Still needed: {check.profileMissingFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}.</span>
          <Button variant="link" className="w-fit" onClick={onProfile}>
            Complete company profile <ArrowRight size={14} />
          </Button>
        </Blocker>
      )}
      {!check.enoughCredits && (
        <Blocker title="Not enough Interview Credits.">
          <span>
            Publishing uses {check.creditsRequired} Interview Credit. You have {check.interviewCreditsAvailable}.
          </span>
          <Button variant="link" className="w-fit" onClick={onBuy}>
            Buy Interview Credits <ArrowRight size={14} />
          </Button>
        </Blocker>
      )}
    </div>
  );
}

function Blocker({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#f5c451] bg-[#fffbeb] px-4 py-3 text-[14px] text-[#b45309]">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold">{title}</span>
        {children}
      </div>
    </div>
  );
}

// ─── Buy credits → Stripe ─────────────────────────────────────────────────────

// beforeCheckout saves the draft first (step 3 may have unsaved edits); it
// returns false when that failed, and checkout doesn't start.
function BuyCreditsDialog({
  open,
  onClose,
  jobId,
  check,
  beforeCheckout,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  check: PublishCheck | null;
  beforeCheckout: () => Promise<boolean>;
}) {
  const short = check ? Math.max(1, check.creditsRequired - check.interviewCreditsAvailable) : 1;
  const [quantity, setQuantity] = useState(String(short));
  const [busy, setBusy] = useState(false);
  const n = Math.round(Number(quantity));
  const validQty = Number.isFinite(n) && n >= 1 && n <= 100;

  useEffect(() => {
    if (open) setQuantity(String(short));
  }, [open, short]);

  const buy = async () => {
    setBusy(true);
    try {
      if (!(await beforeCheckout())) return setBusy(false);
      window.location.href = await startCreditsCheckout({ creditType: 'EMPLOYER_INTERVIEW', quantity: n, jobId });
    } catch (err) {
      toast.error(errorText(err, 'Could not start checkout.'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buy Interview Credits"
      width={460}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!validQty || busy} onClick={() => void buy()}>
            {busy ? 'Opening checkout…' : 'Continue to payment'}
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-[#5a6172]">
        Interview Credits fund sponsored interviews{check && check.creditsRequired > 0 ? ` and publishing (${check.creditsRequired} per job)` : ''}.{check ? ` You have ${check.interviewCreditsAvailable}.` : ''} You'll come back here after paying, and the job stays saved as a draft.
      </p>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[#1e232f]">
        Number of credits
        <TextInput type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="!w-32" />
        {!validQty && <span className="text-[12px] text-[#dc2626] font-normal">Enter 1 to 100</span>}
      </label>
    </Dialog>
  );
}
