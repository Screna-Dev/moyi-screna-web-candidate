import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { InterviewService, InterviewSessionService } from "@/services";
import { PaymentService } from "@/services";

import {
  Target,
  Plus,
  PlayCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  FileText,
  Video,
  BookOpen,
  Brain,
  BarChart3,
  Download,
  Share2,
  ChevronRight,
  Loader2,
  Trash2,
  RefreshCw,
  AlertCircle,
  User,
  ListChecks,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Lock,
  Crown,
  Play,
  MessageSquare,
} from "lucide-react";

interface TargetJob {
  id: string;
  title: string;
  company?: string;
  interviewDate: string;
  dailyPrepTime: number;
  successRate: number;
  progress: number;
  categoryScores: {
    category: string;
    score: number;
  }[];
  status: string;
}

interface SessionConfig {
  persona?: string;
  topic?: string;
  objectives?: string[];
  evaluation_dimensions?: string[];
  question_type?: string[];
  purposes?: string[];
  questions?: {
    question: string;
    description?: string;
    type?: string;
    purpose?: string;
  }[];
}

interface AISession {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  duration: number;
  completed: boolean;
  status?: string;
  score?: number;
  persona?: string;
  topic?: string;
  reportId?: string;
  session_outcome?: string;
  session_config?: SessionConfig;
}

interface ReportQuestion {
  question_id: number;
  seq: number;
  question_text: string;
  answer_text: string;
  score: number;
  answered: boolean;
  feedback: string;
  duration_sec: number;
}

interface ReportData {
  interview_id: string;
  status: string;
  job_id: number;
  attempts: number;
  last_error: string;
  overall_score: number;
  scores: {
    resume_background: number;
    domain_knowledge: number;
    technical_skills: number;
    behavioral: number;
  };
  summary: string;
  // Premium features (only available for Elite plan)
  strengths?: string[];
  areas_for_improvement?: string[];
  improvement_advice?: string;
  generated_at?: string;
  questions?: ReportQuestion[];
  video_url?: string;
}

// Refresh interval in milliseconds (5 seconds)
const REFRESH_INTERVAL = 5000;

