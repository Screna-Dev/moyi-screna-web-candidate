import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// #318 / card 747: in a careers interview (awaitEnd) the room calls onEnd (the
// server's /interview/end) and leaves LiveKit only after it settles, so the
// bot records user_requested, not client_disconnected. Mock interviews keep
// the old order: leave, then onEnd.

vi.mock('@/services/LiveKitService', () => {
  const ok = () => Promise.resolve();
  return {
    default: {
      connect: vi.fn(ok),
      disconnect: vi.fn(ok),
      updateCallbacks: vi.fn(),
      publishExistingTracks: vi.fn(ok),
      getIsConnected: vi.fn(() => false),
      getRoom: vi.fn(() => null),
    },
  };
});
vi.mock('@/services/IntervewSesstionServices', () => ({ createInterviewSession: vi.fn(() => new Promise(() => {})) }));

import LiveKitService from '@/services/LiveKitService';
import { VideoInterview } from '@/components/newDesign/video-interview';

const disconnect = LiveKitService.disconnect as unknown as ReturnType<typeof vi.fn>;
const config = { type: 'job', difficulty: '', duration: '20', mode: 'video', company: '' };

function clickEnd() {
  fireEvent.click(screen.getByRole('button', { name: /End Interview/ }));
  fireEvent.click(screen.getByRole('button', { name: /End & Generate Feedback/ }));
}

beforeEach(() => vi.clearAllMocks());

describe('VideoInterview end order', () => {
  it('awaitEnd: stays in the room until onEnd settles, button spinning and disabled', async () => {
    let resolveEnd: () => void = () => {};
    const onEnd = vi.fn(() => new Promise<void>((r) => { resolveEnd = r; }));
    render(<VideoInterview config={config} interviewId="app-1" onEnd={onEnd} awaitEnd />);

    clickEnd();
    await act(async () => {});
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
    const btn = screen.getByRole('button', { name: /Ending…/ });
    expect(btn).toBeDisabled();
    // Confirm dialog closed; a second click can't fire onEnd again.
    expect(screen.queryByRole('button', { name: /End & Generate Feedback/ })).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(onEnd).toHaveBeenCalledTimes(1);

    await act(async () => { resolveEnd(); });
    expect(disconnect).toHaveBeenCalledWith({ intentional: true });
  });

  it('awaitEnd: still leaves the room if onEnd rejects', async () => {
    const onEnd = vi.fn(() => Promise.reject(new Error('boom')));
    render(<VideoInterview config={config} interviewId="app-1" onEnd={onEnd} awaitEnd />);
    clickEnd();
    await act(async () => {});
    expect(disconnect).toHaveBeenCalledWith({ intentional: true });
  });

  it('mock (no awaitEnd): leaves the room first, then onEnd, as before', () => {
    const order: string[] = [];
    disconnect.mockImplementationOnce(() => { order.push('disconnect'); return Promise.resolve(); });
    const onEnd = vi.fn(() => { order.push('onEnd'); });
    render(<VideoInterview config={config} interviewId="m-1" onEnd={onEnd} />);
    clickEnd();
    expect(order).toEqual(['disconnect', 'onEnd']);
    expect(screen.getByRole('button', { name: /End Interview/ })).not.toBeDisabled();
  });
});
