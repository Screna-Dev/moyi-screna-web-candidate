import type { ReactNode } from 'react';
import {
  playfairTitleStyle,
  pageSubtitleStyle,
  pageHeadStyle,
  pageActionsStyle,
} from '@/lib/design-tokens';

interface PageHeadProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Shared page header — Playfair Display title, secondary subtitle, optional
 * right-aligned actions. Used across all dashboard pages so the typography
 * stays consistent with the Training History / Dashboard design.
 */
export function PageHead({ title, subtitle, actions }: PageHeadProps) {
  return (
    <div style={pageHeadStyle}>
      <div>
        <h1 style={playfairTitleStyle}>{title}</h1>
        {subtitle && <p style={pageSubtitleStyle}>{subtitle}</p>}
      </div>
      {actions && <div style={pageActionsStyle}>{actions}</div>}
    </div>
  );
}
