import { useState } from 'react';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Badge } from '@/components/newDesign/ui/badge';
import { Card, CardContent } from '@/components/newDesign/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/newDesign/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/newDesign/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/newDesign/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/newDesign/ui/sheet";
import { Label } from "@/components/newDesign/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/newDesign/ui/radio-group";
import { ScrollArea } from "@/components/newDesign/ui/scroll-area";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/newDesign/ui/tooltip";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Bookmark, 
  Sparkles,
  Zap,
  Timer,
  Mic,
  Volume2,
  ListChecks,
  PlayCircle,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

// Mock Data for General Job Listings
const GENERAL_JOBS = [
  {
    id: 1,
    title: "Senior Full Stack Engineer",
    company: "TechNova",
    location: "Remote",
    type: "Full-time",
    salary: "$140k - $180k",
    posted: "2 hours ago",
    logo: "T",
    logoBg: "bg-indigo-600",
    tags: ["React", "Node.js", "TypeScript"],
    featured: true
  },
  {
    id: 2,
    title: "Product Designer",
    company: "Creativ",
    location: "New York, NY",
    type: "Hybrid",
    salary: "$110k - $150k",
    posted: "5 hours ago",
    logo: "C",
    logoBg: "bg-pink-600",
    tags: ["Figma", "Design Systems", "UI/UX"],
    featured: false
  },
  {
    id: 3,
    title: "Engineering Manager",
    company: "BuildStream",
    location: "San Francisco, CA",
    type: "On-site",
    salary: "$180k - $240k",
    posted: "1 day ago",
    logo: "B",
    logoBg: "bg-orange-500",
    tags: ["Leadership", "Agile", "SaaS"],
    featured: false
  },
  {
    id: 4,
    title: "Frontend Developer",
    company: "PixelPerfect",
    location: "Remote",
    type: "Contract",
    salary: "$60 - $90 / hr",
    posted: "1 day ago",
    logo: "P",
    logoBg: "bg-purple-600",
    tags: ["Vue.js", "Tailwind", "Frontend"],
    featured: false
  },
  {
    id: 5,
    title: "Data Scientist",
    company: "DataFlow",
    location: "Austin, TX",
    type: "Full-time",
    salary: "$130k - $170k",
    posted: "2 days ago",
    logo: "D",
    logoBg: "bg-blue-500",
    tags: ["Python", "Machine Learning", "SQL"],
    featured: false
  },
  {
    id: 6,
    title: "DevOps Engineer",
    company: "CloudScale",
    location: "Seattle, WA",
    type: "Hybrid",
    salary: "$150k - $190k",
    posted: "3 days ago",
    logo: "C",
    logoBg: "bg-cyan-600",
    tags: ["AWS", "Kubernetes", "Terraform"],
    featured: false
  }
];

