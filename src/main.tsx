import React from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import App from "./App.tsx";
import "./index.css";

<<<<<<< HEAD
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

// 安全地初始化 PostHog，即使被广告拦截器阻止也不会影响应用
const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

createRoot(rootElement).render(
  <React.StrictMode>
    {posthogApiKey && posthogHost ? (
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{
          api_host: posthogHost,
          defaults: "2025-05-24",
          capture_exceptions: true, // 捕获异常以启用错误跟踪
          debug: import.meta.env.MODE === "development",
          // 添加错误处理，避免被广告拦截器阻止时影响应用
          loaded: (posthog) => {
            // PostHog 加载成功时的回调
            if (import.meta.env.MODE === "development") {
              console.log('[PostHog] Initialized successfully');
            }
          },
          // 捕获 PostHog 错误，避免影响用户体验
          _capture_metrics: false, // 禁用内部指标捕获以减少请求
        }}
      >
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
=======
// 将环境变量暴露到 window 对象，方便在浏览器控制台调试
// 注意：VITE_* 开头的环境变量会被打包到客户端代码中，是公开的
(window as any).__ENV__ = {
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_PATH: import.meta.env.VITE_API_PATH,
};

createRoot(document.getElementById("root")!).render(<App />);
>>>>>>> staging
