import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Clock,
  RefreshCw,
  MessageSquare,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  X,
  ChevronRight,
} from "lucide-react";
import { C, badge, card, TH, TD, primaryBtn, secondaryBtn } from "../ui/styles";

const kpis = [
  { label: "Open Job Tickets",       value: "247",   sub: "+18 today",    icon: FileText,    color: C.blue,  urgent: false },
  { label: "Unclaimed Tickets",      value: "34",    sub: "Needs action", icon: AlertCircle, color: C.red,   urgent: true },
  { label: "Today's Sessions",       value: "12",    sub: "3 upcoming",   icon: Clock,       color: "hsl(165 82% 38%)", urgent: false },
  { label: "Reschedule Requests",    value: "7",     sub: "2 within 48h", icon: RefreshCw,   color: C.amber, urgent: false },
  { label: "Open Disputes",       value: "3",     sub: "Avg $120",     icon: MessageSquare, color: C.red, urgent: true },
  { label: "Unsettled Mentor Payouts", value: "$4,280",sub: "8 mentors",    icon: DollarSign,  color: C.blue,  urgent: false },
];

const attentionItems = [
  { id: 1, text: "34 unclaimed job tickets — queue growing, assign to Ops now", severity: "high",   action: "Assign" },
  { id: 2, text: "Dispute #D-019: $150 refund requested — session quality complaint", severity: "high", action: "Review" },
  { id: 3, text: "Reschedule request from Sarah Chen — within 48h window", severity: "medium", action: "Action" },
  { id: 4, text: "8 mentor payouts ready to settle — $4,280 total", severity: "medium", action: "Settle" },
  { id: 5, text: "Marcus Liu: 0 applications submitted in 14 days — check-in needed", severity: "low", action: "View" },
];

const activityFeed = [
  { id: 1, time: "2m ago",  actor: "Alex Kim",    action: "marked completed",     subject: "Google SWE L4 ticket",          type: "success" },
  { id: 2, time: "8m ago",  actor: "System",      action: "session started",      subject: "David Park ↔ Zhang Wei",        type: "info" },
  { id: 3, time: "15m ago", actor: "Jennifer Wu", action: "uploaded proof",       subject: "Meta PM application",           type: "success" },
  { id: 4, time: "22m ago", actor: "System",      action: "reschedule requested", subject: "Sarah Chen — tomorrow 2PM",    type: "warning" },
  { id: 5, time: "34m ago", actor: "Finance",     action: "settled payout",       subject: "Batch #P-041 — $1,200",        type: "success" },
  { id: 6, time: "1h ago",  actor: "System",      action: "dispute opened",       subject: "Dispute #D-019 by Ryan Torres", type: "danger" },
  { id: 7, time: "2h ago",  actor: "Alex Kim",    action: "claimed 5 tickets",    subject: "Marcus Liu queue",              type: "info" },
];

const openDecisions = [
  { title: "Ops role split",       options: ["Unified Ops", "Split: App Ops + Mentorship Ops"],        status: "Awaiting CEO",    urgent: true },
  { title: "AI automation timing", options: ["MVP: manual first", "AI auto-apply in Phase 2"],         status: "Agreed: manual", urgent: false },
  { title: "Admin deployment",     options: ["admin.screna.ai", "Embedded in platform"],              status: "Awaiting Eng",    urgent: false },
];

const recentUsers = [
  { name: "Emily Zhang",  role: "SWE → FAANG",    ops: "Alex Kim",    tickets: 42, status: "active" as const },
  { name: "Marcus Liu",   role: "PM → Series B",  ops: "Jennifer Wu", tickets: 28, status: "needs-review" as const },
  { name: "Sarah Chen",   role: "Data Eng → Big Tech", ops: "Alex Kim", tickets: 15, status: "active" as const },
  { name: "Ryan Torres",  role: "Backend → Staff", ops: "Unassigned",  tickets: 0,  status: "unclaimed" as const },
  { name: "Priya Patel",  role: "ML Eng → FAANG", ops: "Jennifer Wu", tickets: 67, status: "active" as const },
];

const statusBadge = (s: string) =>
  s === "active"       ? badge("green") :
  s === "needs-review" ? badge("amber") :
  s === "unclaimed"    ? badge("red")   : badge("gray");

const statusLabel = (s: string) =>
  s === "needs-review" ? "Needs review" :
  s === "unclaimed"    ? "Unclaimed"    :
  s === "active"       ? "Active"       : s;

