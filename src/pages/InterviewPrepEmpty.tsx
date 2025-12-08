import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { InterviewService } from "../services";
import { useToast } from "@/components/ui/use-toast";

const InterviewPrepEmpty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");

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

  const handleGetStarted = () => {
    // After completing setup, navigate to the main dashboard
    navigate("/interview-prep");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
            Upload your profile and add your target job to receive a personalized interview plan, AI sessions, and
            mentor recommendations.
          </p>
        </div>

        {/* Setup Actions */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Profile Card */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
              <DialogTrigger asChild>
                <Card className="shadow-card hover:shadow-glow transition-smooth cursor-pointer group">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-smooth">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Upload Your Profile</CardTitle>
                    <CardDescription>
                      Share your resume or profile to get personalized recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full group-hover:border-primary transition-smooth">
                      Upload Now
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
                    </Button>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Upload Your Profile</DialogTitle>
                  <DialogDescription>
                    Upload your resume or profile document to help us create a personalized preparation plan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary transition-smooth cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX (Max 10MB)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">or</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileUrl">Import from LinkedIn</Label>
                    <Input id="profileUrl" placeholder="Paste your LinkedIn profile URL" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="gradient-primary" onClick={handleGetStarted}>
                    Continue
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Target Job Card */}
            <Dialog open={addJobModalOpen} onOpenChange={setAddJobModalOpen}>
              <DialogTrigger asChild>
                <Card className="shadow-card hover:shadow-glow transition-smooth cursor-pointer group border-2 border-primary/50">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-smooth shadow-glow">
                      <Target className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle>Add Target Job</CardTitle>
                    <CardDescription>Set your target position to generate a custom preparation plan</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button className="w-full gradient-primary shadow-glow">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-smooth" />
                    </Button>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Your Target Job</DialogTitle>
                  <DialogDescription>Tell us about the position you're preparing for</DialogDescription>
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
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        You can manage multiple target jobs once your first setup is complete. Each job gets its own
                        personalized preparation plan.
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setAddJobModalOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="gradient-primary" 
                    onClick={handleCreateTrainingPlan}
                    disabled={isLoading}
                  >
                    {isLoading ? "Generating..." : "Generate Plan"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-glow">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      Upload Your Profile
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Share your resume or LinkedIn profile so we can understand your background and tailor
                      recommendations.
                    </p>
                  </div>
                </div>

                <div className="ml-5 border-l-2 border-dashed border-muted h-6"></div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-glow">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      Add Your Target Job
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tell us about the role you're targeting. Include job description, interview date, and prep time
                      for a custom plan.
                    </p>
                  </div>
                </div>

                <div className="ml-5 border-l-2 border-dashed border-muted h-6"></div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold shadow-glow">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
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
                <Dialog open={addJobModalOpen} onOpenChange={setAddJobModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gradient-primary shadow-glow">
                      <Target className="mr-2 h-5 w-5" />
                      Begin Setup
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrepEmpty;