import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Briefcase, CircleHelp, LayoutGrid, LogOut, UsersRound } from 'lucide-react';
import { EmployerStoreProvider, useEmployerStore } from '@/components/admin/console/pages/employer/store';
import { SECTION_VIEW, sectionOf, type EmployerSection } from '@/components/admin/console/pages/employer/sections';
import { cx } from '@/components/admin/console/pages/employer/ui';
import { DashboardView } from '@/components/admin/console/pages/employer/views/DashboardView';
import { JobsView } from '@/components/admin/console/pages/employer/views/JobsView';
import { CreateJobWizard } from '@/components/admin/console/pages/employer/views/CreateJobWizard';
import { ApplicationsView } from '@/components/admin/console/pages/employer/views/ApplicationsView';
import { CandidateBoardView } from '@/components/admin/console/pages/employer/views/CandidateBoardView';
import { CandidateReportView } from '@/components/admin/console/pages/employer/views/CandidateReportView';
import { ContactCandidateView } from '@/components/admin/console/pages/employer/views/ContactCandidateView';
import { HiringGuide } from '@/components/admin/console/pages/employer/views/HiringGuide';
import imgLogo from '@/imports/Frame1/2ac62cf8d338510e851fc6fd6ab9ce46a7956ad5.png';
import { clearEmployerSession, getEmployerSession, type EmployerSession } from './employerAuth';

// /employer — the employer-facing app. Same screens and in-memory store as the
// admin console's Hiring section (src/components/admin/console/pages/employer),
// but scoped to the signed-in employer's own company with no company switcher.
// Shell follows Figma 2010:52. Billing & Credits, Notifications, Company
// Profile and Account Settings from the design are left out, as in admin.
// No employer API yet: data resets on reload.

const NAV: { section: EmployerSection; label: string; icon: ReactNode }[] = [
  { section: 'employer-dashboard', label: 'Dashboard', icon: <LayoutGrid size={18} /> },
  { section: 'employer-jobs', label: 'Jobs', icon: <Briefcase size={18} /> },
  { section: 'employer-candidates', label: 'Applications', icon: <UsersRound size={18} /> },
];

const TITLES: Record<EmployerSection, string> = {
  'employer-dashboard': 'Dashboard',
  'employer-jobs': 'Jobs',
  'employer-candidates': 'Applications',
};

function initials(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '—';
}

// Points the shared store at the signed-in employer's company: a seeded mock
// company when the email matches one, otherwise a fresh company created from
// the sign-in profile.
function useBindCompany(session: EmployerSession) {
  const { companies, company, selectCompany, addCompany, updateCompany } = useEmployerStore();
  const bound = useRef(false);

  useEffect(() => {
    if (bound.current) return;
    bound.current = true;
    const match =
      companies.find((c) => c.contact.email.toLowerCase() === session.email) ??
      companies.find((c) => c.website && new URL(c.website).hostname.replace(/^www\./, '') === session.domain) ??
      companies.find((c) => c.name.toLowerCase() === session.companyName.toLowerCase());
    if (match) selectCompany(match.id);
    else addCompany(session.companyName);
  }, [companies, session, selectCompany, addCompany]);

  // A newly created company has no hiring contact yet; fill it from sign-in so
  // the dashboard greeting and email drafts use the employer's details.
  useEffect(() => {
    if (company.name === session.companyName && !company.contact.email) {
      updateCompany({
        website: `https://${session.domain}`,
        contact: { name: session.name, title: session.title, email: session.email, phone: '' },
        authorized: true,
      });
    }
  }, [company, session, updateCompany]);
}

function ViewBody() {
  const { view } = useEmployerStore();
  switch (view.name) {
    case 'dashboard':
      return <DashboardView />;
    case 'jobs':
      return <JobsView />;
    case 'wizard':
      return <CreateJobWizard jobId={view.jobId} />;
    case 'applications':
      return <ApplicationsView />;
    case 'board':
      return <CandidateBoardView jobId={view.jobId} />;
    case 'report':
      return <CandidateReportView jobId={view.jobId} candidateId={view.candidateId} />;
    case 'contact':
      return <ContactCandidateView jobId={view.jobId} candidateId={view.candidateId} />;
  }
}

