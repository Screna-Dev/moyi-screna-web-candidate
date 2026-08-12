import { lazy, useEffect, useLayoutEffect } from 'react';
import { createBrowserRouter, Outlet, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserPlanProvider } from './hooks/useUserPlan';
import { RecommendedJobsProvider } from './hooks/useRecommendedJobs';

// ─── Eager imports ──────────────────────────────────────────────────────────
// The public, prerendered pages (and the chrome they share) must render
// synchronously from the first chunk: a Suspense fallback here would mean the
// build-time snapshot captures a spinner instead of the page. Everything else
// is code-split below.
import { HomePage } from './pages/newDesign/home/home';
import FaqPage from './pages/newDesign/home/faq-page';
import { BlogListPage } from './pages/newDesign/blog/blog-list';
import { BlogPostPage } from './pages/newDesign/blog/blog-post';
import { ContactPage } from './pages/newDesign/contact';
import { HelpCenterPage } from './pages/newDesign/help-center';
import { PrivacyPolicy } from './pages/newDesign/privacy-policy';
import { CookiePolicy } from './pages/newDesign/cookie-policy';
import { Terms } from './pages/newDesign/terms';
import { DataProtectionPolicy } from './pages/newDesign/data-protection-policy';
import { Navbar } from './components/newDesign/home/navbar';
import { Footer } from './components/newDesign/home/footer';
import { CookieBanner } from './components/newDesign/cookie-banner';
import { ResumePromptModal } from './components/newDesign/resume-prompt-modal';
import { useSessionTracking } from './hooks/useSessionTracking';

// ─── Lazy routes ────────────────────────────────────────────────────────────
// Everything behind the login wall, plus auth/onboarding. App.tsx already
// wraps <RouterProvider> in a <Suspense> with a full-page fallback, so no
// extra boundary is needed here.
//
// Named exports need the `.then(m => ({ default: m.X }))` unwrap; default
// exports do not.

// Auth / onboarding
const AuthPage = lazy(() => import('./pages/newDesign/auth').then((m) => ({ default: m.AuthPage })));
const ForgotPassword = lazy(() => import('./pages/ForgetPassword'));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'));
const RefRedirect = lazy(() => import('./pages/ref-redirect').then((m) => ({ default: m.RefRedirect })));
const SignupFlowPage = lazy(() => import('./pages/newDesign/signup-flow').then((m) => ({ default: m.SignupFlowPage })));
const GoalPage = lazy(() => import('./pages/newDesign/goal-page').then((m) => ({ default: m.GoalPage })));
const GoalUploadPage = lazy(() => import('./pages/newDesign/goal-upload-page').then((m) => ({ default: m.GoalUploadPage })));
const OnboardingProcessPage = lazy(() => import('./pages/newDesign/onboarding-process').then((m) => ({ default: m.OnboardingProcessPage })));
const OnboardingFlowOverviewPage = lazy(() => import('./pages/newDesign/onboarding-flow-overview').then((m) => ({ default: m.OnboardingFlowOverviewPage })));
const OnboardingUploadResumePage = lazy(() => import('./pages/newDesign/onboarding-upload-resume').then((m) => ({ default: m.OnboardingUploadResumePage })));

// Questions
const QuestionDetailPage = lazy(() => import('./pages/newDesign/home/question-detail').then((m) => ({ default: m.QuestionDetailPage })));
const QuestionUnknownPage = lazy(() => import('./pages/newDesign/home/question-unknown').then((m) => ({ default: m.QuestionUnknownPage })));

// Practice / interview flow
const MockInterviewPage = lazy(() => import('./pages/newDesign/home/mock-interview').then((m) => ({ default: m.MockInterviewPage })));
const PersonalizedPracticePage = lazy(() => import('./pages/newDesign/personalized-practice-design').then((m) => ({ default: m.PersonalizedPracticePage })));
const QuickMockPage = lazy(() => import('./pages/newDesign/quick-mock-page').then((m) => ({ default: m.QuickMockPage })));
const CoachingPage = lazy(() => import('./pages/newDesign/coaching-page').then((m) => ({ default: m.CoachingPage })));
const SessionConfirmPage = lazy(() => import('./components/newDesign/session-confirm').then((m) => ({ default: m.SessionConfirmPage })));
const AIMockPage = lazy(() => import('./pages/newDesign/ai-mock').then((m) => ({ default: m.AIMockPage })));
const AIMockWhitePage = lazy(() => import('./pages/newDesign/ai-mock-white').then((m) => ({ default: m.AIMockWhitePage })));
const EvaluationPage = lazy(() => import('./pages/newDesign/evaluation-page').then((m) => ({ default: m.EvaluationPage })));
const AddExperiencePage = lazy(() => import('./pages/newDesign/add-experience').then((m) => ({ default: m.AddExperiencePage })));

