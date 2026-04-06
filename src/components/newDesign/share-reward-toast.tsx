import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, X } from 'lucide-react';

const SHARE_STORAGE_KEY = 'screna_share_count';
const REWARD_THRESHOLD = 3;
const CREDITS_REWARD = 10;
const AUTO_DISMISS_MS = 5000;

interface ToastState {
  visible: boolean;
  type: 'progress' | 'reward';
  remaining: number;
}

function getShareCount(): number {
  try {
    return parseInt(localStorage.getItem(SHARE_STORAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setShareCount(count: number) {
  try {
    localStorage.setItem(SHARE_STORAGE_KEY, String(count));
  } catch { /* silent */ }
}

/** Call this after a successful share to record + show toast */
export function useShareReward() {
  const [toast, setToast] = useState<ToastState>({ visible: false, type: 'progress', remaining: 0 });

  const dismiss = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // auto-dismiss
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.visible, dismiss]);

  const recordShare = useCallback(() => {
    const current = getShareCount() + 1;

    if (current >= REWARD_THRESHOLD) {
      // Reset cycle, show reward
      setShareCount(0);
      setToast({ visible: true, type: 'reward', remaining: 0 });
    } else {
      setShareCount(current);
      const remaining = REWARD_THRESHOLD - current;
      setToast({ visible: true, type: 'progress', remaining });
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
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed bottom-6 right-6 z-[200] max-w-[340px]"
        >
          {toast.type === 'reward' ? (
            /* ── Reward achieved ── */
            <div className="relative flex items-start gap-3 px-4 py-3.5 bg-white rounded-xl border border-[hsl(221,80%,88%)] shadow-lg shadow-black/6 overflow-hidden">
              {/* Subtle gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(221,91%,96%)]/60 via-transparent to-[hsl(221,91%,97%)]/40 pointer-events-none" />
              <div className="relative shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(221,91%,48%)] flex items-center justify-center shadow-sm shadow-[hsl(221,91%,60%)]/30">
                <Sparkles className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] leading-snug">
                  You earned {CREDITS_REWARD} credits!
                </p>
                <p className="text-[11px] text-[hsl(222,12%,50%)] mt-0.5 leading-relaxed">
                  Thanks for sharing Interview Insights
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
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(221,91%,60%)] to-[hsl(221,91%,72%)] origin-left"
              />
            </div>
          ) : (
            /* ── Progress state ── */
            <div className="relative flex items-start gap-3 px-4 py-3.5 bg-white rounded-xl border border-[hsl(221,80%,88%)] shadow-lg shadow-black/6 overflow-hidden">
              {/* Subtle gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(221,91%,96%)]/60 via-transparent to-[hsl(221,91%,97%)]/40 pointer-events-none" />
              <div className="relative shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(221,91%,48%)] flex items-center justify-center shadow-sm shadow-[hsl(221,91%,60%)]/30">
                <Gift className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] leading-snug">
                  Share {toast.remaining} more {toast.remaining === 1 ? 'time' : 'times'} to earn {CREDITS_REWARD} credits
                </p>
                {/* Mini progress dots */}
                <div className="flex items-center gap-1.5 mt-2">
                  {Array.from({ length: REWARD_THRESHOLD }).map((_, i) => {
                    const filled = i < REWARD_THRESHOLD - toast.remaining;
                    return (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          filled
                            ? 'w-6 bg-[hsl(221,91%,60%)]'
                            : 'w-4 bg-[hsl(220,16%,88%)]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <button onClick={onDismiss} className="relative shrink-0 p-0.5 rounded-md text-[hsl(222,12%,65%)] hover:text-[hsl(222,12%,40%)] hover:bg-[hsl(220,20%,96%)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Auto-dismiss progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(221,91%,60%)] to-[hsl(221,91%,72%)] origin-left"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}