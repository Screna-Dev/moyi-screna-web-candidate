import { useState } from "react";
import { toast } from "sonner";
import {
  Search, Plus, ExternalLink, Upload, CheckSquare, Square,
  AlertCircle, X, Check, Flag, StickyNote, User, Copy, FileText,
  Shield, Lock, Download, UserCog, RefreshCw, ChevronDown, ChevronRight, Eye, Edit2, ChevronLeft, MoreHorizontal, Clock, Info
} from "lucide-react";
import { C, badge, TH, TD, primaryBtn, secondaryBtn, ghostBtn, filterChip, card, searchInput } from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";
import { EmptyState } from "../ui/EmptyState";
import { ApplicationProfileVault, getProfileSummary } from "../ui/ApplicationProfileVault";
import { copyText } from "../ui/clipboard";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  "OPEN": "amber",
  "IN_PROGRESS": "purple",
  "SUBMITTED": "blue",
  "COMPLETED": "green",
  "FAILED": "red",
  "NEEDS_PROOF": "amber",
  "BLOCKED": "red",
  "New": "blue",
  "Needs review": "amber",
  "Unclaimed": "gray",
};

function renderBadge(status: string) {
  if (status === "SUBMITTED") {
    return <span style={{...badge("blue"), background: "hsl(180 62% 95%)", color: "hsl(180 62% 35%)", borderColor: "hsl(180 62% 78%)"}}>SUBMITTED</span>;
  }
  return <span style={badge(STATUS_VARIANT[status] ?? "gray")}>{status}</span>;
}

function renderProof(proof: string) {
  if (proof === "Uploaded") return <span style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Uploaded</span>;
  return <span style={{ color: C.textSub }}>—</span>;
}

const users = [
  { id: "u1", name: "Emily Zhang",  targetRole: "SWE → FAANG",       ops: "Alex Kim",    openTickets: 8,  progress: { done: 38,  total: 200 }, status: "New", visa: "H1B",     locations: ["SF", "Seattle", "Remote"], salary: "$180k–$220k", resumeStatus: "Approved",        companies: ["Google", "Meta", "Amazon"], notes: "Strong distributed systems. Prioritize L5+. Avoid startups.",   jobTitles: ["Software Engineer", "Staff SWE", "Platform Engineer"] },
  { id: "u2", name: "Marcus Liu",   targetRole: "PM → Series B",      ops: "Jennifer Wu", openTickets: 12, progress: { done: 12,  total: 100 }, status: "Needs review", visa: "Citizen", locations: ["NYC", "Boston"],           salary: "$160k–$180k", resumeStatus: "Awaiting review", companies: ["Stripe", "Notion"],         notes: "Resume needs updating. Waiting on latest version.",            jobTitles: ["Product Manager", "Senior PM", "Group PM"] },
  { id: "u3", name: "Sarah Chen",   targetRole: "Data Eng → Big Tech", ops: "Alex Kim",   openTickets: 3,  progress: { done: 67,  total: 200 }, status: "New", visa: "GC",      locations: ["Seattle", "Remote"],       salary: "$160k–$200k", resumeStatus: "Approved",        companies: ["Microsoft", "Google"],     notes: "On track. Prefers morning Ops hours.",                         jobTitles: ["Data Engineer", "Staff Data Engineer", "Analytics Engineer"] },
  { id: "u4", name: "Ryan Torres",  targetRole: "Backend → Staff",     ops: "Unassigned",  openTickets: 0,  progress: { done: 0,   total: 150 }, status: "Unclaimed",   visa: "Citizen", locations: ["Austin", "Remote"],        salary: "$200k+",     resumeStatus: "Not uploaded",    companies: [],                          notes: "",                                                             jobTitles: ["Backend Engineer", "Staff Engineer"] },
  { id: "u5", name: "Priya Patel",  targetRole: "ML Eng → FAANG",      ops: "Jennifer Wu", openTickets: 5,  progress: { done: 67,  total: 200 }, status: "New", visa: "OPT",     locations: ["SF Bay Area"],            salary: "$200k+",     resumeStatus: "Approved",        companies: ["Google", "Meta", "OpenAI"], notes: "OPT deadline 4 months. Prioritize sponsorship.",               jobTitles: ["ML Engineer", "Research Engineer", "Applied Scientist"] },
];

