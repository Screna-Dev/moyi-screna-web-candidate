import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthLayout } from "./components/AuthLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ProfileCompleted from "./pages/ProfileCompleted";
import ProfileEdit from "./pages/ProfileEdit";
import Interview from "./pages/Interview";
import Pricing from "./pages/Pricing";
import Metrics from "./pages/Metrics";
import Jobs from "./pages/Jobs";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AuthLayout />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile_completed" element={<ProfileCompleted />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/metrics" element={<Metrics />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/messages" element={<Messages />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
