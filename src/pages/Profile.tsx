import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Upload,
  FileText,
  Briefcase,
  Target,
  Award,
  Plus,
  Shield,
  Info,
  MapPin,
  GraduationCap,
  Folder,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { toast } = useToast();
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showSkillsDrawer, setShowSkillsDrawer] = useState(false);
  const [showExperienceDrawer, setShowExperienceDrawer] = useState(false);
  const [showTitleDrawer, setShowTitleDrawer] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showExamplesModal, setShowExamplesModal] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Resume ready to parse",
        description: "Your resume is being processed...",
      });
    }
  };

  const scrollToUploader = () => {
    document.getElementById("resume-uploader")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="text-muted-foreground mt-1">
                Upload your resume to auto-fill skills and experience. You can also add details manually.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowTipsModal(true)}>
                <Info className="mr-2 w-4 h-4" />
                View Tips
              </Button>
              <Button onClick={scrollToUploader}>
                <Upload className="mr-2 w-4 h-4" />
                Upload Resume
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Empty Summary Banner */}
        <Card className="mb-8 shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                  AC
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Alex Carter</h2>
                  <p className="text-muted-foreground italic">Your professional headline will appear here.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Email verified
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="w-3 h-3" />
                    Location not set
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Circle className="w-3 h-3" />
                    Work authorization not set
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Profile completeness</span>
                    <span className="text-muted-foreground">0%</span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload a resume to jump to 60%
                  </p>
                </div>

                <Button onClick={scrollToUploader} className="w-full sm:w-auto">
                  Upload Resume
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resume Uploader - Primary CTA */}
        <Card id="resume-uploader" className="mb-8 border-primary/20 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Upload your resume (PDF/DOC)
            </CardTitle>
            <CardDescription>
              Screna AI will extract your skills, experience and suggest job titles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-smooth cursor-pointer bg-gradient-hero">
              <input
                type="file"
                id="resume-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium mb-2">Drop your resume here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  PDF, DOC, DOCX • Max 5MB • English or bilingual supported
                </p>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => document.getElementById("resume-upload")?.click()}
              >
                <Upload className="mr-2 w-4 h-4" />
                Choose File
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowPasteDialog(true)}
              >
                <FileText className="mr-2 w-4 h-4" />
                Paste Text
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Files are processed locally in your session preview. You control what to save.</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start - Manual Add */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Quick Start (Manual Add)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can upload a resume later to enrich details.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:shadow-card transition-smooth cursor-pointer" onClick={() => setShowSkillsDrawer(true)}>
              <CardContent className="pt-6 text-center space-y-3">
                <Target className="w-10 h-10 mx-auto text-primary" />
                <h4 className="font-semibold">Add Skills Manually</h4>
                <p className="text-sm text-muted-foreground">Create skill chips with proficiency levels</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card transition-smooth cursor-pointer" onClick={() => setShowExperienceDrawer(true)}>
              <CardContent className="pt-6 text-center space-y-3">
                <Briefcase className="w-10 h-10 mx-auto text-primary" />
                <h4 className="font-semibold">Add Work Experience</h4>
                <p className="text-sm text-muted-foreground">Build your timeline with roles and achievements</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card transition-smooth cursor-pointer" onClick={() => setShowTitleDrawer(true)}>
              <CardContent className="pt-6 text-center space-y-3">
                <Award className="w-10 h-10 mx-auto text-primary" />
                <h4 className="font-semibold">Set Your Job Title</h4>
                <p className="text-sm text-muted-foreground">Choose from suggestions or add custom titles</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Titles Block - Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>Your Job Titles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-12">
                <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No titles yet</p>
                <Button variant="outline" onClick={() => setShowTitleDrawer(true)}>
                  <Plus className="mr-2 w-4 h-4" />
                  Add a Title
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 opacity-50 pointer-events-none">
                <Badge variant="secondary">Marketing Manager</Badge>
                <Badge variant="secondary">Data Analyst</Badge>
                <Badge variant="secondary">Project Coordinator</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Skills Block - Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>Key Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No skills added yet</p>
                <Button variant="outline" onClick={() => setShowSkillsDrawer(true)}>
                  <Plus className="mr-2 w-4 h-4" />
                  Add Skills
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Experience - Empty State */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">Your roles will appear here</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your work history to showcase your career journey
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setShowExperienceDrawer(true)}>
                  <Plus className="mr-2 w-4 h-4" />
                  Add Your First Role
                </Button>
                <Button variant="ghost" onClick={() => setShowExamplesModal(true)}>
                  See examples of impact bullets (STAR)
                </Button>
              </div>
            </div>
            <div className="space-y-4 opacity-30 pointer-events-none mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-5 w-48 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Education & Certifications */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No education added</p>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 w-4 h-4" />
                  Add Education
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No certifications added</p>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 w-4 h-4" />
                  Add Certification
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio - Empty State */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="grid grid-cols-3 gap-4 mb-6 opacity-30 pointer-events-none">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video bg-muted rounded-lg" />
                ))}
              </div>
              <Button variant="outline">
                <Plus className="mr-2 w-4 h-4" />
                Add Project/Case Study
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Consent */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Consent
            </CardTitle>
            <CardDescription>
              Control who can see your profile and metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="profile-preview">Allow recruiters to view my Profile preview</Label>
                <p className="text-sm text-muted-foreground">
                  Share your profile highlights with potential employers
                </p>
              </div>
              <Switch id="profile-preview" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="metrics-preview">Allow recruiters to view my Metrics summary</Label>
                <p className="text-sm text-muted-foreground">
                  Share your interview performance insights
                </p>
              </div>
              <Switch id="metrics-preview" />
            </div>

            <Separator />

            <Button variant="ghost" onClick={() => setShowPrivacyModal(true)} className="w-full">
              Learn about data privacy
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Upload your resume to auto-fill your profile
            </p>
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={() => setShowSkillsDrawer(true)}>
                Add Manually
              </Button>
              <Button onClick={scrollToUploader}>
                <Upload className="mr-2 w-4 h-4" />
                Upload Resume
              </Button>
            </div>
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
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Resume ready to parse",
                  description: "Processing your resume text...",
                });
                setShowPasteDialog(false);
              }}
            >
              Process Text
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skills Drawer */}
      <Sheet open={showSkillsDrawer} onOpenChange={setShowSkillsDrawer}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Skills</SheetTitle>
            <SheetDescription>
              Add your technical and soft skills with proficiency levels
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input id="skill-name" placeholder="e.g., React, Python, Leadership" />
            </div>
            <div className="space-y-2">
              <Label>Proficiency Level</Label>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer">Beginner</Badge>
                <Badge variant="outline" className="cursor-pointer">Intermediate</Badge>
                <Badge variant="outline" className="cursor-pointer">Advanced</Badge>
                <Badge variant="outline" className="cursor-pointer">Expert</Badge>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowSkillsDrawer(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({ title: "Skill added", description: "Your skill has been added to your profile." });
                  setShowSkillsDrawer(false);
                }}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Experience Drawer */}
      <Sheet open={showExperienceDrawer} onOpenChange={setShowExperienceDrawer}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Work Experience</SheetTitle>
            <SheetDescription>
              Add a role with dates and key achievements
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input id="job-title" placeholder="e.g., Senior Developer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="e.g., Tech Corp" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="month" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input id="end-date" type="month" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="achievements">Key Achievements</Label>
              <Textarea id="achievements" placeholder="Use bullet points for impact..." rows={4} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowExperienceDrawer(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({ title: "Experience added", description: "Your role has been added to your timeline." });
                  setShowExperienceDrawer(false);
                }}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Title Drawer */}
      <Sheet open={showTitleDrawer} onOpenChange={setShowTitleDrawer}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Set Your Job Title</SheetTitle>
            <SheetDescription>
              Choose from suggestions or add a custom title
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Suggested Titles</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="cursor-pointer">Marketing Manager</Badge>
                <Badge variant="secondary" className="cursor-pointer">Data Analyst</Badge>
                <Badge variant="secondary" className="cursor-pointer">Project Coordinator</Badge>
                <Badge variant="secondary" className="cursor-pointer">Software Engineer</Badge>
                <Badge variant="secondary" className="cursor-pointer">Product Designer</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-title">Or add custom title</Label>
              <Input id="custom-title" placeholder="Enter your job title" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTitleDrawer(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({ title: "Title added", description: "Your job title has been added to your profile." });
                  setShowTitleDrawer(false);
                }}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Privacy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data Privacy & Security</DialogTitle>
            <DialogDescription>How Screna AI protects your information</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Your data is encrypted</h4>
                <p className="text-sm text-muted-foreground">
                  All profile data is encrypted at rest and in transit using industry-standard protocols.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">You control sharing</h4>
                <p className="text-sm text-muted-foreground">
                  Your profile and metrics are private by default. You decide what to share and with whom.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">No data selling</h4>
                <p className="text-sm text-muted-foreground">
                  We never sell your personal information to third parties. Your data is yours.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Examples Modal */}
      <Dialog open={showExamplesModal} onOpenChange={setShowExamplesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>STAR Method Examples</DialogTitle>
            <DialogDescription>
              Structure your achievements for maximum impact
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Badge variant="secondary">Example 1</Badge>
              <p className="text-sm">
                <strong>Situation:</strong> E-commerce checkout had 35% abandonment rate.
                <br />
                <strong>Task:</strong> Reduce friction in payment flow.
                <br />
                <strong>Action:</strong> Redesigned checkout to single-page, added guest checkout.
                <br />
                <strong>Result:</strong> Reduced abandonment by 22%, increased revenue by $1.2M annually.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Badge variant="secondary">Example 2</Badge>
              <p className="text-sm">
                <strong>Situation:</strong> Customer support response time averaged 48 hours.
                <br />
                <strong>Task:</strong> Improve response speed without hiring.
                <br />
                <strong>Action:</strong> Implemented AI chatbot for common queries, trained team on triage.
                <br />
                <strong>Result:</strong> Reduced average response time to 4 hours, improved CSAT by 35%.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Badge variant="secondary">Example 3</Badge>
              <p className="text-sm">
                <strong>Situation:</strong> Marketing campaigns lacked data-driven insights.
                <br />
                <strong>Task:</strong> Build analytics dashboard for campaign performance.
                <br />
                <strong>Action:</strong> Integrated Google Analytics, created custom dashboards in Looker.
                <br />
                <strong>Result:</strong> Enabled data-driven decisions, increased ROI by 40% in 6 months.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
