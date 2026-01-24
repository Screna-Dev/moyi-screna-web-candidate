import path from "path"
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

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

// Plugin to generate build-info.json file
const buildInfoPlugin = (): Plugin => {
  return {
    name: 'build-info',
    buildStart() {
      const gitHash = getGitHash();
      const buildInfo = {
        gitHash,
        buildTime: new Date().toISOString(),
        vercelCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      };
      
      // Write to public directory so it's accessible at runtime
      const publicDir = path.resolve(__dirname, 'public');
      writeFileSync(
        path.join(publicDir, 'build-info.json'),
        JSON.stringify(buildInfo, null, 2)
      );
      
      console.log('[build-info] Generated build-info.json:', gitHash);
    },
  };
};

export default defineConfig({
  plugins: [react(), buildInfoPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Keep define for backward compatibility, but prefer reading from file
  define: {
    __GIT_HASH__: JSON.stringify(getGitHash()),
  },
})