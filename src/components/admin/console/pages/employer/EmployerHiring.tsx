import { useState } from 'react';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { useEmployerStore } from './store';
import { Button, Dialog, Field, TextInput } from './ui';
import { DashboardView } from './views/DashboardView';
import { JobsView } from './views/JobsView';
import { CreateJobWizard } from './views/CreateJobWizard';
import { ApplicationsView } from './views/ApplicationsView';
import { CandidateBoardView } from './views/CandidateBoardView';
import { CandidateReportView } from './views/CandidateReportView';
import { ContactCandidateView } from './views/ContactCandidateView';

// Admin console → Hiring (Hiring Dashboard / Jobs / Candidates in the admin
// sidebar). The employer product is not public yet, so Screna admins run it for
// each employer: pick the company here, then work its dashboard, jobs and
// candidates exactly as the employer would.
// Billing & credits and the company-profile step from the employer design
// are intentionally left out — the admin sets the employer up directly.
// EmployerStoreProvider is mounted in AdminConsole so the sidebar can follow
// in-page navigation.

function CompanySwitcher() {
  const { companies, company, selectCompany, addCompany } = useEmployerStore();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 bg-white border border-[#e1e4ea] rounded-xl pl-2 pr-3 py-1.5 hover:bg-[#f9fafb]"
      >
        <span className="w-7 h-7 rounded-lg bg-[#eef4ff] text-[#3c77f6] text-[11px] font-bold flex items-center justify-center">{company.initials}</span>
        <span className="flex flex-col items-start leading-4">
          <span className="text-[10px] uppercase tracking-[0.06em] text-[#5a6172]">Acting as employer</span>
          <span className="text-[14px] font-semibold text-[#1e232f]">{company.name}</span>
        </span>
        <ChevronDown size={15} className="text-[#5a6172] ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-[50] w-[280px] bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_8px_24px_rgba(0,0,0,0.08)] py-1">
            {companies.map((c) => {
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    selectCompany(c.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#f3f4f7] text-left"
                >
                  <span className="w-7 h-7 rounded-lg bg-[#f3f4f7] text-[#1e232f] text-[11px] font-bold flex items-center justify-center">{c.initials}</span>
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-[#1e232f] truncate">{c.name}</span>
                  {c.id === company.id && <Check size={14} className="text-[#3c77f6]" />}
                </button>
              );
            })}
            <div className="h-px bg-[#e1e4ea] my-1" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAdding(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#3c77f6] hover:bg-[#f3f4f7]"
            >
              <Plus size={14} /> Add employer
            </button>
          </div>
        </>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add employer"
        icon={<Building2 size={20} className="text-[#3c77f6] mt-0.5" />}
        actions={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!newName.trim()}
              onClick={() => {
                addCompany(newName.trim());
                setNewName('');
                setAdding(false);
              }}
            >
              Add employer
            </Button>
          </>
        }
      >
        <Field label="Company name" required>
          <TextInput autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Lumen Metrics" />
        </Field>
      </Dialog>
    </div>
  );
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
    case 'plan':
    case 'profile':
      // Billing and the API-backed company profile are employer-only
      // (/employer); admins never navigate here.
      return <DashboardView />;
  }
}

export function EmployerHiring() {
  return (
    <div className="flex flex-col min-h-full bg-[#f9fafb]">
      <div className="sticky top-0 z-[30] bg-white border-b border-[#e5e7eb] px-6 py-2.5 flex items-center gap-6">
        <CompanySwitcher />
        <span className="ml-auto text-[11px] text-[#9ba1b0]">Preview data · no employer API yet</span>
      </div>
      <div className="flex-1 px-8 py-6 max-w-[1280px] w-full mx-auto">
        <ViewBody />
      </div>
    </div>
  );
}

