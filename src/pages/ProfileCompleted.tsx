import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Edit,
  FileText,
  Briefcase,
  Target,
  Award,
  Shield,
  MapPin,
  GraduationCap,
  Folder,
  CheckCircle2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Calendar,
  ChevronDown,
  Loader2,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileService } from "../services";
import type { ProfileData } from "@/types/profile";
import { calculateProfileCompleteness, VISA_STATUS_OPTIONS } from "@/types/profile";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProfileCompleted = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [resumePath, setResumePath] = useState<string>('');
  
  // New states for resume upload
  const [isUploading, setIsUploading] = useState(false);
  const [showReplaceConfirmDialog, setShowReplaceConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showVisaStatusDialog, setShowVisaStatusDialog] = useState(false);
  const [tempVisaStatus, setTempVisaStatus] = useState<string>('');
  const [isSavingVisa, setIsSavingVisa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await ProfileService.getProfile();
      const data = response.data?.data || response.data;
      
      if (data && data.structured_resume) {
        setProfileData(data.structured_resume);
        setResumePath(data.resume_path)
      } else {
        toast({
          title: "No profile found",
          description: "Please create your profile first.",
          variant: "destructive",
        });
        navigate('/profile');
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: "Please try again later.",
        variant: "destructive",
      });
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate('/profile/edit');
  };

  // Handle upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Show confirmation dialog
    setPendingFile(file);
    setShowReplaceConfirmDialog(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle confirmed upload
  const handleConfirmedUpload = async () => {
    if (!pendingFile) return;

    try {
      setIsUploading(true);
      setShowReplaceConfirmDialog(false);
      
      toast({
        title: "Processing resume...",
        description: "AI is extracting information from your resume.",
      });

      const response = await ProfileService.uploadResume(pendingFile);
      const structuredResume = response.data?.data?.structured_resume || response.data?.structured_resume;
      const newResumePath = response.data?.data?.resume_path || response.data?.resume_path;
      
      if (structuredResume) {
        setProfileData(structuredResume);
        if (newResumePath) {
          setResumePath(newResumePath);
        }
        
        // Check if visa status is missing and prompt user
        if (!structuredResume.profile.visa_status) {
          setTempVisaStatus('');
          setShowVisaStatusDialog(true);
          toast({
            title: "Resume parsed successfully!",
            description: "Please complete your work authorization status.",
          });
        } else {
          // Visa status exists, save profile to backend
          try {
            await ProfileService.updateProfile(structuredResume);
            toast({
              title: "Profile replaced successfully!",
              description: "Your new resume has been parsed and saved.",
            });
          } catch (saveError) {
            console.error("Error saving profile:", saveError);
            toast({
              title: "Resume parsed but save failed",
              description: "Please try again or edit your profile manually.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error processing resume",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  // Handle visa status save from dialog
  const handleVisaStatusSave = async () => {
    if (!tempVisaStatus) {
      toast({
        title: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    if (!profileData) return;

    try {
      setIsSavingVisa(true);
      const updatedProfile = {
        ...profileData,
        profile: { ...profileData.profile, visa_status: tempVisaStatus }
      };
      
      await ProfileService.updateProfile(updatedProfile);
      setProfileData(updatedProfile);
      setShowVisaStatusDialog(false);
      
      toast({
        title: "Profile updated successfully!",
        description: "Your work authorization has been saved.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSavingVisa(false);
    }
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to calculate skill proficiency percentage
  const getProficiencyPercentage = (level: string): number => {
    const levels: { [key: string]: number } = {
      'Beginner': 25,
      'Intermediate': 50,
      'Advanced': 75,
      'Expert': 95,
    };
    return levels[level] || 50;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const completeness = calculateProfileCompleteness(profileData);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-primary rounded-full">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">AI Analyzed</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-sm text-muted-foreground">Profile auto-filled from your resume</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 w-4 h-4" />
                    Upload New Resume
                  </>
                )}
              </Button>
              <Button onClick={handleEdit}>
                <Edit className="mr-2 w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Summary Banner */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {getInitials(profileData.profile.full_name || "User")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{profileData.profile.full_name}</h2>
                      <p className="text-muted-foreground">{profileData.profile.headline}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Email verified
                      </Badge>
                      {profileData.profile.location && (
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="w-3 h-3" />
                          {profileData.profile.location}
                        </Badge>
                      )}
                      {profileData.profile.visa_status && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {profileData.profile.visa_status}
                        </Badge>
                      )}
                    </div>

                   <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      {profileData.profile.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{profileData.profile.email}</span>
                        </div>
                      )}
                      {profileData.profile.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{profileData.profile.phone}</span>
                        </div>
                      )}
                      {profileData.profile.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{profileData.profile.website}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Titles */}
            {profileData.job_titles && profileData.job_titles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Job Titles
                  </CardTitle>
                  <CardDescription>AI-extracted from your resume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profileData.job_titles.map((title, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm">
                        {title}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Summary */}
            {profileData.profile.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Professional Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{profileData.profile.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {profileData.skills && profileData.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Skills & Expertise
                  </CardTitle>
                  <CardDescription>
                    Proficiency levels AI-estimated from your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileData.skills.map((skillGroup, catIndex) => (
                    <Collapsible key={catIndex} defaultOpen={true}>
                      <div className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                          <h4 className="text-sm font-semibold">{skillGroup.category}</h4>
                          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                          <div className="px-4 pb-4 pt-2 space-y-4">
                            {skillGroup.items.map((skill, idx) => {
                              const proficiency = getProficiencyPercentage(skill.proficiency);
                              return (
                                <div key={idx}>
                                  <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium">{skill.name}</span>
                                    <span className="text-muted-foreground">{skill.proficiency}</span>
                                  </div>
                                  <Progress value={proficiency} className="h-2" />
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Experience Timeline */}
            {profileData.experience && profileData.experience.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Work Experience
                  </CardTitle>
                  <CardDescription>Extracted from your resume with achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {profileData.experience.map((exp, idx) => (
                      <div key={idx} className="relative pl-8 pb-6 border-l-2 border-primary/20 last:border-0 last:pb-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary" />
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-lg">{exp.title}</h4>
                            <p className="text-muted-foreground">{exp.company} • {exp.location}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3" />
                              <span>{exp.start_date} - {exp.end_date || 'Present'}</span>
                            </div>
                          </div>
                          
                          {exp.achievements && exp.achievements.length > 0 && (
                            <ul className="space-y-2">
                              {exp.achievements.map((achievement, aIdx) => (
                                <li key={aIdx} className="flex gap-2 text-sm text-muted-foreground">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{achievement}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education & Certifications */}
            <div className="grid md:grid-cols-2 gap-6">
              {profileData.education && profileData.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileData.education.map((edu, idx) => (
                      <div key={idx} className="space-y-1">
                        <h4 className="font-semibold">{edu.degree}</h4>
                        <p className="text-sm text-muted-foreground">{edu.institution}</p>
                        <p className="text-sm text-muted-foreground">
                          {edu.start_year} - {edu.end_year}
                          {edu.gpa && ` • GPA: ${edu.gpa}`}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {profileData.certifications && profileData.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="w-5 h-5 text-primary" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileData.certifications.map((cert, idx) => (
                      <div key={idx} className="space-y-1">
                        <h4 className="font-semibold">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        {cert.issued_date && (
                          <p className="text-xs text-muted-foreground">Issued {cert.issued_date}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Portfolio */}
            {profileData.projects && profileData.projects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-primary" />
                    Portfolio & Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {profileData.projects.map((project, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:shadow-card transition-smooth">
                        <h4 className="font-semibold mb-2">{project.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                        {project.link && (
                          <a
                            href={project.link.startsWith('http') ? project.link : `https://${project.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            View Project <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Links */}
            {(profileData.links.linkedin || profileData.links.github || profileData.links.website) && (
              <Card>
                <CardHeader>
                  <CardTitle>Professional Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileData.links.linkedin && (
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-5 h-5 text-primary" />
                      <a 
                        href={profileData.links.linkedin.startsWith('http') ? profileData.links.linkedin : `https://${profileData.links.linkedin}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                      >
                        {profileData.links.linkedin}
                      </a>
                    </div>
                  )}
                  {profileData.links.github && (
                    <div className="flex items-center gap-3">
                      <Github className="w-5 h-5 text-primary" />
                      <a 
                        href={profileData.links.github.startsWith('http') ? profileData.links.github : `https://${profileData.links.github}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                      >
                        {profileData.links.github}
                      </a>
                    </div>
                  )}
                  {profileData.links.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary" />
                      <a 
                        href={profileData.links.website.startsWith('http') ? profileData.links.website : `https://${profileData.links.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                      >
                        {profileData.links.website}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">{completeness}%</div>
                    <p className="text-sm text-muted-foreground">
                      {completeness >= 80 ? 'Excellent! Almost perfect' : 'Keep going!'}
                    </p>
                  </div>
                  <Progress value={completeness} className="h-2" />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Resume uploaded</span>
                      <Badge variant="secondary">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Skills extracted</span>
                      <Badge variant={profileData.skills.length > 0 ? "secondary" : "outline"}>
                        {profileData.skills.length > 0 ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </>
                        ) : (
                          'Pending'
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Experience added</span>
                      <Badge variant={profileData.experience.length > 0 ? "secondary" : "outline"}>
                        {profileData.experience.length > 0 ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </>
                        ) : (
                          'Pending'
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Work authorization</span>
                      <Badge variant={profileData.profile.visa_status ? "secondary" : "outline"}>
                        {profileData.profile.visa_status ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </>
                        ) : (
                          'Optional'
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Profile Strength</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your profile is {completeness >= 80 ? 'strong and competitive' : 'developing well'}.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Ready for Jobs</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start applying to positions that match your skills.
                  </p>
                </div>
                <Button className="w-full" variant="outline" onClick={() => navigate('/jobs')}>
                  View Matched Jobs
                </Button>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="profile-visible" className="text-sm font-medium">Profile visible to recruiters</label>
                    <p className="text-xs text-muted-foreground">
                      Let employers discover you
                    </p>
                  </div>
                  <Switch id="profile-visible" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="metrics-visible" className="text-sm font-medium">Share metrics summary</label>
                    <p className="text-xs text-muted-foreground">
                      Show interview performance
                    </p>
                  </div>
                  <Switch id="metrics-visible" />
                </div>
                <Separator />
                <Button variant="ghost" size="sm" onClick={() => setShowPrivacyModal(true)} className="w-full">
                  Learn about data privacy
                </Button>
              </CardContent>
            </Card> */}

            {/* Resume File */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">Resume.pdf</p>
                    <p className="text-xs text-muted-foreground">Uploaded</p>
                  </div>
                  <a
                    href={resumePath}
                    download="Resume.pdf"
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    title="Download resume"
                  >
                    <Download className="w-5 h-5 text-primary" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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

      {/* Replace Resume Confirmation Dialog */}
      <Dialog open={showReplaceConfirmDialog} onOpenChange={setShowReplaceConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Replace Current Profile?
            </DialogTitle>
            <DialogDescription>
              Uploading a new resume will completely replace your current profile data with information extracted from the new resume.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              This action will overwrite:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Personal information</li>
              <li>• Work experience</li>
              <li>• Education history</li>
              <li>• Skills and certifications</li>
              <li>• All other profile data</li>
            </ul>
            <p className="text-sm font-medium text-amber-600">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReplaceConfirmDialog(false);
                setPendingFile(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmedUpload}
            >
              Replace Profile
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
              Please select your current work authorization status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work Authorization Status</Label>
              <Select
                value={tempVisaStatus}
                onValueChange={setTempVisaStatus}
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
          </div>
          <DialogFooter>
            <Button
              onClick={handleVisaStatusSave}
              disabled={isSavingVisa}
            >
              {isSavingVisa ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileCompleted;