import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  Download,
  Zap,
  Plus,
  Gift,
  AlertCircle,
  Loader2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
import { PaymentService } from '@/services';

interface Invoice {
  stripeInvoiceId: string;
  amount: number; // in cents
  currency: string;
  description: string;
  reason: string;
  invoiceNumber: string;
  invoiceUrl: string;
  createdAt: string;
}

interface PageMeta {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const FIXED_PACKAGES = [
  {
    credits: 50,
    price: 9.99,
    name: 'Starter',
    pricePerCredit: '~$0.20/credit',
    description: 'Perfect for a few focused practice sessions.',
    popular: false,
  },
  {
    credits: 100,
    price: 14.99,
    name: 'Growth',
    pricePerCredit: '~$0.15/credit',
    description: 'Best value — enough for weekly practice across all modes.',
    popular: true,
  },
];

export function BillingPage() {
  const { planData, isLoading: isPlanLoading, buyCredits, isBuyingCredits } = useUserPlan();

  // Buy credits dialog
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [customCredits, setCustomCredits] = useState(200);
  const customPricePerCredit = 0.12;
  const customPrice = (customCredits * customPricePerCredit).toFixed(2);

  const handleBuyCredits = async (credits: number) => {
    const url = await buyCredits(credits);
    if (url) window.location.href = url;
    setBuyDialogOpen(false);
  };

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setIsLoadingInvoices(true);
        const response = await PaymentService.getInvoices(currentPage);
        if (response.data?.data) {
          setInvoices(response.data.data.content || []);
          setPageMeta(response.data.data.pageMeta || null);
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setIsLoadingInvoices(false);
      }
    };
    fetchInvoices();
  }, [currentPage]);

  const formatAmount = (amountInCents: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.invoiceUrl) {
      window.open(invoice.invoiceUrl, '_blank');
    }
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
          {/* <h3 className="text-lg font-semibold text-slate-900 mb-6">Payment Method</h3>

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
          </div> */}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Invoices</h3>
              <p className="text-sm text-slate-500">Sent to your account email</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CreditCard className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No invoices found</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.stripeInvoiceId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{invoice.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(invoice.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-500">{invoice.description || invoice.reason || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Paid
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pageMeta && pageMeta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page {pageMeta.pageNumber + 1} of {pageMeta.totalPages} ({pageMeta.totalElements} invoices)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={pageMeta.first}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={pageMeta.last}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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
              Credits never expire and stack with your plan balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Starter + Growth */}
            {FIXED_PACKAGES.map((pkg) => (
              <div
                key={pkg.credits}
                className={`relative rounded-2xl border p-5 ${
                  pkg.popular ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-white'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute top-4 right-4 bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <div className="flex items-start justify-between mb-1">
                  <span className="font-bold text-slate-900 text-base">{pkg.name}</span>
                  {!pkg.popular && (
                    <span className="text-xs text-slate-400">{pkg.pricePerCredit}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-slate-900">${pkg.price}</span>
                  <span className="text-sm text-slate-400">/ {pkg.credits} credits</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{pkg.description}</p>
                <button
                  onClick={() => handleBuyCredits(pkg.credits)}
                  disabled={isBuyingCredits}
                  className={`w-full h-12 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    pkg.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isBuyingCredits ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : pkg.popular ? (
                    <>Buy {pkg.name} <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    `Buy ${pkg.name}`
                  )}
                </button>
              </div>
            ))}

            {/* Customize card with slider */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between mb-1">
                <span className="font-bold text-slate-900 text-base">Customize</span>
                <span className="text-xs text-slate-400">${customPricePerCredit}/credit</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-slate-900">${customPrice}</span>
                <span className="text-sm text-slate-400">/ {customCredits} credits</span>
              </div>
              <input
                type="range"
                min={101}
                max={1000}
                step={1}
                value={customCredits}
                onChange={(e) => setCustomCredits(Number(e.target.value))}
                className="w-full accent-blue-600 my-3"
              />
              <div className="flex justify-between text-xs text-slate-400 mb-4">
                <span>101</span>
                <span>1000</span>
              </div>
              <button
                onClick={() => handleBuyCredits(customCredits)}
                disabled={isBuyingCredits}
                className="w-full h-12 rounded-xl bg-slate-900 text-white text-[14px] font-semibold hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center"
              >
                {isBuyingCredits ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `Buy ${customCredits} credits`
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">
                Need 1,000+ credits?{' '}
                <a href="mailto:support@screna.ai" className="text-blue-600 hover:underline">
                  Contact sales
                </a>
              </p>
            </div>
          </div>
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
