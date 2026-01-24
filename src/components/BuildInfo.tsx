/**
 * BuildInfo Component
 * Displays build information (git hash) in the bottom right corner
 * Only shown in staging environment
 */

declare const __GIT_HASH__: string;

const BuildInfo = () => {
  // Get environment from explicit env variable
  const environment = import.meta.env.VITE_ENVIRONMENT || 'production';
  
  // Only show in staging environment
  const isStaging = environment === 'staging';

  if (!isStaging) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md font-mono shadow-lg border border-white/20 backdrop-blur-sm"
      title={`Build Information - Environment: ${environment}`}
    >
      build-{__GIT_HASH__}
    </div>
  );
};

export default BuildInfo;

