import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, screen, fireEvent, act } from '@testing-library/react';
import type { PostHog } from 'posthog-js';

// mock_abandoned had 0 events in 90 days: the End button counted as completed
// and nothing listened for the page closing. Now: End before cooldown, closing
// the tab (pagehide, sendBeacon) or leaving the page while live each report it
// once, and an abandoned interview is never also "completed".

vi.mock('@/utils/authState', () => ({ getAuthState: () => 'authenticated' }));
// The global setup stubs safeCapture; this test checks what reaches PostHog.
vi.mock('@/utils/posthog', async (orig) => await orig());
vi.mock('@/services/LiveKitService', () => {
  const ok = () => Promise.resolve();
  return { default: { connect: vi.fn(ok), disconnect: vi.fn(ok), updateCallbacks: vi.fn(), publishExistingTracks: vi.fn(ok) } };
});
vi.mock('@/services/IntervewSesstionServices', () => ({ createInterviewSession: vi.fn(() => Promise.resolve({})) }));

import { useMockAbandonTracking } from '@/hooks/useMockAbandonTracking';
import { LiveInterview } from '@/components/newDesign/live-interview';

const ph = () => ({ capture: vi.fn() }) as unknown as PostHog & { capture: ReturnType<typeof vi.fn> };
const PROPS = { interview_id: 'm1', type: 'behavioral', difficulty: 'junior', mode: 'voice', source: 'dashboard' };

function setup(stage: string, completed = false) {
  const posthog = ph();
  const completedRef = { current: completed };
  const hook = renderHook(({ s }) => useMockAbandonTracking({ posthog, stage: s, completedRef, props: PROPS }), { initialProps: { s: stage } });
  return { posthog, hook };
}

beforeEach(() => vi.clearAllMocks());

describe('useMockAbandonTracking', () => {
  it('closing the tab while live sends mock_abandoned with sendBeacon', () => {
    const { posthog } = setup('live');
    window.dispatchEvent(new Event('pagehide'));
    expect(posthog.capture).toHaveBeenCalledTimes(1);
    const [name, props, opts] = posthog.capture.mock.calls[0];
    expect(name).toBe('mock_abandoned');
    expect(props).toMatchObject({ ...PROPS, stage_at_exit: 'live', exit_reason: 'page_closed' });
    expect(opts).toEqual({ transport: 'sendBeacon', send_instantly: true });
  });

  it('is sent once, however many ways the candidate leaves', () => {
    const { posthog, hook } = setup('live');
    act(() => hook.result.current.reportAbandoned('end_button'));
    window.dispatchEvent(new Event('pagehide'));
    hook.unmount();
    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture.mock.calls[0][1]).toMatchObject({ exit_reason: 'end_button' });
    expect(posthog.capture.mock.calls[0][2]).toBeUndefined();
  });

  it('leaving the page inside the app while live reports navigated_away', () => {
    const { posthog, hook } = setup('live');
    hook.unmount();
    expect(posthog.capture.mock.calls[0][1]).toMatchObject({ exit_reason: 'navigated_away' });
  });

  it('nothing before the interview starts or after it finished', () => {
    const before = setup('warmup');
    window.dispatchEvent(new Event('pagehide'));
    before.hook.unmount();
    expect(before.posthog.capture).not.toHaveBeenCalled();

    const after = setup('cooldown');
    window.dispatchEvent(new Event('pagehide'));
    after.hook.unmount();
    expect(after.posthog.capture).not.toHaveBeenCalled();
  });

  it('nothing once mock_completed was sent', () => {
    const { posthog, hook } = setup('live', true);
    window.dispatchEvent(new Event('pagehide'));
    act(() => hook.result.current.reportAbandoned('end_button'));
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe('LiveInterview end reason', () => {
  it('the End button reports user_ended', () => {
    const onEnd = vi.fn();
    render(<LiveInterview config={{ type: 'behavioral', difficulty: 'junior', duration: '20', mode: 'voice', company: '' } as never} onEnd={onEnd} />);
    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    fireEvent.click(screen.getByRole('button', { name: 'End Session' }));
    expect(onEnd).toHaveBeenCalledWith('user_ended');
  });
});
