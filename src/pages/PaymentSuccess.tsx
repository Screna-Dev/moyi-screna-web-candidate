import { CheckCircle, Download, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const PaymentSuccess = () => {
  const orderDetails = {
    confirmationNumber: "SCR-2024-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    date: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    plan: "Pro Plan",
    amount: "$19.90",
    credits: "200 Credits",
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Success Icon */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-500">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your account has been upgraded.
            </p>
          </div>
        </div>

        {/* Order Details Card */}
        <Card className="border-border/50 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confirmation #</span>
              <span className="text-sm font-mono font-medium">{orderDetails.confirmationNumber}</span>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium">{orderDetails.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Credits</span>
                <span className="text-sm font-medium text-primary">{orderDetails.credits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount Paid</span>
                <span className="text-sm font-bold">{orderDetails.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm">{orderDetails.date}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Calendar className="w-4 h-4" />
              <span>Next billing: {orderDetails.nextBilling}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button className="w-full" variant="outline" size="lg">
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
          
          <Button asChild className="w-full" size="lg">
            <Link to="/interview-prep">
              Start Practicing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          A confirmation email has been sent to your registered email address.
          <br />
          <Link to="/settings" className="text-primary hover:underline">
            Manage your subscription
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
