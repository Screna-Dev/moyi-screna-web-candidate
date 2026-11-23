import { useEffect, useRef, type MutableRefObject } from 'react';
import type { PostHog } from 'posthog-js';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

// mock_abandoned: the candidate left a mock interview before it finished on
// its own.
// - end_button: the End button before cooldown
// - page_closed: closing or refreshing the tab while live (pagehide; sent with
//   sendBeacon so it still arrives as the page goes away)
// - navigated_away: leaving the page inside the app while live (unmount)
// - session_ended: the legacy endMeeting path
// Reported at most once per interview, and never after mock_completed.

export type MockExitReason = 'end_button' | 'page_closed' | 'navigated_away' | 'session_ended';

type Props = Record<string, unknown>;

export function useMockAbandonTracking({
  posthog,
  stage,
  completedRef,
  props,
}: {
  posthog: PostHog | null | undefined;
  stage: string;
  // Set once mock_completed has been sent.
  completedRef: MutableRefObject<boolean>;
  // Sent with the event (interview_id, type, difficulty, mode, source).
  props: Props;
}) {
  const abandonedRef = useRef(false);
  const latest = useRef({ posthog, stage, props });
  latest.current = { posthog, stage, props };

  const report = (exitReason: MockExitReason, beacon = false) => {
    if (abandonedRef.current || completedRef.current) return;
    abandonedRef.current = true;
    const { posthog: ph, stage: s, props: p } = latest.current;
    safeCapture(
      ph,
      EVENTS.MOCK_ABANDONED,
      { ...p, stage_at_exit: s, exit_reason: exitReason },
      beacon ? { transport: 'sendBeacon', send_instantly: true } : undefined,
    );
  };
  const reportRef = useRef(report);
  reportRef.current = report;

  // Closing / refreshing the tab while live.
  useEffect(() => {
    if (stage !== 'live') return;
    const onPageHide = () => reportRef.current('page_closed', true);
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [stage]);

  // Leaving the page inside the app while live.
  useEffect(
    () => () => {
      if (latest.current.stage === 'live') reportRef.current('navigated_away');
    },
    [],
  );

  return { reportAbandoned: report, abandonedRef };
}
