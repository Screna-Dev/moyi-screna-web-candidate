import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { safeCapture } from "@/utils/posthog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap, TrendingUp, Calendar, CreditCard, Check, Sparkles, ArrowRight, Plus, Minus, Loader2, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUserPlan, useUpgradePrompt } from "@/hooks/useUserPlan";
import { PaymentService } from "@/services";

const PlanUsageSettings = () => {
  const [selectedCredits, setSelectedCredits] = useState(500);
  const [buyCreditsDialogOpen, setBuyCreditsDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [customCreditsInput, setCustomCreditsInput] = useState("100");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const posthog = usePostHog();
  
  // Use the user plan context
  const { 
    planData, 
    isLoading, 
    buyCredits: buyCreditsAction,
    isBuyingCredits,
    refreshPlan
  } = useUserPlan();
  const { upgradeToElite, upgradeToPro, upgradeToNext, isChangingPlan } = useUpgradePrompt();
  
  // Derived values from context
  const currentPlan = planData.currentPlan;
  const creditBalance = planData.creditBalance;
  const nextBillingDate = planData.nextBillingDate 
    ? new Date(planData.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : "Feb 1, 2024";
  
  // Total credits based on plan
  const getTotalCredits = (plan) => {
    switch (plan) {
      case "Elite": return 500;
      case "Pro": return 200;
      case "Free": return 30;
      default: return 200;
    }
  };
  
  const totalCredits = getTotalCredits(currentPlan);

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      credits: "30",
      description: "Get started with basic features",
      features: [
        "30 Credits (≈30 mins) monthly",
        "$0.15 per extra credit",
        "1 Interview Preparation",
        "30% Mentorship Service Charge",
        "7 days data retention",
      ],
      current: currentPlan === "Free",
    },
    {
      name: "Pro",
      price: "$19.9",
      period: "/month",
      credits: "200",
      description: "Perfect for active job seekers",
      features: [
        "200 Credits (≈200 mins) monthly",
        "$0.10 per extra credit",
        "3 Interview Preparations",
        "15% Mentorship Service Charge",
        "90 days data retention",
        "Full report with feedback",
        "Job Smart matching",
      ],
      current: currentPlan === "Pro",
      popular: true,
    },
    {
      name: "Elite",
      price: "$39.9",
      period: "/month",
      credits: "500",
      description: "Maximum power for professionals",
      features: [
        "500 Credits (≈500 mins) monthly",
        "$0.07 per extra credit",
        "5 Interview Preparations",
        "5% Mentorship Service Charge",
        "Unlimited data retention",
        "Full report with feedback",
        "Video replay with timestamps",
        "Job Smart matching",
      ],
      current: currentPlan === "Elite",
    },
  ];

  const creditPackages = [
    { credits: 100, price: 10, savings: null },
    { credits: 300, price: 25, savings: "Save 17%" },
    { credits: 800, price: 60, savings: "Save 25%" },
  ];

  const calculatePrice = (credits) => {
    const pricePerCredit = currentPlan === "Elite" ? 0.07 : currentPlan === "Pro" ? 0.1 : 0.15;
    return (credits * pricePerCredit).toFixed(2);
  };

  // Handle plan change using context
  const handleChangePlan = async (planName) => {
    // Track payment started event
    safeCapture(posthog, 'payment_started', {
      plan_name: planName,
      current_plan: currentPlan,
      action: 'upgrade',
    });
    
    if (planName === "Elite") {
      await upgradeToElite();
    } else if (planName === "Pro") {
      await upgradeToPro();
    }
  };

  // Handle buy credits using context
  const handleBuyCredits = async (credits) => {
    // Track payment started event for credit purchase
    safeCapture(posthog, 'payment_started', {
      action: 'buy_credits',
      credits: credits,
      current_plan: currentPlan,
      price: calculatePrice(credits),
    });
    
    const url = await buyCreditsAction(credits);
    if (url) {
      window.location.href = url;
    }
    setBuyCreditsDialogOpen(false);
  };

  const handleCustomCreditsChange = (value) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0 && numValue <= 10000) {
      setCustomCreditsInput(value);
    }
  };

  const handlePurchaseCustomCredits = () => {
    const credits = parseInt(customCreditsInput) || 0;
    if (credits < 10) {
      toast({
        title: "Minimum Credits Required",
        description: "Please enter at least 10 credits.",
        variant: "destructive",
      });
      return;
    }
    handleBuyCredits(credits);
  };

  // Handle redeem code submission
  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a promotion code.",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    
    // Track redeem attempt
    safeCapture(posthog, 'redeem_code_attempted', {
      current_plan: currentPlan,
    });

    try {
      const response = await PaymentService.redeemCode(promoCode.trim());
      
      if (response.data?.status === 'success' || response.status === 200) {
        toast({
          title: "Code Redeemed!",
          description: response.data?.message || `You've successfully redeemed ${promoCode}. Credits have been added to your account.`,
        });
        
        // Track successful redemption
        safeCapture(posthog, 'redeem_code_success', {
          current_plan: currentPlan,
        });
        
        // Refresh plan data to show updated credit balance
        await refreshPlan();
        
        setRedeemDialogOpen(false);
        setPromoCode("");
      } else {
        throw new Error(response.data?.message || 'Failed to redeem code');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to redeem code. Please try again.";
      
      toast({
        title: "Redemption Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Track failed redemption
      safeCapture(posthog, 'redeem_code_failed', {
        current_plan: currentPlan,
        error: errorMessage,
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">{currentPlan}</h3>
                    <Badge variant="default">Active</Badge>
                    {planData.subscriptionCancelPending && (
                      <Badge variant="destructive">Cancelling</Badge>
                    )}
                    {planData.planDowngradePending && (
                      <Badge variant="secondary">Downgrading</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Next Billing</p>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    {nextBillingDate}
                  </h3>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Credit Balance</p>
                  <h3 className="text-2xl font-bold text-primary">{creditBalance} credits</h3>
                  <Progress value={(creditBalance / totalCredits) * 100} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground">
                    {creditBalance} of {totalCredits} remaining
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">This Month Usage</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-semibold">8</span> AI Mocks completed
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">{totalCredits - creditBalance}</span> credits used
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button 
                  className="gap-2" 
                  onClick={() => handleChangePlan(currentPlan === "Free" ? "Pro" : "Elite")}
                  disabled={isChangingPlan || currentPlan === "Elite"}
                >
                  {isChangingPlan ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  Upgrade Plan
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setBuyCreditsDialogOpen(true)}>
                  <Zap className="h-4 w-4" />
                  Buy Extra Credits
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setRedeemDialogOpen(true)}>
                  <Gift className="h-4 w-4" />
                  Redeem Credit
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Redeem Credit Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Redeem Credit
            </DialogTitle>
            <DialogDescription>
              Enter your promotion code to receive extra credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promoCode">Promotion Code</Label>
              <Input
                id="promoCode"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter your code"
                className="text-lg uppercase"
                disabled={isRedeeming}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setRedeemDialogOpen(false);
                setPromoCode("");
              }}
              disabled={isRedeeming}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRedeemCode} 
              className="gap-2"
              disabled={!promoCode.trim() || isRedeeming}
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  Redeem
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Credits Dialog */}
      <Dialog open={buyCreditsDialogOpen} onOpenChange={setBuyCreditsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Buy Extra Credits
            </DialogTitle>
            <DialogDescription>
              Enter the number of credits you want to purchase. Price: $
              {currentPlan === "Elite" ? "0.07" : currentPlan === "Pro" ? "0.10" : "0.15"}/credit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="credits">Number of Credits</Label>
              <Input
                id="credits"
                type="number"
                min="10"
                max="10000"
                value={customCreditsInput}
                onChange={(e) => handleCustomCreditsChange(e.target.value)}
                placeholder="Enter credits amount"
                className="text-lg"
                disabled={isBuyingCredits}
              />
              <p className="text-xs text-muted-foreground">Minimum: 10 credits, Maximum: 10,000 credits</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Total Price</p>
                <p className="text-2xl font-bold text-primary">${calculatePrice(parseInt(customCreditsInput) || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{parseInt(customCreditsInput) || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[100, 300, 500].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomCreditsInput(amount.toString())}
                  className={customCreditsInput === amount.toString() ? "border-primary" : ""}
                  disabled={isBuyingCredits}
                >
                  {amount}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyCreditsDialogOpen(false)} disabled={isBuyingCredits}>
              Cancel
            </Button>
            <Button onClick={handlePurchaseCustomCredits} className="gap-2" disabled={isBuyingCredits}>
              {isBuyingCredits ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Checkout with Stripe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plans & Credits Tabs */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="bg-background border shadow-sm">
          <TabsTrigger value="plans">Plan Comparison</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`border-0 shadow-sm relative ${plan.popular ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-primary font-medium">{plan.credits} credits/month</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-2"
                    variant={plan.current ? "outline" : "default"}
                    disabled={plan.current || isChangingPlan}
                    onClick={() => handleChangePlan(plan.name)}
                  >
                    {isChangingPlan ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : plan.current ? (
                      "Current Plan"
                    ) : (
                      <>
                        Select Plan
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="credits" className="space-y-6">
          {/* Credit Balance Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-primary">{creditBalance}</p>
                  <p className="text-sm text-muted-foreground">credits remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Monthly allocation</p>
                  <p className="font-semibold">{totalCredits} credits</p>
                </div>
              </div>
              <Progress value={(creditBalance / totalCredits) * 100} className="h-3" />
            </CardContent>
          </Card>

          {/* Credit Packages */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Buy Credit Packages</CardTitle>
              <CardDescription>Choose a pre-set package or customize your purchase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {creditPackages.map((pkg) => (
                  <div
                    key={pkg.credits}
                    className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => !isBuyingCredits && handleBuyCredits(pkg.credits)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold">{pkg.credits}</span>
                      {pkg.savings && (
                        <Badge variant="secondary" className="text-green-600">
                          {pkg.savings}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">credits</p>
                    <p className="text-xl font-semibold mt-2">${pkg.price}</p>
                    <Button className="w-full mt-3" size="sm" disabled={isBuyingCredits}>
                      {isBuyingCredits ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy Now"}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Custom Slider */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium">Custom Amount</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedCredits(Math.max(100, selectedCredits - 100))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-2xl font-bold w-20 text-center">{selectedCredits}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedCredits(Math.min(2000, selectedCredits + 100))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Slider
                  value={[selectedCredits]}
                  onValueChange={(value) => setSelectedCredits(value[0])}
                  min={100}
                  max={2000}
                  step={100}
                  className="mb-4"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">100 credits</span>
                  <span className="text-sm text-muted-foreground">2000 credits</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Price</p>
                    <p className="text-2xl font-bold">${calculatePrice(selectedCredits)}</p>
                  </div>
                  <Button
                    onClick={() => handleBuyCredits(selectedCredits)}
                    disabled={isBuyingCredits}
                  >
                    {isBuyingCredits ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Buy with Stripe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlanUsageSettings;