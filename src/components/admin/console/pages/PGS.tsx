import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, X, Pencil, Copy } from "lucide-react";
import {
  C, badge, TH, TD, primaryBtn, secondaryBtn, ghostBtn, filterChip, card,
} from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";

// ── Types ────────────────────────────────────────────────────────────────────
type Level = "Lv0" | "Lv1" | "Lv2" | "Lv3";
type PayoutMethod = "Wise" | "Alipay" | "PayPal";
type PayStatus = "Renewed" | "First Month Paid" | "Refunded" | "Unpaid";
type PlanType = "Premium Plan" | "Starter Plan";

const LEVEL_VARIANT: Record<Level, BadgeVariant> = {
  "Lv0":     "gray",
  "Lv1":     "blue",
  "Lv2":     "purple",
  "Lv3":     "amber",
};

const PAY_VARIANT: Record<PayStatus, { color: string, bg: string }> = {
  "Renewed":          { color: "#166534", bg: "#F0FDF4" },
  "First Month Paid": { color: "#166534", bg: "#F0FDF4" },
  "Refunded":         { color: "#C2410C", bg: "#FFF7ED" },
  "Unpaid":           { color: "#4B5563", bg: "#F3F4F6" },
};

const PLAN_VARIANT: Record<PlanType, { color: string, bg: string }> = {
  "Premium Plan": { color: "#6D28D9", bg: "#F5F3FF" },
  "Starter Plan": { color: "#1D4ED8", bg: "#EFF6FF" },
};

interface PGSMember {
  id: string; name: string; email: string; school: string;
  level: Level; community: string; referralCode: string; promoCode: string;
  regMonth: number; paidMonth: number; aiMockMins: number; conversionRate: number;
  payoutMethod: PayoutMethod; startDate: string;
  totalReg: number; totalPaid: number;
  status?: "Active" | "Deactivated";
}

