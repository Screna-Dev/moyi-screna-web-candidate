import { Suspense, useLayoutEffect, useState, useEffect } from "react";
import { Toaster } from "@/components/newDesign/ui/toaster";
import { Toaster as Sonner } from "@/components/newDesign/ui/sonner";
import { TooltipProvider } from "@/components/newDesign/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { usePostHog } from "posthog-js/react";
import BuildInfo from "./components/BuildInfo";
import { router } from "./router";
import { TopBar } from "@/components/newDesign/top-bar";
import { captureAttribution } from "@/utils/attribution";

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
    const root = document.documentElement;
    if (isLoggedIn) {
      root.style.setProperty('--topbar-h', '0px');
      return;
    }
    const el = document.getElementById('top-bar');
    if (!el) {
      root.style.setProperty('--topbar-h', '0px');
      return;
    }
    // Keep --topbar-h in sync with the top bar's real height. A one-shot
    // measurement goes stale when the bar's height changes later (text
    // wrapping on resize, or web fonts loading after first paint), which
    // pushes the navbar up and makes it overlap the top bar.
    const sync = () =>
      root.style.setProperty('--topbar-h', `${el.getBoundingClientRect().height}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoggedIn]);

  if (isLoggedIn) return null;
  return <TopBar />;
}

// AuthProvider and UserPlanProvider are mounted inside the router (RootLayout)
// so that useNavigate works correctly within AuthContext.
const App = () => {
  const posthog = usePostHog();

  // 00 — Acquire: 启动时读取 UTM / referrer 做渠道归因（super + person properties）
  useEffect(() => {
    if (!posthog) return;
    captureAttribution(posthog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
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
};

export default App;
