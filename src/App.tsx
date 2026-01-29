import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserPlanProvider } from "./hooks/useUserPlan";
import { AuthLayout } from "./components/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load all pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileCompleted = lazy(() => import("./pages/ProfileCompleted"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const Interview = lazy(() => import("./pages/Interview"));
// const Pricing = lazy(() => import("./pages/Pricing"));
const Jobs = lazy(() => import("./pages/Jobs"));
const InterviewPrep = lazy(() => import("./pages/InterviewPrep"));
const InterviewPrepEmpty = lazy(() => import("./pages/InterviewPrepEmpty"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GoogleCallback = lazy(()=> import("./pages/GoogleCallback"))
// AI Interview component (direct access, not protected)
const AIInterview = lazy(() => import("./pages/ai-interview"));

// Mentor
const Mentors = lazy(()=> import("./pages/Mentors"))
const MentorApply = lazy(()=> import("./pages/MentorApply"))
const MentorDashboard = lazy(()=> import("./pages/MentorDashboard"))

const Settings = lazy(()=> import("./pages/Settings"))
const Admin = lazy(()=> import("./pages/Admin"))

const Career = lazy(()=> import("./pages/Career"))
const PaymentSuccess = lazy(()=> import("./pages/PaymentSuccess"))
const AdminRedeemCodes = lazy(()=> import ("./pages/AdminRedeemCodes"))

const queryClient = new QueryClient();

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <UserPlanProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/career" element={<Career/>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />
                
                {/* Protected routes */}
                <Route element={
                  <ProtectedRoute>
                    <AuthLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile_completed" element={<ProfileCompleted />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/interview" element={<Interview />} />
                  {/* <Route path="/pricing" element={<Pricing />} /> */}
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/interview-prep" element={<InterviewPrep />} />
                  <Route path="/interview-prep/empty" element={<InterviewPrepEmpty />} />
                  <Route path="/mentors" element={<Mentors />} />
                  <Route path="/mentor/apply" element={<MentorApply />} />
                  <Route path="/mentor/dashboard" element={<MentorDashboard />} />
                  <Route 
                    path="/interview/:interviewId" 
                    element={<AIInterview isDirectAccess={true} />} 
                  />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/redeem-code" element={<AdminRedeemCodes />} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                </Route>
                
                {/* Catch-all routes */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </UserPlanProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
