import React from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import App from "./App.tsx";
import "./index.css";
import "./styles/index.css";

// 将环境变量暴露到 window 对象，方便在浏览器控制台调试
// 注意：VITE_* 开头的环境变量会被打包到客户端代码中，是公开的
(window as any).__ENV__ = {
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_PATH: import.meta.env.VITE_API_PATH,
};

// The browser's automatic scroll restoration is wrong for this SPA: on reload,
// session restore, or bfcache-style re-entry Chrome re-applies the pixel offset
// from the previous visit *before* React has mounted anything, and the home
// page's `scroll-snap-type: y mandatory` then locks that offset onto the
// nearest section boundary — so `/` opens parked on Features / How it works
// instead of the hero. We drive scrolling ourselves (see ScrollToTop in
// router.tsx and the /#pricing hash handler in home.tsx).
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

// PostHog initialization
const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

createRoot(rootElement).render(
  <React.StrictMode>
    {posthogApiKey && posthogHost ? (
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{
          api_host: posthogHost,
          capture_exceptions: true,
          debug: import.meta.env.MODE === "development",
          loaded: (posthog) => {
            if (import.meta.env.MODE === "development") {
              console.log('[PostHog] Initialized successfully');
            }
          },
          _capture_metrics: false,
        }}
      >
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
