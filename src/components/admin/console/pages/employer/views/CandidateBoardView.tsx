import { useMemo, useState } from 'react';
import { ArrowUp, ChevronDown, ClipboardList, MoreHorizontal, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '../store';
import type { Candidate } from '../types';
import { Button, Card, EmptyBox, PageTitle, Pill, Select, StatCard, Tabs, cx } from '../ui';
import { PerformanceBar, ScreeningDots, UnlockDialog, copyText, jobLink } from './candidateShared';

type Chip = 'all' | 'unlocked' | 'locked';
type ScoreFilter = 'Score: All' | '80+' | '70+' | 'Below 70';
const PAGE_SIZE = 8;

export function CandidateBoardView({ jobId }: { jobId: string }) {
  const { getJob, jobs, candidatesFor, unlockCandidate, closeJob, go } = useEmployerStore();
  const job = getJob(jobId);
  const ranked = candidatesFor(jobId);

  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('Score: All');
  const [page, setPage] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<Candidate | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ranked
      .map((c, i) => ({ c, rank: i + 1 }))
      .filter(({ c }) => {
        if (chip === 'unlocked' && !c.unlocked) return false;
        if (chip === 'locked' && c.unlocked) return false;
        if (scoreFilter === '80+' && c.score < 80) return false;
        if (scoreFilter === '70+' && c.score < 70) return false;
        if (scoreFilter === 'Below 70' && c.score >= 70) return false;
        if (!q) return true;
        return c.anonLabel.toLowerCase().includes(q) || (c.unlocked && c.name.toLowerCase().includes(q));
      });
  }, [ranked, search, chip, scoreFilter]);

  if (!job) {
    return (
      <Card className="p-0">
        <EmptyBox title="Job not found" actions={<Button onClick={() => go({ name: 'applications' })}>Back to applications</Button>} />
      </Card>
    );
  }

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const unlocked = ranked.filter((c) => c.unlocked).length;
  const moved = ranked.filter((c) => c.decision === 'moved_forward').length;
  const rejected = ranked.filter((c) => c.decision === 'rejected').length;
  const otherJobs = jobs.filter((j) => j.id !== job.id && (j.status === 'Open' || j.status === 'Closed'));
  const isOpen = job.status === 'Open';

  const resetPaging = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      <PageTitle
        title="Application board"
        subtitle="Review completed interviews, unlock evidence, and make hiring decisions."
        right={
          <>
            <div className="relative">
              <Button onClick={() => setSwitcherOpen((v) => !v)}>
                {job.title} <ChevronDown size={15} />
              </Button>
              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setSwitcherOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-[50] min-w-[220px] bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.08)] py-1">
                    {otherJobs.length === 0 && <p className="px-3 py-2 text-[13px] text-[#5a6172]">No other published jobs</p>}
                    {otherJobs.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          setSwitcherOpen(false);
                          setPage(0);
                          go({ name: 'board', jobId: j.id });
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-[13px] hover:bg-[#f3f4f7]"
                      >
                        <span className="text-[#1e232f]">{j.title}</span>
                        <Pill tone={j.status === 'Open' ? 'green' : 'gray'}>{j.status}</Pill>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button onClick={() => go({ name: 'wizard', jobId: job.id })}>View job</Button>
            <div className="relative">
              <Button aria-label="More actions" onClick={() => setMenuOpen((v) => !v)} className="!px-2.5">
                <MoreHorizontal size={16} />
              </Button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-[50] min-w-[200px] bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.08)] py-1">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f3f4f7]"
                      onClick={() => {
                        setMenuOpen(false);
                        copyText(jobLink(job), 'Job link copied');
                      }}
                    >
                      Copy job link
                    </button>
                    {isOpen && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-[13px] text-[#dc2626] hover:bg-[#fef2f2]"
                        onClick={() => {
                          setMenuOpen(false);
                          closeJob(job.id);
                          toast.success(`Applications closed for ${job.title}`);
                        }}
                      >
                        Close applications
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        }
      />

      <Card className="px-4 py-2.5 flex items-center gap-3 text-[14px]">
        <Pill tone={isOpen ? 'green' : 'gray'}>{isOpen ? 'Open' : 'Closed'}</Pill>
        <span className="text-[#5a6172]">
          {isOpen ? 'Applications close' : 'Closed'}: <span className="font-semibold text-[#1e232f]">{job.closesAt ? `${job.closesAt} CT` : 'Not set'}</span>
        </span>
        <span className="w-px h-4 bg-[#e1e4ea]" />
        <span className="flex items-center gap-1.5 text-[#5a6172]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15a560]" /> Updated just now
        </span>
      </Card>

      {ranked.length === 0 ? (
        <Card className="p-0">
          <EmptyBox
            icon={<ClipboardList size={20} />}
            title="No completed interviews yet"
            body={
              <div className="flex flex-col items-center gap-3">
                <span>Candidates will appear here after they finish the structured AI interview.</span>
                {job.applicants > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#eef4ff] text-[#3c77f6] text-[12px]">
                    {job.applicants} candidates have applied and are still completing the interview.
                  </span>
                )}
              </div>
            }
            actions={
              <>
                <Button onClick={() => go({ name: 'wizard', jobId: job.id })}>View live job</Button>
                <Button variant="link" onClick={() => copyText(jobLink(job), 'Job link copied')}>
                  Copy job link
                </Button>
              </>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            <StatCard label="Applications" value={job.applicants} hint={`${Math.max(0, job.applicants - ranked.length)} have not completed the interview`} />
            <StatCard label="Interviews completed" value={ranked.length} hint="8 completed this week" />
            <StatCard label="Reports unlocked" value={unlocked} hint={`${ranked.length - unlocked} still locked`} />
            <StatCard label="Moved forward" value={moved} hint="Candidates notified" />
            <StatCard label="Rejected" value={rejected} hint={rejected === 1 ? 'Candidate notified' : 'Candidates notified'} />
          </div>

          <Card className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 bg-[#f3f4f7] rounded-lg px-3 py-2">
              <Search size={15} className="text-[#5a6172]" />
              <input
                value={search}
                onChange={(e) => resetPaging(setSearch)(e.target.value)}
                placeholder="Search candidate ID or unlocked name"
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1e232f] placeholder:text-[#9ba1b0]"
              />
            </div>
            <Tabs
              value={chip}
              onChange={resetPaging(setChip)}
              options={[
                { value: 'all', label: `All completed ${ranked.length}` },
                { value: 'unlocked', label: `Unlocked ${unlocked}` },
                { value: 'locked', label: `Locked ${ranked.length - unlocked}` },
              ]}
            />
            <Select value={scoreFilter} onChange={(v) => resetPaging(setScoreFilter)(v as ScoreFilter)} options={['Score: All', '80+', '70+', 'Below 70']} className="!w-auto" />
          </Card>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f3f4f7] text-[13px] font-semibold text-[#1e232f]">
                <tr>
                  <th className="px-5 py-3 w-[70px]">Rank</th>
                  <th className="px-3 py-3">Candidate</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Interview Performance</th>
                  <th className="px-3 py-3">Screening Criteria</th>
                  <th className="px-3 py-3 w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, rank }) => (
                  <tr key={c.id} className="border-t border-[#e1e4ea]">
                    <td className={cx('px-5 py-3 text-[15px] font-semibold', rank === 1 ? 'text-[#3c77f6]' : 'text-[#1e232f]')}>#{rank}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className={cx('text-[14px] font-medium', c.unlocked ? 'text-[#1e232f]' : 'text-[#4d525e]')}>{c.unlocked ? c.name : c.anonLabel}</span>
                          <span className="text-[12px] text-[#5a6172]">
                            {c.completedAt} · {c.durationMin} min
                          </span>
                        </div>
                        {c.rankDelta ? (
                          <span
                            className="inline-flex items-center text-[12px] font-semibold text-[#15a560]"
                            title={`Up ${c.rankDelta} place${c.rankDelta > 1 ? 's' : ''} since your last visit.`}
                          >
                            <ArrowUp size={12} />
                            {c.rankDelta}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[16px] font-semibold text-[#1e232f]">{c.score}/100</td>
                    <td className="px-3 py-3">
                      <PerformanceBar segments={c.performance} label={c.weakestLabel} />
                    </td>
                    <td className="px-3 py-3">
                      <ScreeningDots met={c.screeningMet} total={c.screeningTotal} />
                    </td>
                    <td className="px-3 py-3">
                      {c.unlocked ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => go({ name: 'report', jobId: job.id, candidateId: c.id })}>
                            View report
                          </Button>
                          <Pill tone="green">Unlocked</Pill>
                        </div>
                      ) : (
                        <Button size="sm" variant="primary" onClick={() => setUnlocking(c)}>
                          Unlock report
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-[#5a6172]">
                      No candidates match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card className="px-4 py-3 flex items-center justify-between text-[14px] text-[#5a6172]">
            <span>
              Showing {filtered.length === 0 ? 0 : current * PAGE_SIZE + 1}-{Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of {filtered.length} completed interviews
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                Previous
              </Button>
              <span>
                Page {current + 1} of {pages}
              </span>
              <Button size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                Next
              </Button>
            </div>
          </Card>
        </>
      )}

      <UnlockDialog
        candidate={unlocking}
        job={job}
        unlock={unlockCandidate}
        onClose={() => setUnlocking(null)}
        onUnlocked={(c) => go({ name: 'report', jobId: job.id, candidateId: c.id })}
      />
    </div>
  );
}
