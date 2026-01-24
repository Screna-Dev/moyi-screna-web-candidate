/**
 * BuildInfo Component
 * Displays build information (git hash) in the bottom right corner
 * Only shown in staging environment
 */

// This constant is injected at build time by Vite
declare const __VERCEL_COMMIT_SHA__: string | null;

const BuildInfo = () => {
  // Get environment from explicit env variable
  const environment = import.meta.env.VITE_ENVIRONMENT || 'production';
  
  // Only show in staging environment
  const isStaging = environment === 'staging';

  // Only render in staging environment
  if (!isStaging) {
    return null;
  }

  // Get short hash (first 7 characters) from Vercel commit SHA
  const shortHash = __VERCEL_COMMIT_SHA__ ? __VERCEL_COMMIT_SHA__.substring(0, 7) : 'unknown';

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md font-mono shadow-lg border border-white/20 backdrop-blur-sm"
      title={`Build Information - Environment: ${environment}, Commit: ${__VERCEL_COMMIT_SHA__ || 'unknown'}`}
    >
      build-{shortHash}
    </div>
  );
};

export default BuildInfo;

