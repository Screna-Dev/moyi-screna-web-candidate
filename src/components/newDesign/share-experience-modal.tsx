import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gift, Sparkles, MessageSquareHeart } from 'lucide-react';
import { Link } from 'react-router';

interface ShareExperienceModalProps {
  delayMs?: number;
}

export function ShareExperienceModal({ delayMs = 5000 }: ShareExperienceModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setVisible(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto relative w-full max-w-[440px] mx-4 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-[hsl(220,16%,90%)] overflow-hidden">

              {/* Close button */}
              <button
                onClick={() => setVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[hsl(222,12%,55%)] hover:bg-[hsl(220,20%,97%)] hover:text-[hsl(222,22%,15%)] transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Top decorative gradient strip */}
              

              {/* Content */}
              <div className="px-8 pt-8 pb-7 text-center">

                {/* Icon cluster */}
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(221,91%,60%)] flex items-center justify-center shadow-lg shadow-[hsl(221,91%,60%)]/25">
                    <MessageSquareHeart className="w-7 h-7 text-white" />
                  </div>
                  {/* Floating sparkle */}
                  <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-md shadow-amber-400/30">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-[hsl(222,22%,15%)] mb-2 tracking-tight">
                  Share Your Interview Experience
                </h2>

                {/* Supporting text */}
                <p className="text-sm text-[hsl(222,12%,45%)] leading-relaxed max-w-[340px] mx-auto mb-5">
                  Your experience could help someone land their next role. Share it now and earn up to{' '}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/20 font-semibold text-[hsl(221,91%,60%)]">
                    <Gift className="w-3 h-3" />
                    10 credits
                  </span>
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-2.5">
                  <Link
                    to="/add-experience"
                    onClick={() => setVisible(false)}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[hsl(221,91%,60%)] text-white font-semibold text-sm shadow-lg shadow-[hsl(221,91%,60%)]/25 hover:shadow-xl hover:shadow-[hsl(221,91%,60%)]/30 hover:brightness-110 transition-all active:scale-[0.98]"
                  >
                    
                    Share Now
                  </Link>
                  <button
                    onClick={() => setVisible(false)}
                    className="w-full px-6 py-2.5 rounded-xl text-sm font-medium text-[hsl(222,12%,45%)] hover:bg-[hsl(220,20%,97%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>

                {/* Footnote */}
                <p className="text-[11px] text-[hsl(222,12%,65%)] mt-4">
                  Rewards are available for eligible posts only.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}