interface PGSUser {
  id: string; nickname: string; email: string;
  regDate: string; firstMock: string;
  planType: PlanType;
  payStatus: PayStatus; payDate: string;
  aiMockMins: number; mockCount: number; revenueShare: number;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const PGS_MOCK: PGSMember[] = [
  { id:"p1", name:"Kevin Zhang",  email:"kevin.z@ucb.edu",     school:"UC Berkeley",     level:"Lv3", community:"Bay Area Tech",   referralCode:"KEVINZ-UCB",  promoCode:"UCB30OFF",  regMonth:42, paidMonth:28, aiMockMins:4320, conversionRate:66.7, payoutMethod:"Wise",   startDate:"2025-12-01", totalReg:312, totalPaid:198 },
  { id:"p2", name:"Amy Liu",      email:"amy.liu@mit.edu",     school:"MIT",              level:"Lv3",     community:"Boston Tech",     referralCode:"AMYLIU-MIT",  promoCode:"MIT25OFF",  regMonth:34, paidMonth:18, aiMockMins:2840, conversionRate:52.9, payoutMethod:"Alipay", startDate:"2023-11-15", totalReg:245, totalPaid:134 },
  { id:"p3", name:"Marcus Chen",  email:"m.chen@stanford.edu", school:"Stanford",         level:"Lv3",     community:"Silicon Valley",  referralCode:"MCHEN-SV",    promoCode:"SV20OFF",   regMonth:28, paidMonth:15, aiMockMins:2100, conversionRate:53.6, payoutMethod:"PayPal", startDate:"2024-01-08", totalReg:187, totalPaid:98  },
  { id:"p4", name:"Sarah Kim",    email:"s.kim@cmu.edu",       school:"Carnegie Mellon",  level:"Lv2",     community:"Pittsburgh AI",   referralCode:"SKIM-CMU",    promoCode:"CMU15OFF",  regMonth:19, paidMonth:9,  aiMockMins:1560, conversionRate:47.4, payoutMethod:"Wise",   startDate:"2024-03-20", totalReg:134, totalPaid:61  },
  { id:"p5", name:"David Wang",   email:"d.wang@columbia.edu", school:"Columbia",         level:"Lv2",     community:"NYC Tech",        referralCode:"DWANG-NYC",   promoCode:"NYC15OFF",  regMonth:15, paidMonth:7,  aiMockMins:980,  conversionRate:46.7, payoutMethod:"Alipay", startDate:"2024-04-10", totalReg:89,  totalPaid:40  },
  { id:"p6", name:"Lisa Park",    email:"l.park@ucla.edu",     school:"UCLA",             level:"Lv1",     community:"LA Tech",         referralCode:"LPARK-UCLA",  promoCode:"UCLA10OFF", regMonth:8,  paidMonth:3,  aiMockMins:480,  conversionRate:37.5, payoutMethod:"PayPal", startDate:"2024-06-01", totalReg:42,  totalPaid:15  },
  { id:"p7", name:"James Wu",     email:"j.wu@gatech.edu",     school:"Georgia Tech",     level:"Lv1",     community:"Atlanta STEM",    referralCode:"JWUGT-ATL",   promoCode:"GT10OFF",   regMonth:5,  paidMonth:2,  aiMockMins:240,  conversionRate:40.0, payoutMethod:"Wise",   startDate:"2024-08-15", totalReg:28,  totalPaid:11  },
  { id:"p8", name:"Grace Zhao",   email:"g.zhao@rice.edu",     school:"Rice University",  level:"Lv0",     community:"Houston Tech",    referralCode:"GZHAO-RICE",  promoCode:"RICE5OFF",  regMonth:2,  paidMonth:0,  aiMockMins:60,   conversionRate:0,    payoutMethod:"PayPal", startDate:"2024-10-01", totalReg:8,   totalPaid:2   },
];

const MOCK_USERS: PGSUser[] = [
  { id:"mu1",  nickname:"Emily Zhang",  email:"emily.z@gmail.com",    regDate:"2026-04-15", firstMock:"2026-04-16", planType: "Premium Plan", payStatus:"Renewed",          payDate:"2026-05-01", aiMockMins:360, mockCount:18, revenueShare:28.50 },
  { id:"mu2",  nickname:"Michael Lee",  email:"mlee@hotmail.com",     regDate:"2026-04-22", firstMock:"2026-04-24", planType: "Starter Plan", payStatus:"First Month Paid", payDate:"2026-05-05", aiMockMins:240, mockCount:11, revenueShare:28.50 },
  { id:"mu3",  nickname:"Jessica Chen", email:"j.chen@gmail.com",     regDate:"2026-05-01", firstMock:"2026-05-03", planType: "Starter Plan", payStatus:"First Month Paid", payDate:"2026-05-10", aiMockMins:180, mockCount:7,  revenueShare:28.50 },
  { id:"mu4",  nickname:"Ryan Park",    email:"ryanpark@outlook.com", regDate:"2026-05-05", firstMock:"2026-05-07", planType: "Starter Plan", payStatus:"Refunded",         payDate:"2026-05-18", aiMockMins:42,  mockCount:2,  revenueShare:0     },
  { id:"mu5",  nickname:"Lisa Wang",    email:"lwang2024@gmail.com",  regDate:"2026-05-08", firstMock:"2026-05-09", planType: "Starter Plan", payStatus:"First Month Paid", payDate:"2026-05-12", aiMockMins:180, mockCount:9, revenueShare:28.50 },
  { id:"mu6",  nickname:"Kevin Zhao",   email:"k.zhao@yahoo.com",     regDate:"2026-05-12", firstMock:"—",          planType: "Starter Plan", payStatus:"Unpaid",           payDate:"—",          aiMockMins:0,   mockCount:0,  revenueShare:0     },
  { id:"mu7",  nickname:"Amy Sun",      email:"amysun99@gmail.com",   regDate:"2026-05-15", firstMock:"2026-05-16", planType: "Starter Plan", payStatus:"First Month Paid", payDate:"2026-05-20", aiMockMins:95,  mockCount:4, revenueShare:28.50 },
  { id:"mu8",  nickname:"Tony Liu",     email:"tony.liu@example.com", regDate:"2026-05-18", firstMock:"—",          planType: "Starter Plan", payStatus:"Unpaid",           payDate:"—",          aiMockMins:0,   mockCount:0,  revenueShare:0 },
  { id:"mu9",  nickname:"Grace Kim",    email:"g.kim@gmail.com",      regDate:"2026-05-20", firstMock:"2026-05-21", planType: "Starter Plan", payStatus:"First Month Paid", payDate:"2026-05-22", aiMockMins:48,  mockCount:2,  revenueShare:28.50     },
  { id:"mu10", nickname:"Daniel Wu",    email:"d.wu@outlook.com",     regDate:"2026-05-22", firstMock:"—",          planType: "Starter Plan", payStatus:"Unpaid",           payDate:"—",          aiMockMins:0,   mockCount:0,  revenueShare:0 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMins = (m: number) => m >= 120 ? `${Math.round(m / 60)} hrs` : `${m} min`;
const fmtNum  = (n: number) => n.toLocaleString();

const inputStyle: React.CSSProperties = {
  width: "100%", height: 32, padding: "0 10px",
  background: C.bgSubtle, border: `1px solid ${C.border}`,
  borderRadius: 7, fontSize: 13, fontFamily: "'Inter', sans-serif",
  color: C.text, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: C.textSub, textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: 5,
};


// ── Component ─────────────────────────────────────────────────────────────────
export function PGS() {
  const [tab, setTab]                   = useState<"overview" | "detail">("overview");
  const [selectedPGSId, setSelectedPGSId] = useState<string | null>(null);
  const [pgsList, setPgsList]           = useState<PGSMember[]>(PGS_MOCK);
  const [showModal, setShowModal]       = useState(false);
  const [detailFilter, setDetailFilter] = useState("all");
  const [detailSearch, setDetailSearch] = useState("");
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewLevelFilter, setOverviewLevelFilter] = useState<"All" | Level>("All");
  const [overviewStatus, setOverviewStatus] = useState<"Active" | "Archived">("Active");
  const [goalTarget, setGoalTarget] = useState(10);
  const [goalEditing, setGoalEditing] = useState(false);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<{
    name: string; email: string; school: string; level: Level;
    referralCode: string; promoCode: string; startDate: string; payoutMethod: PayoutMethod;
  }>({ name:"", email:"", school:"", level:"Lv1", referralCode:"", promoCode:"", startDate:"", payoutMethod:"Wise" });

  const [editModalPGS, setEditModalPGS] = useState<PGSMember | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string; email: string; school: string; level: Level;
    referralCode: string; startDate: string; payoutMethod: PayoutMethod;
  }>({ name:"", email:"", school:"", level:"Lv1", referralCode:"", startDate:"", payoutMethod:"Wise" });
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  const selectedPGS = pgsList.find(p => p.id === selectedPGSId);

  const openDetail = (id: string) => {
    setSelectedPGSId(id);
    setTab("detail");
    setDetailFilter("all");
    setDetailSearch("");
  };

  const totalReg  = pgsList.reduce((s, p) => s + p.totalReg, 0);
  const totalPaid = pgsList.reduce((s, p) => s + p.totalPaid, 0);
  const totalMins = pgsList.reduce((s, p) => s + p.aiMockMins, 0);

  const filteredUsers = MOCK_USERS.filter(u => {
    if (detailSearch && !u.nickname.toLowerCase().includes(detailSearch.toLowerCase()) && !u.email.toLowerCase().includes(detailSearch.toLowerCase())) return false;
    if (detailFilter === "activated") return u.firstMock !== "—";
    if (detailFilter === "paid")      return u.payStatus === "Renewed" || u.payStatus === "First Month Paid";
    if (detailFilter === "refunded")  return u.payStatus === "Refunded";
    return true;
  });

  const handleAddPGS = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    const newMember: PGSMember = {
      id: `p${Date.now()}`,
      ...form,
      regMonth: 0, paidMonth: 0, aiMockMins: 0, conversionRate: 0,
      totalReg: 0, totalPaid: 0,
      status: "Active",
    };
    setPgsList(prev => [...prev, newMember]);
    setShowModal(false);
    setForm({ name:"", email:"", school:"", level:"Lv1", referralCode:"", promoCode:"", startDate:"", payoutMethod:"Wise" });
    toast.success(`${newMember.name} added as PGS member`);
  };

