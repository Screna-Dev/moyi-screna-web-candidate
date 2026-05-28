import { useState } from "react";
import { toast } from "sonner";
import { Shield, AlertTriangle, Info, Check, X } from "lucide-react";
import { C, badge, card, TH, TD, primaryBtn, secondaryBtn } from "../ui/styles";

type RoleId = "ops" | "ceo" | "eng" | "finance";
type PermCol = "View" | "Create" | "Edit" | "Delete" | "Export" | "Read-only";

const ROLES: { id: RoleId; label: string; color: string; bg: string; border: string; desc: string; users: number }[] = [
  { id: "ops",     label: "Ops",             color: C.blue,   bg: C.blueBg,   border: C.blueBorder,  desc: "Resume applications and mentorship operations", users: 3 },
  { id: "ceo",     label: "CEO / Management",color: C.purple, bg: C.purpleBg, border: C.purpleBorder,desc: "Full read access across all modules and dashboard", users: 2 },
  { id: "eng",     label: "Engineering",     color: C.green,  bg: C.greenBg,  border: C.greenBorder, desc: "System logs and user data — read-only for debugging", users: 4 },
  { id: "finance", label: "Finance",         color: C.green,  bg: C.greenBg,  border: C.greenBorder, desc: "Mentor ledger, Stripe records, settlement, export", users: 1 },
];

const MODULES = [
  "Resume Applications",
  "Mentorship",
  "Sessions",
  "Finance Ledger",
  "User Data",
  "System Logs",
  "Dashboard",
  "Exports",
];

const COLS: PermCol[] = ["View", "Create", "Edit", "Delete", "Export", "Read-only"];

type PermMatrix = Record<RoleId, Record<string, Record<PermCol, boolean>>>;

