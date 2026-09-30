import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Download, Lock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '../store';
import type { HiringDecision } from '../types';
import { BackLink, Button, Card, Dialog, EmptyBox, Pill, cx } from '../ui';
import { DecisionPill, ScreeningDots, UnlockDialog, copyText, initialsOf } from './candidateShared';

const notConnected = (what: string) => () => toast(`${what} is not connected yet`);

export function CandidateReportView({ jobId, candidateId }: { jobId: string; candidateId: string }) {
  const { getJob, getCandidate, candidatesFor, company, unlockCandidate, setDecision, go } = useEmployerStore();
  const job = getJob(jobId);
  const c = getCandidate(candidateId);
  const [open, setOpen] = useState<string | null>('e2');
  const [unlocking, setUnlocking] = useState(false);
  const [confirm, setConfirm] = useState<HiringDecision | null>(null);
  const [changing, setChanging] = useState(false);

  const back = () => go({ name: 'board', jobId });

  if (!job || !c) {
    return (
      <Card className="p-0">
        <EmptyBox title="Candidate not found" actions={<Button onClick={back}>Back to candidates</Button>} />
      </Card>
    );
  }

  const ranked = candidatesFor(jobId);
  const rank = ranked.findIndex((x) => x.id === c.id) + 1;
  const isOpen = job.status === 'Open';
  const criterionName = (id: string) => job.criteria.find((cr) => cr.id === id)?.name ?? id;

  const crumbs = (
    <div className="flex items-center gap-1.5 text-[13px] text-[#5a6172]">
      <button type="button" className="hover:underline" onClick={() => go({ name: 'applications' })}>
        Candidates
      </button>
      <span>/</span>
      <button type="button" className="hover:underline" onClick={back}>
        {job.title}
      </button>
      <span>/</span>
      <span className="font-semibold text-[#1e232f]">{c.unlocked ? c.name : c.anonLabel}</span>
    </div>
  );

  if (!c.unlocked) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <BackLink onClick={back}>Back to candidates</BackLink>
        {crumbs}
        <Card className="p-0">
          <EmptyBox
            icon={<Lock size={20} />}
            title={`${c.anonLabel}'s report is locked`}
            body={`Score ${c.score}/100 · Rank #${rank} of ${ranked.length}. Unlock to see the resume, full interview report, recorded responses, and contact email.`}
            actions={
              <Button variant="primary" onClick={() => setUnlocking(true)}>
                Unlock report
              </Button>
            }
          />
        </Card>
        <UnlockDialog candidate={unlocking ? c : null} job={job} unlock={unlockCandidate} onClose={() => setUnlocking(false)} />
      </div>
    );
  }

  const decided = c.decision !== 'pending' && !changing;

  return (
    <div className="flex flex-col gap-5 pb-12">
      <BackLink onClick={back}>Back to candidates</BackLink>
      {crumbs}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold leading-9 text-[#1e232f] font-[family-name:var(--font-serif)]">Applications report</h1>
          <p className="text-[14px] text-[#5a6172]">Review interview evidence, resume, and contact information before making a decision.</p>
        </div>
        <Button onClick={notConnected('PDF export')}>
          <Download size={15} /> Download report PDF
        </Button>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#3c77f6] text-white text-[18px] font-semibold flex items-center justify-center">{initialsOf(c.name)}</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-semibold text-[#1e232f]">{c.name}</span>
              <Pill tone="green">Unlocked</Pill>
              <DecisionPill decision={c.decision} />
            </div>
            <span className="text-[14px] text-[#1e232f]">{job.title}</span>
            <span className="text-[13px] text-[#5a6172]">{company.name}</span>
          </div>
        </div>
        <div className="h-px bg-[#e1e4ea]" />
        <div className="flex flex-col gap-1">
          <p className="text-[13px] text-[#1e232f]">
            Latest interview completed {c.completedAtFull} · {c.durationMin} minutes · {job.language}
          </p>
          <p className="text-[12px] text-[#5a6172]">This report reflects the candidate's latest completed interview and may update while applications are open.</p>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Overall score', value: `${c.score}/100`, hint: 'Latest completed interview' },
          { label: 'Current rank', value: `#${rank} of ${ranked.length}`, hint: 'Based on completed interviews' },
          {
            label: 'Screening criteria',
            value: <ScreeningDots met={c.screeningMet} total={c.screeningTotal} />,
            hint: c.screeningMet === c.screeningTotal ? 'All screening criteria met' : `${c.screeningMet} of ${c.screeningTotal} criteria met`,
          },
          { label: 'Interview duration', value: `${c.durationMin} min`, hint: `${c.evidence.length} interview questions` },
        ].map((t) => (
          <Card key={t.label} className="p-4 flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-[#5a6172] font-semibold">{t.label}</span>
            <span className="text-[26px] font-semibold text-[#1e232f] leading-8">{t.value}</span>
            <span className="text-[12px] text-[#5a6172]">{t.hint}</span>
          </Card>
        ))}
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#1e232f]">Evaluation criteria</h2>
              <p className="text-[13px] text-[#5a6172]">AI-generated evidence from the candidate's latest interview</p>
            </div>
            {c.criterionScores.map((s) => (
              <div key={s.criterionId} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[14px]">
                  <span className="font-medium text-[#1e232f]">{criterionName(s.criterionId)}</span>
                  <span className="text-[#1e232f]">{s.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-[#e1e4ea] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3c77f6]" style={{ width: `${s.score}%` }} />
                </div>
                <p className="text-[13px] text-[#5a6172]">{s.note}</p>
              </div>
            ))}
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#1e232f]">Screening criteria</h2>
              <Pill tone={c.screeningMet === c.screeningTotal ? 'green' : 'amber'}>
                {c.screeningMet} of {c.screeningTotal} met
              </Pill>
            </div>
            {c.screening.map((s) => (
              <p key={s.label} className="flex items-center gap-2 text-[14px] text-[#1e232f]">
                <span className={cx('w-5 h-5 rounded-full flex items-center justify-center', s.met ? 'bg-[#e8f7ee] text-[#15a560]' : 'bg-[#fef2f2] text-[#dc2626]')}>
                  {s.met ? <Check size={12} /> : '×'}
                </span>
                {s.label}
              </p>
            ))}
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-[#1e232f]">Question-by-question evidence</h2>
              <p className="text-[13px] text-[#5a6172]">Review every interview question, the candidate's latest response, transcript, and AI-generated evidence.</p>
            </div>
            {c.evidence.map((e, i) => {
              const expanded = open === e.id;
              return (
                <div key={e.id} className={cx('rounded-xl border p-4 flex flex-col gap-2', expanded ? 'border-[#3c77f6]' : 'border-[#e1e4ea]')}>
                  <button type="button" onClick={() => setOpen(expanded ? null : e.id)} className="flex items-start gap-2 text-left">
                    <span className={cx('text-[14px] font-semibold', expanded ? 'text-[#3c77f6]' : 'text-[#1e232f]')}>Q{i + 1}</span>
                    <span className="flex-1 text-[14px] font-medium text-[#1e232f]">{e.question}</span>
                    {expanded ? <ChevronUp size={16} className="text-[#5a6172]" /> : <ChevronDown size={16} className="text-[#5a6172]" />}
                  </button>
                  {!expanded && e.summary && <p className="text-[13px] text-[#5a6172]">{e.summary}</p>}
                  {expanded && (
                    <div className="flex flex-col gap-3 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {e.criteriaIds.map((id) => (
                          <Pill key={id} tone="blue">
                            {criterionName(id)}
                          </Pill>
                        ))}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#15a560]">Evidence observed</p>
                        <p className="text-[13px] text-[#4d525e] mt-0.5">{e.observed}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#d98c00]">Areas to probe</p>
                        <p className="text-[13px] text-[#4d525e] mt-0.5">{e.probe}</p>
                      </div>
                      <Button variant="link" className="w-fit text-[13px]" onClick={notConnected('Transcript')}>
                        View full transcript
                      </Button>
                      <div className="flex items-center gap-3 border border-[#e1e4ea] rounded-lg px-3 py-2">
                        <button type="button" onClick={notConnected('Recording playback')} aria-label="Play recording" className="text-[#1e232f]">
                          <Play size={14} />
                        </button>
                        <div className="flex-1 h-1 rounded-full bg-[#e1e4ea]">
                          <div className="h-full w-[6%] rounded-full bg-[#3c77f6]" />
                        </div>
                        <span className="text-[12px] text-[#5a6172]">0:00 / {e.durationLabel}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-[16px] font-semibold text-[#1e232f]">Suggested follow-up areas</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { title: 'Evidence-supported strengths', tone: 'text-[#15a560]', items: c.strengths },
                { title: 'Areas to probe in the next round', tone: 'text-[#d98c00]', items: c.probeAreas },
              ].map((col) => (
                <div key={col.title} className="flex flex-col gap-2">
                  <p className={cx('text-[11px] font-bold tracking-[0.06em] uppercase', col.tone)}>{col.title}</p>
                  {col.items.map((it) => (
                    <p key={it} className="text-[13px] text-[#4d525e]">
                      • {it}
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <div className="h-px bg-[#e1e4ea]" />
            <p className="text-[12px] text-[#5a6172]">Use these areas to guide the next conversation, not as an automated hiring recommendation.</p>
          </Card>
        </div>

        <div className="w-[340px] shrink-0 flex flex-col gap-5">
          <Card className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1e232f]">Hiring decision</h3>
              <DecisionPill decision={c.decision} />
            </div>
            {decided ? (
              <>
                <p className="text-[13px] text-[#5a6172]">
                  {c.decision === 'moved_forward' ? 'You moved this candidate forward. Contact them to set up the next step.' : 'You rejected this candidate. The candidate will be notified.'}
                </p>
                {c.decision === 'moved_forward' && (
                  <Button variant="primary" onClick={() => go({ name: 'contact', jobId, candidateId })}>
                    Contact candidate →
                  </Button>
                )}
                <Button variant="link" className="w-fit text-[13px]" onClick={() => setChanging(true)}>
                  Change decision
                </Button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-[#5a6172]">The candidate will be notified when you make a decision.</p>
                <Button variant="primary" onClick={() => setConfirm('moved_forward')}>
                  Move forward
                </Button>
                <Button variant="danger" onClick={() => setConfirm('rejected')}>
                  Reject
                </Button>
                {changing && (
                  <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
                    Keep current decision
                  </Button>
                )}
              </>
            )}
            {isOpen && (
              <p className="text-[12px] text-[#5a6172] bg-[#f9fafb] rounded-lg p-3">
                Applications are still open. The candidate may complete another attempt, and this report will update to the latest interview.
              </p>
            )}
          </Card>

          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold text-[#1e232f]">Candidate contact</h3>
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#5a6172] font-semibold">Email</p>
              <p className="text-[14px] font-medium text-[#1e232f]">{c.email}</p>
            </div>
            <Button variant="primary" onClick={() => go({ name: 'contact', jobId, candidateId })}>
              Email candidate
            </Button>
            <Button onClick={() => copyText(c.email, 'Email copied')}>Copy email</Button>
            <p className="text-[12px] text-[#5a6172]">Contact details are visible because this report is unlocked.</p>
          </Card>

          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold text-[#1e232f]">Resume</h3>
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#5a6172] font-semibold">File</p>
              <p className="text-[14px] font-medium text-[#1e232f]">{c.resumeFile}</p>
            </div>
            <Button onClick={notConnected('Resume preview')}>Preview resume</Button>
            <Button onClick={notConnected('Resume download')}>Download resume</Button>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#e1e4ea] pt-4">
        <div className="flex items-center gap-5">
          <Button variant="link" onClick={back}>
            Back to candidates
          </Button>
          <Button variant="link" onClick={notConnected('PDF export')}>
            Download report PDF
          </Button>
        </div>
        <p className="text-[12px] text-[#5a6172]">This report reflects the latest interview available at the time of download.</p>
      </div>
      <p className="text-[12px] text-[#9ba1b0]">AI-generated assessment should support, not replace, the employer's independent review of interview evidence.</p>

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'rejected' ? `Reject ${c.name}?` : `Move ${c.name} forward?`}
        actions={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm === 'rejected' ? 'danger' : 'primary'}
              onClick={() => {
                if (!confirm) return;
                setDecision(c.id, confirm);
                toast.success(confirm === 'rejected' ? 'Candidate rejected' : 'Candidate moved forward');
                setConfirm(null);
                setChanging(false);
              }}
            >
              {confirm === 'rejected' ? 'Confirm rejection' : 'Move forward'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">
          {confirm === 'rejected'
            ? 'The candidate will be notified that you are not moving forward with their application for this role.'
            : 'The candidate will be notified that you are moving forward. You can then contact them with a prepared email.'}
        </p>
      </Dialog>
    </div>
  );
}
