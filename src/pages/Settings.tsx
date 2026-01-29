import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Receipt } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProfileSettings from "@/components/settings/ProfileSettings";
import PlanUsageSettings from "@/components/settings/PlanUsageSettings";
import PaymentBillingSettings from "@/components/settings/PaymentBillingSettings";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";
  const posthog = usePostHog();
  if (currentTab === "plan-usage" && posthog) {
    posthog.capture('plan_viewed');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings & Payment</h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and billing preferences</p>
        </div>

        <Tabs value={currentTab} onValueChange={(value: string) => setSearchParams({ tab: value })} className="space-y-6">
          <TabsList className="bg-background border shadow-sm p-1 h-auto flex-wrap">
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="plan-usage" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-4 w-4" />
              Plan & Usage
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Receipt className="h-4 w-4" />
              Payment & Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="plan-usage">
            <PlanUsageSettings />
          </TabsContent>

          <TabsContent value="billing">
            <PaymentBillingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;