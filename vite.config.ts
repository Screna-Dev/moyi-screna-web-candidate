import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get git commit hash
// In Vercel, use VERCEL_GIT_COMMIT_SHA if available, otherwise try git command
const getGitHash = () => {
  // Vercel provides VERCEL_GIT_COMMIT_SHA environment variable
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  
  // Fallback to git command for local development
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch (e) {
    return 'unknown'
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Inject git hash and build info as constants at build time
  define: {
    __GIT_HASH__: JSON.stringify(getGitHash()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERCEL_COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || null),
  },
})