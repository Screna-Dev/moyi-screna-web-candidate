import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { OpportunitiesProvider } from '@/components/newDesign/opportunities/OpportunitiesContext';
import { opportunityJobs } from '@/components/newDesign/opportunities/mockJobs';

// Shared shell for every /opportunities/* route. The provider sits above the
// Outlet so assessment/email status set on one page (job detail, contact
// recruiter) is still there on the next. No API yet — all state is in-memory
// mock and resets on reload.
function headerFor(pathname: string): { title: string; breadcrumb?: { label: string; path: string } } {
  if (pathname === '/opportunities/my-jobs') {
    return { title: 'My Jobs', breadcrumb: { label: 'Opportunities', path: '/opportunities' } };
  }

  const match = pathname.match(/^\/opportunities\/job\/([^/]+)(?:\/(results|contact))?$/);
  if (!match) return { title: 'Opportunities' };

  const [, jobId, sub] = match;
  const job = opportunityJobs.find((j) => j.id === jobId);
  const detailLabel = job ? `${job.title} details` : 'Job details';

  if (!sub) return { title: detailLabel, breadcrumb: { label: 'Opportunities', path: '/opportunities' } };
  return {
    title: sub === 'results' ? 'Assessment results' : 'Contact recruiter',
    breadcrumb: { label: detailLabel, path: `/opportunities/job/${jobId}` },
  };
}

export function OpportunitiesLayout() {
  const { pathname } = useLocation();
  const { title, breadcrumb } = headerFor(pathname);

  return (
    <OpportunitiesProvider>
      <DashboardLayout headerTitle={title} breadcrumb={breadcrumb}>
        {/* Keeps the sidebar/header mounted while the next lazy page loads. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    </OpportunitiesProvider>
  );
}
