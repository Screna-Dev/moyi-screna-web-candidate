import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, X, Pencil, Copy, Loader2 } from "lucide-react";
import {
  C, badge, TH, TD, primaryBtn, secondaryBtn, ghostBtn, filterChip, card,
} from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";
import { adminService } from "@/services";

// ── Backend ↔ UI type maps ───────────────────────────────────────────────────
type ApiLevel = "LV0" | "LV1" | "LV2" | "LV3";
type ApiPayoutMethod = "WISE" | "ALIPAY" | "PAYPAL";
type ApiStatus = "ACTIVE" | "ARCHIVED";
type UiLevel = "Lv0" | "Lv1" | "Lv2" | "Lv3";
type UiPayoutMethod = "Wise" | "Alipay" | "PayPal";

const toUiLevel = (l: ApiLevel): UiLevel => (l.charAt(0) + l.slice(1).toLowerCase()) as UiLevel;
const toApiLevel = (l: UiLevel): ApiLevel => l.toUpperCase() as ApiLevel;
const toUiPayout = (p: ApiPayoutMethod): UiPayoutMethod =>
  p === "WISE" ? "Wise" : p === "ALIPAY" ? "Alipay" : "PayPal";
const toApiPayout = (p: UiPayoutMethod): ApiPayoutMethod => p.toUpperCase() as ApiPayoutMethod;

type PayStatus = "Renewed" | "First Month Paid" | "Refunded" | "Unpaid";
type PlanType = "Premium Plan" | "Starter Plan";