  const openEditModal = (p: PGSMember) => {
    setEditModalPGS(p);
    setEditForm({
      name: p.name, email: p.email, school: p.school, level: p.level,
      referralCode: p.referralCode, startDate: p.startDate, payoutMethod: p.payoutMethod,
    });
    setDeactivateConfirm(false);
  };

  const handleEditSave = () => {
    if (!editModalPGS) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setPgsList(prev => prev.map(p => p.id === editModalPGS.id ? { ...p, ...editForm } : p));
    setEditModalPGS(null);
    toast.success(`Changes saved for ${editForm.name}`);
  };

  const handleDeactivate = () => {
    if (!editModalPGS) return;
    setPgsList(prev => prev.map(p => p.id === editModalPGS.id ? { ...p, status: "Deactivated" } : p));
    setEditModalPGS(null);
    toast.success(`${editForm.name} deactivated`);
  };

  // ── Overview view ──────────────────────────────────────────────────────────
  const monthlyPaid = pgsList.reduce((s, p) => s + p.paidMonth, 0);
  const goalPct     = Math.min(Math.round((monthlyPaid / goalTarget) * 100), 100);

  const filteredOverview = pgsList.filter(p => {
    const isArchived = archivedIds.has(p.id) || p.status === "Deactivated";
    if (overviewStatus === "Active"   && isArchived)  return false;
    if (overviewStatus === "Archived" && !isArchived) return false;
    if (overviewLevelFilter !== "All" && p.level !== overviewLevelFilter) return false;
    if (overviewSearch && !p.name.toLowerCase().includes(overviewSearch.toLowerCase()) && !p.email.toLowerCase().includes(overviewSearch.toLowerCase())) return false;
    return true;
  });