const APPLIED_JOBS = [
  {
    id: 101,
    company: 'Netflix',
    role: 'Senior Frontend Engineer',
    location: 'Los Gatos, CA',
    status: 'Interviewing',
    appliedDate: '2d ago',
    logo: 'N',
    logoBg: 'bg-red-600',
    statusColor: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  {
    id: 102,
    company: 'Stripe',
    role: 'Product Engineer',
    location: 'San Francisco, CA',
    status: 'Under Review',
    appliedDate: '5d ago',
    logo: 'S',
    logoBg: 'bg-indigo-500',
    statusColor: 'text-amber-700 bg-amber-50 border-amber-200'
  },
  {
    id: 103,
    company: 'Vercel',
    role: 'Design Engineer',
    location: 'Remote',
    status: 'Applied',
    appliedDate: '1w ago',
    logo: 'V',
    logoBg: 'bg-black',
    statusColor: 'text-slate-700 bg-slate-50 border-slate-200'
  }
];

export default function JobBoardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number>(GENERAL_JOBS[0].id);

  const selectedJob = GENERAL_JOBS.find(j => j.id === selectedJobId) || GENERAL_JOBS[0];

  const toggleSaveJob = (id: number) => {
    if (savedJobIds.includes(id)) {
      setSavedJobIds(prev => prev.filter(jobId => jobId !== id));
      toast.success("Job removed from saved items");
    } else {
      setSavedJobIds(prev => [...prev, id]);
      toast.success("Job saved successfully");
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)] flex flex-col font-sans text-slate-900">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Section */}
          

          {/* Main Content Area */}
          <Tabs defaultValue="browse" className="w-full">


            {/* Browse Jobs Tab */}
            <TabsContent value="browse" className="space-y-6">
              
              {/* Search Bar */}
              <div className="flex flex-col md:flex-row gap-4 px-[0px] py-[12px] mx-[0px] mt-[0px] mb-[10px]">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <Input 
                    placeholder="Job title, keywords, or company" 
                    className="h-10 text-sm border-slate-200 bg-white focus-visible:ring-slate-900 rounded-full shadow-sm pl-[44px] pr-[12px] py-[4px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <Input 
                    placeholder="City, state, zip code, or 'Remote'" 
                    className="pl-11 h-10 text-sm border-slate-200 bg-white focus-visible:ring-slate-900 rounded-full shadow-sm"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 h-10 rounded-full text-sm shadow-sm transition-all hover:shadow-md">
                  Search Jobs
                </Button>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3 items-center mx-[0px] mt-[0px] mb-4">
                <Select defaultValue="any-date">
                  <SelectTrigger className="w-[160px] bg-white border-slate-200 h-10 text-sm rounded-full hover:bg-slate-50 transition-colors">
                    <SelectValue placeholder="Date Posted" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-date">Any time</SelectItem>
                    <SelectItem value="past-24h">Past 24 hours</SelectItem>
                    <SelectItem value="past-week">Past week</SelectItem>
                    <SelectItem value="past-month">Past month</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="any-exp">
                  <SelectTrigger className="w-[200px] bg-white border-slate-200 h-10 text-sm rounded-full hover:bg-slate-50 transition-colors">
                    <SelectValue placeholder="Experience Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-exp">Any experience</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="associate">Associate</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="any-type">
                  <SelectTrigger className="w-[150px] bg-white border-slate-200 h-10 text-sm rounded-full hover:bg-slate-50 transition-colors">
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-type">Any job type</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="any-remote">
                  <SelectTrigger className="w-[160px] bg-white border-slate-200 h-10 text-sm rounded-full hover:bg-slate-50 transition-colors">
                    <SelectValue placeholder="Remote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-remote">On-site/Remote</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" className="text-sm text-slate-500 hover:text-slate-900 ml-auto h-10 hover:bg-slate-100 rounded-full px-4">
                  Clear All Filters
                </Button>
              </div>

              {/* Main Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Job List */}
                <div className="lg:col-span-5 flex flex-col sticky top-6 h-[calc(100vh-3rem)]">
                  <div className="flex items-center justify-between pb-4">
                    <h2 className="font-semibold text-slate-900 text-lg">Latest Openings</h2>
                    <span className="text-sm text-slate-500 font-medium">{GENERAL_JOBS.length} jobs</span>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-2 flex-1 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {GENERAL_JOBS.map((job) => (
                      <Card 
                        key={job.id} 
                        className={`group cursor-pointer transition-all duration-200 border bg-white rounded-xl overflow-hidden hover:shadow-md ${
                          selectedJobId === job.id 
                            ? 'border-blue-600 ring-1 ring-blue-600 ring-inset shadow-sm' 
                            : 'border-slate-200 hover:border-blue-400'
                        }`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-start">
                            {/* Logo */}
                            <div className={`w-12 h-12 rounded-full ${job.logoBg} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm`}>
                              {job.logo}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-bold text-base mb-1 truncate ${
                                selectedJobId === job.id ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'
                              }`}>
                                {job.title}
                              </h3>
                              <p className="text-sm font-medium text-slate-700 mb-2 truncate">{job.company}</p>
                              
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  <MapPin className="w-3 h-3" /> {job.location}
                                </span>
                                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  <DollarSign className="w-3 h-3" /> {job.salary}
                                </span>
                              </div>
                              
                              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {job.posted}
                                </span>
                                <div className="flex gap-2 items-center">
                                  {job.id % 2 === 0 ? (
                                  <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    <Sparkles className="w-3 h-3" />
                                    80% Match
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                    <Sparkles className="w-3 h-3" />
                                    20% Match
                                  </span>
                                )}
                                  {job.featured && (
                                    <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Featured</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button variant="outline" className="w-full mt-4 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-full">
                       Load more jobs
                     </Button>
                  </div>
                </div>

                {/* Right Column: Job Details */}
                <div className="hidden lg:flex lg:col-span-7 flex-col">
                   <Card className="border-slate-200 shadow-sm bg-white rounded-2xl flex flex-col min-h-[600px]">
                     {selectedJob ? (
                       <>
                         <div className="border-b border-slate-100 flex-none p-[24px]">
                            <div className="flex items-start justify-between gap-4">
                               <div className="flex gap-4">
                                  <div className={`w-16 h-16 rounded-2xl ${selectedJob.logoBg} flex items-center justify-center text-white font-bold text-3xl shadow-sm`}>
                                    {selectedJob.logo}
                                  </div>
                                  <div>
                                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">{selectedJob.title}</h1>
                                    <div className="text-lg font-medium text-slate-600 mt-1">{selectedJob.company}</div>
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    className={`rounded-full border-slate-200 ${savedJobIds.includes(selectedJob.id) ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => toggleSaveJob(selectedJob.id)}
                                  >
                                     <Bookmark className={`w-5 h-5 ${savedJobIds.includes(selectedJob.id) ? 'fill-current' : ''}`} />
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    className="rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-4"
                                    onClick={() => document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' })}
                                  >
                                    <Zap className="w-4 h-4 mr-2 text-amber-500" />
                                    Practice
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full px-6 shadow-sm shadow-blue-200">
                                        Apply Now
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md text-center">
                                      <DialogHeader className="items-center">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-2">
                                          <Sparkles className="w-7 h-7 text-blue-600" />
                                        </div>
                                        <DialogTitle className="text-xl">Sign up to unlock all content</DialogTitle>
                                        <DialogDescription className="text-slate-500 text-sm leading-relaxed">
                                          Create a free account to apply for jobs, save listings, and get personalized recommendations.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter className="flex flex-col gap-3 sm:flex-col mt-2">
                                        <a href="/auth">
                                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 shadow-sm">
                                            Sign Up Free
                                          </Button>
                                        </a>
                                        <a href="/auth?login=true">
                                          <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg py-2.5">
                                            Already have an account? Log In
                                          </Button>
                                        </a>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                               </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-6">
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 text-xs font-medium text-slate-500">
                                <Briefcase className="w-3.5 h-3.5" /> {selectedJob.type}
                              </span>
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 text-xs font-medium text-slate-500">
                                <MapPin className="w-3.5 h-3.5" /> {selectedJob.location}
                              </span>
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 text-xs font-medium text-slate-500">
                                <DollarSign className="w-3.5 h-3.5" /> {selectedJob.salary}
                              </span>
                              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 text-xs font-medium text-slate-500">
                                <Clock className="w-3.5 h-3.5" /> Posted {selectedJob.posted}
                              </span>
                            </div>
                         </div>

                         <div className="w-full space-y-8 px-8 pt-6 pb-8">
                            
                            {/* Practice Section */}
                            <div id="practice-section" className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-5 relative overflow-hidden group p-[20px] mx-[0px] mt-[0px] mb-[26px]">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="w-24 h-24 text-amber-500" />
                              </div>
                              
                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                                      Practice for this role
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Tailored questions generated from this job description.</p>
                                  </div>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                                        Start Practice
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Practice Setup</DialogTitle>
                                        <DialogDescription>Customize your interview practice session.</DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-6 py-4">
                                         <div className="space-y-3">
                                            <Label className="text-sm font-medium text-slate-700">Practice Mode</Label>
                                            <RadioGroup defaultValue="text" className="grid grid-cols-2 gap-4">
                                               <div>
                                                  <RadioGroupItem value="text" id="mode-text" className="peer sr-only" />
                                                  <Label htmlFor="mode-text" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer transition-all">
                                                     <ListChecks className="mb-2 h-6 w-6 text-slate-600" />
                                                     <span className="text-sm font-medium">Text Based</span>
                                                  </Label>
                                               </div>
                                               <div>
                                                  <RadioGroupItem value="voice" id="mode-voice" className="peer sr-only" />
                                                  <Label htmlFor="mode-voice" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer transition-all">
                                                     <Mic className="mb-2 h-6 w-6 text-slate-600" />
                                                     <span className="text-sm font-medium">Voice Mode</span>
                                                  </Label>
                                               </div>
                                            </RadioGroup>
                                         </div>

                                         <div className="space-y-3">
                                            <Label className="text-sm font-medium text-slate-700">Timer Settings</Label>
                                            <div className="flex gap-3">
                                               {['Off', '5 min', '10 min', '20 min'].map((time) => (
                                                  <Button key={time} variant="outline" size="sm" className={`flex-1 ${time === '10 min' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}`}>
                                                     {time}
                                                  </Button>
                                               ))}
                                            </div>
                                         </div>
                                      </div>
                                      <DialogFooter>
                                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Start Session</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                
                                <div className="space-y-2.5">
                                  {[
                                    { q: "Tell me about a time you handled a difficult stakeholder.", type: "Behavioral", time: "5 min", diff: "Medium", match: "Communication" }
                                  ].map((item, i) => (
                                    <div key={i} className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3 group/item">
                                       <div className="flex-1">
                                          <h4 className="text-sm font-semibold text-slate-800 mb-1.5">{item.q}</h4>
                                          <div className="flex items-center flex-wrap gap-2">
                                             <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{item.type}</span>
                                             <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{item.diff}</span>
                                             <span className="text-[10px] flex items-center gap-1 text-slate-400">
                                                <Timer className="w-3 h-3" /> {item.time}
                                             </span>
                                          </div>
                                       </div>
                                       <div className="flex flex-col gap-2 items-end">
                                          <TooltipProvider>
                                             <Tooltip>
                                                <TooltipTrigger asChild>
                                                   <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-help">Why this?</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                   <p>Mapped to requirement: {item.match}</p>
                                                </TooltipContent>
                                             </Tooltip>
                                          </TooltipProvider>
                                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                             Practice <PlayCircle className="w-3 h-3 ml-1" />
                                          </Button>
                                       </div>
                                    </div>
                                  ))}
                                </div>

                                <Sheet>
                                  <SheetTrigger asChild>
                                     <Button variant="link" className="px-0 text-blue-600 h-auto mt-3 text-sm font-medium hover:text-blue-700 p-0 flex items-center gap-1">
                                       View all tailored questions (12) <span className="text-lg leading-none">›</span>
                                     </Button>
                                  </SheetTrigger>
                                  <SheetContent className="sm:max-w-xl w-full flex flex-col h-full">
                                     <SheetHeader className="pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2 text-amber-500 mb-1">
                                           <Zap className="w-5 h-5 fill-current" />
                                           <span className="text-xs font-bold uppercase tracking-wider text-amber-600">AI Generated</span>
                                        </div>
                                        <SheetTitle className="text-xl">Tailored Interview Questions</SheetTitle>
                                        <SheetDescription>
                                           Generated from the current job description. Refresh if the JD changes.
                                        </SheetDescription>
                                     </SheetHeader>
                                     
                                     <div className="py-4">
                                        <Tabs defaultValue="recommended" className="w-full">
                                           <TabsList className="w-full justify-start bg-slate-100 p-1 mb-4">
                                              <TabsTrigger value="recommended" className="flex-1">Recommended</TabsTrigger>
                                              <TabsTrigger value="all" className="flex-1">All Questions</TabsTrigger>
                                              <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
                                           </TabsList>
                                           <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                              {['Behavioral', 'Technical', 'System Design', 'Product'].map(filter => (
                                                 <Badge key={filter} variant="outline" className="cursor-pointer hover:bg-slate-50 border-slate-200 text-slate-600 whitespace-nowrap">
                                                    {filter}
                                                 </Badge>
                                              ))}
                                           </div>
                                           <TabsContent value="recommended" className="mt-0 h-[calc(100vh-250px)]">
                                              <ScrollArea className="h-full pr-4">
                                                 <div className="space-y-3">
                                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                                       <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                                                          <div className="flex justify-between items-start mb-2">
                                                             <div className="flex gap-2 mb-2">
                                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-2 h-5">Behavioral</Badge>
                                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-2 h-5">Medium</Badge>
                                                             </div>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-blue-600">
                                                                <Bookmark className="w-4 h-4" />
                                                             </Button>
                                                          </div>
                                                          <h4 className="font-semibold text-slate-900 mb-2 leading-snug">
                                                             Describe a situation where you had to compromise on technical quality to meet a deadline.
                                                          </h4>
                                                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                                             <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                <Timer className="w-3 h-3" /> 10 min est.
                                                             </span>
                                                             <Button size="sm" className="h-8 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 shadow-sm">
                                                                <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Practice
                                                             </Button>
                                                          </div>
                                                       </div>
                                                    ))}
                                                 </div>
                                              </ScrollArea>
                                           </TabsContent>
                                        </Tabs>
                                     </div>
                                  </SheetContent>
                                </Sheet>
                              </div>
                            </div>

                            <section>
                               <h3 className="text-lg font-bold text-slate-900 mb-3">About the Role</h3>
                               <p className="text-slate-600 leading-relaxed">
                                  We are looking for a talented {selectedJob.title} to join our team at {selectedJob.company}. 
                                  In this role, you will be responsible for developing scalable web applications, collaborating with cross-functional teams, 
                                  and ensuring high performance and responsiveness of our products. You will have the opportunity to work with 
                                  modern technologies and contribute to key architectural decisions.
                               </p>
                            </section>

                            <section>
                               <h3 className="text-lg font-bold text-slate-900 mb-3">Key Responsibilities</h3>
                               <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600">
                                  <li>Design, develop, and maintain high-quality software solutions.</li>
                                  <li>Collaborate with product managers and designers to define software requirements.</li>
                                  <li>Troubleshoot, debug, and upgrade existing software.</li>
                                  <li>Write clean, scalable, and efficient code.</li>
                                  <li>Participate in code reviews and contribute to engineering best practices.</li>
                               </ul>
                            </section>

                            <section>
                               <h3 className="text-lg font-bold text-slate-900 mb-3">Requirements</h3>
                               <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600">
                                  <li>3+ years of experience in software development.</li>
                                  <li>Strong proficiency in {selectedJob.tags.join(', ')}.</li>
                                  <li>Experience with cloud platforms and modern development tools.</li>
                                  <li>Excellent problem-solving skills and attention to detail.</li>
                                  <li>Strong communication and teamwork abilities.</li>
                               </ul>
                            </section>

                            <section>
                               <h3 className="text-lg font-bold text-slate-900 mb-3">Skills & Technologies</h3>
                               <div className="flex flex-wrap gap-2">
                                  {selectedJob.tags.map(tag => (
                                     <Badge key={tag} variant="outline" className="font-medium text-slate-600 border-slate-200 bg-slate-50/50 px-2.5 py-0.5">
                                        {tag}
                                     </Badge>
                                  ))}
                               </div>
                            </section>
                         </div>
                       </>
                     ) : (
                       <div className="flex items-center justify-center h-full text-slate-400">
                          Select a job to view details
                       </div>
                     )}
                   </Card>
                </div>
              </div>
            </TabsContent>

            {/* Saved Jobs Tab */}
            <TabsContent value="saved">
               {savedJobIds.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                     <Bookmark className="w-7 h-7 text-slate-400" />
                   </div>
                   <h3 className="text-xl font-semibold text-slate-900 mb-2">No saved jobs yet</h3>
                   <p className="text-slate-500 max-w-sm mx-auto mb-6">
                     Jobs you save will appear here so you can easily apply to them later.
                   </p>
                   <Button 
                     variant="outline" 
                     className="px-6"
                     onClick={() => document.querySelector('[value="browse"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}
                   >
                     Browse Jobs
                   </Button>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <h2 className="font-semibold text-slate-900 text-lg">Saved Jobs ({savedJobIds.length})</h2>
                   {GENERAL_JOBS.filter(job => savedJobIds.includes(job.id)).map((job) => (
                      <Card key={job.id} className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                           {/* Simplified card for saved view */}
                           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-lg ${job.logoBg} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                                   {job.logo}
                                 </div>
                                 <div>
                                   <h3 className="font-bold text-slate-900 text-lg">{job.title}</h3>
                                   <p className="text-sm text-slate-500 font-medium">{job.company} • {job.location}</p>
                                 </div>
                              </div>
                              <div className="flex gap-3 w-full sm:w-auto">
                                 <Button size="sm" variant="outline" className="flex-1 sm:flex-none border-slate-200" onClick={() => toggleSaveJob(job.id)}>Remove</Button>
                                 <Button size="sm" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Apply Now</Button>
                              </div>
                           </div>
                        </CardContent>
                      </Card>
                   ))}
                 </div>
               )}
            </TabsContent>

            {/* Applied Jobs Tab */}
            <TabsContent value="applied" className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start">
                 <div className="bg-blue-100 p-3 rounded-xl shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                 </div>
                 <div>
                   <h3 className="font-semibold text-blue-900 text-base">Application Tracker</h3>
                   <p className="text-blue-700 mt-1 leading-relaxed">Keep track of all your applications in one place. Updates are synced automatically for supported platforms.</p>
                 </div>
              </div>

              <div className="grid gap-4">
                 {APPLIED_JOBS.map((job) => (
                   <Card key={job.id} className="border-slate-200 bg-white hover:shadow-sm transition-shadow rounded-xl">
                     <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center w-full sm:w-auto">
                          <div className={`w-12 h-12 rounded-lg ${job.logoBg} flex items-center justify-center text-white font-bold shrink-0 text-lg shadow-sm`}>
                             {job.logo}
                          </div>
                          <div>
                             <h3 className="font-bold text-slate-900 text-lg">{job.role}</h3>
                             <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <span>{job.company}</span>
                                <span className="text-slate-300">•</span>
                                <span>Applied {job.appliedDate}</span>
                             </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                           <Badge variant="outline" className={`${job.statusColor} font-semibold border px-4 py-1.5 rounded-full`}>
                              {job.status}
                           </Badge>
                        </div>
                     </CardContent>
                   </Card>
                 ))}
              </div>
            </TabsContent>

          </Tabs>

        </div>
      </main>

      <Footer />
    </div>
  );
}