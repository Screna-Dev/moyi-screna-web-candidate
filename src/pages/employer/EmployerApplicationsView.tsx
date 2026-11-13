import { useEffect, useState } from 'react';
import { Archive, Briefcase, Calendar, Search } from 'lucide-react';
import { useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { Button, Card, EmptyBox, PageTitle, Select, StatCard, Tabs, cx } from '@/components/admin/console/pages/employer/ui';
import { listApplicationsJobs, type ApplicationsJob, type ApplicationsJobFilter, type ApplicationsJobList, type JobListSort } from './employerApi';
import { workplaceLabel } from './jobMapping';
import { closingLabel } from './boardFormat';

// Applications (Figma "Applications - Job Selection"): published jobs with
// their application counts, from GET /employer/applications/jobs. Search,
// tabs and sort run on the server; 10 jobs per page. The API sorts by
// "Recently updated" or "Closing soon" only, so the design's "Most applicants"
// is replaced by "Closing soon" (hiring demo guide).

type Filter = 'all' | 'active' | 'closed';
const FILTER: Record<Filter, ApplicationsJobFilter> = { all: 'ALL', active: 'ACTIVE', closed: 'CLOSED' };
const SORTS: { label: string; value: JobListSort }[] = [
  { label: 'Recently updated', value: 'RECENTLY_UPDATED' },
  { label: 'Closing soon', value: 'CLOSING_SOON' },
];

function JobCard({ job, onView }: { job: ApplicationsJob; onView: () => void }) {
  const closed = job.status === 'CLOSED';
  const place = [job.location, workplaceLabel(job.workplaceType)].filter(Boolean).join(' · ');
  return (
    <Card className={cx('p-5 flex flex-col gap-4', closed && 'bg-[#f9fafb]')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[18px] font-semibold text-[#1e232f]">{job.title}</p>
          {place && <p className="text-[14px] text-[#5a6172]">{place}</p>}
          <p className="flex items-center gap-1.5 text-[14px] text-[#5a6172]">
            <Calendar size={14} />
            {closed ? 'Closed' : job.status === 'SCHEDULED' ? 'Opens' : 'Applications close'}:{' '}
            {closingLabel(closed ? job.closedAt ?? job.closesAt : job.status === 'SCHEDULED' ? job.opensAt : job.closesAt, job.timezone)}
          </p>
        </div>
        {closed ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f3f4f7] text-[#5a6172] text-[13px] font-medium">
            <Archive size={13} /> Closed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#e8f7ee] text-[#15a560] text-[13px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15a560]" /> {job.status === 'SCHEDULED' ? 'Scheduled' : 'Active'}
          </span>
        )}
      </div>
      <div className="h-px bg-[#e1e4ea]" />
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-14">
          {(
            [
              [job.applicationCount, 'Applications'],
              [job.completedCount, 'Interviews completed'],
              [job.unlockedCount, 'Reports unlocked'],
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="flex flex-col">
              <span className="text-[26px] font-semibold text-[#1e232f] leading-8">{v}</span>
              <span className="text-[14px] text-[#5a6172]">{l}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {job.newCount > 0 && <span className="text-[12px] font-semibold text-white bg-[#3c77f6] rounded-full px-2 py-0.5">{job.newCount} New</span>}
          <Button variant={closed ? 'secondary' : 'primary'} onClick={onView}>
            View applications
          </Button>
        </div>
      </div>
      {closed && <p className="text-[14px] text-[#5a6172] -mt-2">Applications are closed. You can still review applicants and unlock reports.</p>}
    </Card>
  );
}

export function EmployerApplicationsView() {
  const { go } = useEmployerStore();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<JobListSort>('RECENTLY_UPDATED');
  const [page, setPage] = useState(0);
  const [list, setList] = useState<ApplicationsJobList | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Search runs on the server, 300ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    listApplicationsJobs({ q: query, status: FILTER[filter], sort, page })
      .then((l) => !cancelled && setList(l))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [query, filter, sort, page, attempt]);

  const counts = list?.counts;
  const items = list?.items ?? [];
  const groups: [string, ApplicationsJob[]][] = [
    ['Active jobs', items.filter((j) => j.status !== 'CLOSED')],
    ['Closed jobs', items.filter((j) => j.status === 'CLOSED')],
  ];
  const meta = list?.pageMeta;

  return (
    <div className="flex flex-col gap-5 pb-12">
      <PageTitle title="Applications" subtitle="Choose a job to review its applicants, assessment results, and reports." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active jobs" value={counts?.active ?? '—'} />
        <StatCard label="Closed jobs" value={counts?.closed ?? '—'} />
        <StatCard label="Total jobs" value={counts?.total ?? '—'} />
      </div>

      {failed ? (
        <Card className="p-0">
          <EmptyBox title="Couldn't load your jobs" body="Check your connection and try again." actions={<Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>} />
        </Card>
      ) : counts && counts.total === 0 ? (
        <Card className="p-0">
          <EmptyBox
            icon={<Briefcase size={20} />}
            title="No published jobs yet"
            body="Applications appear here once a job is published and candidates start applying."
            actions={
              <Button variant="primary" onClick={() => go({ name: 'wizard' })}>
                Create a job
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 bg-[#f3f4f7] rounded-lg px-3 py-2">
              <Search size={15} className="text-[#5a6172]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title"
                aria-label="Search by job title"
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1e232f] placeholder:text-[#9ba1b0]"
              />
            </div>
            <Tabs
              value={filter}
              onChange={(f) => {
                setFilter(f);
                setPage(0);
              }}
              options={[
                { value: 'all', label: `All jobs ${counts?.total ?? ''}`.trim() },
                { value: 'active', label: `Active ${counts?.active ?? ''}`.trim() },
                { value: 'closed', label: `Closed ${counts?.closed ?? ''}`.trim() },
              ]}
            />
            <Select
              value={SORTS.find((s) => s.value === sort)!.label}
              onChange={(v) => {
                setSort(SORTS.find((s) => s.label === v)?.value ?? 'RECENTLY_UPDATED');
                setPage(0);
              }}
              options={SORTS.map((s) => s.label)}
              className="!w-auto"
            />
          </Card>

          {!list && <p className="text-[14px] text-[#5a6172] text-center py-8">Loading jobs…</p>}
          {list && items.length === 0 && <p className="text-[14px] text-[#5a6172] text-center py-8">No jobs match your search.</p>}

          {groups.map(([label, group]) =>
            group.length === 0 ? null : (
              <div key={label} className="flex flex-col gap-3">
                <p className="text-[14px] text-[#5a6172]">
                  {label} · {group.length}
                </p>
                {group.map((j) => (
                  <JobCard key={j.jobId} job={j} onView={() => go({ name: 'board', jobId: j.jobId })} />
                ))}
              </div>
            ),
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-[14px] text-[#5a6172]">
              <Button size="sm" disabled={meta.first} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span>
                Page {meta.pageNumber + 1} of {meta.totalPages}
              </span>
              <Button size="sm" disabled={meta.last} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
