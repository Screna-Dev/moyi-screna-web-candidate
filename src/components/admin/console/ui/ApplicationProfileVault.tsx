import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  X, Search, Copy, ChevronDown, ChevronRight,
  Lock, Eye, EyeOff, AlertTriangle, CheckCircle2,
  Briefcase, User, MapPin, Globe, BookOpen,
  Award, FileText, Info, Shield, MessageSquare,
  Lightbulb, Clock, Pencil, Check,
} from "lucide-react";
import { C, badge, primaryBtn, secondaryBtn } from "./styles";
import { copyText } from "./clipboard";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileField = {
  id: string;
  label: string;
  value: string;
  sensitive?: boolean;
  missing?: boolean;
  mono?: boolean;
  multiline?: boolean;
};

type ProfileSection = {
  id: string;
  label: string;
  Icon: React.ElementType;
  fields: ProfileField[];
};

type UserProfile = {
  completion: number;
  lastUpdated: string;
  missingFields: { label: string; section: string }[];
  sections: ProfileSection[];
};

// ─── Mock Profile Data ──────────────────────────────────────────────────────���─

const profiles: Record<string, UserProfile> = {
  u1: {
    completion: 84,
    lastUpdated: "May 17, 2026",
    missingFields: [
      { label: "LinkedIn profile URL", section: "Online Presence" },
      { label: "Certifications", section: "Certifications & Credentials" },
      { label: "Security question 3", section: "Security Questions" },
    ],
    sections: [
      {
        id: "job-pref",
        label: "Job Preference",
        Icon: Briefcase,
        fields: [
          { id: "target-roles",    label: "Target roles",           value: "Software Engineer, Staff SWE, Platform Engineer" },
          { id: "target-companies",label: "Target companies",       value: "Google, Meta, Amazon, Apple, Stripe, Airbnb" },
          { id: "target-locations",label: "Target locations",       value: "San Francisco, Seattle, Remote" },
          { id: "work-mode",       label: "Work mode",              value: "Hybrid or Remote preferred" },
          { id: "salary-range",    label: "Salary range",           value: "$180,000 – $220,000 + equity" },
          { id: "relocation",      label: "Relocation",             value: "Open to relocation — 4 weeks notice needed" },
          { id: "employment-type", label: "Employment type",        value: "Full-time only" },
          { id: "start-date",      label: "Earliest start date",    value: "2026-06-15" },
          { id: "industries",      label: "Target industries",      value: "Technology, Cloud Infrastructure, AI/ML, Fintech" },
          { id: "avoid",           label: "Avoid",                  value: "Early-stage startups, consulting firms, non-tech sectors" },
        ],
      },
      {
        id: "personal",
        label: "Personal Information",
        Icon: User,
        fields: [
          { id: "full-name",       label: "Full legal name",        value: "Emily Zhang Wei",              mono: false },
          { id: "preferred-name",  label: "Preferred name",         value: "Emily Zhang" },
          { id: "email",           label: "Primary email",          value: "emily@example.com",            mono: true },
          { id: "email-2",         label: "Secondary email",        value: "emily.zhang@gmail.com",        mono: true },
          { id: "phone",           label: "Phone",                  value: "+1 (415) 555-0182",            mono: true },
          { id: "dob",             label: "Date of birth",          value: "1995-08-12",                   mono: true, sensitive: true },
          { id: "gender",          label: "Gender",                 value: "Female" },
          { id: "pronouns",        label: "Pronouns",               value: "She / her" },
          { id: "ethnicity",       label: "Ethnicity (EEO)",        value: "Asian / Pacific Islander" },
          { id: "nationality",     label: "Nationality",            value: "Chinese-American" },
          { id: "languages",       label: "Languages",              value: "English (fluent), Mandarin (native)" },
        ],
      },
      {
        id: "residential",
        label: "Residential Information",
        Icon: MapPin,
        fields: [
          { id: "street",    label: "Street address",   value: "1234 Crestview Blvd, Apt 2B",  mono: false },
          { id: "city",      label: "City",             value: "San Francisco" },
          { id: "state",     label: "State",            value: "CA" },
          { id: "zip",       label: "ZIP code",         value: "94105",                        mono: true },
          { id: "country",   label: "Country",          value: "United States" },
          { id: "full-addr", label: "Full address",     value: "1234 Crestview Blvd, Apt 2B, San Francisco, CA 94105, USA" },
        ],
      },
      {
        id: "online",
        label: "Online Presence",
        Icon: Globe,
        fields: [
          { id: "linkedin",   label: "LinkedIn",    value: "",                              mono: true, missing: true },
          { id: "github",     label: "GitHub",      value: "github.com/emilyzhang",         mono: true },
          { id: "portfolio",  label: "Portfolio",   value: "emilyzhang.dev",                mono: true },
          { id: "twitter",    label: "Twitter / X", value: "@emilyzhangdev",                mono: true },
          { id: "website",    label: "Website",     value: "emilyzhang.dev",                mono: true },
          { id: "stackoverflow", label: "Stack Overflow", value: "stackoverflow.com/users/emily-zhang", mono: true },
        ],
      },
      {
        id: "work-exp",
        label: "Work Experience",
        Icon: Briefcase,
        fields: [
          { id: "exp1-title",   label: "Title (current)",      value: "Senior Software Engineer" },
          { id: "exp1-company", label: "Company (current)",    value: "Databricks" },
          { id: "exp1-dates",   label: "Dates (current)",      value: "Jan 2023 – Present" },
          { id: "exp1-desc",    label: "Description",          value: "Led design of petabyte-scale data ingestion service. Reduced P99 latency by 40%. Mentored 3 junior engineers.", multiline: true },
          { id: "exp2-title",   label: "Title (prior)",        value: "Software Engineer II" },
          { id: "exp2-company", label: "Company (prior)",      value: "Stripe" },
          { id: "exp2-dates",   label: "Dates (prior)",        value: "Jul 2020 – Dec 2022" },
          { id: "exp2-desc",    label: "Description",          value: "Built Stripe Connect payout reconciliation pipeline. Processed $2B+ monthly.", multiline: true },
          { id: "yoe",          label: "Total years of exp.",  value: "6 years" },
        ],
      },
      {
        id: "education",
        label: "Education",
        Icon: BookOpen,
        fields: [
          { id: "deg1-school",  label: "School",          value: "UC Berkeley" },
          { id: "deg1-degree",  label: "Degree",          value: "B.S. Electrical Engineering & CS (EECS)" },
          { id: "deg1-grad",    label: "Graduation year", value: "2020" },
          { id: "deg1-gpa",     label: "GPA",             value: "3.91 / 4.0" },
          { id: "deg1-honors",  label: "Honors",          value: "Summa Cum Laude, Tau Beta Pi" },
          { id: "highest-deg",  label: "Highest degree",  value: "Bachelor's" },
        ],
      },
      {
        id: "certs",
        label: "Certifications & Credentials",
        Icon: Award,
        fields: [
          { id: "cert1",       label: "Certification 1",    value: "",     missing: true },
          { id: "cert2",       label: "Certification 2",    value: "",     missing: true },
          { id: "publications",label: "Publications",       value: "None" },
          { id: "patents",     label: "Patents",            value: "None" },
          { id: "open-source", label: "Open source",       value: "Apache Spark contributor (2022–present)" },
        ],
      },
      {
        id: "app-profile",
        label: "Job Application Profile",
        Icon: FileText,
        fields: [
          { id: "app-email",   label: "Application email",    value: "emily@example.com",         mono: true },
          { id: "app-pass",    label: "Application password", value: "Tr0ub4dor&3!",              mono: true, sensitive: true },
          { id: "app-user",    label: "Username preference",  value: "emilyzhang / ezhang / emily.zhang" },
          { id: "resume-file", label: "Resume filename",      value: "Emily_Zhang_Resume_2026.pdf" },
          { id: "cover-letter",label: "Cover letter default", value: "I'm a senior SWE with 6 years of experience building distributed systems at scale. At Databricks I led a petabyte-scale ingestion service...", multiline: true },
          { id: "headline",    label: "Professional headline",value: "Senior SWE | Distributed Systems | EECS @ Berkeley" },
        ],
      },
      {
        id: "misc",
        label: "Miscellaneous Information",
        Icon: Info,
        fields: [
          { id: "disability",      label: "Disability status",        value: "No disability" },
          { id: "veteran",         label: "Veteran status",           value: "Not a veteran" },
          { id: "race-eeo",        label: "Race / ethnicity (EEO)",   value: "Asian" },
          { id: "gender-eeo",      label: "Gender (EEO)",             value: "Female" },
          { id: "willing-bg",      label: "Background check",         value: "Yes, willing to undergo background check" },
          { id: "drug-test",       label: "Drug screening",           value: "Yes, willing" },
          { id: "cleared",         label: "Security clearance",       value: "None" },
          { id: "remote-equip",    label: "Remote equipment",         value: "Has own setup — MacBook Pro M3, 4K monitor" },
        ],
      },
      {
        id: "compliance",
        label: "Compliance & Legal",
        Icon: Shield,
        fields: [
          { id: "auth-work",       label: "Authorized to work in US",  value: "Yes" },
          { id: "visa-type",       label: "Visa / status",             value: "H-1B" },
          { id: "visa-expiry",     label: "Visa expiry",               value: "2027-03-15",         mono: true },
          { id: "sponsorship",     label: "Requires sponsorship",      value: "Yes — H-1B transfer required" },
          { id: "prior-employer",  label: "Prior employer (H-1B)",     value: "Stripe Inc." },
          { id: "felony",          label: "Convicted of felony",       value: "No" },
          { id: "non-compete",     label: "Non-compete agreement",     value: "None active" },
          { id: "worked-before",   label: "Worked at company before",  value: "No (will answer per company)" },
          { id: "ref-contact",     label: "Reference contact 1",       value: "Dr. James Lin — james.lin@databricks.com — Sr. Director Eng" },
          { id: "ref-contact-2",   label: "Reference contact 2",       value: "Sarah Park — s.park@stripe.com — Engineering Manager" },
        ],
      },
      {
        id: "security",
        label: "Security Questions",
        Icon: Lock,
        fields: [
          { id: "sq1-q",  label: "Q1: Mother's maiden name",       value: "Chen",          sensitive: true },
          { id: "sq2-q",  label: "Q2: First pet's name",           value: "Dumpling",      sensitive: true },
          { id: "sq3-q",  label: "Q3: High school mascot",         value: "",              sensitive: true, missing: true },
          { id: "sq4-q",  label: "Q4: City where parents met",     value: "Guangzhou",     sensitive: true },
          { id: "sq5-q",  label: "Q5: Childhood nickname",         value: "Xiao Wei",      sensitive: true },
        ],
      },
      {
        id: "suggestions",
        label: "Suggestions to Screna",
        Icon: Lightbulb,
        fields: [
          { id: "special-instr", label: "Special instructions",    value: "Do NOT apply to companies with active layoffs. Prefer SWE roles with distributed systems focus. Check Glassdoor reviews before applying. When asked about salary, use $190k as starting point.", multiline: true },
          { id: "avoid-instr",   label: "Companies to avoid",      value: "Any company with < 50 engineers. Oracle, SAP, IBM. Companies requiring > 70% travel." },
          { id: "notes-ops",     label: "Notes for Ops",           value: "My work hours are 9am–6pm PT. Text me for urgent questions: (415) 555-0182. I check Screna app daily.", multiline: true },
        ],
      },
    ],
  },
  u2: {
    completion: 58,
    lastUpdated: "May 12, 2026",
    missingFields: [
      { label: "Application password", section: "Job Application Profile" },
      { label: "Security questions", section: "Security Questions" },
      { label: "Portfolio / website", section: "Online Presence" },
      { label: "Reference contacts", section: "Compliance & Legal" },
    ],
    sections: [],
  },
  u3: {
    completion: 91,
    lastUpdated: "May 18, 2026",
    missingFields: [
      { label: "Security question 3", section: "Security Questions" },
    ],
    sections: [],
  },
  u4: {
    completion: 12,
    lastUpdated: "May 5, 2026",
    missingFields: [
      { label: "Resume", section: "Job Application Profile" },
      { label: "Application password", section: "Job Application Profile" },
      { label: "Work experience details", section: "Work Experience" },
    ],
    sections: [],
  },
  u5: {
    completion: 77,
    lastUpdated: "May 16, 2026",
    missingFields: [
      { label: "GitHub profile", section: "Online Presence" },
      { label: "Certifications", section: "Certifications & Credentials" },
    ],
    sections: [],
  },
};

