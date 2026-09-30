import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Candidate, Company, EmployerView, HiringDecision, Job } from './types';
import { EMPTY_COMPANY_FIELDS, blankJob, mockCandidates, mockCompanies, mockJobs } from './mockData';

// In-memory state for the Employers admin section. No API yet — edits last
// until the admin console is reloaded. When endpoints land, swap the setters
// below for service calls and keep the same action names so views don't change.

type EmployerStore = {
  companies: Company[];
  company: Company;
  selectCompany: (id: string) => void;
  addCompany: (name: string) => void;
  updateCompany: (patch: Partial<Company>) => void;

  jobs: Job[]; // jobs for the selected company
  getJob: (id: string) => Job | undefined;
  createDraftJob: () => Job;
  saveJob: (job: Job) => void;
  // Scheduled when the application window opens in the future, else Open.
  publishJob: (id: string, status?: 'Open' | 'Scheduled') => void;
  deleteJob: (id: string) => void;
  closeJob: (id: string) => void;

  candidatesFor: (jobId: string) => Candidate[]; // ranked, highest score first
  getCandidate: (id: string) => Candidate | undefined;
  unlockCandidate: (id: string) => void;
  setDecision: (id: string, decision: HiringDecision) => void;
  markContacted: (id: string, contacted: boolean) => void;

  view: EmployerView;
  go: (view: EmployerView) => void;
};

const Ctx = createContext<EmployerStore | null>(null);

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '—';
}

export function EmployerStoreProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [companyId, setCompanyId] = useState(mockCompanies[0].id);
  const [allJobs, setAllJobs] = useState<Job[]>(mockJobs);
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [view, setView] = useState<EmployerView>({ name: 'dashboard' });

  const company = companies.find((c) => c.id === companyId) ?? companies[0];
  const jobs = useMemo(() => allJobs.filter((j) => j.companyId === company.id), [allJobs, company.id]);

  const go = useCallback((v: EmployerView) => {
    setView(v);
    // The admin <main> is the scroll container, not window.
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, []);

  const touch = () => new Date().toISOString().slice(0, 10);

  const value: EmployerStore = {
    companies,
    company,
    selectCompany: (id) => {
      setCompanyId(id);
      go({ name: 'dashboard' });
    },
    addCompany: (name) => {
      const id = `c-${Date.now()}`;
      setCompanies((prev) => [
        ...prev,
        { ...EMPTY_COMPANY_FIELDS, id, name, initials: initialsOf(name) },
      ]);
      setCompanyId(id);
      go({ name: 'dashboard' });
    },
    updateCompany: (patch) =>
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, ...patch, initials: patch.name ? initialsOf(patch.name) : c.initials } : c)),
      ),

    jobs,
    getJob: (id) => allJobs.find((j) => j.id === id),
    createDraftJob: () => {
      const job = blankJob(company.id, `j-${Date.now()}`);
      setAllJobs((prev) => [...prev, job]);
      return job;
    },
    saveJob: (job) => setAllJobs((prev) => prev.map((j) => (j.id === job.id ? { ...job, updatedAt: touch(), lastEditedLabel: 'Last edited just now.' } : j))),
    publishJob: (id, status = 'Open') => setAllJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status, updatedAt: touch() } : j))),
    deleteJob: (id) => setAllJobs((prev) => prev.filter((j) => j.id !== id)),
    closeJob: (id) => setAllJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'Closed', updatedAt: touch() } : j))),

    candidatesFor: (jobId) => candidates.filter((c) => c.jobId === jobId).sort((a, b) => b.score - a.score),
    getCandidate: (id) => candidates.find((c) => c.id === id),
    unlockCandidate: (id) => setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, unlocked: true } : c))),
    setDecision: (id, decision) => setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, decision } : c))),
    markContacted: (id, contacted) =>
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, contact: contacted ? 'contacted' : 'not_contacted' } : c))),

    view,
    go,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEmployerStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEmployerStore must be used within EmployerStoreProvider');
  return ctx;
}