// Dashboard / account
const DashboardPage = lazy(() => import('./pages/newDesign/dashboard').then((m) => ({ default: m.DashboardPage })));
const DashboardHomePage = lazy(() => import('./pages/newDesign/dashboard-home').then((m) => ({ default: m.DashboardHomePage })));
const MyContributionsPage = lazy(() => import('./pages/newDesign/my-contributions-design').then((m) => ({ default: m.MyContributionsPage })));
const ReferEarnPage = lazy(() => import('./pages/newDesign/refer-earn-design').then((m) => ({ default: m.ReferEarnPage })));
const HistoryPage = lazy(() => import('./pages/newDesign/training-history-design').then((m) => ({ default: m.TrainingHistoryPage })));
const SettingsPage = lazy(() => import('./pages/newDesign/settings-design').then((m) => ({ default: m.SettingsPage })));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PremiumOnboardingPage = lazy(() => import('./pages/PremiumOnboardingPage'));

// Interview insights (login-walled)
const InterviewInsightsPage = lazy(() => import('./pages/newDesign/interview-insights-design').then((m) => ({ default: m.InterviewInsightsPage })));
const CompanyDetailPage = lazy(() => import('./pages/newDesign/company-detail').then((m) => ({ default: m.CompanyDetailPage })));
const ExperienceDetailPage = lazy(() => import('./pages/newDesign/experience-detail').then((m) => ({ default: m.ExperienceDetailPage })));

// Mentorship
const MentorshipPage = lazy(() => import('./components/newDesign/mentorship').then((m) => ({ default: m.MentorshipPage })));
const MentorshipMarketplacePage = lazy(() => import('./components/newDesign/mentorship-marketplace').then((m) => ({ default: m.MentorshipMarketplacePage })));
const MentorMarketplaceListPage = lazy(() => import('./components/newDesign/mentor-marketplace-list').then((m) => ({ default: m.MentorMarketplaceListPage })));
const MentorDetailsPage = lazy(() => import('./components/newDesign/mentor-details').then((m) => ({ default: m.MentorDetailsPage })));
const GuestDashboardPage = lazy(() => import('./components/newDesign/guest-dashboard').then((m) => ({ default: m.GuestDashboardPage })));
const MentorDashboardPage = lazy(() => import('./pages/mentor/mentor-dashboard').then((m) => ({ default: m.MentorDashboardPage })));
const SelectDashboardPage = lazy(() => import('./pages/mentor/select-dashboard').then((m) => ({ default: m.SelectDashboardPage })));

// Admin
const AdminRoute = lazy(() => import('./components/AdminRoute'));
const AdminConsole = lazy(() => import('./components/admin/console/AdminConsole'));
const AdminRedeemCodes = lazy(() => import('./pages/AdminRedeemCodes'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));

// Retention: 在 providers 内部挂载，用于上报 session_end（需要读取 useAuth）
function SessionTracker() {
  useSessionTracking();
  return null;
}

