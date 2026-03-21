import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Globe,
  LogOut,
  ChevronRight,
  Mail,
  Lock,
  Trash2,
  Check,
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Plus,
  Minus,
  Loader2,
  Gift,
  Clock,
  AlertCircle,
  Camera,
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Label } from '@/components/newDesign/ui/label';
import { Badge } from '@/components/newDesign/ui/badge';
import { Progress } from '@/components/newDesign/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/newDesign/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/newDesign/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/newDesign/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/newDesign/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/newDesign/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/newDesign/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/newDesign/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePostHog } from "posthog-js/react";
import { safeCapture } from "@/utils/posthog";
import { ProfileService, PaymentService } from '@/services';
import { useUserPlan, useUpgradePrompt } from '@/hooks/useUserPlan';

// Settings Tabs
const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'plan-usage', label: 'Plan & Usage', icon: CreditCard },
  { id: 'billing', label: 'Payment & Billing', icon: Receipt },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

interface Plan {
  name: "Free" | "Pro" | "Elite";
  price: string;
  period: string;
  credits: string;
  description: string;
  features: string[];
  current: boolean;
  popular?: boolean;
}

interface Invoice {
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  description: string;
  reason: string;
  invoiceNumber: string;
  invoiceUrl: string;
  createdAt: string;
}

interface Transaction {
  sourceId?: string;
  transactionType: "CREDIT" | "DEBIT";
  description: string;
  amount: number;
  recurringAmount?: number;
  permanentAmount?: number;
  createdAt: string;
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const posthog = usePostHog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get tab from URL or default to profile
  const activeTab = searchParams.get("tab") || "profile";

