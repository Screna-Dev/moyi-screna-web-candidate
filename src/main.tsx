import React from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import App from "./App.tsx";
import "./index.css";

// 将环境变量暴露到 window 对象，方便在浏览器控制台调试
// 注意：VITE_* 开头的环境变量会被打包到客户端代码中，是公开的
(window as any).__ENV__ = {
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_PATH: import.meta.env.VITE_API_PATH,
};

createRoot(document.getElementById("root")!).render(<App />);
