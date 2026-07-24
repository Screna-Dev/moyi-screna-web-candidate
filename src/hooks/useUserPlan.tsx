import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { PaymentService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

// Plan types — mirrors the backend tier enum (BASIC | ADVANCED | FLAGSHIP)
// plus Free for users without an active subscription.
export type PlanType = 'Free' | 'Basic' | 'Advanced' | 'Flagship';

// Rank used to decide upgrade vs. downgrade.
export const PLAN_ORDER: Record<PlanType, number> = {
  Free: 0,
  Basic: 1,
  Advanced: 2,
  Flagship: 3,
};

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
  
  // Plan check helpers — Free/Basic are low tier, Advanced/Flagship are premium.
  isPremium: boolean;      // Advanced or Flagship
  isFree: boolean;         // Free only

  // Feature access helpers
  canAccessJobs: boolean;           // Open to all members — browsing/matched jobs (job delegation stays Premium-gated server-side)
  canAccessPremiumReport: boolean;  // Advanced/Flagship only - video replay, detailed feedback
  canPushProfile: boolean;          // Advanced/Flagship only
  canAccessMentorship: boolean;     // Open to all members — browse + book mentors
  
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
  const posthog = usePostHog();

  // credits 埋点用：记录上一次余额（用于判断「跌到 0」）
  const prevBalanceRef = useRef<number | null>(null);

  const [planData, setPlanData] = useState<PlanUsageData>(defaultPlanData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isBuyingCredits, setIsBuyingCredits] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Map a raw backend tier string → PlanType. No row / canceled → Free.
  const tierToPlan = (
    tier: string | null | undefined,
    status: string | null | undefined,
  ): PlanType => {
    if (!tier || status === 'canceled' || status === 'unpaid') return 'Free';
    const t = String(tier).toLowerCase();
    if (t === 'flagship') return 'Flagship';
    if (t === 'advanced') return 'Advanced';
    if (t === 'basic') return 'Basic';
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
        // Response may be the wrapped { status, message, data } envelope or the
        // subscription object directly — accept both (same as useSubscription).
        const data = (body?.data ?? body) as Record<string, unknown> | null;
        if (data && typeof data === 'object') {
          // Backend returns a combined "TIER_CYCLE" memberPlan field (e.g.
          // "ADVANCED_MONTHLY"), but tolerate the tier arriving under `tier`
          // or `plan`, plain or combined — match by substring across all.
          const tierSource = [data.memberPlan, data.tier, data.plan]
            .filter((v): v is string => typeof v === 'string')
            .join(' ')
            .toLowerCase();
          if (tierSource.includes('flagship')) tier = 'flagship';
          else if (tierSource.includes('advanced')) tier = 'advanced';
          else if (tierSource.includes('basic')) tier = 'basic';
          else tier = null;

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

      const plan = tierToPlan(tier, status?.toLowerCase());

      setPlanData({
        currentPlan: plan,
        subscriptionCancelPending: cancelAtPeriodEnd,
        planDowngradePending: hasPendingDowngrade,
        creditBalance: recurring + permanent,
        nextBillingDate: currentPeriodEnd,
        updatedAt: null,
        // Trials no longer exist in the new model.
        trialExpiresAt: null,
        isTrialActive: false,
        effectivePlan: plan,
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

  // credits_depleted —— 监听余额变化
  // 仅在「从 >0 跌到 0」时上报（避免对从未有 credits 的 Free 用户误报）
  useEffect(() => {
    if (!isAuthenticated || isLoading || !hasFetched) return;
    const balance = planData.creditBalance;
    const prev = prevBalanceRef.current;

    if (prev !== null && prev > 0 && balance === 0) {
      safeCapture(posthog, EVENTS.CREDITS_DEPLETED, {
        current_plan: planData.currentPlan,
      });
    }

    prevBalanceRef.current = balance;
  }, [planData.creditBalance, planData.currentPlan, isAuthenticated, isLoading, hasFetched, posthog]);

  // Change plan:
  //   Free                      → cancelSubscription (cancel at period end)
  //   Basic/Advanced/Flagship   → changeTier for active subscribers
  //                               (prorated up, scheduled down), otherwise
  //                               createSubscription (Stripe Checkout).
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

      const targetTier = planType.toLowerCase();
      const currentlyMember = planData.currentPlan !== 'Free';

      if (currentlyMember) {
        // Active subscriber → change tier (prorated up, scheduled down).
        await PaymentService.changeTier(targetTier);
        const upgrading = PLAN_ORDER[planType] > PLAN_ORDER[planData.currentPlan];
        toast({
          title: upgrading ? 'Plan Updated!' : 'Downgrade Scheduled',
          description: upgrading
            ? `Successfully upgraded to ${planType} plan.`
            : `Your plan will change to ${planType} at the end of your billing period.`,
        });
        await refreshPlan();
        return { success: true, url: null };
      }

      // No active subscription → create one (billing is MONTHLY-only for now).
      const res = await PaymentService.createSubscription(targetTier, 'monthly');
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
  
  // Premium means Advanced or Flagship. Basic is a paid plan but stays
  // low-tier for feature gating — e.g. it only gets limited InterviewPrep
  // Notes access, same as Free.
  const isPremium = currentPlan === 'Advanced' || currentPlan === 'Flagship';
  const isFree = currentPlan === 'Free';

  // Feature access - return false while loading to prevent flash of wrong content.
  // Jobs and Mentorship are open to all members (including Free): everyone can
  // browse matched jobs / mentors and book sessions. Only job *delegation* stays
  // Premium-gated, which the backend enforces (handled at the delegate call site).
  const canAccessJobs = !effectiveIsLoading;
  const canAccessPremiumReport = !effectiveIsLoading && isPremium;
  const canPushProfile = !effectiveIsLoading && isPremium;
  const canAccessMentorship = !effectiveIsLoading;

  const value: UserPlanContextValue = {
    // Plan data
    planData,
    isLoading: effectiveIsLoading,
    error,
    
    // Plan check helpers
    isPremium,
    isFree,
    
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

  // Change to a paid plan, following the Stripe Checkout redirect when one
  // is returned (new subscribers).
  const upgradeTo = async (plan: PlanType): Promise<boolean> => {
    const result = await changePlan(plan);
    if (result.success && result.url) {
      window.location.href = result.url;
    }
    return result.success;
  };

  const upgradeToBasic = () => upgradeTo('Basic');
  const upgradeToAdvanced = () => upgradeTo('Advanced');
  const upgradeToFlagship = () => upgradeTo('Flagship');

  const downgradeToFree = async (): Promise<boolean> => {
    const result = await changePlan('Free');
    // No redirect needed for downgrades, just return success
    return result.success;
  };

  const upgradeToNext = async (): Promise<boolean> => {
    if (planData.currentPlan === 'Free') return upgradeToBasic();
    if (planData.currentPlan === 'Basic') return upgradeToAdvanced();
    if (planData.currentPlan === 'Advanced') return upgradeToFlagship();
    return false;
  };

  // Determine if selecting a plan is an upgrade or downgrade
  const isUpgrade = (targetPlan: PlanType): boolean =>
    PLAN_ORDER[targetPlan] > PLAN_ORDER[planData.currentPlan];

  const isDowngrade = (targetPlan: PlanType): boolean =>
    PLAN_ORDER[targetPlan] < PLAN_ORDER[planData.currentPlan];

  return {
    upgradeTo,
    upgradeToBasic,
    upgradeToAdvanced,
    upgradeToFlagship,
    downgradeToFree,
    upgradeToNext,
    isUpgrade,
    isDowngrade,
    isChangingPlan,
    currentPlan: planData.currentPlan,
  };
};

// Export default for convenience
export default useUserPlan;