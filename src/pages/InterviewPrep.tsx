import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { InterviewService } from "@/services";

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
}

interface AISession {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  duration: number;
  completed: boolean;
  score?: number;
  persona?: string;
  topic?: string;
  reportId?: string;
}

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
  
  // Form state for creating new job
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Load training plans on mount
  useEffect(() => {
    loadTrainingPlans();
  }, []);

  // Set first job as selected when plans load
  useEffect(() => {
    if (trainingPlans.length > 0 && !selectedJob) {
      setSelectedJob(trainingPlans[0].id.toString());
    }
  }, [trainingPlans]);

  const loadTrainingPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const response = await InterviewService.getTrainingPlans();
      
      // Debug: Log the full response to see structure
      console.log("API Response:", response);
      console.log("Response data:", response.data);
      
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
          navigate("/interview-prep-empty");
        } else {
          console.log(`Loaded ${plansData.length} training plans`);
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
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load training plans. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

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
          description: "Your training plan has been created successfully.",
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

  // Transform API modules to AI sessions format
  const getAISessions = (plan: any): AISession[] => {
    if (!plan?.modules) return [];
    
    return plan.modules.map((module: any) => ({
      id: module.module_id || module.id,
      title: module.title,
      category: module.category,
      difficulty: module.difficulty,
      duration: module.duration_minutes || 30,
      completed: module.status === "completed",
      score: module.score ? Math.round(module.score * 100) : undefined,
      persona: module.persona,
      topic: module.topic,
      reportId: module.report_id,
    }));
  };

  // Calculate category scores from focus areas
  const getCategoryScores = (plan: any) => {
    if (!plan?.focus_areas) return [];
    
    return plan.focus_areas.map((area: any) => ({
      category: area.name || area.dimension,
      score: Math.round((area.score || 0) * 100),
    }));
  };

  // Calculate overall success rate from focus areas
  const calculateSuccessRate = (plan: any): number => {
    if (!plan?.focus_areas || plan.focus_areas.length === 0) return 0;
    
    const avgScore = plan.focus_areas.reduce((sum: number, area: any) => sum + (area.score || 0), 0) / plan.focus_areas.length;
    return Math.round(avgScore * 100);
  };

  // Calculate overall progress based on completed modules
  const calculateProgress = (plan: any): number => {
    if (!plan?.modules || plan.modules.length === 0) return 0;
    
    const completedModules = plan.modules.filter((m: any) => m.status === "completed").length;
    return Math.round((completedModules / plan.modules.length) * 100);
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
  }));

  const currentJob = targetJobs.find((job) => job.id === selectedJob);
  const currentPlan = trainingPlans.find((plan) => plan.id.toString() === selectedJob);
  const aiSessions = currentPlan ? getAISessions(currentPlan) : [];
  
  const daysUntilInterview = currentJob
    ? Math.ceil((new Date(currentJob.interviewDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
          <Button onClick={() => navigate("/interview-prep-empty")} className="gradient-primary">
            <Plus className="mr-2 h-5 w-5" />
            Create Training Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Interview Preparation Dashboard</h1>
            <p className="text-muted-foreground">Manage your target jobs and track your preparation progress</p>
          </div>
          <Dialog open={addJobModalOpen} onOpenChange={setAddJobModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gradient-primary shadow-glow">
                <Plus className="mr-2 h-5 w-5" />
                Add Target Job
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

        {/* Target Jobs Navigation */}
        <Tabs value={selectedJob} onValueChange={setSelectedJob} className="mb-8">
          <TabsList className="inline-flex w-full lg:w-auto overflow-x-auto mb-6 gap-2">
            {targetJobs.map((job) => (
              <TabsTrigger key={job.id} value={job.id} className="gap-2">
                <Target className="h-4 w-4" />
                {job.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {targetJobs.map((job) => {
            const plan = trainingPlans.find((p) => p.id.toString() === job.id);
            const sessions = plan ? getAISessions(plan) : [];
            
            return (
              <TabsContent key={job.id} value={job.id} className="space-y-6">
                {/* Job Overview Card */}
                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <CardTitle className="text-2xl">{job.title}</CardTitle>
                        {job.company && (
                          <CardDescription className="text-base mt-1">at {job.company}</CardDescription>
                        )}
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
                            <span className="text-3xl font-bold">{job.successRate}%</span>
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
                        {job.categoryScores.length > 0 ? (
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
                  </h2>
                  {sessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sessions.map((session) => (
                        <Card key={session.id} className="shadow-card hover:shadow-glow transition-smooth">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{session.title}</CardTitle>
                                <CardDescription className="mt-1">{session.category}</CardDescription>
                              </div>
                              {session.completed && (
                                <Badge variant="secondary" className="bg-secondary/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {session.duration} min
                              </span>
                              <Badge variant="outline">{session.difficulty}</Badge>
                            </div>
                            {session.completed ? (
                              <div className="space-y-3">
                                {session.score !== undefined && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Score</span>
                                    <span className="text-2xl font-bold text-primary">{session.score}%</span>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setSelectedSessionReport(session)}
                                      >
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Report
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                                      <SheetHeader>
                                        <SheetTitle>{session.title} - Report</SheetTitle>
                                        <SheetDescription>Detailed breakdown of your session performance</SheetDescription>
                                      </SheetHeader>
                                      <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                                        <div className="space-y-6 pr-4">
                                          {/* Summary */}
                                          <div className="bg-muted/50 p-4 rounded-lg">
                                            <h3 className="font-semibold mb-3">Summary</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <p className="text-sm text-muted-foreground">Overall Score</p>
                                                <p className="text-2xl font-bold text-primary">{session.score}%</p>
                                              </div>
                                              <div>
                                                <p className="text-sm text-muted-foreground">Duration</p>
                                                <p className="text-xl font-semibold">{session.duration} min</p>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Video Replay */}
                                          <div>
                                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                              <Video className="h-5 w-5 text-primary" />
                                              Video Replay
                                            </h3>
                                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                              <div className="text-center">
                                                <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">Video playback coming soon</p>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Questions Breakdown */}
                                          <div>
                                            <h3 className="font-semibold mb-3">Questions & Feedback</h3>
                                            <div className="space-y-4">
                                              {[1, 2, 3].map((q) => (
                                                <div key={q} className="border rounded-lg p-4 space-y-2">
                                                  <div className="flex items-start justify-between">
                                                    <p className="font-medium">
                                                      Q{q}: Tell me about a challenging project you led
                                                    </p>
                                                    <Badge variant="secondary">85%</Badge>
                                                  </div>
                                                  <p className="text-sm text-muted-foreground">
                                                    Your answer demonstrated strong leadership skills...
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Strengths & Weaknesses */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="border border-secondary/50 bg-secondary/5 rounded-lg p-4">
                                              <h4 className="font-semibold text-secondary mb-2">Strengths</h4>
                                              <ul className="space-y-1 text-sm">
                                                <li>• Clear communication</li>
                                                <li>• Strong examples</li>
                                                <li>• Good structure</li>
                                              </ul>
                                            </div>
                                            <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4">
                                              <h4 className="font-semibold text-destructive mb-2">Areas to Improve</h4>
                                              <ul className="space-y-1 text-sm">
                                                <li>• Add more metrics</li>
                                                <li>• Expand on challenges</li>
                                                <li>• Include team impact</li>
                                              </ul>
                                            </div>
                                          </div>

                                          {/* Improvement Advice */}
                                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                              <BookOpen className="h-5 w-5 text-primary" />
                                              Improvement Advice
                                            </h4>
                                            <p className="text-sm">
                                              Focus on quantifying your impact with specific metrics. When discussing
                                              challenges, elaborate on the obstacles faced and how you overcame them.
                                            </p>
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
                                    </SheetContent>
                                  </Sheet>
                                  <Button variant="outline" size="sm" className="flex-1">
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Retake
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button className="w-full gradient-primary">
                                <PlayCircle className="h-4 w-4 mr-2" />
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
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Practice History
                    </CardTitle>
                    <CardDescription>Review your completed sessions and track improvements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sessions.filter((s) => s.completed).length > 0 ? (
                      <div className="space-y-3">
                        {sessions
                          .filter((s) => s.completed)
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
                                  {session.score}%
                                </Badge>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Video className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
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
                        <p className="text-sm mt-1">Start practicing to build your history</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Focus Areas from API */}
                {plan?.focus_areas && plan.focus_areas.length > 0 && (
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
                                {Math.round(area.score * 100)}%
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