// Every route opens at the top. `history.scrollRestoration` is 'manual' (see
// main.tsx), so nothing puts us back at the top for free — not on a fresh load
// and not on back/forward. A hash is the one exception: /#pricing and friends
// are handled by the target page's own hash effect, which must not be fought.
//
// useLayoutEffect so the reset lands before paint. 'instant' is required:
// `scroll-behavior: smooth` on <html> would otherwise animate the jump, and on
// the home page the mandatory scroll-snap cancels a smooth programmatic scroll
// partway through, leaving it stranded mid-page.
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  // A late layout shift (fonts, the hero image, the announcement bar mounting)
  // can nudge the offset again after the first paint, so re-assert once the
  // page has settled — but only if nothing scrolled us on purpose in between.
  useEffect(() => {
    if (hash) return;
    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    window.addEventListener('keydown', stop, { once: true });
    const id = window.setTimeout(() => {
      if (!cancelled && window.scrollY !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    }, 200);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [pathname, hash]);

  return null;
}

// Root layout — provides auth context inside the router so useNavigate works
function RootLayout() {
  return (
    <AuthProvider>
      <UserPlanProvider>
        <RecommendedJobsProvider>
          <SessionTracker />
          <ScrollToTop />
          <Outlet />
          {/* Signed-in users who skipped onboarding step 3 get asked for their
              resume on every app page, not just the dashboard. */}
          <ResumePromptModal />
          <CookieBanner />
        </RecommendedJobsProvider>
      </UserPlanProvider>
    </AuthProvider>
  );
}

// Error fallback component
function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(221,60%,20%)] via-[hsl(221,40%,40%)] to-[hsl(220,20%,85%)] flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-white mb-4">Page Not Found</h1>
        <p className="text-xl text-[hsl(220,30%,75%)] mb-8">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="px-8 py-4 bg-[hsl(221,91%,60%)] text-white rounded-lg text-lg font-medium hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-lg shadow-[hsl(221,91%,30%)]/40 inline-block"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/question/:id', element: <QuestionDetailPage /> },
      { path: '/question-unknown/:id', element: <QuestionUnknownPage /> },
      // The old standalone pricing page is retired — pricing now lives in the
      // /#pricing section on the home page. /pricing is kept as a redirect so
      // existing SEO/inbound links (Google-indexed) still land in the right place.
      // (vercel.json also issues a 301 for /pricing at the edge in production.)
      { path: '/pricing', element: <Navigate to="/#pricing" replace /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/blog', element: <BlogListPage /> },
      { path: '/blog/:slug', element: <BlogPostPage /> },
      { path: '/auth', element: <AuthPage /> },
      { path: '/register', element: <AuthPage /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/pgs/ref/:slug', element: <RefRedirect /> },
      { path: '/auth/google/callback', element: <GoogleCallback /> },
      { path: '/signup-flow', element: <SignupFlowPage /> },
      { path: '/mock-interview', element: <MockInterviewPage /> },
      { path: '/personalized-practice', element: <PersonalizedPracticePage /> },
      { path: '/quick-mock', element: <QuickMockPage /> },
      { path: '/coaching', element: <CoachingPage /> },
      { path: '/session-confirm', element: <SessionConfirmPage /> },
      { path: '/ai-mock', element: <AIMockPage /> },
      { path: '/ai-mockwhite', element: <AIMockWhitePage /> },
      { path: '/dashboard', element: <DashboardHomePage /> },
      { path: '/profile', element: <DashboardPage /> },
      // Jobs feature temporarily hidden for this release — restore when re-launching.
      // { path: '/applications', element: <DashboardPage /> },
      { path: '/dashboard/contributions', element: <DashboardPage /> },
      { path: '/contributions', element: <MyContributionsPage /> },
      // Jobs feature temporarily hidden for this release — restore when re-launching.
      // { path: '/job-board', element: <JobBoardPage /> },
      { path: '/refer', element: <ReferEarnPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      // /billing is deprecated — billing now lives under Settings. Redirect old
      // links/bookmarks to the canonical location.
      { path: '/billing', element: <Navigate to="/settings?tab=billing" replace /> },
      { path: '/payment-success', element: <PaymentSuccess /> },
      { path: '/premium-onboarding', element: <PremiumOnboardingPage /> },
      { path: '/evaluation', element: <EvaluationPage /> },
      { path: '/add-experience', element: <AddExperiencePage /> },
      { path: '/interview-insights', element: <InterviewInsightsPage /> },
      { path: '/interview-insights/:companyId', element: <CompanyDetailPage /> },
      { path: '/experience/:id', element: <ExperienceDetailPage /> },
      { path: '/contact',element: <ContactPage />},
      { path: '/help',element: <HelpCenterPage />},
      { path: '/privacy',element: <PrivacyPolicy/>},
      { path: '/cookies',element: <CookiePolicy/>},
      { path: '/terms',element: <Terms/>},
      { path: '/data-protection',element: <DataProtectionPolicy/>},
      {
        path: '/goal',
        element: (
          <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center pt-[90px]"><GoalPage /></main>
            <Footer />
          </div>
        ),
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/goal-upload',
        element: (
          <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center pt-[90px]"><GoalUploadPage /></main>
            <Footer />
          </div>
        ),
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/onboarding-process',
        element: <OnboardingProcessPage />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/onboarding-flow',
        element: <OnboardingFlowOverviewPage />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: '/onboarding-resume',
        element: <OnboardingUploadResumePage />,
        errorElement: <ErrorBoundary />,
      },
        {
          path: '/mentorship',
          element: <MentorshipPage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/marketplace',
          element: <MentorshipMarketplacePage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/mentor-marketplace',
          element: <MentorMarketplaceListPage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/mentor-details',
          element: <MentorDetailsPage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/guest-dashboard',
          element: <GuestDashboardPage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/select-dashboard',
          element: <SelectDashboardPage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/mentor-dashboard',
          element: <MentorDashboardPage />,
          errorElement: <ErrorBoundary />,
        },
      { path: '*', element: <ErrorBoundary /> },

      // admin — ADMIN sees full console; OPS sees only Job Applications
      { path: '/admin', element: <AdminRoute allowedRoles={['ADMIN', 'OPS']}><AdminConsole /></AdminRoute> },
      { path: '/redeem-code', element: <AdminRoute><AdminRedeemCodes /></AdminRoute> },
      { path: '/audit-logs', element: <AdminRoute><AdminAuditLogs /></AdminRoute> },
    ],
  },
]);
