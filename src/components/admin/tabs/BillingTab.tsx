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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminUser } from '@/data/adminMockData';
import {
  CreditCard,
  Calendar,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

interface BillingTabProps {
  user: AdminUser;
}

export function BillingTab({ user }: BillingTabProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPayments = user?.payments?.filter((payment) => {
    const matchesType = typeFilter === 'all' || payment.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const getPlanStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Past due':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Canceled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Refunded':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plan Name</p>
              <p className="text-xl font-bold">{user?.plan?.name}</p>
              <Badge variant="secondary" className="mt-1">
                {user?.plan?.type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Billing Status</p>
              <Badge className={getPlanStatusColor(user?.plan?.status)}>{user?.plan?.status}</Badge>
              {user?.plan?.renewalDate && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Renews: {user?.plan?.renewalDate}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Stripe IDs</p>
              {user?.plan?.stripeCustomerId ? (
                <div className="space-y-1 text-xs">
                  <p className="font-mono">Customer: {user?.plan?.stripeCustomerId}</p>
                  <p className="font-mono">Sub: {user?.plan?.stripeSubscriptionId}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No Stripe account</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={!user?.plan?.stripeCustomerId}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open in Stripe
            </Button>
            <Button variant="outline" size="sm" disabled={!user?.plan?.stripeCustomerId}>
              Open Customer Portal
            </Button>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Remaining</p>
              <p className="text-3xl font-bold">{user?.credits?.remaining}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Used This Month</p>
              <p className="text-3xl font-bold">{user?.credits?.usedThisMonth}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Total Added</p>
              <p className="text-3xl font-bold">
                {user?.credits?.history.reduce((sum, h) => sum + h.creditsAdded, 0)}
              </p>
            </div>
          </div>

          {user?.credits?.history.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Credit History</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user?.credits?.history.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.package}</TableCell>
                      <TableCell>${entry.amount}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-green-600">
                          <Plus className="w-3 h-3" />
                          {entry.creditsAdded}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getPaymentStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment History
            </CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Subscription">Subscription</SelectItem>
                  <SelectItem value="Credits purchase">Credits</SelectItem>
                  <SelectItem value="Mentor session">Mentor</SelectItem>
                  <SelectItem value="Refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No payment history</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.type}</Badge>
                    </TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell className="font-medium">
                      {payment.type === 'Refund' ? '-' : ''}${payment.amount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.paymentMethod || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getPaymentStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
