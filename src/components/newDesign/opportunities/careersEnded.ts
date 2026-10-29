import type { CareerApplication } from "@/services/careersApi";

// After POST .../interview/end the backend scores in the background, and until
// it finishes the application still reads IN_PROGRESS with canStartInterview
// = true. The frontend has to hide "Continue interview" itself during that
// window, so the room remembers which interviews this browser ended. Scoring
// takes seconds to a minute; the mark expires after 30 minutes in case a
// result never arrives. Best effort: storage may be blocked.

const KEY = (applicationId: string) => `careerInterviewEnded:${applicationId}`;
const TTL_MS = 30 * 60_000;

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
  try {
    const at = Number(localStorage.getItem(KEY(app.applicationId)) || 0);
    return at > 0 && Date.now() - at < TTL_MS;
  } catch {
    return false;
  }
}
