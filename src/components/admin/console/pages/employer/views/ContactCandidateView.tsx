import { useState } from 'react';
import { ArrowRight, CheckCircle2, Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '../store';
import { BackLink, Button, Card, EmptyBox, KV, Pill, TextArea, TextInput } from '../ui';
import { ContactPill, DecisionPill, copyText, initialsOf } from './candidateShared';

export function ContactCandidateView({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  const { getJob, getCandidate, company, markContacted, go } = useEmployerStore();
  const job = getJob(jobId);
  const c = getCandidate(candidateId);

  const sender = company.contact.name || 'The hiring team';
  const senderFirst = sender.split(' ')[0];
  const signature = [company.contact.title || 'Recruiter', company.name].join(' · ');
  const defaultSubject = job ? `Next steps for your ${job.title} application at ${company.name}` : '';
  const defaultBody =
    job && c
      ? `Hi ${c.name},\nThank you for completing the AI interview for the ${job.title} role at ${company.name}.\nWe've reviewed your application and would like to move forward with the next stage of our hiring process.\nCould you share a few times you're available over the next week, along with your time zone? We'll follow up with the interview details.\nWe look forward to speaking with you.\nBest,\n${senderFirst}\n${signature}`
      : '';

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  const toReport = () => go({ name: 'report', jobId, candidateId });

  if (!job || !c) {
    return (
      <Card className="p-0">
        <EmptyBox title="Candidate not found" actions={<Button onClick={() => go({ name: 'applications' })}>Back to applications</Button>} />
      </Card>
    );
  }

  if (!c.unlocked) {
    return (
      <Card className="p-0">
        <EmptyBox title="Unlock this report to contact the candidate" actions={<Button onClick={toReport}>Back to candidate report</Button>} />
      </Card>
    );
  }

  const contacted = c.contact === 'contacted';
  const mailto = `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex flex-col gap-5 pb-12">
      <BackLink onClick={toReport}>Back to candidate report</BackLink>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[30px] font-semibold leading-9 text-[#1e232f]">Contact candidate</h1>
          <DecisionPill decision={c.decision} />
          <ContactPill contacted={contacted} />
        </div>
        <p className="text-[16px] text-[#1e232f]">
          {c.name} · {job.title} · {company.name}
        </p>
        <p className="text-[14px] text-[#5a6172]">
          {c.decision === 'moved_forward'
            ? "You've marked this candidate to move forward. Review the email below and send it from your own email account."
            : 'Review the email below and send it from your own email account.'}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-[17px] font-semibold text-[#1e232f]">Candidate</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#3c77f6] text-[13px] font-semibold flex items-center justify-center">{initialsOf(c.name)}</div>
              <div>
                <p className="text-[15px] text-[#1e232f]">{c.name}</p>
                <p className="text-[13px] text-[#5a6172]">Applicant for {job.title}</p>
              </div>
            </div>
            <div className="h-px bg-[#e1e4ea]" />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] text-[#1e232f]">
                <Mail size={15} className="text-[#5a6172]" /> {c.email}
              </span>
              <button type="button" aria-label="Copy email" onClick={() => copyText(c.email, 'Email copied')} className="p-1.5 rounded-md bg-[#f3f4f7] text-[#1e232f] hover:bg-[#e1e4ea]">
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
              <Button
                variant="link"
                onClick={() => {
                  setSubject(defaultSubject);
                  setBody(defaultBody);
                  toast('Draft reset');
                }}
              >
                Reset draft
              </Button>
            </div>
            <p className="text-[14px] text-[#5a6172]">Personalize your message before opening it in your email app.</p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] uppercase tracking-[0.06em] text-[#5a6172]">Subject</span>
              <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] uppercase tracking-[0.06em] text-[#5a6172]">Message</span>
              <TextArea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </Card>
        </div>

        <div className="w-[420px] shrink-0 flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-3">
            <h2 className="text-[17px] font-semibold text-[#1e232f]">Application summary</h2>
            <KV k="Job" v={job.title} />
            <KV k="Company" v={company.name} />
            <KV k="Report access" v={<Pill tone="green">Unlocked</Pill>} />
            <KV k="Hiring decision" v={<DecisionPill decision={c.decision} />} />
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
            <a href={mailto} className="inline-flex items-center justify-center gap-1.5 bg-[#3c77f6] text-white text-[14px] font-medium rounded-xl px-4 py-2.5 hover:bg-[#2d6ae0]">
              Open in email app <ArrowRight size={15} />
            </a>
            <Button className="!border-[#3c77f6] !text-[#3c77f6]" onClick={() => copyText(`Subject: ${subject}\n\n${body}`, 'Email text copied')}>
              Copy email text
            </Button>
            <p className="text-[12px] text-[#5a6172]">Replies go to the email account you use to send this message.</p>
            <div className="h-px bg-[#e1e4ea]" />
            <p className="text-[12px] italic text-[#5a6172]">Opening or copying the draft does not send it. Screna does not verify delivery.</p>
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            {contacted ? (
              <>
                <p className="flex items-center gap-2 text-[17px] font-semibold text-[#15a560]">
                  <CheckCircle2 size={18} /> Email marked as sent
                </p>
                <p className="text-[14px] text-[#5a6172]">{c.name} is marked as contacted for {job.title}.</p>
                <Button
                  variant="link"
                  className="w-fit"
                  onClick={() => {
                    markContacted(c.id, false);
                    toast('Marked as not contacted');
                  }}
                >
                  Undo
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-[17px] font-semibold text-[#1e232f]">Have you sent your email?</h2>
                <p className="text-[14px] text-[#5a6172]">Confirm only after sending the message from your email account.</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    markContacted(c.id, true);
                    toast.success('Marked as sent');
                  }}
                >
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
