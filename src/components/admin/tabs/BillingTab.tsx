import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminUser } from '@/data/adminMockData';
import {
  CreditCard,
  Calendar,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { adminService } from '@/services';
import { format } from 'date-fns';

interface BillingTabProps {
  user: AdminUser;
}

export function BillingTab({ user }: BillingTabProps) {
  const [billingData, setBillingData] = useState<any>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setIsLoadingBilling(true);
        const response = await adminService.getUserBilling(user.id);
        if (response.data?.data) {
          setBillingData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch billing data:', err);
      } finally {
        setIsLoadingBilling(false);
      }
    };

    if (user?.id) {
      fetchBilling();
    }
  }, [user?.id]);

  const permanentCredits = billingData?.creditBalance ?? user?.creditBalance ?? 0;
  const recurringCredits = billingData?.recurringCreditBalance ?? user?.recurringCreditBalance ?? 0;
  const totalCredits = permanentCredits + recurringCredits;

  const invoices = billingData?.invoices?.content ?? [];

  const getPlanStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Past due':
      case 'past_due':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Canceled':
      case 'canceled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'open':
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
      case 'uncollectible':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'void':
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'refunded':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | undefined, currency?: string) => {
    if (amount == null) return '-';
    const curr = currency?.toUpperCase() || 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount / 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBilling ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Plan Name</p>
                  <p className="text-xl font-bold">{billingData?.planName ?? user?.planName ?? 'N/A'}</p>
                  {billingData?.planType && (
                    <Badge variant="secondary" className="mt-1">
                      {billingData.planType}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Billing Status</p>
                  <Badge className={getPlanStatusColor(billingData?.planStatus ?? user?.plan?.status)}>
                    {billingData?.planStatus ?? user?.plan?.status ?? 'N/A'}
                  </Badge>
                  {(billingData?.renewalDate ?? user?.plan?.renewalDate) && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Renews: {formatDate(billingData?.renewalDate ?? user?.plan?.renewalDate)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Stripe Customer ID</p>
                  {(billingData?.subscription?.stripeCustomerId) ? (
                    <p className="font-mono text-xs">{billingData?.subscription?.stripeCustomerId}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Stripe account</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Credits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Permanent Credits</p>
              <p className="text-3xl font-bold">{permanentCredits}</p>
              <p className="text-xs text-muted-foreground mt-1">Non-expiring</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Recurring Credits</p>
              <p className="text-3xl font-bold">{recurringCredits}</p>
              <p className="text-xs text-muted-foreground mt-1">Resets every billing cycle</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Total Credits</p>
              <p className="text-3xl font-bold">{totalCredits}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History & Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment History & Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBilling ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Stripe Invoice ID</TableHead>
                    <TableHead>Stripe Event ID</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice: any, index: number) => (
                    <TableRow key={invoice.stripeInvoiceId ?? index}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {invoice.invoiceNumber ?? '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {invoice.planName ?? '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.description ?? '-'}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status ?? 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {invoice.reason ?? '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {invoice.stripeInvoiceId ?? '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {invoice.stripeEventId ?? '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.invoiceUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-primary"
                            onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
