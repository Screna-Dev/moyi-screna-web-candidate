import { useEffect, useState } from "react";
import { CheckCircle, ArrowRight, Home, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/newDesign/ui/button";
import { MembershipOnboardingModal } from "@/components/newDesign/membership-onboarding-modal";
import { useSubscription, type Tier } from "@/hooks/useSubscription";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { subscription, isLoading, refresh } = useSubscription();

  // Stripe checkout has just completed — force a fresh subscription read so the
  // server-side webhook update is reflected here, then auto-open onboarding.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Once the subscription resolves, open onboarding for the active tier.
  // Stays closed until we have a real tier so the modal copy is correct.
  const [onboardingTier, setOnboardingTier] = useState<Tier | null>(null);
  useEffect(() => {
    if (!isLoading && subscription?.plan && onboardingTier === null) {
      setOnboardingTier(subscription.plan);
    }
  }, [isLoading, subscription?.plan, onboardingTier]);

  const handleOnboardingClose = () => {
    setOnboardingTier(null);
    // After dismissing onboarding, send the user to their billing dashboard.
    navigate("/billing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle className="w-14 h-14 text-primary" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Payment Successful!</h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your purchase. Your account has been upgraded successfully.
          </p>
          {isLoading && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Activating your membership…
            </p>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <Button asChild className="w-full" size="lg">
            <Link to="/interview-prep">
              Start Practicing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to="/settings?tab=billing">
              <Home className="w-4 h-4 mr-2" />
              Back to Plan Setting
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>

      <MembershipOnboardingModal
        open={onboardingTier !== null}
        tier={onboardingTier ?? "starter"}
        onClose={handleOnboardingClose}
      />
    </div>
  );
};

export default PaymentSuccess;
