import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  Download,
  Zap,
  Plus,
  Gift,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/newDesign/dashboard-layout';
import { Button } from '../../components/newDesign/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/newDesign/ui/dialog';
import { Input } from '../../components/newDesign/ui/input';
import { useUserPlan } from '@/hooks/useUserPlan';

// Mock invoices — replace with real API data when available
const INVOICES = [
  { id: 'inv_1', date: 'Feb 18, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'inv_2', date: 'Jan 18, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'inv_3', date: 'Dec 18, 2025', amount: '$29.00', status: 'Paid' },
];

const CREDIT_PACKAGES = [
  { credits: 100, price: 10, label: '100 credits', savings: null },
  { credits: 300, price: 25, label: '300 credits', savings: 'Save 17%' },
  { credits: 800, price: 60, label: '800 credits', savings: 'Save 25%' },
];

export function BillingPage() {
  const { planData, isLoading: isPlanLoading, buyCredits, isBuyingCredits } = useUserPlan();

  // Buy credits dialog
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState(300);
  const [customInput, setCustomInput] = useState('');
  const isCustom = !CREDIT_PACKAGES.some((p) => p.credits === selectedCredits);
  const effectiveCredits = isCustom
    ? parseInt(customInput) || 0
    : selectedCredits;

  const pricePerCredit = 0.1;
  const estimatedPrice = (effectiveCredits * pricePerCredit).toFixed(2);

  const handleBuyCredits = async () => {
    if (effectiveCredits <= 0) return;
    const url = await buyCredits(effectiveCredits);
    if (url) window.location.href = url;
    setBuyDialogOpen(false);
  };

  // Redeem dialog
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');

  const permanentBalance = planData?.permanentCreditBalance ?? 0;
  const recurringBalance = planData?.recurringCreditBalance ?? 0;

  return (
    <DashboardLayout headerTitle="Billing">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
            <p className="text-slate-500">Manage your credits and billing details.</p>
          </div>
        </div>

        {/* Credits + Usage */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {/* Usage panel */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">This month's usage</h3>
            <div className="space-y-6">
              {[
                { label: 'AI Interviews', used: 12, total: 30, color: 'bg-blue-600' },
                { label: 'Resume Reviews', used: 3, total: 10, color: 'bg-purple-600' },
                { label: 'Job Matches', used: 45, total: 200, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500">{item.used} / {item.total}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${(item.used / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              Usage limits reset on Mar 18, 2026.
            </div>
          </div>

          {/* Credit balance card */}
          <div className="md:order-first bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-300">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Credit Balance</span>
              </div>
              {isPlanLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 my-2" />
              ) : (
                <>
                  <div className="text-4xl font-bold mb-1">{permanentBalance}</div>
                  <p className="text-sm text-slate-400">Permanent credits</p>
                  {recurringBalance > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      + {recurringBalance} recurring credits
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-3 mt-8">
              <Button
                className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none"
                onClick={() => setBuyDialogOpen(true)}
                disabled={isBuyingCredits}
              >
                {isBuyingCredits ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Buy extra credits
              </Button>

              <Button
                variant="outline"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                onClick={() => setRedeemDialogOpen(true)}
              >
                <Gift className="w-4 h-4 mr-2" />
                Redeem code
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Payment & Invoices */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Payment Method</h3>

          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                <CreditCard className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Visa ending in 4242</p>
                <p className="text-xs text-slate-500">Expires 12/28</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Edit
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Invoices</h3>
              <p className="text-sm text-slate-500">Sent to your account email</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {INVOICES.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900">{invoice.date}</td>
                      <td className="px-4 py-3 text-slate-900">{invoice.amount}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Buy Credits Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Buy Extra Credits
            </DialogTitle>
            <DialogDescription>
              Choose a credit package or enter a custom amount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preset packages */}
            <div className="grid grid-cols-3 gap-3">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.credits}
                  onClick={() => { setSelectedCredits(pkg.credits); setCustomInput(''); }}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                    selectedCredits === pkg.credits && !isCustom
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg font-bold text-slate-900">{pkg.credits}</span>
                  <span className="text-xs text-slate-500">credits</span>
                  <span className="text-sm font-semibold text-blue-600 mt-1">${pkg.price}</span>
                  {pkg.savings && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                      {pkg.savings}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1.5">Or enter custom amount</p>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setSelectedCredits(-1); // deselect preset
                }}
                className="h-9"
              />
            </div>

            {/* Price estimate */}
            {effectiveCredits > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Estimated total</span>
                <span className="text-lg font-bold text-slate-900">${estimatedPrice}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleBuyCredits}
              disabled={isBuyingCredits || effectiveCredits <= 0}
            >
              {isBuyingCredits ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                'Proceed to checkout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Code Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Code</DialogTitle>
            <DialogDescription>
              Enter your promotional or credit code to add credits to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter promo code (e.g. SAVE20)"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => { setRedeemCode(''); setRedeemDialogOpen(false); }}
              disabled={!redeemCode.trim()}
            >
              Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
