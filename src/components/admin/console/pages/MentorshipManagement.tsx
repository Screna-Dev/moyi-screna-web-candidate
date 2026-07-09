import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { safeCapture } from "@/utils/posthog";
import { EVENTS } from "@/constants/analyticsEvents";
import { Plus, Check, X, ExternalLink, Search, AlertTriangle, ToggleLeft, ToggleRight, Pencil, Settings, Copy, Star, Trash2, ShieldCheck, Mail, Link2, Lock } from "lucide-react";
import { C, badge, TH, TD, primaryBtn, secondaryBtn, ghostBtn, card } from "../ui/styles";
import type { BadgeVariant } from "../ui/styles";
import { FilterBar } from "../ui/FilterBar";
import { Drawer } from "../ui/Drawer";
import { DrawerField, DrawerDivider } from "../ui/DrawerField";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import {
  listMentors,
  getMentor,
  onboardMentor,
  updateMentorProfile,
  updateMentorTopic,
  listMentorTopics,
  updateMentorStatus,
  setMentorIdentityVerification,
  getMentorResumeAsAdmin,
  listBookings,
  adminCancelBooking,
  adminRescheduleBooking,
  listDisputes,
  resolveDispute,
  deleteReview,
} from "../../../../services/mentorshipAdminService";
import { updateBookingMentorNote } from "../../../../services/MentorService";

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

// Upper bounds for mentor pricing so an arbitrary number can't be entered.
const MAX_RATE_30 = 1000; // $/30 min
const MAX_RATE_60 = 2000; // $/1 hr
const clampRate = (value: number, max: number) =>
  Math.min(Math.max(0, Math.round(Number(value) || 0)), max);

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
  mentorNote: string;
  topicId?: string;
  price30min?: number;
  price60min?: number;
};

type ApiStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
type ReviewStatus = "AWAITING_REVIEW" | "ADMIN_APPROVED" | "REJECTED" | "SUSPENDED";

type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  sessionType: string;
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
  apiStatus?: ApiStatus;
  reviewStatus?: ReviewStatus;
  statusReason?: string;
  calConnected: boolean;
  emailVerified: boolean;
  linkedinUrl: string;
  resumeUrl: string;
  verified: boolean;
  sessions: number;
  revenue: number;
  unpaid: number;
  offerings: ServiceOffering[];
  // Raw bookable topics — kept so price edits can PUT each real topic by id,
  // regardless of whether its title maps to a known service type.
  topics: { id: string; price30min: number; price60min: number }[];
  reviews: Review[];
};

// ─── API ↔ UI mappers ─────────────────────────────────────────────────────────

const STATUS_API_TO_UI: Record<ApiStatus, Mentor["status"]> = {
  PENDING: "Pending",
  APPROVED: "Active",
  REJECTED: "Suspend",
  SUSPENDED: "Suspend",
};

function mapApiMentor(api: any): Mentor {
  const apiTopics: any[] = Array.isArray(api?.topics) ? api.topics : [];
  const activeTopics = apiTopics.filter((t) => t?.active);
  const price30s = activeTopics.map((t) => Number(t?.price30min) || 0).filter((n) => n > 0);
  const price60s = activeTopics.map((t) => Number(t?.price60min) || 0).filter((n) => n > 0);
  // Topic prices are stored in cents — convert to dollars, keeping 2 decimals.
  const rate30 = price30s.length ? Math.min(...price30s) / 100 : 0;
  const rate60 = price60s.length ? Math.min(...price60s) / 100 : 0;

  // Service offerings are persisted on the profile's expertiseTags, so an
  // offering is "enabled" when its service-type label is present there.
  const expertiseTags: string[] = Array.isArray(api?.expertiseTags) ? api.expertiseTags : [];
  const offerings: ServiceOffering[] = ALL_SERVICE_TYPES.map((t) => {
    const matched = apiTopics.find((top) => (top?.title || "").toLowerCase() === t.label.toLowerCase());
    const enabled = expertiseTags.some((tag) => (tag || "").toLowerCase() === t.label.toLowerCase());
    return {
      typeId: t.id,
      enabled,
      rate: Number(matched?.price60min) || 0,
      pricingType: "per-hour",
      duration: 60,
      expertiseTags: [],
      description: matched?.description || "",
      notes: "",
      mentorNote: matched?.mentorNote || "",
      topicId: matched?.id,
      price30min: Number(matched?.price30min) || 0,
      price60min: Number(matched?.price60min) || 0,
    };
  });

  return {
    id: api?.id || "",
    name: api?.name || "",
    email: api?.email || api?.workEmail || "",
    bio: api?.bio || "",
    timezone: api?.googleTimezone || "",
    expertiseTags,
    rate30,
    rate60,
    status: STATUS_API_TO_UI[(api?.status as ApiStatus) || "PENDING"] || "Pending",
    apiStatus: (api?.status as ApiStatus) || "PENDING",
    reviewStatus: ((api?.reviewState ?? api?.reviewStatus ?? "").toString().trim().toUpperCase() || undefined) as ReviewStatus | undefined,
    statusReason: api?.statusReason || "",
    calConnected: !!api?.calendarConnected,
    emailVerified: !!(api?.emailVerified ?? api?.workEmail),
    linkedinUrl: api?.linkedinUrl || "",
    resumeUrl: api?.resumeUrl || api?.resumePath || api?.resume_url || "",
    verified: !!api?.identityVerified,
    sessions: 0,
    revenue: 0,
    unpaid: 0,
    offerings,
    topics: apiTopics
      .filter((t) => t?.id)
      .map((t) => ({
        id: String(t.id),
        price30min: Number(t?.price30min) || 0,
        price60min: Number(t?.price60min) || 0,
      })),
    reviews: Array.isArray(api?.reviews)
      ? api.reviews.map((r: any, i: number) => ({
          id: r?.id || String(i),
          author: r?.studentName || r?.author || "Anonymous",
          rating: Number(r?.overallRating ?? r?.rating) || 0,
          comment: r?.comment || "",
          date: r?.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : (r?.date || ""),
          sessionType: r?.topicTitle || r?.sessionType || "",
        }))
      : [],
  };
}

