import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, Check } from "lucide-react";
import { C } from "./ui/styles";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_TITLES: Record<string, string> = {
  "command-center":      "Command Center",
  "resume-applications": "Resume Applications",
  "mentorship":          "Mentorship",
  "sessions":            "Sessions",
  "finance":             "Finance",
  "users":               "Users",
  "roles-permissions":   "Roles & Permissions",
  "system-logs":         "System Logs",
  "settings":            "Settings",
};

const ROLES = [
  { id: "ops",     label: "Ops",     dot: C.blue },
  { id: "ceo",     label: "CEO",     dot: "hsl(265, 70%, 50%)" },
  { id: "eng",     label: "Eng",     dot: "hsl(165, 82%, 38%)" },
  { id: "finance", label: "Finance", dot: "hsl(152, 62%, 38%)" },
];

interface HeaderProps {
  currentPage: string;
}

export function Header({ currentPage }: HeaderProps) {
  const [roleId, setRoleId] = useState("ops");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggedIn] = useState(true);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.name?.trim() || user?.email || "Admin";
  const initials = user?.name?.trim()
    ? user.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "A");

  const handleSignOut = async () => {
    setShowUserMenu(false);
    localStorage.removeItem("screnaIsLoggedIn");
    window.dispatchEvent(new Event("screna-auth-change"));
    await logout();
    navigate("/");
  };

  const role = ROLES.find((r) => r.id === roleId)!;

  return (
    <header
      style={{
        height: 52,
        background: C.bgWhite,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        fontFamily: "'Inter', sans-serif",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Page title */}
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.text,
          letterSpacing: "-0.01em",
          flexShrink: 0,
        }}
      >
        {PAGE_TITLES[currentPage] ?? "Admin Console"}
      </span>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: C.border }} />

      {/* Search */}
      <div style={{ position: "relative", width: 260 }}>
        <Search
          size={12}
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.textSub,
            pointerEvents: "none",
          }}
        />
        <input
          placeholder="Search users, tickets, sessions..."
          style={{
            width: "100%",
            height: 30,
            paddingLeft: 28,
            paddingRight: 10,
            background: C.bgSubtle,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            fontSize: 12,
            color: C.text,
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Role switcher */}
      <div style={{ position: "relative" }}>
        
        {showRoleMenu && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onClick={() => setShowRoleMenu(false)}
            />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: C.bgWhite,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                boxShadow: "0 4px 16px hsla(222, 22%, 15%, 0.1)",
                minWidth: 140,
                zIndex: 100,
                padding: 4,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <div
                style={{
                  padding: "4px 10px 6px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.textSub,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Switch role view
              </div>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRoleId(r.id); setShowRoleMenu(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 10px",
                    border: "none",
                    background: r.id === roleId ? C.blueBg : "transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: r.id === roleId ? 600 : 400,
                    color: r.id === roleId ? C.blue : C.text,
                    fontFamily: "'Inter', sans-serif",
                    borderRadius: 6,
                    textAlign: "left",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.dot, display: "inline-block", flexShrink: 0 }} />
                  {r.label}
                  {r.id === roleId && <Check size={11} style={{ marginLeft: "auto" }} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bell */}
      <button
        onClick={() => setNotifications(0)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 5,
          borderRadius: 7,
          color: C.textMuted,
          display: "flex",
          alignItems: "center",
        }}
      >
        
        {notifications > 0 && (
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 7,
              height: 7,
              background: C.red,
              borderRadius: "50%",
              border: "1.5px solid white",
            }}
          />
        )}
      </button>

      {/* Avatar */}
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setShowUserMenu(!showUserMenu)}
          title={isLoggedIn ? "Account options" : "Sign In"}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: isLoggedIn ? `linear-gradient(135deg, #2B7AEF, hsl(221, 76%, 44%))` : "hsl(220, 18%, 96%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isLoggedIn ? "white" : "hsl(220 22% 50%)",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            border: isLoggedIn ? "1.5px solid hsl(221 91% 60% / 0.3)" : "1.5px solid hsl(220 16% 88%)",
            transition: "all 0.2s ease-in-out",
            userSelect: "none"
          }}
        >
          {initials}
        </div>
        
        {showUserMenu && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onClick={() => setShowUserMenu(false)}
            />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: C.bgWhite,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                boxShadow: "0 4px 16px hsla(222, 22%, 15%, 0.1)",
                minWidth: 160,
                zIndex: 100,
                padding: 4,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{displayName}</div>
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{user?.email || ""}</div>
              </div>
              
              <button
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: C.red,
                  fontFamily: "'Inter', sans-serif",
                  borderRadius: 4,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.bgSubtle)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
