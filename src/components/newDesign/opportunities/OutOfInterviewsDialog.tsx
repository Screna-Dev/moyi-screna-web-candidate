import { useState } from "react";
import { useNavigate } from "react-router";
import { fetchInterviewQuota, grantKeys, startQuotaCheckout } from "@/hooks/useInterviewQuota";
import { markPendingCheckout } from "@/utils/pendingCheckout";
import { careersErrorCode, type QuotaShortage } from "@/services/careersApi";

const imgAlertTriangle = "/images/opportunities/819a3.svg";
const font = { regular: "'Inter:Regular', Inter, sans-serif", semibold: "'Inter:Semi_Bold', Inter, sans-serif" };

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

// No interviews left to start a candidate-paid interview (403
// INSUFFICIENT_INTERVIEW_QUOTA, change C9). Laid out like the design's
// not-enough-credits modal (QuickInterviewModal), which it replaces here.
// Free → wait for next month or upgrade; Pro / Pro 90-day → buy an add-on.
export function OutOfInterviewsDialog({ shortage, onClose }: { shortage: QuotaShortage; onClose: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const free = shortage.plan === "FREE";

  // The add-on is sold only to Pro / Pro 90-day. Checkout returns to Settings →
  // Billing, which polls the quota until the new grant lands.
  const buyAddOn = async () => {
    setBusy(true);
    setError("");
    try {
      const before = await fetchInterviewQuota().catch(() => null);
      const url = await startQuotaCheckout("interview-add-on");
      markPendingCheckout("interview-add-on", undefined, undefined, before ? grantKeys(before, "ADD_ON") : undefined);
      window.location.href = url;
    } catch (err) {
      setError(
        careersErrorCode(err) === "INSUFFICIENT_PLAN_TIER"
          ? "More interviews are available on Pro. See the plans to upgrade."
          : "Couldn't start checkout. Please try again.",
      );
      setBusy(false);
    }
  };

  const rows = [
    { label: "Interviews left", value: "0" },
    ...(free && shortage.resetsAt ? [{ label: "New interviews", value: dateLabel(shortage.resetsAt) }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl w-[540px] max-w-[calc(100vw-32px)] shadow-[0px_24px_48px_rgba(0,0,0,0.12)] flex flex-col">
        <div className="flex justify-center pt-8">
          <div className="w-12 h-12 bg-[#fffbeb] rounded-3xl flex items-center justify-center">
            <img src={imgAlertTriangle} alt="" className="w-6 h-6" />
          </div>
        </div>
        <div className="flex flex-col gap-3 px-14 pt-5 pb-6">
          <h2 className="text-[#1e232f] text-[24px] font-bold leading-tight text-center" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            {free ? "You've used this month's interviews" : "You're out of interviews"}
          </h2>
          <p className="text-[#5a6172] text-[14px] leading-5 text-center" style={{ fontFamily: font.regular }}>
            {free
              ? "Free includes a few partner-role interviews each month. Wait for next month's, or upgrade to Pro for more."
              : "Add more interviews to keep applying. Add-on interviews are charged once and can't be refunded."}
          </p>
          <div className="bg-[#f6f7f9] rounded-lg px-4 py-3 flex flex-col gap-1.5 mt-1">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[#5a6172] text-[13px]" style={{ fontFamily: font.regular }}>
                  {label}
                </span>
                <span className="text-[#1e232f] text-[13px] font-semibold" style={{ fontFamily: font.semibold }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[#7d8699] text-[12px] leading-normal" style={{ fontFamily: font.regular }}>
            Your interview has not started. Nothing has been used.
          </p>
          {error && (
            <p className="text-[#dc2626] text-[13px]" style={{ fontFamily: font.regular }}>
              {error}
            </p>
          )}
        </div>
        <div className="mx-14 h-px bg-[#e1e4ea]" />
        <div className="flex items-center justify-center gap-3 px-14 py-6">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[#e1e4ea] text-[#5a6172] text-[14px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#f9fafb] transition-colors"
            style={{ fontFamily: font.semibold }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => (free ? navigate("/plans") : void buyAddOn())}
            className="bg-[#3c77f6] hover:bg-[#2d6ae0] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            style={{ fontFamily: font.semibold }}
          >
            {free ? "See Pro plans" : busy ? "Opening checkout…" : "Buy more interviews"}
          </button>
        </div>
      </div>
    </div>
  );
}
