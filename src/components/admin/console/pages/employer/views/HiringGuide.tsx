import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronRight, Copy, Info, KeyRound, Lock, Play } from 'lucide-react';
import { cx } from '../ui';

// "How employer hiring works" walkthrough — Figma component set 2033:706
// (5 step variants), shown over the dashboard as in frame 2033:968. Opened
// from the "See how employer hiring works →" link on the dashboard.
// Design inconsistencies between variants (title 28 vs 26px, done-label
// colour, rail step-count size) are normalised to the step 1–3 values.

const STEPS = ['Create a job', 'Candidate interviews', 'Live ranking', 'Unlock reports', 'Contact and decide'];

const BLUE_TINT = 'bg-[rgba(60,119,246,0.08)]';

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded px-1.5 py-0.5 font-bold text-[#3c77f6] whitespace-nowrap', BLUE_TINT, className ?? 'text-[11px]')}>{children}</span>;
}

function Bullets({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map(([lead, rest]) => (
        <div key={lead} className="flex gap-2.5">
          <span className="w-4 h-4 shrink-0 mt-px flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3c77f6]" />
          </span>
          <p className="text-[13px] leading-[18px] text-[#5a6172]">
            <span className="font-bold text-[#1e232f]">{lead}</span> {rest}
          </p>
        </div>
      ))}
    </div>
  );
}

function Callout({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className={cx('flex items-start gap-3 rounded-lg border border-[#3c77f6] p-3', BLUE_TINT)}>
      <span className="w-6 h-6 shrink-0 rounded-full bg-[#3c77f6] text-white flex items-center justify-center">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-bold text-[#1e232f]">{title}</p>
        <p className="text-[12px] text-[#5a6172]">{body}</p>
      </div>
    </div>
  );
}

function CreditsBox() {
  const items = [
    { name: 'Publish a job', badge: '1 Interview Credit', body: 'Charged immediately when the job is published.' },
    { name: 'Sponsored interview', badge: '1 Interview Credit', body: 'Charged after each sponsored candidate completes the interview.' },
    { name: 'Unlock a candidate', badge: '1 Report Credit', body: 'Charged for that candidate and job.' },
  ];
  return (
    <div className="shrink-0 bg-[#f3f4f7] border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-[#1e232f]">Where credits are used</p>
      <div className="grid grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.name} className="flex flex-col items-start gap-1">
            <p className="text-[12px] font-semibold text-[#1e232f]">{it.name}</p>
            <Badge>{it.badge}</Badge>
            <p className="text-[11px] leading-[15px] text-[#5a6172]">{it.body}</p>
          </div>
        ))}
      </div>
      <div className="h-px bg-[#e1e4ea]" />
      <p className="text-[11px] leading-[15px] text-[#5a6172]">
        Drafting, previewing, viewing rankings, contacting an unlocked candidate, and making decisions do not use additional credits.
      </p>
    </div>
  );
}

// ─── Step bodies ─────────────────────────────────────────────────────────────

function StepCreate() {
  const pipeline = ['Job details', 'Criteria', 'AI Interview', 'Credits', 'Publish'];
  return (
    <>
      <div className="bg-[#f9fafb] border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#5a6172]">CREATION PIPELINE</span>
          <Badge className="text-[10px]">Drafting Uses 0 Credits</Badge>
        </div>
        <div className="flex items-center gap-2">
          {pipeline.map((p, i) => (
            <div key={p} className="flex-1 flex items-center gap-2 min-w-0">
              <span
                className={cx(
                  'flex-1 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold border whitespace-nowrap',
                  i === 0 ? 'bg-[#3c77f6] border-[#3c77f6] text-white' : 'bg-white border-[#e1e4ea] text-[#5a6172]',
                )}
              >
                <span>{i + 1}</span>
                <span className="truncate">{p}</span>
              </span>
              {i < pipeline.length - 1 && <ChevronRight size={12} className="shrink-0 text-[#5a6172]" />}
            </div>
          ))}
        </div>
      </div>
      <Bullets
        items={[
          ['Save as draft:', 'return and edit your structured interview at any time.'],
          ['Total control:', 'review, edit, reorder, add, or remove interview questions.'],
          ['Interactive preview:', 'test the candidate experience fully before going live.'],
        ]}
      />
      <Callout
        icon={<Check size={12} strokeWidth={3} />}
        title="Publishing uses 1 Interview Credit immediately."
        body="No credits are used while in draft, editing, or testing mode."
      />
    </>
  );
}

