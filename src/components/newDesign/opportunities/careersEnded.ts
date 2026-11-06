import { getMyApplication, type CareerApplication } from "@/services/careersApi";

// After POST .../interview/end the backend scores in the background, and until
// it finishes the application still reads IN_PROGRESS with canStartInterview
// = true. The frontend has to hide "Continue interview" itself during that
// window, so the room remembers which interviews this browser ended. Scoring
// takes seconds to a minute; the mark expires after 30 minutes in case a
// result never arrives. Best effort: storage may be blocked.
//
// The candidate doesn't wait for it: the room releases them at once, and
// CareerResultWatcher keeps checking the marked applications from any page.
// Whoever sees the outcome first (the watcher, the room, My Jobs, the result
// page) clears the mark and fires RESULT_SETTLED_EVENT, once per interview.

const PREFIX = "careerInterviewEnded:";
const KEY = (applicationId: string) => `${PREFIX}${applicationId}`;
const TTL_MS = 30 * 60_000;

export const RESULT_SETTLED_EVENT = "career-result-settled";
// ready: scored (COMPLETED). void: the attempt didn't count (back to
// NOT_STARTED: dropped or never really started) and anything held was returned.
export type ResultOutcome = "ready" | "void";
export type ResultSettled = { applicationId: string; outcome: ResultOutcome; app: CareerApplication };

function endedAt(applicationId: string): number {
  try {
    return Number(localStorage.getItem(KEY(applicationId)) || 0);
  } catch {
    return 0;
  }
}

export function markInterviewEnded(applicationId: string) {
  try {
    localStorage.setItem(KEY(applicationId), String(Date.now()));
  } catch {
    /* storage blocked */
  }
}

export function clearInterviewEnded(applicationId: string) {
  try {
    localStorage.removeItem(KEY(applicationId));
  } catch {
    /* storage blocked */
  }
}

// Ended here and still being scored: don't offer to continue it.
export function isBeingScored(app: Pick<CareerApplication, "applicationId" | "interviewStatus">): boolean {
  if (app.interviewStatus !== "IN_PROGRESS") return false;
  const at = endedAt(app.applicationId);
  return at > 0 && Date.now() - at < TTL_MS;
}

// Interviews this browser ended that are still waiting for a result, with when
// they ended. Expired marks are dropped.
export function pendingResults(): { applicationId: string; endedAt: number }[] {
  const out: { applicationId: string; endedAt: number }[] = [];
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const applicationId = key.slice(PREFIX.length);
      const at = endedAt(applicationId);
      if (at > 0 && Date.now() - at < TTL_MS) out.push({ applicationId, endedAt: at });
      else localStorage.removeItem(key);
    }
  } catch {
    /* storage blocked */
  }
  return out;
}

// Settles the interview if `app` shows an outcome: clears the mark and, if it
// was still set, announces it. Returns the outcome, or null while scoring.
export function settleIfDone(app: CareerApplication): ResultOutcome | null {
  const outcome: ResultOutcome | null =
    app.interviewStatus === "COMPLETED" ? "ready" : app.interviewStatus === "NOT_STARTED" ? "void" : null;
  if (!outcome) return null;
  const wasPending = endedAt(app.applicationId) > 0;
  clearInterviewEnded(app.applicationId);
  if (wasPending) {
    const detail: ResultSettled = { applicationId: app.applicationId, outcome, app };
    window.dispatchEvent(new CustomEvent(RESULT_SETTLED_EVENT, { detail }));
  }
  return outcome;
}

// One check of GET .../applications/{id}. Throws on a network error.
export async function checkCareerResult(applicationId: string): Promise<{ outcome: ResultOutcome | null; app: CareerApplication }> {
  const app = await getMyApplication(applicationId);
  return { outcome: settleIfDone(app), app };
}

export function onResultSettled(handler: (e: ResultSettled) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<ResultSettled>).detail);
  window.addEventListener(RESULT_SETTLED_EVENT, listener);
  return () => window.removeEventListener(RESULT_SETTLED_EVENT, listener);
}
