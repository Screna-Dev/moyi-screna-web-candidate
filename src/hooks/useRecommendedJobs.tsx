import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { getJobTitleRecommendations } from '@/services/ProfileServices';

export interface RecommendedJob {
  job_title: string;
  match_percentage: number;
  reason: string;
  key_requirements: string[];
}

interface RecommendedJobsContextValue {
  recommendations: RecommendedJob[];
  isLoading: boolean;
  error: string | null;
  /** Fetch recommendations (returns cached data if available) */
  fetchRecommendations: () => Promise<RecommendedJob[]>;
  /** Clear cache so next fetch hits the API (call after resume upload/update) */
  invalidate: () => void;
}

const RecommendedJobsContext = createContext<RecommendedJobsContextValue | null>(null);

export function RecommendedJobsProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<RecommendedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  // Keep a ref to the in-flight promise so concurrent callers share the same request
  const inflightRef = useRef<Promise<RecommendedJob[]> | null>(null);

  const fetchRecommendations = useCallback(async (): Promise<RecommendedJob[]> => {
    // Return cached data if we already fetched successfully
    if (hasFetched.current && recommendations.length > 0) {
      return recommendations;
    }

    // If a request is already in flight, wait for it
    if (inflightRef.current) {
      return inflightRef.current;
    }

    const promise = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getJobTitleRecommendations();
        const data = response.data?.data;
        const jobs: RecommendedJob[] = data?.recommendations || [];
        setRecommendations(jobs);
        hasFetched.current = true;
        return jobs;
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to get recommendations.';
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, [recommendations]);

  const invalidate = useCallback(() => {
    hasFetched.current = false;
    setRecommendations([]);
    setError(null);
  }, []);

  return (
    <RecommendedJobsContext.Provider
      value={{ recommendations, isLoading, error, fetchRecommendations, invalidate }}
    >
      {children}
    </RecommendedJobsContext.Provider>
  );
}

export function useRecommendedJobs() {
  const ctx = useContext(RecommendedJobsContext);
  if (!ctx) {
    throw new Error('useRecommendedJobs must be used within RecommendedJobsProvider');
  }
  return ctx;
}
