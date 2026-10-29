import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Download, Lock, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { BackLink, Button, Card, Dialog, EmptyBox, Pill, cx } from '@/components/admin/console/pages/employer/ui';
import { DecisionPill, ScreeningDots, copyText } from '@/components/admin/console/pages/employer/views/candidateShared';
import { authErrorCode, authErrorMessage } from './employerAuth';
import { getCandidateReport, getQuestionMedia, getResumeLink, setHiringDecision, type CandidateReport, type HiringStatus, type ReportQuestion } from './employerApi';
import { browserZone, clock, dateTimeAt, decisionOf, reportScreeningOf } from './boardFormat';
import { EmployerUnlockDialog } from './EmployerUnlockDialog';

// Applications report (Figma "候选人view report"), from GET .../report. The
// report reflects the candidate's latest completed interview. Questions come
// in interview order and include the AI's follow-ups. New interviews have no
// per-question criteria, transcript or audio: the design's buttons stay but
// are disabled. Resume / transcript / audio links expire after 15 minutes, so
// they are fetched on each click. Decisions don't notify the candidate.
// Screening: reportScreeningOf (design sample while the AI doesn't assess it).
// PDF download isn't provided by the API yet.

const LANGUAGES: Record<string, string> = { en: 'English' };
const notAvailable = (what: string) => () => toast(`${what} isn't available yet`);

