/**
 * BuildInfo Component
 * Displays build information (git hash) in the bottom right corner
 * Only shown in staging environment
 */

import { useState, useEffect } from 'react';

interface BuildInfoData {
  gitHash: string;
  buildTime: string;
  vercelCommitSha: string | null;
}

const BuildInfo = () => {
  const [buildInfo, setBuildInfo] = useState<BuildInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get environment from explicit env variable
  const environment = import.meta.env.VITE_ENVIRONMENT || 'production';
  
  // Only show in staging environment
  const isStaging = environment === 'staging';

  useEffect(() => {
    // Load build info from JSON file
    fetch('/build-info.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch build-info.json: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: BuildInfoData) => {
        setBuildInfo(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[BuildInfo] Failed to load build-info.json:', err);
        setLoading(false);
      });
  }, []);

  // Only render in staging environment
  if (!isStaging) {
    return null;
  }

  if (loading || !buildInfo) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md font-mono shadow-lg border border-white/20 backdrop-blur-sm"
        title="Loading build information..."
      >
        build-loading...
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md font-mono shadow-lg border border-white/20 backdrop-blur-sm"
      title={`Build Information - Environment: ${environment}, Hash: ${buildInfo.gitHash}, Time: ${buildInfo.buildTime}`}
    >
      build-{buildInfo.gitHash}
    </div>
  );
};

export default BuildInfo;

