import type { ReactNode, CSSProperties } from 'react';

// Shared page padding used by ported new-design pages. These pages self-pad
// (instead of relying on DashboardLayout), so they are rendered with the
// layout's `fullBleed` flag to avoid double padding.
// Horizontal padding is applied via `SHARED_CLASS` (responsive: 16px on phones,
// 24px on tablets, 32px on desktop) rather than inline, so pages don't feel
// cramped on small screens.
const SHARED_STYLE: CSSProperties = {
  width: '100%',
  paddingTop: 32,
  paddingBottom: 48,
  marginLeft: 0,
  marginRight: 'auto',
  boxSizing: 'border-box',
};

const SHARED_CLASS = 'px-4 sm:px-6 lg:px-8';

/** Wide — grid-heavy pages: Dashboard, Coaching, Interview Insights, Personalized Practice, Quick Mock */
export function WidePageContainer({
  children,
  bg,
  maxWidth = 1360,
  paddingTop = 0,
}: {
  children: ReactNode;
  bg?: string;
  maxWidth?: number | 'none';
  // Pages that lead with a full-bleed hero banner keep paddingTop at 0 so the
  // banner sits flush under the top header; content-only pages pass 32.
  paddingTop?: number;
}) {
  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      <div className={SHARED_CLASS} style={{ ...SHARED_STYLE, maxWidth: maxWidth === 'none' ? undefined : maxWidth, paddingTop }}>
        {children}
      </div>
    </div>
  );
}

/** Medium — Settings, Billing, Profile, My Sessions, My Contributions, account pages */
export function MediumPageContainer({ children, bg }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      <div className={SHARED_CLASS} style={{ ...SHARED_STYLE, maxWidth: 1200 }}>{children}</div>
    </div>
  );
}

/** Narrow — focused flows, forms, confirmation pages, single-CTA pages */
export function NarrowPageContainer({ children, bg }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      <div className={SHARED_CLASS} style={{ ...SHARED_STYLE, maxWidth: 960 }}>{children}</div>
    </div>
  );
}
