import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { BackLink, Button, Card, EmptyBox, PageTitle, Pill } from '@/components/admin/console/pages/employer/ui';
import { authErrorCode, authErrorMessage } from './employerAuth';
import {
  draftJobSuggestion,
  errorData,
  getJobSuggestion,
  listJobSuggestions,
  prepareJobSuggestion,
  publishJobSuggestion,
  type JobSuggestion,
} from './employerApi';
import { FIELD_LABELS } from './orgOptions';

// Suggested jobs (#334, employer outreach doc 08 §3). An org that signed up
// with a trial code linked to job-pool postings sees that company's open
// roles here and can publish one in a click, or open it as a draft first.
// No design yet: plain cards in the employer app's style.
// - NOT_PREPARED → Prepare; PREPARING → spinner, poll every 5 s for up to
//   3 min (the server keeps going after that); READY → Publish (only when
//   nothing is missing) + Edit first; FAILED → Try again.
// - A 404 while polling means the suggestion is gone (the posting closed, or
//   another tab made a job from it): reload the list.
// - Criteria and questions can only be edited in the draft: after publishing
//   they are fixed.

const POLL_MS = 5000;
const POLL_LIMIT_MS = 3 * 60_000;

function errorText(err: unknown, fallback: string): string {
  switch (authErrorCode(err)) {
    case 'JOB_POOL_UNAVAILABLE':
      return 'Suggested jobs are temporarily unavailable. Please try again in a few minutes.';
    case 'ORGANIZATION_SEAT_INACTIVE':
      return "You don't have an active seat in your organization. Ask your admin to assign you one.";
    case 'JOB_SUGGESTION_NOT_READY':
      return "This job isn't ready yet. Prepare it first.";
    default:
      return authErrorMessage(err) || fallback;
  }
}

const dateLabel = (iso: string | null) => (iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)) : '');

