import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  ExternalLink,
  ThumbsUp,
  X,
  Sparkles,
  Zap,
  Filter,
  MoreHorizontal,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Gift,
  Check,
  Users,
  Info,
  ShieldCheck,
  Loader2,
  Crown,
  Target,
  Send,
  FileText,
  Plus,
  Tag
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Badge } from '@/components/newDesign/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/newDesign/ui/tabs';
import { Card, CardContent } from '@/components/newDesign/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/newDesign/ui/tooltip';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/newDesign/ui/dialog";
import { Checkbox } from "@/components/newDesign/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/newDesign/ui/sheet";
import { ScrollArea } from "@/components/newDesign/ui/scroll-area";
import { Separator } from "@/components/newDesign/ui/separator";
import { Label } from "@/components/newDesign/ui/label";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { InterviewService, ProfileService, JobService } from "@/services";
import { useUserPlan, useUpgradePrompt } from '@/hooks/useUserPlan';

// Mock Data for Jobs (fallback if API fails)
const JOB_LISTINGS = [
  {
    id: 1,
    company: 'TechFlow Solutions',
    logoColor: 'bg-blue-100 text-blue-600',
    logoLetter: 'T',
    title: 'Senior Frontend Engineer',
    date: 'Today',
    salary: '$120k - $160k',
    type: 'Full-time',
    location: 'Remote',
    tags: ['Worth Exploring', 'React Expert'],
    description: 'We are looking for a Senior Frontend Engineer to join our core product team. You will be responsible for building scalable UI components and optimizing performance.',
    matchScore: 92,
    isNew: true,
    introAvailable: true,
  },
  {
    id: 2,
    company: 'GreenScape Design',
    logoColor: 'bg-green-100 text-green-600',
    logoLetter: 'G',
    title: 'Product Designer (UX/UI)',
    date: 'Yesterday',
    salary: '$90k - $130k',
    type: 'Contract',
    location: 'Hybrid',
    tags: ['Design Focused'],
    description: 'Seeking a talented Product Designer to revamp our mobile application. Experience with Figma and design systems is a must.',
    matchScore: 85,
    isNew: false,
  },
  {
    id: 3,
    company: 'Nebula AI',
    logoColor: 'bg-cyan-100 text-cyan-600',
    logoLetter: 'N',
    title: 'Machine Learning Engineer',
    date: '2 days ago',
    salary: '$150k - $200k',
    type: 'Full-time',
    location: 'San Francisco, CA',
    tags: ['High Growth', 'AI'],
    description: 'Join our research team to develop state-of-the-art NLP models. Strong background in Python and PyTorch required.',
    matchScore: 88,
    isNew: false,
  },
  {
    id: 4,
    company: 'Swift Logistics',
    logoColor: 'bg-orange-100 text-orange-600',
    logoLetter: 'S',
    title: 'Backend Developer',
    date: '3 days ago',
    salary: '$110k - $140k',
    type: 'Full-time',
    location: 'Remote',
    tags: ['Stable'],
    description: 'Looking for a backend developer to maintain and scale our logistics platform. Experience with Node.js and PostgreSQL is preferred.',
    matchScore: 78,
    isNew: false,
    introAvailable: false,
  },
];

const APPLIED_JOBS = [
  {
    id: 1,
    company: 'Netflix',
    role: 'Senior Frontend Engineer',
    location: 'Los Gatos, CA',
    status: 'Interviewing',
    appliedDate: '2d ago',
    logo: 'N',
    color: 'bg-red-100 text-red-600',
    statusColor: 'bg-blue-50 text-blue-700 border border-blue-100'
  },
  {
    id: 2,
    company: 'Stripe',
    role: 'Product Engineer',
    location: 'San Francisco, CA',
    status: 'Under Review',
    appliedDate: '5d ago',
    logo: 'S',
    color: 'bg-blue-100 text-blue-600',
    statusColor: 'bg-yellow-50 text-yellow-700 border border-yellow-100'
  },
  {
    id: 3,
    company: 'Vercel',
    role: 'Design Engineer',
    location: 'Remote',
    status: 'Applied',
    appliedDate: '1w ago',
    logo: 'V',
    color: 'bg-black text-white',
    statusColor: 'bg-gray-50 text-gray-700 border border-gray-100'
  },
  {
    id: 4,
    company: 'Linear',
    role: 'Product Designer',
    location: 'Remote',
    status: 'Rejected',
    appliedDate: '2w ago',
    logo: 'L',
    color: 'bg-sky-100 text-sky-600',
    statusColor: 'bg-red-50 text-red-700 border border-red-100'
  }
];

