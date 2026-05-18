/**
 * Shared design tokens — mirrors the Training History / Dashboard design.
 * Use these everywhere instead of hard-coding hex values. Keep in sync with
 * .design-ref/dashboard/project/colors_and_type.css if/when the design ships
 * token updates.
 */
import type { CSSProperties } from 'react';

export const T = {
  // Brand blue scale
  blue50:  '#EFF4FF',
  blue100: '#DBE5FE',
  blue500: '#2563EB',
  blue600: '#1D4ED8',
  blue700: '#1E40AF',
  // Role/community accent (light blue tint)
  roleBg:  '#EFF6FF',
  // Greens / warnings / status
  green500:   '#10B981',
  warning:    '#F59E0B',
  warningBg:  '#FFFBEB',
  warningText:'#92400E',
  successBg:  '#ECFDF5',
  successText:'#065F46',
  // Neutrals / surfaces
  bg:           '#FFFFFF',
  bgSecondary:  '#F8FAFC',
  border:       'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.12)',
  // Text scale
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  // Shadow
  shadowCard:    '0 1px 3px rgba(0,0,0,0.06)',
  shadowHover:   '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,23,42,0.06)',
} as const;

export const playfairTitleStyle: CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontWeight: 700,
  fontSize: 28,
  lineHeight: 1.2,
  color: T.textPrimary,
  margin: '0 0 4px',
};

export const pageSubtitleStyle: CSSProperties = {
  color: T.textSecondary,
  fontSize: 13,
  margin: 0,
  maxWidth: 520,
};

export const pageHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 24,
  marginBottom: 20,
};

export const pageActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flex: 'none',
};

export const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  background: T.blue500,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 160ms',
};

export const ghostButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 36,
  padding: '0 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  background: '#fff',
  color: T.textPrimary,
  border: `1px solid ${T.border}`,
  cursor: 'pointer',
  transition: 'background 160ms, border-color 160ms',
};

export const cardStyle: CSSProperties = {
  background: '#fff',
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  padding: 16,
};

export const panelTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: T.textPrimary,
};