const ticketsByUser: Record<string, any[]> = {
  u1: [
    { id: "T-001", priority: 220, status: "IN_PROGRESS", company: "Anthropic", role: "Research Engineer, Alignment", ats: "Greenhouse", owner: "Alex Kim", proof: "—", updated: "2h ago", startedAt: "5/18/2026, 6:24 PM", lastActivity: "2h ago" },
    { id: "T-002", priority: 200, status: "OPEN", company: "Stripe", role: "Senior Product Manager, Payments", ats: "Greenhouse", owner: "Unassigned", proof: "—", updated: "Today", location: "New York, NY", created: "Today" },
    { id: "T-003", priority: 180, status: "OPEN", company: "Figma", role: "Software Engineer, Multiplayer", ats: "Greenhouse", owner: "Unassigned", proof: "—", updated: "Yesterday", location: "San Francisco, CA", created: "Yesterday" },
    { id: "T-004", priority: 100, status: "COMPLETED", company: "Notion", role: "Machine Learning Engineer, AI", ats: "Lever", owner: "ops-bob", proof: "Uploaded", updated: "May 18", location: "New York, NY", completedAt: "May 18, 2026", finalStatus: "Completed", submittedBy: "ops-bob" },
    { id: "T-005", priority: 100, status: "FAILED", company: "Linear", role: "Product Designer", owner: "Alex Kim", proof: "—", updated: "May 17", failureReason: "Missing candidate information", failedBy: "Alex Kim", failedAt: "May 17, 2026", attempts: 1, nextStep: "Request user update" },
    { id: "T-006", priority: 150, status: "OPEN", company: "Airbnb", role: "Staff Engineer", ats: "Workday", owner: "Unassigned", location: "Remote", created: "2 days ago" },
    { id: "T-007", priority: 140, status: "OPEN", company: "Apple", role: "Software Engineer", ats: "Workday", owner: "Unassigned", location: "Cupertino, CA", created: "3 days ago" },
    { id: "T-008", priority: 160, status: "IN_PROGRESS", company: "Netflix", role: "Senior SWE", ats: "Lever", owner: "Alex Kim", proof: "—", updated: "30m ago", startedAt: "Today, 9:10 AM", lastActivity: "30m ago" },
    { id: "T-009", priority: 160, status: "SUBMITTED", company: "Netflix", role: "Senior SWE", ats: "Lever", owner: "Alex Kim", proof: "Uploaded", updated: "1h ago", submittedBy: "Alex Kim", submittedAt: "May 19, 2026, 3:42 PM", reviewStatus: "Pending review" },
    { id: "T-010", priority: 100, status: "OPEN", company: "Notion", role: "Machine Learning Engineer, AI", ats: "Lever", owner: "Unassigned", location: "New York, NY", created: "Yesterday" }
  ]
};

const APP_PROFILE_SECTIONS = [
  {
    title: "1. Job Preference",
    fields: [
      { label: "Desired Salary", value: "$120K – $160K / yr" },
      { label: "Employment Type", value: "Full-time" },
      { label: "Work Mode", value: "Remote, Hybrid" },
      { label: "Preferred Cities", value: "San Francisco, CA / New York, NY" },
      { label: "Shift Preference", value: "Day (9am–5pm)" },
      { label: "Willing to Relocate", value: "Yes" },
      { label: "Willing to Travel", value: "Up to 25%" },
    ]
  },
  {
    title: "2. Personal Information",
    fields: [
      { label: "First Name", value: "Alex" },
      { label: "Middle Name", value: "—" },
      { label: "Last Name", value: "Johnson" },
      { label: "Email", value: "alex.johnson@gmail.com" },
      { label: "Phone", value: "+1 (415) 555-0192" },
      { label: "Application Password", value: "Sup3rS3cr3t", isSensitive: true },
    ]
  },
  {
    title: "3. Residential Information",
    fields: [
      { label: "Address Line 1", value: "123 Market Street" },
      { label: "Address Line 2", value: "Apt 4B" },
      { label: "City", value: "San Francisco" },
      { label: "State", value: "CA" },
      { label: "Country", value: "United States" },
      { label: "ZIP Code", value: "94105" },
    ]
  },
  {
    title: "5. Education",
    fields: [
      { label: "Degree", value: "Bachelor's" },
      { label: "Major", value: "Computer Science" },
      { label: "School", value: "UC Berkeley" },
      { label: "Duration", value: "Aug 2019 – May 2023" },
    ]
  },
  {
    title: "6. Online Presence",
    fields: [
      { label: "LinkedIn", value: "linkedin.com/in/alexjohnson" },
      { label: "GitHub", value: "github.com/alexjohnson" },
      { label: "Portfolio / Website", value: "alexjohnson.dev" },
    ]
  },
  {
    title: "7. Job Application Profile",
    fields: [
      { label: "U.S. Citizen", value: "No" },
      { label: "Authorized to Work", value: "Yes" },
      { label: "Needs Sponsorship", value: "Yes" },
      { label: "Visa Type", value: "F-1 OPT" },
      { label: "Earliest Start Date", value: "Immediately" },
      { label: "Overtime Available", value: "Yes" },
      { label: "Security Clearance", value: "None" },
      { label: "Languages", value: "English, Mandarin" },
    ]
  },
  {
    title: "8. Miscellaneous / EEO",
    fields: [
      { label: "Veteran Status", value: "No" },
      { label: "Ethnicity", value: "Asian" },
      { label: "Gender", value: "Male" },
      { label: "Sexual Orientation", value: "Prefer not to say" },
      { label: "Disability Status", value: "No" },
      { label: "Driving License", value: "Yes" },
      { label: "License Expiry", value: "2026-11-30" },
    ]
  },
  {
    title: "9. Compliance & Legal",
    warning: "These answers are used for ATS auto-fill and are never shared with employers independently.",
    fields: [
      { label: "Relatives at Company", value: "No" },
      { label: "Previously Employed Here", value: "No" },
      { label: "Government Affiliation", value: "No" },
    ]
  }
];

