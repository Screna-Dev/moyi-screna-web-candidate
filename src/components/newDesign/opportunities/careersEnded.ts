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
//
// Retakes (backend answer 11-10): the application reads IN_PROGRESS while a
// retake runs and while it's scored, like a first interview. A retake that
// ends without a result (AI failure, timeout, no-show) goes back to COMPLETED
// with completedAttempts unchanged and the previous result still in place. So
// the mark also keeps completedAttempts from before the attempt: COMPLETED
// with the same count is "void", not "ready".

const PREFIX = "careerInterviewEnded:";
const KEY = (applicationId: string) => `${PREFIX}${applicationId}`;
const TTL_MS = 30 * 60_000;

export const RESULT_SETTLED_EVENT = "career-result-settled";
// ready: scored (COMPLETED with a new attempt counted). void: the attempt
// didn't count — a first interview back to NOT_STARTED, or a retake back to
// COMPLETED with completedAttempts unchanged (the previous result stands).
export type ResultOutcome = "ready" | "void";
export type ResultSettled = { applicationId: string; outcome: ResultOutcome; app: CareerApplication };

// Stored as {at, attempts}; a bare number is a mark from before retakes were
// tracked (attempts unknown).
type Mark = { at: number; attempts: number | null };

function readMark(applicationId: string): Mark {
  try {
    const raw = localStorage.getItem(KEY(applicationId));
    if (!raw) return { at: 0, attempts: null };
    const v = JSON.parse(raw);
    if (typeof v === "number") return { at: v, attempts: null };
    return { at: Number(v?.at) || 0, attempts: typeof v?.attempts === "number" ? v.attempts : null };
  } catch {
    return { at: 0, attempts: null };
  }
}

const endedAt = (applicationId: string) => readMark(applicationId).at;

// attemptsBefore: the application's completedAttempts before this attempt
// started (0 or undefined for a first interview).
export function markInterviewEnded(applicationId: string, attemptsBefore?: number | null) {
  try {
    const mark: Mark = { at: Date.now(), attempts: attemptsBefore ?? null };
    localStorage.setItem(KEY(applicationId), JSON.stringify(mark));
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
  const mark = readMark(app.applicationId);
  let outcome: ResultOutcome | null = null;
  if (app.interviewStatus === "NOT_STARTED") outcome = "void";
  else if (app.interviewStatus === "COMPLETED") {
    // A retake that ended without a result: the count didn't go up.
    const noNewAttempt = mark.at > 0 && mark.attempts != null && mark.attempts > 0 && app.completedAttempts != null && app.completedAttempts <= mark.attempts;
    outcome = noNewAttempt ? "void" : "ready";
  }
  if (!outcome) return null;
  const wasPending = mark.at > 0;
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

// What to say when an attempt didn't count.
export function voidMessage(app: Pick<CareerApplication, "interviewStatus">) {
  return app.interviewStatus === "COMPLETED"
    ? "This retake ended without a new result, so your previous result still stands. You can try again from My Jobs if retakes are still open."
    : "This attempt didn't count — the interview didn't really get going. Nothing was used, and you can start again from My Jobs.";
}
