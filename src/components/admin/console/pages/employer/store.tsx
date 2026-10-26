import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Candidate, Company, EmployerPlan, EmployerView, HiringDecision, Job } from './types';
import { quoteUnlock, type UnlockQuote } from './planQuote';
import { EMPTY_COMPANY_FIELDS, blankJob, freeStarterPlan, mockCandidates, mockCompanies, mockJobs, mockPlan } from './mockData';

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
  // "Repost" a closed job: a new draft with the same role and interview, but
  // no dates, applicants or candidates. Returns the new job.
  repostJob: (id: string) => Job | undefined;

  candidatesFor: (jobId: string) => Candidate[]; // ranked, highest score first
  getCandidate: (id: string) => Candidate | undefined;
  // Consumes one report unlock from the plan, or bills overage once the
  // allowance is spent. Returns false (and changes nothing) when neither is
  // possible; check unlockQuote first to show why.
  unlockCandidate: (id: string) => boolean;
  unlockQuote: () => UnlockQuote;
  setDecision: (id: string, decision: HiringDecision) => void;
  markContacted: (id: string, contacted: boolean) => void;

  // Employer app only: required company-profile fields still missing (labels),
  // from GET /employer/organization. null = nothing blocks publishing (admin
  // console, or profile complete).
  publishGate: string[] | null;
  setPublishGate: (missing: string[] | null) => void;

  plan: EmployerPlan;
  unlocksLeft: number;
  sponsoredLeft: number;
  setOverageCap: (cap: number) => void;

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
  const [plan, setPlan] = useState<EmployerPlan>(mockPlan);
  const [publishGate, setPublishGate] = useState<string[] | null>(null);

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
      // A brand-new organization starts on the free starter credits.
      setPlan(freeStarterPlan);
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
    repostJob: (id) => {
      const src = allJobs.find((j) => j.id === id);
      if (!src) return undefined;
      const job: Job = {
        ...src,
        id: `j-${Date.now()}`,
        status: 'Draft',
        opensAt: '',
        closesAt: '',
        applicants: 0,
        interviewsCompleted: 0,
        updatedAt: touch(),
        lastEditedLabel: `Reposted from ${src.title}.`,
      };
      setAllJobs((prev) => [...prev, job]);
      return job;
    },

    candidatesFor: (jobId) => candidates.filter((c) => c.jobId === jobId).sort((a, b) => b.score - a.score),
    getCandidate: (id) => candidates.find((c) => c.id === id),
    unlockCandidate: (id) => {
      const c = candidates.find((x) => x.id === id);
      if (!c) return false;
      if (c.unlocked) return true;
      const quote = quoteUnlock(plan);
      if (quote.kind === 'blocked') return false;
      setPlan((p) =>
        quote.kind === 'included'
          ? { ...p, unlocksUsed: p.unlocksUsed + 1 }
          : { ...p, unlocksUsed: p.unlocksUsed + 1, overageThisMonth: p.overageThisMonth + quote.price },
      );
      setCandidates((prev) => prev.map((x) => (x.id === id ? { ...x, unlocked: true } : x)));
      return true;
    },
    unlockQuote: () => quoteUnlock(plan),
    setDecision: (id, decision) => setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, decision } : c))),
    markContacted: (id, contacted) =>
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, contact: contacted ? 'contacted' : 'not_contacted' } : c))),

    publishGate,
    setPublishGate,

    plan,
    unlocksLeft: Math.max(0, plan.unlockAllowance - plan.unlocksUsed),
    sponsoredLeft: Math.max(0, plan.sponsoredAllowance - plan.sponsoredUsed),
    setOverageCap: (cap) => setPlan((p) => ({ ...p, overageCap: Math.max(0, cap) })),

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
