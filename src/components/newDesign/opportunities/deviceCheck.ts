import { useEffect, useState } from "react";

// Camera / microphone / speaker check shown before a career interview starts
// (after the authorization step, before the start call, so a broken device
// never opens a session or uses an interview).
//
// It tests the browser's DEFAULT devices with the same constraints the room
// (VideoInterview) captures with, because the room has no device picker: a
// selector here would test a device the interview then doesn't use. The test
// stream is stopped on unmount, before the room captures its own.

// Keep in sync with VideoInterview's video-mode constraints.
const CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
};

export type DeviceStatus = "checking" | "ready" | "denied" | "notfound" | "inuse" | "unsupported" | "error";

export const DEVICE_ERROR_TEXT: Record<Exclude<DeviceStatus, "checking" | "ready">, string> = {
  denied: "Camera or microphone access is blocked. Allow access from the icon in your browser's address bar, then try again.",
  notfound: "We couldn't find a camera or microphone. Connect one and try again.",
  inuse: "Your camera or microphone is being used by another app. Close that app and try again.",
  unsupported: "This browser can't use your camera and microphone. Use the latest Chrome, Edge, Safari or Firefox.",
  error: "We couldn't start your camera and microphone. Try again.",
};

function classify(err: unknown): DeviceStatus {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "notfound";
  if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") return "inuse";
  return "error";
}

const stopAll = (s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop());

type AudioCtor = typeof AudioContext;
const audioContextCtor = (): AudioCtor | undefined =>
  typeof window === "undefined" ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;

export function useDeviceCheck() {
  const [status, setStatus] = useState<DeviceStatus>("checking");
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Microphone input level, 0..1.
  const [level, setLevel] = useState(0);
  const [heardVoice, setHeardVoice] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let s: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    setStatus("checking");
    setLevel(0);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus("unsupported");
      try {
        s = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
      } catch (err) {
        if (!cancelled) setStatus(classify(err));
        return;
      }
      if (cancelled) return stopAll(s);
      if (s.getVideoTracks().length === 0 || s.getAudioTracks().length === 0) {
        stopAll(s);
        s = null;
        return setStatus("notfound");
      }
      setStream(s);
      setStatus("ready");

      // Level meter. Optional: without Web Audio the check still passes.
      const AC = audioContextCtor();
      if (!AC) return;
      try {
        ctx = new AC();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        let last = 0;
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) {
            const x = (v - 128) / 128;
            sum += x * x;
          }
          const lvl = Math.min(1, Math.sqrt(sum / buf.length) * 5);
          // Skip tiny changes so the dialog doesn't re-render every frame.
          if (Math.abs(lvl - last) > 0.03) {
            last = lvl;
            setLevel(lvl);
          }
          if (lvl > 0.2) setHeardVoice(true);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* no meter */
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      void ctx?.close().catch(() => {});
      stopAll(s);
      setStream(null);
    };
  }, [attempt]);

  return { status, stream, level, heardVoice, retry: () => setAttempt((a) => a + 1) };
}

// A short two-note chime through the default output, for the speaker check.
export function playTestSound(): boolean {
  const AC = audioContextCtor();
  if (!AC) return false;
  try {
    const ctx = new AC();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t0 + i * 0.35);
      osc.stop(t0 + i * 0.35 + 0.3);
    });
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.03);
    gain.gain.setValueAtTime(0.25, t0 + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    window.setTimeout(() => void ctx.close().catch(() => {}), 1000);
    return true;
  } catch {
    return false;
  }
}