function KpiCard({ kpi }: { kpi: typeof kpis[0] }) {
  const Icon = kpi.icon;
  return (
    <div
      style={{
        ...card,
        padding: "14px 16px",
        borderLeft: kpi.urgent ? `3px solid ${C.red}` : `3px solid transparent`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {kpi.label}
        </span>
        <Icon size={15} style={{ color: kpi.color, opacity: 0.6 }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: kpi.urgent ? C.red : C.text, lineHeight: 1 }}>
        {kpi.value}
      </div>
      <div style={{ fontSize: 11, color: kpi.urgent ? C.red : C.textMuted, marginTop: 5 }}>
        {kpi.sub}
      </div>
    </div>
  );
}

const feedDot = (type: string) =>
  type === "success" ? C.green :
  type === "warning" ? C.amber :
  type === "danger"  ? C.red   : C.blue;

export function CommandCenter() {
  const [dismissed, setDismissed] = useState<number[]>([]);

  const visible = attentionItems.filter((i) => !dismissed.includes(i.id));

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "'Inter', sans-serif",
        color: C.text,
        background: C.bgPage,
        minHeight: "100%",
      }}
    >
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Needs Attention */}
        <div style={{ ...card, gridColumn: "1 / 3", padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
              gap: 8,
            }}
          >
            <AlertTriangle size={13} style={{ color: C.red }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Needs Attention</span>
            {visible.length > 0 && (
              <span
                style={{
                  background: C.red,
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "0 5px",
                  lineHeight: "15px",
                  borderRadius: 9999,
                }}
              >
                {visible.length}
              </span>
            )}
          </div>
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            {visible.map((item) => (
              <div className="px-[10px] py-[8px] px-[10px] py-[8px] px-[10px] py-[8px] px-[10px] py-[8px] px-[10px] py-[8px] px-[10px] py-[8px]"
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  background:
                    item.severity === "high"   ? C.redBg :
                    item.severity === "medium" ? C.amberBg : C.bgSubtle,
                  border: `1px solid ${
                    item.severity === "high"   ? C.redBorder :
                    item.severity === "medium" ? C.amberBorder : C.border
                  }`,
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      item.severity === "high"   ? C.red :
                      item.severity === "medium" ? C.amber : C.textSub,
                  }}
                />
                <span style={{ flex: 1, fontSize: 12, color: C.text }}>{item.text}</span>
                <button
                  onClick={() => toast.success(`Action triggered: ${item.action}`)}
                  style={{ ...primaryBtn, height: 24, fontSize: 11, padding: "0 8px", flexShrink: 0 }}
                >
                  {item.action}
                </button>
                <button
                  onClick={() => setDismissed([...dismissed, item.id])}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.textSub, padding: 2, display: "flex" }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {visible.length === 0 && (
              <div style={{ padding: "12px 0", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: C.textMuted, fontSize: 12 }}>
                <CheckCircle2 size={14} style={{ color: C.green }} /> All caught up
              </div>
            )}
          </div>
        </div>

        {/* Open Decisions */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
              gap: 8,
            }}
          >
            <TrendingUp size={13} style={{ color: C.blue }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Open Decisions</span>
          </div>
          <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {openDecisions.map((d) => (
              <div
                key={d.title}
                style={{
                  padding: "9px 10px",
                  background: d.urgent ? C.amberBg : C.bgSubtle,
                  border: `1px solid ${d.urgent ? C.amberBorder : C.border}`,
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 4 }}>{d.title}</div>
                {d.options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <Circle size={9} style={{ color: C.textSub, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.textMuted }}>{opt}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6 }}>
                  <span style={badge(d.urgent ? "amber" : "green")}>{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Activity feed */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Activity Feed</span>
            <button style={{ ...secondaryBtn, height: 24, fontSize: 11 }}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div>
            {activityFeed.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 16px",
                  borderBottom: idx < activityFeed.length - 1 ? `1px solid hsl(220 16% 95%)` : "none",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: feedDot(item.type),
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: C.text }}>
                    <strong style={{ fontWeight: 600 }}>{item.actor}</strong>{" "}
                    <span style={{ color: C.textMuted }}>{item.action}</span>{" "}
                    <span style={{ color: C.blue }}>{item.subject}</span>
                  </span>
                </div>
                <span style={{ fontSize: 11, color: C.textSub, flexShrink: 0, marginTop: 1 }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users table */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Recent Users</span>
            <button style={{ ...secondaryBtn, height: 24, fontSize: 11 }}>
              View all <ArrowRight size={11} />
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["User", "Target Role", "Ops", "Tickets", "Status"].map((h) => (
                  <th key={h} style={{ ...TH, background: "transparent", height: 32 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr
                  key={u.name}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = "hsl(221 91% 60% / 0.04)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                >
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: `hsl(${(u.name.charCodeAt(0) * 17) % 360} 55% 68%)`,
                          fontSize: 8,
                          fontWeight: 700,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ ...TD, fontSize: 12, color: C.textMuted }}>{u.role}</td>
                  <td style={{ ...TD, fontSize: 12, color: u.ops === "Unassigned" ? C.red : C.text }}>
                    {u.ops}
                  </td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{u.tickets}</td>
                  <td style={TD}>
                    <span style={statusBadge(u.status)}>{statusLabel(u.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