function FieldRow({ label, value, isSensitive = false }: { label: string; value: string; isSensitive?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [revealed, setRevealed] = useState(!isSensitive);
  const [hover, setHover] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}
    >
       <div style={{ fontSize: 11, color: C.textSub, width: 140, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
       {editing ? (
         <div style={{ flex: 1, display: "flex", gap: 6 }}>
           <input value={val} onChange={e => setVal(e.target.value)} style={{ ...searchInput, height: 26, fontSize: 12, padding: "0 8px" }} />
           <button onClick={() => setEditing(false)} style={{ ...primaryBtn, height: 26, padding: "0 10px", fontSize: 11 }}>Save</button>
           <button onClick={() => setEditing(false)} style={{ ...secondaryBtn, height: 26, padding: "0 10px", fontSize: 11 }}>Cancel</button>
         </div>
       ) : (
         <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
           <div style={{ fontSize: 12, color: C.text, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
             {isSensitive && !revealed ? "••••••••" : val}
             {isSensitive && (
               <div style={{ fontSize: 10, color: C.textSub, marginTop: 2 }}>Sensitive field. This action will be logged.</div>
             )}
           </div>
           <div style={{ display: "flex", gap: 4, opacity: hover ? 1 : 0, transition: "opacity 150ms" }}>
             {isSensitive && (
               <button onClick={() => setRevealed(!revealed)} style={iconBtn} title={revealed ? "Hide" : "Reveal"}>
                 <Eye size={13} />
               </button>
             )}
             <button onClick={() => setEditing(true)} style={iconBtn} title="Edit"><Edit2 size={13} /></button>
             <button onClick={() => { copyText(val); toast.success("Copied to clipboard"); }} style={iconBtn} title="Copy"><Copy size={13} /></button>
           </div>
         </div>
       )}
    </div>
  );
}

const iconBtn = { 
  background: C.bgSubtle, border: `1px solid ${C.border}`, cursor: "pointer", 
  color: C.textSub, display: "flex", alignItems: "center", justifyContent: "center", 
  width: 26, height: 26, borderRadius: 6 
};

function TicketStatusRulesPanel({ isOpsManager }: { isOpsManager: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{ ...secondaryBtn, height: 36, padding: "0 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: open ? C.bgSubtle : C.bgWhite }}
      >
        <Info size={14} color={C.textSub} /> Status Rules
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ ...card, position: "absolute", top: "100%", right: 0, marginTop: 8, padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: C.bgWhite, width: 360, zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
             <div style={{ fontSize: 13, fontWeight: 600, color: C.text, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 4 }}>Ticket Status Rules</div>
             <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px 12px", fontSize: 12, alignItems: "center" }}>
                <div>{renderBadge("OPEN")}</div>
                <div style={{ color: C.textSub }}>ticket created, not yet started · system tracks external link clicks</div>

                <div>{renderBadge("IN_PROGRESS")}</div>
                <div style={{ color: C.textSub }}>can Resume / Mark Submitted / Mark Failed</div>

                <div>{renderBadge("SUBMITTED")}</div>
                <div style={{ color: C.textSub, lineHeight: 1.3 }}>proof uploaded · terminal state, no further review required</div>

                <div>{renderBadge("FAILED")}</div>
                <div style={{ color: C.textSub }}>requires review, retry, or user follow-up</div>
             </div>
          </div>
        </>
      )}
    </div>
  )
}

export function ResumeApplications() {
  const [userSearch, setUserSearch]     = useState("");
  const [userFilters, setUserFilters]   = useState<Record<string, string>>({ owner: "all", status: "all" });
  const [selectedUserId, setSelectedUserId] = useState("u1");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState("All");
  
  const [userList, setUserList]         = useState(users);
  const [role, setRole]                 = useState<"Ops Manager" | "Customer Support">("Ops Manager");

  const [showProofModal, setShowProofModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [proofNotes, setProofNotes] = useState("");
  const [failReason, setFailReason] = useState("Job closed");
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isOpsManager = role === "Ops Manager";
  const selectedUser = userList.find((u) => u.id === selectedUserId)!;
  const allTickets   = ticketsByUser[selectedUserId] ?? [];
  const ticket = allTickets.find((t) => t.id === selectedTicket);

  const filteredUsers = userList.filter((u) => {
    if (!isOpsManager && u.ops !== "Alex Kim") return false;
    if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase())) return false;
    if (userFilters.owner !== "all") {
      if (userFilters.owner === "me" && u.ops !== "Alex Kim") return false;
      if (userFilters.owner === "unassigned" && u.ops !== "Unassigned") return false;
    }
    if (userFilters.status !== "all" && u.status.toLowerCase().replace(/\s+/g, "-") !== userFilters.status) return false;
    return true;
  });

  const tabCounts = {
    All: allTickets.length,
    Open: allTickets.filter(t => t.status === "OPEN").length,
    "In progress": allTickets.filter(t => t.status === "IN_PROGRESS").length,
    Submitted: allTickets.filter(t => t.status === "SUBMITTED").length,
    Failed: allTickets.filter(t => t.status === "FAILED").length,
  };

  const filteredTickets = allTickets.filter(t => {
    if (activeTab === "All") return true;
    if (activeTab === "In progress") return t.status === "IN_PROGRESS";
    return t.status.toLowerCase() === activeTab.toLowerCase();
  });

  function handleClaim(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("Start this ticket? This ticket will be assigned to you and moved to In Progress.")) {
      toast.success("Ticket started");
    }
  }

  function handleStart(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    toast.success("Application started");
    setSelectedTicket(id);
  }

  function handleRelease(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("Release ticket? This will return the ticket to the open queue.")) {
      toast.info("Ticket released");
    }
  }

  function handleGenericAction(msg: string, e: React.MouseEvent) {
    e.stopPropagation();
    toast.info(msg);
  }

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>
      
      {/* ── LEFT: User Queue ─────────────────────────────── */}
      <div style={{ width: 252, minWidth: 252, background: C.bgWhite, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Queue header */}
        <div style={{ padding: "0 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flexShrink: 0 }}>User Queue</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: C.textSub, flexShrink: 0 }}>{filteredUsers.length} users</span>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <UserCog size={12} style={{ position: "absolute", left: 8, color: isOpsManager ? C.blue : C.textSub, pointerEvents: "none", zIndex: 1 }} />
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as "Ops Manager" | "Customer Support";
                  setRole(newRole);
                  if (newRole === "Customer Support") {
                    setUserFilters((prev) => ({ ...prev, owner: prev.owner === "unassigned" ? "me" : prev.owner }));
                    const currentUser = userList.find((u) => u.id === selectedUserId);
                    if (currentUser && currentUser.ops === "Unassigned") {
                      const firstVisible = userList.find((u) => u.ops !== "Unassigned");
                      if (firstVisible) { setSelectedUserId(firstVisible.id); setSelectedTicket(null); }
                    }
                  }
                }}
                style={{
                  height: 28, paddingLeft: 24, paddingRight: 8, borderRadius: 6,
                  border: `1px solid ${isOpsManager ? C.blueBorder : C.border}`,
                  background: isOpsManager ? C.blueBg : C.bgSubtle,
                  color: isOpsManager ? C.blue : C.textMid,
                  fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none",
                }}
              >
                <option value="Ops Manager">Ops Manager</option>
                <option value="Customer Support">Customer Support</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.textSub, pointerEvents: "none" }} />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users..."
              style={{ width: "100%", height: 28, paddingLeft: 26, background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(isOpsManager
              ? [{ label: "All", value: "all" }, { label: "Mine", value: "me" }, { label: "Unclaimed", value: "unclaimed" }]
              : [{ label: "Mine", value: "me" }]
            ).map((f) => (
              null
            ))}
            {[
              { label: "In progress",  value: "in-progress" },
              { label: "Needs review", value: "needs-review" },
            ].map((f) => (
              null
            ))}
          </div>
        </div>

        {/* User cards */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
          {filteredUsers.length === 0 ? (
            <EmptyState icon={<Search size={22} />} message="No users match your filters." />
          ) : filteredUsers.map((u) => {
            const active = selectedUserId === u.id;
            return (
              <div
                key={u.id}
                onClick={() => { setSelectedUserId(u.id); setSelectedTicket(null); }}
                style={{
                  padding: "9px 10px", borderRadius: 8,
                  border: `1px solid ${active ? C.blueBorder : C.border}`,
                  background: active ? C.blueBg : C.bgWhite,
                  cursor: "pointer", marginBottom: 5, transition: "all 120ms ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{u.name}</span>
                  
                </div>
                {isOpsManager && (
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
                    Ops: <span style={{ color: u.ops === "Unassigned" ? C.red : C.text, fontWeight: u.ops === "Unassigned" ? 600 : 400 }}>{u.ops}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${(u.progress.done / u.progress.total) * 100}%`, height: "100%", background: C.blue, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, color: C.textSub, flexShrink: 0 }}>{u.progress.done}/{u.progress.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Main Workspace ─────────────────────────────── */}
      {!ticket ? (
        // VIEW 1: Selected User Ticket Workspace
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bgPage, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ height: 60, background: C.bgWhite, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `hsl(210, 50%, 70%)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                {selectedUser.name.slice(0,2).toUpperCase()}
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedUser.name}</div>
              <span style={badge(STATUS_VARIANT[selectedUser.status] ?? "gray")}>{selectedUser.status}</span>
              <div style={{ fontSize: 12, color: C.textSub, borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>Assigned to: <span style={{fontWeight: 500, color: C.text}}>{selectedUser.ops}</span></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={secondaryBtn} onClick={() => setShowProfileModal(true)}>View full profile</button>
              <button style={secondaryBtn} onClick={() => toast.info("Export data")}>Export</button>
              
            </div>
          </div>
          
          <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
            {/* Top Cards Row */}
            <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-start" }}>
              {/* Progress Card */}
              <div style={{ ...card, padding: "16px 20px", flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Delegated jobs submitted this month</div>
                  <div style={{ fontSize: 13, color: C.textSub }}>{selectedUser.progress.done} / {selectedUser.progress.total} jobs submitted</div>
                </div>
                <div style={{ width: 300 }}>
                  <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(selectedUser.progress.done / selectedUser.progress.total)*100}%`, height: "100%", background: C.blue }} />
                  </div>
                </div>
              </div>
              
              <TicketStatusRulesPanel isOpsManager={isOpsManager} />
            </div>
            
            {/* Ticket List Tabs */}
            <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
              {Object.entries(tabCounts).map(([tab, count]) => (
                <div 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                    paddingBottom: 12, 
                    fontSize: 13, 
                    fontWeight: activeTab === tab ? 600 : 500, 
                    color: activeTab === tab ? C.blue : C.textSub, 
                    borderBottom: activeTab === tab ? `2px solid ${C.blue}` : "2px solid transparent", 
                    cursor: "pointer",
                    transition: "all 150ms"
                  }}>
                  {tab} {count}
                </div>
              ))}
            </div>
            
            {/* Contextual Helper Text */}
            <div style={{ marginBottom: 16 }}>
              {activeTab === "Open" && <div style={{ fontSize: 13, color: C.textSub }}>Open tickets are not yet started. Start a ticket to begin the application.</div>}
              {activeTab === "In progress" && <div style={{ fontSize: 13, color: C.textSub }}>These tickets are actively being processed. Open a ticket to continue the application.</div>}
              {activeTab === "Submitted" && <div style={{ fontSize: 13, color: C.textSub }}>Submitted tickets are complete. Proof has been uploaded — no further action required.</div>}
              {activeTab === "Failed" && (
                <>
                  <div style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>Failed tickets need review. They may require missing candidate information, retry, or escalation.</div>
                  <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, color: C.amber, padding: "8px 12px", borderRadius: 8, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={16} /> 1 failed ticket may require follow-up before it can be retried.
                  </div>
                </>
              )}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
              
              
              <select style={{ ...secondaryBtn, background: C.bgWhite, height: 32 }}>
                <option value="">Status: All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="failed">Failed</option>
              </select>
              <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: C.textSub }} />
                <input placeholder="Search tickets, company, role..." style={{ ...searchInput, height: 32, paddingLeft: 32 }} />
              </div>
            </div>
            
            {/* Table */}
            <div style={{ ...card, overflow: "hidden" }}>
              {filteredTickets.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>No {activeTab.toLowerCase()} tickets</div>
                  <div style={{ fontSize: 13, color: C.textSub, marginBottom: 16 }}>
                    {activeTab === "Open" ? "All tickets for this user have been started or completed." :
                     activeTab === "In progress" ? "Started applications will appear here." :
                     activeTab === "Submitted" ? "Tickets will appear here after Ops uploads submission proof." :
                     activeTab === "Failed" ? "Failed applications will appear here when Ops cannot complete a ticket." :
                     "No tickets found."}
                  </div>
                  <button style={secondaryBtn} onClick={() => setActiveTab("All")}>View all tickets</button>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {activeTab === "All" && <><th style={TH}>Queue #</th><th style={TH}>Status</th><th style={TH}>Company / Role</th><th style={TH}>Proof</th><th style={TH}>Updated</th></>}
                      {activeTab === "Open" && <><th style={TH}>Queue #</th><th style={TH}>Company / Role</th><th style={TH}>ATS</th><th style={TH}>Location</th><th style={TH}>Created</th></>}
                      {activeTab === "In progress" && <><th style={TH}>Queue #</th><th style={TH}>Company / Role</th><th style={TH}>ATS</th><th style={TH}>Started At</th><th style={TH}>Proof</th><th style={TH}>Last Activity</th></>}
                      {activeTab === "Submitted" && <><th style={TH}>Company / Role</th><th style={TH}>Submitted At</th><th style={TH}>Proof</th><th style={TH}>Review Status</th><th style={TH}>Updated</th></>}
                      {activeTab === "Failed" && <><th style={TH}>Company / Role</th><th style={TH}>Failure Reason</th><th style={TH}>Failed At</th><th style={TH}>Attempts</th><th style={TH}>Next Step</th></>}
                      <th style={{...TH, textAlign: "right"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map(t => (
                      <tr 
                        key={t.id} 
                        onClick={() => setSelectedTicket(t.id)} 
                        style={{ cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background 150ms" }} 
                        onMouseEnter={e => e.currentTarget.style.background = C.bgSubtle} 
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {activeTab === "All" && (
                          <>
                            <td style={{...TD, fontWeight: 600, color: C.textSub}}>{t.priority}</td>
                            <td style={TD}>{renderBadge(t.status)}</td>
                            <td style={TD}><div style={{ fontWeight: 600 }}>{t.company}</div><div style={{ fontSize: 12, color: C.textSub }}>{t.role}</div></td>
                            <td style={TD}>{renderProof(t.proof)}</td>
                            <td style={{...TD, color: C.textSub}}>{t.updated}</td>
                            <td style={{...TD, textAlign: "right"}}><ChevronRight size={16} color={C.textSub} /></td>
                          </>
                        )}
                        {activeTab === "Open" && (
                          <>
                            <td style={{...TD, fontWeight: 600, color: C.textSub}}>{t.priority}</td>
                            <td style={TD}><div style={{ fontWeight: 600 }}>{t.company}</div><div style={{ fontSize: 12, color: C.textSub }}>{t.role}</div></td>
                            <td style={TD}>{t.ats}</td>
                            <td style={TD}>{t.location}</td>
                            <td style={{...TD, color: C.textSub}}>{t.created}</td>
                            <td style={{...TD, textAlign: "right"}}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button style={{...secondaryBtn, height: 28, fontSize: 12}} onClick={(e) => handleGenericAction("View details", e)}>View details</button>
                                <button style={{...primaryBtn, height: 28, fontSize: 12}} onClick={(e) => handleClaim(t.id, e)}>Start</button>
                              </div>
                            </td>
                          </>
                        )}
                        {activeTab === "In progress" && (
                          <>
                            <td style={{...TD, fontWeight: 600, color: C.textSub}}>{t.priority}</td>
                            <td style={TD}><div style={{ fontWeight: 600 }}>{t.company}</div><div style={{ fontSize: 12, color: C.textSub }}>{t.role}</div></td>
                            <td style={TD}>{t.ats}</td>
                            <td style={TD}>{t.startedAt}</td>
                            <td style={TD}>{renderProof(t.proof)}</td>
                            <td style={{...TD, color: C.textSub}}>{t.lastActivity}</td>
                            <td style={{...TD, textAlign: "right"}}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                                <button style={{...primaryBtn, height: 28, fontSize: 12}} onClick={() => setSelectedTicket(t.id)}>Resume</button>
                                <div onClick={(e) => handleGenericAction("Open actions menu", e)} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub }}><MoreHorizontal size={14}/></div>
                              </div>
                            </td>
                          </>
                        )}
                        {activeTab === "Submitted" && (
                          <>
                            <td style={TD}><div style={{ fontWeight: 600 }}>{t.company}</div><div style={{ fontSize: 12, color: C.textSub }}>{t.role}</div></td>
                            <td style={TD}>{t.submittedAt}</td>
                            <td style={TD}>{renderProof(t.proof)}</td>
                            <td style={TD}>{t.reviewStatus}</td>
                            <td style={{...TD, color: C.textSub}}>{t.updated}</td>
                            <td style={{...TD, textAlign: "right"}}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button style={{...secondaryBtn, height: 28, fontSize: 12}} onClick={(e) => handleGenericAction("Opening proof preview...", e)}>View proof</button>
                              </div>
                            </td>
                          </>
                        )}
                        {activeTab === "Failed" && (
                          <>
                            <td style={TD}><div style={{ fontWeight: 600 }}>{t.company}</div><div style={{ fontSize: 12, color: C.textSub }}>{t.role}</div></td>
                            <td style={TD}>{t.failureReason}</td>
                            <td style={TD}>{t.failedAt}</td>
                            <td style={TD}>{t.attempts}</td>
                            <td style={TD}>{t.nextStep}</td>
                            <td style={{...TD, textAlign: "right"}}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button style={{...secondaryBtn, height: 28, fontSize: 12}} onClick={(e) => handleGenericAction("Request user update", e)}>Request user update</button>
                                <button style={{...primaryBtn, height: 28, fontSize: 12}} onClick={() => setSelectedTicket(t.id)}>Review</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        // VIEW 2: Ticket Detail Processing Page
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bgPage, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ height: 56, background: C.bgWhite, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setSelectedTicket(null)} style={{ ...ghostBtn, padding: "0 8px", height: 32, fontSize: 13 }}>
                 <ChevronLeft size={16} /> Tickets
              </button>
              <div style={{ width: 1, height: 24, background: C.border }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ticket.company} · {ticket.role}</div>
              {renderBadge(ticket.status)}
              <div style={{ fontSize: 12, color: C.textSub }}>assigned ops: {ticket.owner}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              
              <button style={{ ...secondaryBtn, height: 32, padding: "0 10px" }} title="Refresh"><RefreshCw size={14} /></button>
            </div>
          </div>
          
          {/* Main Layout - Two Columns */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left Column: Application Profile */}
            <div style={{ width: 480, minWidth: 480, background: C.bgWhite, borderRight: `1px solid ${C.border}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {ticket.status === "FAILED" && (
                <div style={{ background: C.amberBg, borderBottom: `1px solid ${C.amberBorder}`, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.amber, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                    <AlertCircle size={16} /> Failure Summary
                  </div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}><strong>Reason:</strong> {ticket.failureReason}</div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}><strong>Failed At:</strong> {ticket.failedAt} by {ticket.failedBy}</div>
                  <div style={{ fontSize: 13, color: C.text }}><strong>Suggested Next Step:</strong> {ticket.nextStep}</div>
                </div>
              )}
              
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={16} color={C.blue} />
                  Candidate Application Profile
                </div>
                
                {/* User Meta */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 12, color: C.textSub }}>
                   <div><strong style={{color: C.text}}>Name:</strong> {selectedUser.name}</div>
                   <div><strong style={{color: C.text}}>User ID:</strong> {selectedUser.id.toUpperCase()}</div>
                   <div><strong style={{color: C.text}}>Email:</strong> {selectedUser.name.toLowerCase().replace(' ', '.')}@gmail.com</div>
                   <div><strong style={{color: C.text}}>Phone:</strong> +1 (415) 555-0192</div>
                   <div style={{ gridColumn: "1 / -1" }}><strong style={{color: C.text}}>Target roles:</strong> {selectedUser.jobTitles.join(", ")}</div>
                   <div style={{ gridColumn: "1 / -1" }}><strong style={{color: C.text}}>Target locations:</strong> {selectedUser.locations.join(", ")}</div>
                   <div><strong style={{color: C.text}}>Auth:</strong> {selectedUser.visa}</div>
                   <div><strong style={{color: C.text}}>Owner:</strong> {selectedUser.ops}</div>
                </div>
                <button onClick={() => setShowProfileModal(true)} style={{ ...ghostBtn, padding: 0, color: C.blue, marginTop: 12, fontSize: 12 }}>
                  View full profile <ExternalLink size={12} style={{marginLeft: 4}} />
                </button>
              </div>
              
              <div style={{ padding: "24px", flex: 1 }}>
                 {APP_PROFILE_SECTIONS.map(sec => (
                   <div key={sec.title} style={{ marginBottom: 32 }}>
                     <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>{sec.title}</div>
                     {sec.warning && (
                       <div style={{ fontSize: 11, color: C.textSub, background: C.bgSubtle, padding: "8px 12px", borderRadius: 6, marginBottom: 12 }}>
                         {sec.warning}
                       </div>
                     )}
                     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                       {sec.fields.map(f => (
                         <FieldRow key={f.label} label={f.label} value={f.value} isSensitive={f.isSensitive} />
                       ))}
                     </div>
                   </div>
                 ))}

                 {/* Work Experience */}
                 <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>4. Work Experience</div>
                    {[
                      { title: "Product Manager Intern — Stripe", loc: "San Francisco, CA", type: "Internship", dur: "Jun 2023 – Aug 2023", desc: "Led cross-functional initiatives to improve payment conversion rates. Collaborated with engineering and design on new checkout flows." },
                      { title: "Software Engineer Intern — Figma", loc: "San Francisco, CA", type: "Internship", dur: "Jun 2022 – Aug 2022", desc: "Developed new plugin API features and improved editor performance by 15%." }
                    ].map(exp => (
                      <div key={exp.title} style={{ ...card, padding: 16, marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{exp.title}</div>
                        <div style={{ fontSize: 11, color: C.textSub, marginBottom: 8 }}>{exp.loc} · {exp.type} · {exp.dur}</div>
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{exp.desc}</div>
                      </div>
                    ))}
                 </div>
                 
                 {/* Empty states */}
                 {["10. Certifications", "11. Security Information", "12. Suggestions to Screna"].map(title => (
                   <div key={title} style={{ marginBottom: 32 }}>
                     <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>{title}</div>
                     <div style={{ fontSize: 12, color: C.textSub, fontStyle: "italic" }}>No {title.split(' ')[1].toLowerCase()} added yet.</div>
                   </div>
                 ))}
              </div>
            </div>
            
            {/* Right Column: Browser Panel */}
            <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", background: C.bgSubtle }}>
               {/* Metadata */}
               <div style={{ ...card, padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div>
                   <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{ticket.company} - {ticket.role}</div>
                   <div style={{ fontSize: 13, color: C.textSub }}>ATS: {ticket.ats || "Unknown"} · Location: {ticket.location || "Remote"}</div>
                 </div>
                 <a href={ticket.url || "https://example.com"} target="_blank" rel="noreferrer" style={{ ...secondaryBtn, height: 32, textDecoration: "none", color: C.blue }}>
                   <ExternalLink size={14} /> Open in new tab
                 </a>
               </div>
               
               {/* Browser Placeholder */}
               <div style={{ flex: 1, border: `2px dashed ${C.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bgWhite }}>
                  <ExternalLink size={32} color={C.textSub} style={{ marginBottom: 16 }} />
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: C.text }}>Browserbase session — placeholder</div>
                  <div style={{ color: C.textSub, fontSize: 13, marginBottom: 4 }}>When this ticket is started, the live browser session will embed here.</div>
                  <div style={{ color: C.textSub, fontSize: 13, marginBottom: 16 }}>Not wired yet.</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                     <span style={{ fontSize: 13, color: C.textSub }}>URL:</span>
                     <a href="http://xxxx.com" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: C.blue, textDecoration: "none", fontWeight: 500 }}>http://xxxx.com</a>
                  </div>
               </div>
            </div>
          </div>
          
          {/* Bottom Sticky Action Bar */}
          <div style={{ height: 64, background: C.bgWhite, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
            {ticket.status !== "COMPLETED" && (
              <>
                <button onClick={() => setShowProofModal(true)} style={{ ...primaryBtn, height: 40, padding: "0 24px", fontSize: 14 }}>Mark Submitted</button>
                <button onClick={() => setShowFailedModal(true)} style={{ ...secondaryBtn, height: 40, padding: "0 24px", fontSize: 14, color: C.red, borderColor: C.redBorder }}>Mark Failed</button>
              </>
            )}
            
          </div>
        </div>
      )}

      {/* Modals */}
      {showProofModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...card, width: 440, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Upload submission proof</div>
            <div style={{ fontSize: 13, color: C.textSub }}>Upload a screenshot or confirmation file showing that the application was successfully submitted.</div>
            
            <div style={{ height: 120, border: `2px dashed ${C.border}`, borderRadius: 8, background: C.bgSubtle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => toast.info("Select file")}>
              <Upload size={24} color={C.textSub} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: C.blue }}>Click to upload or drag and drop</div>
              <div style={{ fontSize: 11, color: C.textSub }}>PNG, JPG, PDF up to 10MB</div>
            </div>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>Notes (Optional)</label>
              <textarea 
                value={proofNotes} onChange={e => setProofNotes(e.target.value)}
                placeholder="Add submission confirmation notes..." 
                style={{ ...searchInput, height: 80, padding: 12, resize: "none" }} 
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
              <button onClick={() => setShowProofModal(false)} style={{ ...secondaryBtn, height: 36, padding: "0 20px" }}>Cancel</button>
              <button onClick={() => { setShowProofModal(false); toast.success("Proof uploaded. Ticket marked as submitted."); }} style={{ ...primaryBtn, height: 36, padding: "0 20px" }}>Upload proof & mark submitted</button>
            </div>
          </div>
        </div>
      )}

      {showFailedModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...card, width: 400, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Mark ticket as failed?</div>
            <div style={{ fontSize: 13, color: C.textSub }}>Use this only when the application cannot be completed. This will return the ticket for review.</div>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>Failure reason</label>
              <select value={failReason} onChange={e => setFailReason(e.target.value)} style={{ ...searchInput, height: 36, paddingLeft: 12 }}>
                <option>Job closed</option>
                <option>Login blocked</option>
                <option>Missing candidate information</option>
                <option>ATS error</option>
                <option>Other</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, display: "block" }}>Notes</label>
              <textarea placeholder="Provide details..." style={{ ...searchInput, height: 80, padding: 12, resize: "none" }} />
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
              <button onClick={() => setShowFailedModal(false)} style={{ ...secondaryBtn, height: 36, padding: "0 20px" }}>Cancel</button>
              <button onClick={() => { setShowFailedModal(false); toast.success("Ticket marked as failed"); }} style={{ ...primaryBtn, height: 36, padding: "0 20px", background: C.red }}>Mark failed</button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ ...card, width: 680, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bgPage, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `hsl(210, 50%, 70%)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>
                  {selectedUser.name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{selectedUser.name}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{selectedUser.jobTitles[0]}</div>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSub }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={16} color={C.blue} />
                Candidate Application Profile
              </div>

              {APP_PROFILE_SECTIONS.map(sec => (
                <div key={sec.title} style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>{sec.title}</div>
                  {sec.warning && (
                    <div style={{ fontSize: 11, color: C.textSub, background: C.bgSubtle, padding: "8px 12px", borderRadius: 6, marginBottom: 12 }}>
                      {sec.warning}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {sec.fields.map(f => (
                      <FieldRow key={f.label} label={f.label} value={f.value} isSensitive={f.isSensitive} />
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>4. Work Experience</div>
                {[
                  { title: "Product Manager Intern — Stripe", loc: "San Francisco, CA", type: "Internship", dur: "Jun 2023 – Aug 2023", desc: "Led cross-functional initiatives to improve payment conversion rates. Collaborated with engineering and design on new checkout flows." },
                  { title: "Software Engineer Intern — Figma", loc: "San Francisco, CA", type: "Internship", dur: "Jun 2022 – Aug 2022", desc: "Developed new plugin API features and improved editor performance by 15%." }
                ].map(exp => (
                  <div key={exp.title} style={{ ...card, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{exp.title}</div>
                    <div style={{ fontSize: 11, color: C.textSub, marginBottom: 8 }}>{exp.loc} · {exp.type} · {exp.dur}</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{exp.desc}</div>
                  </div>
                ))}
              </div>
              
              {["10. Certifications", "11. Security Information", "12. Suggestions to Screna"].map(title => (
                <div key={title} style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.textSub, fontStyle: "italic" }}>No {title.split(' ')[1].toLowerCase()} added yet.</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