type Session = {
  id: string;
  student: string;
  mentor: string;
  mentorId?: string;
  serviceType: string;
  time: string;
  rawStart?: string;
  status: string;
  payment: number;
  refundEligible: boolean;
  within48h: boolean;
  mentorNote?: string;
  studentNote?: string;
};

function mapApiBooking(api: any): Session {
  const statusMap: Record<string, string> = {
    PENDING: "Upcoming",
    CONFIRMED: "Upcoming",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    EXPIRED: "Cancelled",
  };
  const start = api?.startTime ? new Date(api.startTime) : null;
  const now = new Date();
  const within48h = !!start && (start.getTime() - now.getTime()) > 0 && (start.getTime() - now.getTime()) < 48 * 60 * 60 * 1000;
  const display = start
    ? start.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
  const amount = Number(api?.amountCents) || 0;
  const apiStatus = (api?.status || "").toUpperCase();
  return {
    id: api?.id || "",
    student: api?.studentName || api?.studentId || "—",
    mentor: api?.mentorName || "—",
    mentorId: api?.mentorId,
    serviceType: api?.topicTitle || "—",
    time: display,
    rawStart: api?.startTime,
    status: statusMap[apiStatus] || apiStatus || "—",
    payment: amount / 100,
    refundEligible: apiStatus === "PENDING" || apiStatus === "CONFIRMED",
    within48h,
    mentorNote: api?.mentorNote ?? undefined,
    studentNote: api?.studentNote ?? undefined,
  };
}

type Dispute = {
  id: string;
  student: string;
  mentor: string;
  session: string;
  reason: string;
  amount: number;
  evidence: string;
  status: string;
  created: string;
};

function mapApiDispute(api: any): Dispute {
  const statusMap: Record<string, string> = {
    PENDING: "Open",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  const created = api?.createdAt ? new Date(api.createdAt) : null;
  return {
    id: api?.id || "",
    student: api?.studentName || "—",
    mentor: api?.mentorName || "—",
    session: api?.bookingId || "—",
    reason: api?.description || api?.reason || "—",
    amount: (Number(api?.amountCents) || 0) / 100,
    evidence: api?.reason || "—",
    status: statusMap[(api?.status || "").toUpperCase()] || "Open",
    created: created ? created.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
  };
}

const reschedules: Array<{ id: string; student: string; mentor: string; originalTime: string; newTime: string; reason: string; within48h: boolean; status: string }> = [];

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

      {/* Mentor note — shown to student after booking */}
      <div style={row}>
        <label style={labelStyle}>Note to students (sent after booking)</label>
        <textarea
          value={form.mentorNote}
          onChange={(e) => setForm((f) => ({ ...f, mentorNote: e.target.value }))}
          placeholder="How students should prepare, what to bring, links to read first..."
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

// ─── Manage Reviews ───────────────────────────────────────────────────────────

function StarRating({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          style={{ color: s <= Math.round(value) ? "#D97706" : "hsl(220, 16%, 88%)", fill: s <= Math.round(value) ? "#D97706" : "hsl(220, 16%, 88%)" }}
        />
      ))}
    </div>
  );
}

const REVIEWS_PAGE_SIZE = 3;

