/**
 * auth_state tagging tests (P1 + P2)
 *
 * P1: every event carries auth_state, attached in one place rather than at the
 *     60-odd capture sites.
 * P2: a dwell event attributes to where the visit STARTED. The 69 zero-second
 *     note_read rows that landed on /auth came from the opposite: the hook
 *     settles on unmount, and unmount is often the bounce to the login page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const { mockHasStoredSession } = vi.hoisted(() => ({ mockHasStoredSession: vi.fn() }));
vi.mock('@/services/api', () => ({ hasStoredSession: mockHasStoredSession }));

import { getAuthState, setAuthState } from '@/utils/authState';
// setup.ts replaces @/utils/posthog with spies for every other suite; P1 lives
// inside safeCapture itself, so this one needs the real thing.
const { safeCapture: realSafeCapture } =
  await vi.importActual<typeof import('@/utils/posthog')>('@/utils/posthog');

describe('getAuthState — before AuthProvider has said anything', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthState(null as never); // back to the un-pushed state
  });

  it('is anonymous when storage holds no session', () => {
    mockHasStoredSession.mockReturnValue(false);
    expect(getAuthState()).toBe('anonymous');
  });

  // A stored token on the first frame is a returning user mid-resolution —
  // calling that "anonymous" is exactly the misread the property exists to stop.
  it('is initializing when a token is stored', () => {
    mockHasStoredSession.mockReturnValue(true);
    expect(getAuthState()).toBe('initializing');
  });
});

describe('safeCapture — P1 tagging', () => {
  const capture = vi.fn();
  const posthog = { capture } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    setAuthState('anonymous');
  });

  it('tags an event that passed no properties at all', () => {
    realSafeCapture(posthog, 'coaching_viewed');
    expect(capture).toHaveBeenCalledWith('coaching_viewed', { auth_state: 'anonymous' });
  });

  it('tags an event alongside its own properties', () => {
    setAuthState('authenticated');
    realSafeCapture(posthog, 'note_read', { note_id: 'n1' });
    expect(capture).toHaveBeenCalledWith('note_read', { auth_state: 'authenticated', note_id: 'n1' });
  });

  // The dwell hook depends on this: it reports the state at mount, which by
  // then is no longer the state at capture time.
  it('lets the caller override the tag', () => {
    setAuthState('anonymous');
    realSafeCapture(posthog, 'note_read', { auth_state: 'authenticated' });
    expect(capture).toHaveBeenCalledWith('note_read', { auth_state: 'authenticated' });
  });

  it('swallows a capture the ad blocker killed', () => {
    const throwing = { capture: () => { throw new Error('blocked'); } } as never;
    expect(() => realSafeCapture(throwing, 'note_read')).not.toThrow();
  });
});

describe('useDwellTracking — P2 attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasStoredSession.mockReturnValue(true);
    window.history.pushState({}, '', '/experience/abc');
  });

  async function mountThenLeave(leaveTo: string) {
    const { safeCapture } = await import('@/utils/posthog'); // the setup.ts spy
    const { useDwellTracking } = await import('@/hooks/useDwellTracking');
    const Probe = () => {
      useDwellTracking('note_read' as never, () => ({ note_id: 'abc' }));
      return null;
    };
    const { unmount } = render(<Probe />);
    // The bounce: the URL and the session both change before the hook settles.
    window.history.pushState({}, '', leaveTo);
    setAuthState('anonymous');
    unmount();
    return vi.mocked(safeCapture).mock.calls.at(-1)!;
  }

  it('attributes to the page the visit started on, not where it ended', async () => {
    setAuthState('authenticated');
    const [, event, props] = await mountThenLeave('/auth');
    expect(event).toBe('note_read');
    expect(props).toMatchObject({
      note_id: 'abc',
      entry_path: '/experience/abc',
      auth_state: 'authenticated',
      auth_state_at_end: 'anonymous',
    });
  });

  it('still reports a duration', async () => {
    setAuthState('authenticated');
    const [, , props] = await mountThenLeave('/auth');
    expect(props).toHaveProperty('duration_seconds');
    expect(typeof props!.duration_seconds).toBe('number');
  });

  it('fires exactly once per visit', async () => {
    const { safeCapture } = await import('@/utils/posthog');
    setAuthState('authenticated');
    await mountThenLeave('/auth');
    expect(vi.mocked(safeCapture).mock.calls.filter(c => c[1] === 'note_read')).toHaveLength(1);
  });
});
