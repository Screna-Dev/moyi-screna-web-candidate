import { useState } from "react";
import { toast } from "sonner";
import { Download, Check, AlertCircle, TrendingUp, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { C, badge, TH, TD, primaryBtn, secondaryBtn, card } from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";
import { FilterBar } from "../ui/FilterBar";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";

type Status = "Ready to settle" | "Settled" | "Disputed";

const statusVariant = (s: Status | string): BadgeVariant =>
  s === "Settled"         ? "green" :
  s === "Ready to settle" ? "blue"  :
  s === "Disputed"        ? "red"   : "amber";

const kpis = [
  { label: "Gross session revenue",   value: "$1,300",  sub: "This month",  icon: TrendingUp, color: C.blue  },
  { label: "Platform fee (5%)",       value: "$65",     sub: "Retained",    icon: DollarSign, color: C.green },
  { label: "Mentor payout unsettled", value: "$427.50", sub: "3 mentors",   icon: Clock,      color: C.amber },
  { label: "Settled this month",      value: "$655",    sub: "4 sessions",  icon: Check,      color: C.green },
];

const initialRows: { id: string; mentor: string; sessionId: string; student: string; date: string; gross: number; fee: number; payout: number; stripe: string; status: Status; payoutMethod?: string }[] = [
  { id: "L-001", mentor: "Zhang Wei",   sessionId: "S-001", student: "Emily Zhang",  date: "May 20", gross: 120, fee: 6,    payout: 114,   stripe: "pi_1234", status: "Ready to settle"  },
  { id: "L-002", mentor: "Lisa Park",   sessionId: "S-002", student: "Marcus Liu",   date: "May 19", gross: 150, fee: 7.5,  payout: 142.5, stripe: "pi_2345", status: "Ready to settle"  },
  { id: "L-003", mentor: "Marcus Chen", sessionId: "S-003", student: "Sarah Chen",   date: "May 22", gross: 180, fee: 9,    payout: 171,   stripe: "pi_3456", status: "Ready to settle"  },
  { id: "L-004", mentor: "David Wang",  sessionId: "S-006", student: "Kevin Li",     date: "May 17", gross: 200, fee: 10,   payout: 190,   stripe: "pi_4567", status: "Settled", payoutMethod: "Wise" },
  { id: "L-005", mentor: "Zhang Wei",   sessionId: "S-007", student: "Priya Patel",  date: "May 16", gross: 120, fee: 6,    payout: 114,   stripe: "pi_5678", status: "Settled", payoutMethod: "Venmo" },
  { id: "L-006", mentor: "Lisa Park",   sessionId: "S-008", student: "Aisha Kumar",  date: "May 15", gross: 150, fee: 7.5,  payout: 142.5, stripe: "pi_6789", status: "Disputed"         },
  { id: "L-007", mentor: "David Wang",  sessionId: "S-009", student: "Tom Wu",       date: "May 14", gross: 200, fee: 10,   payout: 190,   stripe: "pi_7890", status: "Settled", payoutMethod: "Wise" },
  { id: "L-008", mentor: "Marcus Chen", sessionId: "S-010", student: "Grace Liu",    date: "May 13", gross: 180, fee: 9,    payout: 171,   stripe: "pi_8901", status: "Ready to settle"  },
];

const COLUMNS = ["Mentor", "Session ID", "Student", "Date", "Gross", "Platform fee (5%)", "Mentor payout", "Stripe record", "Status", "Payout method", "Actions"];

export function FinanceLedger() {
  const [rows, setRows]           = useState(initialRows);
  const [selected, setSelected]   = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("Wise");
  const [filters, setFilters]     = useState<Record<string, string>>({ status: "all", mentor: "all" });
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);

  const filtered = rows.filter((r) => {
    if (filters.status !== "all" && r.status.toLowerCase().replace(/\s+/g, "-") !== filters.status) return false;
    if (filters.mentor !== "all" && r.mentor !== filters.mentor) return false;
    return true;
  });

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const confirmSettle = () => {
    setRows((prev) => prev.map((r) => selected.includes(r.id) ? { ...r, status: "Settled" as Status, payoutMethod } : r));
    setSelected([]);
    setShowModal(false);
    toast.success(`${selected.length} payout${selected.length > 1 ? "s" : ""} marked as settled via ${payoutMethod}`);
  };

  const settleTotal = rows.filter((r) => selected.includes(r.id)).reduce((s, r) => s + r.payout, 0);
  const mentorOptions = [{ value: "all", label: "All mentors" }, ...Array.from(new Set(rows.map((r) => r.mentor))).map((m) => ({ value: m, label: m }))];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>

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
                onClick={() => toast.success("Exporting to Excel...")}
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
                        {row.payoutMethod ? (
                          <span style={{ fontSize: 12, color: C.textSub, background: C.bgPage, padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>
                            {row.payoutMethod}
                          </span>
                        ) : (
                          <span style={{ color: C.textMuted }}>-</span>
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
