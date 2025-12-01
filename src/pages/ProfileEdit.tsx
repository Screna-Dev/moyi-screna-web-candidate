import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Upload, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileService } from "../services";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { 
  ProfileData, 
  SkillItem,
  Experience,
  Education,
  Certification,
  Project 
} from "@/types/profile";
import {
  VISA_STATUS_OPTIONS,
  SKILL_CATEGORIES,
  PROFICIENCY_LEVELS,
  createEmptyProfileData,
  calculateProfileCompleteness
} from "@/types/profile";

interface ProfileEditProps {
  initialData?: ProfileData;
  onSave?: (data: ProfileData) => void;
  onCancel?: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ 
  initialData, 
  onSave,
  onCancel 
}) => {
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [showVisaStatusDialog, setShowVisaStatusDialog] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>(
    initialData || createEmptyProfileData()
  );
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialData) {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await ProfileService.getProfile();
      const data = response.data?.data || response.data;
      if (data) {
        setProfileData(data.structured_resume);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await ProfileService.updateProfile(profileData);
      
      toast({
        title: "Profile updated successfully!",
        description: "Your changes have been saved.",
      });
      
      if (onSave) {
        onSave(profileData);
      } else {
        navigate('/profile');
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/profile');
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
      setIsLoading(true);
      toast({
        title: "Processing resume...",
        description: "AI is extracting information from your resume.",
      });

      const response = await ProfileService.uploadResume(file);
      const structuredResume = response.data?.data?.structured_resume || response.data?.structured_resume;
      
      if (structuredResume) {
        setProfileData(structuredResume);
        
        // Check if visa status is missing and prompt user
        if (!structuredResume.profile.visa_status) {
          setShowVisaStatusDialog(true);
        }
        
        toast({
          title: "Resume parsed successfully!",
          description: "Review the extracted information below.",
        });
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error processing resume",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Skill management
  const addSkill = (category: string) => {
    const categoryIndex = profileData.skills.findIndex(s => s.category === category);
    const newSkill: SkillItem = { name: "New Skill", proficiency: "Intermediate", notes: "" };
    
    if (categoryIndex >= 0) {
      const updatedSkills = [...profileData.skills];
      updatedSkills[categoryIndex].items.push(newSkill);
      setProfileData({ ...profileData, skills: updatedSkills });
    } else {
      setProfileData({
        ...profileData,
        skills: [...profileData.skills, { category, items: [newSkill] }]
      });
    }
  };

  const updateSkill = (categoryIndex: number, itemIndex: number, field: keyof SkillItem, value: string) => {
    const updatedSkills = [...profileData.skills];
    updatedSkills[categoryIndex].items[itemIndex] = {
      ...updatedSkills[categoryIndex].items[itemIndex],
      [field]: value
    };
    setProfileData({ ...profileData, skills: updatedSkills });
  };

  const removeSkill = (categoryIndex: number, itemIndex: number) => {
    const updatedSkills = [...profileData.skills];
    updatedSkills[categoryIndex].items.splice(itemIndex, 1);
    
    if (updatedSkills[categoryIndex].items.length === 0) {
      updatedSkills.splice(categoryIndex, 1);
    }
    
    setProfileData({ ...profileData, skills: updatedSkills });
  };

  // Experience management
  const addExperience = () => {
    const newExp: Experience = {
      title: "",
      company: "",
      location: "",
      start_date: "",
      end_date: "",
      achievements: [""]
    };
    setProfileData({
      ...profileData,
      experience: [...profileData.experience, newExp]
    });
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const updated = [...profileData.experience];
    updated[index] = { ...updated[index], [field]: value };
    setProfileData({ ...profileData, experience: updated });
  };

  const removeExperience = (index: number) => {
    setProfileData({
      ...profileData,
      experience: profileData.experience.filter((_, i) => i !== index)
    });
  };

  const addAchievement = (expIndex: number) => {
    const updated = [...profileData.experience];
    updated[expIndex].achievements.push("");
    setProfileData({ ...profileData, experience: updated });
  };

  const updateAchievement = (expIndex: number, achIndex: number, value: string) => {
    const updated = [...profileData.experience];
    updated[expIndex].achievements[achIndex] = value;
    setProfileData({ ...profileData, experience: updated });
  };

  const removeAchievement = (expIndex: number, achIndex: number) => {
    const updated = [...profileData.experience];
    updated[expIndex].achievements.splice(achIndex, 1);
    setProfileData({ ...profileData, experience: updated });
  };

  // Education management
  const addEducation = () => {
    const newEdu: Education = {
      institution: "",
      degree: "",
      field_of_study: "",
      start_year: "",
      end_year: "",
      gpa: 0,
      honors: []
    };
    setProfileData({
      ...profileData,
      education: [...profileData.education, newEdu]
    });
  };

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const updated = [...profileData.education];
    updated[index] = { ...updated[index], [field]: value };
    setProfileData({ ...profileData, education: updated });
  };

  const removeEducation = (index: number) => {
    setProfileData({
      ...profileData,
      education: profileData.education.filter((_, i) => i !== index)
    });
  };

  // Job titles management
  const addJobTitle = (title: string) => {
    if (title.trim() && !profileData.job_titles.includes(title.trim())) {
      setProfileData({
        ...profileData,
        job_titles: [...profileData.job_titles, title.trim()]
      });
    }
  };

  const removeJobTitle = (index: number) => {
    setProfileData({
      ...profileData,
      job_titles: profileData.job_titles.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const completeness = calculateProfileCompleteness(profileData);

  return (
    <div className="min-h-screen bg-background p-6 pb-32">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Edit Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Update your professional information
                </p>
              </div>
            </div>
            <Badge variant={completeness >= 80 ? "default" : "secondary"}>
              {completeness}% Complete
            </Badge>
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={profileData.profile.full_name}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, full_name: e.target.value }
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileData.profile.email}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, email: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={profileData.profile.phone}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, phone: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    value={profileData.profile.location}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, location: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visa">Work Authorization</Label>
                  <Select 
                    value={profileData.profile.visa_status}
                    onValueChange={(value) => setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, visa_status: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work authorization" />
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

                <div className="space-y-2">
                  <Label htmlFor="years">Years of Experience</Label>
                  <Input 
                    id="years" 
                    type="number"
                    value={profileData.profile.total_years_experience}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      profile: { 
                        ...profileData.profile, 
                        total_years_experience: parseInt(e.target.value) || 0 
                      }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  placeholder="e.g., Senior Software Engineer | Full Stack Developer"
                  value={profileData.profile.headline}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    profile: { ...profileData.profile, headline: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Tell us about your experience and expertise..."
                  value={profileData.profile.summary}
                  onChange={(e) => setProfileData({
                    ...profileData,
                    profile: { ...profileData.profile, summary: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Resume Upload</Label>
                <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary transition-smooth cursor-pointer">
                  <input
                    type="file"
                    id="resume-upload-edit"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="resume-upload-edit" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC (Max 5MB)</p>
                  </label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input 
                    id="linkedin" 
                    type="url" 
                    placeholder="https://linkedin.com/in/username"
                    value={profileData.links.linkedin}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      links: { ...profileData.links, linkedin: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github">GitHub URL</Label>
                  <Input 
                    id="github" 
                    type="url" 
                    placeholder="https://github.com/username"
                    value={profileData.links.github}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      links: { ...profileData.links, github: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="portfolio">Portfolio URL</Label>
                  <Input 
                    id="portfolio" 
                    type="url" 
                    placeholder="https://yourportfolio.com"
                    value={profileData.links.website}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      links: { ...profileData.links, website: e.target.value }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Titles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Job Titles</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    const title = prompt("Enter job title:");
                    if (title) addJobTitle(title);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profileData.job_titles.map((title, index) => (
                  <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                    {title}
                    <button
                      onClick={() => removeJobTitle(index)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {profileData.job_titles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No job titles added yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Skills & Proficiency</CardTitle>
                <Select onValueChange={(cat) => addSkill(cat)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add skill category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileData.skills.map((skillGroup, catIndex) => (
                <div key={catIndex} className="space-y-3">
                  <h4 className="font-semibold text-sm text-primary">{skillGroup.category}</h4>
                  <div className="space-y-4">
                    {skillGroup.items.map((skill, itemIndex) => (
                      <div key={itemIndex} className="p-4 border border-border rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                          <Input
                            value={skill.name}
                            onChange={(e) => updateSkill(catIndex, itemIndex, 'name', e.target.value)}
                            placeholder="Skill name"
                            className="flex-1"
                          />
                          <Select
                            value={skill.proficiency}
                            onValueChange={(value) => updateSkill(catIndex, itemIndex, 'proficiency', value)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROFICIENCY_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => removeSkill(catIndex, itemIndex)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={skill.notes || ""}
                          onChange={(e) => updateSkill(catIndex, itemIndex, 'notes', e.target.value)}
                          placeholder="Notes (optional)"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {profileData.skills.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No skills added yet. Select a category above to start.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Work Experience</CardTitle>
                <Button size="sm" variant="outline" onClick={addExperience}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileData.experience.map((exp, expIndex) => (
                <div key={expIndex} className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">Experience #{expIndex + 1}</h4>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeExperience(expIndex)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input
                        value={exp.title}
                        onChange={(e) => updateExperience(expIndex, 'title', e.target.value)}
                        placeholder="e.g., Senior Developer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(expIndex, 'company', e.target.value)}
                        placeholder="e.g., Tech Corp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={exp.location}
                        onChange={(e) => updateExperience(expIndex, 'location', e.target.value)}
                        placeholder="e.g., San Francisco, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="month"
                        value={exp.start_date}
                        onChange={(e) => updateExperience(expIndex, 'start_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="month"
                        value={exp.end_date}
                        onChange={(e) => updateExperience(expIndex, 'end_date', e.target.value)}
                        placeholder="Leave blank if current"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Achievements</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addAchievement(expIndex)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {exp.achievements.map((achievement, achIndex) => (
                      <div key={achIndex} className="flex gap-2">
                        <Textarea
                          placeholder="Describe your achievement..."
                          rows={2}
                          value={achievement}
                          onChange={(e) => updateAchievement(expIndex, achIndex, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAchievement(expIndex, achIndex)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {profileData.experience.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No experience added yet. Click "Add" to start.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Education</CardTitle>
                <Button size="sm" variant="outline" onClick={addEducation}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileData.education.map((edu, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">Education #{index + 1}</h4>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeEducation(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Institution</Label>
                      <Input
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                        placeholder="e.g., Stanford University"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        placeholder="e.g., Bachelor of Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Field of Study</Label>
                      <Input
                        value={edu.field_of_study}
                        onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)}
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GPA</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={edu.gpa || ""}
                        onChange={(e) => updateEducation(index, 'gpa', parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 3.8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Year</Label>
                      <Input
                        value={edu.start_year}
                        onChange={(e) => updateEducation(index, 'start_year', e.target.value)}
                        placeholder="e.g., 2015"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Year</Label>
                      <Input
                        value={edu.end_year}
                        onChange={(e) => updateEducation(index, 'end_year', e.target.value)}
                        placeholder="e.g., 2019"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {profileData.education.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No education added yet. Click "Add" to start.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-visible">Profile visible to recruiters</Label>
                  <p className="text-sm text-muted-foreground">
                    Let employers discover you
                  </p>
                </div>
                <Switch id="profile-visible" defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="metrics-visible">Share metrics summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Show interview performance
                  </p>
                </div>
                <Switch id="metrics-visible" />
              </div>

              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive job match alerts
                  </p>
                </div>
                <Switch id="notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-4 z-50">
        <div className="container mx-auto max-w-4xl flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

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
                value={profileData.profile.visa_status}
                onValueChange={(value) => {
                  setProfileData({
                    ...profileData,
                    profile: { ...profileData.profile, visa_status: value },
                  });
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
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (profileData.profile.visa_status) {
                  setShowVisaStatusDialog(false);
                  toast({ title: "Work authorization updated" });
                } else {
                  toast({
                    title: "Please select a status",
                    variant: "destructive",
                  });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileEdit;