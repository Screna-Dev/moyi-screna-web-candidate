import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  ADD_ON_INTERVIEWS,
  ADD_ON_VALID_DAYS,
  fetchInterviewQuota,
  grantKeys,
  startQuotaCheckout,
  type InterviewQuota,
} from "@/hooks/useInterviewQuota";
import { markPendingCheckout } from "@/utils/pendingCheckout";
import { careersErrorCode } from "@/services/careersApi";
import { useCandidatePrices } from "@/hooks/useCandidatePrices";

const font = { regular: "'Inter:Regular', Inter, sans-serif", semibold: "'Inter:Semi_Bold', Inter, sans-serif" };

// Buying the interview add-on (POST /payments/interview-add-on, change C9) from
// the landing page's ADD-ON row. The design has the row but no dialog; this
// one follows the out-of-interviews dialog (itself the design's
// not-enough-credits modal). Pro / Pro 90-Day: confirm, then Stripe; the
// return lands on Settings → Billing, which waits for the new grant. Free:
// the add-on isn't sold to Free (403 INSUFFICIENT_PLAN_TIER), so offer Pro.
export function AddInterviewsDialog({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
  const [quota, setQuota] = useState<InterviewQuota | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notEligible, setNotEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchInterviewQuota()
      .then((q) => !cancelled && setQuota(q))
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const free = notEligible || quota?.plan === "FREE";
  const addOnPrice = useCandidatePrices().addOn; // #323
  const loading = !quota && !loadFailed;

  // Stays busy until the redirect: a second checkout would be a second charge.
  const buy = async () => {
    setBusy(true);
    setError("");
    try {
      const url = await startQuotaCheckout("interview-add-on");
      markPendingCheckout("interview-add-on", undefined, undefined, quota ? grantKeys(quota, "ADD_ON") : undefined);
      window.location.href = url;
    } catch (err) {
      if (careersErrorCode(err) === "INSUFFICIENT_PLAN_TIER") setNotEligible(true);
      else setError("Couldn't start checkout. Please try again.");
      setBusy(false);
    }
  };

  const rows = free
    ? []
    : [
        { label: "You get", value: `${ADD_ON_INTERVIEWS} partner-role interviews` },
        { label: "Price", value: `${addOnPrice}, charged once` },
        { label: "Valid for", value: `${ADD_ON_VALID_DAYS} days` },
        ...(quota ? [{ label: "Interviews left now", value: String(quota.available) }] : []),
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="add-interviews-title" className="bg-white rounded-2xl w-[540px] max-w-[calc(100vw-32px)] shadow-[0px_24px_48px_rgba(0,0,0,0.12)] flex flex-col">
        <div className="flex justify-center pt-8">
          <div className="w-12 h-12 bg-[#eef2ff] rounded-3xl flex items-center justify-center text-[#2e5bff]">
            <Plus size={22} />
          </div>
        </div>
        <div className="flex flex-col gap-3 px-14 pt-5 pb-6">
          <h2
            id="add-interviews-title"
            className="text-[#1e232f] text-[24px] font-bold leading-tight text-center"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            {free ? "Add-on interviews are for Pro" : "Add more interviews"}
          </h2>
          <p className="text-[#5a6172] text-[14px] leading-5 text-center" style={{ fontFamily: font.regular }}>
            {loading
              ? "Checking your plan…"
              : free
                ? `The add-on is for Pro and Pro 90-Day members. Upgrade to Pro for more interviews every month, then add ${ADD_ON_INTERVIEWS} more anytime.`
                : `Add ${ADD_ON_INTERVIEWS} partner-role interviews to your account. They're used after your plan's interviews.`}
          </p>
          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 size={20} className="animate-spin text-[#2e5bff]" />
            </div>
          )}
          {!loading && rows.length > 0 && (
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
          )}
          {!loading && !free && (
            <p className="text-[#7d8699] text-[12px] leading-normal" style={{ fontFamily: font.regular }}>
              Add-on interviews are charged once and can't be refunded. After payment you'll land on Settings → Billing, where they appear in a few seconds.
            </p>
          )}
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
            disabled={busy}
            className="bg-white border border-[#e1e4ea] text-[#5a6172] text-[14px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#f9fafb] transition-colors disabled:opacity-60"
            style={{ fontFamily: font.semibold }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => (free ? onUpgrade() : void buy())}
            className="bg-[#2e5bff] hover:bg-[#2449d6] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            style={{ fontFamily: font.semibold }}
          >
            {free ? "Get Pro" : busy ? "Opening checkout…" : `Add ${ADD_ON_INTERVIEWS} interviews · ${addOnPrice}`}
          </button>
        </div>
      </div>
    </div>
  );
}