function ManageReviews({ reviews: initialReviews }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => { setReviews(initialReviews ?? []); setPage(1); }, [initialReviews]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageReviews = reviews.slice((safePage - 1) * REVIEWS_PAGE_SIZE, safePage * REVIEWS_PAGE_SIZE);

  const handleDelete = async (id: string) => {
    try {
      await deleteReview(id);
      setReviews((prev) => {
        const next = prev.filter((r) => r.id !== id);
        const newTotal = Math.max(1, Math.ceil(next.length / REVIEWS_PAGE_SIZE));
        setPage((p) => Math.min(p, newTotal));
        return next;
      });
      setConfirmDeleteId(null);
      toast.success("Review removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove review");
    }
  };

  return (
    <div>
      <DrawerDivider />
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Manage Reviews
        </div>
        {avgRating !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarRating value={avgRating} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{avgRating.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>({reviews.length})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textMuted, padding: "10px 0" }}>No reviews yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {pageReviews.map((r) => (
            <div
              key={r.id}
              style={{
                border: `1px solid ${confirmDeleteId === r.id ? "#FCA5A5" : C.border}`,
                borderRadius: 8,
                background: confirmDeleteId === r.id ? "#FEF2F2" : C.bgSubtle,
                padding: "9px 11px",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <StarRating value={r.rating} size={11} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{r.author}</span>
                    {r.date && <span style={{ fontSize: 10, color: C.textMuted }}>· {r.date}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5, wordBreak: "break-word" }}>{r.comment}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {confirmDeleteId === r.id ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 10, color: C.red, fontWeight: 600, whiteSpace: "nowrap" }}>Delete this review?</span>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ ...ghostBtn, height: 22, fontSize: 10, padding: "0 7px" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          style={{ ...ghostBtn, height: 22, fontSize: 10, padding: "0 7px", color: C.red }}
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      title="Delete review"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.textMuted, display: "flex", alignItems: "center", borderRadius: 5 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{ ...ghostBtn, height: 26, fontSize: 11, padding: "0 8px", opacity: safePage === 1 ? 0.4 : 1, cursor: safePage === 1 ? "not-allowed" : "pointer" }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{ ...ghostBtn, height: 26, fontSize: 11, padding: "0 8px", opacity: safePage === totalPages ? 0.4 : 1, cursor: safePage === totalPages ? "not-allowed" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Expertise tag chip (inside Drawer) ───────────────────────────────────────

const serviceTagStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  height: 28, padding: "0 11px",
  background: "#f3f4f7", border: "1px solid #e1e4ea",
  borderRadius: 9999, fontSize: 12, fontWeight: 500,
  color: "#1e232f", whiteSpace: "nowrap" as const,
  fontFamily: "'Inter', sans-serif",
};

// ─── Verification Section ─────────────────────────────────────────────────────

function VerificationSection({
  mentor,
  onConfirm,
}: {
  mentor: Mentor;
  onConfirm: () => void;
}) {
  const bothDone = mentor.emailVerified && !!mentor.linkedinUrl;
  const canConfirm = bothDone && !mentor.verified;

  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "10px 12px", borderRadius: 6,
  };
  const iconWrap: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 4, background: "#f3f4f7",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  const checkIcon = <Check size={13} style={{ color: "#248f74" }} />;

  return (
    <div style={{ marginTop: 0 }}>
      <DrawerDivider />

      {/* Title */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Identity Verification
      </div>

      {/* Verified banner */}
      {mentor.verified && (
        <div style={{ background: "#e8fdf7", border: "1px solid #8bf4d9", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#b9f8e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={18} style={{ color: "#1f7a63" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1f473d" }}>Identity Verified</span>
              <span style={{ background: "#dffcf4", border: "1px solid #8bf4d9", borderRadius: 9999, padding: "1px 9px", fontSize: 11, fontWeight: 600, color: "#248f74" }}>Verified</span>
            </div>
            <div style={{ fontSize: 12, color: "#367d6b" }}>All submitted documents have been reviewed and approved.</div>
          </div>
        </div>
      )}

      {/* Checklist rows */}
      <div style={{ marginBottom: 10 }}>
        <div style={rowStyle}>
          <div style={iconWrap}><Mail size={15} style={{ color: "#5a6172" }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1e232f" }}>Work Email</span>
              {mentor.emailVerified && checkIcon}
            </div>
            <div style={{ fontSize: 12, color: "#5a6172" }}>{mentor.email || "—"}</div>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={iconWrap}><Link2 size={15} style={{ color: "#5a6172" }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1e232f" }}>LinkedIn Profile</span>
              {mentor.linkedinUrl && checkIcon}
            </div>
            <div style={{ fontSize: 12, color: "#5a6172" }}>{mentor.linkedinUrl || <span style={{ color: C.textMuted, fontStyle: "italic" }}>Not submitted</span>}</div>
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "10px 12px", marginBottom: 12 }}>
        <Lock size={13} style={{ color: "#5a6172", marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: "#5a6172", margin: 0, lineHeight: 1.5 }}>
          Documents are used only for internal review and are <strong style={{ color: "#1e232f" }}>never shown publicly</strong>.
        </p>
      </div>

      {/* Action buttons */}
      {!mentor.verified && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              if (canConfirm) { onConfirm(); toast.success("Verification confirmed"); }
            }}
            disabled={!canConfirm}
            title={!canConfirm ? "Both email and LinkedIn must be completed first" : undefined}
            style={{
              ...primaryBtn, flex: 1, justifyContent: "center",
              opacity: canConfirm ? 1 : 0.45,
              cursor: canConfirm ? "pointer" : "not-allowed",
              background: "#1f7a63", borderColor: "#1f7a63",
            }}
          >
            <ShieldCheck size={13} /> Verification Confirmed
          </button>
          <button
            onClick={() => toast.success(`Reminder sent to ${mentor.email}`)}
            style={{ ...secondaryBtn, flexShrink: 0 }}
            title="Send reminder email"
          >
            <Mail size={13} /> Remind
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Mentor Wizard ───────────────────────────────────────────────────────

function AddMentorWizard({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<Mentor>>({
    name: "", email: "", password: "", bio: "", expertiseTags: [], rate30: 50, rate60: 100, unpaid: 0,
    offerings: ALL_SERVICE_TYPES.map(t => ({
      typeId: t.id,
      enabled: t.id === "mock-interview" || t.id === "resume-review",
      rate: 100, pricingType: "per-hour", duration: 60, expertiseTags: [], description: "", notes: "", mentorNote: ""
    }))
  });

  const next = () => setStep(s => Math.min(s + 1, 4));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const topics = (form.offerings || [])
        .filter((o) => o.enabled)
        .map((o) => {
          const label = ALL_SERVICE_TYPES.find((t) => t.id === o.typeId)?.label || o.typeId;
          return {
            title: label,
            description: o.description || "",
            mentorNote: o.mentorNote || "",
            price30min: Math.max(0, Math.round((Number(form.rate30) || 0) * 100)),
            price60min: Math.max(0, Math.round((Number(form.rate60) || 0) * 100)),
            bothPricesSet: true,
          };
        });
      await onboardMentor({
        name: form.name || "",
        email: form.email || "",
        password: form.password || "",
        bio: form.bio || "",
        headline: "",
        expertiseTags: form.expertiseTags || [],
        company: "",
        title: "",
        yearsOfExperience: 0,
        topics,
      });
      toast.success("Mentor onboarded successfully");
      onComplete();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to onboard mentor");
    } finally {
      setSubmitting(false);
    }
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
            <button onClick={handleComplete} disabled={submitting} style={{ ...primaryBtn, width: 140, justifyContent: "center", opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>{submitting ? "Sending..." : "Send Invitation"}</button>
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
              <input type="number" min={0} max={MAX_RATE_30} style={inputStyle} value={form.rate30} onChange={e => setForm({...form, rate30: clampRate(Number(e.target.value), MAX_RATE_30)})} />
            </div>
            <div>
              <label style={labelStyle}>Rate ($/1 hr)</label>
              <input type="number" min={0} max={MAX_RATE_60} style={inputStyle} value={form.rate60} onChange={e => setForm({...form, rate60: clampRate(Number(e.target.value), MAX_RATE_60)})} />
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
  const [mentorList, setMentorList] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadMentors = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatusFilter =
        filters.status === "pending" ? "PENDING" :
        filters.status === "active"  ? "APPROVED" :
        filters.status === "suspend" ? "SUSPENDED" : undefined;
      const params: Record<string, any> = { page: 0, size: 100 };
      if (apiStatusFilter) params.status = apiStatusFilter;
      const res = await listMentors(params);
      const content = res?.data?.data?.content || [];
      setMentorList(content.map(mapApiMentor));
    } catch (err: any) {
      console.error("Failed to load mentors", err);
      toast.error(err?.response?.data?.message || "Failed to load mentors");
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  useEffect(() => { loadMentors(); }, [loadMentors]);

  const filtered = mentorList.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openDetail = async (m: Mentor) => {
    setSelected(m);
    setEditForm(m);
    setIsEditing(false);
    try {
      const res = await getMentor(m.id);
      const detail = res?.data?.data;
      if (detail) {
        const mapped = mapApiMentor(detail);
        // The mentor detail no longer carries a resume URL directly — fetch a
        // fresh presigned download URL from the admin resume endpoint. Failure
        // is non-fatal; the drawer just falls back to "Not submitted".
        try {
          const resumeRes = await getMentorResumeAsAdmin(m.id);
          const resumeUrl = resumeRes?.data?.data?.url || resumeRes?.data?.url || "";
          if (resumeUrl) mapped.resumeUrl = resumeUrl;
        } catch (resumeErr) {
          console.error("Failed to load mentor resume", resumeErr);
        }
        setSelected(mapped);
        setEditForm(mapped);
        setMentorList((prev) => prev.map((x) => x.id === mapped.id ? mapped : x));
      }
    } catch (err) {
      console.error("Failed to load mentor detail", err);
    }
  };

  const approveMentor = async (m: Mentor) => {
    try {
      const res = await updateMentorStatus(m.id, { status: "APPROVED" });
      const updated = res?.data?.data;
      const resultStatus = (updated?.status as ApiStatus) || undefined;
      // Approving only sets the admin-approved flag + grants the MENTOR role.
      // The mentor is fully APPROVED only once Google Calendar is connected,
      // office hours are configured, and an active topic exists — otherwise the
      // backend keeps the profile PENDING and explains the gap in statusReason.
      if (resultStatus === "APPROVED") {
        toast.success(`${m.name} approved — profile is now active`);
      } else {
        toast.info(
          updated?.statusReason ||
            `${m.name} admin-approved — waiting on mentor setup (calendar, office hours, active topic) before going live`
        );
      }
      // The admin review decision is now ADMIN_APPROVED. The operational status
      // can stay PENDING (waiting on calendar/office-hours/topic), so we can't
      // rely on loadMentors deriving the review state from status — stamp the
      // known reviewStatus onto local state so the Approve/Deny buttons clear.
      const newReview: ReviewStatus = (updated?.reviewStatus as ReviewStatus);
      await loadMentors();
      setMentorList((prev) => prev.map((x) => x.id === m.id ? { ...x, reviewStatus: newReview } : x));
      if (selected?.id === m.id) {
        setSelected((prev) => {
          const base = updated ? mapApiMentor(updated) : prev;
          return base ? { ...base, reviewStatus: newReview } : prev;
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve mentor");
    }
  };

  const denyMentor = async (m: Mentor, reason: string) => {
    try {
      await updateMentorStatus(m.id, { status: "REJECTED", reason });
      toast.success(`${m.name} denied`);
      await loadMentors();
      setMentorList((prev) => prev.map((x) => x.id === m.id ? { ...x, reviewStatus: "REJECTED" } : x));
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to deny mentor");
    }
  };

  const saveProfile = async (form: Mentor) => {
    try {
      // 1) Profile — real name + expertise tags (and bio/headline).
      await updateMentorProfile(form.id, {
        realName: form.name || "",
        bio: form.bio || "",
        headline: "",
        expertiseTags: form.expertiseTags || [],
      });

      // 2) Topic prices — apply the edited rates (dollars → cents) to every
      //    bookable topic. null/omitted leaves a price unchanged, and prices
      //    must be ≥ 1000 cents, so only send values that clear that floor.
      const price30min = Math.round((Number(form.rate30) || 0) * 100);
      const price60min = Math.round((Number(form.rate60) || 0) * 100);
      const pricePayload: { price30min?: number; price60min?: number } = {};
      if (price30min >= 1000) pricePayload.price30min = price30min;
      if (price60min >= 1000) pricePayload.price60min = price60min;
      if (pricePayload.price30min || pricePayload.price60min) {
        // The edit form doesn't reliably carry the topic list, so fetch the
        // mentor's real topics (a single auto-created "Mentorship Session") and
        // PUT the new prices to each one by id.
        let topicIds = Array.from(new Set((form.topics || []).map((t) => t.id).filter(Boolean)));
        if (!topicIds.length) {
          const res = await listMentorTopics(form.id);
          const raw = res?.data?.data;
          const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : [];
          topicIds = Array.from(new Set(arr.map((t) => t?.id).filter(Boolean).map(String)));
        }
        if (topicIds.length) {
          await Promise.all(
            topicIds.map((topicId) => updateMentorTopic(form.id, topicId, pricePayload))
          );
        } else {
          toast.error("No bookable topic found for this mentor — price not updated");
        }
      }

      // 3) Status change (if any).
      const apiStatusFromUi: Record<Mentor["status"], ApiStatus> = {
        Pending: "PENDING",
        Active: "APPROVED",
        Suspend: "SUSPENDED",
      };
      const targetApiStatus = apiStatusFromUi[form.status];
      if (form.apiStatus && targetApiStatus && targetApiStatus !== form.apiStatus) {
        await updateMentorStatus(form.id, { status: targetApiStatus });
      }
      toast.success("Profile saved");
      // Refetch so the list and the open detail drawer reflect the saved
      // changes immediately.
      await loadMentors();
      try {
        const res = await getMentor(form.id);
        const detail = res?.data?.data;
        if (detail) {
          const mapped = mapApiMentor(detail);
          setSelected(mapped);
          setEditForm(mapped);
          setMentorList((prev) => prev.map((x) => x.id === mapped.id ? mapped : x));
        }
      } catch (e) {
        console.error("Failed to refresh mentor detail after save", e);
      }
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save profile");
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {isAddOpen && (
        <AddMentorWizard
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onComplete={async () => {
            setIsAddOpen(false);
            await loadMentors();
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
                  {["Mentor", "Rate", "Status", "Calendar", "Sessions", "Revenue", "Unpaid", ""].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
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
                      <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>
                        <div style={{ fontSize: 12 }}>${m.rate30.toFixed(2)}/30 min</div>
                        {m.rate60 > 0 && (
                          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                            ${m.rate60.toFixed(2)}/1 hr
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
                          {m.reviewStatus === "AWAITING_REVIEW" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to approve ${m.name}?`)) {
                                    approveMentor(m);
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
                  saveProfile(editForm);
                }
              }}>Save changes</button>
            </>
          ) : selected?.reviewStatus === "AWAITING_REVIEW" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selected && window.confirm(`Are you sure you want to approve ${selected.name}?`)) {
                    approveMentor(selected);
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
                  {selected.email ? (
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
                  ) : (
                    <span style={{ fontStyle: "italic" }}>No email on file</span>
                  )}
                </div>
              </div>
            </div>

            {selected.reviewStatus === "AWAITING_REVIEW" ? (
              <div style={{ padding: "16px", background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <AlertTriangle size={18} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 4 }}>Application Review Required</div>
                    <div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5 }}>
                      This mentor has applied to join the platform. Please review their profile and service offerings before approving.
                    </div>
                    {selected.statusReason && (
                      <div style={{ fontSize: 11, color: C.amber, lineHeight: 1.5, marginTop: 6, fontWeight: 600 }}>
                        Still pending: {selected.statusReason}
                      </div>
                    )}
                  </div>
                </div>
                <DrawerDivider />
                <DrawerField label="Mentor Full Name" value={selected.name || <span style={{ color: C.textSub, fontStyle: "italic" }}>Not submitted</span>} />
                <DrawerField label="Work Email" value={selected.email || <span style={{ color: C.textSub, fontStyle: "italic" }}>No email on file</span>} />
                <DrawerField
                  label="LinkedIn URL"
                  value={selected.linkedinUrl ? (
                    <a
                      href={selected.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: C.blue, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", wordBreak: "break-all" }}
                    >
                      <Link2 size={12} style={{ flexShrink: 0 }} />{selected.linkedinUrl}
                    </a>
                  ) : <span style={{ color: C.textSub, fontStyle: "italic" }}>Not submitted</span>}
                />
                <DrawerField
                  label="Resume"
                  value={selected.resumeUrl ? (
                    <a
                      href={selected.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: C.blue, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                    >
                      <ExternalLink size={12} style={{ flexShrink: 0 }} />Download resume
                    </a>
                  ) : <span style={{ color: C.textSub, fontStyle: "italic" }}>Not submitted</span>}
                />
              </div>
            ) : (
              <>
                <DrawerField label="Rate (30 min)" value={`$${(selected.rate30 || 0).toFixed(2)}`} />
                <DrawerField label="Rate (1 hr)" value={`$${(selected.rate60 || 0).toFixed(2)}`} />
                <DrawerField label="Unpaid Balance" value={`$${(selected.unpaid || 0).toLocaleString()}`} />
                <DrawerField label="Sessions delivered"  value={String(selected.sessions || 0)} />
                <DrawerField label="Total revenue"       value={`$${(selected.revenue || 0).toLocaleString()}`} />

                <DrawerDivider />

                {/* Google Calendar */}
                <div style={{ padding: "10px 12px", background: selected.calConnected ? C.greenBg : C.redBg, border: `1px solid ${selected.calConnected ? C.greenBorder : C.redBorder}`, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: selected.calConnected ? C.green : C.red, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Google Calendar OAuth</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: selected.calConnected ? C.green : C.red }}>
                    {selected.calConnected ? <Check size={13} /> : <X size={13} />}
                    {selected.calConnected ? "Connected and syncing" : "Not connected — action required"}
                  </div>
                </div>

                {/* Verification */}
                <VerificationSection
                  mentor={selected}
                  onConfirm={async () => {
                    // Optimistically flip the badge, then persist via the admin API.
                    setMentorList((prev) => prev.map((m) => m.id === selected.id ? { ...m, verified: true } : m));
                    setSelected({ ...selected, verified: true });
                    try {
                      await setMentorIdentityVerification(selected.id, { identityVerified: true });
                    } catch (err: any) {
                      // Roll back the optimistic update if the request fails.
                      setMentorList((prev) => prev.map((m) => m.id === selected.id ? { ...m, verified: false } : m));
                      setSelected((prev) => prev && prev.id === selected.id ? { ...prev, verified: false } : prev);
                      toast.error(err?.response?.data?.message || "Failed to set identity verification");
                    }
                  }}
                />

                <DrawerDivider />

                {/* Expertise Tags */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Expertise Tags
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.expertiseTags.length === 0
                      ? <span style={{ fontSize: 12, color: C.textMuted }}>No expertise tags</span>
                      : selected.expertiseTags.map((t) => <span key={t} style={serviceTagStyle}>{t}</span>)}
                  </div>
                </div>

                {/* Manage Reviews */}
                <ManageReviews reviews={selected.reviews} />
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
                  <input type="number" min={0} max={MAX_RATE_30} style={inputStyle} value={editForm.rate30} onChange={(e) => setEditForm({...editForm, rate30: clampRate(Number(e.target.value), MAX_RATE_30)})} />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Rate ($/1 hr)</label>
                  <input type="number" min={0} max={MAX_RATE_60} style={inputStyle} value={editForm.rate60} onChange={(e) => setEditForm({...editForm, rate60: clampRate(Number(e.target.value), MAX_RATE_60)})} />
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
              {/* Suggestions — the platform service offerings, minus ones
                  already selected. Click to add. */}
              {(() => {
                const selectedSet = new Set(editForm.expertiseTags || []);
                const suggestions = ALL_SERVICE_TYPES.map((t) => t.label).filter((t) => !selectedSet.has(t));
                if (!suggestions.length) return null;
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Suggestions</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {suggestions.map((t) => (
                        <button
                          key={t}
                          onClick={(e) => {
                            e.preventDefault();
                            setEditForm(prev => prev && !prev.expertiseTags.includes(t) ? ({ ...prev, expertiseTags: [...prev.expertiseTags, t] }) : prev);
                          }}
                          style={{ ...serviceTagStyle, background: "white", border: `1px dashed ${C.border}`, color: C.textMid, cursor: "pointer" }}
                        >
                          <Plus size={10} style={{ color: C.textMuted }} /> {t}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Drawer>

      {pendingDeny && (
        <Modal
          open
          onClose={() => { setPendingDeny(null); setDenyReason(""); }}
          title={`Deny ${pendingDeny.name}?`}
          width={420}
          footer={
            <>
              <button onClick={() => { setPendingDeny(null); setDenyReason(""); }} style={secondaryBtn}>Cancel</button>
              <button
                onClick={() => {
                  const m = pendingDeny;
                  const reason = denyReason;
                  setPendingDeny(null);
                  setDenyReason("");
                  denyMentor(m, reason);
                }}
                style={{ ...primaryBtn, background: C.red, borderColor: C.red }}
              >
                Confirm deny
              </button>
            </>
          }
        >
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
            Denying this mentor will reject their application and remove the MENTOR role from their account. Provide an optional reason.
          </div>
          <textarea
            autoFocus
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Reason for denial (optional)"
            style={{ width: "100%", height: 80, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", resize: "none", outline: "none", boxSizing: "border-box" }}
          />
        </Modal>
      )}

      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "none" }} />
      )}
    </div>
  );
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

function SessionsTab() {
  const posthog = usePostHog();
  const [filters, setFilters]   = useState<Record<string, string>>({ status: "all", when: "all", mentor: "all" });
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Session | null>(null);
  const [sessionList, setSessionList] = useState<Session[]>([]);
  const [, setLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Session | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => { setNoteDraft(selected?.mentorNote || ""); }, [selected]);

  const saveMentorNote = async () => {
    if (!selected) return;
    setSavingNote(true);
    try {
      await updateBookingMentorNote(selected.id, noteDraft);
      toast.success("Mentor note updated");
      setSessionList((prev) => prev.map((s) => s.id === selected.id ? { ...s, mentorNote: noteDraft } : s));
      setSelected((s) => s ? { ...s, mentorNote: noteDraft } : s);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update note");
    } finally {
      setSavingNote(false);
    }
  };

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, string | undefined> = {
        all: undefined,
        upcoming: "CONFIRMED",
        completed: "COMPLETED",
        cancelled: "CANCELLED",
      };
      const params: Record<string, any> = { page: 0, size: 100 };
      const apiStatus = statusMap[filters.status];
      if (apiStatus) params.status = apiStatus;
      if (filters.when === "past") params.past = true;
      else if (filters.when === "upcoming") params.past = false;
      const res = await listBookings(params);
      const content = res?.data?.data?.content || [];
      setSessionList(content.map(mapApiBooking));
    } catch (err: any) {
      console.error("Failed to load bookings", err);
      toast.error(err?.response?.data?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.when]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filtered = sessionList.filter((s) => {
    if (search && !s.student.toLowerCase().includes(search.toLowerCase()) && !s.mentor.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.refund === "eligible" && !s.refundEligible) return false;
    return true;
  });

  const cancelSession = async (id: string) => {
    try {
      await adminCancelBooking(id);
      toast.success("Session cancelled");
      await loadBookings();
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel session");
    }
  };

  const openReschedule = (s: Session) => {
    setRescheduleTarget(s);
    setRescheduleValue(isoToLocalInput(s.rawStart));
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleValue) return;
    const parsed = new Date(rescheduleValue);
    if (isNaN(parsed.getTime())) {
      toast.error("Please choose a valid date and time");
      return;
    }
    setRescheduling(true);
    try {
      await adminRescheduleBooking(rescheduleTarget.id, parsed.toISOString());
      // session_rescheduled —— 当前仅 admin/ops 侧改期入口存在（用户侧 UI 尚未实现）
      safeCapture(posthog, EVENTS.SESSION_RESCHEDULED, {
        booking_id: rescheduleTarget.id,
        initiated_by: 'admin',
      });
      toast.success("Session rescheduled");
      setRescheduleTarget(null);
      await loadBookings();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <FilterBar
          filters={[
            { key: "when", label: "When", options: [{ value: "all", label: "All" }, { value: "upcoming", label: "Upcoming" }, { value: "past", label: "Past" }] },
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
                {["Session ID", "Student", "Mentor", "Time", "Status", "Payment", "Refund", "Actions"].map((h) => (
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
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {s.within48h && <span style={badge("amber")}>48h</span>}
                      <span style={{ fontSize: 12 }}>{s.time}</span>
                    </div>
                  </td>
                  <td style={TD}><span style={badge(sessionStatusVariant(s.status))}>{s.status}</span></td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>{s.payment > 0 ? `$${s.payment.toFixed(2)}` : "—"}</td>
                  <td style={TD}><span style={badge(s.refundEligible ? "amber" : "gray")}>{s.refundEligible ? "Eligible" : "No"}</span></td>
                  <td style={TD}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button style={{ ...ghostBtn, background: C.bgWhite, border: `1px solid ${C.border}` }} onClick={(e) => { e.stopPropagation(); openReschedule(s); }}>Reschedule</button>
                      {s.status !== "Cancelled" && (
                        <button style={{ ...ghostBtn, color: C.red, background: C.bgWhite, border: `1px solid ${C.redBorder}` }} onClick={(e) => { e.stopPropagation(); if (window.confirm(`Cancel session ${s.id}? This will issue a refund if applicable.`)) cancelSession(s.id); }}>Cancel</button>
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
            <button style={{ ...primaryBtn, flex: 1, justifyContent: "center" }} onClick={() => selected && openReschedule(selected)}>Reschedule</button>
            {selected?.status !== "Cancelled" && (
              <button style={{ ...secondaryBtn, flex: 1, justifyContent: "center", color: C.red, borderColor: C.redBorder }} onClick={() => selected && window.confirm(`Cancel session ${selected.id}?`) && cancelSession(selected.id)}>Cancel session</button>
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
            <DrawerField label="Payment"     value={selected.payment > 0 ? `$${selected.payment.toFixed(2)}` : "—"} />
            <DrawerDivider />
            <DrawerField label="Status"  value={<span style={badge(sessionStatusVariant(selected.status))}>{selected.status}</span>} />
            <DrawerField label="Refund"  value={<span style={badge(selected.refundEligible ? "amber" : "gray")}>{selected.refundEligible ? "Eligible" : "Not eligible"}</span>} />
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 6 }}>Mentor note (prep advice sent to student)</div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="How to prepare, what to bring, links to read…"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <button
                onClick={saveMentorNote}
                disabled={savingNote || noteDraft === (selected.mentorNote || "")}
                style={{ ...secondaryBtn, height: 28, marginTop: 6, opacity: (savingNote || noteDraft === (selected.mentorNote || "")) ? 0.5 : 1, cursor: (savingNote || noteDraft === (selected.mentorNote || "")) ? "not-allowed" : "pointer" }}
              >
                {savingNote ? "Saving…" : "Save note"}
              </button>
            </div>
            {selected.studentNote && <DrawerField label="Student note" value={selected.studentNote} />}
            {selected.within48h && (
              <div style={{ padding: "8px 10px", background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 7, fontSize: 11, color: C.amber, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={12} /> Request is within 48-hour window
              </div>
            )}
          </>
        )}
      </Drawer>

      <Modal
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule session"
        width={420}
        footer={
          <>
            <button style={secondaryBtn} onClick={() => setRescheduleTarget(null)}>Cancel</button>
            <button
              style={{ ...primaryBtn, opacity: (!rescheduleValue || rescheduling) ? 0.5 : 1, cursor: (!rescheduleValue || rescheduling) ? "not-allowed" : "pointer" }}
              disabled={!rescheduleValue || rescheduling}
              onClick={submitReschedule}
            >
              {rescheduling ? "Saving…" : "Confirm new time"}
            </button>
          </>
        }
      >
        {rescheduleTarget && (
          <>
            <div style={{ marginBottom: 14, fontSize: 12, color: C.textSub }}>
              <div><strong style={{ color: C.text }}>{rescheduleTarget.student}</strong> with <strong style={{ color: C.text }}>{rescheduleTarget.mentor}</strong></div>
              <div style={{ marginTop: 2 }}>Current time: {rescheduleTarget.time}</div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" }}>
              New date &amp; time
            </label>
            <input
              type="datetime-local"
              value={rescheduleValue}
              onChange={(e) => setRescheduleValue(e.target.value)}
              style={{ width: "100%", height: 34, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: C.textMuted }}>
              Uses your local timezone. The student and mentor will be notified of the new time.
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// Converts an ISO 8601 timestamp into a value usable by <input type="datetime-local">
// (local-time "YYYY-MM-DDTHH:mm"), returning "" for missing/invalid input.
function isoToLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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
  const [list, setList]         = useState<Dispute[]>([]);
  const [filters, setFilters]   = useState<Record<string, string>>({ status: "all" });
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [search, setSearch]     = useState("");
  const [, setLoading]          = useState(false);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, string | undefined> = {
        all: undefined,
        open: "PENDING",
        approved: "APPROVED",
        rejected: "REJECTED",
      };
      const params: Record<string, any> = { page: 0, size: 100 };
      const apiStatus = statusMap[filters.status];
      if (apiStatus) params.status = apiStatus;
      const res = await listDisputes(params);
      const content = res?.data?.data?.content || [];
      setList(content.map(mapApiDispute));
    } catch (err: any) {
      console.error("Failed to load disputes", err);
      toast.error(err?.response?.data?.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  const filtered = list.filter((d) => {
    if (search && !d.student.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const update = async (id: string, status: string) => {
    const resolution = status === "Approved" ? "APPROVED" : "REJECTED";
    try {
      await resolveDispute(id, { resolution });
      status === "Approved" ? toast.success("Refund approved") : toast.error("Dispute rejected");
      await loadDisputes();
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update dispute");
    }
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
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace" }}>${d.amount.toFixed(2)}</td>
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
            <DrawerField label="Amount"     value={`$${selected.amount.toFixed(2)}`} />
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

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (!editForm) return;
    setTypes((prev) => prev.map((t) => t.id === editForm.id ? editForm : t));
    closeEdit();
    toast.success("Service type updated");
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", height: 32, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {editForm && (
        <Modal
          open
          onClose={closeEdit}
          title={`Edit service type — ${editForm.label}`}
          width={460}
          footer={
            <>
              <button onClick={closeEdit} style={secondaryBtn}>Cancel</button>
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
    { id: "mentors",       label: "Mentor directory" },
    { id: "sessions",      label: "Sessions" },
    { id: "reschedule",    label: "Reschedule / Cancel", count: reschedules.filter((r) => r.status === "Requested").length },
    { id: "disputes",      label: "Disputes" },
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