export function EmployerSuggestedJobsView() {
  const { go } = useEmployerStore();
  const [items, setItems] = useState<JobSuggestion[] | null>(null);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [failed, setFailed] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<Record<string, 'prepare' | 'publish' | 'draft' | undefined>>({});
  const [slow, setSlow] = useState<Record<string, boolean>>({});
  const polls = useRef(new Map<string, number>());

  useEffect(() => {
    let cancelled = false;
    setFailed('');
    listJobSuggestions(page)
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setLast(r.pageMeta?.last ?? true);
      })
      .catch((err) => !cancelled && setFailed(errorText(err, "Couldn't load suggested jobs.")));
    return () => {
      cancelled = true;
    };
  }, [page, reload]);

  // Stop every poll when leaving the page.
  useEffect(() => {
    const map = polls.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const replace = (s: JobSuggestion) => setItems((prev) => prev?.map((x) => (x.suggestionId === s.suggestionId ? s : x)) ?? prev);
  const drop = (id: string) => setItems((prev) => prev?.filter((x) => x.suggestionId !== id) ?? prev);

  const poll = useCallback((id: string, startedAt = Date.now()) => {
    if (polls.current.has(id)) return;
    // The entry stays in the map (-1 while a request is in flight) until the
    // poll ends, so re-renders never start a second one.
    const tick = async () => {
      polls.current.set(id, -1);
      try {
        const s = await getJobSuggestion(id);
        if (!polls.current.has(id)) return; // left the page
        replace(s);
        if (s.preparation.status !== 'PREPARING') return void polls.current.delete(id);
        if (Date.now() - startedAt > POLL_LIMIT_MS) {
          polls.current.delete(id);
          setSlow((m) => ({ ...m, [id]: true }));
          return;
        }
        polls.current.set(id, window.setTimeout(() => void tick(), POLL_MS));
      } catch (err) {
        polls.current.delete(id);
        if (authErrorCode(err) === 'NOT_FOUND' || (err as { response?: { status?: number } })?.response?.status === 404) {
          toast("That job is no longer available. We've refreshed the list.");
          setReload((r) => r + 1);
        } else {
          setSlow((m) => ({ ...m, [id]: true }));
        }
      }
    };
    polls.current.set(id, window.setTimeout(() => void tick(), POLL_MS));
  }, []);

  // Pick up items already being prepared (e.g. right after sign-up).
  useEffect(() => {
    items?.forEach((s) => s.preparation.status === 'PREPARING' && !slow[s.suggestionId] && poll(s.suggestionId));
  }, [items, poll, slow]);

  const run = async (id: string, kind: 'prepare' | 'publish' | 'draft', fn: () => Promise<void>) => {
    if (busy[id]) return;
    setBusy((b) => ({ ...b, [id]: kind }));
    try {
      await fn();
    } finally {
      setBusy((b) => ({ ...b, [id]: undefined }));
    }
  };

  const prepare = (s: JobSuggestion) =>
    run(s.suggestionId, 'prepare', async () => {
      try {
        const next = await prepareJobSuggestion(s.suggestionId);
        replace(next ?? { ...s, preparation: { status: 'PREPARING', missing: [] } });
        setSlow((m) => ({ ...m, [s.suggestionId]: false }));
        if (!next || next.preparation.status === 'PREPARING') poll(s.suggestionId);
      } catch (err) {
        toast.error(errorText(err, "Couldn't start preparing this job."));
      }
    });

  const editFirst = (s: JobSuggestion) =>
    run(s.suggestionId, 'draft', async () => {
      try {
        const job = await draftJobSuggestion(s.suggestionId);
        go({ name: 'wizard', jobId: job.id });
      } catch (err) {
        if (authErrorCode(err) === 'INVALID_STATE') {
          toast("This job has already been published. Find it in My Jobs.");
          drop(s.suggestionId);
        } else toast.error(errorText(err, "Couldn't open this job for editing."));
      }
    });

  const publish = (s: JobSuggestion) =>
    run(s.suggestionId, 'publish', async () => {
      try {
        const res = await publishJobSuggestion(s.suggestionId);
        toast.success(res.status === 'SCHEDULED' ? `${res.title || s.title} is scheduled` : `${res.title || s.title} is live`);
        drop(s.suggestionId);
        go({ name: 'jobs' });
      } catch (err) {
        const code = authErrorCode(err);
        if (code === 'JOB_NOT_READY') {
          const missing = errorData<{ missing?: string[] }>(err)?.missing ?? [];
          replace({ ...s, preparation: { ...s.preparation, missing } });
          toast.error('A few details are missing. Use "Edit first" to fill them in.');
        } else if (code === 'ORGANIZATION_PROFILE_INCOMPLETE') {
          const fields = errorData<{ missingFields?: string[] }>(err)?.missingFields ?? [];
          const names = fields.map((f) => FIELD_LABELS[f as keyof typeof FIELD_LABELS] ?? f).join(', ');
          toast.error(`Complete your company profile first${names ? `: ${names}` : ''}. Then publish again.`, {
            action: { label: 'Open profile', onClick: () => go({ name: 'profile' }) },
          });
        } else if (code === 'INVALID_STATE') {
          toast.error('You already have a draft from this job. Publish it from the job editor.', {
            action: { label: 'Open draft', onClick: () => void editFirst(s) },
          });
        } else toast.error(errorText(err, "Couldn't publish this job."));
      }
    });

  return (
    <div className="flex flex-col gap-5 pb-12">
      <BackLink onClick={() => go({ name: 'jobs' })}>Back to jobs</BackLink>
      <PageTitle
        title="Suggested jobs"
        subtitle="Roles your company is hiring for. Publish one as is, or edit it first. Criteria and questions can only be changed before publishing."
      />

      {failed ? (
        <Card className="p-0">
          <EmptyBox title={failed} actions={<Button onClick={() => setReload((r) => r + 1)}>Try again</Button>} />
        </Card>
      ) : !items ? (
        <p className="flex items-center justify-center gap-2 text-[14px] text-[#5a6172] py-10">
          <Loader2 size={14} className="animate-spin" /> Loading suggested jobs…
        </p>
      ) : items.length === 0 ? (
        <Card className="p-0">
          <EmptyBox
            icon={<Sparkles size={20} />}
            title="No suggested jobs"
            body="Jobs you create from a suggestion move to My Jobs."
            actions={<Button onClick={() => go({ name: 'jobs' })}>Go to My Jobs</Button>}
          />
        </Card>
      ) : (
        <>
          {items.map((s) => (
            <SuggestionCard
              key={s.suggestionId}
              s={s}
              busy={busy[s.suggestionId]}
              slow={!!slow[s.suggestionId]}
              onPrepare={() => void prepare(s)}
              onPublish={() => void publish(s)}
              onEdit={() => void editFirst(s)}
            />
          ))}
          {(page > 0 || !last) && (
            <div className="flex justify-center gap-2">
              <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" disabled={last} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SuggestionCard({
  s,
  busy,
  slow,
  onPrepare,
  onPublish,
  onEdit,
}: {
  s: JobSuggestion;
  busy: 'prepare' | 'publish' | 'draft' | undefined;
  slow: boolean;
  onPrepare: () => void;
  onPublish: () => void;
  onEdit: () => void;
}) {
  const { status, missing } = s.preparation;
  const meta = [s.location, s.source, s.postedAt ? `Posted ${dateLabel(s.postedAt)}` : ''].filter(Boolean).join(' · ');
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="text-[18px] font-semibold text-[#1e232f]">{s.title}</p>
          {meta && <p className="text-[14px] text-[#5a6172]">{meta}</p>}
          {s.postingUrl && (
            <a href={s.postingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-[#3c77f6] hover:underline w-fit">
              Original posting <ExternalLink size={12} />
            </a>
          )}
        </div>
        <Pill tone={status === 'READY' ? 'green' : status === 'FAILED' ? 'red' : status === 'PREPARING' ? 'blue' : 'gray'}>
          {status === 'READY' ? 'Ready' : status === 'FAILED' ? "Couldn't prepare" : status === 'PREPARING' ? 'Preparing' : 'Not prepared'}
        </Pill>
      </div>

      {status === 'PREPARING' && (
        <p className="flex items-center gap-2 text-[13px] text-[#5a6172]">
          {slow ? (
            "This is taking longer than usual. We'll keep preparing it; check back in a few minutes."
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" /> Preparing the posting, evaluation criteria and questions. This usually takes about a minute.
            </>
          )}
        </p>
      )}
      {status === 'READY' && missing.length > 0 && (
        <p className="text-[13px] text-[#b45309]">Some details need your input before publishing. Use "Edit first" to fill them in.</p>
      )}
      {status === 'FAILED' && <p className="text-[13px] text-[#5a6172]">We couldn't prepare this job. Try again.</p>}

      <div className="flex flex-wrap justify-end gap-3">
        {status === 'NOT_PREPARED' && (
          <Button variant="primary" disabled={!!busy} onClick={onPrepare}>
            {busy === 'prepare' ? 'Starting…' : 'Prepare'}
          </Button>
        )}
        {status === 'FAILED' && (
          <Button variant="primary" disabled={!!busy} onClick={onPrepare}>
            {busy === 'prepare' ? 'Starting…' : 'Try again'}
          </Button>
        )}
        {status === 'READY' && (
          <>
            <Button disabled={!!busy} onClick={onEdit}>
              {busy === 'draft' ? 'Opening…' : 'Edit first'}
            </Button>
            {missing.length === 0 && (
              <Button variant="primary" disabled={!!busy} onClick={onPublish}>
                {busy === 'publish' ? 'Publishing…' : 'Publish'}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
