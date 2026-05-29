import { X } from "lucide-react";
import { C } from "./styles";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({ open, onClose, title, width = 360, children, footer }: DrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "hsla(222, 22%, 15%, 0.25)",
          zIndex: 200,
        }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: C.bgWhite,
          borderLeft: `1px solid ${C.border}`,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 24px hsla(222, 22%, 15%, 0.08)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            height: 52,
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.textSub,
              padding: 4,
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 18px" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "12px 18px",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: 8,
              flexShrink: 0,
              background: C.bgSubtle,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
