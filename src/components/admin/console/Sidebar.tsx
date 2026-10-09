import {
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  DollarSign,
  UserCog,
  Shield,
  Terminal,
  Settings,
  Star,
  Megaphone,
  Gift,
  Clock,
} from "lucide-react";
import { C } from "./ui/styles";
import { useAuth } from "@/contexts/AuthContext";

export type Page =
  | "command-center"
  | "resume-applications"
  | "mentorship"
  | "finance"
  | "users"
  | "ops-manager"
  | "roles-permissions"
  | "system-logs"
  | "settings"
  | "redeem-codes"
  | "audit-logs"
  | "pgs";

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  userRole?: string;
  jobApplicationsBadge?: string;
}

type SidebarSection = {
  label?: string;
  items: { id: Page; label: string; icon: React.ElementType; badge?: string }[];
};

const buildSections = (jobApplicationsBadge?: string): SidebarSection[] => [
  {
    items: [
      { id: "command-center",      label: "Command Center",      icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "resume-applications", label: "Job Applications", icon: FileText, badge: jobApplicationsBadge },
      { id: "mentorship",          label: "Mentorship",       icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "pgs", label: "PGS", icon: Star },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "finance",             label: "Finance",             icon: DollarSign },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "users",               label: "Users",               icon: UserCog },
      { id: "redeem-codes",        label: "Redeem Codes",        icon: Gift },
      { id: "audit-logs",          label: "Audit Log",           icon: Clock },
      { id: "ops-manager",         label: "Ops Console",         icon: Users },
      { id: "roles-permissions",   label: "Roles & Permissions", icon: Shield },
      { id: "system-logs",         label: "System Logs",         icon: Terminal },
      { id: "settings",            label: "Settings",            icon: Settings },
    ],
  },
];

export function Sidebar({ currentPage, onPageChange, userRole, jobApplicationsBadge }: SidebarProps) {
  const { user } = useAuth();
  const role = (userRole || "").toUpperCase();
  const sections = buildSections(jobApplicationsBadge);
  const visibleSections: SidebarSection[] = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (role === "OPS") return item.id === "resume-applications";
        // Non-OPS (ADMIN, etc.): hide the OPS-only Job Applications tab
        return item.id !== "resume-applications";
      }),
    }))
    .filter((section) => section.items.length > 0);

  const footerName = user?.name?.trim() || user?.email || "Account";
  const footerEmail = user?.email || "";
  const footerInitials = user?.name?.trim()
    ? user.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "A");

  return (
    <aside
      style={{
        width: 224,
        minWidth: 224,
        background: C.bgWhite,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: `1px solid ${C.border}`,
          gap: 9,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            background: C.blue,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 3.5h9M2.5 7h6.5M2.5 10.5h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>Screna</div>
          <div style={{ fontSize: 10, color: C.textSub, letterSpacing: "0.03em" }}>Admin Console</div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            padding: "2px 6px",
            background: "hsl(38, 92%, 95%)",
            border: "1px solid hsl(38, 92%, 76%)",
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 700,
            color: "hsl(38 92% 35%)",
            letterSpacing: "0.05em",
          }}
        >
          INT
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }}>
        {visibleSections.map((section, si) => (
          <div key={si} style={{ marginBottom: 4 }}>
            {section.label && (
              <div
                style={{
                  padding: "6px 9px 3px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.textSub,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    height: 32,
                    padding: "0 9px",
                    borderRadius: 7,
                    border: "none",
                    cursor: "pointer",
                    marginBottom: 1,
                    background: active ? C.blueBg : "transparent",
                    color: active ? C.blue : C.textMid,
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    fontFamily: "'Inter', sans-serif",
                    textAlign: "left",
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <Icon
                    size={15}
                    style={{
                      color: active ? C.blue : C.textMuted,
                      flexShrink: 0,
                      strokeWidth: active ? 2.2 : 1.8,
                    }}
                  />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        background: active ? C.blue : "hsl(220 16% 88%)",
                        color: active ? "white" : C.textMuted,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "0 5px",
                        borderRadius: 9999,
                        lineHeight: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2B7AEF, hsl(221 76% 44%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
          }}
        >
          {footerInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{footerName}</div>
          <div style={{ fontSize: 10, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{footerEmail}</div>
        </div>
      </div>
    </aside>
  );
}