  const activeMemberCount = pgsList.filter(p => !archivedIds.has(p.id) && p.status !== "Deactivated").length;

  const overviewView = (
    <div style={{ padding: "20px 24px" }}>
      {/* 5 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 }}>
        {([
          { label: "PGS Members",      value: activeMemberCount,  sub: "active partners",        color: C.blue    },
          { label: "Registered Users", value: fmtNum(totalReg),   sub: "cumulative total",       color: "#16A34A" },
          { label: "Paid Users",       value: fmtNum(totalPaid),  sub: "cumulative conversions", color: "#7C3AED" },
          { label: "AI Mock Duration", value: fmtMins(totalMins), sub: "total across all PGS",   color: "#D97706" },
        ] as const).map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 20px", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{s.sub}</div>
          </div>
        ))}

        {/* Month Goal card */}
        <div style={{ ...card, padding: "16px 20px", borderTop: `3px solid #DC2626` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>Month Goal</div>
            <button onClick={() => setGoalEditing(true)} style={{ background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: 2, cursor: "pointer", color: C.textSub, display: "flex", alignItems: "center" }}>
              <Pencil size={12} />
            </button>
          </div>
          {goalEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#DC2626" }}>{monthlyPaid}</span>
              <span style={{ fontSize: 16, color: C.textSub }}>/</span>
              <input
                type="number"
                value={goalTarget}
                onChange={e => setGoalTarget(Math.max(1, parseInt(e.target.value) || 1))}
                onBlur={() => setGoalEditing(false)}
                onKeyDown={e => e.key === "Enter" && setGoalEditing(false)}
                autoFocus
                style={{ width: 52, height: 28, padding: "0 6px", background: C.bgSubtle, border: `1px solid ${C.blue}`, borderRadius: 5, fontSize: 14, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none" }}
              />
            </div>
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: "#DC2626", lineHeight: 1, marginBottom: 6 }}>
              {monthlyPaid} <span style={{ fontSize: 16, color: C.textSub, fontWeight: 400 }}>/ {goalTarget}</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>paid users this month</div>
          <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
            <div style={{ width: `${goalPct}%`, height: "100%", background: "#DC2626", borderRadius: 3, transition: "width 300ms ease" }} />
          </div>
          <div style={{ fontSize: 11, color: C.textSub }}>{goalPct}% of goal reached</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.textSub, pointerEvents: "none" }} />
          <input
            value={overviewSearch}
            onChange={e => setOverviewSearch(e.target.value)}
            placeholder="Search PGS..."
            style={{ height: 30, paddingLeft: 26, paddingRight: 10, background: C.bgWhite, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", width: 160 }}
          />
        </div>

        {(["All", "Lv3", "Lv2", "Lv1", "Lv0"] as const).map(l => (
          <button key={l} onClick={() => setOverviewLevelFilter(l)} style={filterChip(overviewLevelFilter === l)}>{l}</button>
        ))}

        <div style={{ width: 1, height: 18, background: C.border, margin: "0 2px" }} />

        {(["Active", "Archived"] as const).map(s => (
          <button
            key={s}
            onClick={() => setOverviewStatus(s)}
            style={{
              height: 28, padding: "0 12px", borderRadius: 6, fontSize: 12,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              background: overviewStatus === s ? C.bgSubtle : "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: overviewStatus === s ? `2px solid ${C.blue}` : "2px solid transparent",
              color: overviewStatus === s ? C.text : C.textSub,
              fontWeight: overviewStatus === s ? 600 : 400,
            }}
          >
            {s}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowModal(true)} style={{ ...primaryBtn, height: 32, gap: 6 }}>
          <Plus size={13} /> Add PGS
        </button>
      </div>

      {/* Table */}
      <div style={{ ...card }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TH}>PGS Name</th>
              <th style={TH}>Level</th>
              <th style={TH}>Email</th>
              <th style={TH}>Referral Link</th>
              <th style={{ ...TH, textAlign: "right" }}>Reg</th>
              <th style={{ ...TH, textAlign: "right" }}>Paid</th>
              <th style={{ ...TH, textAlign: "right" }}>AI Mock</th>
              <th style={{ ...TH, textAlign: "right" }}>Conv.%</th>
              <th style={{ ...TH, textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOverview.map(p => {
              const rowConv = p.regMonth > 0 ? (p.paidMonth / p.regMonth * 100) : 0;
              const refLink = `https://app.screna.io/ref/${p.referralCode}`;
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid hsl(220, 16%, 94%)` }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220, 20%, 98%)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                >
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.status === "Deactivated" ? "#E5E7EB" : `hsl(${p.name.charCodeAt(0) * 23 % 360}, 55%, 66%)`, fontSize: 10, fontWeight: 700, color: p.status === "Deactivated" ? "#9CA3AF" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: p.status === "Deactivated" ? "#9CA3AF" : C.text, textDecoration: p.status === "Deactivated" ? "line-through" : "none" }}>{p.name}</span>
                        {p.status === "Deactivated" && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>Deactivated</span>}
                      </div>
                    </div>
                  </td>
                  <td style={TD}><span style={badge(LEVEL_VARIANT[p.level] || "gray")}>{p.level}</span></td>
                  <td style={{ ...TD, fontSize: 12, color: C.textMid }}>{p.email}</td>
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a href={refLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue, textDecoration: "none", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {refLink}
                      </a>
                      <button
                        onClick={() => { navigator.clipboard.writeText(refLink); toast.success("Copied!"); }}
                        style={{ background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: 2, cursor: "pointer", color: C.textSub, display: "flex", alignItems: "center" }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 13 }}>{p.regMonth}</td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 13, fontWeight: 700, color: C.text }}>{p.paidMonth}</td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 12, color: C.textMid }}>{fmtMins(p.aiMockMins)}</td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 12, fontWeight: 600, color: rowConv >= 20 ? C.green : rowConv >= 10 ? C.blue : C.textMid }}>
                    {rowConv.toFixed(1)}%
                  </td>
                  <td style={{ ...TD, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <button onClick={() => openDetail(p.id)} style={{ background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "2px 4px", cursor: "pointer", fontSize: 12, color: C.blue, fontFamily: "'Inter', sans-serif" }}>View</button>
                      <button onClick={() => openEditModal(p)} style={{ background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "2px 4px", cursor: "pointer", fontSize: 12, color: C.textMid, fontFamily: "'Inter', sans-serif" }}>Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredOverview.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...TD, textAlign: "center", color: C.textSub, height: 60 }}>No PGS members match the current filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Detail view ────────────────────────────────────────────────────────────
  const detailView = selectedPGS ? (
    <div style={{ padding: "24px 32px" }}>
      {/* Top Profile Card */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {/* Left main info card */}
        <div style={{ ...card, flex: 1, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#C084FC", fontSize: 16, fontWeight: 600, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {selectedPGS.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>{selectedPGS.name}</span>
              <span style={badge(LEVEL_VARIANT[selectedPGS.level] || "gray")}>{selectedPGS.level}</span>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>EMAIL</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{selectedPGS.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>START DATE</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{selectedPGS.startDate}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>PAYOUT METHOD</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{selectedPGS.payoutMethod}</div>
            </div>
          </div>
        </div>

        {/* Right Referral link card */}
        <div style={{ ...card, width: 320, padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>REFERRAL LINK</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", boxSizing: "border-box" }}>
              <a href={`https://app.screna.io/ref/${selectedPGS.referralCode}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {`https://app.screna.io/ref/${selectedPGS.referralCode}`}
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(`https://app.screna.io/ref/${selectedPGS.referralCode}`); toast.success("Copied!"); }}
                style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center" }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User table */}
      <div style={{ ...card }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Users under {selectedPGS.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
              <input
                value={detailSearch}
                onChange={e => setDetailSearch(e.target.value)}
                placeholder="Search users..."
                style={{ height: 32, paddingLeft: 32, paddingRight: 12, background: "#F9FAFB", border: `1px solid #E5E7EB`, borderRadius: 6, fontSize: 13, fontFamily: "'Inter', sans-serif", color: "#111827", outline: "none", width: 220 }}
              />
            </div>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 4, background: "#F3F4F6", padding: 4, borderRadius: 6 }}>
              {["all", "activated", "paid", "refunded"].map(f => (
                <button
                  key={f}
                  onClick={() => setDetailFilter(f)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    border: "none",
                    background: detailFilter === f ? "#FFFFFF" : "transparent",
                    color: detailFilter === f ? "#111827" : "#6B7280",
                    boxShadow: detailFilter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    textTransform: "capitalize",
                  }}
                >
                  {f === "activated" ? "Activated" : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{...TH, textAlign: "left"}}>USER</th>
              <th style={{...TH, textAlign: "left"}}>REG DATE</th>
              <th style={{...TH, textAlign: "left"}}>FIRST MOCK</th>
              <th style={{...TH, textAlign: "left"}}>PLAN TYPE</th>
              <th style={{...TH, textAlign: "left"}}>PAYMENT STATUS</th>
              <th style={{...TH, textAlign: "left"}}>FIRST TIME PAY DATE</th>
              <th style={{...TH, textAlign: "left"}}>AI MOCK</th>
              <th style={{...TH, textAlign: "left"}}>AI MOCK SESSIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid #F3F4F6` }}>
                <td style={TD}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 2 }}>{u.nickname}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{u.email}</div>
                </td>
                <td style={{ ...TD, fontSize: 13, color: "#374151" }}>{u.regDate}</td>
                <td style={{ ...TD, fontSize: 13, color: u.firstMock === "—" ? "#9CA3AF" : "#374151" }}>{u.firstMock}</td>
                <td style={TD}>
                  <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, color: PLAN_VARIANT[u.planType].color, background: PLAN_VARIANT[u.planType].bg }}>
                    {u.planType}
                  </span>
                </td>
                <td style={TD}>
                  <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, color: PAY_VARIANT[u.payStatus].color, background: PAY_VARIANT[u.payStatus].bg }}>
                    {u.payStatus}
                  </span>
                </td>
                <td style={{ ...TD, fontSize: 13, color: u.payDate === "—" ? "#9CA3AF" : "#374151" }}>{u.payDate}</td>
                <td style={{ ...TD, fontSize: 13, color: u.aiMockMins > 0 ? fmtMins(u.aiMockMins) : "—" }}>{u.aiMockMins > 0 ? fmtMins(u.aiMockMins) : "—"}</td>
                <td style={{ ...TD, fontSize: 13, color: u.mockCount > 0 ? "#374151" : "#9CA3AF" }}>{u.mockCount > 0 ? u.mockCount : "—"}</td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...TD, textAlign: "center", color: C.textSub, height: 60 }}>No users match the current filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textSub, fontSize: 13 }}>
      Select a PGS member to view detail.
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>

