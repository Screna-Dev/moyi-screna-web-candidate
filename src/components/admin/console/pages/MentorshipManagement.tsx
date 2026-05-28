import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X, ExternalLink, Search, AlertTriangle, ToggleLeft, ToggleRight, Pencil, Settings, Copy } from "lucide-react";
import { C, badge, TH, TD, primaryBtn, secondaryBtn, ghostBtn, card } from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";
import { FilterBar } from "../ui/FilterBar";
import { Drawer } from "../ui/Drawer";
import { DrawerField, DrawerDivider } from "../ui/DrawerField";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SERVICE_TYPES = [
  { id: "mock-interview",    label: "Mock Interview" },
  { id: "resume-review",     label: "Resume & LinkedIn Review" },
  { id: "career-strategy",   label: "Career Strategy Session" },
  { id: "offer-negotiation", label: "Offer & Salary Negotiation" },
];

const ALL_EXPERTISE_TAGS = [
  "System Design", "Backend", "Frontend", "Product Strategy",
  "PM Interview", "Data Science", "ML", "React", "Finance", "Quant", "Behavioral", "Leadership",
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type TabId = "mentors" | "sessions" | "reschedule" | "disputes" | "service-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceOffering = {
  typeId: string;
  enabled: boolean;
  rate: number;
  pricingType: "per-hour" | "per-session";
  duration: number;
  expertiseTags: string[];
  description: string;
  notes: string;
};