function StepInterviews() {
  const journey = [
    ['1. Job Post', 'Interactive public link'],
    ['2. Application', 'Resume & basic details'],
    ['3. AI Interview', 'Video response & grading'],
    ['4. Candidate List', 'Instant evidence update'],
  ];
  const cards = [
    {
      title: 'Employer-sponsored interviews',
      tone: 'text-[#3c77f6]',
      items: [
        'Candidates do not use their own Interview Credits',
        'Employer uses 1 additional Interview Credit after completed interview',
        'No credit charged when candidate only applies or begins',
      ],
    },
    {
      title: 'Candidate-paid interviews',
      tone: 'text-[#5a6172]',
      items: ['Candidates use their own Interview Credits', 'Employer does not use additional Interview Credits'],
    },
  ];
  return (
    <>
      <div className="bg-[#f9fafb] border border-[#e1e4ea] rounded-xl p-4 flex gap-5">
        {journey.map(([t, s], i) => (
          <div key={t} className="flex-1 flex items-center gap-3 min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-[12px] font-bold text-[#1e232f]">{t}</p>
              <p className="text-[11px] text-[#5a6172] truncate">{s}</p>
            </div>
            {i < journey.length - 1 && <ChevronRight size={12} className="shrink-0 text-[#5a6172] ml-auto" />}
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        {cards.map((c) => (
          <div key={c.title} className="flex-1 bg-white border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-3">
            <p className="text-[14px] font-bold text-[#1e232f]">{c.title}</p>
            <div className="flex flex-col gap-2">
              {c.items.map((it) => (
                <div key={it} className="flex gap-2">
                  <Check size={12} strokeWidth={3} className={cx('shrink-0 mt-0.5', c.tone)} />
                  <p className="text-[12px] leading-4 text-[#5a6172]">{it}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 text-[11px] leading-[15px]">
        <p className="text-[#5a6172]">If sponsored credits run out and auto-replenish is off, additional candidates can continue using their own credits.</p>
        <p className="font-bold text-[#3c77f6]">1 Interview Credit per completed sponsored interview.</p>
      </div>
    </>
  );
}

function StepRanking() {
  const rows = [
    { rank: '#1', name: 'A. Kowalski', score: 88, move: '▲ moved up 1', up: true },
    { rank: '#2', name: 'Candidate #117', score: 84, move: '—' },
    { rank: '#3', name: 'Candidate #119', score: 81, move: '—', isNew: true },
  ];
  return (
    <>
      <div className="bg-white border border-[#e1e4ea] rounded-xl px-3 py-2.5 flex flex-col gap-2.5">
        <div className="flex gap-3 pb-2 border-b border-[#e1e4ea] text-[11px] font-bold text-[#5a6172]">
          <span className="w-10">Rank</span>
          <span className="flex-1">Candidate</span>
          <span className="w-[100px] text-right">Latest Score</span>
          <span className="w-[120px] text-right">Movement</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.rank} className="flex items-center gap-3 py-2">
              <span className="w-10 text-[13px] font-bold text-[#1e232f]">{r.rank}</span>
              <span className="flex-1 flex items-center gap-2 text-[13px] font-semibold text-[#1e232f]">
                {r.name}
                {r.isNew && <Badge className="text-[9px]">NEW</Badge>}
              </span>
              <span className="w-[100px] text-right text-[13px] font-bold text-[#3c77f6]">{r.score}</span>
              <span className={cx('w-[120px] text-right text-[11px] font-medium', r.up ? 'text-[#10b981]' : 'text-[#5a6172]')}>{r.move}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {[
          'Employers can see applicants while the application window is still open.',
          'Rankings update when interviews are completed.',
          'If a candidate completes a new attempt, only the latest interview result is shown.',
          'When the application window closes, the final candidate list remains ordered by score.',
          'Employers may review and act before the application window closes.',
        ].map((t) => (
          <div key={t} className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-[#5a6172] shrink-0 mt-[7px]" />
            <p className="text-[12px] leading-4 text-[#5a6172]">{t}</p>
          </div>
        ))}
      </div>
      <p className="bg-[#f3f4f7] rounded-lg p-3 text-[12px] leading-4 text-[#5a6172]">
        <span className="font-bold text-[#1e232f]">Please note:</span> The score is a ranking signal, not a Qualified or Not Qualified decision. Higher-scoring candidates appear earlier in the list. Viewing rankings does not use credits.
      </p>
    </>
  );
}

function StepUnlock() {
  const bars = Array.from({ length: 18 }, (_, i) => [4, 10, 16][i % 3]);
  return (
    <>
      <div className="flex gap-4">
        <div className="flex-1 bg-[#f9fafb] border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-bold text-[#1e232f]">A. Kowalski</p>
              <p className="text-[11px] text-[#5a6172]">Applied Oct 12</p>
            </div>
            <span className="bg-[#f3f4f7] rounded px-2 py-1 text-[11px] font-bold text-[#5a6172]">Rank #1</span>
          </div>
          <div className="bg-[#f3f4f7] rounded-lg p-3 flex items-center gap-2.5">
            <Lock size={16} className="text-[#5a6172] shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-[#1e232f]">Overall Score: 88/100</p>
              <p className="text-[11px] text-[#5a6172]">Details, criteria &amp; audio locked</p>
            </div>
          </div>
          <div className="flex justify-center py-2">
            <span className="inline-flex items-center gap-1.5 bg-[#3c77f6] rounded-md px-3.5 py-2 text-[12px] font-semibold text-white">
              <KeyRound size={12} /> Unlock report
            </span>
          </div>
        </div>
        <div className="flex-1 bg-white border border-[#3c77f6] rounded-xl p-4 flex flex-col gap-2.5 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-bold text-[#1e232f]">A. Kowalski (Unlocked)</p>
              <p className="text-[11px] text-[#10b981]">a.kowalski@email.com</p>
            </div>
            <Badge className="text-[11px] !px-2 !py-1">Score 88</Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#5a6172]">Technical Fit</span>
              <span className="font-semibold text-[#1e232f]">90%</span>
            </div>
            <div className="h-1.5 rounded-[3px] bg-[#f3f4f7] overflow-hidden">
              <div className="h-full bg-[#3c77f6] rounded-[3px]" style={{ width: '90%' }} />
            </div>
          </div>
          <div className="bg-[#f9fafb] rounded-md p-2 flex items-center gap-1.5">
            <Play size={14} className="text-[#3c77f6] fill-[#3c77f6] shrink-0" />
            <div className="flex items-center gap-0.5 flex-1">
              {bars.map((h, i) => (
                <span key={i} className="w-0.5 rounded-[1px] bg-[#3c77f6]" style={{ height: h }} />
              ))}
            </div>
            <span className="text-[10px] text-[#5a6172]">1:14</span>
          </div>
          <p className="text-[11px] leading-[14px] text-[#5a6172] truncate">
            <span className="font-bold text-[#1e232f]">AI Evidence:</span> Demonstrated crisp knowledge of React concurrent rendering and system architecture during Q2 response.
          </p>
        </div>
      </div>
      <Callout
        icon={<Info size={12} strokeWidth={3} />}
        title="Unlocking one candidate uses 1 Report Credit for that candidate and job."
        body="If the same candidate applies to another job, unlocking that report uses another Report Credit because report content is job-specific."
      />
    </>
  );
}

function StepDecide() {
  return (
    <>
      <div className="flex gap-4">
        <div className="flex-1 bg-white border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#f3f4f7] text-[12px] font-bold text-[#5a6172] flex items-center justify-center">AK</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1e232f]">A. Kowalski</p>
              <p className="text-[11px] text-[#5a6172]">Hiring Pipeline: Under Review</p>
            </div>
            <Badge className="text-[11px] !px-2 !py-1">Score 88</Badge>
          </div>
          <div className="bg-[#f9fafb] border border-[#e1e4ea] rounded-md px-2.5 py-2 flex items-center justify-between">
            <span className="text-[12px] text-[#1e232f]">a.kowalski@email.com</span>
            <Copy size={14} className="text-[#5a6172]" />
          </div>
          <div className="flex gap-2">
            <span className="flex-1 text-center py-2 rounded-md bg-[#10b981] text-white text-[12px] font-bold">Move forward</span>
            <span className="flex-1 text-center py-2 rounded-md border border-[#ef4444] text-[#ef4444] text-[12px] font-bold">Reject</span>
          </div>
        </div>
        <div className="flex-1 bg-white border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#fef2f2] text-[#ef4444] flex items-center justify-center">
              <Info size={10} strokeWidth={3} />
            </span>
            <p className="text-[13px] font-bold text-[#1e232f]">Reject this candidate?</p>
          </div>
          <p className="text-[11px] leading-[15px] text-[#5a6172]">
            The candidate will be notified that they are not moving forward for this job. You can customize the automated message.
          </p>
          <div className="flex justify-end items-center gap-2 mt-auto">
            <span className="text-[12px] font-semibold text-[#5a6172] px-1">Cancel</span>
            <span className="bg-[#ef4444] rounded-md px-3 py-1.5 text-[11px] font-bold text-white">Confirm rejection</span>
          </div>
        </div>
      </div>
      <Bullets
        items={[
          ['Direct contact:', 'Click to reveal, copy, and message candidate email addresses straight from the browser.'],
          ['Total status control:', 'Update decision trees instantly. Move Forward and Reject statuses propagate directly to your ATS pipeline.'],
          ['No hidden fees:', 'Contacting, moving forward, and rejecting do not use additional credits after the report is unlocked.'],
        ]}
      />
    </>
  );
}

const CONTENT: { title: string; subtitle: string; badge?: ReactNode; body: () => ReactNode }[] = [
  {
    title: 'Create a structured job and interview',
    subtitle: 'Add the role, define what matters, and review every AI-generated interview question before publishing.',
    body: StepCreate,
  },
  {
    title: 'Candidates apply and complete the interview',
    subtitle: 'Every applicant completes the same structured interview created for the role.',
    body: StepInterviews,
  },
  {
    title: 'See the strongest evidence first',
    subtitle: 'Candidate rankings update as completed interviews are submitted.',
    badge: (
      <span className="inline-flex items-center gap-1 bg-[#ecfdf5] border border-[#a7f3d0] rounded-md px-2 py-1 text-[11px] font-bold text-[#10b981] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Live ranking
      </span>
    ),
    body: StepRanking,
  },
  {
    title: 'Unlock the evidence behind the score',
    subtitle: "Open a candidate's full report when you are ready to review them in detail.",
    body: StepUnlock,
  },
  {
    title: 'Contact candidates and make a decision',
    subtitle: 'Use the interview evidence to contact candidates directly and move the hiring process forward.',
    body: StepDecide,
  },
];

// ─── Modal shell ─────────────────────────────────────────────────────────────

export function HiringGuide({
  open,
  onClose,
  onFinish,
  finishLabel = 'Create your first job',
}: {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  finishLabel?: string;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const c = CONTENT[step];
  const Body = c.body;
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[rgba(0,0,0,0.45)]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How employer hiring works"
        className="bg-white border border-[#e1e4ea] rounded-xl overflow-hidden w-full max-w-[1040px] h-[min(700px,calc(100vh-32px))] flex flex-col shadow-[0px_24px_48px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 flex min-h-0">
          {/* Left rail */}
          <aside className="w-[290px] shrink-0 bg-[#f9fafb] border-r border-[#e1e4ea] p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#3c77f6]">Employer guide</span>
              <h2 className="text-[18px] font-bold text-[#1e232f]">How employer hiring works</h2>
              <p className="text-[13px] leading-[18px] text-[#5a6172]">From job creation to evidence-backed hiring decisions.</p>
            </div>
            <div className="h-px bg-[#e1e4ea]" />
            <nav className="flex flex-col gap-1">
              {STEPS.map((label, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(i)}
                    className={cx('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left', active ? BLUE_TINT : 'hover:bg-[#f3f4f7]')}
                  >
                    <span
                      className={cx(
                        'w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px]',
                        active ? 'bg-[#3c77f6] text-white font-bold' : done ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#f3f4f7] border border-[#e1e4ea] text-[#5a6172] font-semibold',
                      )}
                    >
                      {done ? <Check size={10} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={cx('text-[13px]', active ? 'font-semibold text-[#3c77f6]' : done ? 'font-medium text-[#1e232f]' : 'font-medium text-[#5a6172]')}>{label}</span>
                  </button>
                );
              })}
            </nav>
            <p className="pt-3 text-[12px] font-semibold text-[#5a6172]">Step {step + 1} of {STEPS.length}</p>
          </aside>

          {/* Right panel */}
          <section className="flex-1 min-w-0 p-8 flex flex-col gap-5 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[28px] font-bold text-[#1e232f] font-[family-name:var(--font-serif)] leading-tight">{c.title}</h3>
                {c.badge}
              </div>
              <p className="text-[14px] leading-5 text-[#5a6172]">{c.subtitle}</p>
            </div>
            <div className="flex-1 flex flex-col gap-5">
              <Body />
            </div>
            <CreditsBox />
          </section>
        </div>

        {/* Footer */}
        <footer className="h-[72px] shrink-0 bg-white border-t border-[#e1e4ea] px-8 py-4 flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-[14px] font-semibold text-[#5a6172] hover:text-[#1e232f]">
            Close guide
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-semibold text-[#5a6172]">Step {step + 1} of {STEPS.length}</span>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="bg-white border border-[#e1e4ea] rounded-lg px-4 py-2 text-[14px] font-semibold text-[#5a6172] hover:bg-[#f9fafb]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onFinish() : setStep(step + 1))}
              className="inline-flex items-center gap-2 bg-[#3c77f6] hover:bg-[#2d6ae0] rounded-lg px-4 py-2 text-[14px] font-semibold text-white"
            >
              {last ? finishLabel : <>Next <ArrowRight size={12} /></>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
