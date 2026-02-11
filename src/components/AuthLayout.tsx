import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useUserPlan } from '@/hooks/useUserPlan';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

function TrialBanner() {
  const { planData, isLoading } = useUserPlan();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !planData.isTrialActive || dismissed) {
    return null;
  }

  const daysRemaining = planData.trialDaysRemaining;

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 flex-1">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          You are on an <strong>Elite Trial</strong> — <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</strong>.
          If you don't upgrade to Elite, all video session recordings will be lost.
        </span>
        <button
          onClick={() => navigate('/settings?tab=plan-usage')}
          className="ml-2 underline font-semibold hover:text-white/90 whitespace-nowrap"
        >
          Upgrade Now
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 hover:text-white/80 shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AuthLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <TrialBanner />
          <header className="h-14 border-b border-border flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
          </header>
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}