import { useState } from "react";
import { Lock, AlertCircle, Info, AlertTriangle, Shield, CreditCard, Calendar, FileText, Search } from "lucide-react";
import { C, badge, card, TH, TD, primaryBtn } from "../ui/styles";
import { Drawer } from "../ui/Drawer";
import { DrawerField, DrawerDivider } from "../ui/DrawerField";
import { EmptyState } from "../ui/EmptyState";

type LogLevel = "Error" | "Warning" | "Info" | "Auth" | "Payment" | "Calendar" | "Application";

const LOG_LEVELS: { id: LogLevel; color: string; bg: string; border: string; icon: React.ReactNode }[] = [
  { id: "Error",       color: C.red,               bg: C.redBg,    border: C.redBorder,    icon: <AlertCircle size={11} /> },
  { id: "Warning",     color: C.amber,             bg: C.amberBg,  border: C.amberBorder,  icon: <AlertTriangle size={11} /> },
  { id: "Info",        color: C.blue,              bg: C.blueBg,   border: C.blueBorder,   icon: <Info size={11} /> },
  { id: "Auth",        color: "hsl(270 70% 40%)",  bg: "hsl(270 70% 95%)", border: "hsl(270 70% 78%)", icon: <Shield size={11} /> },
  { id: "Payment",     color: C.green,             bg: C.greenBg,  border: C.greenBorder,  icon: <CreditCard size={11} /> },
  { id: "Calendar",    color: "hsl(165 82% 30%)",  bg: "hsl(165 82% 92%)", border: "hsl(165 82% 70%)", icon: <Calendar size={11} /> },
  { id: "Application", color: C.textSub,           bg: C.bgSubtle, border: C.border,       icon: <FileText size={11} /> },
];

const allLogs = [
  { id: "log-001", time: "2026-05-19 14:32:11", level: "Error" as LogLevel,       user: "emily@example.com",  userId: "U-1001", message: "Payment intent failed: insufficient funds", detail: "stripe_error: card_declined — pi_1234567890 — user U-1001 — card ending 4242" },
  { id: "log-002", time: "2026-05-19 14:28:05", level: "Auth" as LogLevel,        user: "marcus@example.com", userId: "U-1002", message: "Login attempt — 2FA verified", detail: "ip=203.0.113.45 ua=Chrome/124 session=sess_abc123" },
  { id: "log-003", time: "2026-05-19 14:15:22", level: "Info" as LogLevel,        user: "sarah@example.com",  userId: "U-1003", message: "Job ticket T-201 submitted and marked completed", detail: "ticket_id=T-201 ops_user=alex@screna.ai action=mark_completed" },
  { id: "log-004", time: "2026-05-19 13:58:44", level: "Warning" as LogLevel,     user: "priya@example.com",  userId: "U-1005", message: "Calendar OAuth token expiring in 48h", detail: "mentor_id=M-003 provider=google token_expires=2026-05-21T13:58:44Z" },
  { id: "log-005", time: "2026-05-19 13:45:10", level: "Payment" as LogLevel,     user: "kevin@example.com",  userId: "U-1006", message: "Session payment captured — $200", detail: "session_id=S-006 stripe_pi=pi_4567890123 amount=20000 currency=usd" },
  { id: "log-006", time: "2026-05-19 13:30:00", level: "Calendar" as LogLevel,    user: "zhang@mentor.com",   userId: "M-001", message: "Google Calendar sync completed — 3 events updated", detail: "mentor_id=M-001 sync_type=incremental events_updated=3 events_added=1" },
  { id: "log-007", time: "2026-05-19 13:15:33", level: "Auth" as LogLevel,        user: "ryan@example.com",   userId: "U-1004", message: "Password reset requested", detail: "email=ryan@example.com ip=198.51.100.22 reset_token=tok_xyz_redacted" },
  { id: "log-008", time: "2026-05-19 12:55:18", level: "Error" as LogLevel,       user: "system",             userId: "SYSTEM", message: "Mentor payout batch failed — Stripe Connect error", detail: "payout_batch=batch_P041 error=account_not_enabled mentor_id=M-004 amount=95000" },
  { id: "log-009", time: "2026-05-19 12:40:00", level: "Application" as LogLevel, user: "emily@example.com",  userId: "U-1001", message: "Resume uploaded — version 3", detail: "user_id=U-1001 file=resume_v3.pdf size=245kb ops_reviewer=alex@screna.ai" },
  { id: "log-010", time: "2026-05-19 12:22:11", level: "Info" as LogLevel,        user: "system",             userId: "SYSTEM", message: "Cron: daily session reminder emails sent — 8 users", detail: "job=session_reminders sent=8 failed=0 duration=1.2s" },
  { id: "log-011", time: "2026-05-19 11:55:40", level: "Warning" as LogLevel,     user: "system",             userId: "SYSTEM", message: "High ticket queue: 34 unclaimed tickets in queue", detail: "queue_depth=34 threshold=20 alert_sent=ops-team@screna.ai" },
  { id: "log-012", time: "2026-05-19 11:30:05", level: "Auth" as LogLevel,        user: "admin@screna.ai",    userId: "ADMIN",  message: "Role change: ops_user → eng_readonly for user U-1007", detail: "changed_by=admin@screna.ai target_user=U-1007 old_role=ops new_role=eng_readonly" },
];

