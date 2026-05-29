import { C } from "./styles";

interface DrawerFieldProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export function DrawerField({ label, value, mono }: DrawerFieldProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.textSub,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 3,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: C.text,
          fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function DrawerDivider() {
  return (
    <div
      style={{
        height: 1,
        background: "hsl(220 16% 93%)",
        marginBottom: 14,
        marginTop: 2,
      }}
    />
  );
}
