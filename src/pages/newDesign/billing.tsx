import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  CreditCard,
  Download,
  Zap,
  Check,
  Plus,
  Gift,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '@/components/newDesign/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/newDesign/ui/dialog';
import { Input } from '@/components/newDesign/ui/input';

// Mock Data
const INVOICES = [
  { id: 'inv_1', date: 'Feb 18, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'inv_2', date: 'Jan 18, 2026', amount: '$29.00', status: 'Paid' },
  { id: 'inv_3', date: 'Dec 18, 2025', amount: '$29.00', status: 'Paid' },
];

const PLAN_TIERS = [
  {
    name: 'Free',
    price: '$0',
    features: ['3 AI Interviews / month', 'Basic feedback', 'Community support'],
    current: false,
  },
  {
    name: 'Plus',
    price: '$19',
    features: ['Unlimited AI Interviews', 'Detailed analytics', 'Priority support', 'Resume review'],
    current: false,
  },
  {
    name: 'Pro',
    price: '$29',
    features: ['Everything in Plus', 'Mock live sessions', 'Custom question bank', '1-on-1 coaching credits'],
    current: true,
  },
];

export function BillingPage() {
  const [redeemCode, setRedeemCode] = useState('');
  const [showPricing, setShowPricing] = useState(false);

  return (
    <DashboardLayout headerTitle="Billing & Plan">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Billing & Plan</h2>
            <p className="text-slate-500">Manage your plan, credits, and billing details.</p>
          </div>
        </div>

        {/* Section A: Current Plan */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                  Pro Plan
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">$29</span>
                  <span className="text-slate-500">/ month</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Next billing: <span className="font-medium text-slate-700">Mar 18, 2026</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/pricing">
                <Button variant="outline" className="w-full sm:w-auto">View pricing</Button>
              </Link>
              <Button variant="outline" className="w-full sm:w-auto text-slate-600 hover:text-slate-900">Downgrade</Button>
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                Upgrade plan
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
             <button 
               onClick={() => setShowPricing(!showPricing)}
               className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
             >
               {showPricing ? 'Hide plan comparison' : 'Compare plans'}
               {showPricing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </button>
             
             {showPricing && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 className="mt-6 grid md:grid-cols-3 gap-4"
               >
                 {PLAN_TIERS.map((tier) => (
                   <div 
                     key={tier.name} 
                     className={`p-4 rounded-xl border ${tier.current ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <h4 className="font-semibold text-slate-900">{tier.name}</h4>
                       {tier.current && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Current</span>}
                     </div>
                     <p className="text-xl font-bold text-slate-900 mb-4">{tier.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                     <ul className="space-y-2">
                       {tier.features.map((feature) => (
                         <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                           <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                           {feature}
                         </li>
                       ))}
                     </ul>
                   </div>
                 ))}
               </motion.div>
             )}
          </div>
        </motion.section>

        {/* Section B: Usage */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6"
        >
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
              <AlertCircle className="w-4 h-4 text-slate-400" />
              Usage limits reset on Mar 18, 2026.
            </div>
          </div>

          {/* Section C: Credits */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-300">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Credit Balance</span>
              </div>
              <div className="text-4xl font-bold mb-1">120</div>
              <p className="text-sm text-slate-400">1 interview ≈ 10 credits</p>
            </div>

            <div className="space-y-3 mt-8">
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none">
                <Plus className="w-4 h-4 mr-2" />
                Buy extra credits
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white">
                    <Gift className="w-4 h-4 mr-2" />
                    Redeem code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Redeem Code</DialogTitle>
                    <DialogDescription>
                      Enter your promotional or credit code below to add credits to your account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Input
                        id="code"
                        placeholder="Enter promo code (e.g. SAVE20)"
                        value={redeemCode}
                        onChange={(e) => setRedeemCode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setRedeemCode('')} disabled={!redeemCode}>
                      Redeem
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.section>

        {/* Section D: Payment & Invoices */}
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
               <p className="text-sm text-slate-500">Sent to alex@example.com</p>
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
    </DashboardLayout>
  );
}