const InterviewPrep = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [selectedSessionReport, setSelectedSessionReport] = useState<AISession | null>(null);
  
  // API data state
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  
  // Auto-refresh state
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  
  // Report state
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [reportTab, setReportTab] = useState<"basic" | "premium">("basic");
  
  // User plan state
  const [userPlan, setUserPlan] = useState<"Free" | "Pro" | "Elite">("Pro");
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  
  // Session Preview state
  const [selectedSessionPreview, setSelectedSessionPreview] = useState<AISession | null>(null);
  const [sessionPreviewSheetOpen, setSessionPreviewSheetOpen] = useState(false);
  
  // Form state for creating new job
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Check if any plan is not ready
  const hasUnreadyPlans = trainingPlans.some(plan => plan.status !== "active");
  
  // Check if user has premium (Elite) plan
  const isPremiumUser = userPlan === "Elite";

  // Fetch user plan
  const fetchUserPlan = async () => {
    try {
      const response = await PaymentService.getPlanUsage();
      if (response.data?.data?.currentPlan) {
        setUserPlan(response.data.data.currentPlan);
      }
    } catch (error) {
      console.error("Failed to fetch user plan:", error);
    }
  };

  // Handle upgrade to Elite
  const handleUpgradeToElite = async () => {
    try {
      setIsChangingPlan(true);
      const response = await PaymentService.changePlan("Elite");
      
      if (response.data?.data?.url) {
        window.location.href = response.data.data.url;
      } else {
        throw new Error(response.data?.message || 'Failed to create subscription session');
      }
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to initiate plan upgrade",
        variant: "destructive",
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Load training plans
  const loadTrainingPlans = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoadingPlans(true);
    } else {
      setIsAutoRefreshing(true);
    }
    
    try {
      const response = await InterviewService.getTrainingPlans();
      
      // Handle different response structures
      let plansData = null;
      
      // Check if response.data.data exists (nested structure)
      if (response.data?.data) {
        plansData = response.data.data;
      } 
      // Check if response.data is the array directly
      else if (Array.isArray(response.data)) {
        plansData = response.data;
      }
      // Check if data is directly in response
      else if (Array.isArray(response)) {
        plansData = response;
      }
      
      console.log("Processed plans data:", plansData);
      
      if (plansData && Array.isArray(plansData)) {
        setTrainingPlans(plansData);
        
        // If no plans exist, navigate to empty state
        if (plansData.length === 0) {
          console.log("No training plans found, navigating to empty state");
          navigate("/interview-prep/empty");
        } else {
          console.log(`Loaded ${plansData.length} training plans`);
          
          // Check if all plans are now ready
          const allReady = plansData.every((plan: any) => plan.status === "active");
          if (allReady && !showLoading) {
            toast({
              title: "All Plans Ready",
              description: "Your training plans have been fully generated.",
            });
          }
        }
      } else {
        console.error("Unexpected response structure:", response);
        toast({
          title: "Error",
          description: "Received unexpected data format from server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading training plans:", error);
      console.error("Error response:", error.response);
      if (showLoading) {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to load training plans. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingPlans(false);
      setIsAutoRefreshing(false);
    }
  }, [navigate, toast]);

  // Load interview report
  const loadInterviewReport = async (interviewId: string) => {
    setIsLoadingReport(true);
    setReportData(null);
    
    try {
      const response = await InterviewSessionService.getInterviewSession(interviewId);
      
      console.log("Report API Response:", response);
      
      // Handle different response structures
      let reportDataResponse = null;
      
      if (response.data?.data) {
        reportDataResponse = response.data.data;
      } else if (response.data && !response.data.status) {
        reportDataResponse = response.data;
      }
      
      if (reportDataResponse) {
        setReportData(reportDataResponse);
      } else {
        toast({
          title: "Error",
          description: "Failed to load report data.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading interview report:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load interview report.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Handle opening report sheet
  const handleOpenReport = (session: AISession) => {
    setSelectedSessionReport(session);
    setReportSheetOpen(true);
    setReportTab("basic"); // Reset to basic tab when opening
    loadInterviewReport(session.id);
  };

  // Handle closing report sheet
  const handleCloseReport = () => {
    setReportSheetOpen(false);
    setSelectedSessionReport(null);
    setReportData(null);
    setReportTab("basic");
  };

  // Handle opening session preview sheet
  const handleOpenSessionPreview = (session: AISession) => {
    setSelectedSessionPreview(session);
    setSessionPreviewSheetOpen(true);
  };

  // Handle closing session preview sheet
  const handleCloseSessionPreview = () => {
    setSessionPreviewSheetOpen(false);
    setSelectedSessionPreview(null);
  };

  // Handle starting the interview from preview
  const handleStartInterview = () => {
    if (selectedSessionPreview) {
      navigate(`/interview/${selectedSessionPreview.id}`);
    }
  };

  // Load training plans and user plan on mount
  useEffect(() => {
    loadTrainingPlans();
    fetchUserPlan();
  }, []);

  // Auto-refresh when there are unready plans
  useEffect(() => {
    if (hasUnreadyPlans && !isLoadingPlans) {
      console.log("Starting auto-refresh for unready plans...");
      
      const interval = setInterval(() => {
        console.log("Auto-refreshing training plans...");
        loadTrainingPlans(false); // Don't show full loading state
      }, REFRESH_INTERVAL);
      
      return () => {
        console.log("Stopping auto-refresh");
        clearInterval(interval);
      };
    }
  }, [hasUnreadyPlans, isLoadingPlans, loadTrainingPlans]);

  // Set first job as selected when plans load
  useEffect(() => {
    if (trainingPlans.length > 0 && !selectedJob) {
      setSelectedJob(trainingPlans[0].id.toString());
    }
  }, [trainingPlans]);

  const handleCreateTrainingPlan = async () => {
    if (!jobTitle || !jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a job title and job description.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPlan(true);
    try {
      const response = await InterviewService.createTrainingPlan({
        jobTitle,
        company: company || undefined,
        jobDescription,
      });

      // Debug: Log the response
      console.log("Create training plan response:", response);
      console.log("Response data:", response.data);

      // Check various success indicators
      const isSuccess = 
        response.data?.status === "success" || 
        response.data?.data || 
        response.status === 200 ||
        response.status === 201;

      if (isSuccess) {
        toast({
          title: "Success!",
          description: "Your training plan is being generated. This may take a moment.",
        });
        
        // Reset form
        setJobTitle("");
        setCompany("");
        setJobDescription("");
        setAddJobModalOpen(false);
        
        // Reload training plans
        await loadTrainingPlans();
      } else {
        console.warn("Unexpected response format:", response);
        toast({
          title: "Warning",
          description: "Training plan may have been created. Please refresh to check.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error creating training plan:", error);
      console.error("Error response:", error.response);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create training plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleDeleteTrainingPlan = async (planId: string) => {
    setIsDeletingPlan(true);
    try {
      const response = await InterviewService.deleteTrainingPlan(parseInt(planId));
      
      console.log("Delete training plan response:", response);
      
      // Check for success
      const isSuccess = 
        response.status === 200 || 
        response.status === 204 ||
        response.data?.status === "success";

      if (isSuccess) {
        toast({
          title: "Deleted",
          description: "Training plan has been deleted successfully.",
        });
        
        // Update local state
        const updatedPlans = trainingPlans.filter(plan => plan.id.toString() !== planId);
        setTrainingPlans(updatedPlans);
        
        // If deleted plan was selected, select another one
        if (selectedJob === planId) {
          if (updatedPlans.length > 0) {
            setSelectedJob(updatedPlans[0].id.toString());
          } else {
            setSelectedJob("");
            navigate("/interview-prep/empty");
          }
        }
      } else {
        toast({
          title: "Warning",
          description: "Training plan may have been deleted. Please refresh to check.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error deleting training plan:", error);
      console.error("Error response:", error.response);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete training plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPlan(false);
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const openDeleteDialog = (planId: string) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  // Transform API modules to AI sessions format
  const getAISessions = (plan: any): AISession[] => {
    if (!plan?.modules) return [];
    
    return plan.modules.map((module: any) => ({
      id: module.module_id || module.id,
      title: module.title,
      category: module.category,
      difficulty: module.difficulty,
      duration: module.duration_minutes || 30,
      status: module.status,
      score: module.score,
      persona: module.persona,
      topic: module.topic,
      reportId: module.report_id,
      session_outcome: module.session_outcome,
      session_config: module.session_config,
    }));
  };

  // Calculate category scores from focus areas
  const getCategoryScores = (plan: any) => {
    if (!plan?.focus_areas) return [];
    
    return plan.focus_areas.map((area: any) => ({
      category: area.name || area.dimension,
      score: Math.round((area.score || 0)),
    }));
  };

  // Calculate overall success rate from focus areas
  const calculateSuccessRate = (plan: any): number => {
    console.log("plan", plan)
    if (!plan?.focus_areas || plan.focus_areas.length === 0) return "N/A";
    
    const avgScore = plan.focus_areas.reduce((sum: number, area: any) => sum + (area.score || 0), 0) / plan.focus_areas.length;

    return Math.round(avgScore);
  };

  // Calculate overall progress based on completed modules
  const calculateProgress = (plan: any): number => {
    if (!plan?.modules || plan.modules.length === 0) return 0;
    
    const completedModules = plan.modules.filter((m: any) => m.status === "completed").length;
    console.log("plan:", completedModules)
    console.log("modules length", plan.modules.length)
    return Math.round((completedModules / plan.modules.length) * 100);
  };

  // Get status display info
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "active":
        return { label: "active", variant: "secondary" as const, icon: CheckCircle2 };
      case "processing":
      case "generating":
        return { label: "Generating...", variant: "outline" as const, icon: Loader2 };
      case "pending":
        return { label: "Pending", variant: "outline" as const, icon: Clock };
      case "error":
        return { label: "Error", variant: "destructive" as const, icon: AlertCircle };
      default:
        return { label: "Processing...", variant: "outline" as const, icon: Loader2 };
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format score as percentage
  const formatScore = (score: number | undefined): string => {
    if (score === undefined || score === null) return "N/A";
    // If score is already 0-100, use it directly; if 0-1, multiply by 100
    const percentage = score <= 1 ? Math.round(score * 100) : Math.round(score);
    return `${percentage}%`;
  };

  // Format duration in seconds to readable format
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Transform API training plans to target jobs format
  const targetJobs: TargetJob[] = trainingPlans.map((plan) => ({
    id: plan.id.toString(),
    title: plan.target_job_title,
    company: plan.target_company,
    interviewDate: plan.created_at ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
    dailyPrepTime: 2,
    successRate: calculateSuccessRate(plan),
    progress: calculateProgress(plan),
    categoryScores: getCategoryScores(plan),
    status: plan.status,
  }));

  const currentJob = targetJobs.find((job) => job.id === selectedJob);
  const currentPlan = trainingPlans.find((plan) => plan.id.toString() === selectedJob);
  const aiSessions = currentPlan ? getAISessions(currentPlan) : [];
  
  const daysUntilInterview = currentJob
    ? Math.ceil((new Date(currentJob.interviewDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get plan name for delete confirmation
  const getPlanName = (planId: string | null) => {
    if (!planId) return "";
    const plan = trainingPlans.find(p => p.id.toString() === planId);
    return plan?.target_job_title || "this training plan";
  };

  // Check if current plan is ready
  const isCurrentPlanReady = currentPlan?.status === "active";

  // Show loading state
  if (isLoadingPlans) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your training plans...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no training plans
  if (targetJobs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Training Plans Yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first training plan to start your interview preparation journey.
          </p>
          <Button onClick={() => navigate("/interview-prep/empty")} className="gradient-primary">
            <Plus className="mr-2 h-5 w-5" />
            Create Training Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{getPlanName(planToDelete)}"? This action cannot be undone. 
              All your progress and session data for this plan will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPlan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planToDelete && handleDeleteTrainingPlan(planToDelete)}
              disabled={isDeletingPlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingPlan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Sheet - With Basic/Premium Tabs */}
      <Sheet open={reportSheetOpen} onOpenChange={(open) => !open && handleCloseReport()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedSessionReport?.title} - Report</SheetTitle>
            <SheetDescription>Detailed breakdown of your session performance</SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading report...</p>
              </div>
            ) : reportData ? (
              <Tabs value={reportTab} onValueChange={(v) => setReportTab(v as "basic" | "premium")} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="premium" className="flex items-center gap-2">
                    Premium
                    {!isPremiumUser && <Lock className="w-3 h-3" />}
                  </TabsTrigger>
                </TabsList>

                {/* Basic Tab Content */}
                <TabsContent value="basic">
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-6 pr-4">
                      {/* Summary */}
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Summary</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Overall Score</p>
                            <p className="text-2xl font-bold text-primary">{formatScore(reportData.overall_score)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Attempts</p>
                            <p className="text-xl font-semibold">{reportData.attempts || 1}</p>
                          </div>
                        </div>
                        {reportData.summary && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{reportData.summary}</p>
                        )}
                      </div>

                      {/* Score Breakdown */}
                      {reportData.scores && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Score Breakdown
                          </h3>
                          <div className="space-y-3">
                            {Object.entries(reportData.scores).map(([key, value]) => (
                              <div key={key} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium capitalize">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-sm font-semibold">
                                    {(value === undefined || value === null) ? 'N/A' : value + "/10"}
                                  </span>
                                </div>
                                <Progress value={value ? (value <= 1 ? value * 100 : value * 10) : 0} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Info */}
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Session Info</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-medium capitalize">{reportData.status}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Interview ID</p>
                            <p className="font-medium font-mono text-xs">{reportData.interview_id}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download Report
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Premium Tab Content */}
                <TabsContent value="premium">
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    {!isPremiumUser ? (
                      // Locked State - Show Upgrade Prompt
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mx-auto mb-6 flex items-center justify-center">
                          <Crown className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Unlock Premium Insights</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Elite members get access to video replay, timestamped improvement suggestions, 
                          and detailed AI coaching feedback.
                        </p>
                        <div className="bg-muted/30 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                          <h3 className="font-semibold mb-3">Premium Report includes:</h3>
                          <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <Play className="w-4 h-4 text-primary" />
                              Full video replay of your interview
                            </li>
                            <li className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-primary" />
                              Detailed question-by-question feedback
                            </li>
                            <li className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-primary" />
                              Strengths & areas for improvement analysis
                            </li>
                            <li className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary" />
                              Personalized improvement advice
                            </li>
                          </ul>
                        </div>
                        <Button 
                          size="lg" 
                          className="gradient-primary"
                          onClick={handleUpgradeToElite}
                          disabled={isChangingPlan}
                        >
                          {isChangingPlan ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Crown className="w-4 h-4 mr-2" />
                              Upgrade to Elite
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      // Unlocked Premium Content
                      <div className="space-y-6 pr-4">
                        {/* Video Replay */}
                        {reportData.video_url && (
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <Video className="h-5 w-5 text-primary" />
                              Video Replay
                            </h3>
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                              <video 
                                src={reportData.video_url} 
                                controls 
                                className="w-full h-full"
                                poster=""
                              >
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          </div>
                        )}

                        {!reportData.video_url && (
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <Video className="h-5 w-5 text-primary" />
                              Video Replay
                            </h3>
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-4 flex items-center justify-center">
                                  <Play className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-muted-foreground">Video not available for this session</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Questions Breakdown */}
                        {reportData.questions && reportData.questions.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              <MessageSquare className="h-5 w-5 text-primary" />
                              Questions & Feedback
                            </h3>
                            <div className="space-y-4">
                              {reportData.questions.map((q, index) => (
                                <div key={q.question_id || index} className="border rounded-lg p-4 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium flex-1">
                                      Q{q.question_id || index + 1}: {q.question_text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {q.duration_sec && (
                                        <span className="text-xs text-muted-foreground">
                                          {formatDuration(q.duration_sec)}
                                        </span>
                                      )}
                                      <Badge variant={q.answered ? "secondary" : "outline"}>
                                        {q.answered ? formatScore(q.score) : "Skipped"}
                                      </Badge>
                                    </div>
                                  </div>
                                  {q.answer_text && (
                                    <div className="bg-muted/50 p-3 rounded text-sm">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Your Answer:</p>
                                      <p>{q.answer_text}</p>
                                    </div>
                                  )}
                                  {q.feedback && (
                                    <p className="text-sm text-muted-foreground">
                                      <span className="font-medium">Feedback:</span> {q.feedback}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strengths & Areas for Improvement */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reportData.strengths && reportData.strengths.length > 0 && (
                            <div className="border border-secondary/50 bg-secondary/5 rounded-lg p-4">
                              <h4 className="font-semibold text-secondary mb-2">Strengths</h4>
                              <ul className="space-y-1 text-sm">
                                {reportData.strengths.map((strength, idx) => (
                                  <li key={idx}>• {strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {reportData.areas_for_improvement && reportData.areas_for_improvement.length > 0 && (
                            <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4">
                              <h4 className="font-semibold text-destructive mb-2">Areas to Improve</h4>
                              <ul className="space-y-1 text-sm">
                                {reportData.areas_for_improvement.map((area, idx) => (
                                  <li key={idx}>• {area}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Improvement Advice */}
                        {reportData.improvement_advice && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <BookOpen className="h-5 w-5 text-primary" />
                              Improvement Advice
                            </h4>
                            <p className="text-sm whitespace-pre-line">{reportData.improvement_advice}</p>
                          </div>
                        )}

                        {/* Generated At */}
                        {reportData.generated_at && (
                          <p className="text-xs text-muted-foreground text-center">
                            Report generated on {new Date(reportData.generated_at).toLocaleString()}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" className="flex-1">
                            <Download className="h-4 w-4 mr-2" />
                            Download Report
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Failed to load report data</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => selectedSessionReport && loadInterviewReport(selectedSessionReport.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Session Preview Sheet */}
      <Sheet open={sessionPreviewSheetOpen} onOpenChange={(open) => !open && handleCloseSessionPreview()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {selectedSessionPreview?.title}
            </SheetTitle>
            <SheetDescription>Review session details before starting your interview</SheetDescription>
          </SheetHeader>
          
          {selectedSessionPreview && (
            <ScrollArea className="h-[calc(100vh-200px)] mt-6">
              <div className="space-y-6 pr-4">
                {/* Session Overview Card */}
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedSessionPreview.duration} min
                    </Badge>
                    <Badge className={getDifficultyColor(selectedSessionPreview.difficulty)}>
                      {selectedSessionPreview.difficulty}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedSessionPreview.category}
                    </Badge>
                  </div>
                  
                  <div>
                    {selectedSessionPreview.topic && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-background rounded-lg">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Topic</p>
                          <p className="text-sm font-semibold">{selectedSessionPreview.topic}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Outcome */}
                {selectedSessionPreview.session_outcome && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Expected Outcome
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedSessionPreview.session_outcome}</p>
                  </div>
                )}

                {/* Session Config Details */}
                {selectedSessionPreview.session_config && (
                  <>
                    {/* Objectives */}
                    {selectedSessionPreview.session_config.objectives && selectedSessionPreview.session_config.objectives.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-primary" />
                          Session Objectives
                        </h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {selectedSessionPreview.session_config.objectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span>• {obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evaluation Dimensions */}
                    {selectedSessionPreview.session_config.evaluation_dimensions && selectedSessionPreview.session_config.evaluation_dimensions.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          Evaluation Criteria
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSessionPreview.session_config.evaluation_dimensions.map((dim, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {dim}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Question Types */}
                    {selectedSessionPreview.session_config.question_type && selectedSessionPreview.session_config.question_type.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-primary" />
                          Question Types
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSessionPreview.session_config.question_type.map((type, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purposes */}
                    {selectedSessionPreview.session_config.purposes && selectedSessionPreview.session_config.purposes.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Focus Areas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSessionPreview.session_config.purposes.map((purpose, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-primary/10 text-primary">
                              {purpose}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Start Interview Button - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
            <Button 
              className="w-full gradient-primary text-lg py-6"
              onClick={handleStartInterview}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Start Mock Interview
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Interview Preparation Dashboard</h1>
            <p className="text-muted-foreground">Manage your target jobs and track your preparation progress</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-refresh indicator */}
            {hasUnreadyPlans && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                <RefreshCw className={`h-4 w-4 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
                <span>Auto-updating...</span>
              </div>
            )}
            <Dialog open={addJobModalOpen} onOpenChange={setAddJobModalOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gradient-primary shadow-glow"
                disabled={targetJobs.length === 3}>
                  
                  {targetJobs.length === 3 ? 
                  "Reach the limit"
                  :
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Add Target Job
                  </>
                  }
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Target Job</DialogTitle>
                  <DialogDescription>Enter details for your target job position</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input 
                      id="jobTitle" 
                      placeholder="e.g., Senior Product Manager" 
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input 
                      id="company" 
                      placeholder="e.g., Google" 
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description</Label>
                    <Textarea 
                      id="jobDescription" 
                      placeholder="Paste the job description here..." 
                      rows={4} 
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setAddJobModalOpen(false)}
                    disabled={isCreatingPlan}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="gradient-primary" 
                    onClick={handleCreateTrainingPlan}
                    disabled={isCreatingPlan}
                  >
                    {isCreatingPlan ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Plan"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Target Jobs Navigation */}
        <Tabs value={selectedJob} onValueChange={setSelectedJob} className="mb-8">
          <TabsList className="inline-flex w-full lg:w-auto overflow-x-auto mb-6 gap-2">
            {targetJobs.map((job) => {
              const statusInfo = getStatusDisplay(job.status);
              const StatusIcon = statusInfo.icon;
              const isReady = job.status === "active";
              
              return (
                <TabsTrigger key={job.id} value={job.id} className="gap-2 relative">
                  <Target className="h-4 w-4" />
                  {job.title}
                  {!isReady && (
                    <StatusIcon className={`h-3 w-3 ml-1 ${job.status === "processing" || job.status === "generating" || job.status === "pending" ? 'animate-spin' : ''}`} />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {targetJobs.map((job) => {
            const plan = trainingPlans.find((p) => p.id.toString() === job.id);
            const sessions = plan ? getAISessions(plan) : [];
            const statusInfo = getStatusDisplay(job.status);
            const StatusIcon = statusInfo.icon;
            const isPlanReady = job.status === "active";
            
            return (
              <TabsContent key={job.id} value={job.id} className="space-y-6">
                {/* Status Banner for non-ready plans */}
                {!isPlanReady && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-primary">Generating Your Training Plan</h3>
                          <p className="text-sm text-muted-foreground">
                            We're creating a personalized interview preparation plan for you. This usually takes 1-2 minutes.
                          </p>
                        </div>
                        <Badge variant={statusInfo.variant} className="gap-1">
                          <StatusIcon className={`h-3 w-3 ${job.status !== "active" && job.status !== "error" ? 'animate-spin' : ''}`} />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      {plan?.progress !== undefined && plan.progress > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Generation Progress</span>
                            <span className="font-medium">{plan.progress}%</span>
                          </div>
                          <Progress value={plan.progress} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Job Overview Card */}
                <Card className={`shadow-card ${!isPlanReady ? 'opacity-75' : ''}`}>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-2xl">{job.title}</CardTitle>
                            <Badge variant={statusInfo.variant} className="gap-1">
                              <StatusIcon className={`h-3 w-3 ${job.status !== "active" && job.status !== "error" ? 'animate-spin' : ''}`} />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {job.company && (
                            <CardDescription className="text-base mt-1">at {job.company}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="text-center">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">Interview Date</span>
                          </div>
                          <p className="font-semibold">{new Date(job.interviewDate).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">{daysUntilInterview} days away</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openDeleteDialog(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Success Rate Gauge */}
                      <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg">
                        <div className="relative w-32 h-32 mb-4">
                          <svg className="transform -rotate-90 w-32 h-32">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-muted"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 56}`}
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - job.successRate / 100)}`}
                              className="text-primary transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isPlanReady ? (
                              <span className="text-3xl font-bold">{job.successRate}%</span>
                            ) : (
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-center">Overall Success Rate</p>
                      </div>

                      {/* Category Scores */}
                      <div className="md:col-span-2 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Category Breakdown
                        </h3>
                        {!isPlanReady ? (
                          <div className="flex items-center gap-3 text-muted-foreground py-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Analyzing your profile and generating categories...</span>
                          </div>
                        ) : job.categoryScores.length > 0 ? (
                          job.categoryScores.map((category) => (
                            <div key={category.category} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">{category.category}</span>
                                <span className="text-sm font-semibold">{category.score}%</span>
                              </div>
                              <Progress value={category.score} className="h-2" />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Complete AI sessions to see your category breakdown
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-secondary" />
                          Overall Preparation Progress
                        </span>
                        <span className="text-sm font-semibold">{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-3" />
                    </div>

                    {/* Summary from API */}
                    {plan?.summary && (
                      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <h4 className="font-semibold mb-2">AI Analysis</h4>
                        <p className="text-sm text-muted-foreground">{plan.summary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Sessions Grid */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Brain className="h-6 w-6 text-primary" />
                    AI Mock Interview Sessions
                    {!isPlanReady && (
                      <Badge variant="outline" className="ml-2 gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating
                      </Badge>
                    )}
                  </h2>
                  {!isPlanReady ? (
                    <Card className="shadow-card">
                      <CardContent className="text-center py-12">
                        <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                        <p className="text-muted-foreground font-medium">Generating your personalized interview sessions...</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Our AI is analyzing the job requirements and creating targeted practice sessions for you.
                        </p>
                      </CardContent>
                    </Card>
                  ) : sessions.filter((s) => s.status === "pending" ).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sessions
                          .filter((s) => s.status === "pending")
                          .map((session) => (
                        <Card key={session.id} className="shadow-card hover:shadow-glow transition-smooth">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{session.title}</CardTitle>
                                <CardDescription className="mt-1">{session.category}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {session.duration} min
                              </span>
                              <Badge className={getDifficultyColor(session.difficulty)}>
                                {session.difficulty}
                              </Badge>
                            </div>
                            
                            {session.status === "pending" && (
                              <Button 
                                className="w-full gradient-primary"
                                onClick={() => handleOpenSessionPreview(session)}
                              >
                                Start Session
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="shadow-card">
                      <CardContent className="text-center py-12">
                        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No AI sessions available yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Your personalized training plan is being generated
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Past Sessions History */}
                <Card className={`shadow-card ${!isPlanReady ? 'opacity-75' : ''}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Practice History
                    </CardTitle>
                    <CardDescription>Review your completed sessions and track improvements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sessions.filter((s) => s.status === "completed" ).length > 0 ? (
                      <div className="space-y-3">
                        {sessions
                          .filter((s) => s.status === "completed")
                          .map((session) => (
                            <div
                              key={session.id}
                              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-smooth"
                            >
                              <div className="flex-1">
                                <p className="font-semibold">{session.title}</p>
                                <p className="text-sm text-muted-foreground">{session.category} • Completed</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-primary/10">
                                  {formatScore(session.score)}
                                </Badge>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleOpenReport(session)}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Video className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleOpenSessionPreview(session)}
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No completed sessions yet</p>
                        <p className="text-sm mt-1">
                          {isPlanReady ? "Start practicing to build your history" : "Sessions will appear once your plan is ready"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Focus Areas from API */}
                {isPlanReady && plan?.focus_areas && plan.focus_areas.length > 0 && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-6 w-6 text-primary" />
                        Recommended Focus Areas
                      </CardTitle>
                      <CardDescription>Areas to prioritize in your preparation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {plan.focus_areas.map((area: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{area.name || area.dimension}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{area.reason}</p>
                              </div>
                              <Badge variant={area.score < 0.5 ? "destructive" : "secondary"}>
                                {Math.round(area.score)}%
                              </Badge>
                            </div>
                            {area.recommended_resources && area.recommended_resources.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Resources:</p>
                                <ul className="text-xs space-y-1">
                                  {area.recommended_resources.map((resource: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-1">
                                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>{resource}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default InterviewPrep;