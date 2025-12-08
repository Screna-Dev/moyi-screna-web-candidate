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
  Plus, CheckCircle2, Clock, Tag, Sparkles, Target, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {JobService} from '../services';
import { InterviewService } from "@/services";

export default function Jobs() {
  const { toast } = useToast();
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [bulkPushModalOpen, setBulkPushModalOpen] = useState(false);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('RELEVANCE');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  // Form state for creating new job
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const userPlan = 'free'; // or 'premium'
  const activeTitle = { id: 1, name: 'Backend Engineer' };
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

  // Debounce search query - wait 800ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 800); // 800ms pause time

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setJobs([]);
    setHasMore(true);
  }, [debouncedSearchQuery, locationFilter, timeFilter, sortBy]);
  
  // Fetch jobs from API
  useEffect(() => {
    fetchJobs(page);
  }, [page, debouncedSearchQuery, locationFilter, timeFilter, sortBy]);
  
  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // Load more when user scrolls to bottom (with 200px threshold)
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        setPage(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  const fetchJobs = async (currentPage: number) => {
    setLoading(true);
    try {
      const response = await JobService.searchJobs({
        query: debouncedSearchQuery ? debouncedSearchQuery : activeTitle.name || undefined,
        location: locationFilter !== 'all' ? locationFilter : undefined,
        postedDate: timeFilter !== 'all' ? {
          'today': 'TODAY',
          'week': 'DAYS_7',
          'month': 'DAYS_30'
        }[timeFilter] : undefined,
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
    if (userPlan === 'free') {
      toast({
        title: 'Premium Required',
        description: 'Upgrade to push your profile to recruiters.',
        action: <Link to="/pricing"><Button size="sm">Upgrade Now</Button></Link>
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
    if (userPlan === 'free') {
      toast({
        title: 'Premium Required',
        description: 'Upgrade to push profiles.',
        action: <Link to="/pricing"><Button size="sm">Upgrade Now</Button></Link>
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
  
  const handleCreateTrainingPlan = async () => {
    if (!jobTitle || !jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a job title and job description.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingPlan(true);
    try {
      const response = await InterviewService.createTrainingPlan({
        jobTitle,
        company: company || undefined,
        jobDescription,
      });

      // Debug: Log the response
      console.log("Create training plan response:", response);
      console.log("Response data:", response.data);

      // Check various success indicators
      const isSuccess = 
        response.data?.status === "success" || 
        response.data?.data || 
        response.status === 200 ||
        response.status === 201;

      if (isSuccess) {
        toast({
          title: "Success!",
          description: "Your training plan has been created successfully.",
        });
        
        // Reset form
        setJobTitle("");
        setCompany("");
        setJobDescription("");
        setAddJobModalOpen(false);
        
        // Reload training plans
        await loadTrainingPlans();
      } else {
        console.warn("Unexpected response format:", response);
        toast({
          title: "Warning",
          description: "Training plan may have been created. Please refresh to check.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error creating training plan:", error);
      console.error("Error response:", error.response);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create training plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };

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
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                Active: {activeTitle.name}
                <Link to="/metrics" className="ml-2 text-xs underline hover:text-primary">
                  Change
                </Link>
              </Badge>
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
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Within 7 Days</SelectItem>
                    <SelectItem value="month">Within 30 Days</SelectItem>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleBulkPush} disabled={userPlan === 'free'}>
                        <Send className="w-4 h-4 mr-2" />
                        Apply to Selected Positions
                        {userPlan === 'free' && <Lock className="w-4 h-4 ml-2" />}
                      </Button>
                    </TooltipTrigger>
                    {userPlan === 'free' && (
                      <TooltipContent>
                        <p>Upgrade to push profiles</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </Card>
            )}

            {/* Premium Gate for Free Users */}
            {userPlan === 'free' && (
              <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-primary" />
                    <p className="text-sm font-medium">
                      Upgrade to apply to positions and push your profile to recruiters.
                    </p>
                  </div>
                  <Button variant="cta" asChild>
                    <Link to="/pricing">Upgrade Now</Link>
                  </Button>
                </div>
              </Card>
            )}
            {/* Job List */}
            {jobs.length === 0 && !loading ? (
              // Empty state - no jobs and not loading
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Briefcase className="w-16 h-16 text-muted-foreground opacity-50" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery || locationFilter !== 'all' || timeFilter !== 'all' 
                        ? 'Try adjusting your filters to see more results'
                        : 'No jobs available at the moment. Check back later!'}
                    </p>
                  </div>
                  {(searchQuery || locationFilter !== 'all' || timeFilter !== 'all') && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('');
                        setLocationFilter('all');
                        setTimeFilter('all');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </Card>
            ) : jobs.length === 0 && loading ? (
              // Initial loading (page 1, empty list) - show full page loading
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <p className="text-muted-foreground">Loading jobs...</p>
                </div>
              </Card>
            ) : (
              // Has data - always show the list
              <div className="space-y-4">
                {/* Results count */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
                    {!debouncedSearchQuery && locationFilter === 'all' && timeFilter === 'all' && (
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
                            <Dialog open={addJobModalOpen} onOpenChange={setAddJobModalOpen}>
                            <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                            >
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
                                <Input 
                                  id="jobTitle" 
                                  placeholder="e.g., Senior Product Manager" 
                                  value={jobTitle}
                                  onChange={(e) => setJobTitle(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="company">Company (Optional)</Label>
                                <Input 
                                  id="company" 
                                  placeholder="e.g., Google" 
                                  value={company}
                                  onChange={(e) => setCompany(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="jobDescription">Job Description</Label>
                                <Textarea 
                                  id="jobDescription" 
                                  placeholder="Paste the job description here..." 
                                  rows={4} 
                                  value={jobDescription}
                                  onChange={(e) => setJobDescription(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3">
                              <Button 
                                variant="outline" 
                                onClick={() => setAddJobModalOpen(false)}
                                disabled={isCreatingPlan}
                              >
                                Cancel
                              </Button>
                              <Button 
                                className="gradient-primary" 
                                onClick={handleCreateTrainingPlan}
                                disabled={isCreatingPlan}
                              >
                                {isCreatingPlan ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  "Generate Plan"
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => handlePushProfile(job.id)}
                                  disabled={userPlan === 'free'}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Apply Position
                                  {userPlan === 'free' && <Lock className="w-4 h-4 ml-2" />}
                                </Button>
                              </TooltipTrigger>
                              {userPlan === 'free' && (
                                <TooltipContent>
                                  <p>Upgrade to push profiles</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Loading indicator for infinite scroll - only at bottom */}
                {loading && (
                  <Card className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading more jobs...</p>
                    </div>
                  </Card>
                )}

                {/* End of results indicator */}
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

            {/* Premium Benefits (for free users) */}
            {userPlan === 'free' && (
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <h3 className="font-semibold mb-3">Premium Benefits</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Push profiles to unlimited recruiters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Auto-push to new job matches</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Advanced interview analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button variant="cta" size="sm" className="w-full mt-4" asChild>
                  <Link to="/pricing">
                    Upgrade Now
                  </Link>
                </Button>
              </Card>
            )}
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
              {/* Meta Information */}
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

              {/* Full Description */}
              <div>
                <h4 className="font-semibold mb-3">Job Description</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: currentJob?.job_description_formatted }} />
                </div>
              </div>

              {/* Links */}
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

          {/* Sticky Footer */}
          <SheetFooter className="mt-6 pt-4 border-t">
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={() => setJobDetailOpen(false)} className="flex-1">
                Close
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => {
                      setJobDetailOpen(false);
                      handlePushProfile(currentJob?.id);
                    }}
                    disabled={userPlan === 'free'}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Apply Position
                    {userPlan === 'free' && <Lock className="w-4 h-4 ml-2" />}
                  </Button>
                </TooltipTrigger>
                {userPlan === 'free' && (
                  <TooltipContent>
                    <p>Upgrade to push profiles</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}