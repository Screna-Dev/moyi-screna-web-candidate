import type { ReactNode } from 'react';
import { Navbar } from './home/navbar';
import { Footer } from './home/footer';

/**
 * Public SEO shell for the "Interview Questions" surface — /interview-insights
 * and its detail pages (/interview-insights/:companyId, /experience/:id).
 *
 * Unlike DashboardLayout, this shell has NO personal-center sidebar and NO auth
 * wall: the tab is a standalone, indexable page reachable straight from the home
 * nav. Guests may browse and see the free-tier preview (the 2 newest posts per
 * company); signed-in users get the same content — just without the sidebar. The
 * marketing Navbar already adapts to auth state (avatar + Personal Center when
 * signed in, Log in / Sign up when not), so it doubles as the top nav here.
 *
 * Content offset (72px fixed navbar) and the #F9FAFB canvas mirror
 * DashboardLayout's main area so ported pages keep their existing spacing.
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
      <main className="bg-[#F9FAFB]" style={{ paddingTop: 72, minHeight: '100vh' }}>
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
