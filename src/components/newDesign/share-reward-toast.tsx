import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';

const CREDITS_REWARD = 5;
const AUTO_DISMISS_MS = 5000;
const DAILY_LIMIT = 3;

const SHARE_COUNT_KEY = 'screna_share_daily_count';
const SHARE_DATE_KEY = 'screna_share_date';

interface ToastState {
  visible: boolean;
  type: 'reward' | 'limit_reached';
}

function getDailyShareCount(): number {
  try {
    const storedDate = localStorage.getItem(SHARE_DATE_KEY);
    const today = new Date().toDateString();
    
    // If it's a new day, reset the count
    if (storedDate !== today) {
      localStorage.setItem(SHARE_DATE_KEY, today);
      localStorage.setItem(SHARE_COUNT_KEY, '0');
      return 0;
    }
    
    return parseInt(localStorage.getItem(SHARE_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementDailyShareCount() {
  try {
    const current = getDailyShareCount();
    localStorage.setItem(SHARE_COUNT_KEY, String(current + 1));
  } catch { /* silent */ }
}

/** Call this after a successful share to record + show toast */
export function useShareReward() {
  const [toast, setToast] = useState<ToastState>({ visible: false, type: 'reward' });

  const dismiss = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // auto-dismiss
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.visible, dismiss]);

  const recordShare = useCallback(() => {
    const count = getDailyShareCount();
    
    if (count >= DAILY_LIMIT) {
      setToast({ visible: true, type: 'limit_reached' });
    } else {
      incrementDailyShareCount();
      setToast({ visible: true, type: 'reward' });
    }
  }, []);

  return { toast, dismiss, recordShare };
}

interface ShareRewardToastProps {
  toast: ToastState;
  onDismiss: () => void;
}

export function ShareRewardToast({ toast, onDismiss }: ShareRewardToastProps) {
  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          initial={{ opacity: 0, x: '-50%', y: '-40%', scale: 0.96 }}
          animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
          exit={{ opacity: 0, x: '-50%', y: '-40%', scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-1/2 left-1/2 z-[200] w-full max-w-[340px]"
        >
          {toast.type === 'reward' ? (
            /* ── Reward achieved ── */
            <div className="relative flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-[hsl(221,80%,88%)] shadow-lg shadow-black/6 overflow-hidden">
              {/* Subtle gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(221,91%,96%)]/60 via-transparent to-[hsl(221,91%,97%)]/40 pointer-events-none" />
              <div className="relative shrink-0 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[hsl(222,22%,15%)] leading-snug">
                  You earned {CREDITS_REWARD} credits!
                </p>
              </div>
              <button onClick={onDismiss} className="relative shrink-0 p-0.5 rounded-md text-[hsl(222,12%,65%)] hover:text-[hsl(222,12%,40%)] hover:bg-[hsl(220,20%,96%)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Auto-dismiss progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 origin-left"
              />
            </div>
          ) : (
            /* ── Daily limit reached ─��� */
            <div className="relative flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-[hsl(220,16%,90%)] shadow-lg shadow-black/6 overflow-hidden">
              <div className="absolute inset-0 bg-[hsl(220,20%,98%)]/50 pointer-events-none" />
              <div className="relative shrink-0 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[hsl(222,12%,45%)]" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[hsl(222,22%,25%)] leading-snug">
                  Daily reward limit reached
                </p>
              </div>
              <button onClick={onDismiss} className="relative shrink-0 p-0.5 rounded-md text-[hsl(222,12%,65%)] hover:text-[hsl(222,12%,40%)] hover:bg-[hsl(220,20%,92%)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Auto-dismiss progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[hsl(220,16%,80%)] origin-left"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}