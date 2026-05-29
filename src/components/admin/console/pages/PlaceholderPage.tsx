import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        fontFamily: "'Inter', sans-serif",
        background: "hsl(220 20% 98%)",
        color: "hsl(222 22% 15%)",
      }}
    >
      <Construction size={32} style={{ color: "hsl(222 12% 65%)", marginBottom: 14 }} />
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "hsl(222 12% 40%)" }}>
        {description ?? "This section is under construction."}
      </div>
    </div>
  );
}