// Fallback sections for non-u1 users
const fallbackSections = (userId: string): ProfileSection[] =>
  profiles["u1"].sections.map((s) => ({
    ...s,
    fields: s.fields.map((f) => ({
      ...f,
      value: f.missing ? "" : f.sensitive ? f.value : f.value ? `[${userId} — ${f.label}]` : "",
    })),
  }));

function getProfile(userId: string): UserProfile {
  const p = profiles[userId];
  if (!p) return profiles["u1"];
  return {
    ...p,
    sections: p.sections.length > 0 ? p.sections : fallbackSections(userId),
  };
}

// ─── Quick-copy field IDs ─────────────────────────────────────────────────────

const QUICK_COPY: { label: string; fieldId: string }[] = [
  { label: "Full name",      fieldId: "full-name" },
  { label: "Email",          fieldId: "email" },
  { label: "Phone",          fieldId: "phone" },
  { label: "Address",        fieldId: "full-addr" },
  { label: "LinkedIn",       fieldId: "linkedin" },
  { label: "Work auth",      fieldId: "auth-work" },
  { label: "Sponsorship",    fieldId: "sponsorship" },
  { label: "Start date",     fieldId: "start-date" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const copyToClipboard = (value: string, label: string) => {
  copyText(value);
  toast.success(`Copied ${label} to clipboard`);
};

const completionColor = (pct: number) =>
  pct >= 80 ? C.green : pct >= 50 ? C.amber : C.red;

const completionBg = (pct: number) =>
  pct >= 80 ? C.greenBg : pct >= 50 ? C.amberBg : C.redBg;

const completionBorder = (pct: number) =>
  pct >= 80 ? C.greenBorder : pct >= 50 ? C.amberBorder : C.redBorder;

function sectionCompletion(section: ProfileSection, editedValues: Record<string, string>): number {
  const total = section.fields.length;
  if (total === 0) return 100;
  const filled = section.fields.filter((f) => {
    const v = editedValues[f.id] !== undefined ? editedValues[f.id] : f.value;
    return v && v.trim() !== "";
  }).length;
  return Math.round((filled / total) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({
  field,
  revealed,
  onReveal,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  editedValue,
}: {
  field: ProfileField;
  revealed: boolean;
  onReveal: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
  editedValue?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [draftValue, setDraftValue] = useState("");

  const effectiveValue = editedValue !== undefined ? editedValue : field.value;
  const isMissing = !effectiveValue || effectiveValue.trim() === "";
  const wasEditedToFilled = field.missing && editedValue !== undefined && editedValue.trim() !== "";

  const displayValue =
    isMissing && !isEditing
      ? null
      : field.sensitive && !revealed && !isEditing
      ? "••••••••••"
      : effectiveValue;

  const handleStartEdit = () => {
    setDraftValue(effectiveValue);
    onStartEdit();
  };

  const handleSave = () => {
    onSaveEdit(draftValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!field.multiline && e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") onCancelEdit();
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr auto",
        alignItems: isEditing || field.multiline ? "flex-start" : "center",
        gap: 8,
        padding: "5px 10px",
        borderBottom: `1px solid hsl(220, 16%, 95%)`,
        background: isEditing
          ? C.blueBg
          : hovered
          ? "hsl(220, 20%, 98%)"
          : field.sensitive
          ? "hsl(38, 92%, 99%)"
          : "transparent",
        borderRadius: 4,
        transition: "background 80ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: (isEditing || field.multiline) ? 8 : 0, flexShrink: 0 }}>
        {field.sensitive && (
          <Lock size={9} style={{ color: C.amber, marginRight: 4, verticalAlign: "middle" }} />
        )}
        {field.label}
        {wasEditedToFilled && (
          <span style={{ marginLeft: 4, color: C.green, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>edited</span>
        )}
      </div>

      {/* Value / Editor */}
      <div style={{ minWidth: 0, paddingTop: isEditing ? 4 : 0 }}>
        {isEditing ? (
          field.multiline ? (
            <textarea
              autoFocus
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              style={{
                width: "100%", fontSize: 12, padding: "6px 8px",
                border: `1.5px solid ${C.blue}`, borderRadius: 6,
                background: C.bgWhite, color: C.text,
                fontFamily: field.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                resize: "vertical", outline: "none", boxSizing: "border-box",
                lineHeight: 1.5,
              }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: "100%", height: 30, fontSize: 12, padding: "0 8px",
                border: `1.5px solid ${C.blue}`, borderRadius: 6,
                background: C.bgWhite, color: C.text,
                fontFamily: field.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                outline: "none", boxSizing: "border-box",
              }}
            />
          )
        ) : (
          <>
            {isMissing ? (
              <span style={{ fontSize: 12, color: C.amber, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={10} /> Missing
              </span>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 12,
                    color: field.sensitive && !revealed ? C.textSub : C.text,
                    fontFamily: field.mono || (field.sensitive && !revealed) ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    display: "block",
                  }}
                >
                  {displayValue}
                </span>
                {field.sensitive && (
                  <div style={{ fontSize: 10, color: C.amber, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                    <Lock size={8} /> Sensitive field. This action will be logged.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingTop: (isEditing || field.multiline) ? 6 : 0 }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              title="Save"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 5,
                border: `1px solid ${C.greenBorder}`, background: C.greenBg,
                color: C.green, cursor: "pointer",
              }}
            >
              <Check size={12} />
            </button>
            <button
              onClick={onCancelEdit}
              title="Cancel"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 5,
                border: `1px solid ${C.border}`, background: C.bgWhite,
                color: C.textMuted, cursor: "pointer",
              }}
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            {field.sensitive && !isMissing && (
              <button
                onClick={onReveal}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 6px", height: 22, borderRadius: 4,
                  border: `1px solid ${C.amberBorder}`, background: C.amberBg,
                  fontSize: 10, fontWeight: 600, color: C.amber,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                {revealed ? <EyeOff size={9} /> : <Eye size={9} />}
                {revealed ? "Hide" : "Reveal"}
              </button>
            )}
            {/* Edit button — always visible on hover */}
            {(hovered || isMissing) && (
              <button
                onClick={handleStartEdit}
                title={`Edit ${field.label}`}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: 5,
                  border: `1px solid ${hovered || isMissing ? C.border : "transparent"}`,
                  background: isMissing ? C.amberBg : hovered ? C.bgSubtle : "transparent",
                  color: isMissing ? C.amber : C.textSub,
                  cursor: "pointer",
                  transition: "all 80ms",
                }}
              >
                <Pencil size={11} />
              </button>
            )}
            {/* Copy button */}
            {!isMissing && (field.sensitive ? revealed : true) && (
              <button
                onClick={() => copyToClipboard(effectiveValue, field.label)}
                title={`Copy ${field.label}`}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: 5,
                  border: `1px solid ${hovered ? C.blueBorder : "transparent"}`,
                  background: hovered ? C.blueBg : "transparent",
                  color: hovered ? C.blue : C.textSub,
                  cursor: "pointer",
                  transition: "all 80ms",
                }}
              >
                <Copy size={11} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionAccordion({
  section,
  open,
  onToggle,
  revealedFields,
  onReveal,
  searchQuery,
  editingFieldId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  editedValues,
}: {
  section: ProfileSection;
  open: boolean;
  onToggle: () => void;
  revealedFields: Set<string>;
  onReveal: (id: string) => void;
  searchQuery: string;
  editingFieldId: string | null;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, value: string) => void;
  onCancelEdit: () => void;
  editedValues: Record<string, string>;
}) {
  const pct = sectionCompletion(section, editedValues);
  const Icon = section.Icon;

  const visibleFields = searchQuery
    ? section.fields.filter(
        (f) =>
          f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (editedValues[f.id] ?? f.value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : section.fields;

  if (searchQuery && visibleFields.length === 0) return null;

  const copySection = () => {
    const lines = section.fields
      .filter((f) => {
        const v = editedValues[f.id] !== undefined ? editedValues[f.id] : f.value;
        return v && v.trim() !== "" && (!f.sensitive || revealedFields.has(f.id));
      })
      .map((f) => `${f.label}: ${editedValues[f.id] !== undefined ? editedValues[f.id] : f.value}`)
      .join("\n");
    copyToClipboard(lines, `${section.label} section`);
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
      {/* Section header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
          background: open ? C.bgSubtle : C.bgWhite, cursor: "pointer",
          borderBottom: open ? `1px solid ${C.border}` : "none",
          userSelect: "none",
        }}
      >
        <Icon size={13} style={{ color: C.textSub, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{section.label}</span>
        <span
          style={{
            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999,
            color: completionColor(pct), background: completionBg(pct),
            border: `1px solid ${completionBorder(pct)}`,
            display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {pct === 100 ? <CheckCircle2 size={9} style={{ marginRight: 2 }} /> : null}
          {pct}%
        </span>
        
        {open
          ? <ChevronDown size={13} style={{ color: C.textSub, flexShrink: 0 }} />
          : <ChevronRight size={13} style={{ color: C.textSub, flexShrink: 0 }} />
        }
      </div>

      {/* Fields */}
      {open && (
        <div style={{ padding: "4px 0" }}>
          {visibleFields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              revealed={revealedFields.has(field.id)}
              onReveal={() => onReveal(field.id)}
              isEditing={editingFieldId === field.id}
              onStartEdit={() => onStartEdit(field.id)}
              onSaveEdit={(val) => onSaveEdit(field.id, val)}
              onCancelEdit={onCancelEdit}
              editedValue={editedValues[field.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

interface ApplicationProfileVaultProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function ApplicationProfileVault({ open, onClose, userId, userName }: ApplicationProfileVaultProps) {
  const [searchQuery, setSearchQuery]   = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["job-pref", "personal", "residential", "online", "compliance", "security", "suggestions"]));
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const profile = useMemo(() => getProfile(userId), [userId]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const revealField = (id: string) => {
    setRevealedFields((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleStartEdit = (fieldId: string) => {
    setEditingFieldId(fieldId);
  };

  const handleSaveEdit = (fieldId: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [fieldId]: value }));
    setEditingFieldId(null);
    toast.success("Field updated");
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
  };

  // Flat field lookup for quick-copy
  const fieldMap = useMemo(() => {
    const map: Record<string, ProfileField> = {};
    profile.sections.forEach((s) => s.fields.forEach((f) => { map[f.id] = f; }));
    return map;
  }, [profile]);

  const handleQuickCopy = (fieldId: string, label: string) => {
    const field = fieldMap[fieldId];
    if (!field) return;
    const effectiveValue = editedValues[fieldId] !== undefined ? editedValues[fieldId] : field.value;
    if (!effectiveValue || effectiveValue.trim() === "") {
      toast.error(`${label} is not filled in yet`);
      return;
    }
    if (field.sensitive && !revealedFields.has(fieldId)) {
      toast.error("Reveal sensitive field before copying");
      return;
    }
    copyToClipboard(effectiveValue, label);
  };

  // Dynamic missing fields accounting for edits
  const activeMissingFields = useMemo(() =>
    profile.missingFields.filter((mf) => {
      const field = Object.values(fieldMap).find((f) => f.label === mf.label);
      if (!field) return true;
      const v = editedValues[field.id];
      return v === undefined || v.trim() === "";
    }),
    [profile.missingFields, fieldMap, editedValues]
  );

  if (!open) return null;

  const avatarColor = `hsl(${(userName.charCodeAt(0) * 17) % 360}, 55%, 68%)`;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "hsla(222, 22%, 15%, 0.3)", zIndex: 300 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(720px, 54vw)",
          background: C.bgWhite,
          borderLeft: `1px solid ${C.border}`,
          zIndex: 301,
          display: "flex", flexDirection: "column",
          boxShadow: "-6px 0 32px hsla(222, 22%, 15%, 0.1)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.bgWhite }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px 10px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor, color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{userName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: completionColor(profile.completion) }}>
                  {profile.completion}% complete
                </span>
                <div style={{ width: 80, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${profile.completion}%`, height: "100%", background: completionColor(profile.completion), borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: C.textSub, whiteSpace: "nowrap" }}>
                  
                  Updated {profile.lastUpdated}
                </span>
                
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>Application Profile Vault</span>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.textSub, padding: 4, borderRadius: 5, display: "flex", alignItems: "center" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: "0 18px 10px", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 28, top: 0, bottom: 10, margin: "auto", height: 13, color: C.textSub, pointerEvents: "none", display: "flex", alignItems: "center" }} />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setOpenSections(new Set(profile.sections.map((s) => s.id)));
              }}
              placeholder="Search fields, e.g. visa, phone, LinkedIn..."
              style={{
                width: "100%", height: 34, paddingLeft: 36, paddingRight: 10,
                background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8,
                fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.text,
                outline: "none", boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 26, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textSub, padding: 2, display: "flex" }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick-copy strip */}
          <div style={{ padding: "6px 18px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 5, flexWrap: "wrap", background: C.bgSubtle }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", marginRight: 2 }}>Quick copy:</span>
            {QUICK_COPY.map((qc) => (
              <button
                key={qc.fieldId}
                onClick={() => handleQuickCopy(qc.fieldId, qc.label)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  height: 26, padding: "0 9px", borderRadius: 6,
                  border: `1px solid ${C.border}`, background: C.bgWhite,
                  fontSize: 11, fontWeight: 500, color: C.text,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  transition: "all 80ms",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blueBorder; (e.currentTarget as HTMLButtonElement).style.color = C.blue; (e.currentTarget as HTMLButtonElement).style.background = C.blueBg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.text; (e.currentTarget as HTMLButtonElement).style.background = C.bgWhite; }}
              >
                <Copy size={9} /> {qc.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button
              onClick={() => toast.success("Exporting to Excel...")}
              style={{ ...secondaryBtn, height: 28, fontSize: 11, gap: 4 }}
            >
              <FileText size={13} /> Export as Excel
            </button>
          </div>

          {/* Missing fields warning */}
          {activeMissingFields.length > 0 && !searchQuery && (
            <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "hsl(38, 92%, 25%)", marginBottom: 2 }}>
                    {activeMissingFields.length} missing field{activeMissingFields.length > 1 ? "s" : ""} may block applications
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {activeMissingFields.map((mf) => (
                      <span
                        key={mf.label}
                        style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: C.amberBorder, color: "hsl(38, 92%, 20%)", border: `1px solid ${C.amberBorder}` }}
                      >
                        {mf.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
            </div>
          )}

          {/* Edited fields notice */}
          {Object.keys(editedValues).length > 0 && !searchQuery && (
            <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Pencil size={13} style={{ color: C.blue, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.blue, flex: 1 }}>
                <strong>{Object.keys(editedValues).length}</strong> field{Object.keys(editedValues).length > 1 ? "s" : ""} edited this session
              </span>
              <button
                onClick={() => toast.success("Profile changes saved")}
                style={{ ...primaryBtn, height: 26, fontSize: 11 }}
              >
                <Check size={11} /> Save all changes
              </button>
            </div>
          )}

          {/* Accordion sections */}
          {profile.sections.map((section) => (
            <SectionAccordion
              key={section.id}
              section={section}
              open={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              revealedFields={revealedFields}
              onReveal={revealField}
              searchQuery={searchQuery}
              editingFieldId={editingFieldId}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              editedValues={editedValues}
            />
          ))}

          {searchQuery && profile.sections.every((s) =>
            s.fields.every(
              (f) =>
                !f.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !(editedValues[f.id] ?? f.value).toLowerCase().includes(searchQuery.toLowerCase())
            )
          ) && (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13 }}>
              No fields match "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Exported helper: Profile Summary Card data ───────────────────────────────

export function getProfileSummary(userId: string) {
  return profiles[userId] ?? profiles["u1"];
}