  // Profile State - from ProfileSettings.tsx
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    avatarUrl: "",
    country: "",
    timezone: "",
  });
  
  const [originalProfile, setOriginalProfile] = useState(null);
  
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Plan & Usage State - from PlanUsageSettings.tsx
  const { 
    planData, 
    isLoading: isPlanLoading, 
    buyCredits: buyCreditsAction,
    isBuyingCredits,
    refreshPlan,
    changePlan
  } = useUserPlan();
  
  const {
    isDowngrade,
    isChangingPlan,
    currentPlan
  } = useUpgradePrompt();

  const [selectedCredits, setSelectedCredits] = useState(500);
  const [buyCreditsDialogOpen, setBuyCreditsDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [customCreditsInput, setCustomCreditsInput] = useState("100");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [planChangeDialogOpen, setPlanChangeDialogOpen] = useState(false);
  const [selectedPlanToChange, setSelectedPlanToChange] = useState<"Free" | "Pro" | "Elite" | null>(null);

  // Transaction State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionPageMeta, setTransactionPageMeta] = useState<any>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Invoice State - from PaymentBillingSettings.tsx
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(0);
  const [invoicePageMeta, setInvoicePageMeta] = useState<any>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 'communication', title: 'Communication emails', desc: 'Receive emails about your account activity.', enabled: true },
    { id: 'marketing', title: 'Marketing emails', desc: 'Receive emails about new products, features, and more.', enabled: false },
    { id: 'social', title: 'Social emails', desc: 'Receive emails when you get a new follower.', enabled: true },
    { id: 'security', title: 'Security emails', desc: 'Receive emails about your account security.', enabled: true },
  ]);

  // Preferences State
  const [preferences, setPreferences] = useState({
    language: 'en-US',
    dateFormat: 'MM/DD/YYYY',
  });

  // ========== Profile Functions ==========
  useEffect(() => {
    fetchPersonalInfo();
  }, []);

  const fetchPersonalInfo = async () => {
    try {
      setIsLoading(true);
      const response = await ProfileService.getPersonalInfo();
      if (response.data?.data) {
        const data = response.data.data;
        setProfile({
          name: data.name || "",
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          country: data.country || "",
          timezone: data.timezone || "",
        });
        setOriginalProfile({
          name: data.name || "",
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          country: data.country || "",
          timezone: data.timezone || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch personal info:", error);
      toast({
        title: "Error",
        description: "Failed to load profile information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      setIsSaving(true);
      if (profile.name === "" || profile.country === "" || profile.timezone ==="") return;
      const response = await ProfileService.savePersonalInfo({
        name: profile.name,
        country: profile.country,
        timezone: profile.timezone,
      });

      if (response.data?.data) {
        const data = response.data.data;
        setProfile({
          name: data.name || "",
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          country: data.country || "",
          timezone: data.timezone || "",
        });
        setOriginalProfile({
          name: data.name || "",
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          country: data.country || "",
          timezone: data.timezone || "",
        });
      }

      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save personal info:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (originalProfile) {
      setProfile(originalProfile);
    }
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, PNG, or GIF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const response = await ProfileService.uploadAvatar(file);
      
      if (response.data?.data) {
        setProfile((prev) => ({
          ...prev,
          avatarUrl: response.data.data,
        }));
        setOriginalProfile((prev) => ({
          ...prev,
          avatarUrl: response.data.data,
        }));
        toast({
          title: "Avatar Updated",
          description: "Your profile photo has been updated successfully.",
        });
      }
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmNewPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await ProfileService.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });

      setPasswordDialogOpen(false);
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error("Failed to change password:", error);
      toast({
        title: "Password Change Failed",
        description: error.response?.data?.message || "Failed to change password. Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordDialogClose = (open: boolean) => {
    setPasswordDialogOpen(open);
    if (!open) {
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ========== Plan & Usage Functions ==========
  useEffect(() => {
    if (activeTab === 'plan-usage') {
      safeCapture(posthog, 'plan_viewed', {
        current_plan: currentPlan,
        credit_balance: planData.recurringCreditBalance + planData.permanentCreditBalance,
      });
    }
  }, [activeTab, currentPlan, planData, posthog]);

  useEffect(() => {
    if (activeTab === 'plan-usage') {
      fetchTransactions(transactionPage);
    }
  }, [activeTab, transactionPage]);

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchInvoices(invoicePage);
    }
  }, [activeTab, invoicePage]);

  const fetchTransactions = async (page: number) => {
    try {
      setIsLoadingTransactions(true);
      const response = await PaymentService.getCreditUsage(page);
      const result = response.data?.data || response.data;
      setTransactions(result.content || []);
      setTransactionPageMeta(result.pageMeta || null);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchInvoices = async (page: number) => {
    try {
      setIsLoadingInvoices(true);
      const response = await PaymentService.getInvoices(page);
      
      if (response.data?.data) {
        setInvoices(response.data.data.content || []);
        setInvoicePageMeta(response.data.data.pageMeta || null);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const totalCredits = currentPlan === "Elite" ? 500 : currentPlan === "Pro" ? 200 : 30;
  const creditBalance = planData.recurringCreditBalance + planData.permanentCreditBalance;
  const nextBillingDate = planData.nextBillingDate 
    ? new Date(planData.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : "Feb 1, 2024";
  
  const hasPendingChanges = planData.planDowngradePending || planData.subscriptionCancelPending;

  const plans: Plan[] = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      credits: "30",
      description: "Get started with basic features",
      features: [
        "30 Credits (≈30 mins) monthly",
        "$0.15 per extra credit",
        "1 Interview Preparation",
        "30% Mentorship Service Charge",
        "7 days data retention",
      ],
      current: currentPlan === "Free",
    },
    {
      name: "Pro",
      price: "$19.9",
      period: "/month",
      credits: "200",
      description: "Perfect for active job seekers",
      features: [
        "200 Credits (≈200 mins) monthly",
        "$0.10 per extra credit",
        "3 Interview Preparations",
        "15% Mentorship Service Charge",
        "90 days data retention",
        "Full report with feedback",
        "Job Smart matching",
      ],
      current: currentPlan === "Pro",
      popular: true,
    },
    {
      name: "Elite",
      price: "$39.9",
      period: "/month",
      credits: "500",
      description: "Maximum power for professionals",
      features: [
        "500 Credits (≈500 mins) monthly",
        "$0.07 per extra credit",
        "5 Interview Preparations",
        "5% Mentorship Service Charge",
        "Unlimited data retention",
        "Full report with feedback",
        "Video replay with timestamps",
        "Job Smart matching",
      ],
      current: currentPlan === "Elite",
    },
  ];

  const isPlanButtonDisabled = (planName: string): boolean => {
    if (planName === currentPlan) return true;
    if (planData.subscriptionCancelPending) return true;
    if (planData.planDowngradePending && (planName === "Pro" || planName === "Elite")) return true;
    return false;
  };

  const handleChangePlan = (planName: "Free" | "Pro" | "Elite") => {
    setSelectedPlanToChange(planName);
    setPlanChangeDialogOpen(true);
  };

  const confirmPlanChange = async () => {
    if (!selectedPlanToChange) return;
    
    const isDowngradeAction = isDowngrade(selectedPlanToChange);
    
    safeCapture(posthog, 'payment_started', {
      plan_name: selectedPlanToChange,
      current_plan: currentPlan,
      action: isDowngradeAction ? 'downgrade' : 'upgrade',
    });
    
    setPlanChangeDialogOpen(false);
    
    const result = await changePlan(selectedPlanToChange);
    
    if (result.success && result.url) {
      window.location.href = result.url;
    }
    
    setSelectedPlanToChange(null);
  };

  const calculatePrice = (credits: number): string => {
    const pricePerCredit = currentPlan === "Elite" ? 0.07 : currentPlan === "Pro" ? 0.10 : 0.15;
    return (credits * pricePerCredit).toFixed(2);
  };

  const handleBuyCredits = async (credits: number) => {
    safeCapture(posthog, 'payment_started', {
      action: 'buy_credits',
      credits,
      current_plan: currentPlan,
      price: calculatePrice(credits),
    });
    
    const url = await buyCreditsAction(credits);
    if (url) {
      window.location.href = url;
    }
    setBuyCreditsDialogOpen(false);
  };

  const handlePurchaseCustomCredits = () => {
    const credits = parseInt(customCreditsInput) || 0;
    if (credits < 10) {
      toast({
        title: "Minimum Credits Required",
        description: "Please enter at least 10 credits.",
        variant: "destructive",
      });
      return;
    }
    handleBuyCredits(credits);
  };

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a promotion code.",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    
    safeCapture(posthog, 'redeem_code_attempted', {
      current_plan: currentPlan,
    });

    try {
      const response = await PaymentService.redeemCode(promoCode.trim());
      
      if (response.data?.status === 'success' || response.status === 200) {
        toast({
          title: "Code Redeemed!",
          description: response.data?.message || `You've successfully redeemed ${promoCode}. Credits have been added to your account.`,
        });
        
        safeCapture(posthog, 'redeem_code_success', {
          current_plan: currentPlan,
        });
        
        await refreshPlan();
        setRedeemDialogOpen(false);
        setPromoCode("");
      } else {
        throw new Error(response.data?.message || 'Failed to redeem code');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to redeem code. Please try again.";
      
      toast({
        title: "Redemption Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      safeCapture(posthog, 'redeem_code_failed', {
        current_plan: currentPlan,
        error: errorMessage,
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const getDialogContent = () => {
    if (!selectedPlanToChange) return {};
    
    const isDowngradeAction = isDowngrade(selectedPlanToChange);
    
    return {
      isDowngrade: isDowngradeAction,
      title: isDowngradeAction ? "Confirm Plan Downgrade" : "Confirm Plan Upgrade",
      description: isDowngradeAction 
        ? `You are about to downgrade from ${currentPlan} to ${selectedPlanToChange}.`
        : `You are about to upgrade from ${currentPlan} to ${selectedPlanToChange}.`,
      warning: isDowngradeAction 
        ? `Your downgrade will take effect on ${nextBillingDate}. You'll continue to have access to ${currentPlan} features until then.`
        : "You will be redirected to Stripe to complete the payment. Your new plan benefits will be available immediately after successful payment.",
      buttonText: isDowngradeAction ? "Confirm Downgrade" : "Confirm & Pay",
    };
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferences Saved",
      description: "Your preferences have been updated.",
    });
  };

  const formatAmount = (amountInCents: number, currency: string = 'usd') => {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const timezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
    { value: "Europe/Paris", label: "Central European Time (CET)" },
    { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
    { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  ];

  const countries = [
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
    { value: "ca", label: "Canada" },
    { value: "au", label: "Australia" },
    { value: "de", label: "Germany" },
    { value: "fr", label: "France" },
    { value: "jp", label: "Japan" },
    { value: "cn", label: "China" },
  ];

  const dialogContent = getDialogContent();

  return (
    <DashboardLayout headerTitle="Settings">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 space-y-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Profile Settings - From ProfileSettings.tsx */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Avatar Card */}
              <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Profile Photo</CardTitle>
                  <CardDescription>Update your profile picture</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatarUrl} />
                      <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleAvatarUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? "Uploading..." : "Upload New Photo"}
                    </Button>
                    <p className="text-xs text-slate-500">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information Card */}
              <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Primary Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          value={profile.email}
                          className="pl-10"
                          disabled
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-500">Email cannot be changed. Contact support if needed.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={profile.country}
                        onValueChange={(value) => setProfile({ ...profile, country: value })}
                        disabled={!isEditing}
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
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={profile.timezone}
                        onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                        disabled={!isEditing}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleProfileSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Password Section */}
              <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Password
                  </CardTitle>
                  <CardDescription>Manage your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Lock className="h-6 w-6 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogClose}>
                      <DialogTrigger asChild>
                        <Button variant="outline">Change Password</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Password</DialogTitle>
                          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={passwordData.oldPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                            <p className="text-xs text-slate-500">Minimum 8 characters</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordData.confirmNewPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => handlePasswordDialogClose(false)}
                            disabled={isChangingPassword}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                            {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Delete Account Section */}
              <Card className="bg-red-50 border border-red-100 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-red-700">Delete Account</CardTitle>
                  <CardDescription className="text-red-600/80">
                    Permanently delete your account and all of your content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-600/70 italic">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                      Delete account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Plan & Usage Settings - From PlanUsageSettings.tsx */}
          {activeTab === 'plan-usage' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Summary Card */}
              <Card className="border border-slate-200 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  {isPlanLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-6 md:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500">Current Plan</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-2xl font-bold">{currentPlan}</h3>
                            <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
                            {planData.subscriptionCancelPending && (
                              <Badge variant="destructive" className="gap-1">
                                <Clock className="h-3 w-3" />
                                → Free on {nextBillingDate}
                              </Badge>
                            )}
                            {planData.planDowngradePending && (
                              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                                <Clock className="h-3 w-3" />
                                → Pro on {nextBillingDate}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500">Next Billing</p>
                          <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-400" />
                            {nextBillingDate}
                          </h3>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500">Credit Balance</p>
                          <h3 className="text-2xl font-bold text-blue-600">{creditBalance} credits</h3>
                          <Progress value={(creditBalance / totalCredits) * 100} className="h-2 mt-2" />
                          <div className="flex gap-3 text-xs text-slate-500 mt-1">
                            <span>Recurring: {planData.recurringCreditBalance}</span>
                            <span>Permanent: {planData.permanentCreditBalance}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-500">This Month Usage</p>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-semibold">8</span> AI Mocks completed
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">{totalCredits - creditBalance}</span> credits used
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <Button 
                          className="gap-2 bg-blue-600 hover:bg-blue-700" 
                          onClick={() => handleChangePlan(currentPlan === "Free" ? "Pro" : "Elite")}
                          disabled={isChangingPlan || currentPlan === "Elite" || planData.subscriptionCancelPending}
                        >
                          {isChangingPlan ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TrendingUp className="h-4 w-4" />
                          )}
                          Upgrade Plan
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => setBuyCreditsDialogOpen(true)}>
                          <Zap className="h-4 w-4" />
                          Buy Extra Credits
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => setRedeemDialogOpen(true)}>
                          <Gift className="h-4 w-4" />
                          Redeem Credit
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pending Changes Alert */}
              {hasPendingChanges && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 font-semibold">
                    {planData.subscriptionCancelPending 
                      ? "Subscription Cancellation Pending" 
                      : "Plan Downgrade Pending (Elite → Pro)"}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    {planData.subscriptionCancelPending ? (
                      <>
                        Your subscription will be cancelled on <strong>{nextBillingDate}</strong>. 
                        You will continue to have access to your current <strong>{currentPlan}</strong> plan benefits until then. 
                        After this date, your account will be downgraded to the Free plan.
                      </>
                    ) : (
                      <>
                        Your plan will downgrade from <strong>Elite</strong> to <strong>Pro</strong> on <strong>{nextBillingDate}</strong>. 
                        You will continue to have access to Elite features until then.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Plan Change Confirmation Dialog */}
              <Dialog open={planChangeDialogOpen} onOpenChange={setPlanChangeDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {dialogContent.isDowngrade ? (
                        <TrendingDown className="h-5 w-5 text-amber-500" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-primary" />
                      )}
                      {dialogContent.title}
                    </DialogTitle>
                    <DialogDescription>
                      {dialogContent.description}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className={`p-4 rounded-lg space-y-2 ${dialogContent.isDowngrade ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Plan:</span>
                        <span className="font-semibold">{currentPlan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">New Plan:</span>
                        <span className={`font-semibold ${dialogContent.isDowngrade ? 'text-amber-600' : 'text-primary'}`}>
                          {selectedPlanToChange}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">New Price:</span>
                        <span className="font-semibold">
                          {selectedPlanToChange === "Elite" ? "$39.9" : selectedPlanToChange === "Pro" ? "$19.9" : "$0"}/month
                        </span>
                      </div>
                      {dialogContent.isDowngrade && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Effective Date:</span>
                          <span className="font-semibold">{nextBillingDate}</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm mt-4 ${dialogContent.isDowngrade ? 'text-amber-700' : 'text-slate-500'}`}>
                      {dialogContent.warning}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setPlanChangeDialogOpen(false);
                        setSelectedPlanToChange(null);
                      }}
                      disabled={isChangingPlan}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={confirmPlanChange} 
                      className="gap-2"
                      variant={dialogContent.isDowngrade ? "destructive" : "default"}
                      disabled={isChangingPlan}
                    >
                      {isChangingPlan ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {dialogContent.isDowngrade ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          {dialogContent.buttonText}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Buy Credits Dialog */}
              <Dialog open={buyCreditsDialogOpen} onOpenChange={setBuyCreditsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Buy Extra Credits
                    </DialogTitle>
                    <DialogDescription>
                      Enter the number of credits you want to purchase. Price: $
                      {currentPlan === "Elite" ? "0.07" : currentPlan === "Pro" ? "0.10" : "0.15"}/credit
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="credits">Number of Credits</Label>
                      <Input
                        id="credits"
                        type="number"
                        min="10"
                        max="10000"
                        value={customCreditsInput}
                        onChange={(e) => setCustomCreditsInput(e.target.value)}
                        placeholder="Enter credits amount"
                        className="text-lg"
                        disabled={isBuyingCredits}
                      />
                      <p className="text-xs text-slate-500">Minimum: 10 credits, Maximum: 10,000 credits</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                      <div>
                        <p className="text-sm text-slate-500">Total Price</p>
                        <p className="text-2xl font-bold text-primary">${calculatePrice(parseInt(customCreditsInput) || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Credits</p>
                        <p className="text-2xl font-bold">{parseInt(customCreditsInput) || 0}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[100, 300, 500].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomCreditsInput(amount.toString())}
                          className={customCreditsInput === amount.toString() ? "border-primary" : ""}
                          disabled={isBuyingCredits}
                        >
                          {amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBuyCreditsDialogOpen(false)} disabled={isBuyingCredits}>
                      Cancel
                    </Button>
                    <Button onClick={handlePurchaseCustomCredits} className="gap-2" disabled={isBuyingCredits}>
                      {isBuyingCredits ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Checkout with Stripe
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Redeem Credit Dialog */}
              <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      Redeem Credit
                    </DialogTitle>
                    <DialogDescription>
                      Enter your promotion code to receive extra credits.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="promoCode">Promotion Code</Label>
                      <Input
                        id="promoCode"
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter your code"
                        className="text-lg uppercase"
                        disabled={isRedeeming}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setRedeemDialogOpen(false);
                        setPromoCode("");
                      }}
                      disabled={isRedeeming}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleRedeemCode} 
                      className="gap-2"
                      disabled={!promoCode.trim() || isRedeeming}
                    >
                      {isRedeeming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redeeming...
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          Redeem
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Plans & Credits Tabs */}
              <Tabs defaultValue="plans" className="space-y-6">
                <TabsList className="bg-slate-100 border-0">
                  <TabsTrigger value="plans">Plan Comparison</TabsTrigger>
                  <TabsTrigger value="credits">Credits</TabsTrigger>
                </TabsList>

                <TabsContent value="plans">
                  <div className="grid gap-6 md:grid-cols-3">
                    {plans.map((plan) => {
                      const isDisabled = isPlanButtonDisabled(plan.name);
                      const showLockedState = isDisabled && !plan.current;
                      const isPlanDowngrade = isDowngrade(plan.name);
                      
                      return (
                        <Card
                          key={plan.name}
                          className={`border border-slate-200 rounded-2xl shadow-sm relative ${plan.popular ? "ring-2 ring-blue-500" : ""} ${showLockedState ? "opacity-60" : ""}`}
                        >
                          {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <Badge className="gap-1 bg-blue-600">
                                <Sparkles className="h-3 w-3" />
                                Most Popular
                              </Badge>
                            </div>
                          )}
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                              {plan.name}
                              {planData.planDowngradePending && plan.name === "Pro" && (
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                  Pending
                                </Badge>
                              )}
                              {planData.subscriptionCancelPending && plan.name === "Free" && (
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                  Pending
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                            <div className="pt-2">
                              <span className="text-3xl font-bold">{plan.price}</span>
                              <span className="text-slate-500">{plan.period}</span>
                            </div>
                            <p className="text-sm text-primary font-medium">{plan.credits} credits/month</p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <ul className="space-y-2">
                              {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <Button
                              className="w-full gap-2"
                              variant={plan.current ? "outline" : isPlanDowngrade ? "secondary" : "default"}
                              disabled={isDisabled || isChangingPlan}
                              onClick={() => handleChangePlan(plan.name)}
                            >
                              {isChangingPlan ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : plan.current ? (
                                "Current Plan"
                              ) : isPlanDowngrade ? (
                                <>
                                  Downgrade
                                  <TrendingDown className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  Select Plan
                                  <ArrowRight className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="credits" className="space-y-6">
                  {/* Credit Balance Card */}
                  <Card className="border border-slate-200 rounded-2xl shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Credit Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-4xl font-bold text-primary">{creditBalance}</p>
                          <p className="text-sm text-slate-500">credits remaining</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Monthly allocation</p>
                          <p className="font-semibold">{totalCredits} credits</p>
                        </div>
                      </div>
                      <Progress value={(creditBalance / totalCredits) * 100} className="h-3" />
                      <div className="flex gap-6 mt-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-primary/60" />
                          <div>
                            <p className="text-sm font-medium">{planData.recurringCreditBalance} credits</p>
                            <p className="text-xs text-slate-500">Recurring (resets monthly)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <div>
                            <p className="text-sm font-medium">{planData.permanentCreditBalance} credits</p>
                            <p className="text-xs text-slate-500">Permanent (never expires)</p>
                          </div>
                        </div>
                      </div>
                      
                      {hasPendingChanges && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-sm text-amber-800">
                            <Clock className="h-4 w-4 inline mr-1" />
                            {planData.subscriptionCancelPending 
                              ? `Your monthly allocation will change to 30 credits (Free plan) after ${nextBillingDate}`
                              : `Your monthly allocation will change to 200 credits (Pro plan) after ${nextBillingDate}`
                            }
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Transaction History */}
                  <Card className="border border-slate-200 rounded-2xl shadow-sm">
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>Recent credit transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingTransactions ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p>No transactions yet.</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {transactions.map((tx, index) => {
                              const isCredit = tx.transactionType === "CREDIT";
                              return (
                                <div key={tx.sourceId || index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                        isCredit ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                      }`}
                                    >
                                      {isCredit ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                                    </div>
                                    <div>
                                      <p className="font-medium">{tx.description}</p>
                                      <p className="text-sm text-slate-500">
                                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                                      {isCredit ? "+" : ""}{tx.amount} credits
                                    </span>
                                    {((tx.recurringAmount ?? 0) > 0 || (tx.permanentAmount ?? 0) > 0) && (
                                      <p className="text-xs text-slate-500">
                                        {(tx.recurringAmount ?? 0) > 0 && `Recurring: ${tx.recurringAmount}`}
                                        {(tx.recurringAmount ?? 0) > 0 && (tx.permanentAmount ?? 0) > 0 && " · "}
                                        {(tx.permanentAmount ?? 0) > 0 && `Permanent: ${tx.permanentAmount}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {transactionPageMeta && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                              <p className="text-sm text-slate-500">
                                Page {transactionPageMeta.pageNumber + 1} of {transactionPageMeta.totalPages}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={transactionPageMeta.first}
                                  onClick={() => setTransactionPage(prev => prev - 1)}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  Previous
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={transactionPageMeta.last}
                                  onClick={() => setTransactionPage(prev => prev + 1)}
                                >
                                  Next
                                  <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {/* Payment & Billing Settings - From PaymentBillingSettings.tsx */}
          {activeTab === 'billing' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Invoice History */}
              <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoice History
                  </CardTitle>
                  <CardDescription>View and download your past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingInvoices ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : invoices.length > 0 ? (
                    <>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
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
                                  <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                                    <Check className="h-3 w-3 mr-1" />
                                    Paid
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => window.open(invoice.invoiceUrl, '_blank')}
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
                      {invoicePageMeta && invoicePageMeta.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm text-slate-500">
                            Showing page {invoicePageMeta.pageNumber + 1} of {invoicePageMeta.totalPages} ({invoicePageMeta.totalElements} total invoices)
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInvoicePage(prev => Math.max(0, prev - 1))}
                              disabled={invoicePageMeta.first}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInvoicePage(prev => prev + 1)}
                              disabled={invoicePageMeta.last}
                            >
                              Next
                              <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No invoices found.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notifications.map((item) => (
                      <div key={item.id} className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleNotification(item.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            item.enabled ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Preferences Settings */}
          {activeTab === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={preferences.language}
                        onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English (United States)</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date format</Label>
                      <Select
                        value={preferences.dateFormat}
                        onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-4">
                      <Button onClick={handleSavePreferences}>Save preferences</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}