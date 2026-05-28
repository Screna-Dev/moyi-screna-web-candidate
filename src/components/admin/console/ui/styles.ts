// Screna Admin — shared style tokens matching Snowflake-style enterprise patterns

export const C = {
  blue:    "#2B7AEF",
  blueHover: "hsl(221, 82%, 52%)",
  blueBg:  "hsla(221, 91%, 60%, 0.08)",
  blueBorder: "hsla(221, 91%, 60%, 0.25)",

  green:   "hsl(152, 62%, 35%)",
  greenBg: "hsl(152, 62%, 95%)",
  greenBorder: "hsl(152, 62%, 78%)",

  amber:   "hsl(38, 92%, 38%)",
  amberBg: "hsl(38, 92%, 95%)",
  amberBorder: "hsl(38, 92%, 76%)",

  red:     "hsl(0, 72%, 48%)",
  redBg:   "hsl(0, 72%, 96%)",
  redBorder: "hsl(0, 72%, 84%)",

  gray:    "hsl(222, 12%, 42%)",
  grayBg:  "hsl(220, 18%, 96%)",
  grayBorder: "hsl(220, 16%, 88%)",

  purple:  "hsl(265, 70%, 45%)",
  purpleBg: "hsl(265, 70%, 96%)",
  purpleBorder: "hsl(265, 70%, 80%)",

  border:  "hsl(220, 16%, 91%)",
  bgPage:  "hsl(220, 20%, 97%)",
  bgWhite: "#ffffff",
  bgSubtle:"hsl(220, 20%, 98%)",

  text:    "hsl(222, 22%, 15%)",
  textMid: "hsl(222, 18%, 28%)",
  textMuted:"hsl(222, 12%, 44%)",
  textSub: "hsl(222, 12%, 58%)",
} as const;

export type BadgeVariant = "blue" | "green" | "amber" | "red" | "gray" | "purple";

export function badge(variant: BadgeVariant): React.CSSProperties {
  const map: Record<BadgeVariant, [string, string, string]> = {
    blue:   [C.blueBg,   C.blue,   C.blueBorder],
    green:  [C.greenBg,  C.green,  C.greenBorder],
    amber:  [C.amberBg,  C.amber,  C.amberBorder],
    red:    [C.redBg,    C.red,    C.redBorder],
    gray:   [C.grayBg,   C.gray,   C.grayBorder],
    purple: [C.purpleBg, C.purple, C.purpleBorder],
  };
  const [bg, color, border] = map[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 7px",
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    color,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: border,
    whiteSpace: "nowrap",
    lineHeight: 1.5,
    fontFamily: "'Inter', sans-serif",
  };
}

export const card: React.CSSProperties = {
  background: C.bgWhite,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 2px hsla(222, 22%, 15%, 0.04), 0 1px 4px hsla(222, 22%, 15%, 0.02)",
};

export const TH: React.CSSProperties = {
  padding: "0 14px",
  height: 36,
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: C.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: C.bgSubtle,
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
  userSelect: "none",
};

export const TD: React.CSSProperties = {
  padding: "0 14px",
  height: 40,
  fontSize: 13,
  color: C.text,
  borderBottom: `1px solid hsl(220, 16%, 94%)`,
  verticalAlign: "middle",
};

export function filterChip(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 28,
    padding: "0 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    fontFamily: "'Inter', sans-serif",
    background: active ? C.blueBg : C.bgWhite,
    color: active ? C.blue : C.textMuted,
    border: `1px solid ${active ? C.blueBorder : C.border}`,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 120ms ease",
  };
}

export const searchInput: React.CSSProperties = {
  height: 28,
  padding: "0 10px 0 30px",
  background: C.bgSubtle,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  fontSize: 12,
  fontFamily: "'Inter', sans-serif",
  color: C.text,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 30,
  padding: "0 12px",
  background: C.blue,
  color: "#fff",
  border: "none",
  borderRadius: 7,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  whiteSpace: "nowrap",
};

export const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 30,
  padding: "0 12px",
  background: C.bgWhite,
  color: C.textMid,
  border: `1px solid ${C.border}`,
  borderRadius: 7,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  whiteSpace: "nowrap",
};

export const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  height: 26,
  padding: "0 8px",
  background: "transparent",
  color: C.textMuted,
  border: "none",
  borderRadius: 5,
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};
