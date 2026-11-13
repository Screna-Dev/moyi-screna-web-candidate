const imgAlertTriangle = "/images/opportunities/819a3.svg";
const imgLine = "/images/opportunities/5b0dc.svg";

// Design numbers (12 / 30 / 18) are the defaults; the careers flow passes the
// candidate's real balance and the interview's required credits.
interface Props {
  onClose: () => void;
  minutes?: number;
  balance?: number;
  required?: number;
  onBuy?: () => void;
  buying?: boolean;
}

export function QuickInterviewModal({ onClose, minutes = 30, balance = 12, required = 30, onBuy, buying = false }: Props) {
  const needed = Math.max(0, required - balance);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-[540px] max-w-[calc(100vw-32px)] shadow-[0px_24px_48px_rgba(0,0,0,0.12)] flex flex-col">
        {/* Icon */}
        <div className="flex justify-center pt-8 pb-0">
          <div className="w-12 h-12 bg-[#fffbeb] rounded-3xl flex items-center justify-center">
            <img src={imgAlertTriangle} alt="" className="w-6 h-6" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 px-14 pt-5 pb-6">
          <h2
            className="text-[#1e232f] text-[24px] font-bold leading-tight text-center"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            Not enough credits to start this AI interview
          </h2>
          <p
            className="text-[#5a6172] text-[14px] leading-5 text-center"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            This interview can last up to {minutes} minutes. You need at least {required} credits available to begin.
          </p>

          {/* Credit summary */}
          <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-1.5 mt-1">
            {[
              { label: "Your balance",      value: `${balance} credits` },
              { label: "Required balance",  value: `${required} credits` },
              { label: "Credits needed",    value: `${needed} credits` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span
                  className="text-[#5a6172] text-[13px]"
                  style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                >
                  {label}
                </span>
                <span
                  className="text-[#1e232f] text-[13px] font-semibold"
                  style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p
            className="text-[#5a6172] text-[13px] leading-normal"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Charged at 1 credit per minute, based on actual interview time.
          </p>
          <p
            className="text-[#7d8699] text-[12px] leading-normal"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Your interview has not started. No credits have been deducted.
          </p>
        </div>

        {/* Divider */}
        <div className="relative mx-14" style={{ height: 1 }}>
          <img src={imgLine} alt="" className="w-full" style={{ height: 1, display: "block" }} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 px-14 py-6">
          <button
            onClick={onClose}
            className="bg-white border border-[#e1e4ea] text-[#5a6172] text-[14px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#f9fafb] transition-colors"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={onBuy}
            disabled={buying}
            className="bg-[#3c77f6] hover:bg-[#2d6ae0] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Buy credits
          </button>
        </div>
      </div>
    </div>
  );
}
