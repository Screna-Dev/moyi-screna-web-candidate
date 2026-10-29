import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ClipboardList, MoreHorizontal, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Button, Card, EmptyBox, PageTitle, Pill, Select, StatCard, Tabs, cx } from '@/components/admin/console/pages/employer/ui';
import { PerformanceBar, ScreeningDots, copyText } from '@/components/admin/console/pages/employer/views/candidateShared';
import { authErrorMessage } from './employerAuth';
import {
  closeJob,
  getBoardSummary,
  listApplicationsJobs,
  listBoardCandidates,
  recordBoardVisit,
  type ApplicationsJob,
  type BoardCandidate,
  type BoardSummary,
  type CandidateFilters,
  type Page,
} from './employerApi';
import { closingLabel, jobLinkOf, performanceOf, screeningOf, shortDate, updatedLabel, weakestLabelOf } from './boardFormat';
import { EmployerUnlockDialog, type UnlockTarget } from './EmployerUnlockDialog';

// Application board (Figma "Candidate Board - Main", "— No Completed
// Interviews", "— Loading"), from GET .../board/summary and .../candidates.
// After the first page of candidates has rendered, POST .../board/visits
// records the visit (rank snapshot + resets the job's "New" count); calling it
// earlier would wipe isNew and movement. 10 rows per page (the API's size).
// Screening: see screeningOf (design sample while the AI doesn't assess it).

type Chip = 'all' | 'unlocked' | 'locked';
type ScoreFilter = 'Score: All' | '80+' | '70+' | 'Below 70';
const REPORT: Record<Chip, CandidateFilters['report']> = { all: 'ALL', unlocked: 'UNLOCKED', locked: 'LOCKED' };
const SCORE: Record<ScoreFilter, Pick<CandidateFilters, 'minScore' | 'maxScore'>> = {
  'Score: All': {},
  '80+': { minScore: 80 },
  '70+': { minScore: 70 },
  'Below 70': { maxScore: 69 },
};

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading candidates">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-[#f3f4f7] animate-pulse" />
      ))}
    </div>
  );
}

