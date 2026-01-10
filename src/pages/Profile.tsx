import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Briefcase,
  Target,
  Award,
  Shield,
  Loader2,
  Sparkles,
  Info,
  CheckCircle2,
  Users,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileService } from "../services";
import {
  VISA_STATUS_OPTIONS,
} from "@/types/profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProfileData {
  profile: {
    full_name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    visa_status: string;
    website: string;
    summary: string;
    total_years_experience: number;
  };
  job_titles: string[];
  skills: any[];
  experience: any[];
  education: any[];
  certifications: any[];
  projects: any[];
  links: {
    linkedin: string;
    github: string;
    website: string;
    other: string[];
  };
}

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasProfileData, setHasProfileData] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  // Modal states
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showVisaStatusDialog, setShowVisaStatusDialog] = useState(false);
  const [pastedText, setPastedText] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await ProfileService.getProfile();
      
      const profileDataResponse = response.data?.data || response.data;
      
      if (profileDataResponse && profileDataResponse.structured_resume) {
        setProfileData(profileDataResponse.structured_resume);
        setHasProfileData(true);
        // If profile exists with visa status, redirect to completed page
        if (profileDataResponse.structured_resume.profile.visa_status) {
          navigate('/profile_completed');
        }
      } else {
        setHasProfileData(false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setHasProfileData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      toast({
        title: "Processing resume...",
        description: "AI is extracting information from your resume.",
      });

      const response = await ProfileService.uploadResume(file);
      const structuredResume = response.data?.data?.structured_resume || response.data?.structured_resume;
      
      if (structuredResume) {
        setProfileData(structuredResume);
        setHasProfileData(true);

        // Check if visa status is missing and prompt user
        if (!structuredResume.profile.visa_status) {
          setShowVisaStatusDialog(true);
          toast({
            title: "Resume parsed successfully!",
            description: "Please complete your work authorization status.",
          });
        } else {
          // Visa status exists, save profile and navigate
          try {
            await ProfileService.updateProfile(structuredResume);
            toast({
              title: "Profile saved successfully!",
              description: "Your profile has been created.",
            });
            navigate('/profile_completed');
          } catch (saveError) {
            console.error("Error saving profile:", saveError);
            toast({
              title: "Resume parsed but save failed",
              description: "Please try saving again.",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "Warning",
          description: "Resume uploaded but no data was extracted. Please add information manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error processing resume",
        description: "Please try again or add information manually.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePasteText = async () => {
    if (!pastedText.trim()) return;

    try {
      setUploading(true);
      toast({
        title: "Processing text...",
        description: "AI is extracting information from your resume text.",
      });

      const response = await ProfileService.parseResumeText(pastedText);
      const structuredResume = response.data?.data?.structured_resume || response.data?.structured_resume;
      
      if (structuredResume) {
        setProfileData(structuredResume);
        setHasProfileData(true);
        setShowPasteDialog(false);
        setPastedText("");

        // Check if visa status is missing and prompt user
        if (!structuredResume.profile.visa_status) {
          setShowVisaStatusDialog(true);
          toast({
            title: "Resume parsed successfully!",
            description: "Please complete your work authorization status.",
          });
        } else {
          // Visa status exists, save profile and navigate
          try {
            await ProfileService.updateProfile(structuredResume);
            toast({
              title: "Profile saved successfully!",
              description: "Your profile has been created.",
            });
            navigate('/profile_completed');
          } catch (saveError) {
            console.error("Error saving profile:", saveError);
            toast({
              title: "Resume parsed but save failed",
              description: "Please try saving again.",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "Warning",
          description: "Text processed but no data was extracted. Please try again or add information manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing text:", error);
      toast({
        title: "Error processing text",
        description: "Please try again or add information manually.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSkipVisaStatus = async () => {
    if (!profileData) return;

    try {
      setSaving(true);

      // Save the profile data to backend even without visa status
      await ProfileService.updateProfile(profileData);
      
      setShowVisaStatusDialog(false);
      
      toast({ 
        title: "Profile saved!",
        description: "You can add work authorization later in settings."
      });
      
      // Navigate to the completed profile page
      navigate('/profile_completed');
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVisaStatusSave = async () => {
    if (!profileData?.profile.visa_status) {
      toast({
        title: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
   
      // Save the profile data to backend
      await ProfileService.updateProfile(profileData);
      
      setShowVisaStatusDialog(false);
      
      toast({ 
        title: "Profile saved successfully!",
        description: "Your work authorization has been saved."
      });
      
      // Navigate to the completed profile page
      navigate('/profile_completed');
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const scrollToUploader = () => {
    document.getElementById("resume-uploader")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Show the upload/creation UI
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Create Your Profile</h1>
              <p className="text-muted-foreground mt-1">
                Get discovered by top employers with an AI-powered profile
              </p>
            </div>
            <Button variant="ghost" onClick={() => setShowTipsModal(true)}>
              <Info className="mr-2 w-4 h-4" />
              View Tips
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Why Create a Profile Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Why Create Your Profile?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Get Discovered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Top employers and recruiters can find you based on your skills and experience
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Match Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Receive personalized job matches tailored to your qualifications
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor your interview performance and skill development over time
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Upload Your Resume</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI instantly extracts your skills, experience, and qualifications
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Complete Work Authorization</h3>
                <p className="text-sm text-muted-foreground">
                  Provide your visa status to help employers understand your eligibility
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Review & Customize</h3>
                <p className="text-sm text-muted-foreground">
                  Verify the extracted information and add any additional details
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start Getting Matches</h3>
                <p className="text-sm text-muted-foreground">
                  Receive personalized job opportunities and recruiter inquiries
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resume Uploader */}
        <Card id="resume-uploader" className="mb-8 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              Upload Your Resume
            </CardTitle>
            <CardDescription>
              AI will automatically extract your skills, experience, and suggest relevant job titles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-all duration-200 cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10">
              <input
                type="file"
                id="resume-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-lg font-medium mb-2">Processing your resume...</p>
                    <p className="text-sm text-muted-foreground">This may take a few moments</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-medium mb-2">Drop your resume here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOC, DOCX • Max 5MB • English or bilingual supported
                    </p>
                  </>
                )}
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => document.getElementById("resume-upload")?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 w-4 h-4" />
                Choose File
              </Button>
              {/* <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowPasteDialog(true)}
                disabled={uploading}
              >
                <FileText className="mr-2 w-4 h-4" />
                Paste Text
              </Button> */}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Your files are processed securely and privately. You control what information to save.</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-1">10K+</div>
            <div className="text-sm text-muted-foreground">Active Profiles</div>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-1">500+</div>
            <div className="text-sm text-muted-foreground">Partner Companies</div>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <div className="text-2xl font-bold text-primary mb-1">95%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Tips Modal */}
      <Dialog open={showTipsModal} onOpenChange={setShowTipsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Tips</DialogTitle>
            <DialogDescription>Get the most out of your Screna AI profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Upload your resume first
              </h4>
              <p className="text-sm text-muted-foreground">
                Our AI will automatically extract your skills, experience, and suggest relevant job titles.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Complete your profile
              </h4>
              <p className="text-sm text-muted-foreground">
                Profiles with 80%+ completion get 3x more recruiter views.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Use STAR method for achievements
              </h4>
              <p className="text-sm text-muted-foreground">
                Structure your bullets with Situation, Task, Action, and Result for maximum impact.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste Resume Text Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste Resume Text</DialogTitle>
            <DialogDescription>
              Copy and paste your resume text here for AI extraction
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Paste your resume text here..."
            rows={12}
            className="font-mono text-sm"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={uploading}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handlePasteText} disabled={uploading || !pastedText.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Text"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visa Status Dialog */}
      <Dialog open={showVisaStatusDialog} onOpenChange={setShowVisaStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Work Authorization</DialogTitle>
            <DialogDescription>
              Please select your current work authorization status to help employers understand your eligibility
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work Authorization Status</Label>
              <Select
                value={profileData?.profile.visa_status}
                onValueChange={(value) => {
                  if (profileData) {
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, visa_status: value },
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your status" />
                </SelectTrigger>
                <SelectContent>
                  {VISA_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Shield className="w-4 h-4 inline mr-1" />
                This information helps match you with employers who can sponsor your work status
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleSkipVisaStatus}
              disabled={saving}
            >
              Skip for Now
            </Button>
            <Button onClick={handleVisaStatusSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;