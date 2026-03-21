import { Suspense } from "react";
import { Toaster } from "@/components/newDesign/ui/toaster";
import { Toaster as Sonner } from "@/components/newDesign/ui/sonner";
import { TooltipProvider } from "@/components/newDesign/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import BuildInfo from "./components/BuildInfo";
import { router } from "./router";

const queryClient = new QueryClient();

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// AuthProvider and UserPlanProvider are mounted inside the router (RootLayout)
// so that useNavigate works correctly within AuthContext.
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BuildInfo />
      <Suspense fallback={<LoadingFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