      {/* Tab bar / detail breadcrumb */}
      {tab !== "detail" ? (
        <div style={{ background: C.bgWhite, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", height: 44, flexShrink: 0 }}>
          <button
            onClick={() => setTab("overview")}
            style={{
              height: "100%", padding: "0 16px", background: "transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: `2px solid ${C.blue}`,
              color: C.blue,
              fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              marginRight: 2, flexShrink: 0,
            }}
          >
            Overview
          </button>
        </div>
      ) : (
        <div style={{ background: C.bgWhite, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", height: 48, flexShrink: 0, gap: 12 }}>
          <button onClick={() => setTab("overview")} style={{ ...ghostBtn, gap: 6, color: "#6B7280", fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ width: 1, height: 16, background: "#E5E7EB" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>PGS Management</span>
            <span style={{ fontSize: 13, color: "#D1D5DB" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{selectedPGS?.name}</span>
            {selectedPGS && <span style={badge(LEVEL_VARIANT[selectedPGS.level] || "gray")}>{selectedPGS.level}</span>}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "overview" && overviewView}
        {tab === "detail"   && detailView}
      </div>

      {/* Add PGS Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "hsl(222 22% 10% / 0.5)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: C.bgWhite, borderRadius: 12, width: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px hsl(222 22% 10% / 0.2)", fontFamily: "'Inter', sans-serif" }}>
            {/* Modal header */}
            <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Add PGS Member</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Create a new PGS partner and assign their codes</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}><X size={18} /></button>
            </div>

            {/* Form */}
            <div style={{ padding: "0" }}>
              {/* Section 1 - Basic Information */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>1</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Basic Information</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 12px", marginBottom: 16 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Full Name <span style={{ color: "#DC2626" }}>*</span></label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Kevin Zhang" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Email <span style={{ color: "#DC2626" }}>*</span></label>
                    <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@school.edu" type="email" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>School / Community</label>
                    <input value={form.school} onChange={e => setForm(f => ({...f, school: e.target.value}))} placeholder="e.g. UC Berkeley" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Start Date</label>
                    <input value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} type="text" placeholder="MM/DD/YYYY" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                </div>
              </div>

              {/* Section 2 - Program Setup */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Program Setup</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Level</label>
                    <div style={{ position: "relative" }}>
                      <select value={form.level} onChange={e => setForm(f => ({...f, level: e.target.value as Level}))} style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB", appearance: "none", cursor: "pointer", paddingRight: 32 }}>
                        {(["Lv0", "Lv1", "Lv2", "Lv3"] as Level[]).map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <div style={{ position: "absolute", right: 10, top: 10, pointerEvents: "none", color: "#6B7280" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 8, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ ...labelStyle, color: "#6B7280", marginBottom: 0 }}>Referral Link</label>
                      <span style={{ fontSize: 11, color: "#059669" }}>Generates a personalized URL</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 4px 4px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9CA3AF" }}>.../ref/</span>
                      <input 
                        value={form.referralCode} 
                        onChange={e => setForm(f => ({...f, referralCode: e.target.value}))} 
                        placeholder="NAME-REF" 
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: C.text }} 
                      />
                      <button style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#059669", fontSize: 12, fontWeight: 600, padding: "0 12px", height: 28, borderRadius: 4, cursor: "pointer" }}>
                        Generate Link
                      </button>
                    </div>
                  </div>

                  {/* Payout method */}
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Payout Method</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["Wise", "Alipay", "PayPal"] as PayoutMethod[]).map(m => {
                        const isActive = form.payoutMethod === m;
                        return (
                          <button
                            key={m}
                            onClick={() => setForm(f => ({...f, payoutMethod: m}))}
                            style={{
                              flex: 1, height: 36, borderRadius: 6, cursor: "pointer",
                              background: "#fff",
                              border: `1px solid ${isActive ? C.blue : "#E5E7EB"}`,
                              color: isActive ? C.blue : C.text,
                              fontSize: 13, fontWeight: isActive ? 600 : 400,
                              fontFamily: "'Inter', sans-serif", transition: "all 120ms",
                              boxShadow: isActive ? `0 0 0 1px ${C.blue}` : "none"
                            }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Preview</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>Level:</span>
                        <span style={badge("blue")}>{form.level || "Lv1"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>Payout:</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{form.payoutMethod || "Wise"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ ...secondaryBtn, height: 36, padding: "0 20px", background: "#fff", border: "1px solid #E5E7EB" }}>Cancel</button>
              <button onClick={handleAddPGS} style={{ ...primaryBtn, height: 36, padding: "0 20px", gap: 6 }}>
                <Plus size={14} /> Create PGS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit PGS Modal */}
      {editModalPGS && (
        <div
          style={{ position: "fixed", inset: 0, background: "hsl(222 22% 10% / 0.5)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditModalPGS(null); }}
        >
          <div style={{ background: C.bgWhite, borderRadius: 12, width: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px hsl(222 22% 10% / 0.2)", fontFamily: "'Inter', sans-serif" }}>
            {/* Modal header */}
            <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Edit PGS Member</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Update partner information and account status</div>
              </div>
              <button onClick={() => setEditModalPGS(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}><X size={18} /></button>
            </div>

            {/* Form */}
            <div style={{ padding: "0" }}>
              {/* Section 1 - Basic Information */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>1</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Basic Information</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 12px", marginBottom: 16 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Full Name <span style={{ color: "#DC2626" }}>*</span></label>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Kevin Zhang" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Email <span style={{ color: "#DC2626" }}>*</span></label>
                    <input value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))} placeholder="email@school.edu" type="email" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>School / Community</label>
                    <input value={editForm.school} onChange={e => setEditForm(f => ({...f, school: e.target.value}))} placeholder="e.g. UC Berkeley" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Start Date</label>
                    <input value={editForm.startDate} onChange={e => setEditForm(f => ({...f, startDate: e.target.value}))} type="text" placeholder="MM/DD/YYYY" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                </div>
              </div>

              {/* Section 2 - Program Setup */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Program Setup</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Level</label>
                    <div style={{ position: "relative" }}>
                      <select value={editForm.level} onChange={e => setEditForm(f => ({...f, level: e.target.value as Level}))} style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB", appearance: "none", cursor: "pointer", paddingRight: 32 }}>
                        {(["Lv0", "Lv1", "Lv2", "Lv3"] as Level[]).map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      <div style={{ position: "absolute", right: 10, top: 10, pointerEvents: "none", color: "#6B7280" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 8, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ ...labelStyle, color: "#6B7280", marginBottom: 0 }}>Referral Link</label>
                      <span style={{ fontSize: 11, color: "#059669" }}>Generates a personalized URL</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 4px 4px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9CA3AF" }}>.../ref/</span>
                      <input 
                        value={editForm.referralCode} 
                        onChange={e => setEditForm(f => ({...f, referralCode: e.target.value}))} 
                        placeholder="NAME-REF" 
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: C.text }} 
                      />
                      <button style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#059669", fontSize: 12, fontWeight: 600, padding: "0 12px", height: 28, borderRadius: 4, cursor: "pointer" }}>
                        Generate Link
                      </button>
                    </div>
                  </div>

                  {/* Payout method */}
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Payout Method</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["Wise", "Alipay", "PayPal"] as PayoutMethod[]).map(m => {
                        const isActive = editForm.payoutMethod === m;
                        return (
                          <button
                            key={m}
                            onClick={() => setEditForm(f => ({...f, payoutMethod: m}))}
                            style={{
                              flex: 1, height: 36, borderRadius: 6, cursor: "pointer",
                              background: "#fff",
                              border: `1px solid ${isActive ? C.blue : "#E5E7EB"}`,
                              color: isActive ? C.blue : C.text,
                              fontSize: 13, fontWeight: isActive ? 600 : 400,
                              fontFamily: "'Inter', sans-serif", transition: "all 120ms",
                              boxShadow: isActive ? `0 0 0 1px ${C.blue}` : "none"
                            }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Account Status</div>
                {deactivateConfirm ? (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "16px" }}>
                    <div style={{ fontWeight: 600, color: "#991B1B", marginBottom: 4, fontSize: 14 }}>Are you sure you want to deactivate {editForm.name}?</div>
                    <div style={{ fontSize: 13, color: "#B91C1C", marginBottom: 16 }}>This action cannot be undone. They will lose access to the partner portal immediately.</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setDeactivateConfirm(false)} style={{ ...ghostBtn, color: "#991B1B", padding: "0 14px", height: 32, fontSize: 13 }}>Cancel</button>
                      <button onClick={handleDeactivate} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, padding: "0 14px", height: 32, fontSize: 13, cursor: "pointer" }}>Yes, Deactivate</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FEF2F2", borderRadius: 8, padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#991B1B", fontSize: 14, marginBottom: 2 }}>Deactivate Account</div>
                      <div style={{ fontSize: 12, color: "#B91C1C" }}>Remove access and archive this partner</div>
                    </div>
                    <button onClick={() => setDeactivateConfirm(true)} style={{ background: "#fff", border: "1px solid #FECACA", color: "#DC2626", fontWeight: 600, padding: "0 16px", height: 32, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Deactivate Account</button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setEditModalPGS(null)} style={{ ...secondaryBtn, height: 36, padding: "0 20px", background: "#fff", border: "1px solid #E5E7EB" }}>Cancel</button>
              <button onClick={handleEditSave} style={{ ...primaryBtn, height: 36, padding: "0 20px" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