const LEVEL_VARIANT: Record<UiLevel, BadgeVariant> = {
  "Lv0": "gray",
  "Lv1": "blue",
  "Lv2": "purple",
  "Lv3": "amber",
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

interface PGSMemberRow {
  id: string;
  fullName: string;
  email: string;
  level: ApiLevel;
  referralSlug: string;
  referralUrl: string;
  payoutMethod: ApiPayoutMethod;
  status: ApiStatus;
  isActive?: boolean;
  schoolCommunity?: string;
  startDate?: string;
  createdAt?: string;
  stats: {
    reg: number;
    paid: number;
    aiMockMinutes: number;
    sessions: number;
    conversionRate: number;
  };
}

interface PGSMemberDetail extends Omit<PGSMemberRow, "stats"> {
  isActive: boolean;
  internalNotes?: string;
}

interface AttributedUser {
  userId: string;
  name: string;
  email: string;
  regDate: string | null;
  firstMockDate: string | null;
  planType: string | null;
  firstTimePayDate: string | null;
  aiMockMinutes: number;
  sessions: number;
}

interface GlobalStats {
  totalPgsMembers: number;
  totalRegisteredUsers: number;
  totalPaidUsers: number;
  totalAiMockMinutes: number;
  currentMonthGoal: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMins = (m: number) => m >= 120 ? `${Math.round(m / 60)} hrs` : `${m} min`;
const fmtNum  = (n: number) => n.toLocaleString();
const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  // accept either YYYY-MM-DD or full ISO; show YYYY-MM-DD
  return d.length >= 10 ? d.slice(0, 10) : d;
};
const derivePayStatus = (u: AttributedUser): PayStatus => {
  if (!u.firstTimePayDate) return "Unpaid";
  // The backend currently exposes planType + firstTimePayDate but not refund/renewal state;
  // treat any paid user as "First Month Paid" until richer status is surfaced.
  return "First Month Paid";
};
const normalizePlan = (p: string | null | undefined): PlanType => {
  if (!p) return "Starter Plan";
  const low = p.toLowerCase();
  if (low.includes("premium") || low.includes("elite") || low.includes("pro")) return "Premium Plan";
  return "Starter Plan";
};

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

const extractErr = (e: any, fallback: string) =>
  e?.response?.data?.message || e?.message || fallback;

// ── Component ─────────────────────────────────────────────────────────────────
export function PGS() {
  const [tab, setTab]                       = useState<"overview" | "detail">("overview");
  const [selectedPGSId, setSelectedPGSId]   = useState<string | null>(null);

  // Overview state
  const [pgsList, setPgsList]               = useState<PGSMemberRow[]>([]);
  const [loadingList, setLoadingList]       = useState(false);
  const [overviewSearch, setOverviewSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overviewLevelFilter, setOverviewLevelFilter] = useState<"All" | UiLevel>("All");
  const [overviewStatus, setOverviewStatus] = useState<"Active" | "Archived">("Active");
  const [globalStats, setGlobalStats]       = useState<GlobalStats | null>(null);

  // Modal state
  const [showModal, setShowModal]           = useState(false);
  const [creating, setCreating]             = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [form, setForm] = useState<{
    name: string; email: string; school: string; level: UiLevel;
    referralSlug: string; startDate: string; payoutMethod: UiPayoutMethod;
  }>({ name:"", email:"", school:"", level:"Lv1", referralSlug:"", startDate:"", payoutMethod:"Wise" });

  const [editModalPGS, setEditModalPGS] = useState<PGSMemberRow | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string; email: string; school: string; level: UiLevel;
    referralSlug: string; startDate: string; payoutMethod: UiPayoutMethod;
    isActive: boolean; internalNotes: string;
  }>({ name:"", email:"", school:"", level:"Lv1", referralSlug:"", startDate:"", payoutMethod:"Wise", isActive: true, internalNotes: "" });
  const [savingEdit, setSavingEdit]         = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [archiving, setArchiving]           = useState(false);

  // Detail state
  const [detailMember, setDetailMember]     = useState<PGSMemberDetail | null>(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);
  const [userRows, setUserRows]             = useState<AttributedUser[]>([]);
  const [loadingUsers, setLoadingUsers]     = useState(false);
  const [detailFilter, setDetailFilter]     = useState("all");
  const [detailSearch, setDetailSearch]     = useState("");
  const [debouncedDetailSearch, setDebouncedDetailSearch] = useState("");

  // ── Debounce search inputs ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(overviewSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [overviewSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDetailSearch(detailSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [detailSearch]);

  // ── Load global stats ────────────────────────────────────────────────────
  const loadGlobalStats = useCallback(async () => {
    try {
      const filterStatus = overviewStatus === "Active" ? "NOT_ARCHIVED" : "ARCHIVED";
      const res = await adminService.getPgsGlobalStats(filterStatus);
      setGlobalStats(res.data?.data ?? null);
    } catch (e) {
      console.error("Failed to load PGS global stats", e);
    }
  }, [overviewStatus]);

  // ── Load member list ─────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const params: Record<string, any> = {
        page: 0,
        size: 100,
        status: overviewStatus === "Active" ? "ACTIVE" : "ARCHIVED",
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (overviewLevelFilter !== "All") params.level = toApiLevel(overviewLevelFilter);
      const res = await adminService.listPgsMembers(params);
      const rows: PGSMemberRow[] = res.data?.data?.content ?? [];
      setPgsList(rows);
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to load PGS members"));
      setPgsList([]);
    } finally {
      setLoadingList(false);
    }
  }, [debouncedSearch, overviewLevelFilter, overviewStatus]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadGlobalStats(); }, [loadGlobalStats]);

  // ── Load member detail + users ───────────────────────────────────────────
  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await adminService.getPgsMember(id);
      setDetailMember(res.data?.data ?? null);
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to load PGS member"));
      setDetailMember(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadUsers = useCallback(async (id: string, search: string) => {
    setLoadingUsers(true);
    try {
      const params: Record<string, any> = { page: 0, size: 100 };
      if (search) params.search = search;
      const res = await adminService.listPgsMemberUsers(id, params);
      setUserRows(res.data?.data?.content ?? []);
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to load attributed users"));
      setUserRows([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "detail" && selectedPGSId) {
      loadDetail(selectedPGSId);
    }
  }, [tab, selectedPGSId, loadDetail]);

  useEffect(() => {
    if (tab === "detail" && selectedPGSId) {
      loadUsers(selectedPGSId, debouncedDetailSearch);
    }
  }, [tab, selectedPGSId, debouncedDetailSearch, loadUsers]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const openDetail = (id: string) => {
    setSelectedPGSId(id);
    setTab("detail");
    setDetailFilter("all");
    setDetailSearch("");
    setUserRows([]);
    setDetailMember(null);
  };

  // Debounce slug suggestion while typing a name on the Add form (only if blank).
  const slugDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!showModal) return;
    if (slugDebounceRef.current) window.clearTimeout(slugDebounceRef.current);
    if (!form.name.trim() || form.referralSlug.trim()) return;
    slugDebounceRef.current = window.setTimeout(async () => {
      try {
        const res = await adminService.generatePgsSlug(form.name.trim());
        const suggested = res.data?.data?.suggestedSlug;
        if (suggested) setForm(f => f.referralSlug ? f : ({ ...f, referralSlug: suggested }));
      } catch {
        // silent — user can type a slug manually
      }
    }, 500);
    return () => {
      if (slugDebounceRef.current) window.clearTimeout(slugDebounceRef.current);
    };
  }, [form.name, showModal, form.referralSlug]);

  const handleGenerateSlug = async () => {
    if (!form.name.trim()) {
      toast.error("Enter a name first to generate a slug");
      return;
    }
    setGeneratingSlug(true);
    try {
      const res = await adminService.generatePgsSlug(form.name.trim());
      const suggested = res.data?.data?.suggestedSlug;
      if (suggested) setForm(f => ({ ...f, referralSlug: suggested }));
      else toast.error("No slug suggestion returned");
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to generate slug"));
    } finally {
      setGeneratingSlug(false);
    }
  };

  const handleAddPGS = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!form.referralSlug.trim()) {
      toast.error("Referral slug is required");
      return;
    }
    setCreating(true);
    try {
      await adminService.createPgsMember({
        fullName: form.name.trim(),
        email: form.email.trim(),
        level: toApiLevel(form.level),
        referralSlug: form.referralSlug.trim(),
        payoutMethod: toApiPayout(form.payoutMethod),
        schoolCommunity: form.school.trim() || undefined,
        startDate: form.startDate || undefined,
      });
      toast.success(`${form.name} added as PGS member`);
      setShowModal(false);
      setForm({ name:"", email:"", school:"", level:"Lv1", referralSlug:"", startDate:"", payoutMethod:"Wise" });
      await Promise.all([loadList(), loadGlobalStats()]);
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to create PGS member"));
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (p: PGSMemberRow) => {
    setEditModalPGS(p);
    setEditForm({
      name: p.fullName,
      email: p.email,
      school: p.schoolCommunity ?? "",
      level: toUiLevel(p.level),
      referralSlug: p.referralSlug,
      startDate: p.startDate ?? "",
      payoutMethod: toUiPayout(p.payoutMethod),
      isActive: p.isActive ?? true,
      internalNotes: "",
    });
    setDeactivateConfirm(false);
  };

  const handleEditSave = async () => {
    if (!editModalPGS) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSavingEdit(true);
    try {
      await adminService.updatePgsMember(editModalPGS.id, {
        fullName: editForm.name.trim(),
        email: editForm.email.trim(),
        level: toApiLevel(editForm.level),
        payoutMethod: toApiPayout(editForm.payoutMethod),
        isActive: editForm.isActive,
        schoolCommunity: editForm.school.trim() || undefined,
        startDate: editForm.startDate || undefined,
        internalNotes: editForm.internalNotes || undefined,
      });
      toast.success(`Changes saved for ${editForm.name}`);
      setEditModalPGS(null);
      await loadList();
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to save changes"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchive = async () => {
    if (!editModalPGS) return;
    setArchiving(true);
    try {
      await adminService.archivePgsMember(editModalPGS.id);
      toast.success(`${editForm.name} archived`);
      setEditModalPGS(null);
      await Promise.all([loadList(), loadGlobalStats()]);
    } catch (e: any) {
      toast.error(extractErr(e, "Failed to archive member"));
    } finally {
      setArchiving(false);
    }
  };

  // ── Derived totals (overview KPIs use global stats; row table uses list) ──
  const monthlyPaid = globalStats?.totalPaidUsers ?? 0;
  const goalTarget  = globalStats?.currentMonthGoal ?? 0;
  const goalPct     = goalTarget > 0 ? Math.min(Math.round((monthlyPaid / goalTarget) * 100), 100) : 0;

  const filteredUsers = userRows.filter(u => {
    if (detailFilter === "activated") return !!u.firstMockDate;
    if (detailFilter === "paid")      return !!u.firstTimePayDate;
    if (detailFilter === "refunded")  return false; // backend does not yet expose refund status
    return true;
  });

  // ── Overview view ─────────────────────────────────────────────────────────
  const overviewView = (
    <div style={{ padding: "20px 24px" }}>
      {/* 5 KPI cards (from global stats) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 }}>
        {([
          { label: "PGS Members",      value: globalStats ? fmtNum(globalStats.totalPgsMembers)       : "—", sub: "active partners",        color: C.blue    },
          { label: "Registered Users", value: globalStats ? fmtNum(globalStats.totalRegisteredUsers)  : "—", sub: "cumulative total",       color: "#16A34A" },
          { label: "Paid Users",       value: globalStats ? fmtNum(globalStats.totalPaidUsers)        : "—", sub: "cumulative conversions", color: "#7C3AED" },
          { label: "AI Mock Duration", value: globalStats ? fmtMins(globalStats.totalAiMockMinutes)   : "—", sub: "total across all PGS",   color: "#D97706" },
        ] as const).map(s => (
          <div key={s.label} style={{ ...card, padding: "16px 20px", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{s.sub}</div>
          </div>
        ))}

        {/* Month Goal card (read-only — currentMonthGoal comes from backend) */}
        <div style={{ ...card, padding: "16px 20px", borderTop: `3px solid #DC2626` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>Month Goal</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#DC2626", lineHeight: 1, marginBottom: 6 }}>
            {monthlyPaid} <span style={{ fontSize: 16, color: C.textSub, fontWeight: 400 }}>/ {goalTarget || "—"}</span>
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>paid users vs goal</div>
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

        {loadingList && <Loader2 size={14} style={{ color: C.textSub, animation: "spin 1s linear infinite" }} />}

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
            {pgsList.map(p => {
              const uiLevel = toUiLevel(p.level);
              const isDeactivated = p.status === "ACTIVE" && p.isActive === false;
              const conv = p.stats?.conversionRate ?? 0;
              const refLink = p.referralUrl;
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid hsl(220, 16%, 94%)` }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220, 20%, 98%)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                >
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: isDeactivated ? "#E5E7EB" : `hsl(${(p.fullName?.charCodeAt(0) || 0) * 23 % 360}, 55%, 66%)`, fontSize: 10, fontWeight: 700, color: isDeactivated ? "#9CA3AF" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {(p.fullName || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDeactivated ? "#9CA3AF" : C.text, textDecoration: isDeactivated ? "line-through" : "none" }}>{p.fullName}</span>
                        {isDeactivated && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600 }}>Paused</span>}
                      </div>
                    </div>
                  </td>
                  <td style={TD}><span style={badge(LEVEL_VARIANT[uiLevel] || "gray")}>{uiLevel}</span></td>
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
                  <td style={{ ...TD, textAlign: "right", fontSize: 13 }}>{p.stats?.reg ?? 0}</td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 13, fontWeight: 700, color: C.text }}>{p.stats?.paid ?? 0}</td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 12, color: C.textMid }}>{fmtMins(p.stats?.aiMockMinutes ?? 0)}</td>
                  <td style={{ ...TD, textAlign: "right", fontSize: 12, fontWeight: 600, color: conv >= 20 ? C.green : conv >= 10 ? C.blue : C.textMid }}>
                    {conv.toFixed(1)}%
                  </td>
                  <td style={{ ...TD, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <button onClick={() => openDetail(p.id)} style={{ background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "2px 4px", cursor: "pointer", fontSize: 12, color: C.blue, fontFamily: "'Inter', sans-serif" }}>View</button>
                      {p.status === "ACTIVE" && (
                        <button onClick={() => openEditModal(p)} style={{ background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "2px 4px", cursor: "pointer", fontSize: 12, color: C.textMid, fontFamily: "'Inter', sans-serif" }}>Edit</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loadingList && pgsList.length === 0 && (
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
  const detailView = (
    <div style={{ padding: "24px 32px" }}>
      {loadingDetail && !detailMember ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: C.textSub }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} /> Loading PGS member…
        </div>
      ) : !detailMember ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: C.textSub }}>
          Select a PGS member to view detail.
        </div>
      ) : (
        <>
          {/* Top Profile Card */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <div style={{ ...card, flex: 1, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#C084FC", fontSize: 16, fontWeight: 600, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {(detailMember.fullName || "?").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>{detailMember.fullName}</span>
                  <span style={badge(LEVEL_VARIANT[toUiLevel(detailMember.level)] || "gray")}>{toUiLevel(detailMember.level)}</span>
                  {detailMember.status === "ARCHIVED" && <span style={badge("gray")}>Archived</span>}
                  {detailMember.status === "ACTIVE" && !detailMember.isActive && <span style={badge("red")}>Paused</span>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>EMAIL</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{detailMember.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>START DATE</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{fmtDate(detailMember.startDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>PAYOUT METHOD</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{toUiPayout(detailMember.payoutMethod)}</div>
                </div>
              </div>
            </div>

            <div style={{ ...card, width: 320, padding: "24px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>REFERRAL LINK</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", boxSizing: "border-box" }}>
                  <a href={detailMember.referralUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {detailMember.referralUrl}
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(detailMember.referralUrl); toast.success("Copied!"); }}
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
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Users under {detailMember.fullName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {loadingUsers && <Loader2 size={14} style={{ color: C.textSub, animation: "spin 1s linear infinite" }} />}
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }} />
                  <input
                    value={detailSearch}
                    onChange={e => setDetailSearch(e.target.value)}
                    placeholder="Search users..."
                    style={{ height: 32, paddingLeft: 32, paddingRight: 12, background: "#F9FAFB", border: `1px solid #E5E7EB`, borderRadius: 6, fontSize: 13, fontFamily: "'Inter', sans-serif", color: "#111827", outline: "none", width: 220 }}
                  />
                </div>
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
                {filteredUsers.map(u => {
                  const planType = normalizePlan(u.planType);
                  const payStatus = derivePayStatus(u);
                  return (
                    <tr key={u.userId} style={{ borderBottom: `1px solid #F3F4F6` }}>
                      <td style={TD}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 2 }}>{u.name || "—"}</div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>{u.email}</div>
                      </td>
                      <td style={{ ...TD, fontSize: 13, color: "#374151" }}>{fmtDate(u.regDate)}</td>
                      <td style={{ ...TD, fontSize: 13, color: !u.firstMockDate ? "#9CA3AF" : "#374151" }}>{fmtDate(u.firstMockDate)}</td>
                      <td style={TD}>
                        <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, color: PLAN_VARIANT[planType].color, background: PLAN_VARIANT[planType].bg }}>
                          {planType}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, color: PAY_VARIANT[payStatus].color, background: PAY_VARIANT[payStatus].bg }}>
                          {payStatus}
                        </span>
                      </td>
                      <td style={{ ...TD, fontSize: 13, color: !u.firstTimePayDate ? "#9CA3AF" : "#374151" }}>{fmtDate(u.firstTimePayDate)}</td>
                      <td style={{ ...TD, fontSize: 13, color: u.aiMockMinutes > 0 ? "#374151" : "#9CA3AF" }}>{u.aiMockMinutes > 0 ? fmtMins(u.aiMockMinutes) : "—"}</td>
                      <td style={{ ...TD, fontSize: 13, color: u.sessions > 0 ? "#374151" : "#9CA3AF" }}>{u.sessions > 0 ? u.sessions : "—"}</td>
                    </tr>
                  );
                })}
                {!loadingUsers && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...TD, textAlign: "center", color: C.textSub, height: 60 }}>No users match the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const detailHeaderMember = detailMember;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>

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
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{detailHeaderMember?.fullName ?? "…"}</span>
            {detailHeaderMember && <span style={badge(LEVEL_VARIANT[toUiLevel(detailHeaderMember.level)] || "gray")}>{toUiLevel(detailHeaderMember.level)}</span>}
          </div>
        </div>
      )}

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
            <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Add PGS Member</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Create a new PGS partner and assign their codes</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}><X size={18} /></button>
            </div>

            <div style={{ padding: "0" }}>
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
                    <input value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} type="date" lang="en" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Program Setup</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Level</label>
                    <div style={{ position: "relative" }}>
                      <select value={form.level} onChange={e => setForm(f => ({...f, level: e.target.value as UiLevel}))} style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB", appearance: "none", cursor: "pointer", paddingRight: 32 }}>
                        {(["Lv0", "Lv1", "Lv2", "Lv3"] as UiLevel[]).map(l => (
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
                      <label style={{ ...labelStyle, color: "#6B7280", marginBottom: 0 }}>Referral Slug <span style={{ color: "#DC2626" }}>*</span></label>
                      <span style={{ fontSize: 11, color: "#059669" }}>Generates a personalized URL</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 4px 4px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9CA3AF" }}>.../pgs/ref/</span>
                      <input
                        value={form.referralSlug}
                        onChange={e => setForm(f => ({...f, referralSlug: e.target.value}))}
                        placeholder="NAME-REF"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: C.text }}
                      />
                      <button
                        onClick={handleGenerateSlug}
                        disabled={generatingSlug}
                        style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#059669", fontSize: 12, fontWeight: 600, padding: "0 12px", height: 28, borderRadius: 4, cursor: generatingSlug ? "wait" : "pointer", opacity: generatingSlug ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        {generatingSlug ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : null}
                        Generate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Payout Method</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["Wise", "Alipay", "PayPal"] as UiPayoutMethod[]).map(m => {
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

                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Preview</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>Level:</span>
                        <span style={badge(LEVEL_VARIANT[form.level] || "blue")}>{form.level || "Lv1"}</span>
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

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowModal(false)} disabled={creating} style={{ ...secondaryBtn, height: 36, padding: "0 20px", background: "#fff", border: "1px solid #E5E7EB", opacity: creating ? 0.6 : 1 }}>Cancel</button>
              <button onClick={handleAddPGS} disabled={creating} style={{ ...primaryBtn, height: 36, padding: "0 20px", gap: 6, opacity: creating ? 0.7 : 1, cursor: creating ? "wait" : "pointer" }}>
                {creating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
                {creating ? "Creating…" : "Create PGS"}
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
            <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Edit PGS Member</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Update partner information and account status</div>
              </div>
              <button onClick={() => setEditModalPGS(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}><X size={18} /></button>
            </div>

            <div style={{ padding: "0" }}>
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
                    <input value={editForm.startDate} onChange={e => setEditForm(f => ({...f, startDate: e.target.value}))} type="date" lang="en" style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB" }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>Program Setup</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Level</label>
                    <div style={{ position: "relative" }}>
                      <select value={editForm.level} onChange={e => setEditForm(f => ({...f, level: e.target.value as UiLevel}))} style={{ ...inputStyle, height: 36, background: "#fff", borderColor: "#E5E7EB", appearance: "none", cursor: "pointer", paddingRight: 32 }}>
                        {(["Lv0", "Lv1", "Lv2", "Lv3"] as UiLevel[]).map(l => (
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
                      <label style={{ ...labelStyle, color: "#6B7280", marginBottom: 0 }}>Referral Slug</label>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>Cannot be changed after creation</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#9CA3AF" }}>.../pgs/ref/</span>
                      <span style={{ flex: 1, fontSize: 13, color: C.textMid }}>{editForm.referralSlug}</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Payout Method</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["Wise", "Alipay", "PayPal"] as UiPayoutMethod[]).map(m => {
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

                  {/* Pause / Resume toggle (isActive) */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: editForm.isActive ? "#F0FDF4" : "#FEF3C7", border: `1px solid ${editForm.isActive ? "#A7F3D0" : "#FDE68A"}`, borderRadius: 8, padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: editForm.isActive ? "#065F46" : "#92400E", marginBottom: 2 }}>
                        {editForm.isActive ? "Referral code enabled" : "Referral code paused"}
                      </div>
                      <div style={{ fontSize: 12, color: editForm.isActive ? "#047857" : "#B45309" }}>
                        Toggle to pause the redeem code without archiving.
                      </div>
                    </div>
                    <button
                      onClick={() => setEditForm(f => ({...f, isActive: !f.isActive}))}
                      style={{ background: "#fff", border: `1px solid ${editForm.isActive ? "#A7F3D0" : "#FDE68A"}`, color: editForm.isActive ? "#065F46" : "#92400E", fontWeight: 600, padding: "0 14px", height: 32, borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                    >
                      {editForm.isActive ? "Pause" : "Resume"}
                    </button>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, color: "#6B7280" }}>Internal Notes</label>
                    <textarea
                      value={editForm.internalNotes}
                      onChange={e => setEditForm(f => ({...f, internalNotes: e.target.value}))}
                      placeholder="Notes only visible to admins…"
                      style={{ ...inputStyle, height: 64, padding: "8px 10px", background: "#fff", borderColor: "#E5E7EB", resize: "vertical", fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                </div>
              </div>

              {/* Archive section */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Archive</div>
                {deactivateConfirm ? (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "16px" }}>
                    <div style={{ fontWeight: 600, color: "#991B1B", marginBottom: 4, fontSize: 14 }}>Archive {editForm.name}?</div>
                    <div style={{ fontSize: 13, color: "#B91C1C", marginBottom: 16 }}>Archive is permanent and will deactivate the redeem code. They will lose access to the partner portal immediately.</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setDeactivateConfirm(false)} disabled={archiving} style={{ ...ghostBtn, color: "#991B1B", padding: "0 14px", height: 32, fontSize: 13 }}>Cancel</button>
                      <button onClick={handleArchive} disabled={archiving} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, padding: "0 14px", height: 32, fontSize: 13, cursor: archiving ? "wait" : "pointer", opacity: archiving ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {archiving && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                        {archiving ? "Archiving…" : "Yes, Archive"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FEF2F2", borderRadius: 8, padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#991B1B", fontSize: 14, marginBottom: 2 }}>Archive Account</div>
                      <div style={{ fontSize: 12, color: "#B91C1C" }}>Permanently remove access and deactivate redeem code</div>
                    </div>
                    <button onClick={() => setDeactivateConfirm(true)} style={{ background: "#fff", border: "1px solid #FECACA", color: "#DC2626", fontWeight: 600, padding: "0 16px", height: 32, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Archive Account</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setEditModalPGS(null)} disabled={savingEdit} style={{ ...secondaryBtn, height: 36, padding: "0 20px", background: "#fff", border: "1px solid #E5E7EB", opacity: savingEdit ? 0.6 : 1 }}>Cancel</button>
              <button onClick={handleEditSave} disabled={savingEdit} style={{ ...primaryBtn, height: 36, padding: "0 20px", gap: 6, opacity: savingEdit ? 0.7 : 1, cursor: savingEdit ? "wait" : "pointer" }}>
                {savingEdit && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
