import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminUser } from '@/data/adminMockData';
import { User, Briefcase, Building2, MapPin, Clock, Mail, Calendar, Tag, FileText, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface OverviewTabProps {
  user: AdminUser;
}

export function OverviewTab({ user }: OverviewTabProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Mentor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Candidate':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'Banned':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Trial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* User Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <Badge className={getStatusColor(user.status)} variant="secondary">
                  {user.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {user?.role?.map((role) => (
                  <Badge key={role} className={getRoleColor(role)} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Career Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Career Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Target Role</p>
              <p className="font-medium">{user?.profile?.targetRole || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Target Companies</p>
              {user?.profile?.targetCompanies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user?.profile?.targetCompanies?.map((company) => (
                    <Badge key={company} variant="outline" className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {company}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No target companies specified</p>
              )}
            </div>
            {/* Resume Download */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Resume</p>
              {user?.profile?.resumeUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => window.open(user?.profile?.resumeUrl, '_blank')}
                >
                  <FileText className="w-4 h-4" />
                  Download Resume
                  <Download className="w-4 h-4" />
                </Button>
              ) : (
                <p className="text-muted-foreground">No resume uploaded</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location & Timezone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{user?.profile?.location || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{user?.profile?.timezone || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Signup Date</p>
                <p className="font-medium">{user?.signupDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Active</p>
                <p className="font-medium">{user?.lastActive}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-medium font-mono text-sm">{user?.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {user?.tags?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user?.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