export function EmployerReportView({ jobId, applicationId }: { jobId: string; applicationId: string }) {
  const { go } = useEmployerStore();
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'locked' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [confirm, setConfirm] = useState<HiringStatus | null>(null);
  const [changing, setChanging] = useState(false);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getCandidateReport(applicationId)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setOpen(r.questions[0]?.seq ?? null);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const code = authErrorCode(err);
        setState(code === 'REPORT_LOCKED' ? 'locked' : code === 'NOT_FOUND' ? 'missing' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, attempt]);

  const back = () => go({ name: 'board', jobId });

  if (state === 'loading') return <p className="text-[14px] text-[#5a6172] py-10 text-center">Loading report…</p>;

  if (state === 'missing' || state === 'error') {
    return (
      <Card className="p-0">
        <EmptyBox
          title={state === 'missing' ? 'Candidate not found' : "Couldn't load this report"}
          actions={
            <>
              {state === 'error' && <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>}
              <Button onClick={back}>Back to candidates</Button>
            </>
          }
        />
      </Card>
    );
  }

  if (state === 'locked' || !report) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <BackLink onClick={back}>Back to candidates</BackLink>
        <Card className="p-0">
          <EmptyBox
            icon={<Lock size={20} />}
            title="This report is locked"
            body="Unlock to see the resume, full interview report, and contact email."
            actions={
              <Button variant="primary" onClick={() => setUnlocking(true)}>
                Unlock report
              </Button>
            }
          />
        </Card>
        <EmployerUnlockDialog
          target={unlocking ? { applicationId, label: 'this candidate' } : null}
          jobId={jobId}
          jobTitle=""
          onClose={() => setUnlocking(false)}
          onUnlocked={() => setAttempt((a) => a + 1)}
        />
      </div>
    );
  }

  const r = report;
  const decision = decisionOf(r.hiringStatus);
  const decided = r.hiringStatus !== 'AWAITING' && !changing;
  const screening = reportScreeningOf(r);
  const questions = [...r.questions].sort((a, b) => a.seq - b.seq);
  const language = LANGUAGES[r.interview.language] ?? r.interview.language;

  const decide = async (to: HiringStatus) => {
    setDeciding(true);
    try {
      await setHiringDecision(applicationId, to);
      setReport({ ...r, hiringStatus: to });
      toast.success(to === 'REJECTED' ? 'Candidate rejected' : to === 'MOVED_FORWARD' ? 'Candidate moved forward' : 'Decision cleared');
      setConfirm(null);
      setChanging(false);
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not save the decision.');
    } finally {
      setDeciding(false);
    }
  };

  const openResume = async () => {
    try {
      const link = await getResumeLink(applicationId);
      if (!link.url) return void toast('No resume on file for this candidate');
      window.open(link.url, '_blank', 'noopener');
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not open the resume.');
    }
  };

  const crumbs = (
    <div className="flex items-center gap-1.5 text-[13px] text-[#5a6172]">
      <button type="button" className="hover:underline" onClick={() => go({ name: 'applications' })}>
        Candidates
      </button>
      <span>/</span>
      <button type="button" className="hover:underline" onClick={back}>
        {r.job.title}
      </button>
      <span>/</span>
      <span className="font-semibold text-[#1e232f]">{r.candidate.name}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-12">
      <BackLink onClick={back}>Back to candidates</BackLink>
      {crumbs}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold leading-9 text-[#1e232f] font-[family-name:var(--font-serif)]">Applications report</h1>
          <p className="text-[14px] text-[#5a6172]">Review interview evidence, resume, and contact information before making a decision.</p>
        </div>
        <Button onClick={notAvailable('PDF download')}>
          <Download size={15} /> Download report PDF
        </Button>
      </div>

      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#3c77f6] text-white text-[18px] font-semibold flex items-center justify-center">{r.candidate.initials}</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-semibold text-[#1e232f]">{r.candidate.name}</span>
              <Pill tone="green">Unlocked</Pill>
              <DecisionPill decision={decision} />
            </div>
            <span className="text-[14px] text-[#1e232f]">{r.job.title}</span>
            <span className="text-[13px] text-[#5a6172]">{r.job.companyName}</span>
          </div>
        </div>
        <div className="h-px bg-[#e1e4ea]" />
        <div className="flex flex-col gap-1">
          <p className="text-[13px] text-[#1e232f]">
            Latest interview completed {dateTimeAt(r.interview.completedAt, browserZone())}
            {r.interview.durationMinutes !== null ? ` · ${r.interview.durationMinutes} minutes` : ''} · {language}
          </p>
          <p className="text-[12px] text-[#5a6172]">
            {r.applicationsStillOpen
              ? "This report reflects the candidate's latest completed interview and may update while applications are open."
              : "This report reflects the candidate's latest completed interview."}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Overall score', value: `${r.overallScore}/100`, hint: 'Latest completed interview' },
          { label: 'Current rank', value: `#${r.rank.position} of ${r.rank.outOf}`, hint: 'Based on completed interviews' },
          {
            label: 'Screening criteria',
            value: <ScreeningDots met={screening.met} total={screening.total} />,
            hint: screening.met === screening.total ? 'All screening criteria met' : `${screening.met} of ${screening.total} criteria met`,
          },
          {
            label: 'Interview duration',
            value: r.interview.durationMinutes !== null ? `${r.interview.durationMinutes} min` : '—',
            hint: `${r.interview.questionCount} interview questions`,
          },
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
            {r.criteria.map((s) => (
              <div key={s.criterionId} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[14px]">
                  <span className="font-medium text-[#1e232f]">{s.name}</span>
                  <span className="text-[#1e232f]">{s.score !== null ? `${s.score}/100` : '—'}</span>
                </div>
                <div className="h-2 rounded-full bg-[#e1e4ea] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3c77f6]" style={{ width: `${s.score ?? 0}%` }} />
                </div>
                {s.evidence && <p className="text-[13px] text-[#5a6172]">{s.evidence}</p>}
              </div>
            ))}
          </Card>

          <Card className="p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#1e232f]">Screening criteria</h2>
              <Pill tone={screening.met === screening.total ? 'green' : 'amber'}>
                {screening.met} of {screening.total} met
              </Pill>
            </div>
            {screening.items.map((s) => (
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
            {questions.map((q, i) => (
              <QuestionCard
                key={q.seq}
                index={i}
                q={q}
                applicationId={applicationId}
                expanded={open === q.seq}
                onToggle={() => setOpen(open === q.seq ? null : q.seq)}
              />
            ))}
          </Card>

          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-[16px] font-semibold text-[#1e232f]">Suggested follow-up areas</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { title: 'Evidence-supported strengths', tone: 'text-[#15a560]', items: r.strengths },
                { title: 'Areas to probe in the next round', tone: 'text-[#d98c00]', items: r.probeAreas },
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
              <DecisionPill decision={decision} />
            </div>
            {decided ? (
              <>
                <p className="text-[13px] text-[#5a6172]">
                  {r.hiringStatus === 'MOVED_FORWARD' ? 'You moved this candidate forward. Contact them to set up the next step.' : 'You rejected this candidate.'}
                </p>
                {r.hiringStatus === 'MOVED_FORWARD' && (
                  <Button variant="primary" onClick={() => go({ name: 'contact', jobId, candidateId: applicationId })}>
                    Contact candidate →
                  </Button>
                )}
                <Button variant="link" className="w-fit text-[13px]" onClick={() => setChanging(true)}>
                  Change decision
                </Button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-[#5a6172]">Candidates aren&rsquo;t notified of your decision. You can change it at any time.</p>
                <Button variant="primary" onClick={() => setConfirm('MOVED_FORWARD')}>
                  Move forward
                </Button>
                <Button variant="danger" onClick={() => setConfirm('REJECTED')}>
                  Reject
                </Button>
                {changing && (
                  <Button variant="ghost" size="sm" onClick={() => setChanging(false)}>
                    Keep current decision
                  </Button>
                )}
              </>
            )}
            {r.applicationsStillOpen && (
              <p className="text-[12px] text-[#5a6172] bg-[#f9fafb] rounded-lg p-3">
                Applications are still open. The candidate may complete another attempt, and this report will update to the latest interview.
              </p>
            )}
          </Card>

          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold text-[#1e232f]">Candidate contact</h3>
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#5a6172] font-semibold">Email</p>
              <p className="text-[14px] font-medium text-[#1e232f]">{r.candidate.email}</p>
            </div>
            <Button variant="primary" onClick={() => go({ name: 'contact', jobId, candidateId: applicationId })}>
              Email candidate
            </Button>
            <Button onClick={() => void copyText(r.candidate.email, 'Email copied')}>Copy email</Button>
            <p className="text-[12px] text-[#5a6172]">Contact details are visible because this report is unlocked.</p>
          </Card>

          <Card className="p-5 flex flex-col gap-3">
            <h3 className="text-[15px] font-semibold text-[#1e232f]">Resume</h3>
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#5a6172] font-semibold">File</p>
              <p className="text-[14px] font-medium text-[#1e232f]">{r.resume.available ? r.resume.fileName : 'No resume on file'}</p>
            </div>
            <Button disabled={!r.resume.available} onClick={() => void openResume()}>
              Preview resume
            </Button>
            <Button disabled={!r.resume.available} onClick={() => void openResume()}>
              Download resume
            </Button>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#e1e4ea] pt-4">
        <div className="flex items-center gap-5">
          <Button variant="link" onClick={back}>
            Back to candidates
          </Button>
          <Button variant="link" onClick={notAvailable('PDF download')}>
            Download report PDF
          </Button>
        </div>
        <p className="text-[12px] text-[#5a6172]">This report reflects the latest interview available at the time of download.</p>
      </div>
      <p className="text-[12px] text-[#9ba1b0]">AI-generated assessment should support, not replace, the employer's independent review of interview evidence.</p>

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'REJECTED' ? `Reject ${r.candidate.name}?` : `Move ${r.candidate.name} forward?`}
        actions={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm === 'REJECTED' ? 'danger' : 'primary'} disabled={deciding} onClick={() => confirm && void decide(confirm)}>
              {confirm === 'REJECTED' ? 'Confirm rejection' : 'Move forward'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">
          {confirm === 'REJECTED'
            ? "The candidate won't be notified. You can change this decision at any time."
            : "The candidate won't be notified. You can then contact them with a prepared email."}
        </p>
      </Dialog>
    </div>
  );
}

// One question. Transcript and audio exist only on older interviews
// (hasTranscript / hasAudio with a questionId); otherwise the controls are
// disabled. Links are fetched on click (they expire after 15 minutes).
function QuestionCard({
  q,
  index,
  applicationId,
  expanded,
  onToggle,
}: {
  q: ReportQuestion;
  index: number;
  applicationId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const canTranscript = q.hasTranscript && !!q.questionId;
  const canAudio = q.hasAudio && !!q.questionId;
  const observed = q.evidenceObserved ?? q.answerText;
  const probe = q.areasToProbe ?? q.gapAnalysis;

  useEffect(() => () => audioRef.current?.pause(), []);

  const media = useCallback(async () => {
    try {
      return await getQuestionMedia(applicationId, q.questionId!);
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not load the recording.');
      return null;
    }
  }, [applicationId, q.questionId]);

  const openTranscript = async () => {
    const m = await media();
    if (m?.transcriptUrl) window.open(m.transcriptUrl, '_blank', 'noopener');
    else if (m) toast('No transcript for this question');
  };

  const togglePlay = async () => {
    if (playing) {
      audioRef.current?.pause();
      return setPlaying(false);
    }
    const m = await media();
    if (!m?.audioUrl) return void (m && toast('No recording for this question'));
    const audio = new Audio(m.audioUrl);
    audio.onended = () => setPlaying(false);
    audioRef.current = audio;
    await audio.play().catch(() => toast.error('Could not play the recording.'));
    setPlaying(!audio.paused);
  };

  return (
    <div className={cx('rounded-xl border p-4 flex flex-col gap-2', expanded ? 'border-[#3c77f6]' : 'border-[#e1e4ea]')}>
      <button type="button" onClick={onToggle} className="flex items-start gap-2 text-left" aria-expanded={expanded}>
        <span className={cx('text-[14px] font-semibold', expanded ? 'text-[#3c77f6]' : 'text-[#1e232f]')}>Q{index + 1}</span>
        <span className="flex-1 text-[14px] font-medium text-[#1e232f]">{q.text}</span>
        {expanded ? <ChevronUp size={16} className="text-[#5a6172]" /> : <ChevronDown size={16} className="text-[#5a6172]" />}
      </button>
      {q.summary && <p className="text-[13px] text-[#5a6172]">{q.summary}</p>}
      {expanded && (
        <div className="flex flex-col gap-3 pt-1">
          {q.criteria.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {q.criteria.map((c) => (
                <Pill key={c.criterionId} tone="blue">
                  {c.name}
                </Pill>
              ))}
            </div>
          )}
          {observed && (
            <div>
              <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#15a560]">Evidence observed</p>
              <p className="text-[13px] text-[#4d525e] mt-0.5 whitespace-pre-line">{observed}</p>
            </div>
          )}
          {probe && (
            <div>
              <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#d98c00]">Areas to probe</p>
              <p className="text-[13px] text-[#4d525e] mt-0.5 whitespace-pre-line">{probe}</p>
            </div>
          )}
          <Button
            variant="link"
            className="w-fit text-[13px]"
            disabled={!canTranscript}
            title={canTranscript ? undefined : 'Not available for this interview'}
            onClick={() => void openTranscript()}
          >
            View full transcript
          </Button>
          <div className={cx('flex items-center gap-3 border border-[#e1e4ea] rounded-lg px-3 py-2', !canAudio && 'opacity-50')}>
            <button
              type="button"
              disabled={!canAudio}
              onClick={() => void togglePlay()}
              aria-label={playing ? 'Pause recording' : 'Play recording'}
              title={canAudio ? undefined : 'Not available for this interview'}
              className="text-[#1e232f] disabled:cursor-not-allowed"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="flex-1 h-1 rounded-full bg-[#e1e4ea]">
              <div className={cx('h-full rounded-full bg-[#3c77f6]', playing ? 'w-1/2' : 'w-[6%]')} />
            </div>
            <span className="text-[12px] text-[#5a6172]">0:00 / {clock(q.audioSeconds)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