const DEFAULT: PermMatrix = {
  ops: {
    "Resume Applications": { View: true,  Create: true,  Edit: true,  Delete: false, Export: false, "Read-only": false },
    "Mentorship":          { View: true,  Create: true,  Edit: true,  Delete: false, Export: false, "Read-only": false },
    "Sessions":            { View: true,  Create: false, Edit: true,  Delete: false, Export: false, "Read-only": false },
    "Finance Ledger":      { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "User Data":           { View: true,  Create: false, Edit: true,  Delete: false, Export: false, "Read-only": false },
    "System Logs":         { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Dashboard":           { View: true,  Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Exports":             { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
  },
  ceo: {
    "Resume Applications": { View: true, Create: false, Edit: false, Delete: false, Export: true,  "Read-only": true },
    "Mentorship":          { View: true, Create: false, Edit: false, Delete: false, Export: true,  "Read-only": true },
    "Sessions":            { View: true, Create: false, Edit: false, Delete: false, Export: false, "Read-only": true },
    "Finance Ledger":      { View: true, Create: false, Edit: false, Delete: false, Export: true,  "Read-only": true },
    "User Data":           { View: true, Create: false, Edit: false, Delete: false, Export: false, "Read-only": true },
    "System Logs":         { View: true, Create: false, Edit: false, Delete: false, Export: false, "Read-only": true },
    "Dashboard":           { View: true, Create: false, Edit: false, Delete: false, Export: true,  "Read-only": false },
    "Exports":             { View: true, Create: false, Edit: false, Delete: false, Export: true,  "Read-only": false },
  },
  eng: {
    "Resume Applications": { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Mentorship":          { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Sessions":            { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Finance Ledger":      { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "User Data":           { View: true,  Create: false, Edit: false, Delete: false, Export: false, "Read-only": true },
    "System Logs":         { View: true,  Create: false, Edit: false, Delete: false, Export: false, "Read-only": true },
    "Dashboard":           { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Exports":             { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
  },
  finance: {
    "Resume Applications": { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Mentorship":          { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Sessions":            { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Finance Ledger":      { View: true,  Create: false, Edit: true,  Delete: false, Export: true,  "Read-only": false },
    "User Data":           { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "System Logs":         { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Dashboard":           { View: false, Create: false, Edit: false, Delete: false, Export: false, "Read-only": false },
    "Exports":             { View: false, Create: false, Edit: false, Delete: false, Export: true,  "Read-only": false },
  },
};

export function RolesPermissions() {
  const [role, setRole]     = useState<RoleId>("ops");
  const [perms, setPerms]   = useState<PermMatrix>(DEFAULT);
  const [dirty, setDirty]   = useState(false);

  const current = ROLES.find((r) => r.id === role)!;
  const matrix  = perms[role];

  const toggle = (mod: string, col: PermCol) => {
    setPerms((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [mod]: { ...prev[role][mod], [col]: !prev[role][mod][col] },
      },
    }));
    setDirty(true);
  };

  const save = () => { setDirty(false); toast.success("Permissions saved"); };

  const isDisabled = (col: PermCol) =>
    (role === "eng" || role === "ceo") && (col === "Create" || col === "Edit" || col === "Delete");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Inter', sans-serif", background: C.bgPage, overflow: "hidden" }}>

      {/* Role cards */}
      <div style={{ padding: "16px 20px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {ROLES.map((r) => (
            <div
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                ...card,
                padding: "12px 14px",
                cursor: "pointer",
                border: `1px solid ${role === r.id ? r.border : C.border}`,
                background: role === r.id ? r.bg : C.bgWhite,
                transition: "all 120ms ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <Shield size={14} style={{ color: role === r.id ? r.color : C.textMuted }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: role === r.id ? r.color : C.text }}>{r.label}</span>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4, marginBottom: 8 }}>{r.desc}</div>
              <span style={badge(role === r.id ? (r.id === "ops" ? "blue" : r.id === "eng" ? "green" : r.id === "ceo" ? "purple" : "green") : "gray")}>
                {r.users} user{r.users > 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ops decision callout */}
      {role === "ops" && (
        <div style={{ margin: "0 20px 10px", padding: "9px 14px", background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderRadius: 8, display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(38 92% 25%)" }}>Ops role split is pending CEO decision. </span>
            <span style={{ fontSize: 12, color: "hsl(38 92% 30%)" }}>
              Currently unified — one team handles both resume applications and mentorship. If split, separate roles will be created.
            </span>
          </div>
        </div>
      )}

      {/* Matrix */}
      <div style={{ flex: 1, margin: "0 20px 16px", display: "flex", flexDirection: "column", ...card, overflow: "hidden" }}>
        {/* Table toolbar */}
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bgSubtle }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Permissions matrix —</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: current.color }}>{current.label}</span>
          </div>
          <button
            onClick={save}
            disabled={!dirty}
            style={{ ...primaryBtn, opacity: dirty ? 1 : 0.5 }}
          >
            {dirty ? "Save changes" : <><Check size={12} /> Saved</>}
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                <th style={{ ...TH, width: 200 }}>Module</th>
                {COLS.map((c) => (
                  <th key={c} style={{ ...TH, textAlign: "center" as const, width: 80 }}>
                    {c}
                    {isDisabled(c) && (
                      <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.6 }}>🔒</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, idx) => (
                <tr
                  key={mod}
                  style={{ background: idx % 2 === 0 ? C.bgWhite : "hsl(220 20% 99%)", borderBottom: `1px solid hsl(220 16% 94%)` }}
                >
                  <td style={{ ...TD, fontWeight: 500 }}>{mod}</td>
                  {COLS.map((col) => {
                    const enabled = matrix[mod][col];
                    const disabled = isDisabled(col);
                    return (
                      <td key={col} style={{ ...TD, textAlign: "center" as const }}>
                        <button
                          onClick={() => !disabled && toggle(mod, col)}
                          title={disabled ? "Not available for this role" : undefined}
                          style={{
                            width: 26,
                            height: 26,
                            margin: "0 auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 7,
                            border: `1px solid ${enabled ? C.greenBorder : C.border}`,
                            background: enabled ? C.greenBg : C.bgSubtle,
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.35 : 1,
                            transition: "all 120ms ease",
                          }}
                        >
                          {enabled
                            ? <Check size={11} style={{ color: C.green }} />
                            : <X size={11} style={{ color: C.textSub }} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "0 20px 14px", display: "flex", alignItems: "center", gap: 16 }}>
        {[
          { icon: <Check size={9} style={{ color: C.green }} />, bg: C.greenBg, border: C.greenBorder, label: "Allowed" },
          { icon: <X size={9} style={{ color: C.textSub }} />,   bg: C.bgSubtle, border: C.border,       label: "Not allowed" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${item.border}`, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.icon}
            </div>
            {item.label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${C.border}`, background: C.bgSubtle, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.35 }}>
            <X size={9} style={{ color: C.textSub }} />
          </div>
          Locked (role restriction)
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted }}>
          <Info size={11} />
          Click toggles to update permissions for the selected role
        </div>
      </div>
    </div>
  );
}
