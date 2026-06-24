import type { ReactNode, CSSProperties } from 'react';

// Shared page padding used by ported new-design pages. These pages self-pad
// (instead of relying on DashboardLayout), so they are rendered with the
// layout's `fullBleed` flag to avoid double padding.
const SHARED_STYLE: CSSProperties = {
  width: '100%',
  paddingLeft: 32,
  paddingRight: 32,
  paddingTop: 32,
  paddingBottom: 48,
  marginLeft: 0,
  marginRight: 'auto',
  boxSizing: 'border-box',
};

/** Wide — grid-heavy pages: Dashboard, Coaching, Interview Insights, Personalized Practice, Quick Mock */
export function WidePageContainer({
  children,
  bg,
  maxWidth = 1360,
}: {
  children: ReactNode;
  bg?: string;
  maxWidth?: number | 'none';
}) {
  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      <div style={{ ...SHARED_STYLE, maxWidth: maxWidth === 'none' ? undefined : maxWidth }}>
        {children}
      </div>
    </div>
  );
}

/** Medium — Settings, Billing, Profile, My Sessions, My Contributions, account pages */
export function MediumPageContainer({ children, bg }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      <div style={{ ...SHARED_STYLE, maxWidth: 1200 }}>{children}</div>
    </div>
  );
}

/** Narrow — focused flows, forms, confirmation pages, single-CTA pages */
export function NarrowPageContainer({ children, bg }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      <div style={{ ...SHARED_STYLE, maxWidth: 960 }}>{children}</div>
    </div>
  );
}
