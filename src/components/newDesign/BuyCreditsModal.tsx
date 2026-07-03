import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

// Custom credit top-up constraints (mirror POST /payments/credits/custom):
// 50–1000 credits in multiples of 10, flat $0.10 / credit.
export const CREDIT_PICKS = [50, 100, 500, 1000] as const;
export const CREDIT_MIN = 50;
export const CREDIT_MAX = 1000;
export const CREDIT_STEP = 10;
export const CREDIT_UNIT_PRICE = 0.1;

export function BuyCreditsModal({ onClose, onPurchase }: { onClose: () => void; onPurchase?: (credits: number) => void | Promise<void> }) {
  const [credits, setCredits] = useState(100);
  const [purchasing, setPurchasing] = useState(false);
  const total = (credits * CREDIT_UNIT_PRICE).toFixed(2);

  const handleCheckout = async () => {
    if (!onPurchase) return;
    setPurchasing(true);
    try { await onPurchase(credits); } finally { setPurchasing(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.16 }}
        className="bg-card w-[420px] rounded-2xl p-6" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-medium text-foreground" style={{ fontSize: 17 }}>Buy extra credits</p>
            <p className="text-xs text-muted-foreground mt-0.5">Credits never expire</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Credit amount display */}
        <div className="bg-secondary rounded-xl p-5 text-center mb-4">
          <p className="font-semibold text-foreground leading-none" style={{ fontSize: 44 }}>{credits}</p>
          <p className="text-xs text-muted-foreground mt-1.5">credits</p>
        </div>

        {/* Quick picks */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {CREDIT_PICKS.map(v => (
            <button
              key={v}
              onClick={() => setCredits(v)}
              className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                credits === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-secondary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="mb-1">
          <input
            type="range" min={CREDIT_MIN} max={CREDIT_MAX} step={CREDIT_STEP} value={credits}
            onChange={e => setCredits(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">50</span>
            <span className="text-[10px] text-muted-foreground">1,000</span>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-secondary rounded-lg px-4 py-3 mb-5 mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">{credits} credits</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              $0.10 per credit
            </p>
          </div>
          <p className="font-semibold text-foreground" style={{ fontSize: 20 }}>${total}</p>
        </div>

        <button
          onClick={handleCheckout}
          disabled={purchasing}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {purchasing && <Loader2 className="w-4 h-4 animate-spin" />}
          Continue to checkout
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2.5">
          Secure checkout · No subscription required
        </p>
      </motion.div>
    </motion.div>
  );
}

export default BuyCreditsModal;
