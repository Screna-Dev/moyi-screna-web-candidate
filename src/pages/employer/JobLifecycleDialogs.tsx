import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { AfterSponsorshipLimit } from '@/components/admin/console/pages/employer/types';
import { Button, Dialog, TextInput } from '@/components/admin/console/pages/employer/ui';
import { ErrorHint } from '@/components/admin/console/pages/employer/views/wizard/shared';
import { numberOf } from '@/components/admin/console/pages/employer/views/wizard/logic';
import { authErrorCode, authErrorMessage } from './employerAuth';
import { closeJob, getJob, saveSponsorship, type ApiJob, type ApiSponsorship } from './employerApi';
import { useEmployerCredits } from './creditsContext';
import { AfterLimitChoices } from './wizardSections';

// Changes to a published job that My Jobs (and the wizard's Edit job) offer
// from the list's `actions` (#299, PM 2026-11-02, F-27/F-28). No design yet:
// plain dialogs in the employer app's style.

// Edit sponsorship (actions.editSponsorship): raise the maximum or change what
// happens when it runs out. Who pays can't change after publishing.
export function EditSponsorshipDialog({ jobId, onClose, onSaved }: { jobId: string; onClose: () => void; onSaved: (job: ApiJob) => void }) {
  const { credits, refresh } = useEmployerCredits();
  const [job, setJob] = useState<ApiJob | null>(null);
  const [loadError, setLoadError] = useState('');
  const [max, setMax] = useState('');
  const [afterLimit, setAfterLimit] = useState<AfterSponsorshipLimit>('keep');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fresh copy: sponsoredCount moves while the job is open.
  useEffect(() => {
    let cancelled = false;
    refresh();
    getJob(jobId)
      .then((j) => {
        if (cancelled) return;
        setJob(j);
        setMax(String(j.sponsorship?.maxSponsoredCandidates ?? ''));
        setAfterLimit(j.sponsorship?.whenLimitReached === 'CLOSE_JOB' ? 'close' : 'keep');
      })
      .catch((err) => !cancelled && setLoadError(authErrorMessage(err) || 'Could not load this job.'));
    return () => {
      cancelled = true;
    };
    // refresh is a fresh function per shell render; load once per dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const sp: ApiSponsorship | null = job?.sponsorship ?? null;
  const n = numberOf(max);
  const maxError = !max.trim()
    ? 'Required'
    : !/^\d[\d,]*$/.test(max.trim()) || n < 1
      ? 'Enter a whole number of 1 or more'
      : sp && n < sp.maxSponsoredCandidates
        ? `Can't be lower than the current limit of ${sp.maxSponsoredCandidates.toLocaleString('en-US')}`
        : '';
  // Saving CLOSE_JOB on an open job whose sponsorship is used up closes it at once.
  const closesNow =
    afterLimit === 'close' && job?.status === 'OPEN' && !!sp && (n <= sp.sponsoredCount || credits?.interview === 0);

  const save = async () => {
    if (!job) return;
    if (maxError) return setShowErrors(true);
    setSaving(true);
    try {
      const res = await saveSponsorship(job.id, {
        interviewPayer: 'EMPLOYER',
        maxSponsoredCandidates: Math.round(n),
        whenLimitReached: afterLimit === 'close' ? 'CLOSE_JOB' : 'KEEP_ACCEPTING',
      });
      if (res.status === 'CLOSED' && job.status !== 'CLOSED') toast.success('Sponsorship updated. The job is now closed.');
      else if (res.status === 'CLOSED') toast.success("Sponsorship updated. The job is still closed: raising the limit doesn't reopen it.");
      else toast.success('Sponsorship updated');
      onSaved(res);
    } catch (err) {
      toast.error(
        authErrorCode(err) === 'INVALID_STATE'
          ? "This job's sponsorship can't be changed that way. Refresh and try again."
          : authErrorMessage(err) || 'Could not update the sponsorship.',
      );
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit sponsorship"
      width={560}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!job || saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save sponsorship'}
          </Button>
        </>
      }
    >
      {loadError ? (
        <p className="text-[14px] text-[#5a6172]">{loadError}</p>
      ) : !job ? (
        <p className="text-[14px] text-[#5a6172] flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" /> Loading…
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-[13px] text-[#5a6172]">
            {sp ? `${sp.sponsoredCount.toLocaleString('en-US')} of ${sp.maxSponsoredCandidates.toLocaleString('en-US')} sponsored interviews used. ` : ''}
            You can raise the limit or change what happens when it's reached. The limit can't be lowered.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[#1e232f]">
              Maximum sponsored candidates<span className="text-[#ff383c] ml-0.5">*</span>
            </span>
            <TextInput aria-label="Maximum sponsored candidates" value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" className="h-10" />
            <ErrorHint show={showErrors && !!maxError}>{maxError}</ErrorHint>
          </label>
          <AfterLimitChoices value={afterLimit} onChange={setAfterLimit} />
          {closesNow && (
            <div className="flex items-start gap-2 rounded-xl border border-[#f5c451] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#b45309]">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {sp && n <= sp.sponsoredCount
                ? 'All sponsored interviews are used, so the job will close as soon as you save.'
                : 'You have no Interview Credits, so the job will close as soon as you save.'}
            </div>
          )}
          {job.status === 'CLOSED' && (
            <p className="text-[13px] text-[#5a6172]">This job is closed. Saving doesn't reopen it.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}

// Close job (actions.close). For a job already closed when sponsorship ran
// out, this stops applicants who haven't started from starting.
export function CloseJobDialog({
  jobId,
  title,
  sponsorshipExhausted,
  onClose,
  onClosed,
}: {
  jobId: string;
  title: string;
  sponsorshipExhausted: boolean;
  onClose: () => void;
  onClosed: (job: ApiJob) => void;
}) {
  const [busy, setBusy] = useState(false);
  const close = async () => {
    setBusy(true);
    try {
      const res = await closeJob(jobId);
      toast.success('Job closed');
      onClosed(res);
    } catch (err) {
      toast.error(authErrorCode(err) === 'INVALID_STATE' ? "This job can't be closed now. Refresh and try again." : authErrorMessage(err) || 'Could not close the job.');
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={sponsorshipExhausted ? `Stop all interviews for ${title || 'this job'}?` : `Close ${title || 'this job'}?`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void close()}>
            {busy ? 'Closing…' : 'Close job'}
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-[#5a6172]">
        {sponsorshipExhausted
          ? "This job already closed when sponsored interviews ran out, but applicants can still start their interviews. Closing it stops anyone who hasn't started. Interviews in progress finish normally."
          : "Candidates can no longer apply, and applicants who haven't started their interview can no longer start it. Interviews in progress finish normally."}
      </p>
    </Dialog>
  );
}
