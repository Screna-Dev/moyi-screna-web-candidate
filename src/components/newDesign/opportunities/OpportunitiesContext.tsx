import { createContext, useContext, useState, type ReactNode } from "react";

type InterviewStatus = "not_started" | "completed";
type EmailStatus = "not_send" | "sent";

interface OpportunitiesContextValue {
  interviewStatus: Record<string, InterviewStatus>;
  emailStatus: Record<string, EmailStatus>;
  setInterviewCompleted: (jobId: string) => void;
  setEmailSent: (jobId: string) => void;
  setEmailUnsent: (jobId: string) => void;
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);

export function OpportunitiesProvider({ children }: { children: ReactNode }) {
  const [interviewStatus, setInterviewStatus] = useState<Record<string, InterviewStatus>>({});
  const [emailStatus, setEmailStatus] = useState<Record<string, EmailStatus>>({});

  function setInterviewCompleted(jobId: string) {
    setInterviewStatus((prev) => ({ ...prev, [jobId]: "completed" }));
  }

  function setEmailSent(jobId: string) {
    setEmailStatus((prev) => ({ ...prev, [jobId]: "sent" }));
  }

  function setEmailUnsent(jobId: string) {
    setEmailStatus((prev) => ({ ...prev, [jobId]: "not_send" }));
  }

  return (
    <OpportunitiesContext.Provider value={{ interviewStatus, emailStatus, setInterviewCompleted, setEmailSent, setEmailUnsent }}>
      {children}
    </OpportunitiesContext.Provider>
  );
}

export function useOpportunities() {
  const ctx = useContext(OpportunitiesContext);
  if (!ctx) throw new Error("useOpportunities must be used within OpportunitiesProvider");
  return ctx;
}
