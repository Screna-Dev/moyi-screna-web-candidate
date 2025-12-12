import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, Star, Users, Eye, MessageSquare, Calendar as CalendarIcon, Settings, User, FileText, Clock, UserCheck, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  mockMentorApplication,
  mockMentorSessions,
  mockMentorEarnings,
  mockMentorNotifications,
  mockMentorReferrals
} from '@/data/mentorMockData';
import { format } from 'date-fns';

export default function MentorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const mentor = mockMentorApplication;
  const sessions = mockMentorSessions;
  const earnings = mockMentorEarnings;
  const notifications = mockMentorNotifications;
  const referrals = mockMentorReferrals;
  
  // State for session settings
  const [sessionTypes, setSessionTypes] = useState(mentor.sessionTypes);
  const [baseRates, setBaseRates] = useState(mentor.baseRates);

  // Calculate KPIs
  const upcomingSessions = sessions.filter(s => s.status === 'pending' || s.status === 'confirmed').length;
  const completedThisMonth = sessions.filter(s => s.status === 'completed').length;
  const reviewedSessions = sessions.filter(s => s.rating > 0);
  const avgRating = reviewedSessions.length > 0
    ? reviewedSessions.reduce((acc, s) => acc + s.rating, 0) / reviewedSessions.length
    : 0;
  const earningsThisMonth = earnings.reduce((acc, e) => acc + e.netAmount, 0);

  // Helper to render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500/10 text-orange-500';
      case 'confirmed': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Mentor Dashboard</h1>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Public Profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
                Switch to Candidate View
              </Button>
              <Avatar>
                <AvatarImage src={mentor.avatarUrl} />
                <AvatarFallback>{mentor.displayName[0]}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <Users className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <MessageSquare className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="earnings">
              <DollarSign className="w-4 h-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <UserCheck className="w-4 h-4 mr-2" />
              Job Referrals
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="w-4 h-4 mr-2" />
              Profile & Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingSessions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed (This Month)</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedThisMonth}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">⭐ {avgRating.toFixed(1)} / 5</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Earnings This Month</CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earningsThisMonth.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Sessions */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.slice(0, 5).map(session => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{session.date}</div>
                                <div className="text-muted-foreground">{session.startTime}</div>
                              </div>
                            </TableCell>
                            <TableCell>{session.candidateName}</TableCell>
                            <TableCell className="text-sm">{session.type}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(session.status)}>
                                {session.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">Confirm</Button>
                                <Button variant="ghost" size="sm">
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notifications.map(notif => (
                    <div key={notif.id} className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{notif.title}</p>
                          {!notif.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.createdAt), 'MMM dd, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Calendar</CardTitle>
                <CardDescription>Manage your availability and booked sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Calendar view coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
                <CardDescription>View and manage your mentoring sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(session => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{session.date}</div>
                            <div className="text-muted-foreground">{session.startTime}</div>
                          </div>
                        </TableCell>
                        <TableCell>{session.candidateName}</TableCell>
                        <TableCell className="text-sm">{session.type}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                              <span className="text-sm">{session.rating}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">View</Button>
                            <Button variant="ghost" size="sm">Notes</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.filter(e => e.status === 'pending').reduce((acc, e) => acc + e.netAmount, 0).toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Earnings This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earningsThisMonth.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.reduce((acc, e) => acc + e.netAmount, 0).toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Platform Fee Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.reduce((acc, e) => acc + e.platformFee, 0).toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Table */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map(earning => (
                      <TableRow key={earning.id}>
                        <TableCell>{earning.date}</TableCell>
                        <TableCell className="max-w-xs truncate">{earning.description}</TableCell>
                        <TableCell>${earning.grossAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-500">-${earning.platformFee.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${earning.netAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={earning.status === 'paid' ? 'default' : 'secondary'}>
                            {earning.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payout Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Payout Method</Label>
                  <p className="text-sm text-muted-foreground">Stripe – **** 4242</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payout Frequency</Label>
                  <p className="text-sm text-muted-foreground">Weekly</p>
                </div>
                <Button>Request Payout</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Job Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            {/* Referral Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{referrals.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Candidates Hired</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{referrals.filter(r => r.status === 'hired').length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Bonus Earned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${referrals.filter(r => r.bonusStatus === 'earned').reduce((acc, r) => acc + r.referralBonus, 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Bonus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${referrals.filter(r => r.bonusStatus === 'pending').reduce((acc, r) => acc + r.referralBonus, 0)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Referral Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Earn Referral Bonuses</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Help exceptional candidates land their dream jobs and earn rewards! Refer candidates you've mentored to open positions. You'll earn $500 when they reach the interview stage and $1000 when they get hired.
                    </p>
                    <Button>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Refer a Candidate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referrals Table */}
            <Card>
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>Track your candidate referrals and earned bonuses</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map(referral => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={referral.candidateAvatar} />
                              <AvatarFallback>{referral.candidateName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{referral.candidateName}</div>
                              <div className="text-xs text-muted-foreground">{referral.candidateEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{referral.jobTitle}</TableCell>
                        <TableCell className="text-sm font-medium">{referral.company}</TableCell>
                        <TableCell>
                          <Badge variant={
                            referral.status === 'hired' ? 'default' :
                            referral.status === 'interviewed' ? 'secondary' :
                            referral.status === 'accepted' ? 'outline' :
                            referral.status === 'declined' ? 'destructive' :
                            'secondary'
                          }>
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">${referral.referralBonus}</div>
                            <div className="text-xs text-muted-foreground capitalize">{referral.bonusStatus}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(referral.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {/* Review Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviewedSessions.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">5-Star Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reviewedSessions.filter(s => s.rating === 5).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">100%</div>
                </CardContent>
              </Card>
            </div>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Breakdown of ratings received</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviewedSessions.filter(s => Math.floor(s.rating) === star).length;
                    const percentage = reviewedSessions.length > 0 ? (count / reviewedSessions.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          <span className="text-sm font-medium">{star}</span>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* All Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>All Reviews</CardTitle>
                <CardDescription>Feedback from your candidates</CardDescription>
              </CardHeader>
              <CardContent>
                {reviewedSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No reviews yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Complete sessions to start receiving feedback from candidates
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewedSessions.map(session => (
                      <div key={session.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{session.candidateName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{session.candidateName}</p>
                              <p className="text-sm text-muted-foreground">{session.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {renderStars(session.rating)}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(session.date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        {session.ratingComment && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            "{session.ratingComment}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{session.durationMinutes} minutes session</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile & Settings Tab */}
          <TabsContent value="profile">
            <Tabs defaultValue="public-profile">
              <TabsList>
                <TabsTrigger value="public-profile">
                  <User className="w-4 h-4 mr-2" />
                  Public Profile
                </TabsTrigger>
                <TabsTrigger value="mentoring-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Mentoring Settings
                </TabsTrigger>
                <TabsTrigger value="account">
                  <User className="w-4 h-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="tax-info">
                  <FileText className="w-4 h-4 mr-2" />
                  Tax Information
                </TabsTrigger>
              </TabsList>

              <TabsContent value="public-profile" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Edit Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">Profile editing coming soon</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Public Profile Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={mentor.avatarUrl} />
                          <AvatarFallback>{mentor.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{mentor.displayName}</h3>
                          <p className="text-sm text-muted-foreground">{mentor.currentTitle} at {mentor.currentCompany}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">• ${mentor.baseRates[0]?.priceUsd} - ${mentor.baseRates[1]?.priceUsd}/session</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm">{mentor.shortBio}</p>
                      <div className="flex flex-wrap gap-2">
                        {mentor.expertises.slice(0, 3).map(exp => (
                          <Badge key={exp} variant="secondary">{exp}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="mentoring-settings" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Session Types & Pricing</CardTitle>
                      <CardDescription>
                        Configure the types of mentorship sessions you offer and set your rates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {sessionTypes.map((sessionType) => {
                          const rate = baseRates.find(r => r.sessionTypeId === sessionType.id);
                          const isEnabled = rate?.enabled ?? false;
                          
                          return (
                            <div key={sessionType.id} className="flex items-start gap-4 p-4 border rounded-lg">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <Clock className="w-5 h-5 text-muted-foreground" />
                                  <div>
                                    <h4 className="font-semibold">{sessionType.name}</h4>
                                    <p className="text-sm text-muted-foreground">{sessionType.durationMinutes} minutes</p>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground pl-8">
                                  {sessionType.description}
                                </p>
                                <div className="flex items-center gap-3 pl-8">
                                  <Label className="text-sm font-medium">Price (USD):</Label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">$</span>
                                    <Input
                                      type="number"
                                      value={rate?.priceUsd ?? 0}
                                      onChange={(e) => {
                                        const newRates = baseRates.map(r => 
                                          r.sessionTypeId === sessionType.id 
                                            ? { ...r, priceUsd: Number(e.target.value) }
                                            : r
                                        );
                                        setBaseRates(newRates);
                                      }}
                                      disabled={!isEnabled}
                                      className="w-24"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">
                                    {isEnabled ? 'Enabled' : 'Disabled'}
                                  </Label>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      const newRates = baseRates.map(r =>
                                        r.sessionTypeId === sessionType.id
                                          ? { ...r, enabled: checked }
                                          : r
                                      );
                                      setBaseRates(newRates);
                                    }}
                                  />
                                </div>
                                {isEnabled && (
                                  <Badge variant="default" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Availability Settings</CardTitle>
                      <CardDescription>
                        Set your weekly availability for mentoring sessions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {mentor.availabilitySlots.map((slot, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{slot.weekday}</Badge>
                              <span className="text-sm">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full mt-4">
                        Add Availability Slot
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Session Limits</CardTitle>
                      <CardDescription>
                        Manage your weekly session capacity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Max sessions per week</Label>
                        <Input 
                          type="number" 
                          defaultValue={mentor.weeklyMaxSessions}
                          className="w-24"
                        />
                      </div>
                      <Button>Update Limit</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="account" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your account preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">{mentor.fullName.toLowerCase().replace(' ', '.')}@example.com</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Timezone</Label>
                      <p className="text-sm text-muted-foreground">{mentor.timezone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Languages</Label>
                      <div className="flex gap-2 mt-1">
                        {mentor.languages.map(lang => (
                          <Badge key={lang} variant="secondary">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline">Edit Account Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tax-info" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Information</CardTitle>
                    <CardDescription>Read-only view of your tax data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Legal Name</Label>
                        <p className="text-sm text-muted-foreground">{mentor.legalName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Country</Label>
                        <p className="text-sm text-muted-foreground">{mentor.taxCountry}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Address</Label>
                        <p className="text-sm text-muted-foreground">
                          {mentor.street1}, {mentor.street2 && `${mentor.street2}, `}{mentor.city}, {mentor.state} {mentor.postalCode}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Tax Classification</Label>
                        <p className="text-sm text-muted-foreground">{mentor.taxClassification}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">SSN</Label>
                        <p className="text-sm text-muted-foreground">{mentor.ssnMasked}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">W-9 Certified</Label>
                        <p className="text-sm text-muted-foreground">{mentor.w9Certified ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    <Button variant="link" className="px-0">Request Tax Info Update</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Label({ children, className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium', className)} {...props}>{children}</label>;
}
