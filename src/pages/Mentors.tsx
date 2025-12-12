import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, DollarSign, Clock, MapPin, GraduationCap, Calendar, Users, Filter, ExternalLink, XCircle, RefreshCw, CheckCircle2, LinkedinIcon, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { mockMentorApplications, type MentorApplication } from '@/data/mentorMockData';

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

interface SessionReview {
  rating: number;
  comment: string;
  createdAt: string;
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
  review?: SessionReview;
}

export default function Mentors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [mentorSearchQuery, setMentorSearchQuery] = useState("");
  const [mentorSpecialtyFilter, setMentorSpecialtyFilter] = useState("all");
  const [mentorPriceFilter, setMentorPriceFilter] = useState("all");
  const [mentorSortBy, setMentorSortBy] = useState("rating");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<MentorSession | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [sessionReviews, setSessionReviews] = useState<Record<string, SessionReview>>({});

  // Get all unique expertises and topics for filters
  const allExpertises = Array.from(
    new Set(mockMentorApplications.flatMap(m => m.expertises))
  );
  const allTopics = Array.from(
    new Set(mockMentorApplications.flatMap(m => m.topics))
  );

  // Filter mentors based on search and filters
  const filteredMentors = mockMentorApplications.filter(mentor => {
    const matchesSearch = mentor.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.currentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.currentCompany.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesExpertise = expertiseFilter === 'all' || mentor.expertises.includes(expertiseFilter);
    const matchesTopic = topicFilter === 'all' || mentor.topics.includes(topicFilter);

    return matchesSearch && matchesExpertise && matchesTopic;
  });

  // Calculate price range for a mentor
  const getPriceRange = (mentor: MentorApplication) => {
    const enabledRates = mentor.baseRates.filter(r => r.enabled);
    if (enabledRates.length === 0) return null;
    const prices = enabledRates.map(r => r.priceUsd);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min}` : `$${min} - $${max}`;
  };

  // Mock average rating (in real app, calculate from sessions)
  const getMentorRating = () => (4.5 + Math.random() * 0.5).toFixed(1);

  // Mock data for recommended mentors
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

  // Filter and sort recommended mentors
  const filteredRecommendedMentors = mentors
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

  const handleOpenReviewDialog = (session: MentorSession) => {
    setSelectedSessionForReview(session);
    const existingReview = sessionReviews[session.id];
    if (existingReview) {
      setReviewRating(existingReview.rating);
      setReviewComment(existingReview.comment);
    } else {
      setReviewRating(5);
      setReviewComment("");
    }
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedSessionForReview) return;
    
    const newReview: SessionReview = {
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date().toISOString(),
    };
    
    setSessionReviews(prev => ({
      ...prev,
      [selectedSessionForReview.id]: newReview,
    }));
    
    setReviewDialogOpen(false);
    setSelectedSessionForReview(null);
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Mentors</h1>
            <p className="text-muted-foreground text-lg">
              Browse mentors, manage your sessions, and connect with experienced professionals
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate('/mentor/dashboard')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              My Mentor Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/mentor/apply')}
              className="gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              Become a Mentor
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover Mentors</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
          </TabsList>

          {/* Discover Tab - Original mentor list */}
          <TabsContent value="discover" className="space-y-6">

            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by expertise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expertises</SelectItem>
                  {allExpertises.map(exp => (
                    <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {allTopics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Found {filteredMentors.length} {filteredMentors.length === 1 ? 'mentor' : 'mentors'}
            </div>

            {/* Mentor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor) => {
                const priceRange = getPriceRange(mentor);
                const rating = getMentorRating();

                return (
                  <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={mentor.avatarUrl} alt={mentor.displayName} />
                          <AvatarFallback>{mentor.displayName.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{mentor.displayName}</h3>
                          <p className="text-sm text-muted-foreground truncate">{mentor.currentTitle}</p>
                          <p className="text-sm font-medium text-primary truncate">{mentor.currentCompany}</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Location and Languages */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{mentor.location}</span>
                        <span className="mx-1">•</span>
                        <span>{mentor.languages.join(', ')}</span>
                      </div>

                      {/* Rating and Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{rating}</span>
                          <span className="text-sm text-muted-foreground">(12)</span>
                        </div>
                        {priceRange && (
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <DollarSign className="w-4 h-4" />
                            <span>{priceRange}</span>
                          </div>
                        )}
                      </div>

                      {/* Expertises */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">SPECIALIZATIONS</p>
                        <div className="flex flex-wrap gap-2">
                          {mentor.expertises.slice(0, 3).map((exp, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                          {mentor.expertises.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{mentor.expertises.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Topics */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">CAN HELP WITH</p>
                        <div className="flex flex-wrap gap-2">
                          {mentor.topics.slice(0, 2).map((topic, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {mentor.topics.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{mentor.topics.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Session Types */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-medium">AVAILABLE SESSIONS</span>
                        </div>
                        <div className="space-y-1">
                          {mentor.sessionTypes
                            .filter(st => mentor.baseRates.find(r => r.sessionTypeId === st.id && r.enabled))
                            .map((sessionType) => {
                              const rate = mentor.baseRates.find(r => r.sessionTypeId === sessionType.id);
                              return (
                                <div key={sessionType.id} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{sessionType.name}</span>
                                  <span className="font-medium">${rate?.priceUsd}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button className="w-full" size="sm">
                        View Profile & Book
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredMentors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4">No mentors found matching your criteria</p>
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  setExpertiseFilter('all');
                  setTopicFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Recommended Tab */}
          <TabsContent value="recommended" className="space-y-6">
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
                    {filteredRecommendedMentors.map((mentor) => (
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

                    {filteredRecommendedMentors.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">No mentors found matching your criteria</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
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

                                {/* Review Section */}
                                {sessionReviews[session.id] ? (
                                  <div className="bg-muted/50 p-3 rounded-lg mt-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Your Review</span>
                                      {renderStars(sessionReviews[session.id].rating)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      "{sessionReviews[session.id].comment}"
                                    </p>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="mt-2 text-xs"
                                      onClick={() => handleOpenReviewDialog(session)}
                                    >
                                      Edit Review
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="mt-2"
                                    onClick={() => handleOpenReviewDialog(session)}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    Leave a Review
                                  </Button>
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
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {sessionReviews[selectedSessionForReview?.id || ''] ? 'Edit Review' : 'Leave a Review'}
              </DialogTitle>
              <DialogDescription>
                Share your experience with {selectedSessionForReview?.mentorName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <div className="flex justify-center py-2">
                  {renderStars(reviewRating, true, setReviewRating)}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Review</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this mentor..."
                  className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReview} disabled={!reviewComment.trim()}>
                {sessionReviews[selectedSessionForReview?.id || ''] ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
