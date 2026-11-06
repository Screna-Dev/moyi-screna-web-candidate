import { createContext, useContext, useState, type ReactNode } from "react";

type EmailStatus = "not_send" | "sent";

interface OpportunitiesContextValue {
  emailStatus: Record<string, EmailStatus>;
  setEmailSent: (jobId: string) => void;
  setEmailUnsent: (jobId: string) => void;
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);

export function OpportunitiesProvider({ children }: { children: ReactNode }) {
  const [emailStatus, setEmailStatus] = useState<Record<string, EmailStatus>>({});

  function setEmailSent(jobId: string) {
    setEmailStatus((prev) => ({ ...prev, [jobId]: "sent" }));
  }

  function setEmailUnsent(jobId: string) {
    setEmailStatus((prev) => ({ ...prev, [jobId]: "not_send" }));
  }

  return (
    <OpportunitiesContext.Provider value={{ emailStatus, setEmailSent, setEmailUnsent }}>
      {children}
    </OpportunitiesContext.Provider>
  );
}

export function useOpportunities() {
  const ctx = useContext(OpportunitiesContext);
  if (!ctx) throw new Error("useOpportunities must be used within OpportunitiesProvider");
  return ctx;
}