function AccountMenu({ session, onSignOut }: { session: EmployerSession; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="w-9 h-9 rounded-full bg-[#3c77f6] text-white text-[13px] font-semibold flex items-center justify-center hover:opacity-90"
      >
        {initials(session.name)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-[50] w-[240px] bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.08)] p-1.5">
            <div className="px-3 py-2 border-b border-[#e1e4ea] mb-1">
              <p className="text-[14px] font-semibold text-[#1e232f] truncate">{session.name}</p>
              <p className="text-[12px] text-[#5a6172] truncate">{session.email}</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#dc2626] hover:bg-[#fef2f2] rounded-lg"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Shell({ session }: { session: EmployerSession }) {
  useBindCompany(session);
  const navigate = useNavigate();
  const { view, go, company } = useEmployerStore();
  const [guideOpen, setGuideOpen] = useState(false);
  const active = sectionOf(view);

  const signOut = () => {
    clearEmployerSession();
    navigate('/employer/login', { replace: true });
  };

  return (
    <div className="h-screen flex bg-[#f9fafb] font-['Inter',sans-serif]">
      <aside className="hidden md:flex w-[256px] shrink-0 flex-col bg-white border-r border-[#e5e7eb]">
        <div className="h-[72px] flex items-center gap-2.5 px-6 border-b border-[#e5e7eb]">
          <img src={imgLogo} alt="Screna" className="h-6 w-auto object-contain" />
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#3c77f6] bg-[#eef4ff] rounded-full px-2 py-0.5">Employer</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-6 flex flex-col gap-6">
          <NavGroup label="Hiring">
            {NAV.map((n) => (
              <NavItem key={n.section} icon={n.icon} label={n.label} active={active === n.section} onClick={() => go(SECTION_VIEW[n.section])} />
            ))}
          </NavGroup>
          <NavGroup label="Help">
            <NavItem icon={<CircleHelp size={18} />} label="How hiring works" active={false} onClick={() => setGuideOpen(true)} />
          </NavGroup>
        </nav>
        <div className="m-3 rounded-2xl bg-[rgba(60,119,246,0.08)] p-4 flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.06em] text-[#5a6172]">Company</span>
          <span className="text-[14px] font-semibold text-[#1e232f] truncate">{company.name}</span>
          <span className="text-[12px] text-[#5a6172] truncate">{session.domain}</span>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] shrink-0 bg-white border-b border-[#e5e7eb] flex items-center gap-4 px-4 md:px-8">
          <h1 className="text-[18px] font-semibold text-[#1e232f]">{TITLES[active]}</h1>
          {/* Narrow screens: sidebar collapses into tabs. */}
          <div className="flex md:hidden gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <button
                key={n.section}
                type="button"
                onClick={() => go(SECTION_VIEW[n.section])}
                className={cx('px-2.5 py-1 rounded-lg text-[13px] whitespace-nowrap', active === n.section ? 'bg-[rgba(60,119,246,0.08)] text-[#3c77f6] font-semibold' : 'text-[#5a6172]')}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <AccountMenu session={session} onSignOut={signOut} />
          </div>
        </header>
        {/* The store scrolls <main> to top on navigation. */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-8 py-6 max-w-[1280px] w-full mx-auto">
            <ViewBody />
          </div>
        </main>
      </div>

      <HiringGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onFinish={() => {
          setGuideOpen(false);
          go({ name: 'wizard' });
        }}
      />
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 pb-1 text-[11px] uppercase tracking-[0.06em] text-[#5a6172]">{label}</span>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 px-3 py-2 rounded-[10px] text-[14px] text-left transition-colors',
        active ? 'bg-[rgba(60,119,246,0.08)] text-[#3c77f6] font-semibold' : 'text-[#1e232f] font-medium hover:bg-[#f3f4f7]',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function EmployerApp() {
  const session = getEmployerSession();
  if (!session) return <Navigate to="/employer/login" replace />;
  return (
    <EmployerStoreProvider>
      <Shell session={session} />
    </EmployerStoreProvider>
  );
}
