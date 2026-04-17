import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserPlanProvider } from './hooks/useUserPlan';
import { RecommendedJobsProvider } from './hooks/useRecommendedJobs';

// Public / marketing pages (home subdirectory, use @/ aliases)
import { QuestionDetailPage } from './pages/newDesign/home/question-detail';
import { PricingPage } from './pages/newDesign/home/pricing-page';
import FaqPage from './pages/newDesign/home/faq-page';
import JobBoardPage from './pages/newDesign/home/job-board';

// Auth / onboarding pages
import { AuthPage } from './pages/newDesign/auth';
import { SignupFlowPage } from './pages/newDesign/signup-flow';
import { OnboardingPage } from './pages/newDesign/onboarding';

// Dashboard / post-login pages
import { DashboardPage } from './pages/newDesign/dashboard';
import { MockInterviewPage } from './pages/newDesign/home/mock-interview';
import { AIMockPage } from './pages/newDesign/ai-mock';
import { AIMockWhitePage } from './pages/newDesign/ai-mock-white';
import { HistoryPage } from './pages/newDesign/history';
import { JobsPage } from './pages/newDesign/jobs';
import { ReferEarnPage } from './pages/newDesign/refer-earn';
import { SettingsPage } from './pages/newDesign/settings';
import { BillingPage } from './pages/newDesign/billing';
import { EvaluationPage } from './pages/newDesign/evaluation-page';
import { AddExperiencePage } from './pages/newDesign/add-experience';
import { MessageCenterPage } from './pages/newDesign/message-center';
import { QuestionUnknownPage } from './pages/newDesign/home/question-unknown';
import { SessionConfirmPage } from './components/newDesign/session-confirm';
import GoogleCallback from './pages/GoogleCallback';
import { MyContributionsPage } from './pages/newDesign/my-contributions';
import { PersonalizedPracticePage } from './pages/newDesign/personalized-practice';
import { HomePage } from './pages/newDesign/home/home';
import { InterviewInsightsPage } from './pages/newDesign/interview-insights';
import { ExperienceDetailPage } from './pages/newDesign/experience-detail';
import { ContactPage } from './pages/newDesign/contact';
import Admin from './pages/Admin';
import AdminRedeemCodes from './pages/AdminRedeemCodes';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminRoute from './components/AdminRoute';
import { HelpCenterPage } from './pages/newDesign/help-center';
import { CookieBanner } from './components/newDesign/cookie-banner';
import { PrivacyPolicy } from './pages/newDesign/privacy-policy';
import { CookiePolicy } from './pages/newDesign/cookie-policy';
import { DataProtectionPolicy } from './pages/newDesign/data-protection-policy';
import { GoalPage } from './pages/newDesign/goal-page';
import { GoalUploadPage } from './pages/newDesign/goal-upload-page';
import { Navbar } from './components/newDesign/home/navbar';
import { Footer } from './components/newDesign/home/footer';
import { OnboardingProcessPage } from './pages/newDesign/onboarding-process';
import { OnboardingFlowOverviewPage } from './pages/newDesign/onboarding-flow-overview';
import { OnboardingUploadResumePage } from './pages/newDesign/onboarding-upload-resume';
import { MentorshipPage } from './components/newDesign/mentorship';
import { MentorshipMarketplacePage } from './components/newDesign/mentorship-marketplace';
import { MentorDetailsPage } from './components/newDesign/mentor-details';
import { GuestDashboardPage } from './components/newDesign/guest-dashboard';

// Root layout — provides auth context inside the router so useNavigate works
function RootLayout() {
  return (
    <AuthProvider>
      <UserPlanProvider>
        <RecommendedJobsProvider>
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
      { path: '/auth/google/callback', element: <GoogleCallback /> },
      { path: '/signup-flow', element: <SignupFlowPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/mock-interview', element: <MockInterviewPage /> },
      { path: '/personalized-practice', element: <PersonalizedPracticePage /> },
      { path: '/session-confirm', element: <SessionConfirmPage /> },
      { path: '/ai-mock', element: <AIMockPage /> },
      { path: '/ai-mockwhite', element: <AIMockWhitePage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/contributions', element: <MyContributionsPage /> },
      { path: '/jobs', element: <JobsPage /> },
      { path: '/job-board', element: <JobBoardPage /> },
      { path: '/refer', element: <ReferEarnPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/billing', element: <BillingPage /> },
      { path: '/evaluation', element: <EvaluationPage /> },
      { path: '/add-experience', element: <AddExperiencePage /> },
      { path: '/messages', element: <MessageCenterPage /> },
      { path: '/interview-insights', element: <InterviewInsightsPage /> },
      { path: '/experience/:id', element: <ExperienceDetailPage /> },
      { path: '/contact',element: <ContactPage />},
      { path: '/help',element: <HelpCenterPage />},
      { path: '/privacy',element: <PrivacyPolicy/>},
      { path: '/cookies',element: <CookiePolicy/>},
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
          path: '/mentor-details',
          element: <MentorDetailsPage />,
          errorElement: <ErrorBoundary />,
        },
        {
          path: '/guest-dashboard',
          element: <GuestDashboardPage />,
          errorElement: <ErrorBoundary />,
        },
      { path: '*', element: <ErrorBoundary /> },

      // admin — only accessible to users with role ADMIN
      { path: '/admin', element: <AdminRoute><Admin /></AdminRoute> },
      { path: '/redeem-code', element: <AdminRoute><AdminRedeemCodes /></AdminRoute> },
      { path: '/audit-logs', element: <AdminRoute><AdminAuditLogs /></AdminRoute> },
    ],
  },
]);
