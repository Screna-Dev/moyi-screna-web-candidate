import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { checkCareerResult, onResultSettled, pendingResults } from "./careersEnded";

// Checks, from any page, the interviews this browser ended that are still
// being scored, and says so when a result lands. Mounted once in RootLayout.
// Polls GET .../applications/{id} every 5 s for the first 3 minutes, then
// every 20 s until the 30-minute mark expires; nothing runs when none are
// pending. The room and the result page poll their own interview, so the
// watcher leaves that one alone (and doesn't toast it) while it's on screen.

const TICK_MS = 5000;
const FAST_FOR_MS = 3 * 60_000;
const SLOW_MS = 20_000;

const resultPath = (applicationId: string) => `/opportunities/applications/${encodeURIComponent(applicationId)}/results`;

export function CareerResultWatcher() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const onScreen = (applicationId: string) => pathRef.current.includes(`/applications/${encodeURIComponent(applicationId)}/`);

  useEffect(
    () =>
      onResultSettled(({ applicationId, outcome, app }) => {
        if (onScreen(applicationId)) return;
        if (outcome === "ready") {
          toast.success(`Your interview result${app.jobTitle ? ` for ${app.jobTitle}` : ""} is ready`, {
            duration: 10_000,
            action: { label: "View result", onClick: () => navigate(resultPath(applicationId)) },
          });
        } else {
          toast(`Your interview${app.jobTitle ? ` for ${app.jobTitle}` : ""} didn't count`, {
            description: "It didn't really get going, so nothing was used. You can start again from My Jobs.",
            duration: 10_000,
          });
        }
      }),
    // navigate is stable; onScreen reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const nextCheck = new Map<string, number>();
    const inFlight = new Set<string>();
    const tick = () => {
      const now = Date.now();
      for (const { applicationId, endedAt } of pendingResults()) {
        if (onScreen(applicationId) || inFlight.has(applicationId) || now < (nextCheck.get(applicationId) ?? 0)) continue;
        inFlight.add(applicationId);
        nextCheck.set(applicationId, now + (now - endedAt < FAST_FOR_MS ? TICK_MS : SLOW_MS));
        checkCareerResult(applicationId)
          .catch(() => undefined) // try again next time
          .finally(() => inFlight.delete(applicationId));
      }
    };
    tick();
    const timer = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  return null;
}
