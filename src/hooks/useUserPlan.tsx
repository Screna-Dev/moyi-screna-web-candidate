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
  trialExpiresAt: null,
  isTrialActive: false,
  effectivePlan: 'Free',
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

  // Map the new tier model → legacy PlanType.
  // starter → Pro, premium → Elite, no row / canceled → Free.
  const tierToLegacyPlan = (
    tier: string | null | undefined,
    status: string | null | undefined,
  ): PlanType => {
    if (!tier || status === 'canceled' || status === 'unpaid') return 'Free';
    const t = String(tier).toLowerCase();
    if (t === 'premium') return 'Elite';
    if (t === 'starter') return 'Pro';
    return 'Free';
  };

  // Fetch plan + credits via the new endpoints and map into legacy shape.
  // `plan-usage` was removed; this preserves the public hook interface so old
  // call sites keep working without changes.
  const refreshPlan = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setPlanData(defaultPlanData);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [subRes, credRes] = await Promise.allSettled([
        PaymentService.getSubscription(),
        PaymentService.getCredits(),
      ]);

      // Subscription (may be absent for non-members; backend returns either 404
      // or a 200/4xx with errorCode — treat all "not found" as Free).
      let tier: string | null = null;
      let status: string | null = null;
      let cancelAtPeriodEnd = false;
      let hasPendingDowngrade = false;
      let currentPeriodEnd: string | null = null;

      if (subRes.status === 'fulfilled') {
        const body = (subRes.value?.data ?? null) as { data?: Record<string, unknown> } | null;
        const data = body?.data;
        if (data && typeof data === 'object') {
          // Backend returns a combined "TIER_CYCLE" memberPlan field. Pull the
          // tier out of it (we don't track cycle here for legacy compatibility).
          const memberPlan = typeof data.memberPlan === 'string'
            ? data.memberPlan.toLowerCase()
            : '';
          if (memberPlan.includes('premium')) tier = 'premium';
          else if (memberPlan.includes('starter')) tier = 'starter';
          else tier = (data.tier as string) ?? (data.plan as string) ?? null;

          status = (data.status as string) ?? null;
          cancelAtPeriodEnd = Boolean(data.cancelAtPeriodEnd);
          hasPendingDowngrade =
            Boolean(data.downgradePendingPlan) ||
            Boolean(data.downgradePendingTier) ||
            Boolean(data.downgradePendingCycle) ||
            Boolean(data.downgradePendingBillingCycle);
          currentPeriodEnd = (data.currentPeriodEnd as string) ?? null;
        }
      }

      // Credits — best-effort; default to zero if missing.
      let recurring = 0;
      let permanent = 0;
      if (credRes.status === 'fulfilled') {
        const body = (credRes.value?.data ?? null) as { data?: Record<string, unknown> } | null;
        const data = body?.data;
        if (data && typeof data === 'object') {
          recurring = Number(data.recurringCreditBalance ?? 0);
          permanent = Number(data.permanentCreditBalance ?? 0);
        }
      }

      const legacyPlan = tierToLegacyPlan(tier, status?.toLowerCase());

      setPlanData({
        currentPlan: legacyPlan,
        subscriptionCancelPending: cancelAtPeriodEnd,
        planDowngradePending: hasPendingDowngrade,
        creditBalance: recurring + permanent,
        nextBillingDate: currentPeriodEnd,
        updatedAt: null,
        // Trials no longer exist in the new model.
        trialExpiresAt: null,
        isTrialActive: false,
        effectivePlan: legacyPlan,
        trialDaysRemaining: 0,
        recurringCreditBalance: recurring,
        permanentCreditBalance: permanent,
      });
      setHasFetched(true);
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

  // Change plan — bridges the legacy PlanType API onto the new subscription
  // endpoints. Mapping:
  //   Free  → cancelSubscription   (schedules cancel at period end)
  //   Pro   → starter tier         (create or changeTier)
  //   Elite → premium tier         (create or changeTier)
  const changePlan = useCallback(async (
    planType: PlanType,
  ): Promise<{ success: boolean; url?: string | null; message?: string }> => {
    setIsChangingPlan(true);
    try {
      // Downgrade to Free → cancel current subscription.
      if (planType === 'Free') {
        await PaymentService.cancelSubscription();
        toast({
          title: 'Downgrade Scheduled',
          description: 'Your subscription will be canceled at the end of the current billing period.',
        });
        await refreshPlan();
        return { success: true, url: null };
      }

      const targetTier = planType === 'Elite' ? 'premium' : 'starter';
      const currentlyMember = planData.currentPlan !== 'Free';

      if (currentlyMember) {
        // Active subscriber → change tier (prorated up, scheduled down).
        await PaymentService.changeTier(targetTier);
        const upgrading =
          (planType === 'Elite' && planData.currentPlan === 'Pro');
        toast({
          title: upgrading ? 'Plan Updated!' : 'Downgrade Scheduled',
          description: upgrading
            ? `Successfully upgraded to ${planType} plan.`
            : `Your plan will change to ${planType} at the end of your billing period.`,
        });
        await refreshPlan();
        return { success: true, url: null };
      }

      // No active subscription → create one (quarterly default).
      const res = await PaymentService.createSubscription(targetTier, 'quarterly');
      const url = res.data?.data?.url;
      if (url) {
        return { success: true, url };
      }
      await refreshPlan();
      return { success: true, url: null };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = e?.response?.data?.message || e?.message || 'Failed to initiate plan change';
      console.error('Failed to change plan:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
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
  const canAccessJobs = !effectiveIsLoading && isElite;
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