import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Briefcase, Plus, Search } from 'lucide-react';
import { useEmployerStore } from '../store';
import type { Job, JobStatus } from '../types';
import { Button, Card, Dialog, EmptyBox, PageTitle, Tabs } from '../ui';
import { JobsTable } from './DashboardView';

// No dedicated Figma frame — a full-page version of the dashboard's
// "My Jobs" table, with search, status filters and a close action.

type Filter = 'all' | JobStatus;
const ORDER: JobStatus[] = ['Open', 'Scheduled', 'Draft', 'Closed'];

export function JobsView() {
  const { jobs, go, closeJob } = useEmployerStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [closing, setClosing] = useState<Job | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length };
    for (const s of ORDER) c[s] = jobs.filter((j) => j.status === s).length;
    return c;
  }, [jobs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => filter === 'all' || j.status === filter)
      .filter((j) => !q || j.title.toLowerCase().includes(q) || j.location.toLowerCase().includes(q))
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.updatedAt.localeCompare(a.updatedAt));
  }, [jobs, filter, search]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <PageTitle
        title="Jobs"
        subtitle="Create, edit and publish roles, then follow each one through to hiring decisions."
        right={
          <Button variant="primary" onClick={() => go({ name: 'wizard' })}>
            <Plus size={15} /> Post a job
          </Button>
        }
      />

      {jobs.length === 0 ? (
        <Card>
          <EmptyBox
            icon={<Briefcase size={20} />}
            title="No jobs yet"
            body="Create the first job to start receiving candidates."
            actions={
              <Button variant="primary" onClick={() => go({ name: 'wizard' })}>
                <Plus size={15} /> Create your first job
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="p-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-[#f3f4f7] rounded-lg px-3 py-2 flex-1 min-w-[240px]">
              <Search size={15} className="text-[#5a6172]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job title or location"
                className="flex-1 bg-transparent outline-none text-[14px] text-[#1e232f] placeholder:text-[#9ba1b0]"
              />
            </div>
            <Tabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All jobs ${counts.all}` },
                ...ORDER.map((s) => ({ value: s, label: `${s} ${counts[s]}` })),
              ]}
            />
          </Card>

          <Card className="p-5">
            {visible.length === 0 ? (
              <p className="text-center text-[14px] text-[#5a6172] py-10">No jobs match this filter.</p>
            ) : (
              <JobsTable
                jobs={visible}
                rowExtra={(job) =>
                  job.status === 'Open' ? (
                    <button type="button" onClick={() => setClosing(job)} className="text-[13px] text-[#5a6172] hover:text-[#dc2626]">
                      Close
                    </button>
                  ) : null
                }
              />
            )}
          </Card>
        </>
      )}

      <Dialog
        open={!!closing}
        onClose={() => setClosing(null)}
        title={`Close ${closing?.title}?`}
        icon={<AlertTriangle size={20} className="text-[#d98c00] mt-0.5" />}
        actions={
          <>
            <Button onClick={() => setClosing(null)}>Keep open</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (closing) {
                  closeJob(closing.id);
                  toast.success(`${closing.title} closed`);
                }
                setClosing(null);
              }}
            >
              Close job
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">
          New candidates will no longer be able to apply. Existing candidates, reports and decisions stay available on the candidate board.
        </p>
      </Dialog>
    </div>
  );
}