type Mentor = {
  id: string;
  name: string;
  email?: string;
  password?: string;
  bio?: string;
  timezone?: string;
  expertiseTags: string[];
  rate30: number;
  rate60: number;
  status: "Pending" | "Active" | "Suspend";
  calConnected: boolean;
  sessions: number;
  revenue: number;
  unpaid: number;
  offerings: ServiceOffering[];
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mentors: Mentor[] = [
  {
    id: "m1", name: "Zhang Wei", email: "zhang.wei@screna.io", password: "ZW@secure2024",
    expertiseTags: ["System Design", "Backend", "Behavioral"],
    rate30: 65, rate60: 120, status: "Active", calConnected: true, sessions: 8, revenue: 3840, unpaid: 320,
    offerings: [
      { typeId: "mock-interview",    enabled: true,  rate: 120, pricingType: "per-hour",    duration: 60, expertiseTags: ["System Design", "Backend", "Behavioral"], description: "Full mock interview with detailed feedback.", notes: "" },
      { typeId: "resume-review",     enabled: true,  rate: 90,  pricingType: "per-session", duration: 45, expertiseTags: ["Backend"], description: "Resume and LinkedIn profile review.", notes: "" },
      { typeId: "career-strategy",   enabled: false, rate: 120, pricingType: "per-hour",    duration: 60, expertiseTags: [], description: "", notes: "" },
      { typeId: "offer-negotiation", enabled: false, rate: 120, pricingType: "per-session", duration: 45, expertiseTags: [], description: "", notes: "" },
    ],
  },
  {
    id: "m2", name: "Lisa Park", email: "lisa.park@screna.io", password: "LP@secure2024",
    expertiseTags: ["Product Strategy", "PM Interview", "Leadership"],
    rate30: 80, rate60: 150, status: "Active", calConnected: true, sessions: 5, revenue: 3000, unpaid: 150,
    offerings: [
      { typeId: "mock-interview",    enabled: true,  rate: 150, pricingType: "per-hour",    duration: 60, expertiseTags: ["PM Interview"], description: "PM interview prep with real FAANG-style questions.", notes: "" },
      { typeId: "resume-review",     enabled: true,  rate: 100, pricingType: "per-session", duration: 45, expertiseTags: ["Product Strategy"], description: "PM resume and LinkedIn review.", notes: "" },
      { typeId: "career-strategy",   enabled: true,  rate: 150, pricingType: "per-hour",    duration: 60, expertiseTags: ["Leadership", "Product Strategy"], description: "Career strategy for aspiring PMs.", notes: "" },
      { typeId: "offer-negotiation", enabled: false, rate: 150, pricingType: "per-session", duration: 45, expertiseTags: [], description: "", notes: "" },
    ],
  },
  {
    id: "m3", name: "Marcus Chen", email: "marcus.chen@screna.io", password: "MC@secure2024",
    expertiseTags: ["ML", "Data Science", "System Design"],
    rate30: 95, rate60: 180, status: "Active", calConnected: false, sessions: 3, revenue: 2160, unpaid: 0,
    offerings: [
      { typeId: "mock-interview",    enabled: true,  rate: 180, pricingType: "per-hour",    duration: 60, expertiseTags: ["ML", "Data Science"], description: "ML/DS technical interviews.", notes: "Preferred: ML systems focus" },
      { typeId: "resume-review",     enabled: false, rate: 150, pricingType: "per-session", duration: 45, expertiseTags: [], description: "", notes: "" },
      { typeId: "career-strategy",   enabled: false, rate: 180, pricingType: "per-hour",    duration: 60, expertiseTags: [], description: "", notes: "" },
      { typeId: "offer-negotiation", enabled: false, rate: 180, pricingType: "per-session", duration: 45, expertiseTags: [], description: "", notes: "" },
    ],
  },
  {
    id: "m4", name: "Jennifer Kim", email: "jennifer.kim@screna.io", password: "JK@secure2024",
    expertiseTags: ["Frontend", "React", "System Design"],
    rate30: 55, rate60: 100, status: "Pending", calConnected: true, sessions: 0, revenue: 0, unpaid: 0,
    offerings: [
      { typeId: "mock-interview",    enabled: true,  rate: 100, pricingType: "per-hour",    duration: 60, expertiseTags: ["Frontend Arch", "System Design"], description: "Mock frontend technical interview.", notes: "" },
      { typeId: "resume-review",     enabled: true,  rate: 80,  pricingType: "per-session", duration: 45, expertiseTags: ["Frontend", "React"], description: "UI/UX focused resume review.", notes: "" },
      { typeId: "career-strategy",   enabled: false, rate: 100, pricingType: "per-hour",    duration: 60, expertiseTags: [], description: "", notes: "" },
      { typeId: "offer-negotiation", enabled: false, rate: 100, pricingType: "per-session", duration: 45, expertiseTags: [], description: "", notes: "" },
    ],
  },
  {
    id: "m5", name: "David Wang", email: "david.wang@screna.io", password: "DW@secure2024",
    expertiseTags: ["Finance", "Quant", "Leadership"],
    rate30: 100, rate60: 200, status: "Active", calConnected: true, sessions: 12, revenue: 9600, unpaid: 0,
    offerings: [
      { typeId: "mock-interview",    enabled: true,  rate: 200, pricingType: "per-hour",    duration: 60, expertiseTags: ["Finance", "Quant"], description: "Quant and finance interview prep.", notes: "" },
      { typeId: "resume-review",     enabled: true,  rate: 150, pricingType: "per-session", duration: 45, expertiseTags: ["Finance"], description: "Finance-focused resume review.", notes: "" },
      { typeId: "career-strategy",   enabled: true,  rate: 200, pricingType: "per-hour",    duration: 60, expertiseTags: ["Leadership", "Finance"], description: "Career strategy for finance / quant roles.", notes: "" },
      { typeId: "offer-negotiation", enabled: true,  rate: 200, pricingType: "per-session", duration: 45, expertiseTags: ["Finance"], description: "Salary and offer negotiation for finance roles.", notes: "" },
    ],
  },
];

const sessions = [
  { id: "S-001", student: "Emily Zhang", mentor: "Zhang Wei",   serviceType: "Mock Interview",       time: "May 20, 2PM", status: "Upcoming",  payment: 120, refundEligible: true,  within48h: true  },
  { id: "S-002", student: "Marcus Liu",  mentor: "Lisa Park",   serviceType: "Career Strategy",      time: "May 19, 4PM", status: "Completed", payment: 150, refundEligible: false, within48h: false },
  { id: "S-003", student: "Sarah Chen",  mentor: "Marcus Chen", serviceType: "Mock Interview",       time: "May 22, 7PM", status: "Upcoming",  payment: 180, refundEligible: true,  within48h: false },
  { id: "S-004", student: "Ryan Torres", mentor: "Zhang Wei",   serviceType: "Resume & LinkedIn Review", time: "May 18, 3PM", status: "Cancelled", payment: 0,   refundEligible: false, within48h: false },
  { id: "S-005", student: "Priya Patel", mentor: "Marcus Chen", serviceType: "Mock Interview",       time: "May 21, 6PM", status: "Upcoming",  payment: 180, refundEligible: true,  within48h: true  },
  { id: "S-006", student: "Kevin Li",    mentor: "David Wang",  serviceType: "Offer & Salary Negotiation", time: "May 17, 5PM", status: "Completed", payment: 200, refundEligible: false, within48h: false },
];

const reschedules = [
  { id: "R-001", student: "Emily Zhang", mentor: "Zhang Wei",   originalTime: "May 20, 2:00PM - 3:00PM", newTime: "May 20, 4:00PM - 5:00PM", reason: "Work conflict — sprint planning added last minute", within48h: true,  status: "Requested"  },
  { id: "R-002", student: "Kevin Li",    mentor: "David Wang",  originalTime: "May 23, 5:00PM - 5:30PM", newTime: "May 24, 1:00PM - 1:30PM", reason: "Family emergency — need to move to next week",      within48h: false, status: "Requested"  },
  { id: "R-003", student: "Sarah Chen",  mentor: "Marcus Chen", originalTime: "May 22, 7:00PM - 8:00PM", newTime: "May 23, 6:00PM - 7:00PM", reason: "Travel schedule changed",                           within48h: false, status: "Approved" },
];

const disputes = [
  { id: "D-019", student: "Ryan Torres", mentor: "Zhang Wei",   session: "S-004", reason: "Session ended 20 min early. Mentor was distracted.", amount: 120, evidence: "Screenshot attached", status: "Open",     created: "May 18" },
  { id: "D-018", student: "Aisha Kumar", mentor: "Lisa Park",   session: "S-008", reason: "Mentor no-showed. Session was never started.",        amount: 150, evidence: "Calendar screenshot",  status: "Approved", created: "May 15" },
  { id: "D-017", student: "Tom Wu",      mentor: "Marcus Chen", session: "S-002", reason: "Content was generic and not personalized.",           amount: 180, evidence: "Chat transcript",      status: "Rejected", created: "May 10" },
];

const platformServiceTypes = [
  { id: "mock-interview",    label: "Mock Interview",              activeMentors: 3, status: "Active", description: "" },
  { id: "resume-review",     label: "Resume & LinkedIn Review",    activeMentors: 4, status: "Active", description: "" },
  { id: "career-strategy",   label: "Career Strategy Session",     activeMentors: 2, status: "Active", description: "" },
  { id: "offer-negotiation", label: "Offer & Salary Negotiation",  activeMentors: 2, status: "Active", description: "" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sessionStatusVariant = (s: string): BadgeVariant =>
  s === "Completed" ? "green" : s === "Upcoming" ? "blue" : s === "Cancelled" ? "red" : "gray";

const disputeVariant = (s: string): BadgeVariant =>
  s === "Open" ? "amber" : s === "Approved" ? "green" : s === "Rejected" ? "red" : "gray";

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${(name.charCodeAt(0) * 17) % 360}, 55%, 68%)`, fontSize: size * 0.34, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// Filled chip — used for service types
function ServiceChip({ label }: { label: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 7px", borderRadius: 9999, fontSize: 10.5, fontWeight: 600, background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, whiteSpace: "nowrap" as const }}>{label}</span>;
}

// Outline chip — used for expertise tags
function ExpertiseChip({ label, small }: { label: string; small?: boolean }) {
  return <span style={{ display: "inline-flex", alignItems: "center", height: small ? 16 : 18, padding: `0 ${small ? 5 : 7}px`, borderRadius: 9999, fontSize: small ? 10 : 10.5, fontWeight: 500, background: "transparent", color: C.textMid, border: `1px solid ${C.border}`, whiteSpace: "nowrap" as const }}>{label}</span>;
}

// Toggle switch
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif" }}
    >
      {checked
        ? <ToggleRight size={20} style={{ color: C.blue }} />
        : <ToggleLeft size={20} style={{ color: C.textSub }} />}
      <span style={{ fontSize: 11, fontWeight: 600, color: checked ? C.blue : C.textSub }}>{checked ? "Enabled" : "Disabled"}</span>
    </button>
  );
}

// ─── Service Edit Modal ───────────────────────────────────────────────────────

function ServiceEditModal({
  offering,
  mentorId,
  onSave,
  onClose,
}: {
  offering: ServiceOffering;
  mentorId: string;
  onSave: (o: ServiceOffering) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ServiceOffering>({ ...offering });
  const typeName = ALL_SERVICE_TYPES.find((t) => t.id === form.typeId)?.label ?? form.typeId;

  const toggleTag = (tag: string) =>
    setForm((f) => ({
      ...f,
      expertiseTags: f.expertiseTags.includes(tag)
        ? f.expertiseTags.filter((t) => t !== tag)
        : [...f.expertiseTags, tag],
    }));

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", height: 32, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const row: React.CSSProperties = { marginBottom: 14 };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit — ${typeName}`}
      width={500}
      footer={
        <>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); toast.success("Service offering saved"); }} style={primaryBtn}>Save changes</button>
        </>
      }
    >
      {/* Enabled toggle */}
      <div style={{ ...row, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{typeName}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Students can book this service from this mentor</div>
        </div>
        <Toggle checked={form.enabled} onChange={() => setForm((f) => ({ ...f, enabled: !f.enabled }))} />
      </div>

      {/* Duration */}
      <div style={row}>
        <label style={labelStyle}>Default duration</label>
        <select value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))} style={selectStyle}>
          <option value={30}>30 mins</option>
          <option value={60}>1 hr</option>
          <option value={0}>Both 30 mins and 1hr</option>
        </select>
      </div>

      {/* Expertise tags */}
      

      {/* Description */}
      <div style={row}>
        <label style={labelStyle}>Description shown to students</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Describe what students will get from this session..."
          style={{ ...inputStyle, height: 68, padding: "8px 10px", resize: "none", lineHeight: 1.5 }}
        />
      </div>

      {/* Internal notes */}
      <div>
        <label style={labelStyle}>Internal notes (Ops only)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Internal notes visible only to Ops..."
          style={{ ...inputStyle, height: 52, padding: "8px 10px", resize: "none", lineHeight: 1.5 }}
        />
      </div>
    </Modal>
  );
}

