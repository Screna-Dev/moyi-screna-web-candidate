import { Clock, ExternalLink, Mail, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import type { Tier } from '@/hooks/useSubscription';

interface MembershipOnboardingModalProps {
  open: boolean;
  tier: Tier;
  onClose: () => void;
}

const DISCORD_INVITE = 'https://discord.gg/e2bresA4e8';
const OPS_EMAIL = 'operations@screna.ai';
const TIMEZONE_CONVERTER = 'https://www.timeanddate.com/worldclock/converter.html';

const COPY: Record<Tier, {
  headline: string;
  subhead: string;
  intro: string;
  steps: string[];
  hoursNote: string;
}> = {
  starter: {
    headline: 'Welcome to Screna Starter!',
    subhead: 'Your membership is active — all features are unlocked.',
    intro:
      'To get the most out of your membership, join our member community on Discord. This is where we share job postings, host events, and keep you in the loop on everything Screna.',
    steps: [
      'Click the button below to join the Screna Members Discord',
      'Head to #Membership-Introductions and introduce yourself with your Screna username and email',
      'Our team will reach out to help you get oriented',
    ],
    hoursNote: 'Our team is available Mon–Fri, 9:00 AM – 5:00 PM EST.',
  },
  premium: {
    headline: 'Welcome to Screna Premium!',
    subhead: 'Your membership is active — all features are unlocked.',
    intro:
      "Your dedicated onboarding happens on Discord. Once you're in, your client manager will set up a private channel for you and walk you through everything — including confirming your job search preferences so we can start applying on your behalf.",
    steps: [
      'Click the button below to join the Screna Discord',
      'Head to #Membership-Introductions and post your Screna username and email',
      'Your client manager will add you and create your private channel within business hours',
    ],
    hoursNote:
      "Our team is available Mon–Fri, 9:00 AM – 5:00 PM EST. If you join outside these hours, we'll reach out on the next business day.",
  },
};

export function MembershipOnboardingModal({
  open,
  tier,
  onClose,
}: MembershipOnboardingModalProps) {
  const copy = COPY[tier];

  const handleJoinDiscord = () => {
    window.open(DISCORD_INVITE, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{copy.headline}</DialogTitle>
          <DialogDescription className="text-foreground font-medium">
            {copy.subhead}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{copy.intro}</p>

          <div>
            <p className="font-medium text-foreground mb-2">
              Here&rsquo;s what to do next:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              {copy.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Clock className="size-4 mt-0.5 shrink-0 text-foreground/70" />
              <p className="text-foreground/80">
                {copy.hoursNote}{' '}
                <a
                  href={TIMEZONE_CONVERTER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-0.5"
                >
                  Convert to your timezone
                  <ExternalLink className="size-3" />
                </a>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="size-4 mt-0.5 shrink-0 text-foreground/70" />
              <p className="text-foreground/80">
                Questions? Email us at{' '}
                <a
                  href={`mailto:${OPS_EMAIL}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {OPS_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            I&rsquo;ll do this later
          </Button>
          <Button type="button" onClick={handleJoinDiscord}>
            <MessageSquare className="size-4" />
            Join Screna Discord
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MembershipOnboardingModal;
