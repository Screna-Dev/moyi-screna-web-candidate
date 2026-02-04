import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AdminUser } from '@/data/adminMockData';
import { CreditCard, Users, Brain, DollarSign, TrendingUp } from 'lucide-react';
import { OverviewTab } from './tabs/OverviewTab';
import { TrainingPlanTab } from './tabs/TrainingPlanTab';
import { ReportsVideosTab } from './tabs/ReportsVideosTab';
import { MentorSessionsTab } from './tabs/MentorSessionsTab';
import { BillingTab } from './tabs/BillingTab';
import { AdminActionsTab } from './tabs/AdminActionsTab';

interface UserDetailPanelProps {
  user: AdminUser | null;
  onUserUpdated?: () => void;
}

export function UserDetailPanel({ user, onUserUpdated }: UserDetailPanelProps) {

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a user to view details</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Trial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Banned':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Candidate':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Mentor':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'Recruiter':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'Admin':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <Badge variant="secondary" className={getStatusColor(user.status)}>
                {user.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground">ID: {user.id}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.role?.map((r) => (
                <Badge key={r} variant="secondary" className={getRoleColor(r)}>
                  {r}
                </Badge>
              ))}
              {user?.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs">Plan</span>
              </div>
              <p className="font-semibold">{user?.planName}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Credits</span>
              </div>
              <p className="font-semibold">{user?.creditBalance}</p>
            </CardContent>
          </Card>
          {/* <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Brain className="w-4 h-4" />
                <span className="text-xs">AI Sessions</span>
              </div>
              <p className="font-semibold">{user.metrics.totalAIMockSessions}</p>
            </CardContent>
          </Card> */}
          {/* <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Mentor Sessions</span>
              </div>
              <p className="font-semibold">{user.metrics.totalMentorSessions}</p>
            </CardContent>
          </Card> */}
          {/* <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Lifetime</span>
              </div>
              <p className="font-semibold">${user.lifetimeSpend}</p>
            </CardContent>
          </Card> */}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6">
          <TabsList className="h-12 bg-transparent">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            {/* <TabsTrigger value="mentors">Mentors</TabsTrigger> */}
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="m-0 h-full">
            <OverviewTab user={user} />
          </TabsContent>
          <TabsContent value="training" className="m-0 h-full">
            <TrainingPlanTab user={user} />
          </TabsContent>
          <TabsContent value="reports" className="m-0 h-full">
            <ReportsVideosTab user={user} />
          </TabsContent>
          {/* <TabsContent value="mentors" className="m-0 h-full">
            <MentorSessionsTab user={user} />
          </TabsContent> */}
          <TabsContent value="billing" className="m-0 h-full">
            <BillingTab user={user} />
          </TabsContent>
          <TabsContent value="admin" className="m-0 h-full">
            <AdminActionsTab user={user} onUserUpdated={onUserUpdated} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
