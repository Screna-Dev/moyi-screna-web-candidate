import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, MapPin, Briefcase, Lock, Send, FileText,
  Plus, CheckCircle2, Clock, Tag, Sparkles, Target, Loader2, Crown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { InterviewService, ProfileService, JobService } from "@/services";
import { useUserPlan, useUpgradePrompt } from '@/hooks/useUserPlan';

export default function Jobs() {
  const { toast } = useToast();
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
  
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [bulkPushModalOpen, setBulkPushModalOpen] = useState(false);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('sevenDays');
  const [sortBy, setSortBy] = useState('RELEVANCE');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Form state for creating new job
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)

  const overallScore = 83;
  const lastSessionId = 'ABC123';
  
  const suggestions = [
    'Practice system design patterns',
    'Improve API design skills',
    'Learn cloud architecture'
  ];

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
  const [activeTitle, setActiveTitle] = useState<{ id: number; name: string }>({ id: 1, name: '' });

  useEffect(() => {
    const fetchActiveTitle = async () => {
      try {
        const response = await ProfileService.getProfile();
        const profileData = response.data?.data || response.data;
        
        if (profileData?.structured_resume?.job_titles?.length > 0) {
          setActiveTitle({
            id: 1,
            name: profileData.structured_resume.job_titles[0]
          });
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

  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
  }, [debouncedSearchQuery, locationFilter, timeFilter, sortBy]);
  
  // Fetch jobs from API - only if user can access jobs
  useEffect(() => {
    if (canAccessJobs) {
      fetchJobs(page);
    }
  }, [page, debouncedSearchQuery, locationFilter, timeFilter, sortBy, canAccessJobs]);
  
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
      toast({
        title: 'Error',
        description: 'Failed to load jobs. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePushProfile = (jobId: string) => {
    if (!canPushProfile) {
      toast({
        title: 'Premium Required',
        description: 'Upgrade to push your profile to recruiters.',
        action: <Link to="/settings"><Button size="sm">Upgrade Now</Button></Link>
      });
      return;
    }
    setCurrentJob(jobs.find(j => j.id === jobId));
    setPushModalOpen(true);
  };

  const confirmPush = () => {
    setPushModalOpen(false);
    toast({ 
      title: 'Your profile has been pushed.',
      description: 'The recruiter will receive your profile and metrics.'
    });
  };

  const handleBulkPush = () => {
    if (!canPushProfile) {
      toast({
        title: 'Premium Required',
        description: 'Upgrade to push profiles.',
        action: <Link to="/settings"><Button size="sm">Upgrade Now</Button></Link>
      });
      return;
    }
    setBulkPushModalOpen(true);
  };

  const confirmBulkPush = () => {
    setBulkPushModalOpen(false);
    toast({ 
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

  // Show loading while plan is being fetched
  if (isPlanLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show upgrade prompt for Free users
  if (isFree) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background p-6">
          <div className="container mx-auto max-w-4xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Job Match</h1>
              <p className="text-muted-foreground">Find jobs that match your profile</p>
            </div>

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
                    className="gradient-primary"
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
                    <Link to="/settings">View All Plans</Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Feature Preview */}
            <div className="mt-8 grid md:grid-cols-3 gap-4">
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
        </div>
      </TooltipProvider>
    );
  }

  // Main content for Pro and Elite users
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6">
        <div className="flex gap-6 container mx-auto max-w-7xl">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold">Job Match</h1>
                <p className="text-muted-foreground">Matched to your Active Title</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  {planData.currentPlan} Plan
                </Badge>
                <Badge variant="outline" className="px-4 py-2 text-sm">
                  Active: {activeTitle.name}
                  <Link to="/metrics" className="ml-2 text-xs underline hover:text-primary">
                    Change
                  </Link>
                </Badge>
              </div>
            </div>

            {/* Controls */}
            <Card className="p-4">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search matched jobs (keywords, company)" 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
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
              
              <div className="flex items-center justify-between gap-4">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="threeDays">Within 3 Days</SelectItem>
                    <SelectItem value="sevenDays">Within 7 Days</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RELEVANCE">Sort by: Relevance</SelectItem>
                    <SelectItem value="NEWEST">Sort by: Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedJobs.length > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Selected: {selectedJobs.length} jobs</span>
                  <Button onClick={handleBulkPush}>
                    <Send className="w-4 h-4 mr-2" />
                    Apply to Selected Positions
                  </Button>
                </div>
              </Card>
            )}

            {/* Job List */}
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
            ) : jobs.length === 0 && loading ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <p className="text-muted-foreground">Loading jobs...</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
                    {!debouncedSearchQuery && locationFilter === 'all' && timeFilter === 'sevenDays' && (
                      <span className="ml-1">(showing all available jobs)</span>
                    )}
                  </span>
                </div>
                
                {jobs.map(job => (
                  <Card key={job.id} className="p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex gap-6">
                      <div className="flex items-start pt-2">
                        <Checkbox 
                          checked={selectedJobs.includes(job.id)}
                          onCheckedChange={() => toggleSelection(job.id)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-bold">{job.job_title}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="font-medium">{job.company_name}</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                              {job.job_type && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4" />
                                  {getEmploymentTypeLabel(job.job_type)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDate(job.posted_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {job.job_description?.substring(0, 200)}...
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 flex-wrap">
                            {job.source && (
                              <Badge variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {job.source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => viewJobDetail(job)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Job Detail
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
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
                                    toast({
                                      title: "Success!",
                                      description: "Training plan created for this job position.",
                                    });
                                    navigate("/interview-prep")
                                  } else {
                                    toast({
                                      title: "Warning",
                                      description: "Training plan may have been created. Check interview prep page.",
                                      variant: "default",
                                    });
                                  }
                                } catch (error) {
                                  console.error("Error creating training plan:", error);
                                  toast({
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
                              <Plus className="mr-2 h-4 w-4" />
                              Add Target Job
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handlePushProfile(job.id)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Apply Position
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

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
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6 hidden xl:block">
            {/* Active Title Overview */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Active Title Overview
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overall Score</span>
                  <span className="text-lg font-bold text-primary">{overallScore}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last session: {lastSessionId}
                </p>
              </div>
            </Card>

            {/* Latest Suggestions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Latest Suggestions
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link to="/metrics">
                  View All Metrics
                </Link>
              </Button>
            </Card>

            {/* Credit Balance */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Credit Balance</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available</span>
                <span className="text-lg font-bold text-primary">{planData.creditBalance}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link to="/settings">
                  Buy More Credits
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>

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
            <SheetTitle className="text-2xl">{currentJob?.job_title}</SheetTitle>
            <p className="text-muted-foreground font-medium">{currentJob?.company_name}</p>
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
                  <div dangerouslySetInnerHTML={{ __html: currentJob?.job_description_formatted }} />
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
                  handlePushProfile(currentJob?.id);
                }}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Apply Position
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}