import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserPlanProvider } from './hooks/useUserPlan';

// Public / marketing pages (home subdirectory, use @/ aliases)
import HomePageDefault from './pages/newDesign/home/home';
import QuestionBankPage from './pages/newDesign/home/question-bank';
import QuestionDetailPage from './pages/newDesign/home/question-detail';
import PricingPage from './pages/newDesign/home/pricing-page';
import FaqPage from './pages/newDesign/home/faq-page';
import JobBoardPage from './pages/newDesign/home/job-board';

// Auth / onboarding pages
import { AuthPage } from './pages/newDesign/auth';
import { SignupFlowPage } from './pages/newDesign/signup-flow';
import { OnboardingPage } from './pages/newDesign/onboarding';

// Dashboard / post-login pages
import { DashboardPage } from './pages/newDesign/dashboard';
import { DashboardMockInterviewPage } from './pages/newDesign/dashboard-mock-interview';
import { MockInterviewPage } from './pages/newDesign/home/mock-interview';
import { AIMockPage } from './pages/newDesign/ai-mock';
import { AIMockWhitePage } from './pages/newDesign/ai-mock-white';
import { HistoryPage } from './pages/newDesign/history';
import { JobsPage } from './pages/newDesign/jobs';
import { LibraryPage } from './pages/newDesign/library';
import { ReferEarnPage } from './pages/newDesign/refer-earn';
import { SettingsPage } from './pages/newDesign/settings';
import { BillingPage } from './pages/newDesign/billing';
import { EvaluationPage } from './pages/newDesign/evaluation-page';
import { AddExperiencePage } from './pages/newDesign/add-experience';
import { MessageCenterPage } from './pages/newDesign/message-center';
import { QuestionUnknownPage } from './pages/newDesign/question-unknown';
import GoogleCallback from './pages/GoogleCallback';
import InterviewPrep from './pages/InterviewPrep';

// Root layout — provides auth context inside the router so useNavigate works
function RootLayout() {
  return (
    <AuthProvider>
      <UserPlanProvider>
        <Outlet />
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
      {
        path: '/',
        element: <HomePageDefault />,
      },
      {
        path: '/question-bank',
        element: <QuestionBankPage />,
      },
      {
        path: '/question/:id',
        element: <QuestionDetailPage />,
      },
      {
        path: '/question-unknown',
        element: <QuestionUnknownPage />,
      },
      {
        path: '/pricing',
        element: <PricingPage />,
      },
      {
        path: '/faq',
        element: <FaqPage />,
      },
      {
        path: '/auth',
        element: <AuthPage />,
      },
      {
        path: '/auth/google/callback',
        element: <GoogleCallback />,
      },
      {
        path: '/signup-flow',
        element: <SignupFlowPage />,
      },
      {
        path: '/onboarding',
        element: <OnboardingPage />,
      },
      {
        path: '/mock-interview',
        element: <MockInterviewPage />,
      },
      {
        path: '/ai-mock',
        element: <AIMockPage />,
      },
      {
        path: '/ai-mockwhite',
        element: <AIMockWhitePage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/dashboard/mock-interview',
        // element: <DashboardMockInterviewPage />,
        element: <InterviewPrep />
      },
      {
        path: '/jobs',
        element: <JobsPage />,
      },
      {
        path: '/job-board',
        element: <JobBoardPage />,
      },
      {
        path: '/library',
        element: <LibraryPage />,
      },
      {
        path: '/refer',
        element: <ReferEarnPage />,
      },
      {
        path: '/history',
        element: <HistoryPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
      {
        path: '/billing',
        element: <BillingPage />,
      },
      {
        path: '/evaluation',
        element: <EvaluationPage />,
      },
      {
        path: '/add-experience',
        element: <AddExperiencePage />,
      },
      {
        path: '/messages',
        element: <MessageCenterPage />,
      },
      {
        path: '*',
        element: <ErrorBoundary />,
      },
    ],
  },
]);
