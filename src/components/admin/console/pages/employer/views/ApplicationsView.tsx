import { useMemo, useState } from 'react';
import { Archive, Calendar, Search, Briefcase } from 'lucide-react';
import { useEmployerStore } from '../store';
import type { Job } from '../types';
import { Button, Card, EmptyBox, PageTitle, Select, StatCard, Tabs, cx } from '../ui';

type Filter = 'all' | 'active' | 'closed';
type Sort = 'Recently updated' | 'Most applicants';

function JobCard({ job, unlocked, onView }: { job: Job; unlocked: number; onView: () => void }) {
  const closed = job.status === 'Closed';
  return (
    <Card className={cx('p-5 flex flex-col gap-4', closed && 'bg-[#f9fafb]')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[18px] font-semibold text-[#1e232f]">{job.title}</p>
          <p className="text-[14px] text-[#5a6172]">
            {job.location} · {job.workplace}
          </p>
          <p className="flex items-center gap-1.5 text-[14px] text-[#5a6172]">
            <Calendar size={14} />
            {closed ? 'Closed' : 'Applications close'}: {job.closesAt || 'Not set'}
          </p>
        </div>
        {closed ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f3f4f7] text-[#5a6172] text-[13px] font-medium">
            <Archive size={13} /> Closed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#e8f7ee] text-[#15a560] text-[13px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15a560]" /> Active
          </span>
        )}
      </div>
      <div className="h-px bg-[#e1e4ea]" />
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-14">
          {[
            [job.applicants, 'Applications'],
            [job.interviewsCompleted, 'Interviews completed'],
            [unlocked, 'Reports unlocked'],
          ].map(([v, l]) => (
            <div key={l as string} className="flex flex-col">
              <span className="text-[26px] font-semibold text-[#1e232f] leading-8">{v}</span>
              <span className="text-[14px] text-[#5a6172]">{l}</span>
            </div>
          ))}
        </div>
        <Button variant={closed ? 'secondary' : 'primary'} onClick={onView}>
          View applications
        </Button>
      </div>
      {closed && <p className="text-[14px] text-[#5a6172] -mt-2">Applications are closed. You can still review applicants and unlock reports.</p>}
    </Card>
  );
}

export function ApplicationsView() {
  const { jobs, candidatesFor, go } = useEmployerStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('Recently updated');

  const published = jobs.filter((j) => j.status === 'Open' || j.status === 'Closed');
  const active = published.filter((j) => j.status === 'Open');
  const closed = published.filter((j) => j.status === 'Closed');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = published.filter((j) => !q || j.title.toLowerCase().includes(q));
    if (filter === 'active') list = list.filter((j) => j.status === 'Open');
    if (filter === 'closed') list = list.filter((j) => j.status === 'Closed');
    return [...list].sort((a, b) => (sort === 'Most applicants' ? b.applicants - a.applicants : b.updatedAt.localeCompare(a.updatedAt)));
  }, [published, search, filter, sort]);

  const unlockedCount = (id: string) => candidatesFor(id).filter((c) => c.unlocked).length;
  const groups: [string, Job[]][] = [
    ['Active jobs', visible.filter((j) => j.status === 'Open')],
    ['Closed jobs', visible.filter((j) => j.status === 'Closed')],
  ];

  return (
    <div className="flex flex-col gap-5 pb-12">
      <PageTitle title="Applications" subtitle="Choose a job to review its applicants, assessment results, and reports." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active jobs" value={active.length} />
        <StatCard label="Closed jobs" value={closed.length} />
        <StatCard label="Total jobs" value={published.length} />
      </div>

      {published.length === 0 ? (
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
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1e232f] placeholder:text-[#9ba1b0]"
              />
            </div>
            <Tabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All jobs ${published.length}` },
                { value: 'active', label: `Active ${active.length}` },
                { value: 'closed', label: `Closed ${closed.length}` },
              ]}
            />
            <Select value={sort} onChange={(v) => setSort(v as Sort)} options={['Recently updated', 'Most applicants']} className="!w-auto" />
          </Card>

          {visible.length === 0 && <p className="text-[14px] text-[#5a6172] text-center py-8">No jobs match your search.</p>}

          {groups.map(([label, list]) =>
            list.length === 0 ? null : (
              <div key={label} className="flex flex-col gap-3">
                <p className="text-[14px] text-[#5a6172]">
                  {label} · {list.length}
                </p>
                {list.map((j) => (
                  <JobCard key={j.id} job={j} unlocked={unlockedCount(j.id)} onView={() => go({ name: 'board', jobId: j.id })} />
                ))}
              </div>
            ),
          )}
        </>
      )}
    </div>
  );
}
