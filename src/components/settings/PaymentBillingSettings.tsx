import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Building2, Receipt, Download, ExternalLink, Check, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PaymentBillingSettings = () => {
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    name: "John Doe",
    company: "Acme Inc.",
    street: "123 Main Street",
    city: "New York",
    state: "NY",
    country: "us",
    postalCode: "10001",
    taxId: "",
  });

  const paymentMethods = [
    { id: 1, type: "visa", last4: "4242", expiry: "03/28", isDefault: true },
    { id: 2, type: "mastercard", last4: "8888", expiry: "12/25", isDefault: false },
  ];

  const invoices = [
    { id: "INV-001", date: "Jan 1, 2024", description: "Pro Plan - Monthly", amount: "$19.90", status: "Paid" },
    { id: "INV-002", date: "Jan 8, 2024", description: "Credit Purchase - 100 credits", amount: "$10.00", status: "Paid" },
    { id: "INV-003", date: "Dec 1, 2023", description: "Pro Plan - Monthly", amount: "$19.90", status: "Paid" },
    { id: "INV-004", date: "Nov 15, 2023", description: "Credit Purchase - 300 credits", amount: "$25.00", status: "Paid" },
    { id: "INV-005", date: "Nov 1, 2023", description: "Pro Plan - Monthly", amount: "$19.90", status: "Failed" },
  ];

  const countries = [
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
    { value: "ca", label: "Canada" },
    { value: "au", label: "Australia" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
  ];

  const handleSaveBilling = () => {
    setIsEditingBilling(false);
    toast({
      title: "Billing Information Updated",
      description: "Your billing details have been saved.",
    });
  };

  const handleOpenStripePortal = () => {
    toast({
      title: "Opening Stripe Portal",
      description: "Redirecting to Stripe Customer Portal...",
    });
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast({
      title: "Downloading Invoice",
      description: `Downloading ${invoiceId}...`,
    });
  };

  const getCardIcon = (type: string) => {
    if (type === "visa") {
      return (
        <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill="#1A1F71"/>
          <path d="M19.5 21H17L18.5 11H21L19.5 21ZM15.5 11L13.5 18L13.2 16.5L12.2 12C12.2 12 12 11 10.8 11H7V11.2C7 11.2 8.3 11.5 9.8 12.3L12 21H14.5L18 11H15.5ZM35 21H37.5L35.5 11H33.5C32.5 11 32.2 11.8 32.2 11.8L28.5 21H31L31.5 19.5H34.5L35 21ZM32.2 17.5L33.5 14L34.2 17.5H32.2ZM29 14L29.3 12.5C29.3 12.5 28 12 26.5 12C25 12 22 12.8 22 15.5C22 18 26 18 26 19.3C26 20.6 22.5 20.2 21.3 19.3L21 21C21 21 22.3 21.5 24 21.5C25.7 21.5 29 20.3 29 17.8C29 15.3 25 15 25 14C25 13 28 13.2 29 14Z" fill="white"/>
        </svg>
      );
    }
    return (
      <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none">
        <rect width="48" height="32" rx="4" fill="#EB001B"/>
        <circle cx="19" cy="16" r="8" fill="#EB001B"/>
        <circle cx="29" cy="16" r="8" fill="#F79E1B"/>
        <path d="M24 10C26 12 27 14 27 16C27 18 26 20 24 22C22 20 21 18 21 16C21 14 22 12 24 10Z" fill="#FF5F00"/>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Manage your saved payment methods</CardDescription>
          </div>
          <Button variant="outline" onClick={handleOpenStripePortal} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Manage in Stripe
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                {getCardIcon(method.type)}
                <div>
                  <p className="font-medium capitalize">
                    {method.type} •••• {method.last4}
                    {method.isDefault && (
                      <Badge variant="secondary" className="ml-2">Default</Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button variant="ghost" size="sm">Set as Default</Button>
                )}
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full gap-2">
            <CreditCard className="h-4 w-4" />
            Add New Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Billing Information
            </CardTitle>
            <CardDescription>Your billing address and tax information</CardDescription>
          </div>
          {!isEditingBilling && (
            <Button variant="outline" onClick={() => setIsEditingBilling(true)}>Edit</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="billingName">Billing Name</Label>
              <Input
                id="billingName"
                value={billingInfo.name}
                onChange={(e) => setBillingInfo({ ...billingInfo, name: e.target.value })}
                disabled={!isEditingBilling}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input
                id="company"
                value={billingInfo.company}
                onChange={(e) => setBillingInfo({ ...billingInfo, company: e.target.value })}
                disabled={!isEditingBilling}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={billingInfo.street}
                onChange={(e) => setBillingInfo({ ...billingInfo, street: e.target.value })}
                disabled={!isEditingBilling}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={billingInfo.city}
                onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                disabled={!isEditingBilling}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                value={billingInfo.state}
                onChange={(e) => setBillingInfo({ ...billingInfo, state: e.target.value })}
                disabled={!isEditingBilling}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={billingInfo.country}
                onValueChange={(value) => setBillingInfo({ ...billingInfo, country: value })}
                disabled={!isEditingBilling}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={billingInfo.postalCode}
                onChange={(e) => setBillingInfo({ ...billingInfo, postalCode: e.target.value })}
                disabled={!isEditingBilling}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="taxId">Tax ID / VAT Number (Optional)</Label>
              <Input
                id="taxId"
                value={billingInfo.taxId}
                onChange={(e) => setBillingInfo({ ...billingInfo, taxId: e.target.value })}
                disabled={!isEditingBilling}
                placeholder="e.g., EU123456789"
              />
            </div>
          </div>
          {isEditingBilling && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveBilling}>Save Changes</Button>
              <Button variant="outline" onClick={() => setIsEditingBilling(false)}>Cancel</Button>
            </div>
          )}
        </CardContent>
      </Card>

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
          <Button variant="outline" onClick={handleOpenStripePortal} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Billing Portal
          </Button>
        </CardHeader>
        <CardContent>
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
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.description}</TableCell>
                    <TableCell className="font-semibold">{invoice.amount}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "Paid" ? "default" : "destructive"} className={invoice.status === "Paid" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                        {invoice.status === "Paid" && <Check className="h-3 w-3 mr-1" />}
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(invoice.id)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentBillingSettings;
