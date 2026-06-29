import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserPlanProvider } from './hooks/useUserPlan';
import { RecommendedJobsProvider } from './hooks/useRecommendedJobs';

// Public / marketing pages (home subdirectory, use @/ aliases)
import { QuestionDetailPage } from './pages/newDesign/home/question-detail';
import { PricingPage } from './pages/newDesign/home/pricing-page';
import FaqPage from './pages/newDesign/home/faq-page';
// Jobs feature temporarily hidden for this release — restore when re-launching.
// import JobBoardPage from './pages/newDesign/home/job-board'
// Auth / onboarding pages
import { AuthPage } from './pages/newDesign/auth';
import ForgotPassword from './pages/ForgetPassword';
import { RefRedirect } from './pages/ref-redirect';
import { SignupFlowPage } from './pages/newDesign/signup-flow';

// Dashboard / post-login pages
import { DashboardPage } from './pages/newDesign/dashboard';
import { DashboardHomePage } from './pages/newDesign/dashboard-home';
import { MockInterviewPage } from './pages/newDesign/home/mock-interview';
import { AIMockPage } from './pages/newDesign/ai-mock';
import { AIMockWhitePage } from './pages/newDesign/ai-mock-white';
import { TrainingHistoryPage as HistoryPage } from './pages/newDesign/training-history-design';
import { ReferEarnPage } from './pages/newDesign/refer-earn-design';
import { SettingsPage } from './pages/newDesign/settings-design';
import { BillingPage } from './pages/newDesign/billing';
import { EvaluationPage } from './pages/newDesign/evaluation-page';
import { AddExperiencePage } from './pages/newDesign/add-experience';
import { QuestionUnknownPage } from './pages/newDesign/home/question-unknown';
import { SessionConfirmPage } from './components/newDesign/session-confirm';
import GoogleCallback from './pages/GoogleCallback';
import PaymentSuccess from './pages/PaymentSuccess';
import PremiumOnboardingPage from './pages/PremiumOnboardingPage';
import { MyContributionsPage } from './pages/newDesign/my-contributions-design';
import { PersonalizedPracticePage } from './pages/newDesign/personalized-practice-design';
import { QuickMockPage } from './pages/newDesign/quick-mock-page';
import { CoachingPage } from './pages/newDesign/coaching-page';
import { HomePage } from './pages/newDesign/home/home';
import { InterviewInsightsPage } from './pages/newDesign/interview-insights-design';
import { ExperienceDetailPage } from './pages/newDesign/experience-detail';
import { CompanyDetailPage } from './pages/newDesign/company-detail';
import { ContactPage } from './pages/newDesign/contact';
import AdminConsole from './components/admin/console/AdminConsole';
import AdminRedeemCodes from './pages/AdminRedeemCodes';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminRoute from './components/AdminRoute';
import { HelpCenterPage } from './pages/newDesign/help-center';
import { CookieBanner } from './components/newDesign/cookie-banner';
import { PrivacyPolicy } from './pages/newDesign/privacy-policy';
import { CookiePolicy } from './pages/newDesign/cookie-policy';
import { Terms } from './pages/newDesign/terms';
import { DataProtectionPolicy } from './pages/newDesign/data-protection-policy';
import { GoalPage } from './pages/newDesign/goal-page';
import { GoalUploadPage } from './pages/newDesign/goal-upload-page';
import { Navbar } from './components/newDesign/home/navbar';
import { Footer } from './components/newDesign/home/footer';
import { useSessionTracking } from './hooks/useSessionTracking';
import { OnboardingProcessPage } from './pages/newDesign/onboarding-process';
import { OnboardingFlowOverviewPage } from './pages/newDesign/onboarding-flow-overview';
import { OnboardingUploadResumePage } from './pages/newDesign/onboarding-upload-resume';
import { MentorshipPage } from './components/newDesign/mentorship';
import { MentorshipMarketplacePage } from './components/newDesign/mentorship-marketplace';
import { MentorMarketplaceListPage } from './components/newDesign/mentor-marketplace-list';
import { MentorDetailsPage } from './components/newDesign/mentor-details';
import { GuestDashboardPage } from './components/newDesign/guest-dashboard';

// Mentor dashboard (dual-role candidate/mentor accounts)
import { MentorDashboardPage } from './pages/mentor/mentor-dashboard';
import { SelectDashboardPage } from './pages/mentor/select-dashboard';

// Retention: 在 providers 内部挂载，用于上报 session_end（需要读取 useAuth）
function SessionTracker() {
  useSessionTracking();
  return null;
}

// Root layout — provides auth context inside the router so useNavigate works
function RootLayout() {
  return (
    <AuthProvider>
      <UserPlanProvider>
        <RecommendedJobsProvider>
          <SessionTracker />
          <Outlet />
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
      { path: '/pricing', element: <PricingPage /> },
      { path: '/faq', element: <FaqPage /> },
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
      { path: '/billing', element: <BillingPage /> },
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