const userData: Record<string, { name: string; email: string; role: string; created: string; plan: string; status: string; visa: string; sessions: number; tickets: number }> = {
  "emily@example.com": { name: "Emily Zhang", email: "emily@example.com", role: "Job seeker", created: "2026-04-01", plan: "Career Co-pilot", status: "Active", visa: "H1B", sessions: 3, tickets: 38 },
  "marcus@example.com": { name: "Marcus Liu", email: "marcus@example.com", role: "Job seeker", created: "2026-04-15", plan: "Career Co-pilot", status: "Active", visa: "Citizen", sessions: 1, tickets: 12 },
  "sarah@example.com": { name: "Sarah Chen", email: "sarah@example.com", role: "Job seeker", created: "2026-03-20", plan: "Career Co-pilot", status: "Active", visa: "GC", sessions: 2, tickets: 67 },
};

function LevelBadge({ level }: { level: LogLevel }) {
  const l = LOG_LEVELS.find((x) => x.id === level)!;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 20, fontSize: 10.5, fontWeight: 600, background: l.bg, color: l.color, border: `1px solid ${l.border}`, whiteSpace: "nowrap" as const }}>
      {l.icon}{level}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  height: 32, padding: "0 10px", background: C.bgSubtle, border: `1px solid ${C.border}`,
  borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", outline: "none",
  boxSizing: "border-box", color: C.text,
};

