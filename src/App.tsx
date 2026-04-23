import { Suspense, useLayoutEffect, useState, useEffect } from "react";
import { Toaster } from "@/components/newDesign/ui/toaster";
import { Toaster as Sonner } from "@/components/newDesign/ui/sonner";
import { TooltipProvider } from "@/components/newDesign/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import BuildInfo from "./components/BuildInfo";
import { router } from "./router";
import { TopBar } from "@/components/newDesign/top-bar";

const queryClient = new QueryClient();

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function checkAuth() {
  return !!localStorage.getItem('authToken') || !!sessionStorage.getItem('authToken');
}

function TopBarWrapper() {
  const [isLoggedIn, setIsLoggedIn] = useState(checkAuth);

  useEffect(() => {
    const handler = () => setIsLoggedIn(checkAuth());
    window.addEventListener('screna-auth-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('screna-auth-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useLayoutEffect(() => {
    if (isLoggedIn) {
      document.documentElement.style.setProperty('--topbar-h', '0px');
      return;
    }
    const el = document.getElementById('top-bar');
    const h = el ? el.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--topbar-h', `${h}px`);
  }, [isLoggedIn]);

  if (isLoggedIn) return null;
  return <TopBar />;
}

// AuthProvider and UserPlanProvider are mounted inside the router (RootLayout)
// so that useNavigate works correctly within AuthContext.
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TopBarWrapper />
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