export function JobsPage() {
  const { toast: shadcnToast } = useToast();
  const navigate = useNavigate();
  
  // Use the user plan hook
  const { 
    planData, 
    isLoading: isPlanLoading, 
    isFree, 
    canAccessJobs, 
    canPushProfile 
  } = useUserPlan();
  const { upgradeToPro, isChangingPlan } = useUpgradePrompt();
  console.log(planData)
  const [activeTab, setActiveTab] = useState('for-you');
  const [appliedJobs, setAppliedJobs] = useState(APPLIED_JOBS);
  const [showIntro, setShowIntro] = useState(false);
  
  // Job search states
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('sevenDays');
  const [sortBy, setSortBy] = useState('RELEVANCE');
  
  // Selection states
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [bulkPushModalOpen, setBulkPushModalOpen] = useState(false);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  
  // Active Title Modal State
  const [activeTitleModalOpen, setActiveTitleModalOpen] = useState(false);
  const [availableTitles, setAvailableTitles] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedTitleOption, setSelectedTitleOption] = useState<string>('');
  const [activeTitle, setActiveTitle] = useState<{ id: number; name: string }>({ id: 1, name: '' });

  // Form state for creating new job
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const filteredJobs = JOB_LISTINGS.filter(job => !showIntro || job.introAvailable);
  const introJobs = JOB_LISTINGS.filter(job => job.introAvailable);

  // Location options
  const locations = [
    'All Locations',
    'Remote',
    'New York, NY',
    'San Francisco, CA',
    'Los Angeles, CA',
    'Chicago, IL',
    'Austin, TX',
    'Seattle, WA',
    'Boston, MA',
    'Denver, CO'
  ];

  useEffect(() => {
    const fetchActiveTitle = async () => {
      try {
        const response = await ProfileService.getProfile();
        const profileData = response.data?.data || response.data;
        
        if (profileData?.structured_resume?.job_titles?.length > 0) {
          const titles = profileData.structured_resume.job_titles;
          setAvailableTitles(titles);
          setActiveTitle({
            id: 1,
            name: titles[0]
          });
          setSelectedTitleOption(titles[0]);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    
    fetchActiveTitle();
  }, []);

  // Debounce search query - wait 800ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    if (canAccessJobs) {
      setPage(1);
      setJobs([]);
      setHasMore(true);
    }
  }, [debouncedSearchQuery, locationFilter, timeFilter, sortBy, activeTitle.name, canAccessJobs]);
  
  // Fetch jobs from API - only if user can access jobs
  useEffect(() => {
    if (canAccessJobs) {
      fetchJobs(page);
    }
  }, [page, debouncedSearchQuery, locationFilter, timeFilter, sortBy, canAccessJobs, activeTitle.name]);
  
  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore || !canAccessJobs) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore, canAccessJobs]);

  const fetchJobs = async (currentPage: number) => {
    if (!canAccessJobs) return;
    
    setLoading(true);
    try {
      const response = await JobService.searchJobs({
        query: debouncedSearchQuery ? debouncedSearchQuery : activeTitle.name || undefined,
        location: locationFilter !== 'all' ? locationFilter : undefined,
        postedDate: {
          'today': 'TODAY',
          'threeDays': 'DAYS_3',
          'sevenDays': 'DAYS_7'
        }[timeFilter],
        sortBy: sortBy,
        page: currentPage
      });
      
      if (response.data?.status === 'SUCCESS' && response.data?.data) {
        const newJobs = response.data.data;
        
        if (currentPage === 1) {
          setJobs(newJobs);
        } else {
          setJobs(prev => [...prev, ...newJobs]);
        }
        
        if (newJobs.length < 10) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      shadcnToast({
        title: 'Error',
        description: 'Failed to load jobs. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (jobId: number, newStatus: string) => {
    setAppliedJobs(currentJobs => currentJobs.map(job => {
      if (job.id !== jobId) return job;

      let newStatusColor = 'bg-gray-50 text-gray-700 border border-gray-100';
      
      switch(newStatus) {
        case 'Interviewing':
          newStatusColor = 'bg-blue-50 text-blue-700 border border-blue-100';
          break;
        case 'Under Review':
          newStatusColor = 'bg-yellow-50 text-yellow-700 border border-yellow-100';
          break;
        case 'Applied':
          newStatusColor = 'bg-gray-50 text-gray-700 border border-gray-100';
          break;
        case 'Rejected':
          newStatusColor = 'bg-red-50 text-red-700 border border-red-100';
          break;
        case 'Offer':
          newStatusColor = 'bg-green-50 text-green-700 border border-green-100';
          break;
      }

      return {
        ...job,
        status: newStatus,
        statusColor: newStatusColor
      };
    }));
    toast.success('Application status updated');
  };

  const handlePushProfile = (jobId: string) => {
    if (!canPushProfile) {
      shadcnToast({
        title: 'Premium Required',
        description: 'Upgrade to push your profile to recruiters.',
        action: <Link to="/settings?tab=plan-usage"><Button size="sm">Upgrade Now</Button></Link>
      });
      return;
    }
    setCurrentJob(jobs.find(j => j.id === jobId));
    setPushModalOpen(true);
  };

  const confirmPush = () => {
    setPushModalOpen(false);
    shadcnToast({ 
      title: 'Your profile has been pushed.',
      description: 'The recruiter will receive your profile and metrics.'
    });
  };

  const handleBulkPush = () => {
    if (!canPushProfile) {
      shadcnToast({
        title: 'Premium Required',
        description: 'Upgrade to push profiles.',
        action: <Link to="/settings?tab=plan-usage"><Button size="sm">Upgrade Now</Button></Link>
      });
      return;
    }
    setBulkPushModalOpen(true);
  };

  const confirmBulkPush = () => {
    setBulkPushModalOpen(false);
    shadcnToast({ 
      title: `Pushed to ${selectedJobs.length} jobs.`,
      description: 'Your profile has been sent to the selected recruiters.'
    });
    setSelectedJobs([]);
  };

  const toggleSelection = (id: string) => {
    setSelectedJobs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const viewJobDetail = (job: any) => {
    setCurrentJob(job);
    setJobDetailOpen(true);
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'full-time': 'Full-time',
      'contract': 'Contract',
      'part-time': 'Part-time',
      'temporary': 'Temporary',
      'internship': 'Internship'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleUpgrade = async () => {
    await upgradeToPro();
  };

  // Handle active title change
  const handleActiveTitleChange = () => {
    const newTitle = selectedTitleOption === 'custom' ? customTitle.trim() : selectedTitleOption;
    
    if (!newTitle) {
      shadcnToast({
        title: 'Error',
        description: 'Please select or enter a job title.',
        variant: 'destructive'
      });
      return;
    }

    // Clear current jobs first for visual feedback
    setJobs([]);
    
    setActiveTitle({
      id: activeTitle.id,
      name: newTitle
    });

    setActiveTitleModalOpen(false);
    shadcnToast({
      title: 'Active Title Updated',
      description: `Job search will now match "${newTitle}".`
    });
  };

  // Open modal handler
  const openActiveTitleModal = () => {
    setSelectedTitleOption(activeTitle.name || (availableTitles.length > 0 ? availableTitles[0] : 'custom'));
    setCustomTitle('');
    setActiveTitleModalOpen(true);
  };

  const renderJobCard = (job: any) => {
    // Handle both API job format and mock format
    const jobTitle = job.job_title || job.title;
    const companyName = job.company_name || job.company;
    const jobLocation = job.location;
    const jobType = job.job_type || job.type;
    const postedDate = job.posted_date ? formatDate(job.posted_date) : job.date;
    const description = job.job_description || job.description;
    const source = job.source;
    const isNew = job.isNew || (job.posted_date && new Date(job.posted_date) > new Date(Date.now() - 24*60*60*1000));
    
    // Generate logo letter
    const logoLetter = companyName?.charAt(0) || '?';
    
    // Random color for logo (since API doesn't provide it)
    const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-cyan-100 text-cyan-600', 'bg-orange-100 text-orange-600', 'bg-purple-100 text-purple-600'];
    const logoColor = colors[job.id % colors.length];

    return (
      <Card key={job.id} className="bg-white border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/50 hover:shadow-sm transition-all group">
        <CardContent className="p-5 flex gap-4 items-start">
          <div className="flex items-start pt-2">
            <Checkbox 
              checked={selectedJobs.includes(job.id.toString())}
              onCheckedChange={() => toggleSelection(job.id.toString())}
            />
          </div>
          <div className={`w-10 h-10 rounded-full ${logoColor} flex items-center justify-center font-bold text-lg shrink-0 mt-1`}>
            {logoLetter}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-sm leading-none">
                  <h4 className="font-semibold text-[hsl(222,22%,15%)]">{companyName}</h4>
                  <span className="text-[hsl(222,12%,55%)]">•</span>
                  <span className="text-[hsl(222,12%,55%)]">{postedDate}</span>
                  {isNew && (
                    <span className="w-2 h-2 bg-red-500 rounded-full" title="New Job"></span>
                  )}
                  {source && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      <Tag className="w-2 h-2 mr-1" />
                      {source}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[hsl(222,22%,15%)] leading-tight pr-8">{jobTitle}</h3>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                  {job.introAvailable && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-medium tracking-wide">
                        Referral Available
                    </div>
                  )}
                  {job.tags && job.tags.includes('Worth Exploring') && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                          <Zap className="w-3 h-3 fill-current" />
                          WORTH EXPLORING
                      </div>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(222,12%,55%)] hover:text-red-500 hover:bg-red-50">
                        <ThumbsUp className="w-3.5 h-3.5 rotate-180" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(222,12%,55%)]">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 mb-3 text-sm text-[hsl(222,12%,45%)]">
              {job.salary && (
                <span className="flex items-center gap-1.5 bg-[hsl(220,20%,97%)] px-2 py-0.5 rounded text-xs font-medium">
                  <DollarSign className="w-3.5 h-3.5" /> {job.salary}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-[hsl(220,20%,97%)] px-2 py-0.5 rounded text-xs font-medium">
                <Briefcase className="w-3.5 h-3.5" /> {getEmploymentTypeLabel(jobType)} • {jobLocation}
              </span>
            </div>

            <p className="text-sm text-[hsl(222,12%,45%)] leading-relaxed mb-4 line-clamp-2">
              {description?.substring(0, 200)}...
            </p>

            <div className="flex items-center justify-between pt-2 mt-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                className="-ml-2 text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] gap-2 h-8"
                onClick={() => viewJobDetail(job)}
              >
                  <FileText className="w-4 h-4" />
                  View Details
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)] hover:text-red-600 hover:border-red-200 hover:bg-red-50 gap-2 text-xs"
                  onClick={async () => {
                    setIsCreatingPlan(true);
                    try {
                      const response = await InterviewService.createTrainingPlanFromJobId(job.id);
                      
                      const isSuccess = 
                        response.data?.status === "success" || 
                        response.data?.data || 
                        response.status === 200 ||
                        response.status === 201;

                      if (isSuccess) {
                        toast.success("Training plan created for this job position.");
                        navigate("/interview-prep");
                      } else {
                        toast.warning("Training plan may have been created. Check interview prep page.");
                      }
                    } catch (error) {
                      console.error("Error creating training plan:", error);
                      shadcnToast({
                        title: "Error",
                        description: error.response?.data?.message || "Failed to create training plan.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsCreatingPlan(false);
                    }
                  }}
                  disabled={isCreatingPlan}
                >
                  {isCreatingPlan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add Target Job
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white gap-2 shadow-sm text-xs"
                  onClick={() => handlePushProfile(job.id.toString())}
                >
                  <Send className="w-3.5 h-3.5" />
                  Apply with AI
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Show loading while plan is being fetched
  if (isPlanLoading) {
    return (
      <DashboardLayout headerTitle="Jobs">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show upgrade prompt for Free users
  if (isFree) {
    return (
      <DashboardLayout headerTitle="Jobs">
        <TooltipProvider>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Upgrade Card */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mx-auto mb-6 flex items-center justify-center">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Upgrade to Access Job Matching</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Pro and Elite members get access to our AI-powered job matching feature, 
                  helping you find the perfect opportunities based on your skills and experience.
                </p>
                
                <div className="bg-background rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                  <h3 className="font-semibold mb-4">Pro Plan includes:</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>AI-powered job matching based on your profile</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Push your profile to recruiters</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>200 credits monthly for AI interviews</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Full report with feedback</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>3 Interview Preparations</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    size="lg" 
                    className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white"
                    onClick={handleUpgrade}
                    disabled={isChangingPlan}
                  >
                    {isChangingPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Pro - $19.90/mo
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/settings?tab=plan-usage">View All Plans</Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Feature Preview */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <Search className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Smart Search</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Search through thousands of jobs matched to your skills
                </p>
              </Card>
              <Card className="p-4 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Perfect Match</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI analyzes your profile to find the best opportunities
                </p>
              </Card>
              <Card className="p-4 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <Send className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">One-Click Apply</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Push your profile directly to recruiters
                </p>
              </Card>
            </div>
          </div>
        </TooltipProvider>
      </DashboardLayout>
    );
  }

  // Main content for Pro and Elite users
  return (
    <TooltipProvider>
      <DashboardLayout headerTitle="Jobs">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Scanner / Status Card */}
          <Card className="bg-white border-[hsl(220,16%,90%)] overflow-hidden shadow-[0_0_15px_-2px_hsl(221,91%,60%)]/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(221,91%,60%)] to-[hsl(165,82%,51%)] flex items-center justify-center shadow-md shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-[hsl(222,22%,15%)]">Screna Scout</h3>
                      <Badge variant="secondary" className="bg-[hsl(220,16%,94%)] text-[hsl(222,12%,45%)] text-[10px] uppercase tracking-wide border-0">
                        Beta
                      </Badge>
                      <Badge variant="outline" className="px-4 py-1 text-sm">
                        {planData.currentPlan} Plan
                      </Badge>
                    </div>
                    <p className="text-sm text-[hsl(222,12%,45%)] flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span>You have <span className="font-medium text-[hsl(222,22%,15%)]">{jobs.length} new matches</span> to explore today.</span>
                    </p>
                    <p className="text-xs text-[hsl(222,12%,55%)] mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Title: <span className="font-medium">{activeTitle.name || 'Not set'}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 underline hover:text-primary"
                        onClick={openActiveTitleModal}
                      >
                        Change
                      </Button>
                    </p>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(220,20%,97%)] rounded-lg border border-[hsl(220,16%,90%)]">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-xs font-medium text-[hsl(222,12%,45%)]">LinkedIn Disconnected</span>
                  </div>
                  <Button size="sm" className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white">
                    Check Connections
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search & Filter Bar */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
                <Input 
                  placeholder="Search by role, company, or keywords..." 
                  className="pl-9 bg-white border-[hsl(220,16%,90%)] focus-visible:ring-[hsl(221,91%,60%)]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Button 
                  variant="outline" 
                  onClick={() => setShowIntro(!showIntro)}
                  className={`gap-2 transition-all border rounded-full px-4 h-10 text-sm font-medium ${
                    showIntro 
                      ? 'bg-slate-100 text-slate-900 border-slate-300 shadow-sm' 
                      : 'bg-white text-[hsl(222,12%,45%)] border-[hsl(220,16%,90%)] hover:bg-slate-50'
                  }`}
                >
                  {showIntro && <Check className="w-3.5 h-3.5" />}
                  Referral available
                </Button>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[180px] border-[hsl(220,16%,90%)] bg-white">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-48 border-[hsl(220,16%,90%)] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="threeDays">Within 3 Days</SelectItem>
                  <SelectItem value="sevenDays">Within 7 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 border-[hsl(220,16%,90%)] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RELEVANCE">Sort by: Relevance</SelectItem>
                  <SelectItem value="NEWEST">Sort by: Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-1.5 px-1 opacity-80">
              <ShieldCheck className="w-3 h-3 text-[hsl(222,12%,55%)]" />
              <span className="text-[11px] text-[hsl(222,12%,55%)] font-medium">
                Recruiter contact is never shared. We forward your message on your behalf.
              </span>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedJobs.length > 0 && (
            <Card className="p-4 bg-primary/5 border-primary/20 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <span className="font-medium">Selected: {selectedJobs.length} jobs</span>
                <Button onClick={handleBulkPush} className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Apply to Selected Positions
                </Button>
              </div>
            </Card>
          )}

          {/* Tabs & Content */}
          <Tabs defaultValue="for-you" className="w-full" onValueChange={setActiveTab}>
            <div className="flex items-center justify-between overflow-x-auto pb-2 mb-2 no-scrollbar">
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {['For You', 'All', 'Applied', 'Saved'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab.toLowerCase().replace(' ', '-')}
                    className="rounded-full px-4 py-1.5 text-sm data-[state=active]:bg-[hsl(222,22%,15%)] data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-[hsl(222,12%,55%)] data-[state=inactive]:hover:bg-[hsl(220,18%,96%)] transition-all shadow-none border border-transparent"
                  >
                    {tab}
                    {tab === 'For You' && <span className="ml-2 bg-[hsl(221,91%,60%)] text-white text-[10px] px-1.5 py-0.5 rounded-full">{jobs.length}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Link to="/job-board" className="flex items-center gap-1 text-[hsl(221,91%,60%)] text-sm font-medium cursor-pointer hover:underline px-2">
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <TabsContent value="for-you" className="mt-0 space-y-4">
              {jobs.length === 0 && !loading ? (
                <Card className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Briefcase className="w-16 h-16 text-muted-foreground opacity-50" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || locationFilter !== 'all' || timeFilter !== 'sevenDays' 
                          ? 'Try adjusting your filters to see more results'
                          : 'No jobs available at the moment. Check back later!'}
                      </p>
                    </div>
                    {(searchQuery || locationFilter !== 'all' || timeFilter !== 'sevenDays') && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery('');
                          setLocationFilter('all');
                          setTimeFilter('sevenDays');
                        }}
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
                      {!debouncedSearchQuery && locationFilter === 'all' && timeFilter === 'sevenDays' && (
                        <span className="ml-1">(showing all available jobs)</span>
                      )}
                    </span>
                  </div>
                  {jobs.map(job => renderJobCard(job))}
                  
                  {loading && (
                    <Card className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading more jobs...</p>
                      </div>
                    </Card>
                  )}

                  {!hasMore && !loading && (
                    <Card className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        You've reached the end of the results
                      </p>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-8 text-center text-[hsl(222,12%,55%)]">
              <p>Scanning more jobs... Check back soon.</p>
            </TabsContent>
            
            <TabsContent value="applied" className="mt-6 space-y-4">
                {appliedJobs.map((job) => (
                  <Card key={job.id} className="bg-white border-[hsl(220,16%,90%)] hover:shadow-sm transition-all group">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                          <div className="flex gap-4 items-start">
                            <div className={`w-12 h-12 rounded-xl ${job.color} flex items-center justify-center font-bold text-lg shrink-0 border border-transparent`}>
                              {job.logo}
                            </div>
                            <div>
                              <h3 className="font-semibold text-[hsl(222,22%,15%)] text-base">{job.role}</h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[hsl(222,12%,50%)]">
                                <span className="flex items-center gap-1.5 font-medium">
                                  {job.company}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {job.location}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  Applied {job.appliedDate}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 self-end sm:self-center">
                            <Select
                              value={job.status}
                              onValueChange={(val) => handleStatusChange(job.id, val)}
                            >
                              <SelectTrigger 
                                className={`h-7 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border-0 shadow-none focus:ring-0 w-auto gap-1.5 hover:bg-opacity-80 transition-colors ${job.statusColor}`}
                              >
                                  <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="Applied">Applied</SelectItem>
                                <SelectItem value="Under Review">Under Review</SelectItem>
                                <SelectItem value="Interviewing">Interviewing</SelectItem>
                                <SelectItem value="Offer">Offer</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[hsl(222,22%,15%)] opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
            
            <TabsContent value="saved" className="mt-8 text-center text-[hsl(222,12%,55%)]">
              <p>No saved jobs.</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Active Title Change Modal */}
        <Dialog open={activeTitleModalOpen} onOpenChange={setActiveTitleModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Change Active Title
              </DialogTitle>
              <DialogDescription>
                Select a job title from your profile or enter a custom one. Jobs will be matched based on this title.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Available titles from profile */}
              {availableTitles.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Your Job Titles</Label>
                  <div className="space-y-2">
                    {availableTitles.map((title, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTitleOption === title 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedTitleOption(title);
                          setCustomTitle('');
                        }}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedTitleOption === title ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {selectedTitleOption === title && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-sm">{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Custom title option */}
              <div className="space-y-3">
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTitleOption === 'custom' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTitleOption('custom')}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedTitleOption === 'custom' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedTitleOption === 'custom' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm">Enter custom title</span>
                </div>
                
                {selectedTitleOption === 'custom' && (
                  <div className="pl-7">
                    <Input
                      placeholder="e.g., Senior Software Engineer"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="mt-2"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setActiveTitleModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleActiveTitleChange}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Push Confirm Modal */}
        <Dialog open={pushModalOpen} onOpenChange={setPushModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Push Your Profile to This Recruiter?</DialogTitle>
              <DialogDescription>
                We will share your profile and your best recent Screna AI metrics for this job.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPushModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmPush}>
                <Send className="w-4 h-4 mr-2" />
                Confirm & Push
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Push Confirm Modal */}
        <Dialog open={bulkPushModalOpen} onOpenChange={setBulkPushModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Push Profiles to Selected Jobs</DialogTitle>
              <DialogDescription>
                Send your profile to recruiters for {selectedJobs.length} selected jobs.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBulkPushModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmBulkPush}>
                <Send className="w-4 h-4 mr-2" />
                Confirm & Push
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Job Detail Drawer */}
        <Sheet open={jobDetailOpen} onOpenChange={setJobDetailOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
            <SheetHeader>
              <SheetTitle className="text-2xl">{currentJob?.job_title || currentJob?.title}</SheetTitle>
              <p className="text-muted-foreground font-medium">{currentJob?.company_name || currentJob?.company}</p>
            </SheetHeader>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 mt-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-sm">
                    <MapPin className="w-3 h-3 mr-1" />
                    {currentJob?.location}
                  </Badge>
                  {currentJob?.job_type && (
                    <Badge variant="outline" className="text-sm">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {getEmploymentTypeLabel(currentJob?.job_type)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-sm">
                    <Clock className="w-3 h-3 mr-1" />
                    {currentJob?.posted_date && formatDate(currentJob.posted_date)}
                  </Badge>
                  {currentJob?.source && (
                    <Badge variant="outline" className="text-sm">
                      Source: {currentJob.source}
                    </Badge>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Job Description</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    <div dangerouslySetInnerHTML={{ __html: currentJob?.job_description_formatted || currentJob?.job_description || currentJob?.description }} />
                  </div>
                </div>

                {(currentJob?.url || currentJob?.apply_link || currentJob?.company_url) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Links</h4>
                      <div className="space-y-2">
                        {currentJob?.url && (
                          <a 
                            href={currentJob.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline block"
                          >
                            View Job Posting →
                          </a>
                        )}
                        {currentJob?.apply_link && (
                          <a 
                            href={currentJob.apply_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline block"
                          >
                            Apply Now →
                          </a>
                        )}
                        {currentJob?.company_url && (
                          <a 
                            href={currentJob.company_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline block"
                          >
                            Company Website →
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            <SheetFooter className="mt-6 pt-4 border-t">
              <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={() => setJobDetailOpen(false)} className="flex-1">
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setJobDetailOpen(false);
                    handlePushProfile(currentJob?.id.toString());
                  }}
                  className="flex-1 bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Apply Position
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </DashboardLayout>
    </TooltipProvider>
  );
}