export function EmployerBoardView({ jobId }: { jobId: string }) {
  const { go } = useEmployerStore();
  const [summary, setSummary] = useState<BoardSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [rows, setRows] = useState<Page<BoardCandidate> | null>(null);
  const [rowsFailed, setRowsFailed] = useState(false);
  const [otherJobs, setOtherJobs] = useState<ApplicationsJob[]>([]);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('Score: All');
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<UnlockTarget | null>(null);

  const loadSummary = useCallback(() => {
    getBoardSummary(jobId)
      .then((s) => {
        setSummary(s);
        setSummaryError('');
      })
      .catch((err) => setSummaryError(authErrorMessage(err) || 'not-found'));
  }, [jobId]);

  useEffect(() => loadSummary(), [loadSummary]);

  // Other published jobs for the switcher (first page is enough for the menu).
  useEffect(() => {
    let cancelled = false;
    listApplicationsJobs({ status: 'ALL', sort: 'RECENTLY_UPDATED', page: 0 })
      .then((l) => !cancelled && setOtherJobs(l.items.filter((j) => j.jobId !== jobId)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setRowsFailed(false);
    listBoardCandidates(jobId, { q: query, report: REPORT[chip], ...SCORE[scoreFilter], page })
      .then((r) => !cancelled && setRows(r))
      .catch(() => !cancelled && setRowsFailed(true));
    return () => {
      cancelled = true;
    };
  }, [jobId, query, chip, scoreFilter, page, reload]);

  // Once, after the first page of candidates has rendered (this effect runs
  // after that render).
  const visited = useRef(false);
  useEffect(() => {
    if (!rows || visited.current) return;
    visited.current = true;
    recordBoardVisit(jobId).catch(() => {});
  }, [rows, jobId]);

  if (summaryError) {
    return (
      <Card className="p-0">
        <EmptyBox title="Job not found" actions={<Button onClick={() => go({ name: 'applications' })}>Back to applications</Button>} />
      </Card>
    );
  }

  const job = summary?.job;
  const cards = summary?.cards;
  const isOpen = job?.status === 'OPEN';
  const title = job?.title ?? '';
  const completed = cards?.interviewsCompleted ?? 0;
  const unlocked = cards?.reportsUnlocked ?? 0;
  const meta = rows?.pageMeta;

  const resetPaging = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  const close = async () => {
    setMenuOpen(false);
    try {
      await closeJob(jobId);
      toast.success(`Applications closed for ${title}`);
      loadSummary();
    } catch (err) {
      toast.error(authErrorMessage(err) || 'Could not close applications.');
    }
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
                {title || 'Loading…'} <ChevronDown size={15} />
              </Button>
              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setSwitcherOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-[50] min-w-[220px] bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.08)] py-1">
                    {otherJobs.length === 0 && <p className="px-3 py-2 text-[13px] text-[#5a6172]">No other published jobs</p>}
                    {otherJobs.map((j) => (
                      <button
                        key={j.jobId}
                        type="button"
                        onClick={() => {
                          setSwitcherOpen(false);
                          go({ name: 'board', jobId: j.jobId });
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-[13px] hover:bg-[#f3f4f7]"
                      >
                        <span className="text-[#1e232f]">{j.title}</span>
                        <Pill tone={j.status === 'CLOSED' ? 'gray' : 'green'}>{j.status === 'CLOSED' ? 'Closed' : j.status === 'SCHEDULED' ? 'Scheduled' : 'Open'}</Pill>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button onClick={() => go({ name: 'wizard', jobId })}>View job</Button>
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
                        void copyText(jobLinkOf(jobId), 'Job link copied');
                      }}
                    >
                      Copy job link
                    </button>
                    {isOpen && (
                      <button type="button" className="w-full text-left px-3 py-2 text-[13px] text-[#dc2626] hover:bg-[#fef2f2]" onClick={() => void close()}>
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
        <Pill tone={job?.status === 'CLOSED' ? 'gray' : 'green'}>{job?.status === 'CLOSED' ? 'Closed' : job?.status === 'SCHEDULED' ? 'Scheduled' : 'Open'}</Pill>
        <span className="text-[#5a6172]">
          {job?.status === 'CLOSED' ? 'Closed' : 'Applications close'}:{' '}
          <span className="font-semibold text-[#1e232f]">{job ? closingLabel(job.status === 'CLOSED' ? job.closedAt ?? job.closesAt : job.closesAt, job.timezone) : '—'}</span>
        </span>
        <span className="w-px h-4 bg-[#e1e4ea]" />
        <span className="flex items-center gap-1.5 text-[#5a6172]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15a560]" /> {updatedLabel(summary?.rankingUpdatedAt ?? null)}
        </span>
      </Card>

      {!summary ? (
        <BoardSkeleton />
      ) : completed === 0 ? (
        <Card className="p-0">
          <EmptyBox
            icon={<ClipboardList size={20} />}
            title="No completed interviews yet"
            body={
              <div className="flex flex-col items-center gap-3">
                <span>Candidates will appear here after they finish the structured AI interview.</span>
                {summary.inProgressCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#eef4ff] text-[#3c77f6] text-[12px]">
                    {summary.inProgressCount} candidate{summary.inProgressCount === 1 ? ' has' : 's have'} applied and {summary.inProgressCount === 1 ? 'is' : 'are'} still completing the interview.
                  </span>
                )}
              </div>
            }
            actions={
              <>
                <Button onClick={() => go({ name: 'wizard', jobId })}>View live job</Button>
                <Button variant="link" onClick={() => void copyText(jobLinkOf(jobId), 'Job link copied')}>
                  Copy job link
                </Button>
              </>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            <StatCard label="Applications" value={cards!.applications} hint={`${cards!.notCompleted} have not completed the interview`} />
            <StatCard label="Interviews completed" value={completed} hint={`${cards!.completedLast7Days} completed this week`} />
            <StatCard
              label="Reports unlocked"
              value={unlocked}
              hint={`${cards!.reportCreditsRemaining} report unlock${cards!.reportCreditsRemaining === 1 ? '' : 's'} remaining`}
            />
            {/* Decisions don't notify candidates (backend): the hints say who was contacted instead. */}
            <StatCard label="Moved forward" value={cards!.movedForward} hint={`${cards!.movedForwardContacted} contacted`} />
            <StatCard label="Rejected" value={cards!.rejected} hint="Decisions aren't sent to candidates" />
          </div>

          <Card className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 bg-[#f3f4f7] rounded-lg px-3 py-2">
              <Search size={15} className="text-[#5a6172]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate ID or unlocked name"
                aria-label="Search candidate ID or unlocked name"
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1e232f] placeholder:text-[#9ba1b0]"
              />
            </div>
            <Tabs
              value={chip}
              onChange={resetPaging(setChip)}
              options={[
                { value: 'all', label: `All completed ${completed}` },
                { value: 'unlocked', label: `Unlocked ${unlocked}` },
                { value: 'locked', label: `Locked ${Math.max(0, completed - unlocked)}` },
              ]}
            />
            <Select value={scoreFilter} onChange={(v) => resetPaging(setScoreFilter)(v as ScoreFilter)} options={['Score: All', '80+', '70+', 'Below 70']} className="!w-auto" />
          </Card>

          {rowsFailed ? (
            <Card className="p-0">
              <EmptyBox title="Couldn't load candidates" actions={<Button onClick={() => setReload((r) => r + 1)}>Try again</Button>} />
            </Card>
          ) : !rows ? (
            <BoardSkeleton />
          ) : (
            <>
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
                    {rows.content.map((c) => {
                      const scr = screeningOf(c);
                      const unlockedRow = c.reportStatus === 'UNLOCKED';
                      return (
                        <tr key={c.applicationId} className="border-t border-[#e1e4ea]">
                          <td className={cx('px-5 py-3 text-[15px] font-semibold', c.rank === 1 ? 'text-[#3c77f6]' : 'text-[#1e232f]')}>#{c.rank}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className={cx('text-[14px] font-medium', unlockedRow ? 'text-[#1e232f]' : 'text-[#4d525e]')}>{c.candidate.label}</span>
                                <span className="text-[12px] text-[#5a6172]">
                                  {shortDate(c.latestInterview.completedAt, job?.timezone ?? null)}
                                  {c.latestInterview.durationMinutes !== null ? ` · ${c.latestInterview.durationMinutes} min` : ''}
                                </span>
                              </div>
                              {c.movement ? (
                                <span
                                  className={cx('inline-flex items-center text-[12px] font-semibold', c.movement > 0 ? 'text-[#15a560]' : 'text-[#dc2626]')}
                                  title={`${c.movement > 0 ? 'Up' : 'Down'} ${Math.abs(c.movement)} place${Math.abs(c.movement) > 1 ? 's' : ''} since your last visit.`}
                                >
                                  {c.movement > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                  {Math.abs(c.movement)}
                                </span>
                              ) : null}
                              {c.isNew && <Pill tone="blue">New</Pill>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[16px] font-semibold text-[#1e232f]">{c.score}/100</td>
                          <td className="px-3 py-3">
                            <PerformanceBar segments={performanceOf(c)} label={weakestLabelOf(c)} />
                          </td>
                          <td className="px-3 py-3">
                            <ScreeningDots met={scr.met} total={scr.total} />
                          </td>
                          <td className="px-3 py-3">
                            {unlockedRow ? (
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => go({ name: 'report', jobId, candidateId: c.applicationId })}>
                                  View report
                                </Button>
                                <Pill tone="green">Unlocked</Pill>
                              </div>
                            ) : (
                              <Button size="sm" variant="primary" onClick={() => setUnlocking({ applicationId: c.applicationId, label: c.candidate.label })}>
                                Unlock Report
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.content.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-[14px] text-[#5a6172]">
                          No candidates match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>

              {meta && (
                <Card className="px-4 py-3 flex items-center justify-between text-[14px] text-[#5a6172]">
                  <span>
                    Showing {meta.totalElements === 0 ? 0 : meta.pageNumber * meta.pageSize + 1}-{Math.min(meta.totalElements, (meta.pageNumber + 1) * meta.pageSize)} of{' '}
                    {meta.totalElements} completed interviews
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={meta.first} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <span>
                      Page {meta.pageNumber + 1} of {Math.max(1, meta.totalPages)}
                    </span>
                    <Button size="sm" disabled={meta.last} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      <EmployerUnlockDialog
        target={unlocking}
        jobId={jobId}
        jobTitle={title}
        onClose={() => setUnlocking(null)}
        onUnlocked={(applicationId) => {
          setReload((r) => r + 1);
          loadSummary();
          go({ name: 'report', jobId, candidateId: applicationId });
        }}
      />
    </div>
  );
}
