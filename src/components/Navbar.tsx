import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Logo from "@/assets/logo.png"
export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <img src ={Logo} alt = "Logo" className="w-6 h-6 text-primary" />
          Screna AI
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
            Home
          </Link>
          <Link to="/profile" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
            Profile
          </Link>
          <Link to="/pricing" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="cta" size="sm" asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
