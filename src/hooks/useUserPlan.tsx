import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PaymentService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Plan types
export type PlanType = 'Free' | 'Pro' | 'Elite';

// Plan usage data interface
export interface PlanUsageData {
  currentPlan: PlanType;
  subscriptionCancelPending: boolean;
  planDowngradePending: boolean;
  creditBalance: number;
  nextBillingDate: string | null;
  updatedAt: string | null;
}

// Context value interface
interface UserPlanContextValue {
  // Plan data
  planData: PlanUsageData;
  isLoading: boolean;
  error: string | null;
  
  // Plan check helpers
  isPremium: boolean;      // Pro or Elite
  isElite: boolean;        // Elite only
  isFree: boolean;         // Free only
  isPro: boolean;          // Pro only
  
  // Feature access helpers
  canAccessJobs: boolean;           // Pro and Elite can access jobs
  canAccessPremiumReport: boolean;  // Elite only - video replay, detailed feedback
  canPushProfile: boolean;          // Pro and Elite
  canAccessMentorship: boolean;     // Pro and Elite
  
  // Actions
  refreshPlan: () => Promise<void>;
  changePlan: (planType: PlanType) => Promise<string | null>; // Returns Stripe URL or null on error
  buyCredits: (numberOfCredits: number) => Promise<string | null>; // Returns Stripe URL or null on error
  
  // Loading states for actions
  isChangingPlan: boolean;
  isBuyingCredits: boolean;
}

// Default plan data
const defaultPlanData: PlanUsageData = {
  currentPlan: 'Free',
  subscriptionCancelPending: false,
  planDowngradePending: false,
  creditBalance: 0,
  nextBillingDate: null,
  updatedAt: null,
};

// Create context
const UserPlanContext = createContext<UserPlanContextValue | undefined>(undefined);

// Provider props
interface UserPlanProviderProps {
  children: ReactNode;
}

// Provider component
export const UserPlanProvider = ({ children }: UserPlanProviderProps) => {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [planData, setPlanData] = useState<PlanUsageData>(defaultPlanData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isBuyingCredits, setIsBuyingCredits] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch plan data
  const refreshPlan = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      setPlanData(defaultPlanData);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await PaymentService.getPlanUsage();
      
      if (response.data?.data) {
        setPlanData({
          currentPlan: response.data.data.currentPlan || 'Free',
          subscriptionCancelPending: response.data.data.subscriptionCancelPending || false,
          planDowngradePending: response.data.data.planDowngradePending || false,
          creditBalance: response.data.data.creditBalance || 0,
          nextBillingDate: response.data.data.nextBillingDate || null,
          updatedAt: response.data.data.updatedAt || null,
        });
        setHasFetched(true);
      }
    } catch (err) {
      console.error('Failed to fetch plan data:', err);
      setError('Failed to load plan information');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch plan when auth state changes (user logs in)
  useEffect(() => {
    // Wait for auth to finish loading
    if (isAuthLoading) {
      return;
    }
    
    // If authenticated and haven't fetched yet, fetch plan
    if (isAuthenticated && !hasFetched) {
      refreshPlan();
    }
    
    // If not authenticated, reset to defaults
    if (!isAuthenticated) {
      setPlanData(defaultPlanData);
      setHasFetched(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, hasFetched, refreshPlan]);

  // Change plan - returns Stripe URL or handles auto-upgrade
  const changePlan = useCallback(async (planType: PlanType): Promise<string | null> => {
    try {
      setIsChangingPlan(true);
      
      const response = await PaymentService.changePlan(planType);
      
      // Check if there's a Stripe URL to redirect to
      if (response.data?.data?.url) {
        return response.data.data.url;
      }
      
      // If no URL but request was successful (auto-upgrade with existing payment method)
      if (response.data?.status === 'success' || response.status === 200) {
        toast({
          title: "Plan Updated!",
          description: response.data?.message || `Successfully upgraded to ${planType} plan.`,
          // Note: Don't use variant: "destructive" for success messages!
        });
        
        // Refresh plan data to reflect the change
        await refreshPlan();
        
        return null; // No redirect needed
      }
      
      throw new Error(response.data?.message || 'Failed to create subscription session');
    } catch (err: any) {
      console.error('Failed to change plan:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to initiate plan change",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsChangingPlan(false);
    }
  }, [toast, refreshPlan]);

  // Buy credits - returns Stripe URL
  const buyCredits = useCallback(async (numberOfCredits: number): Promise<string | null> => {
    try {
      setIsBuyingCredits(true);
      
      const response = await PaymentService.createOneTimeSession(numberOfCredits);
      
      if (response.data?.data?.url) {
        return response.data.data.url;
      }
      
      throw new Error(response.data?.message || 'Failed to create checkout session');
    } catch (err: any) {
      console.error('Failed to buy credits:', err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to initiate purchase",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsBuyingCredits(false);
    }
  }, [toast]);

  // Computed values - use loading state to show proper defaults
  const effectiveIsLoading = isAuthLoading || isLoading;
  const currentPlan = planData.currentPlan;
  
  const isPremium = currentPlan === 'Pro' || currentPlan === 'Elite';
  const isElite = currentPlan === 'Elite';
  const isFree = currentPlan === 'Free';
  const isPro = currentPlan === 'Pro';
  
  // Feature access - return false while loading to prevent flash of wrong content
  const canAccessJobs = !effectiveIsLoading && isPremium;
  const canAccessPremiumReport = !effectiveIsLoading && isElite;
  const canPushProfile = !effectiveIsLoading && isPremium;
  const canAccessMentorship = !effectiveIsLoading && isPremium;

  const value: UserPlanContextValue = {
    // Plan data
    planData,
    isLoading: effectiveIsLoading,
    error,
    
    // Plan check helpers
    isPremium,
    isElite,
    isFree,
    isPro,
    
    // Feature access helpers
    canAccessJobs,
    canAccessPremiumReport,
    canPushProfile,
    canAccessMentorship,
    
    // Actions
    refreshPlan,
    changePlan,
    buyCredits,
    
    // Loading states
    isChangingPlan,
    isBuyingCredits,
  };

  return (
    <UserPlanContext.Provider value={value}>
      {children}
    </UserPlanContext.Provider>
  );
};

// Custom hook to use the plan context
export const useUserPlan = (): UserPlanContextValue => {
  const context = useContext(UserPlanContext);
  
  if (context === undefined) {
    throw new Error('useUserPlan must be used within a UserPlanProvider');
  }
  
  return context;
};

// Helper hook for upgrade prompts
export const useUpgradePrompt = () => {
  const { changePlan, isChangingPlan, planData } = useUserPlan();
  
  const upgradeToElite = async (): Promise<void> => {
    const url = await changePlan('Elite');
    if (url) {
      window.location.href = url;
    }
    // If no URL, the plan was changed automatically (success toast already shown)
  };
  
  const upgradeToPro = async (): Promise<void> => {
    const url = await changePlan('Pro');
    if (url) {
      window.location.href = url;
    }
    // If no URL, the plan was changed automatically (success toast already shown)
  };
  
  const upgradeToNext = async (): Promise<void> => {
    if (planData.currentPlan === 'Free') {
      await upgradeToPro();
    } else if (planData.currentPlan === 'Pro') {
      await upgradeToElite();
    }
  };
  
  return {
    upgradeToElite,
    upgradeToPro,
    upgradeToNext,
    isChangingPlan,
  };
};

// Export default for convenience
export default useUserPlan;