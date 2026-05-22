import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { connectCalendar } from '../services/MentorService';

export default function MentorCalendarCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code  = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error || !code || !state) {
      const msg = error ? decodeURIComponent(error) : 'Missing authorization parameters.';
      setErrorMsg(msg);
      setStatus('error');
      window.opener?.postMessage({ type: 'MENTOR_CALENDAR_ERROR', message: msg }, window.location.origin);
      return;
    }

    const redirectUri = `${window.location.origin}/mentor/calendar/callback`;

    connectCalendar({ code, redirectUri, state })
      .then(() => {
        setStatus('success');
        window.opener?.postMessage({ type: 'MENTOR_CALENDAR_CONNECTED' }, window.location.origin);
        setTimeout(() => window.close(), 1500);
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Failed to connect Google Calendar. Please try again.';
        setErrorMsg(msg);
        setStatus('error');
        window.opener?.postMessage({ type: 'MENTOR_CALENDAR_ERROR', message: msg }, window.location.origin);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-foreground font-medium">Connecting your Google Calendar…</p>
            <p className="text-muted-foreground text-sm mt-1">Please wait, this will close automatically.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 mx-auto mb-4 text-primary" />
            <p className="text-foreground font-medium">Calendar connected!</p>
            <p className="text-muted-foreground text-sm mt-1">You can close this window.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto mb-4 text-destructive" />
            <p className="text-foreground font-medium">Connection failed</p>
            <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
