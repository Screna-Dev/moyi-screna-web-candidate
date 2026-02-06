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
  trialExpiresAt: string | null;
  isTrialActive: boolean;
  effectivePlan: string | null;
  trialDaysRemaining: number;
  recurringCreditBalance: number;
  permanentCreditBalance: number;
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
  changePlan: (planType: PlanType) => Promise<{ success: boolean; url?: string | null; message?: string }>; 
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
  trialExpiresAt: "",
  isTrialActive: true,
  effectivePlan: "Free",
  trialDaysRemaining: 0,
  recurringCreditBalance: 0,
  permanentCreditBalance: 0,
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

          trialExpiresAt: response.data.data.trialExpiresAt || "",
          isTrialActive: response.data.data.isTrialActive || true,
          effectivePlan: response.data.data.effectivePlan || "Free",
          trialDaysRemaining: response.data.data.trialDaysRemaining || 0,
          recurringCreditBalance: response.data.data.recurringCreditBalance || 0,
          permanentCreditBalance: response.data.data.permanentCreditBalance || 0,
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

  // Change plan - handles upgrade, downgrade, and cancellation (Free)
  const changePlan = useCallback(async (planType: PlanType): Promise<{ success: boolean; url?: string | null; message?: string }> => {
    try {
      setIsChangingPlan(true);
      
      const response = await PaymentService.changePlan(planType);
      
      // Check if there's a Stripe URL to redirect to (for upgrades)
      if (response.data?.data?.url) {
        return { success: true, url: response.data.data.url };
      }
      
      // If no URL but request was successful (downgrade or auto-upgrade with existing payment method)
      if (response.data?.status === 'success' || response.status === 200) {
        const isDowngrade = planType === 'Free' || 
          (planType === 'Pro' && planData.currentPlan === 'Elite');
        
        const message = response.data?.message || (
          isDowngrade 
            ? `Your plan will be changed to ${planType} at the end of your billing period.`
            : `Successfully upgraded to ${planType} plan.`
        );
        
        toast({
          title: isDowngrade ? "Downgrade Scheduled" : "Plan Updated!",
          description: message,
        });
        
        // Refresh plan data to reflect the change
        await refreshPlan();
        
        return { success: true, url: null, message };
      }
      
      throw new Error(response.data?.message || 'Failed to change plan');
    } catch (err: any) {
      console.error('Failed to change plan:', err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to initiate plan change";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setIsChangingPlan(false);
    }
  }, [toast, refreshPlan, planData.currentPlan]);

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

// Helper hook for upgrade/downgrade prompts
export const useUpgradePrompt = () => {
  const { changePlan, isChangingPlan, planData } = useUserPlan();
  
  const upgradeToElite = async (): Promise<boolean> => {
    const result = await changePlan('Elite');
    if (result.success && result.url) {
      window.location.href = result.url;
    }
    return result.success;
  };
  
  const upgradeToPro = async (): Promise<boolean> => {
    const result = await changePlan('Pro');
    if (result.success && result.url) {
      window.location.href = result.url;
    }
    return result.success;
  };
  
  const downgradeToFree = async (): Promise<boolean> => {
    const result = await changePlan('Free');
    // No redirect needed for downgrades, just return success
    return result.success;
  };
  
  const downgradeToPro = async (): Promise<boolean> => {
    const result = await changePlan('Pro');
    // For Elite -> Pro downgrade, no redirect needed
    return result.success;
  };
  
  const upgradeToNext = async (): Promise<boolean> => {
    if (planData.currentPlan === 'Free') {
      return await upgradeToPro();
    } else if (planData.currentPlan === 'Pro') {
      return await upgradeToElite();
    }
    return false;
  };
  
  // Determine if selecting a plan is an upgrade or downgrade
  const isUpgrade = (targetPlan: PlanType): boolean => {
    const planOrder = { 'Free': 0, 'Pro': 1, 'Elite': 2 };
    return planOrder[targetPlan] > planOrder[planData.currentPlan];
  };
  
  const isDowngrade = (targetPlan: PlanType): boolean => {
    const planOrder = { 'Free': 0, 'Pro': 1, 'Elite': 2 };
    return planOrder[targetPlan] < planOrder[planData.currentPlan];
  };
  
  return {
    upgradeToElite,
    upgradeToPro,
    downgradeToFree,
    downgradeToPro,
    upgradeToNext,
    isUpgrade,
    isDowngrade,
    isChangingPlan,
    currentPlan: planData.currentPlan,
  };
};

// Export default for convenience
export default useUserPlan;