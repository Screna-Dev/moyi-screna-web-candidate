import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mute / camera off switch the captured tracks off in place. They must not go
// through LiveKit's mute: the server then stops forwarding the mic to the AI
// interviewer, and after unmuting it no longer heard the candidate.

const localParticipant = { setMicrophoneEnabled: vi.fn(), setCameraEnabled: vi.fn() };
vi.mock('@/services/LiveKitService', () => {
  const ok = () => Promise.resolve();
  return {
    default: {
      connect: vi.fn(ok),
      disconnect: vi.fn(ok),
      updateCallbacks: vi.fn(),
      publishExistingTracks: vi.fn(ok),
      getIsConnected: vi.fn(() => false),
      getRoom: vi.fn(() => ({ localParticipant })),
    },
  };
});
vi.mock('@/services/IntervewSesstionServices', () => ({ createInterviewSession: vi.fn(() => new Promise(() => {})) }));

import { VideoInterview } from '@/components/newDesign/video-interview';
import { LiveInterview } from '@/components/newDesign/live-interview';

const track = (kind: 'audio' | 'video') => ({ kind, enabled: true, stop: vi.fn() });
function stream(withVideo: boolean) {
  const audio = track('audio');
  const video = track('video');
  const s = {
    getAudioTracks: () => [audio],
    getVideoTracks: () => (withVideo ? [video] : []),
    getTracks: () => (withVideo ? [audio, video] : [audio]),
  } as unknown as MediaStream;
  return { s, audio, video };
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no media playback; the self-view calls play().
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

describe('VideoInterview mute / camera', () => {
  const config = { type: 'job', difficulty: '', duration: '20', mode: 'video', company: '' };

  it('toggles the mic and camera tracks, never LiveKit mute', async () => {
    const { s, audio, video } = stream(true);
    render(<VideoInterview config={config} interviewId="app-1" onEnd={() => {}} prefetchedStream={s} />);
    await act(async () => {});

    fireEvent.click(screen.getByTitle('Mute'));
    expect(audio.enabled).toBe(false);
    fireEvent.click(screen.getByTitle('Unmute'));
    expect(audio.enabled).toBe(true);

    fireEvent.click(screen.getByTitle('Turn camera off'));
    expect(video.enabled).toBe(false);
    fireEvent.click(screen.getByTitle('Turn camera on'));
    expect(video.enabled).toBe(true);

    expect(localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
    expect(localParticipant.setCameraEnabled).not.toHaveBeenCalled();
  });
});

describe('LiveInterview (voice) mute', () => {
  const config = { type: 'behavioral', difficulty: 'junior', duration: '20', mode: 'voice', company: '' };

  it('toggles the mic track, never LiveKit mute', async () => {
    const { s, audio } = stream(false);
    const { container } = render(
      <LiveInterview config={config as never} interviewId="m-1" onEnd={() => {}} prefetchedStream={s} />,
    );
    await act(async () => {});
    // The mute button is the first control-row button (no label in the design).
    const muteBtn = container.querySelector('button.w-12.h-12') as HTMLButtonElement;
    fireEvent.click(muteBtn);
    expect(audio.enabled).toBe(false);
    fireEvent.click(muteBtn);
    expect(audio.enabled).toBe(true);
    expect(localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
  });
});
