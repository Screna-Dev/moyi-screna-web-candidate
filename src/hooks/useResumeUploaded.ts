import { useEffect, useRef } from 'react';

/**
 * Cross-component signal for "a resume was just saved server-side".
 *
 * The global resume prompt (ResumePromptModal) can upload from on top of any
 * page, so pages that already fetched `GET /profile/resume` on mount would keep
 * showing stale "no resume yet" state until the next navigation. They subscribe
 * to this instead of polling.
 */
export const RESUME_UPLOADED_EVENT = 'screna-resume-uploaded';

export function emitResumeUploaded() {
  window.dispatchEvent(new CustomEvent(RESUME_UPLOADED_EVENT));
}

/**
 * Run `onUploaded` whenever a resume is saved elsewhere in the app. The
 * callback is kept in a ref so callers can pass an inline closure without
 * re-subscribing on every render.
 */
export function useResumeUploaded(onUploaded: () => void) {
  const handlerRef = useRef(onUploaded);
  handlerRef.current = onUploaded;

  useEffect(() => {
    const listener = () => handlerRef.current();
    window.addEventListener(RESUME_UPLOADED_EVENT, listener);
    return () => window.removeEventListener(RESUME_UPLOADED_EVENT, listener);
  }, []);
}
