import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, TextArea, cx } from '@/components/admin/console/pages/employer/ui';
import { authErrorCode, authErrorMessage } from './employerAuth';
import { setHiringDecision, type BoardCandidate, type DecisionBody } from './employerApi';
import { JOB_REMOVED, JOB_REMOVED_MESSAGE, REASON_MAX_CHARS, REASON_MAX_WORDS, REASON_MIN_WORDS, reasonError, wordCount } from './boardFormat';
import { useOrgIfAny } from './orgContext';

// Hiring feedback (#330, standup 11-18). No design yet: a plain dialog in the
// employer app's style. Three outcomes, all PUT .../decision:
// - Move on (MOVED_FORWARD): final, emails the candidate. Optional "include my
//   contact details" (shareContact), disabled when the company profile has no
//   contact email (the server would answer 409 INVALID_STATE).
// - No longer consider (REJECTED): final, the reason goes into the rejection
//   email word for word. 50–100 words.
// - Still considering (CONSIDERING): no email, no confirmation, can change later.
// The two final ones ask for confirmation in the same dialog.

export type FeedbackChoice = 'MOVED_FORWARD' | 'REJECTED';

export function EmployerFeedbackDialog({
  applicationId,
  label,
  initial = null,
  blocking = false,
  onClose,
  onSaved,
}: {
  applicationId: string;
  label: string; // "Jane Doe" or "Candidate #117"
  // Open straight on a final choice's confirmation (the report's buttons).
  // null: show all three outcomes (the unlock gate).
  initial?: FeedbackChoice | null;
  // Opened because an unlock was blocked: says why.
  blocking?: boolean;
  onClose: () => void;
  onSaved: (row: BoardCandidate | null, body: DecisionBody) => void;
}) {
  const orgState = useOrgIfAny();
  const contactEmail = orgState?.org?.contact?.email?.trim() ?? '';
  const [choice, setChoice] = useState<FeedbackChoice | null>(initial);
  const [shareContact, setShareContact] = useState(false);
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setChoice(initial);
    setShareContact(false);
    setReason('');
    setShowErrors(false);
  }, [applicationId, initial]);

  const err = choice === 'REJECTED' ? reasonError(reason) : '';

  const submit = async (body: DecisionBody) => {
    if (busy) return;
    if (body.decision === 'REJECTED' && err) return setShowErrors(true);
    setBusy(true);
    try {
      const row = await setHiringDecision(applicationId, body);
      toast.success(
        body.decision === 'MOVED_FORWARD'
          ? `${label} moved forward. We've emailed them.`
          : body.decision === 'REJECTED'
            ? `Feedback sent to ${label}`
            : `${label} marked as still considering`,
      );
      onSaved(row ?? null, body);
    } catch (e) {
      const code = authErrorCode(e);
      toast.error(
        code === JOB_REMOVED
          ? JOB_REMOVED_MESSAGE
          : code === 'INVALID_STATE' && body.decision === 'MOVED_FORWARD' && body.shareContact
            ? 'Add a contact email to your company profile to share your contact details.'
            : code === 'INVALID_STATE'
              ? authErrorMessage(e) || 'This decision has already been made. Refresh to see it.'
              : authErrorMessage(e) || 'Could not save your feedback.',
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    choice === 'MOVED_FORWARD' ? `Move on with ${label}?` : choice === 'REJECTED' ? `No longer consider ${label}?` : `Give feedback on ${label}`;

  const actions =
    choice === null ? (
      <Button onClick={onClose}>Cancel</Button>
    ) : (
      <>
        <Button onClick={() => (initial ? onClose() : setChoice(null))}>{initial ? 'Cancel' : 'Back'}</Button>
        <Button
          variant={choice === 'REJECTED' ? 'danger' : 'primary'}
          disabled={busy}
          onClick={() =>
            void submit(choice === 'MOVED_FORWARD' ? { decision: 'MOVED_FORWARD', shareContact } : { decision: 'REJECTED', reason: reason.trim() })
          }
        >
          {busy ? 'Sending…' : choice === 'MOVED_FORWARD' ? 'Move on' : 'Send feedback'}
        </Button>
      </>
    );

  return (
    <Dialog open onClose={onClose} title={title} width={560} actions={actions}>
      {choice === null ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-[#5a6172]">
            {blocking
              ? `Give feedback on ${label} before unlocking another candidate for this job.`
              : 'Let the candidate know where they stand.'}
          </p>
          <ChoiceButton title="Move on" body="Invite them to the next step. We'll email them." onClick={() => setChoice('MOVED_FORWARD')} />
          <ChoiceButton title="No longer consider" body="We'll email them your reason." onClick={() => setChoice('REJECTED')} />
          <ChoiceButton
            title={busy ? 'Saving…' : 'Still considering'}
            body="No email. You can decide later."
            disabled={busy}
            onClick={() => void submit({ decision: 'CONSIDERING' })}
          />
        </div>
      ) : choice === 'MOVED_FORWARD' ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-[#5a6172]">We'll email {label} that you'd like to move forward. This can't be undone.</p>
          <label className={cx('flex items-start gap-2 text-[14px]', contactEmail ? 'text-[#1e232f]' : 'text-[#9ba1b0]')}>
            <input
              type="checkbox"
              className="mt-1"
              checked={shareContact}
              disabled={!contactEmail}
              onChange={(e) => setShareContact(e.target.checked)}
            />
            <span>
              Include my contact details
              <span className="block text-[12px] text-[#5a6172]">
                {contactEmail
                  ? `The email will include your company profile's contact name and ${contactEmail}.`
                  : 'Add a contact email to your company profile to include it.'}
              </span>
            </span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] text-[#5a6172]">We'll email {label} this reason word for word. This can't be undone.</p>
          <TextArea
            aria-label="Reason"
            rows={6}
            value={reason}
            maxLength={REASON_MAX_CHARS}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you're not moving forward, in 50–100 words."
          />
          <div className="flex justify-between text-[12px]">
            <span className="text-[#dc2626]">{showErrors ? err : ''}</span>
            <span className="text-[#5a6172]">
              {wordCount(reason)} / {REASON_MIN_WORDS}–{REASON_MAX_WORDS} words
            </span>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function ChoiceButton({ title, body, onClick, disabled }: { title: string; body: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="text-left rounded-xl border border-[#e1e4ea] px-4 py-3 hover:border-[#3c77f6] hover:bg-[#f7f9ff] disabled:opacity-60"
    >
      <span className="block text-[14px] font-semibold text-[#1e232f]">{title}</span>
      <span className="block text-[13px] text-[#5a6172]">{body}</span>
    </button>
  );
}
