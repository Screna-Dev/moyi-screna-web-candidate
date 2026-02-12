import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get commit SHA - prefer VERCEL_GIT_COMMIT_SHA, fallback to git command
const getCommitSha = () => {
  // Vercel provides VERCEL_GIT_COMMIT_SHA environment variable
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    console.log('[build-info] Using VERCEL_GIT_COMMIT_SHA:', process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7));
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }
  
  // Fallback to git command for local development or when Vercel env var is not available
  try {
    const gitSha = execSync('git rev-parse HEAD').toString().trim();
    console.log('[build-info] Using git command, SHA:', gitSha.substring(0, 7));
    return gitSha;
  } catch (e) {
    console.warn('[build-info] Failed to get commit SHA from VERCEL_GIT_COMMIT_SHA or git command');
    return null;
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip console.log from production builds (keeps console.error/warn)
  esbuild: {
    pure: ['console.log'],
  },
  // Inject commit SHA as constant at build time
  define: {
    __VERCEL_COMMIT_SHA__: JSON.stringify(getCommitSha()),
  },
  // Proxy API requests in development to avoid CORS issues
  server: {
    proxy: {
      '/api/v1': {
        target: 'https://api-staging.screna.ai',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})