import { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Gift, Check, CheckCircle2, Users, Info } from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/newDesign/ui/tooltip';
import { toast } from 'sonner';

export function ReferEarnPage() {
  const [referralCode] = useState('ALEX2024');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for environments where Clipboard API is blocked or not supported
      try {
        const textArea = document.createElement("textarea");
        textArea.value = referralCode;
        
        // Ensure it's not visible but part of the DOM to avoid layout shifts
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          toast.success('Referral code copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
          return;
        }
        throw new Error("execCommand failed");
      } catch (fallbackErr) {
        console.error('Failed to copy text: ', err);
        toast.error('Could not copy automatically. Please copy manually.');
      }
    }
  };

  const referrals = [
    { id: 1, name: 'Sarah Miller', date: 'Feb 18, 2024', credits: 10, status: 'Completed' },
    { id: 2, name: 'James Wilson', date: 'Feb 15, 2024', credits: 10, status: 'Completed' },
    { id: 3, name: 'Emily Chen', date: 'Feb 10, 2024', credits: 10, status: 'Completed' },
    { id: 4, name: 'Michael Brown', date: 'Feb 05, 2024', credits: 10, status: 'Completed' },
  ];

  const totalEarned = referrals.reduce((acc, curr) => acc + curr.credits, 0);

  return (
    <DashboardLayout headerTitle="Refer & Earn">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(200,80%,55%)] rounded-2xl p-8 text-white text-center shadow-lg relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Gift className="w-64 h-64 text-white transform rotate-12" />
            </div>
            <div className="relative z-10 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Gift className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Give 10, Get 10 Credits</h1>
                <p className="text-lg text-white/90 mb-8 leading-relaxed">
                    Invite your friends to join Screna AI. They'll get 10 free credits to start practicing, and you'll earn 10 credits for every successful referral.
                </p>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 pl-4 flex items-center gap-2 max-w-md mx-auto border border-white/20">
                    <div className="flex-1 text-left font-mono text-lg tracking-wider font-semibold">
                        {referralCode}
                    </div>
                    <Button 
                        onClick={handleCopy}
                        className="bg-white text-[hsl(221,91%,60%)] hover:bg-white/90 transition-colors shadow-none font-semibold min-w-[100px]"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-sm text-white/60 mt-4">
                    Share this code with your friends to unlock rewards.
                </p>
            </div>
        </motion.div>

        {/* Stats & History Grid */}
                <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-sm overflow-hidden flex flex-col lg:flex-row"
        >
            {/* Stats Sidebar */}
            <div className="w-full lg:w-80 p-6 border-b lg:border-b-0 lg:border-r border-[hsl(220,16%,90%)] bg-[hsl(220,18%,98%)]/30">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(165,82%,51%)]/10 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-[hsl(165,82%,45%)]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-sm font-medium text-[hsl(222,12%,50%)]">Total Earned</p>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3.5 h-3.5 text-[hsl(222,12%,60%)] cursor-help hover:text-[hsl(222,12%,40%)] transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Credits are added once your friend completes signup.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <h3 className="text-2xl font-bold text-[hsl(222,22%,15%)]">{totalEarned} Credits</h3>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm pb-4 border-b border-[hsl(220,16%,90%)]">
                        <span className="text-[hsl(222,12%,50%)]">Successful Referrals</span>
                        <span className="font-semibold text-[hsl(222,22%,15%)]">{referrals.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pb-4 border-b border-[hsl(220,16%,90%)]">
                        <span className="text-[hsl(222,12%,50%)]">Pending Invites</span>
                        <span className="font-semibold text-[hsl(222,22%,15%)]">2</span>
                    </div>
                </div>
            </div>

            {/* Referral History List */}
            <div className="flex-1 flex flex-col">
                <div className="px-6 py-5 border-b border-[hsl(220,16%,90%)] flex items-center justify-between bg-white">
                    <h3 className="font-semibold text-[hsl(222,22%,15%)]">Referral History</h3>
                    <div className="flex items-center gap-2 text-sm text-[hsl(222,12%,50%)]">
                        <Users className="w-4 h-4" />
                        <span>{referrals.length} Friends Joined</span>
                    </div>
                </div>
                
                <div className="divide-y divide-[hsl(220,16%,90%)] bg-white">
                    {referrals.map((referral) => (
                        <div key={referral.id} className="px-6 py-4 flex items-center justify-between hover:bg-[hsl(220,18%,98%)] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] flex items-center justify-center font-bold text-sm">
                                    {referral.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-medium text-[hsl(222,22%,15%)]">{referral.name}</p>
                                    <p className="text-xs text-[hsl(222,12%,50%)]">{referral.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 text-[hsl(165,82%,40%)] font-semibold text-sm mb-1 justify-end">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    +{referral.credits} Credits
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(220,18%,96%)] text-[hsl(222,12%,50%)] font-medium">
                                    {referral.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    
                    {referrals.length === 0 && (
                        <div className="px-6 py-12 text-center text-[hsl(222,12%,50%)]">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No referrals yet. Share your code to start earning!</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}