export function SystemLogs() {
  const [emailSearch, setEmailSearch]   = useState("");
  const [idSearch, setIdSearch]         = useState("");
  const [levelFilters, setLevelFilters] = useState<LogLevel[]>([]);
  const [logSearch, setLogSearch]       = useState("");
  const [selectedLog, setSelectedLog]   = useState<typeof allLogs[0] | null>(null);
  const [lookedUpUser, setLookedUpUser] = useState<typeof userData[string] | null>(null);
  const [searched, setSearched]         = useState(false);

  const toggleLevel = (level: LogLevel) =>
    setLevelFilters((prev) => prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]);

  const filteredLogs = allLogs.filter((log) => {
    if (levelFilters.length > 0 && !levelFilters.includes(log.level)) return false;
    if (logSearch && !log.message.toLowerCase().includes(logSearch.toLowerCase()) && !log.user.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const handleUserLookup = () => {
    const key = emailSearch.toLowerCase().trim() || idSearch.trim();
    const found = userData[key] ?? null;
    setLookedUpUser(found);
    setSearched(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>

      {/* Read-only banner */}
      <div style={{ margin: "16px 20px 0", padding: "8px 14px", background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.blue }}>
        <Lock size={13} />
        <strong>Read-only access.</strong>&nbsp;Engineering view — no business operations available. Data is read-only for debugging and support purposes.
      </div>

      {/* User lookup card */}
      <div style={{ margin: "12px 20px 0", ...card, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 10 }}>User lookup — read-only</div>
        <div style={{ display: "flex", gap: 8, marginBottom: lookedUpUser ? 12 : 0 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.textSub }} />
            <input
              value={emailSearch}
              onChange={(e) => { setEmailSearch(e.target.value); setSearched(false); setLookedUpUser(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleUserLookup()}
              placeholder="Search by email..."
              style={{ ...inputStyle, width: "100%", paddingLeft: 28 }}
            />
          </div>
          <input
            value={idSearch}
            onChange={(e) => { setIdSearch(e.target.value); setSearched(false); setLookedUpUser(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleUserLookup()}
            placeholder="User ID..."
            style={{ ...inputStyle, width: 110 }}
          />
          <button onClick={handleUserLookup} style={{ ...primaryBtn, height: 32 }}>Look up</button>
        </div>

        {lookedUpUser && (
          <div style={{ background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Name",     value: lookedUpUser.name },
              { label: "Email",    value: lookedUpUser.email },
              { label: "Plan",     value: lookedUpUser.plan },
              { label: "Status",   value: lookedUpUser.status },
              { label: "Created",  value: lookedUpUser.created },
              { label: "Visa",     value: lookedUpUser.visa },
              { label: "Sessions", value: String(lookedUpUser.sessions) },
              { label: "Tickets",  value: String(lookedUpUser.tickets) },
            ].map((f) => (
              <div key={f.label}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {searched && !lookedUpUser && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
            <AlertCircle size={12} />
            No user found. Try: emily@example.com, marcus@example.com, sarah@example.com
          </div>
        )}
      </div>

      {/* Logs table card */}
      <div style={{ flex: 1, margin: "12px 20px 16px", ...card, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, background: C.bgSubtle, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.textSub }} />
            <input
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search logs..."
              style={{ ...inputStyle, width: 220, paddingLeft: 28 }}
            />
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {LOG_LEVELS.map((lvl) => {
              const active = levelFilters.includes(lvl.id);
              return (
                <button
                  key={lvl.id}
                  onClick={() => toggleLevel(lvl.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px",
                    borderRadius: 20, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    fontSize: 11, fontWeight: active ? 600 : 400,
                    border: `1px solid ${active ? lvl.border : C.border}`,
                    background: active ? lvl.bg : "transparent",
                    color: active ? lvl.color : C.textSub,
                    transition: "all 100ms ease",
                  }}
                >
                  {lvl.icon}{lvl.id}
                </button>
              );
            })}
          </div>
          {levelFilters.length > 0 && (
            <button
              onClick={() => setLevelFilters([])}
              style={{ fontSize: 11, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredLogs.length === 0 ? (
            <EmptyState icon={<FileText size={20} />} message="No logs match the current filters." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  {["Time", "Level", "User", "Message"].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    style={{
                      background: selectedLog?.id === log.id ? C.blueBg : idx % 2 === 0 ? "white" : "hsl(220 20% 99%)",
                      borderBottom: `1px solid hsl(220 16% 94%)`,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { if (selectedLog?.id !== log.id) (e.currentTarget as HTMLTableRowElement).style.background = "hsl(220 20% 97%)"; }}
                    onMouseLeave={(e) => { if (selectedLog?.id !== log.id) (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "white" : "hsl(220 20% 99%)"; }}
                  >
                    <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>{log.time}</td>
                    <td style={TD}><LevelBadge level={log.level} /></td>
                    <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{log.user}</td>
                    <td style={{ ...TD, fontSize: 12 }}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log detail drawer */}
      <Drawer
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log detail"
        width={340}
      >
        {selectedLog && (
          <>
            <div style={{ marginBottom: 14 }}>
              <LevelBadge level={selectedLog.level} />
            </div>
            <DrawerField label="Log ID"    value={selectedLog.id}    mono />
            <DrawerField label="Timestamp" value={selectedLog.time}   mono />
            <DrawerField label="User"      value={`${selectedLog.user} (${selectedLog.userId})`} mono />
            <DrawerField label="Message"   value={selectedLog.message} />
            <DrawerDivider />
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Raw detail</div>
            <div style={{ background: "hsl(222 22% 12%)", border: "1px solid hsl(222 22% 20%)", borderRadius: 7, padding: 10 }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "hsl(165 82% 72%)", lineHeight: 1.6, wordBreak: "break-all" }}>
                {selectedLog.detail}
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "7px 10px", background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, fontSize: 11, color: C.blue, display: "flex", alignItems: "center", gap: 5 }}>
              <Lock size={11} />
              Read-only — no actions available in Eng view
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
