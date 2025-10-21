import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, MapPin, Briefcase, DollarSign, Lock, Send, FileText, Filter,
  TrendingUp, CheckCircle2, Clock, Tag, X, Info, Sparkles, Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Jobs() {
  const { toast } = useToast();
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [autoPushEnabled, setAutoPushEnabled] = useState(false);
  const [showAutoPushModal, setShowAutoPushModal] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [bulkPushModalOpen, setBulkPushModalOpen] = useState(false);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [salaryRange, setSalaryRange] = useState([0, 200]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [employmentType, setEmploymentType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');

  const userPlan = 'free'; // or 'premium'
  const activeTitle = { id: 1, name: 'Backend Engineer' };
  const overallScore = 83;
  const lastSessionId = 'ABC123';
  
  const suggestions = [
    'Practice system design patterns',
    'Improve API design skills',
    'Learn cloud architecture'
  ];

  const jobs = [
    {
      id: 1, 
      title: 'Senior Backend Engineer', 
      company: 'Acme Corp', 
      location: 'Remote',
      postedAt: '2 days ago', 
      employmentType: 'full_time' as const,
      salaryMin: 75, 
      salaryMax: 95, 
      salaryUnit: 'hr' as const,
      descriptionShort: 'Build scalable microservices with Node.js and PostgreSQL...',
      descriptionFull: `We are seeking a Senior Backend Engineer to join our growing team. You will be responsible for designing, developing, and maintaining our core backend services using modern technologies.

Key Responsibilities:
• Design and implement scalable microservices architecture
• Work with Node.js, PostgreSQL, and AWS cloud infrastructure
• Collaborate with frontend teams to build robust APIs
• Ensure high performance and responsiveness of applications
• Implement security and data protection measures

Requirements:
• 5+ years of backend development experience
• Strong proficiency in Node.js and PostgreSQL
• Experience with AWS cloud services
• Excellent problem-solving skills
• Strong communication and teamwork abilities`,
      matchScore: 86, 
      rankingPercentile: 18, 
      skills: ['Node.js', 'PostgreSQL', 'AWS'],
      mustHaveSkills: ['Node.js', 'PostgreSQL', 'REST APIs'],
      niceToHaveSkills: ['AWS Lambda', 'Docker', 'GraphQL'],
      isNew: true
    },
    {
      id: 2, 
      title: 'Backend Developer', 
      company: 'TechStart', 
      location: 'New York, NY',
      postedAt: '5 days ago', 
      employmentType: 'contract' as const,
      salaryMin: 120, 
      salaryMax: 140, 
      salaryUnit: 'yr' as const,
      descriptionShort: 'Join our team building the future of fintech APIs...',
      descriptionFull: `TechStart is revolutionizing the fintech industry with cutting-edge APIs. We're looking for a talented Backend Developer to help us build the next generation of financial technology solutions.

Key Responsibilities:
• Develop and maintain high-performance Python/Django applications
• Design RESTful APIs for financial transactions
• Implement secure payment processing systems
• Work with Docker and containerization technologies
• Participate in code reviews and technical discussions

Requirements:
• 3+ years of Python/Django development
• Experience with financial or payment systems
• Strong understanding of security best practices
• Knowledge of Docker and containerization
• Bachelor's degree in Computer Science or related field`,
      matchScore: 92, 
      rankingPercentile: 12, 
      skills: ['Python', 'Django', 'Docker'],
      mustHaveSkills: ['Python', 'Django', 'PostgreSQL'],
      niceToHaveSkills: ['Redis', 'Kubernetes', 'CI/CD'],
      isNew: false
    },
    {
      id: 3,
      title: 'Backend Software Engineer',
      company: 'CloudTech Solutions',
      location: 'San Francisco, CA',
      postedAt: '1 week ago',
      employmentType: 'part_time' as const,
      salaryMin: 80,
      salaryMax: 110,
      salaryUnit: 'hr' as const,
      descriptionShort: 'Part-time role building cloud-native backend services...',
      descriptionFull: `Looking for a part-time Backend Software Engineer to help build our cloud-native infrastructure. Flexible hours, remote-friendly.

Key Responsibilities:
• Design cloud-native backend services
• Implement microservices using Go and Kubernetes
• Work with team to ensure scalability and reliability
• Contribute to technical documentation

Requirements:
• 4+ years backend development experience
• Strong Go programming skills
• Experience with Kubernetes and cloud platforms
• Self-motivated and able to work independently`,
      matchScore: 78,
      rankingPercentile: 25,
      skills: ['Go', 'Kubernetes', 'AWS'],
      mustHaveSkills: ['Go', 'Kubernetes', 'Microservices'],
      niceToHaveSkills: ['Terraform', 'Prometheus', 'gRPC'],
      isNew: false
    }
  ];

  const handlePushProfile = (jobId: number) => {
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

  const toggleSelection = (id: number) => {
    setSelectedJobs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAutoPushToggle = (enabled: boolean) => {
    if (userPlan === 'free') return;
    
    if (enabled && !autoPushEnabled) {
      setShowAutoPushModal(true);
    } else {
      setAutoPushEnabled(enabled);
    }
  };

  const confirmAutoPush = () => {
    setAutoPushEnabled(true);
    setShowAutoPushModal(false);
    toast({
      title: 'Auto-push enabled',
      description: 'Your profile will be automatically pushed to top new matches.'
    });
  };

  const viewJobDetail = (job: any) => {
    setCurrentJob(job);
    setJobDetailOpen(true);
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels = {
      'full_time': 'Full-time',
      'contract': 'Contract',
      'part_time': 'Part-time'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = !locationFilter || 
      job.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    const matchesEmployment = employmentType === 'all' || 
      job.employmentType === employmentType;
    
    const salaryValue = job.salaryUnit === 'hr' ? job.salaryMax : job.salaryMax / 1000;
    const matchesSalary = salaryValue >= salaryRange[0] && salaryValue <= salaryRange[1];
    
    return matchesSearch && matchesLocation && matchesEmployment && matchesSalary;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === 'relevance') {
      return b.matchScore - a.matchScore;
    } else {
      // Sort by newest (posted date)
      return a.id - b.id; // Simulated - in real app would use actual dates
    }
  });

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
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search matched jobs (keywords, company, location)" 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Input 
                  placeholder="Location" 
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Salary/Rate Range</label>
                  <span className="text-sm text-muted-foreground">
                    ${salaryRange[0]}k - ${salaryRange[1]}k/yr
                  </span>
                </div>
                <Slider
                  min={0}
                  max={200}
                  step={10}
                  value={salaryRange}
                  onValueChange={setSalaryRange}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Sort by: Relevance</SelectItem>
                    <SelectItem value="newest">Sort by: Newest</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Auto-push matches</label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Automatically push your profile to top new matches for your active title</p>
                    </TooltipContent>
                  </Tooltip>
                  <Switch 
                    checked={autoPushEnabled} 
                    onCheckedChange={handleAutoPushToggle}
                    disabled={userPlan === 'free'}
                  />
                  {userPlan === 'free' && (
                    <Link to="/pricing" className="text-xs text-muted-foreground hover:underline">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Upgrade to enable
                    </Link>
                  )}
                </div>
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
                        Push Selected Profiles
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
                      Upgrade to push your profile to recruiters and enable auto-push.
                    </p>
                  </div>
                  <Button variant="cta" asChild>
                    <Link to="/pricing">Upgrade Now</Link>
                  </Button>
                </div>
              </Card>
            )}

            {/* Job List */}
            {sortedJobs.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Briefcase className="w-16 h-16 text-muted-foreground opacity-50" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No matches yet for your active title</h3>
                    <p className="text-muted-foreground mb-6">
                      Try adjusting your filters or improve your ranking to get more matches
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" asChild>
                      <Link to="/metrics">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Improve Your Ranking
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedJobs.map(job => (
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
                              <h3 className="text-xl font-bold">{job.title}</h3>
                              {job.isNew && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="font-medium">{job.company}</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {getEmploymentTypeLabel(job.employmentType)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {job.postedAt}
                              </span>
                            </div>
                          </div>
                          <Badge className="text-lg px-4 py-1 bg-primary/10 text-primary border-primary/20">
                            Match {job.matchScore}%
                          </Badge>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-lg font-semibold text-primary mb-2">
                            <DollarSign className="w-5 h-5" />
                            ${job.salaryMin}–${job.salaryMax}{job.salaryUnit === 'hr' ? '/hr' : 'k/yr'}
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2">{job.descriptionShort}</p>
                        </div>
                        
                        <div className="mb-4 bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Your ranking for this role</p>
                            <span className="text-lg font-bold text-primary">Top {job.rankingPercentile}%</span>
                          </div>
                          <Progress value={100 - job.rankingPercentile} className="h-2.5" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 flex-wrap">
                            {job.skills.map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {skill}
                              </Badge>
                            ))}
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => handlePushProfile(job.id)}
                                  disabled={userPlan === 'free'}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Push Profile
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
                <Progress value={overallScore} className="h-2" />
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

      {/* Auto-Push First-Time Modal */}
      <Dialog open={showAutoPushModal} onOpenChange={setShowAutoPushModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Auto-push</DialogTitle>
            <DialogDescription>
              Automatically push your profile to top new matches for your active title. You can disable anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAutoPushModal(false)}>Cancel</Button>
            <Button onClick={confirmAutoPush}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Detail Drawer */}
      <Sheet open={jobDetailOpen} onOpenChange={setJobDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-2xl">{currentJob?.title}</SheetTitle>
            <p className="text-muted-foreground font-medium">{currentJob?.company}</p>
          </SheetHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 mt-6">
              {/* Meta Information */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {currentJob?.location}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {getEmploymentTypeLabel(currentJob?.employmentType)}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  <Clock className="w-3 h-3 mr-1" />
                  {currentJob?.postedAt}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  Job ID: {currentJob?.id}
                </Badge>
              </div>

              {/* Salary Block */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Salary Range</span>
                  <div className="flex items-center gap-2 text-xl font-bold text-primary">
                    <DollarSign className="w-5 h-5" />
                    ${currentJob?.salaryMin}–${currentJob?.salaryMax}{currentJob?.salaryUnit === 'hr' ? '/hr' : 'k/yr'}
                  </div>
                </div>
              </Card>

              {/* Ranking */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Your ranking for this role</p>
                  <span className="text-lg font-bold text-primary">Top {currentJob?.rankingPercentile}%</span>
                </div>
                <Progress value={currentJob ? 100 - currentJob.rankingPercentile : 0} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-2">
                  Match Score: {currentJob?.matchScore}%
                </p>
              </div>

              <Separator />

              {/* Full Description */}
              <div>
                <h4 className="font-semibold mb-3">Job Description</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {currentJob?.descriptionFull}
                </div>
              </div>

              <Separator />

              {/* Skills */}
              <div>
                <h4 className="font-semibold mb-3">Must-have Skills</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentJob?.mustHaveSkills?.map((skill: string) => (
                    <Badge key={skill} variant="default" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {skill}
                    </Badge>
                  ))}
                </div>

                <h4 className="font-semibold mb-3">Nice-to-have Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {currentJob?.niceToHaveSkills?.map((skill: string) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
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
                    Push Profile
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
