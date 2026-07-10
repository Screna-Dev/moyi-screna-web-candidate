import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Download, Check, AlertCircle, TrendingUp, DollarSign, Clock, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { C, badge, TH, TD, primaryBtn, secondaryBtn, card } from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";
import { FilterBar } from "../ui/FilterBar";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import { exportSessionReport, adminPayoutSummary, markMentorPayoutsPaid } from "../../../../services/mentorshipAdminService";
import { getMentorPaymentMethodAsAdmin } from "../../../../services/MentorService";

type Status = "Ready to settle" | "Settled" | "Disputed";

const statusVariant = (s: Status | string): BadgeVariant =>
  s === "Settled"         ? "green" :
  s === "Ready to settle" ? "blue"  :
  s === "Disputed"        ? "red"   : "amber";

type LedgerRow = {
  id: string;
  mentorId: string;
  mentor: string;
  sessionId: string;
  student: string;
  date: string;
  gross: number;
  fee: number;
  payout: number;
  stripe: string;
  status: Status;
};

// API amount fields are in cents; the ledger displays dollars.
const centsToDollars = (c: unknown) => (Number(c) || 0) / 100;
const fmtMoney = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// GET /mentorship/admin/payouts returns a per-mentor aggregation, so each ledger
// row is one mentor's pending- or paid-payout total (not a single session). The
// session-level columns predate this endpoint and have no per-mentor equivalent,
// so they render as "—".
// Pages through every result so an unfiltered view shows ALL mentors, not just
// the first page (the API caps page size at 100).
const fetchAllPayouts = async (params: Record<string, any>) => {
  const all: any[] = [];
  let page = 0;
  while (page < 1000) {
    const res = await adminPayoutSummary({ ...params, page, size: 100 });
    const data = res?.data?.data;
    const content: any[] = data?.content || [];
    all.push(...content);
    const meta = data?.pageMeta;
    if (!meta || meta.last || content.length === 0) break;
    page += 1;
  }
  return all;
};

const mapSummaryRow = (item: any, status: Status): LedgerRow => {
  const gross = Number(item?.totalAmountCents) || 0;
  const payout = Number(item?.totalPayoutCents) || 0;
  return {
    id: `${item?.mentorId}::${status === "Settled" ? "PAID" : "PENDING"}`,
    mentorId: item?.mentorId || "",
    mentor: item?.mentorName || "—",
    sessionId: "—",
    student: "—",
    date: "—",
    gross: centsToDollars(gross),
    fee: centsToDollars(gross - payout),
    payout: centsToDollars(payout),
    stripe: "—",
    status,
  };
};

const COLUMNS = ["Mentor", "Session ID", "Student", "Date", "Gross", "Platform fee (5%)", "Mentor payout", "Stripe record", "Status", "Payout method", "Actions"];

