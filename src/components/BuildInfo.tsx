/**
 * BuildInfo Component
 * Displays build information (git hash) in the bottom right corner
 * Only shown in staging environment
 */

// These constants are injected at build time by Vite
declare const __GIT_HASH__: string;
declare const __BUILD_TIME__: string;
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

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md font-mono shadow-lg border border-white/20 backdrop-blur-sm"
      title={`Build Information - Environment: ${environment}, Hash: ${__GIT_HASH__}, Time: ${__BUILD_TIME__}`}
    >
      build-{__GIT_HASH__}
    </div>
  );
};

export default BuildInfo;

