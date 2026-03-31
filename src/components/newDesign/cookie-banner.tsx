import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const STORAGE_KEY = 'cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white border border-[hsl(222,15%,88%)] rounded-2xl shadow-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-[hsl(222,12%,40%)] leading-relaxed">
          We use cookies to improve your experience on our site. By continuing, you agree to our{' '}
          <a
            href="/cookies"
            className="text-[hsl(221,91%,60%)] hover:underline font-medium"
          >
            Cookies Policy
          </a>
          .
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="text-[hsl(222,12%,45%)] border-[hsl(222,15%,85%)] hover:bg-[hsl(222,15%,97%)]"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,55%)] text-white"
          >
            Accept
          </Button>
          <button
            onClick={handleDecline}
            className="ml-1 text-[hsl(222,12%,60%)] hover:text-[hsl(222,12%,30%)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
