import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { usePostHog } from "posthog-js/react";
import { safeCapture } from "@/utils/posthog";
import {
  Upload,
  Target,
  Brain,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { InterviewService, ProfileService } from "../services";
import { useToast } from "@/components/ui/use-toast";
import ResumeAnalysisDialog from "@/components/profile/ResumeAnalysisDialog";

const InterviewPrepEmpty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const posthog = usePostHog();
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile state
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Check if user has profile on mount
  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await ProfileService.getProfile();
      const profileDataResponse = response.data?.data || response.data;
      
      if (profileDataResponse && profileDataResponse.structured_resume) {
        setHasProfile(true);
      } else {
        setHasProfile(false);
      }
    } catch (error) {
      console.error("Error checking profile:", error);
      setHasProfile(false);
    } finally {
      setIsLoadingProfile(false);
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

    setIsLoading(true);
    try {
      const response = await InterviewService.createTrainingPlan({
        jobTitle,
        company: company || undefined,
        jobDescription,
      });

      if (response.data.status === "success" || response.data.data) {
        // Track training plan creation event
        safeCapture(posthog, 'training_plan_created', {
          job_title: jobTitle,
          company: company || null,
          has_job_description: !!jobDescription,
        });
        
        toast({
          title: "Success!",
          description: "Your training plan has been created successfully.",
        });
        
        // Navigate to the main interview prep page
        navigate("/interview-prep");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create training plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadResumeClick = () => {
    // Navigate to profile page for resume upload
    navigate("/profile");
  };

  // Show loading state while checking profile
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
          <div className="inline-block mb-6">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full"></div>
              <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-8 rounded-full">
                <Target className="h-20 w-20 text-primary" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Start Your Interview Preparation Journey
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {hasProfile 
              ? "Add your target job to receive a personalized interview plan, AI sessions, and mentor recommendations."
              : "Upload your profile and add your target job to receive a personalized interview plan, AI sessions, and mentor recommendations."
            }
          </p>
        </div>

        {/* Setup Actions */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className={`grid grid-cols-1 ${!hasProfile ? 'md:grid-cols-2' : ''} gap-6 ${hasProfile ? 'max-w-md mx-auto' : ''}`}>
            {/* Upload Profile Card - Only show if user doesn't have profile */}
            {!hasProfile && (
              <Card 
                className="shadow-card hover:shadow-glow transition-smooth cursor-pointer group"
                onClick={handleUploadResumeClick}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-smooth">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Upload Your Resume</CardTitle>
                  <CardDescription>
                    Share your resume to get personalized recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="w-full group-hover:border-primary transition-smooth">
                    Upload Now
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Add Target Job Card */}
            <Card
              className={`shadow-card hover:shadow-glow transition-smooth cursor-pointer group border-2 border-primary/50 ${!hasProfile ? 'opacity-60 pointer-events-none' : ''}`}
              onClick={() => hasProfile && setAddJobModalOpen(true)}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-smooth shadow-glow">
                  <Target className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle>Add Target Job</CardTitle>
                <CardDescription>
                  {hasProfile
                    ? "Set your target position to generate a custom preparation plan"
                    : "Upload your resume first to unlock this feature"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  className="w-full gradient-primary shadow-glow"
                  disabled={!hasProfile}
                >
                  {hasProfile ? "Get Started" : "Resume Required"}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
                </Button>
              </CardContent>
            </Card>
            <ResumeAnalysisDialog
              open={addJobModalOpen}
              onOpenChange={setAddJobModalOpen}
              skipAnalyzing
            />
          </div>

          {/* Helper text when user doesn't have profile */}
          {!hasProfile && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Please upload your resume first to create a personalized training plan
            </p>
          )}
        </div>

        {/* Feature Preview Section */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">What You'll Get Access To</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* AI Mock Interviews */}
            <Card className="shadow-card text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">AI Mock Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Simulate real interview questions across multiple categories and receive instant, detailed feedback
                  powered by advanced AI.
                </p>
              </CardContent>
            </Card>

            {/* Progress Dashboard */}
            <Card className="shadow-card text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                  <BarChart3 className="h-7 w-7 text-secondary" />
                </div>
                <CardTitle className="text-xl">Progress Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Track your readiness and improvement over time with detailed analytics, success rates, and
                  category-level breakdowns.
                </p>
              </CardContent>
            </Card>

            {/* Mentor Network */}
            <Card className="shadow-card text-center">
              <CardHeader>
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="h-7 w-7 text-accent" />
                </div>
                <CardTitle className="text-xl">Mentor Network</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Get 1-on-1 coaching from experienced professionals in your target field who've been through the
                  interview process.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Onboarding Steps */}
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-card border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Get Started in 3 Simple Steps</CardTitle>
              <CardDescription>Your personalized preparation plan is just minutes away</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${hasProfile ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground shadow-glow'}`}>
                    {hasProfile ? <CheckCircle2 className="h-5 w-5" /> : "1"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      Upload Your Resume
                      {hasProfile && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hasProfile 
                        ? "Your resume has been uploaded and processed."
                        : "Share your resume so we can understand your background and tailor recommendations."
                      }
                    </p>
                    {!hasProfile && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleUploadResumeClick}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Resume
                      </Button>
                    )}
                  </div>
                </div>

                <div className="ml-5 border-l-2 border-dashed border-muted h-6"></div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${hasProfile ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-muted text-muted-foreground'}`}>
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 flex items-center gap-2 ${!hasProfile ? 'text-muted-foreground' : ''}`}>
                      Add Your Target Job
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tell us about the role you're targeting. Include job description, interview date, and prep time
                      for a custom plan.
                    </p>
                    {hasProfile && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setAddJobModalOpen(true)}
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Add Target Job
                      </Button>
                    )}
                  </div>
                </div>

                <div className="ml-5 border-l-2 border-dashed border-muted h-6"></div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-muted-foreground">
                      Start Your First AI Session
                      <Sparkles className="h-4 w-4 text-secondary" />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Begin with an AI mock interview tailored to your target role. Get instant feedback and track your
                      progress.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                {hasProfile ? (
                  <Button 
                    size="lg" 
                    className="gradient-primary shadow-glow"
                    onClick={() => setAddJobModalOpen(true)}
                  >
                    <Target className="mr-2 h-5 w-5" />
                    Add Target Job
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    className="gradient-primary shadow-glow"
                    onClick={handleUploadResumeClick}
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Resume to Begin
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrepEmpty;