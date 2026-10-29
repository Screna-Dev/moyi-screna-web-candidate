import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { BackLink, Button, Card, EmptyBox, KV, Pill, TextArea, TextInput } from '@/components/admin/console/pages/employer/ui';
import { ContactPill, DecisionPill, copyText } from '@/components/admin/console/pages/employer/views/candidateShared';
import { authErrorCode, authErrorMessage } from './employerAuth';
import { getCandidateReport, getOutreach, outreachAction, saveOutreach, type CandidateReport, type Outreach } from './employerApi';
import { decisionOf } from './boardFormat';

// Contact candidate (Figma "contact candidate"), on .../outreach. Screna never
// sends the email: the draft opens in the employer's own mail app through the
// server's mailtoUrl, then they confirm with "Mark as sent" (mark-sent; Undo =
// undo-sent). Edits save with PUT shortly after typing stops, and are flushed
// before the mail app opens so mailtoUrl carries them. A sent draft is
// read-only. Needs an unlocked report (403 REPORT_LOCKED) and a "Move forward"
// decision (409 INVALID_STATE).

const SAVE_DELAY_MS = 800;

export function EmployerContactView({ jobId, applicationId }: { jobId: string; applicationId: string }) {
  const { go } = useEmployerStore();
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [outreach, setOutreach] = useState<Outreach | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'locked' | 'not-forward' | 'error'>('loading');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = useRef({ subject: '', body: '' });

  const toReport = () => go({ name: 'report', jobId, candidateId: applicationId });

  const take = (o: Outreach) => {
    setOutreach(o);
    setSubject(o.subject);
    setBody(o.body);
    saved.current = { subject: o.subject, body: o.body };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getCandidateReport(applicationId);
        if (cancelled) return;
        setReport(r);
        const o = await getOutreach(applicationId);
        if (cancelled) return;
        take(o);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        const code = authErrorCode(err);
        setState(code === 'REPORT_LOCKED' ? 'locked' : code === 'INVALID_STATE' ? 'not-forward' : 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const sent = outreach?.status === 'SENT';
  const dirty = subject !== saved.current.subject || body !== saved.current.body;

  // Saves the current edits (subject and body are both required, ≤255 / ≤10000).
  const flush = async (): Promise<Outreach | null> => {
    if (!outreach || sent || !dirty) return outreach;
    if (!subject.trim() || !body.trim()) {
      toast.error('Add a subject and a message first');
      return null;
    }
    try {
      const o = await saveOutreach(applicationId, { subject, body });
      saved.current = { subject: o.subject, body: o.body };
      setOutreach(o);
      return o;
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not save the draft.');
      return null;
    }
  };

  // Autosave shortly after typing stops.
  useEffect(() => {
    if (!outreach || sent || !dirty || !subject.trim() || !body.trim()) return;
    const t = setTimeout(() => void flush(), SAVE_DELAY_MS);
    return () => clearTimeout(t);
    // flush reads the latest state; re-arm only when the text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body]);

  const act = async (action: 'reset' | 'mark-sent' | 'undo-sent', done: string) => {
    setBusy(true);
    try {
      if (action === 'mark-sent' && !(await flush())) return;
      take(await outreachAction(applicationId, action));
      toast.success(done);
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const openInEmail = async () => {
    const o = await flush();
    if (o) window.location.href = o.mailtoUrl;
  };

  if (state === 'loading') return <p className="text-[14px] text-[#5a6172] py-10 text-center">Loading…</p>;

  if (state !== 'ready' || !report || !outreach) {
    const msg =
      state === 'locked'
        ? 'Unlock this report to contact the candidate'
        : state === 'not-forward'
          ? 'Move this candidate forward to contact them'
          : "Couldn't load the email draft";
    return (
      <Card className="p-0">
        <EmptyBox
          title={msg}
          body={state === 'not-forward' ? 'Choose "Move forward" on the candidate report, then come back to email them.' : undefined}
          actions={<Button onClick={toReport}>Back to candidate report</Button>}
        />
      </Card>
    );
  }

  const name = report.candidate.name;
  const contacted = outreach.contactStatus === 'CONTACTED';
  const decision = decisionOf(report.hiringStatus);

  return (
    <div className="flex flex-col gap-5 pb-12">
      <BackLink onClick={toReport}>Back to candidate report</BackLink>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] font-semibold leading-9 text-[#1e232f]">Contact candidate</h1>
          <DecisionPill decision={decision} />
          <ContactPill contacted={contacted} />
        </div>
        <p className="text-[16px] text-[#1e232f]">
          {name} · {report.job.title} · {report.job.companyName}
        </p>
        <p className="text-[14px] text-[#5a6172]">You've marked this candidate to move forward. Review the email below and send it from your own email account.</p>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-[17px] font-semibold text-[#1e232f]">Candidate</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#3c77f6] text-[13px] font-semibold flex items-center justify-center">{report.candidate.initials}</div>
              <div>
                <p className="text-[15px] text-[#1e232f]">{name}</p>
                <p className="text-[13px] text-[#5a6172]">Applicant for {report.job.title}</p>
              </div>
            </div>
            <div className="h-px bg-[#e1e4ea]" />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] text-[#1e232f]">
                <Mail size={15} className="text-[#5a6172]" /> {outreach.to}
              </span>
              <button
                type="button"
                aria-label="Copy email"
                onClick={() => void copyText(outreach.to, 'Email copied')}
                className="p-1.5 rounded-md bg-[#f3f4f7] text-[#1e232f] hover:bg-[#e1e4ea]"
              >
                <Copy size={14} />
              </button>
            </div>
            <Button variant="link" className="w-fit" onClick={toReport}>
              View candidate report →
            </Button>
          </Card>

          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1e232f]">Email draft</h2>
              <Button variant="link" disabled={sent || busy} onClick={() => void act('reset', 'Draft reset')}>
                Reset draft
              </Button>
            </div>
            <p className="text-[14px] text-[#5a6172]">
              {sent ? 'This email is marked as sent. Undo to edit it again.' : 'Personalize your message before opening it in your email app.'}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] uppercase tracking-[0.06em] text-[#5a6172]">Subject</span>
              <TextInput value={subject} maxLength={255} readOnly={sent} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] uppercase tracking-[0.06em] text-[#5a6172]">Message</span>
              <TextArea rows={12} value={body} maxLength={10000} readOnly={sent} onChange={(e) => setBody(e.target.value)} />
            </label>
          </Card>
        </div>

        <div className="w-[420px] shrink-0 flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold text-[#1e232f]">Application summary</h2>
            <KV k="Job" v={report.job.title} />
            <KV k="Company" v={report.job.companyName} />
            <KV k="Report access" v={<Pill tone="green">Unlocked</Pill>} />
            <KV k="Hiring decision" v={<DecisionPill decision={decision} />} />
            <KV k="Contact status" v={<ContactPill contacted={contacted} />} />
            <div className="h-px bg-[#e1e4ea]" />
            <p className="text-[13px] text-[#5a6172]">
              {contacted
                ? 'You confirmed the email was sent. The candidate is marked as contacted.'
                : 'Your hiring decision has been saved. The candidate has not been notified through this page.'}
            </p>
            <Button variant="link" className="w-fit" onClick={toReport}>
              View candidate report →
            </Button>
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold text-[#1e232f]">Send from your email</h2>
            <ol className="flex flex-col gap-1.5 text-[14px] text-[#1e232f]">
              {['Review and personalize the message.', 'Open the draft in your email app and send it.', 'Return here and confirm that you sent it.'].map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="text-[#3c77f6] font-medium">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
            <Button variant="primary" className="!py-2.5" onClick={() => void openInEmail()}>
              Open in email app <ArrowRight size={15} />
            </Button>
            <Button className="!border-[#3c77f6] !text-[#3c77f6]" onClick={() => void copyText(`Subject: ${subject}\n\n${body}`, 'Email text copied')}>
              Copy email text
            </Button>
            <p className="text-[12px] text-[#5a6172]">Replies go to the email account you use to send this message.</p>
            <div className="h-px bg-[#e1e4ea]" />
            <p className="text-[12px] italic text-[#5a6172]">Opening or copying the draft does not send it. Screna does not verify delivery.</p>
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            {sent ? (
              <>
                <p className="flex items-center gap-2 text-[17px] font-semibold text-[#15a560]">
                  <CheckCircle2 size={18} /> Email marked as sent
                </p>
                <p className="text-[14px] text-[#5a6172]">
                  {name} is marked as contacted for {report.job.title}.
                </p>
                <Button variant="link" className="w-fit" disabled={busy} onClick={() => void act('undo-sent', 'Marked as not contacted')}>
                  Undo
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-[17px] font-semibold text-[#1e232f]">Have you sent your email?</h2>
                <p className="text-[14px] text-[#5a6172]">Confirm only after sending the message from your email account.</p>
                <Button variant="primary" disabled={busy} onClick={() => void act('mark-sent', 'Marked as sent')}>
                  Mark as sent
                </Button>
                <Button className="!border-[#3c77f6] !text-[#3c77f6]" onClick={toReport}>
                  Not yet
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
