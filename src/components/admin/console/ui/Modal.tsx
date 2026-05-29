import { X } from "lucide-react";
import { C } from "./styles";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, width = 460, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "hsla(222, 22%, 15%, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bgWhite,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          width,
          maxWidth: "100%",
          boxShadow: "0 8px 40px hsla(222, 22%, 15%, 0.16)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 52,
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
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
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexShrink: 0,
              background: C.bgSubtle,
              borderRadius: "0 0 14px 14px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
