import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Briefcase,
  Plus,
  Check,
  Target,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getJobTitleRecommendations } from "@/services/ProfileServices";
import { createTrainingPlan } from "@/services/InterviewServices";

interface RecommendedJob {
  job_title: string;
  match_percentage: number;
  reason: string;
  key_requirements: string[];
}

interface ResumeAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
  /** Skip the "analyzing" step and go straight to fetching recommendations */
  skipAnalyzing?: boolean;
  /** Callback when a training plan is successfully created (instead of navigating) */
  onPlanCreated?: () => void;
}

const ResumeAnalysisDialog = ({ open, onOpenChange, fileName, skipAnalyzing, onPlanCreated }: ResumeAnalysisDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<"analyzing" | "select" | "customize">(skipAnalyzing ? "select" : "analyzing");
  const [selectedJob, setSelectedJob] = useState<RecommendedJob | null>(null);
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [customJobDescription, setCustomJobDescription] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Fetch job recommendations when dialog opens
  useEffect(() => {
    if (open) {
      const initialStep = skipAnalyzing ? "select" : "analyzing";
      setStep(initialStep);
      if (initialStep === "analyzing" || skipAnalyzing) {
        fetchRecommendations();
      }
    }
  }, [open]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getJobTitleRecommendations();
      const data = response.data?.data;
      if (data?.recommendations && data.recommendations.length > 0) {
        setRecommendedJobs(data.recommendations);
        setStep("select");
      } else {
        setRecommendedJobs([]);
        setStep("select");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to get recommendations. Please try again.");
      setStep("select");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectJob = (job: RecommendedJob) => {
    setSelectedJob(job);
    setCustomJobTitle(job.job_title);
    setCustomJobDescription(job.key_requirements.join(", "));
    setStep("customize");
  };

  const handleAddCustomJob = () => {
    setIsAddingCustom(true);
    setSelectedJob(null);
    setCustomJobTitle("");
    setCustomJobDescription("");
    setStep("customize");
  };

  const handleConfirm = async () => {
    if (!customJobTitle.trim()) {
      toast({
        title: "Job title required",
        description: "Please enter a job title to continue",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPlan(true);
    try {
      await createTrainingPlan({
        jobTitle: customJobTitle.trim(),
        company: "",
        jobDescription: customJobDescription.trim(),
      });

      toast({
        title: "Training Plan Created!",
        description: `"${customJobTitle}" has been added to your Interview Prep`,
      });

      onOpenChange(false);

      if (onPlanCreated) {
        onPlanCreated();
      } else {
        setTimeout(() => {
          navigate("/interview-prep");
        }, 500);
      }
    } catch (err: any) {
      toast({
        title: "Failed to create training plan",
        description: err?.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleBack = () => {
    if (step === "customize") {
      setStep("select");
      setIsAddingCustom(false);
    }
  };

  const resetDialog = () => {
    setStep(skipAnalyzing ? "select" : "analyzing");
    setSelectedJob(null);
    setCustomJobTitle("");
    setCustomJobDescription("");
    setIsAddingCustom(false);
    setRecommendedJobs([]);
    setError(null);
    setIsLoading(false);
    setIsCreatingPlan(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetDialog();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === "analyzing" && "Analyzing Your Resume..."}
            {step === "select" && "Recommended Positions"}
            {step === "customize" && "Customize Your Target Job"}
          </DialogTitle>
          <DialogDescription>
            {step === "analyzing" && `Processing ${fileName || "your resume"} to find the best job matches`}
            {step === "select" && "Based on your experience, we recommend these positions for your interview prep"}
            {step === "customize" && "Customize your target job details"}
          </DialogDescription>
        </DialogHeader>

        {/* Analyzing State */}
        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium">AI is analyzing your resume</p>
              <p className="text-sm text-muted-foreground">Extracting skills, experience, and matching job positions...</p>
            </div>
          </div>
        )}

        {/* Select Job Step */}
        {step === "select" && (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {/* Custom Job Button - at the top */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleAddCustomJob}
              >
                <Plus className="w-4 h-4" />
                Add Custom Job Title
              </Button>

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading recommendations...</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!error && !isLoading && recommendedJobs.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-muted-foreground">No recommendations found.</p>
                  <p className="text-sm text-muted-foreground">You can add a custom job title above.</p>
                </div>
              )}

              {!isLoading && recommendedJobs.length > 0 && (
                <Separator className="my-2" />
              )}

              {recommendedJobs.map((job, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => handleSelectJob(job)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold">{job.job_title}</h4>
                        </div>
                        {job.reason && (
                          <p className="text-sm text-muted-foreground">{job.reason}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {job.key_requirements.map((req, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-primary">
                          <Target className="w-4 h-4" />
                          <span className="font-bold">{job.match_percentage}%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Match</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Customize Step */}
        {step === "customize" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Senior Product Manager"
                value={customJobTitle}
                onChange={(e) => setCustomJobTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the job description here to get more personalized prep..."
                value={customJobDescription}
                onChange={(e) => setCustomJobDescription(e.target.value)}
                rows={4}
              />
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1" disabled={isCreatingPlan}>
                Back
              </Button>
              <Button onClick={handleConfirm} className="flex-1 gap-2" disabled={isCreatingPlan}>
                {isCreatingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add to Training Plan
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResumeAnalysisDialog;