// ─── Service Offerings section (inside Drawer) ────────────────────────────────

function ServiceOfferingsSection({
  offerings,
  onChange,
}: {
  offerings: ServiceOffering[];
  onChange: (updated: ServiceOffering[]) => void;
}) {
  const [editingOffering, setEditingOffering] = useState<ServiceOffering | null>(null);

  const updateOffering = (updated: ServiceOffering) => {
    onChange(offerings.map((o) => o.typeId === updated.typeId ? updated : o));
  };

  const toggleEnabled = (typeId: string) => {
    onChange(offerings.map((o) => o.typeId === typeId ? { ...o, enabled: !o.enabled } : o));
    const o = offerings.find((o) => o.typeId === typeId)!;
    toast.success(`${ALL_SERVICE_TYPES.find((t) => t.id === typeId)?.label} ${o.enabled ? "disabled" : "enabled"}`);
  };

  return (
    <>
      {editingOffering && (
        <ServiceEditModal
          offering={editingOffering}
          mentorId=""
          onSave={updateOffering}
          onClose={() => setEditingOffering(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ALL_SERVICE_TYPES.map((stype) => {
          const offering = offerings.find((o) => o.typeId === stype.id)!;
          const enabled = offering.enabled;
          return (
            <div
              key={stype.id}
              style={{
                border: `1px solid ${enabled ? C.blueBorder : C.border}`,
                borderRadius: 8,
                background: enabled ? C.blueBg : C.bgSubtle,
                overflow: "hidden",
              }}
            >
              {/* Card header */}
              <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottomWidth: enabled ? 1 : 0, borderBottomStyle: "solid", borderBottomColor: enabled ? C.border : "transparent" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: enabled ? C.blue : C.text }}>{stype.label}</div>
                  {enabled && (
                    null
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Toggle checked={enabled} onChange={() => toggleEnabled(stype.id)} />
                </div>
              </div>

              {/* Expanded details when enabled */}
              {enabled && (
                <div style={{ padding: "8px 12px" }}>
                  {/* Expertise tags */}
                  {offering.expertiseTags.length > 0 && (
                    null
                  )}
                  {/* Description */}
                  {offering.description && (
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginBottom: 7 }}>{offering.description}</div>
                  )}
                  {/* Notes */}
                  {offering.notes && (
                    <div style={{ fontSize: 11, color: C.amber, background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 5, padding: "4px 8px", marginBottom: 7 }}>
                      Internal: {offering.notes}
                    </div>
                  )}
                  {/* Edit */}
                  <button
                    onClick={() => setEditingOffering(offering)}
                    style={{ ...ghostBtn, height: 26, fontSize: 11, color: C.blue }}
                  >
                    <Pencil size={10} /> Edit service
                  </button>
                </div>
              )}

              {/* Collapsed — show Enable prompt */}
              {!enabled && (
                <div style={{ padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Not offered by this mentor</span>
                  <button onClick={() => { setEditingOffering(offering); }} style={{ ...ghostBtn, height: 24, fontSize: 11, color: C.blue }}>
                    <Settings size={10} /> Configure
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Add Mentor Wizard ───────────────────────────────────────────────────────

function AddMentorWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete: (m: Mentor) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<Mentor>>({
    name: "", email: "", password: "", bio: "", expertiseTags: [], rate30: 50, rate60: 100, unpaid: 0,
    offerings: ALL_SERVICE_TYPES.map(t => ({
      typeId: t.id,
      enabled: t.id === "mock-interview" || t.id === "resume-review",
      rate: 100, pricingType: "per-hour", duration: 60, expertiseTags: [], description: "", notes: ""
    }))
  });

  const next = () => setStep(s => Math.min(s + 1, 4));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = () => {
    const newMentor: Mentor = {
      id: `m${Date.now()}`,
      name: form.name || "New Mentor",
      email: form.email || "",
      bio: form.bio || "",
      expertiseTags: form.expertiseTags || [],
      rate30: form.rate30 || 50,
      rate60: form.rate60 || 100,
      status: "Pending",
      calConnected: false,
      sessions: 0,
      revenue: 0,
      unpaid: 0,
      offerings: form.offerings || []
    };
    onComplete(newMentor);
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", height: 32, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" };

  return (
    <Modal
      open={open} onClose={onClose}
      title={`Add Mentor — Step ${step} of 4`}
      width={550}
      footer={
        <>
          {step > 1 ? (
            <button onClick={prev} style={secondaryBtn}>Back</button>
          ) : (
            <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button 
              onClick={next} 
              disabled={step === 1 && (!form.email || !form.password)}
              style={{ ...primaryBtn, width: 100, justifyContent: "center", opacity: (step === 1 && (!form.email || !form.password)) ? 0.5 : 1, cursor: (step === 1 && (!form.email || !form.password)) ? "not-allowed" : "pointer" }}
            >Next</button>
          ) : (
            <button onClick={handleComplete} style={{ ...primaryBtn, width: 140, justifyContent: "center" }}>Send Invitation</button>
          )}
        </>
      }
    >
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ height: 4, flex: 1, borderRadius: 2, background: s <= step ? C.blue : C.border, transition: "background 200ms ease" }} />
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Account Information</div>
          <div>
            <label style={labelStyle}>Email Address *</label>
            <input placeholder="mentor@example.com" type="email" style={inputStyle} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Password *</label>
            <input placeholder="Must be at least 8 characters" type="password" style={inputStyle} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input placeholder="e.g. Jane Doe" style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Profile & Expertise</div>
          <div>
            <label style={labelStyle}>Expertise Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.bgSubtle, minHeight: 40, alignItems: "center" }}>
              {(form.expertiseTags || []).map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex", alignItems: "center", height: 22, padding: "0 6px 0 8px", borderRadius: 9999,
                    fontSize: 11, fontWeight: 600,
                    border: `1px solid ${C.blueBorder}`,
                    background: C.blueBg,
                    color: C.blue,
                    fontFamily: "'Inter', sans-serif",
                    gap: 4
                  }}
                >
                  {tag}
                  <button
                    onClick={() => setForm(prev => ({ ...prev, expertiseTags: prev.expertiseTags?.filter(t => t !== tag) }))}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", color: C.blue }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Type tag and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !form.expertiseTags?.includes(val)) {
                      setForm(prev => ({ ...prev, expertiseTags: [...(prev.expertiseTags||[]), val] }));
                    }
                    e.currentTarget.value = '';
                  }
                }}
                style={{
                  flex: 1, minWidth: 150, border: "none", background: "transparent", outline: "none",
                  fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text
                }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Short Bio</label>
            <textarea placeholder="Brief background..." style={{ ...inputStyle, height: 80, padding: "8px 10px", resize: "none" }} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Services & Pricing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Rate ($/30 min)</label>
              <input type="number" style={inputStyle} value={form.rate30} onChange={e => setForm({...form, rate30: Number(e.target.value)})} />
            </div>
            <div>
              <label style={labelStyle}>Rate ($/1 hr)</label>
              <input type="number" style={inputStyle} value={form.rate60} onChange={e => setForm({...form, rate60: Number(e.target.value)})} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Initial Services</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ALL_SERVICE_TYPES.map(stype => {
                const offering = form.offerings?.find(o => o.typeId === stype.id);
                const enabled = offering?.enabled || false;
                return (
                  <div key={stype.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgSubtle }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{stype.label}</span>
                    <Toggle checked={enabled} onChange={() => {
                      setForm(prev => ({
                        ...prev,
                        offerings: prev.offerings?.map(o => o.typeId === stype.id ? { ...o, enabled: !o.enabled } : o)
                      }))
                    }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Preview & Invite</div>
          <div style={{ padding: 14, background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.blue, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                {(form.name || "N")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{form.name || "Unnamed Mentor"}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{form.email || "No email provided"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase" }}>Standard Rates</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>${form.rate30}/30m</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>${form.rate60}/1hr</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase" }}>Services enabled</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{form.offerings?.filter(o => o.enabled).length || 0} services</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
            An invitation email will be sent to <strong>{form.email || "this email"}</strong>. They will be prompted to connect their Google Calendar, configure their Stripe payout account, and review their service settings before their profile becomes Active.
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Mentor Directory ──────────────────────────────────────────────────────────

function MentorDirectory() {
  const [mentorList, setMentorList] = useState(mentors);
  const [filters, setFilters]   = useState<Record<string, string>>({ status: "all" });
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Mentor | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Mentor | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pendingDeny, setPendingDeny] = useState<Mentor | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", height: 32, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  const filtered = mentorList.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status !== "all" && m.status.toLowerCase() !== filters.status) return false;
    return true;
  });

  const updateOfferings = (mentorId: string, offerings: ServiceOffering[]) => {
    setMentorList((prev) => prev.map((m) => m.id === mentorId ? { ...m, offerings } : m));
    setSelected((prev) => prev?.id === mentorId ? { ...prev, offerings } : prev);
  };

  const openDetail = (m: Mentor) => {
    setSelected(m);
    setEditForm(m);
    setIsEditing(false);
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {isAddOpen && (
        <AddMentorWizard
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onComplete={(newMentor) => {
            setMentorList([newMentor, ...mentorList]);
            setIsAddOpen(false);
            toast.success("Mentor invited successfully");
          }}
        />
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <FilterBar
          filters={[{ key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "active", label: "Active" }, { value: "suspend", label: "Suspend" }] }]}
          activeFilters={filters}
          onFilterChange={(k, v) => setFilters({ ...filters, [k]: v })}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search mentors..."
          rightChildren={
            <button onClick={() => setIsAddOpen(true)} style={primaryBtn}>
              <Plus size={12} /> Add mentor
            </button>
          }
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <EmptyState icon={<Search size={22} />} message="No mentors match your filters." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  {["Mentor", "Services", "Expertise", "Rate", "Status", "Calendar", "Sessions", "Revenue", "Unpaid", ""].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const SHORT_SERVICE_LABELS: Record<string, string> = {
                    "mock-interview": "Mock Interview",
                    "resume-review": "Resume Review",
                    "career-strategy": "Career Strategy",
                    "offer-negotiation": "Offer Negotiation",
                  };
                  const enabledServices = m.offerings.filter((o) => o.enabled).map((o) => SHORT_SERVICE_LABELS[o.typeId] || o.typeId);
                  const displayedServices = enabledServices.slice(0, 2);
                  const remainingServices = enabledServices.slice(2);
                  
                  const displayedExpertise = m.expertiseTags.slice(0, 2);
                  const remainingExpertise = m.expertiseTags.slice(2);

                  return (
                    <tr
                      key={m.id}
                      style={{ background: selected?.id === m.id ? C.blueBg : "white", cursor: "pointer", height: 72 }}
                      onMouseEnter={(e) => { if (selected?.id !== m.id) (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220, 20%, 98%)"; }}
                      onMouseLeave={(e) => { if (selected?.id !== m.id) (e.currentTarget as HTMLTableRowElement).style.background = "white"; }}
                      onClick={() => selected?.id === m.id ? setSelected(null) : openDetail(m)}
                    >
                      <td style={TD}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={m.name} size={26} />
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {displayedServices.length > 0
                            ? (
                                <>
                                  {displayedServices.map((s) => <ServiceChip key={s} label={s} />)}
                                  {remainingServices.length > 0 && (
                                    <div
                                      title={remainingServices.join(", ")}
                                      style={{
                                        display: "inline-flex", alignItems: "center", height: 22, padding: "0 6px",
                                        borderRadius: 4, background: C.blueBg, color: C.blue,
                                        fontSize: 11, fontWeight: 500, cursor: "help"
                                      }}
                                    >
                                      +{remainingServices.length}
                                    </div>
                                  )}
                                </>
                              )
                            : <span style={{ fontSize: 12, color: C.textSub }}>—</span>}
                        </div>
                      </td>
                      <td style={TD}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "4px 0" }}>
                          {displayedExpertise.length > 0
                            ? (
                                <>
                                  {displayedExpertise.map((t) => <ExpertiseChip key={t} label={t} />)}
                                  {remainingExpertise.length > 0 && (
                                    <div
                                      title={remainingExpertise.join(", ")}
                                      style={{
                                        display: "inline-flex", alignItems: "center", height: 22, padding: "0 6px",
                                        borderRadius: 9999, border: `1px solid ${C.border}`, background: C.bgSubtle, color: C.textSub,
                                        fontSize: 11, fontWeight: 500, cursor: "help"
                                      }}
                                    >
                                      +{remainingExpertise.length}
                                    </div>
                                  )}
                                </>
                              )
                            : <span style={{ fontSize: 12, color: C.textSub }}>—</span>}
                        </div>
                      </td>
                      <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>
                        <div style={{ fontSize: 12 }}>${m.rate30}/30 min</div>
                        {m.rate60 && (
                          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                            ${m.rate60}/1 hr
                          </div>
                        )}
                      </td>
                      <td style={TD}><span style={badge(m.status === "Active" ? "green" : m.status === "Suspend" ? "red" : m.status === "Pending" ? "amber" : "gray")}>{m.status}</span></td>
                      <td style={TD}>
                        {m.calConnected
                          ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.green }}><Check size={12} /> Connected</span>
                          : <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.red }}><X size={12} /> Not connected</span>}
                      </td>
                      <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>{m.sessions}</td>
                      <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>${(m.revenue || 0).toLocaleString()}</td>
                      <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", color: (m.unpaid || 0) > 0 ? C.blue : C.textSub }}>${(m.unpaid || 0).toLocaleString()}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {m.status === "Pending" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to approve ${m.name}?`)) {
                                    setMentorList(prev => prev.map(item => item.id === m.id ? { ...item, status: "Active" } : item));
                                    toast.success(`${m.name} approved successfully`);
                                  }
                                }}
                                style={{ ...primaryBtn, height: 26, fontSize: 11, background: C.green, borderColor: C.green }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingDeny(m);
                                  setDenyReason("");
                                }}
                                style={{ ...secondaryBtn, height: 26, fontSize: 11, color: C.red, borderColor: C.red }}
                              >
                                Deny
                              </button>
                            </>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); openDetail(m); }} style={{ ...secondaryBtn, height: 26, fontSize: 11 }}>Edit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mentor detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => { setSelected(null); setIsEditing(false); }}
        title={isEditing ? "Edit Profile" : "Mentor detail"}
        width={400}
        footer={
          isEditing ? (
            <>
              <button style={{ ...secondaryBtn, flex: 1, justifyContent: "center" }} onClick={() => setIsEditing(false)}>Cancel</button>
              <button style={{ ...primaryBtn, flex: 1, justifyContent: "center" }} onClick={() => {
                if (editForm) {
                  setMentorList(prev => prev.map(m => m.id === editForm.id ? editForm : m));
                  setSelected(editForm);
                  setIsEditing(false);
                  toast.success("Profile saved");
                }
              }}>Save changes</button>
            </>
          ) : selected?.status === "Pending" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to approve ${selected.name}?`)) {
                    setMentorList(prev => prev.map(item => item.id === selected.id ? { ...item, status: "Active" } : item));
                    setSelected({ ...selected, status: "Active" });
                    toast.success(`${selected.name} approved successfully`);
                  }
                }}
                style={{ ...primaryBtn, flex: 1, justifyContent: "center", background: C.green, borderColor: C.green }}
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeny(selected);
                  setDenyReason("");
                }}
                style={{ ...secondaryBtn, flex: 1, justifyContent: "center", color: C.red, borderColor: C.red }}
              >
                Deny
              </button>
            </>
          ) : (
            <>
              <button style={{ ...secondaryBtn, flex: 1, justifyContent: "center" }} onClick={() => setIsEditing(true)}>
                <Pencil size={14} style={{ marginRight: 6 }} /> Edit Profile
              </button>
            </>
          )
        }
      >
        {selected && !isEditing && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar name={selected.name} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{selected.name}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={badge(selected.status === "Active" ? "green" : selected.status === "Suspend" ? "red" : selected.status === "Pending" ? "amber" : "gray")}>{selected.status}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: C.textMuted }}>
                  {selected.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>Email: {selected.email}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selected.email!);
                          toast.success("Email copied");
                        }} 
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.textMuted, display: "flex" }}
                        title="Copy email"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selected.status === "Pending" ? (
              <div style={{ padding: "16px", background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <AlertTriangle size={18} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 4 }}>Application Review Required</div>
                    <div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5 }}>
                      This mentor has applied to join the platform. Please review their profile and service offerings before approving.
                    </div>
                  </div>
                </div>
                <DrawerDivider />
                <DrawerField label="Rate (30 min)" value={`$${selected.rate30 || 0}`} />
                <DrawerField label="Rate (1 hr)" value={`$${selected.rate60 || 0}`} />
                
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 12 }}>Proposed Services</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                  {selected.offerings.filter(o => o.enabled).length > 0 ? (
                    selected.offerings.filter(o => o.enabled).map((o) => (
                      <ServiceChip key={o.typeId} label={ALL_SERVICE_TYPES.find(t => t.id === o.typeId)?.label || o.typeId} />
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: C.textSub }}>—</span>
                  )}
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Proposed Expertise</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {selected.expertiseTags.length > 0 ? (
                    selected.expertiseTags.map((t) => <ExpertiseChip key={t} label={t} />)
                  ) : (
                    <span style={{ fontSize: 12, color: C.textSub }}>—</span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <DrawerField label="Rate (30 min)" value={`$${selected.rate30 || 0}`} />
                <DrawerField label="Rate (1 hr)" value={`$${selected.rate60 || 0}`} />
                <DrawerField label="Unpaid Balance" value={`$${(selected.unpaid || 0).toLocaleString()}`} />
                <DrawerField label="Sessions delivered"  value={String(selected.sessions || 0)} />
                <DrawerField label="Total revenue"       value={`$${(selected.revenue || 0).toLocaleString()}`} />

                <DrawerDivider />

                {/* Expertise tags */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Expertise</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {selected.expertiseTags.map((t) => <ExpertiseChip key={t} label={t} />)}
                  </div>
                </div>

                <DrawerDivider />

                {/* Google Calendar */}
                <div style={{ padding: "10px 12px", background: selected.calConnected ? C.greenBg : C.redBg, border: `1px solid ${selected.calConnected ? C.greenBorder : C.redBorder}`, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: selected.calConnected ? C.green : C.red, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Google Calendar OAuth</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: selected.calConnected ? C.green : C.red }}>
                    {selected.calConnected ? <Check size={13} /> : <X size={13} />}
                    {selected.calConnected ? "Connected and syncing" : "Not connected — action required"}
                  </div>
                </div>

                <DrawerDivider />

                {/* Service Offerings */}
                <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Service Offerings</div>
                <ServiceOfferingsSection
                  offerings={selected.offerings}
                  onChange={(updated) => updateOfferings(selected.id, updated)}
                />
              </>
            )}
          </>
        )}

        {selected && isEditing && editForm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <div style={{ display: "flex", gap: 10 }}>
               <div style={{ flex: 1 }}>
                 <label style={labelStyle}>Full Name</label>
                 <input style={inputStyle} value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
               </div>
               <div style={{ width: 120 }}>
                 <label style={labelStyle}>Status</label>
                 <select style={selectStyle} value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}>
                   <option value="Pending">Pending</option>
                   <option value="Active">Active</option>
                   <option value="Suspend">Suspend</option>
                 </select>
               </div>
            </div>
            
            <div style={{ display: "flex", gap: 10 }}>
               <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Rate ($/30 min)</label>
                  <input type="number" style={inputStyle} value={editForm.rate30} onChange={(e) => setEditForm({...editForm, rate30: Number(e.target.value)})} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Rate ($/1 hr)</label>
                  <input type="number" style={inputStyle} value={editForm.rate60} onChange={(e) => setEditForm({...editForm, rate60: Number(e.target.value)})} />
               </div>
            </div>

            <div>
              <label style={labelStyle}>Expertise tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, background: C.bgSubtle, minHeight: 40, alignItems: "center" }}>
                {(editForm.expertiseTags || []).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: "inline-flex", alignItems: "center", height: 22, padding: "0 6px 0 8px", borderRadius: 9999,
                      fontSize: 11, fontWeight: 600,
                      border: `1px solid ${C.blueBorder}`,
                      background: C.blueBg,
                      color: C.blue,
                      fontFamily: "'Inter', sans-serif",
                      gap: 4
                    }}
                  >
                    {tag}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditForm(prev => prev ? ({ ...prev, expertiseTags: prev.expertiseTags.filter(t => t !== tag) }) : prev);
                      }}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", color: C.blue }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Type tag and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && editForm && !editForm.expertiseTags.includes(val)) {
                        setEditForm(prev => prev ? ({ ...prev, expertiseTags: [...prev.expertiseTags, val] }) : prev);
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                  style={{
                    flex: 1, minWidth: 150, border: "none", background: "transparent", outline: "none",
                    fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text
                  }}
                />
              </div>
            </div>

            

            <DrawerDivider />
            
            <div>
               <label style={labelStyle}>Service Settings</label>
               <ServiceOfferingsSection 
                 offerings={editForm.offerings} 
                 onChange={(updated) => setEditForm({...editForm, offerings: updated})} 
               />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

function SessionsTab() {
  const [filters, setFilters]   = useState<Record<string, string>>({ status: "all", mentor: "all" });
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<typeof sessions[0] | null>(null);

  const filtered = sessions.filter((s) => {
    if (search && !s.student.toLowerCase().includes(search.toLowerCase()) && !s.mentor.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status !== "all" && s.status.toLowerCase() !== filters.status) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <FilterBar
          filters={[
            { key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "upcoming", label: "Upcoming" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }] },
            { key: "refund", label: "Refund eligible", options: [{ value: "all", label: "All" }, { value: "eligible", label: "Eligible" }] },
          ]}
          activeFilters={filters}
          onFilterChange={(k, v) => setFilters({ ...filters, [k]: v })}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search sessions..."
          rightChildren={
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "hsl(220, 16%, 50%)", fontWeight: 500 }}>Sort by</span>
              <button style={{ 
                display: "flex", alignItems: "center", gap: 4, height: 26, padding: "0 8px", 
                background: "white", border: "1px solid hsl(220, 16%, 91%)", borderRadius: 6, 
                fontSize: 11, color: "hsl(220, 22%, 15%)", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter', sans-serif" 
              }}>
                TIME
                <span style={{ fontSize: 10 }}>↓</span>
              </button>
            </div>
          }
        />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                {["Session ID", "Student", "Mentor", "Service", "Time", "Status", "Payment", "Refund", "Actions"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  style={{ background: selected?.id === s.id ? C.blueBg : "white", cursor: "pointer" }}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                  onMouseEnter={(e) => { if (selected?.id !== s.id) (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220, 20%, 98%)"; }}
                  onMouseLeave={(e) => { if (selected?.id !== s.id) (e.currentTarget as HTMLTableRowElement).style.background = "white"; }}
                >
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.blue }}>{s.id}</td>
                  <td style={TD}>{s.student}</td>
                  <td style={TD}>{s.mentor}</td>
                  <td style={TD}><ServiceChip label={s.serviceType} /></td>
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {s.within48h && <span style={badge("amber")}>48h</span>}
                      <span style={{ fontSize: 12 }}>{s.time}</span>
                    </div>
                  </td>
                  <td style={TD}><span style={badge(sessionStatusVariant(s.status))}>{s.status}</span></td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>{s.payment > 0 ? `$${s.payment}` : "—"}</td>
                  <td style={TD}><span style={badge(s.refundEligible ? "amber" : "gray")}>{s.refundEligible ? "Eligible" : "No"}</span></td>
                  <td style={TD}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button style={ghostBtn} onClick={(e) => { e.stopPropagation(); toast.success("Reschedule initiated"); }}>Reschedule</button>
                      {s.status !== "Cancelled" && (
                        <button style={{ ...ghostBtn, color: C.red }} onClick={(e) => { e.stopPropagation(); toast.error("Session cancelled"); }}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Session ${selected?.id}`}
        width={300}
        footer={
          <>
            <button style={{ ...primaryBtn, flex: 1, justifyContent: "center" }} onClick={() => toast.success("Mentor notified")}>Notify mentor</button>
            {selected?.status !== "Cancelled" && (
              <button style={{ ...secondaryBtn, flex: 1, justifyContent: "center", color: C.red, borderColor: C.redBorder }} onClick={() => toast.error("Session cancelled")}>Cancel session</button>
            )}
          </>
        }
      >
        {selected && (
          <>
            <DrawerField label="Student"     value={selected.student} />
            <DrawerField label="Mentor"      value={selected.mentor} />
            <DrawerField label="Service"     value={selected.serviceType} />
            <DrawerField label="Scheduled"   value={selected.time} />
            <DrawerField label="Payment"     value={selected.payment > 0 ? `$${selected.payment}` : "—"} />
            <DrawerDivider />
            <DrawerField label="Status"  value={<span style={badge(sessionStatusVariant(selected.status))}>{selected.status}</span>} />
            <DrawerField label="Refund"  value={<span style={badge(selected.refundEligible ? "amber" : "gray")}>{selected.refundEligible ? "Eligible" : "Not eligible"}</span>} />
            {selected.within48h && (
              <div style={{ padding: "8px 10px", background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 7, fontSize: 11, color: C.amber, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={12} /> Request is within 48-hour window
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

// ─── Reschedule ────────────────────────────────────────────────────────────────

function RescheduleTab() {
  const [requests, setRequests] = useState(reschedules);
  const [filters, setFilters]   = useState<Record<string, string>>({ status: "all" });

  const filtered = requests.filter((r) => {
    if (filters.status !== "all" && r.status.toLowerCase() !== filters.status) return false;
    return true;
  });

  const update = (id: string, status: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    toast.success(`Request ${status.toLowerCase()}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <FilterBar
        filters={[{ key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "requested", label: "Requested" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] }]}
        activeFilters={filters}
        onFilterChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.student} → {r.mentor}</span>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>Original: {r.originalTime}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>New: {r.newTime || "TBD"}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {r.within48h && <span style={badge("amber")}>Within 48h</span>}
                <span style={badge(r.status === "Requested" ? "amber" : r.status === "Approved" ? "green" : "red")}>{r.status}</span>
              </div>
            </div>
            <div style={{ background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", marginBottom: r.status === "Requested" ? 10 : 0, fontSize: 12, color: C.text }}>
              <span style={{ fontWeight: 600, color: C.textMuted }}>Reason: </span>{r.reason}
            </div>
            {r.status === "Requested" && (
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => update(r.id, "Approved")} style={{ ...primaryBtn, height: 28, background: C.green }}>Approve reschedule</button>
                <button onClick={() => update(r.id, "Rejected")} style={{ ...secondaryBtn, height: 28, color: C.red, borderColor: C.redBorder }}>Reject</button>
                <button onClick={() => update(r.id, "Cancelled")} style={{ ...secondaryBtn, height: 28 }}>Cancel session</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Disputes ──────────────────────────────────────────────────────────────────

function InternalNoteSection({ disputeId }: { disputeId: string }) {
  const [notes, setNotes] = useState<{ id: string; text: string; date: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [text, setText] = useState("");

  const handleSave = () => {
    if (!text.trim()) return;
    setNotes([...notes, { id: Math.random().toString(), text, date: new Date().toLocaleDateString() }]);
    setText("");
    setIsTyping(false);
    toast.success("Note added");
  };

  return (
    <div style={{ marginTop: 16 }}>
      {notes.length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Internal Notes</div>
          {notes.map((n) => (
            <div key={n.id} style={{ background: C.bgSubtle, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{n.date} - Admin</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{n.text}</div>
            </div>
          ))}
        </div>
      )}
      
      {!isTyping ? (
        <button style={{ ...ghostBtn, color: C.blue, marginTop: 4, height: 32 }} onClick={() => setIsTyping(true)}>+ Add internal note</button>
      ) : (
        <div style={{ marginTop: 8, background: "white", padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: "0 2px 8px hsla(222, 22%, 15%, 0.05)" }}>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your internal note here (only visible to admins)..."
            style={{ width: "100%", height: 70, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, fontFamily: "inherit", resize: "none", outline: "none", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={{ ...secondaryBtn, height: 28 }} onClick={() => { setIsTyping(false); setText(""); }}>Cancel</button>
            <button style={{ ...primaryBtn, height: 28, background: C.blue }} onClick={handleSave}>Save note</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DisputesTab() {
  const [list, setList]         = useState(disputes);
  const [filters, setFilters]   = useState<Record<string, string>>({ status: "all" });
  const [selected, setSelected] = useState<typeof disputes[0] | null>(null);
  const [search, setSearch]     = useState("");

  const filtered = list.filter((d) => {
    if (search && !d.student.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status !== "all" && d.status.toLowerCase() !== filters.status) return false;
    return true;
  });

  const update = (id: string, status: string) => {
    setList((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
    setSelected((prev) => prev?.id === id ? { ...prev, status } : prev);
    status === "Approved" ? toast.success("Refund approved") : toast.error("Dispute rejected");
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <FilterBar
          filters={[{ key: "status", label: "Status", options: [{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] }]}
          activeFilters={filters}
          onFilterChange={(k, v) => setFilters({ ...filters, [k]: v })}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search disputes..."
        />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                {["ID", "Student", "Mentor", "Session", "Reason", "Amount", "Evidence", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  style={{ background: selected?.id === d.id ? C.blueBg : "white", cursor: "pointer" }}
                  onClick={() => setSelected(selected?.id === d.id ? null : d)}
                  onMouseEnter={(e) => { if (selected?.id !== d.id) (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220, 20%, 98%)"; }}
                  onMouseLeave={(e) => { if (selected?.id !== d.id) (e.currentTarget as HTMLTableRowElement).style.background = "white"; }}
                >
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.blue }}>{d.id}</td>
                  <td style={TD}>{d.student}</td>
                  <td style={TD}>{d.mentor}</td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{d.session}</td>
                  <td style={{ ...TD, maxWidth: 200 }}><span style={{ fontSize: 12, color: C.textMuted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{d.reason}</span></td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>${d.amount}</td>
                  <td style={TD}><span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.blue }}><ExternalLink size={11} />{d.evidence}</span></td>
                  <td style={TD}><span style={badge(disputeVariant(d.status))}>{d.status}</span></td>
                  <td style={{ ...TD, color: C.textMuted }}>{d.created}</td>
                  <td style={TD}>
                    {d.status === "Open" && (
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={(e) => { e.stopPropagation(); update(d.id, "Approved"); }} style={{ ...ghostBtn, color: C.green }}>Approve</button>
                        <button onClick={(e) => { e.stopPropagation(); update(d.id, "Rejected"); }} style={{ ...ghostBtn, color: C.red }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Dispute ${selected?.id}`}
        width={320}
        footer={selected?.status === "Open" ? (
          <>
            <button style={{ ...primaryBtn, flex: 1, justifyContent: "center", background: C.green }} onClick={() => update(selected.id, "Approved")}>Approve refund</button>
            <button style={{ ...secondaryBtn, flex: 1, justifyContent: "center", color: C.red, borderColor: C.redBorder }} onClick={() => update(selected.id, "Rejected")}>Reject</button>
          </>
        ) : undefined}
      >
        {selected && (
          <>
            <div style={{ padding: "10px 12px", background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.red, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Student complaint</div>
              <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.55 }}>{selected.reason}</p>
            </div>
            <DrawerField label="Dispute ID" value={selected.id} mono />
            <DrawerField label="Amount"     value={`$${selected.amount}`} />
            <DrawerField label="Session"    value={selected.session} mono />
            <DrawerField label="Evidence"   value={selected.evidence} />
            <DrawerField label="Created"    value={selected.created} />
            <DrawerDivider />
            <DrawerField label="Status" value={<span style={badge(disputeVariant(selected.status))}>{selected.status}</span>} />
            <InternalNoteSection disputeId={selected.id} />
          </>
        )}
      </Drawer>
    </div>
  );
}

// ─── Service Types (platform admin) ───────────────────────────────────────────

function ServiceTypesTab() {
  const [types, setTypes] = useState(platformServiceTypes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = types.find((t) => t.id === editingId);

  const [editForm, setEditForm] = useState<typeof platformServiceTypes[0] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<Partial<typeof platformServiceTypes[0]>>({});

  const openEdit = (id: string) => {
    const t = types.find((t) => t.id === id)!;
    setEditForm({ ...t });
    setEditingId(id);
  };

  const saveEdit = () => {
    if (!editForm) return;
    setTypes((prev) => prev.map((t) => t.id === editForm.id ? editForm : t));
    setEditingId(null);
    toast.success("Service type updated");
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", height: 32, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {editForm && (
        <Modal
          open
          onClose={() => setEditingId(null)}
          title={`Edit service type — ${editForm.label}`}
          width={460}
          footer={
            <>
              <button onClick={() => setEditingId(null)} style={secondaryBtn}>Cancel</button>
              <button onClick={saveEdit} style={primaryBtn}>Save changes</button>
            </>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Service name</label>
            <input value={editForm.label} onChange={(e) => setEditForm((f) => f ? { ...f, label: e.target.value } : f)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Status</label>
            <select value={editForm.status} onChange={(e) => setEditForm((f) => f ? { ...f, status: e.target.value } : f)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea 
              value={editForm.description || ""} 
              onChange={(e) => setEditForm((f) => f ? { ...f, description: e.target.value } : f)} 
              style={{ ...inputStyle, height: 68, padding: "8px 10px", resize: "none", lineHeight: 1.5 }} 
              placeholder="Describe this service type..."
            />
          </div>
        </Modal>
      )}

      {isAdding && (
        <Modal
          open
          onClose={() => setIsAdding(false)}
          title="Add service type"
          width={460}
          footer={
            <>
              <button onClick={() => setIsAdding(false)} style={secondaryBtn}>Cancel</button>
              <button onClick={() => {
                const newId = addForm.label?.toLowerCase().replace(/\s+/g, '-') || `new-${Date.now()}`;
                setTypes([...types, {
                  id: newId,
                  label: addForm.label || "New Service",
                  status: addForm.status || "Active",
                  description: addForm.description || "",
                  activeMentors: 0
                }]);
                setIsAdding(false);
                toast.success("Service type added");
              }} style={primaryBtn}>Add service</button>
            </>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Service Type</label>
            <input value={addForm.label || ""} onChange={(e) => setAddForm({...addForm, label: e.target.value})} style={inputStyle} placeholder="e.g. Portfolio Review" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Status</label>
            <select value={addForm.status || "Active"} onChange={(e) => setAddForm({...addForm, status: e.target.value})} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea 
              value={addForm.description || ""} 
              onChange={(e) => setAddForm({...addForm, description: e.target.value})} 
              style={{ ...inputStyle, height: 68, padding: "8px 10px", resize: "none", lineHeight: 1.5 }} 
              placeholder="Describe this service type..."
            />
          </div>
        </Modal>
      )}

      {/* Toolbar */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, background: C.bgWhite, display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 46 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Settings size={13} style={{ color: C.textSub }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Platform service types</span>
          <span style={{ fontSize: 11, color: C.textSub }}>— defines the bookable session types offered to students</span>
        </div>
        <button onClick={() => { setAddForm({ status: "Active" }); setIsAdding(true); }} style={primaryBtn}>
          <Plus size={12} /> Add service type
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
            <tr>
              {["Service type", "Active mentors", "Status", ""].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((t, idx) => (
              <tr key={t.id} style={{ background: idx % 2 === 0 ? "white" : "hsl(220, 20%, 99%)", borderBottom: `1px solid hsl(220, 16%, 94%)` }}>
                <td style={{ ...TD, fontWeight: 600 }}>{t.label}</td>
                <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>{t.activeMentors}</td>
                <td style={TD}><span style={badge(t.status === "Active" ? "green" : "gray")}>{t.status}</span></td>
                <td style={TD}>
                  <button onClick={() => openEdit(t.id)} style={{ ...secondaryBtn, height: 26, fontSize: 11 }}>
                    <Pencil size={10} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function MentorshipManagement() {
  const [tab, setTab] = useState<TabId>("mentors");

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "mentors",       label: "Mentor directory",    count: mentors.length },
    { id: "sessions",      label: "Sessions",            count: sessions.length },
    { id: "reschedule",    label: "Reschedule / Cancel", count: reschedules.filter((r) => r.status === "Requested").length },
    { id: "disputes",      label: "Disputes",            count: disputes.filter((d) => d.status === "Open").length },
    { id: "service-types", label: "Service types" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage }}>
      <div style={{ background: C.bgWhite, borderBottom: `1px solid ${C.border}`, padding: "0 16px", display: "flex", gap: 0, flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              height: 44, padding: "0 14px", border: "none",
              borderBottom: `2px solid ${tab === t.id ? C.blue : "transparent"}`,
              background: "transparent", color: tab === t.id ? C.blue : C.textMuted,
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", gap: 6,
              transition: "color 120ms ease, border-color 120ms ease",
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ background: tab === t.id ? C.blue : "hsl(220, 16%, 88%)", color: tab === t.id ? "white" : C.textMuted, fontSize: 10, fontWeight: 700, padding: "0 5px", lineHeight: "16px", borderRadius: 9999 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bgWhite }}>
        {tab === "mentors"       && <MentorDirectory />}
        {tab === "sessions"      && <SessionsTab />}
        {tab === "reschedule"    && <RescheduleTab />}
        {tab === "disputes"      && <DisputesTab />}
        {tab === "service-types" && <ServiceTypesTab />}
      </div>
    </div>
  );
}