export function FinanceLedger() {
  const [rows, setRows]           = useState<LedgerRow[]>([]);
  const [selected, setSelected]   = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("Wise");
  const [filters, setFilters]     = useState<Record<string, string>>({ status: "all", mentor: "all" });
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [kpiData, setKpiData] = useState({ grossCents: 0, feeCents: 0, unsettledCents: 0, pendingCount: 0, settledCents: 0, settledSessions: 0 });
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);
  // Per-mentor payment-method availability, prefetched so the Payout method
  // column can show "View PDF" vs "N/A" without the user having to click.
  //   undefined → still checking · false → no file on record · true → has a file
  const [pdfAvailable, setPdfAvailable] = useState<Record<string, boolean>>({});

  const loadPayouts = useCallback(async () => {
    try {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
      // Table rows = ALL pending + ALL paid (no date filter), so the unfiltered
      // view shows every payout. KPIs that read "this month" use month-scoped
      // fetches separately.
      const [pending, paidAll, paidMonth, monthAll] = await Promise.all([
        fetchAllPayouts({ status: "PENDING" }),
        fetchAllPayouts({ status: "PAID" }),
        fetchAllPayouts({ status: "PAID", from: monthStart, to: nextMonth }),
        fetchAllPayouts({ from: monthStart, to: nextMonth }),
      ]);
      setRows([
        ...pending.map((i) => mapSummaryRow(i, "Ready to settle")),
        ...paidAll.map((i) => mapSummaryRow(i, "Settled")),
      ]);
      // Prefetch payment-method availability for every mentor in the ledger so
      // the Payout method column reflects has-PDF / N/A up front. Existence only
      // — the actual (short-lived presigned) URL is fetched fresh on click.
      const mentorIds = Array.from(
        new Set([...pending, ...paidAll].map((i) => i?.mentorId).filter(Boolean))
      );
      mentorIds.forEach((mentorId) => {
        getMentorPaymentMethodAsAdmin(mentorId)
          .then((res) => {
            const url = res?.data?.data?.url || res?.data?.url || "";
            setPdfAvailable((prev) => ({ ...prev, [mentorId]: !!url }));
          })
          .catch(() => {
            // 404 (or any failure) → treat as no file so the column shows N/A.
            setPdfAvailable((prev) => ({ ...prev, [mentorId]: false }));
          });
      });
      setKpiData({
        grossCents: monthAll.reduce((s, i) => s + (Number(i?.totalAmountCents) || 0), 0),
        feeCents: monthAll.reduce((s, i) => s + ((Number(i?.totalAmountCents) || 0) - (Number(i?.totalPayoutCents) || 0)), 0),
        unsettledCents: pending.reduce((s, i) => s + (Number(i?.totalPayoutCents) || 0), 0),
        pendingCount: pending.length,
        settledCents: paidMonth.reduce((s, i) => s + (Number(i?.totalPayoutCents) || 0), 0),
        settledSessions: paidMonth.reduce((s, i) => s + (Number(i?.recordCount) || 0), 0),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load payouts");
    }
  }, []);

  useEffect(() => { loadPayouts(); }, [loadPayouts]);

  const filtered = rows.filter((r) => {
    if (filters.status !== "all" && r.status.toLowerCase().replace(/\s+/g, "-") !== filters.status) return false;
    if (filters.mentor !== "all" && r.mentor !== filters.mentor) return false;
    return true;
  });

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const confirmSettle = async () => {
    const targets = rows.filter((r) => selected.includes(r.id) && r.status === "Ready to settle");
    try {
      await Promise.all(targets.map((r) => markMentorPayoutsPaid(r.mentorId)));
      toast.success(`${targets.length} payout${targets.length > 1 ? "s" : ""} marked as settled via ${payoutMethod}`);
      setSelected([]);
      setShowModal(false);
      await loadPayouts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to settle payouts");
    }
  };

  // The mentor's payment-method PDF lives behind a short-lived (1h) presigned
  // URL, so fetch it lazily on click rather than pre-loading every row. Opens
  // the PDF in a new tab.
  const viewPaymentMethod = async (mentorId: string) => {
    if (!mentorId) return;
    setLoadingPdf(mentorId);
    try {
      const res = await getMentorPaymentMethodAsAdmin(mentorId);
      const url = res?.data?.data?.url || res?.data?.url || "";
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        setPdfAvailable((prev) => ({ ...prev, [mentorId]: true }));
      } else {
        setPdfAvailable((prev) => ({ ...prev, [mentorId]: false }));
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setPdfAvailable((prev) => ({ ...prev, [mentorId]: false }));
      } else {
        toast.error(err?.response?.data?.message || "Failed to load payment method");
      }
    } finally {
      setLoadingPdf(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportSessionReport("MONTH");
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "session-report.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exporting to Excel...");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export report");
    }
  };

  const settleTotal = rows.filter((r) => selected.includes(r.id)).reduce((s, r) => s + r.payout, 0);
  const mentorOptions = [{ value: "all", label: "All mentors" }, ...Array.from(new Set(rows.map((r) => r.mentor))).map((m) => ({ value: m, label: m }))];

  const kpis = [
    { label: "Gross session revenue",   value: fmtMoney(kpiData.grossCents),     sub: "This month",  icon: TrendingUp, color: C.blue  },
    { label: "Platform fee (5%)",       value: fmtMoney(kpiData.feeCents),       sub: "Retained",    icon: DollarSign, color: C.green },
    { label: "Mentor payout unsettled", value: fmtMoney(kpiData.unsettledCents), sub: `${kpiData.pendingCount} mentor${kpiData.pendingCount === 1 ? "" : "s"}`,   icon: Clock,      color: C.amber },
    { label: "Settled this month",      value: fmtMoney(kpiData.settledCents),   sub: `${kpiData.settledSessions} session${kpiData.settledSessions === 1 ? "" : "s"}`,  icon: Check,      color: C.green },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>

      <style>{`@keyframes finance-ledger-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Settlement modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm settlement"
        width={440}
        footer={
          <>
            <button onClick={() => setShowModal(false)} style={secondaryBtn}>Cancel</button>
            <button onClick={confirmSettle} style={{ ...primaryBtn, background: C.green }}>Confirm settlement</button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <AlertTriangle size={18} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, color: C.text, margin: "0 0 8px", lineHeight: 1.55 }}>
              You are marking <strong>{selected.length}</strong> payout{selected.length > 1 ? "s" : ""} as settled.
              Total amount: <strong>${settleTotal.toFixed(2)}</strong>.
            </p>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0, lineHeight: 1.55 }}>
              This action cannot be undone. Ensure Stripe payouts match before confirming.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Payout Method
          </label>
          <select
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value)}
            style={{ width: "100%", height: 32, padding: "0 10px", fontSize: 13, borderRadius: 6, border: `1px solid ${C.border}`, outline: "none", cursor: "pointer", background: "white" }}
          >
            <option value="Wise">Wise</option>
            <option value="Venmo">Venmo</option>
            <option value="PayPal">PayPal</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.amber }}>
          Verify Stripe payout records before proceeding.
        </div>
      </Modal>

      {/* KPI row */}
      <div style={{ padding: "16px 20px 12px", background: C.bgPage }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={{ ...card, padding: "13px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</span>
                  <Icon size={14} style={{ color: k.color, opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{k.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{k.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table card */}
      <div style={{ flex: 1, margin: "0 20px 16px", display: "flex", flexDirection: "column", ...card, overflow: "hidden" }}>

        {/* Toolbar */}
        <FilterBar
          filters={[
            { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "ready-to-settle", label: "Ready to settle" }, { value: "settled", label: "Settled" }, { value: "disputed", label: "Disputed" }] },
            { key: "mentor", label: "Mentor", options: mentorOptions },
          ]}
          activeFilters={filters}
          onFilterChange={(k, v) => setFilters({ ...filters, [k]: v })}
          columns={COLUMNS}
          hiddenColumns={hiddenCols}
          onToggleColumn={(c) => setHiddenCols((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
          rightChildren={
            <div style={{ display: "flex", gap: 6 }}>
              {selected.length > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  style={{ ...primaryBtn, background: C.green }}
                >
                  <Check size={12} /> Settle {selected.length} selected
                </button>
              )}
              <button
                onClick={handleExport}
                style={secondaryBtn}
              >
                <Download size={12} /> Export Excel
              </button>
            </div>
          }
        />

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <EmptyState icon={<DollarSign size={22} />} message="No ledger records match your filters." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ ...TH, width: 36, textAlign: "center" as const, padding: "0 12px" }}>
                    <input
                      type="checkbox"
                      checked={selected.length > 0 && selected.length === filtered.filter((r) => r.status === "Ready to settle").length}
                      onChange={(e) => setSelected(e.target.checked ? filtered.filter((r) => r.status === "Ready to settle").map((r) => r.id) : [])}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  {COLUMNS.filter((c) => !hiddenCols.includes(c)).map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    style={{ background: selected.includes(row.id) ? C.blueBg : "white", borderBottom: `1px solid hsl(220 16% 94%)` }}
                    onMouseEnter={(e) => { if (!selected.includes(row.id)) (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220 20% 98%)"; }}
                    onMouseLeave={(e) => { if (!selected.includes(row.id)) (e.currentTarget as HTMLTableRowElement).style.background = "white"; }}
                  >
                    <td style={{ ...TD, textAlign: "center", padding: "0 12px" }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={() => row.status === "Ready to settle" && toggle(row.id)}
                        disabled={row.status !== "Ready to settle"}
                        style={{ cursor: row.status === "Ready to settle" ? "pointer" : "not-allowed", opacity: row.status === "Ready to settle" ? 1 : 0.3 }}
                      />
                    </td>
                    {!hiddenCols.includes("Mentor")            && <td style={{ ...TD, fontWeight: 600 }}>{row.mentor}</td>}
                    {!hiddenCols.includes("Session ID")        && <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.blue }}>{row.sessionId}</td>}
                    {!hiddenCols.includes("Student")           && <td style={TD}>{row.student}</td>}
                    {!hiddenCols.includes("Date")              && <td style={{ ...TD, color: C.textMuted }}>{row.date}</td>}
                    {!hiddenCols.includes("Gross")             && <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>${row.gross}</td>}
                    {!hiddenCols.includes("Platform fee (5%)") && <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", color: C.green }}>${row.fee.toFixed(2)}</td>}
                    {!hiddenCols.includes("Mentor payout")     && <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>${row.payout.toFixed(2)}</td>}
                    {!hiddenCols.includes("Stripe record")     && <td style={TD}><code style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", background: C.blueBg, color: C.blue, padding: "2px 5px", borderRadius: 4 }}>{row.stripe}</code></td>}
                    {!hiddenCols.includes("Status")            && <td style={TD}><span style={badge(statusVariant(row.status))}>{row.status}</span></td>}
                    {!hiddenCols.includes("Payout method")     && (
                      <td style={TD}>
                        {pdfAvailable[row.mentorId] === undefined ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textMuted }}>
                            <Loader2 size={12} style={{ animation: "finance-ledger-spin 1s linear infinite" }} /> Checking…
                          </span>
                        ) : pdfAvailable[row.mentorId] === false ? (
                          <span style={{ fontSize: 12, color: C.textMuted }}>N/A</span>
                        ) : (
                          <button
                            onClick={() => viewPaymentMethod(row.mentorId)}
                            disabled={loadingPdf === row.mentorId}
                            style={{ ...secondaryBtn, height: 26, fontSize: 11, gap: 4, opacity: loadingPdf === row.mentorId ? 0.6 : 1, cursor: loadingPdf === row.mentorId ? "default" : "pointer" }}
                          >
                            {loadingPdf === row.mentorId
                              ? <Loader2 size={12} style={{ animation: "finance-ledger-spin 1s linear infinite" }} />
                              : <FileText size={12} />}
                            View PDF
                          </button>
                        )}
                      </td>
                    )}
                    {!hiddenCols.includes("Actions")           && (
                      <td style={TD}>
                        {row.status === "Ready to settle" && (
                          <button onClick={() => { setSelected([row.id]); setShowModal(true); }} style={{ ...primaryBtn, height: 26, fontSize: 11, background: C.green }}>
                            Settle
                          </button>
                        )}
                        {row.status === "Settled" && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.green }}>
                            <Check size={11} /> Settled
                          </span>
                        )}
                        {row.status === "Disputed" && (
                          <button style={{ ...secondaryBtn, height: 26, fontSize: 11, color: C.red, borderColor: C.redBorder }}>
                            View dispute
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Finance role notice */}
      
    </div>
  );
}
