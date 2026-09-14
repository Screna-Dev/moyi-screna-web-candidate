import type { ReactNode } from 'react';
import { Navbar } from './home/navbar';
import { Footer } from './home/footer';

/**
 * Public SEO shell for the "Interview Questions" surface — /interview-questions,
 * /interview-questions/:companyId, and the single-note pages.
 *
 * Unlike DashboardLayout, this shell has NO personal-center sidebar and NO auth
 * wall — DashboardLayout redirects to /auth when no token is in storage, which
 * is exactly what made these pages unreachable logged out. The tab is a
 * standalone, indexable page reachable straight from the home nav. Guests browse
 * the free-tier preview (the 2 newest posts per company); signed-in users get
 * the same content, just without the sidebar. The marketing Navbar already
 * adapts to auth state (avatar + Personal Center when signed in, Log in / Sign
 * up when not), so it doubles as the top nav here.
 *
 * Content offset and the #F9FAFB canvas mirror DashboardLayout's main area so
 * ported pages keep their existing spacing.
 *
 * The offset is the 72px navbar PLUS --topbar-h, because Navbar is
 * `position: fixed` at `top: var(--topbar-h)` — it sits below the promo bar
 * rather than at the top of the viewport. App.tsx keeps that variable in sync
 * with the bar's measured height and zeroes it for signed-in users (no bar).
 * A flat 72px here is only correct for the signed-in case, and slid the page
 * heading under the navbar for exactly the audience this shell exists for.
 * Same expression as the home page (home.tsx).
 */
export function InsightsLayout({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      {/* minHeight subtracts what the padding already offsets — a flat 100vh
          here pushes the footer a full screen below short pages. */}
      <main
        className="bg-[#F9FAFB]"
        style={{
          paddingTop: 'calc(72px + var(--topbar-h, 0px))',
          minHeight: 'calc(100vh - 72px - var(--topbar-h, 0px))',
        }}
      >
        {fullBleed ? (
          children
        ) : (
          <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
            {children}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
