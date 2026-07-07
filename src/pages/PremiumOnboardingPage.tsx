import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PremiumOnboardingWizard } from '@/components/newDesign/premium-onboarding-wizard';
import { MembershipOnboardingModal } from '@/components/newDesign/membership-onboarding-modal';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

// Post-payment Premium onboarding (resume → preferences → consent). This is
// the Stripe success-redirect landing for Premium subscriptions: Pricing →
// Stripe Checkout → /payment-success (forwards here for premium) → wizard →
// Discord welcome → /billing.
export default function PremiumOnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { subscription, isLoading: isSubLoading, refresh } = useSubscription();
  const [showDiscordWelcome, setShowDiscordWelcome] = useState(false);

  // Force a fresh subscription read in case Stripe just redirected here while
  // the webhook is still propagating.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Guard: require authenticated user with an active premium-tier subscription
  // (Advanced or Flagship). Free/Basic users should not see this page.
  const isPremiumTier =
    subscription?.plan === 'advanced' || subscription?.plan === 'flagship';
  useEffect(() => {
    if (isAuthLoading || isSubLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isPremiumTier) {
      navigate('/#pricing');
    }
  }, [user, isPremiumTier, isAuthLoading, isSubLoading, navigate]);

  const isLoading = isAuthLoading || isSubLoading;

  const handleComplete = () => {
    setShowDiscordWelcome(true);
  };

  const handleSkip = () => {
    navigate('/settings?tab=billing');
  };

  const handleDiscordClose = () => {
    setShowDiscordWelcome(false);
    navigate('/settings?tab=billing');
  };

  if (isLoading || !isPremiumTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your membership…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PremiumOnboardingWizard
        open={!showDiscordWelcome}
        onCancel={handleSkip}
        onComplete={handleComplete}
      />
      <MembershipOnboardingModal
        open={showDiscordWelcome}
        tier={subscription.plan}
        onClose={handleDiscordClose}
      />
    </div>
  );
}
