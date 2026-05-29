import { C, primaryBtn } from "./styles";

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, message, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 12,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ color: C.border, opacity: 0.8 }}>{icon}</div>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, textAlign: "center" }}>{message}</p>
      {ctaLabel && onCta && (
        <button onClick={onCta} style={{ ...primaryBtn, marginTop: 4 }}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
