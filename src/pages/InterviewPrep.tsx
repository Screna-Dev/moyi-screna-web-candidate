import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  User,
  BookOpen,
  Brain,
  MessageSquare,
  BarChart3,
  Download,
  Share2,
  LinkedinIcon,
  Star,
  ChevronRight,
  Award,
  Filter,
  Search,
  DollarSign,
  Users,
  ExternalLink,
  XCircle,
  RefreshCw,
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
}

interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  rating: number;
  fee: number;
  bio: string;
  linkedIn: string;
  seniority: string;
  badges: string[];
  specialty: string;
  availability: string;
}

interface MentorSession {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  topic: string;
  dateTime: string;
  targetJobId: string;
  status: "upcoming" | "completed";
  meetingLink?: string;
  notes?: string;
  coachingReport?: {
    summary: string;
    actionItems: string[];
  };
}

const InterviewPrep = () => {
  const [selectedJob, setSelectedJob] = useState<string>("job1");
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [selectedSessionReport, setSelectedSessionReport] = useState<AISession | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [mentorSearchQuery, setMentorSearchQuery] = useState("");
  const [mentorSpecialtyFilter, setMentorSpecialtyFilter] = useState("all");
  const [mentorPriceFilter, setMentorPriceFilter] = useState("all");
  const [mentorSortBy, setMentorSortBy] = useState("rating");

  // Mock data
  const targetJobs: TargetJob[] = [
    {
      id: "job1",
      title: "Senior Product Manager",
      company: "Google",
      interviewDate: "2025-11-15",
      dailyPrepTime: 2,
      successRate: 78,
      progress: 65,
      categoryScores: [
        { category: "Resume & Background", score: 85 },
        { category: "Domain Knowledge", score: 72 },
        { category: "Technical Skills", score: 80 },
        { category: "Behavioral", score: 75 },
      ],
    },
    {
      id: "job2",
      title: "Marketing Director",
      company: "Amazon",
      interviewDate: "2025-11-25",
      dailyPrepTime: 1.5,
      successRate: 62,
      progress: 45,
      categoryScores: [
        { category: "Resume & Background", score: 70 },
        { category: "Domain Knowledge", score: 65 },
        { category: "Technical Skills", score: 60 },
        { category: "Behavioral", score: 55 },
      ],
    },
  ];

  const aiSessions: AISession[] = [
    {
      id: "s1",
      title: "Resume Deep Dive",
      category: "Resume",
      difficulty: "Medium",
      duration: 30,
      completed: true,
      score: 85,
    },
    {
      id: "s2",
      title: "Domain Expertise Assessment",
      category: "Domain",
      difficulty: "Hard",
      duration: 45,
      completed: true,
      score: 72,
    },
    {
      id: "s3",
      title: "Technical Problem Solving",
      category: "Skills",
      difficulty: "Hard",
      duration: 60,
      completed: false,
    },
    {
      id: "s4",
      title: "Behavioral Scenario Questions",
      category: "Behavioral",
      difficulty: "Medium",
      duration: 40,
      completed: false,
    },
  ];

  const mentors: Mentor[] = [
    {
      id: "m1",
      name: "Sarah Chen",
      title: "Senior Product Manager",
      company: "Google",
      avatar: "/placeholder.svg",
      rating: 4.9,
      fee: 150,
      bio: "10+ years in product management at top tech companies. Specialized in helping candidates prepare for PM interviews.",
      linkedIn: "https://linkedin.com",
      seniority: "Senior",
      badges: ["FAANG", "Ex-Manager"],
      specialty: "Product Management",
      availability: "Available",
    },
    {
      id: "m2",
      name: "Michael Rodriguez",
      title: "Engineering Manager",
      company: "Meta",
      avatar: "/placeholder.svg",
      rating: 4.8,
      fee: 120,
      bio: "Former hiring manager with 200+ interviews conducted. Expert in technical and behavioral prep.",
      linkedIn: "https://linkedin.com",
      seniority: "Manager",
      badges: ["FAANG", "Tech Lead"],
      specialty: "Engineering",
      availability: "Available",
    },
    {
      id: "m3",
      name: "Emily Watson",
      title: "Director of Marketing",
      company: "Amazon",
      avatar: "/placeholder.svg",
      rating: 4.7,
      fee: 130,
      bio: "15+ years leading marketing teams. Specialized in behavioral interviews and leadership coaching.",
      linkedIn: "https://linkedin.com",
      seniority: "Director",
      badges: ["FAANG", "Leadership"],
      specialty: "Marketing",
      availability: "Limited",
    },
    {
      id: "m4",
      name: "David Kim",
      title: "Staff Software Engineer",
      company: "Netflix",
      avatar: "/placeholder.svg",
      rating: 4.9,
      fee: 140,
      bio: "Staff engineer with deep technical expertise. Helps candidates ace technical rounds.",
      linkedIn: "https://linkedin.com",
      seniority: "Staff",
      badges: ["FAANG", "Tech Expert"],
      specialty: "Engineering",
      availability: "Available",
    },
  ];

  const mentorSessions: MentorSession[] = [
    {
      id: "ms1",
      mentorId: "m1",
      mentorName: "Sarah Chen",
      mentorAvatar: "/placeholder.svg",
      topic: "PM Interview Preparation",
      dateTime: "2025-11-10T14:00:00",
      targetJobId: "job1",
      status: "upcoming",
      meetingLink: "https://meet.google.com/abc-defg-hij",
    },
    {
      id: "ms2",
      mentorId: "m2",
      mentorName: "Michael Rodriguez",
      mentorAvatar: "/placeholder.svg",
      topic: "Technical Round Prep",
      dateTime: "2025-10-20T10:00:00",
      targetJobId: "job1",
      status: "completed",
      notes: "Great session! Covered system design patterns.",
      coachingReport: {
        summary: "Strong technical foundation. Focus on communication during whiteboarding.",
        actionItems: [
          "Practice explaining thought process out loud",
          "Review distributed systems patterns",
          "Work on time complexity analysis",
        ],
      },
    },
  ];

  // Filter and sort mentors
  const filteredMentors = mentors
    .filter((mentor) => {
      const matchesSearch =
        mentorSearchQuery === "" ||
        mentor.name.toLowerCase().includes(mentorSearchQuery.toLowerCase()) ||
        mentor.company.toLowerCase().includes(mentorSearchQuery.toLowerCase()) ||
        mentor.title.toLowerCase().includes(mentorSearchQuery.toLowerCase());
      
      const matchesSpecialty =
        mentorSpecialtyFilter === "all" || mentor.specialty === mentorSpecialtyFilter;
      
      const matchesPrice =
        mentorPriceFilter === "all" ||
        (mentorPriceFilter === "low" && mentor.fee < 120) ||
        (mentorPriceFilter === "medium" && mentor.fee >= 120 && mentor.fee < 150) ||
        (mentorPriceFilter === "high" && mentor.fee >= 150);

      return matchesSearch && matchesSpecialty && matchesPrice;
    })
    .sort((a, b) => {
      if (mentorSortBy === "rating") return b.rating - a.rating;
      if (mentorSortBy === "price-low") return a.fee - b.fee;
      if (mentorSortBy === "price-high") return b.fee - a.fee;
      return 0;
    });

  const upcomingSessions = mentorSessions.filter((s) => s.status === "upcoming");
  const completedSessions = mentorSessions.filter((s) => s.status === "completed");

  const currentJob = targetJobs.find((job) => job.id === selectedJob);
  const daysUntilInterview = currentJob
    ? Math.ceil((new Date(currentJob.interviewDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
                  <Input id="jobTitle" placeholder="e.g., Senior Product Manager" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input id="company" placeholder="e.g., Google" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description</Label>
                  <Textarea id="jobDescription" placeholder="Paste the job description here..." rows={4} />
                </div>
                {/* <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interviewDate">Interview Date</Label>
                    <Input id="interviewDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prepTime">Daily Prep Time (hrs)</Label>
                    <Input id="prepTime" type="number" min="0.5" step="0.5" placeholder="2" />
                  </div>
                </div> */}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAddJobModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="gradient-primary">Generate Plan</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Target Jobs Navigation */}
        <Tabs value={selectedJob} onValueChange={setSelectedJob} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid mb-6">
            {targetJobs.map((job) => (
              <TabsTrigger key={job.id} value={job.id} className="gap-2">
                <Target className="h-4 w-4" />
                {job.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {targetJobs.map((job) => (
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
                      {job.categoryScores.map((category) => (
                        <div key={category.category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{category.category}</span>
                            <span className="text-sm font-semibold">{category.score}%</span>
                          </div>
                          <Progress value={category.score} className="h-2" />
                        </div>
                      ))}
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
                </CardContent>
              </Card>

              {/* AI Sessions Grid */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Brain className="h-6 w-6 text-primary" />
                  AI Mock Interview Sessions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiSessions.map((session) => (
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
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Score</span>
                              <span className="text-2xl font-bold text-primary">{session.score}%</span>
                            </div>
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
              </div>

              {/* Mentor Recommendations */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Recommended Mentors
                  </CardTitle>
                  <CardDescription>
                    Connect with experienced professionals for personalized coaching
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filter and Sort Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search mentors..."
                        value={mentorSearchQuery}
                        onChange={(e) => setMentorSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={mentorSpecialtyFilter} onValueChange={setMentorSpecialtyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Specialties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Specialties</SelectItem>
                        <SelectItem value="Product Management">Product Management</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={mentorPriceFilter} onValueChange={setMentorPriceFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Prices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="low">&lt; $120</SelectItem>
                        <SelectItem value="medium">$120 - $150</SelectItem>
                        <SelectItem value="high">&gt; $150</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={mentorSortBy} onValueChange={setMentorSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scrollable Mentor List */}
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3 pr-4">
                      {filteredMentors.map((mentor) => (
                        <Card
                          key={mentor.id}
                          className="shadow-card hover:shadow-glow transition-smooth border-l-4 border-l-primary/50"
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                              <Avatar className="h-16 w-16 flex-shrink-0">
                                <AvatarImage src={mentor.avatar} alt={mentor.name} />
                                <AvatarFallback>
                                  {mentor.name.split(" ").map((n) => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                      <h3 className="font-bold text-lg">{mentor.name}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {mentor.title} at {mentor.company}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {mentor.availability}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {mentor.seniority}
                                    </Badge>
                                    {mentor.badges.map((badge) => (
                                      <Badge key={badge} className="text-xs bg-primary/10">
                                        {badge}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {mentor.bio}
                                </p>

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 fill-primary text-primary" />
                                      <span className="font-semibold text-sm">{mentor.rating}</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-4 w-4 text-primary" />
                                      <span className="font-semibold text-sm">${mentor.fee}/hr</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedMentor(mentor)}
                                        >
                                          View Details
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[550px]">
                                        <DialogHeader>
                                          <DialogTitle>Mentor Profile</DialogTitle>
                                        </DialogHeader>
                                        <ScrollArea className="max-h-[600px]">
                                          <div className="space-y-6 pr-4">
                                            <div className="flex items-start gap-4">
                                              <Avatar className="h-20 w-20">
                                                <AvatarImage src={mentor.avatar} alt={mentor.name} />
                                                <AvatarFallback>
                                                  {mentor.name.split(" ").map((n) => n[0]).join("")}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1">
                                                <h3 className="text-xl font-bold">{mentor.name}</h3>
                                                <p className="text-muted-foreground">
                                                  {mentor.title} at {mentor.company}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                  <Badge variant="secondary">{mentor.seniority}</Badge>
                                                  {mentor.badges.map((badge) => (
                                                    <Badge key={badge} className="bg-primary/10">
                                                      {badge}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                              <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                  <Star className="h-4 w-4 fill-primary text-primary" />
                                                  <span className="font-bold">{mentor.rating}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Rating</p>
                                              </div>
                                              <div className="text-center">
                                                <p className="font-bold">${mentor.fee}</p>
                                                <p className="text-xs text-muted-foreground">per hour</p>
                                              </div>
                                              <div className="text-center">
                                                <p className="font-bold text-secondary">{mentor.availability}</p>
                                                <p className="text-xs text-muted-foreground">Status</p>
                                              </div>
                                            </div>

                                            <div>
                                              <h4 className="font-semibold mb-2">About</h4>
                                              <p className="text-sm text-muted-foreground">{mentor.bio}</p>
                                            </div>

                                            <div>
                                              <h4 className="font-semibold mb-2">Specialty</h4>
                                              <Badge variant="outline">{mentor.specialty}</Badge>
                                            </div>

                                            <Separator />

                                            <div className="flex gap-3">
                                              <Button variant="outline" className="flex-1" asChild>
                                                <a
                                                  href={mentor.linkedIn}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                >
                                                  <LinkedinIcon className="h-4 w-4 mr-2" />
                                                  LinkedIn
                                                </a>
                                              </Button>
                                              <Button className="flex-1 gradient-primary">
                                                <Calendar className="h-4 w-4 mr-2" />
                                                Book Session
                                              </Button>
                                            </div>
                                          </div>
                                        </ScrollArea>
                                      </DialogContent>
                                    </Dialog>
                                    <Button size="sm" className="gradient-primary">
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Book
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {filteredMentors.length === 0 && (
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">No mentors found matching your criteria</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Mentor Sessions */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    Mentor Sessions
                  </CardTitle>
                  <CardDescription>Manage your coaching sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="upcoming" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upcoming">
                        Upcoming ({upcomingSessions.length})
                      </TabsTrigger>
                      <TabsTrigger value="completed">
                        Completed ({completedSessions.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="space-y-4">
                      {upcomingSessions.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">No upcoming sessions scheduled</p>
                          <Button className="mt-4" variant="outline">
                            Book a Mentor
                          </Button>
                        </div>
                      ) : (
                        upcomingSessions.map((session) => {
                          const sessionDate = new Date(session.dateTime);
                          const daysUntil = Math.ceil(
                            (sessionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                          );
                          return (
                            <Card
                              key={session.id}
                              className="border-l-4 border-l-secondary hover:shadow-glow transition-smooth"
                            >
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <Avatar className="h-14 w-14 flex-shrink-0">
                                    <AvatarImage src={session.mentorAvatar} alt={session.mentorName} />
                                    <AvatarFallback>
                                      {session.mentorName.split(" ").map((n) => n[0]).join("")}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 space-y-2">
                                    <div>
                                      <h3 className="font-bold">{session.mentorName}</h3>
                                      <p className="text-sm text-muted-foreground">{session.topic}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-sm">
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>{sessionDate.toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                          {sessionDate.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      {daysUntil <= 2 && (
                                        <Badge variant="secondary" className="bg-secondary/20">
                                          In {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                      {session.meetingLink && (
                                        <Button size="sm" className="gradient-primary" asChild>
                                          <a
                                            href={session.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Join Meeting
                                          </a>
                                        </Button>
                                      )}
                                      <Button size="sm" variant="outline">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Reschedule
                                      </Button>
                                      <Button size="sm" variant="outline">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-4">
                      {completedSessions.length === 0 ? (
                        <div className="text-center py-12">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">No completed sessions yet</p>
                        </div>
                      ) : (
                        completedSessions.map((session) => (
                          <Card key={session.id} className="border-l-4 border-l-primary/50">
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <Avatar className="h-14 w-14 flex-shrink-0">
                                  <AvatarImage src={session.mentorAvatar} alt={session.mentorName} />
                                  <AvatarFallback>
                                    {session.mentorName.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="font-bold">{session.mentorName}</h3>
                                      <p className="text-sm text-muted-foreground">{session.topic}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-secondary/20">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Completed
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>{new Date(session.dateTime).toLocaleDateString()}</span>
                                    </div>
                                  </div>

                                  {session.notes && (
                                    <p className="text-sm text-muted-foreground italic">"{session.notes}"</p>
                                  )}

                                  {session.coachingReport && (
                                    <Sheet>
                                      <SheetTrigger asChild>
                                        <Button size="sm" variant="outline" className="mt-2">
                                          <FileText className="h-4 w-4 mr-2" />
                                          View Coaching Report
                                        </Button>
                                      </SheetTrigger>
                                      <SheetContent className="w-full sm:max-w-2xl">
                                        <SheetHeader>
                                          <SheetTitle>Coaching Report</SheetTitle>
                                          <SheetDescription>
                                            Session with {session.mentorName}
                                          </SheetDescription>
                                        </SheetHeader>
                                        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                                          <div className="space-y-6 pr-4">
                                            <div className="bg-muted/50 p-4 rounded-lg">
                                              <h3 className="font-semibold mb-2">Summary</h3>
                                              <p className="text-sm">{session.coachingReport.summary}</p>
                                            </div>

                                            <div>
                                              <h3 className="font-semibold mb-3">Action Items</h3>
                                              <ul className="space-y-2">
                                                {session.coachingReport.actionItems.map((item, idx) => (
                                                  <li
                                                    key={idx}
                                                    className="flex items-start gap-2 text-sm"
                                                  >
                                                    <CheckCircle2 className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                                                    <span>{item}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>

                                            <Button className="w-full" variant="outline">
                                              Request Follow-up Session
                                            </Button>
                                          </div>
                                        </ScrollArea>
                                      </SheetContent>
                                    </Sheet>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

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
                  <div className="space-y-3">
                    {aiSessions
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
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default InterviewPrep;
