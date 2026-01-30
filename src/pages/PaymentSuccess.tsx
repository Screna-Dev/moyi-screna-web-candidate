import { CheckCircle, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle className="w-14 h-14 text-primary" />
        </div>

        {/* Success Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Payment Successful!</h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your purchase. Your account has been upgraded successfully.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button asChild className="w-full" size="lg">
            <Link to="/interview-prep">
              Start Practicing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to="/settings?tab=plan-usage">
              <Home className="w-4 h-4 mr-2" />
              Back to Plan Setting
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-sm text-muted-foreground">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;