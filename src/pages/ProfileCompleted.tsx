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
  Edit,
  FileText,
  Briefcase,
  Target,
  Award,
  Plus,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ProfileCompleted = () => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const extractedData = {
    name: "Alex Carter",
    email: "alex.carter@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    workAuth: "H-1B Visa",
    headline: "Senior Full-Stack Developer with 8+ years building scalable web applications",
    bio: "Passionate software engineer specializing in React, Node.js, and cloud infrastructure. Led teams to deliver high-impact products for Fortune 500 companies. Expert in building scalable microservices, implementing CI/CD pipelines, and mentoring junior developers.",
    linkedin: "linkedin.com/in/alexcarter",
    github: "github.com/alexcarter",
    portfolio: "alexcarter.dev",
    
    titles: [
      "Senior Full-Stack Developer",
      "Cloud Solutions Architect",
      "Technical Team Lead"
    ],
    
    skills: [
      { name: "React & TypeScript", proficiency: 95, category: "Frontend" },
      { name: "Node.js & Express", proficiency: 90, category: "Backend" },
      { name: "AWS & Docker", proficiency: 85, category: "DevOps" },
      { name: "PostgreSQL & MongoDB", proficiency: 88, category: "Database" },
      { name: "GraphQL & REST APIs", proficiency: 92, category: "APIs" },
      { name: "Team Leadership", proficiency: 87, category: "Soft Skills" },
    ],
    
    experience: [
      {
        title: "Senior Full-Stack Developer",
        company: "TechCorp Inc",
        location: "San Francisco, CA",
        startDate: "Jan 2021",
        endDate: "Present",
        achievements: [
          "Led migration of monolithic architecture to microservices, reducing deployment time by 60%",
          "Architected real-time analytics dashboard serving 50K+ daily active users",
          "Mentored team of 5 junior developers, improving code quality by 40% (measured by PR review scores)"
        ]
      },
      {
        title: "Full-Stack Engineer",
        company: "StartupHub",
        location: "Remote",
        startDate: "Mar 2019",
        endDate: "Dec 2020",
        achievements: [
          "Built MVP from ground up using React, Node.js, and PostgreSQL",
          "Implemented CI/CD pipeline reducing deployment errors by 85%",
          "Increased API performance by 3x through query optimization and caching"
        ]
      },
      {
        title: "Frontend Developer",
        company: "Digital Agency Co",
        location: "Los Angeles, CA",
        startDate: "Jun 2017",
        endDate: "Feb 2019",
        achievements: [
          "Developed responsive web applications for 20+ clients across retail and finance sectors",
          "Reduced page load time by 45% through code splitting and lazy loading",
          "Collaborated with UX team to improve conversion rates by 30%"
        ]
      }
    ],
    
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        school: "University of California, Berkeley",
        year: "2013 - 2017",
        gpa: "3.8/4.0"
      }
    ],
    
    certifications: [
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        year: "2022",
        credentialId: "AWS-SA-2022-12345"
      },
      {
        name: "MongoDB Certified Developer",
        issuer: "MongoDB University",
        year: "2021",
        credentialId: "MONGO-DEV-2021-67890"
      }
    ],
    
    projects: [
      {
        title: "Real-time Analytics Platform",
        description: "Cloud-based analytics dashboard with WebSocket integration",
        link: "alexcarter.dev/projects/analytics",
        tags: ["React", "Node.js", "WebSocket", "AWS"]
      },
      {
        title: "E-commerce Microservices",
        description: "Scalable microservices architecture for e-commerce platform",
        link: "alexcarter.dev/projects/ecommerce",
        tags: ["Docker", "Kubernetes", "GraphQL", "PostgreSQL"]
      },
      {
        title: "Open Source Contributions",
        description: "Core contributor to popular React UI library",
        link: "github.com/alexcarter",
        tags: ["React", "TypeScript", "Open Source"]
      }
    ]
  };

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-primary rounded-full">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">AI Analyzed</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Profile</h1>
                <p className="text-sm text-muted-foreground">Profile auto-filled from your resume</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 w-4 h-4" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <CheckCircle2 className="mr-2 w-4 h-4" />
                    Save Changes
                  </Button>
                </>
              )}
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
                    <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                      AC
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{extractedData.name}</h2>
                      <p className="text-muted-foreground">{extractedData.headline}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Email verified
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="w-3 h-3" />
                        {extractedData.location}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {extractedData.workAuth}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{extractedData.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{extractedData.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span>{extractedData.portfolio}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Titles */}
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
                  {extractedData.titles.map((title, idx) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm">
                      {title}
                    </Badge>
                  ))}
                  {isEditing && (
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Title
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Professional Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    defaultValue={extractedData.bio}
                    rows={5}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed">{extractedData.bio}</p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
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
              <CardContent className="space-y-6">
                {["Frontend", "Backend", "DevOps", "Database", "APIs", "Soft Skills"].map((category) => {
                  const categorySkills = extractedData.skills.filter(s => s.category === category);
                  if (categorySkills.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">{category}</h4>
                      <div className="space-y-4">
                        {categorySkills.map((skill, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium">{skill.name}</span>
                              <span className="text-muted-foreground">{skill.proficiency}%</span>
                            </div>
                            <Progress value={skill.proficiency} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {isEditing && (
                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Skill
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Experience Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Work Experience
                </CardTitle>
                <CardDescription>Extracted from your resume with STAR-formatted achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {extractedData.experience.map((exp, idx) => (
                    <div key={idx} className="relative pl-8 pb-6 border-l-2 border-primary/20 last:border-0 last:pb-0">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary" />
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg">{exp.title}</h4>
                          <p className="text-muted-foreground">{exp.company} • {exp.location}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{exp.startDate} - {exp.endDate}</span>
                          </div>
                        </div>
                        
                        <ul className="space-y-2">
                          {exp.achievements.map((achievement, aIdx) => (
                            <li key={aIdx} className="flex gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-1">•</span>
                              <span>{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <Button variant="outline" className="w-full mt-4">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Experience
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Education & Certifications */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {extractedData.education.map((edu, idx) => (
                    <div key={idx} className="space-y-1">
                      <h4 className="font-semibold">{edu.degree}</h4>
                      <p className="text-sm text-muted-foreground">{edu.school}</p>
                      <p className="text-sm text-muted-foreground">{edu.year} • GPA: {edu.gpa}</p>
                    </div>
                  ))}
                  {isEditing && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 w-4 h-4" />
                      Add Education
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="w-5 h-5 text-primary" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {extractedData.certifications.map((cert, idx) => (
                    <div key={idx} className="space-y-1">
                      <h4 className="font-semibold">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                      <p className="text-xs text-muted-foreground">Issued {cert.year} • ID: {cert.credentialId}</p>
                    </div>
                  ))}
                  {isEditing && (
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 w-4 h-4" />
                      Add Certification
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Portfolio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-primary" />
                  Portfolio & Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {extractedData.projects.map((project, idx) => (
                    <div key={idx} className="p-4 border rounded-lg hover:shadow-card transition-smooth">
                      <h4 className="font-semibold mb-2">{project.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.tags.map((tag, tIdx) => (
                          <Badge key={tIdx} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <a
                        href={`https://${project.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View Project <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
                {isEditing && (
                  <Button variant="outline" className="w-full mt-4">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Project
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Professional Links */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-primary" />
                  {isEditing ? (
                    <Input defaultValue={extractedData.linkedin} />
                  ) : (
                    <a href={`https://${extractedData.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {extractedData.linkedin}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-primary" />
                  {isEditing ? (
                    <Input defaultValue={extractedData.github} />
                  ) : (
                    <a href={`https://${extractedData.github}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {extractedData.github}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  {isEditing ? (
                    <Input defaultValue={extractedData.portfolio} />
                  ) : (
                    <a href={`https://${extractedData.portfolio}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {extractedData.portfolio}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
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
                    <div className="text-4xl font-bold text-primary mb-2">95%</div>
                    <p className="text-sm text-muted-foreground">Excellent! Almost perfect</p>
                  </div>
                  <Progress value={95} className="h-2" />
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
                      <Badge variant="secondary">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Experience added</span>
                      <Badge variant="secondary">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Done
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Add profile photo</span>
                      <Badge variant="outline">Optional</Badge>
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
                    Your profile ranks in the top 15% for your role and experience level.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Job Match Score</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You're a strong match for 47 open positions in your area.
                  </p>
                </div>
                <Button className="w-full" variant="outline">
                  View Matched Jobs
                </Button>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="profile-visible" className="text-sm">Profile visible to recruiters</Label>
                    <p className="text-xs text-muted-foreground">
                      Let employers discover you
                    </p>
                  </div>
                  <Switch id="profile-visible" defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="metrics-visible" className="text-sm">Share metrics summary</Label>
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
            </Card>

            {/* Resume File */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">Alex_Carter_Resume.pdf</p>
                    <p className="text-xs text-muted-foreground">Uploaded today</p>
                  </div>
                </div>
                {isEditing && (
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Replace Resume
                  </Button>
                )}
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
    </div>
  );
};

export default ProfileCompleted;
