import { createContext, useContext } from 'react';
import type { Organization } from './employerApi';

// The signed-in employer's organization, loaded once by EmployerApp from
// GET /employer/organization. 'missing' = 404 ORGANIZATION_NOT_FOUND.
export type OrgState = {
  org: Organization | null;
  status: 'loading' | 'ready' | 'missing' | 'error';
  setOrg: (org: Organization) => void;
  reload: () => void;
};

export const OrgContext = createContext<OrgState | null>(null);

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within EmployerApp');
  return ctx;
}
