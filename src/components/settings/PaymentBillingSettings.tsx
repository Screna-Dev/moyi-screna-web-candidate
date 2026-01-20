import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Building2, Receipt, Download, ExternalLink, Check, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PaymentService } from "@/services";

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

const PaymentBillingSettings = () => {

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  // Fetch invoices
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
        toast({
          title: "Error",
          description: "Failed to load invoices",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [currentPage]);

  const handleOpenStripePortal = () => {
    toast({
      title: "Opening Stripe Portal",
      description: "Redirecting to Stripe Customer Portal...",
    });
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.invoiceUrl) {
      window.open(invoice.invoiceUrl, '_blank');
    } else {
      toast({
        title: "Downloading Invoice",
        description: `Downloading ${invoice.invoiceNumber}...`,
      });
    }
  };

  // Format amount from cents to dollars
  const formatAmount = (amountInCents: number, currency: string = 'usd') => {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Determine if we should show API data or mock data
  const hasApiInvoices = invoices.length > 0;

  return (
    <div className="space-y-6">
      {/* Invoice History */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>View and download your past invoices</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hasApiInvoices ? (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.stripeInvoiceId}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                        <TableCell>{invoice.description || invoice.reason || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="default" 
                            className="bg-green-100 text-green-700 hover:bg-green-100"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {pageMeta && pageMeta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing page {pageMeta.pageNumber + 1} of {pageMeta.totalPages} ({pageMeta.totalElements} total invoices)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={pageMeta.first}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={pageMeta.last}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback to mock invoices if no API data */
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  No Invoice found
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentBillingSettings;