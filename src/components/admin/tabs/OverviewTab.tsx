import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminUser } from '@/data/adminMockData';
import { TrendingUp, TrendingDown, Brain, Clock, Users, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface OverviewTabProps {
  user: AdminUser;
}

export function OverviewTab({ user }: OverviewTabProps) {
  const scoreDiff = user.metrics.readinessScore - user.metrics.previousScore;
  const isImproving = scoreDiff > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Journey Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Journey Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {user.profile.targetRole} targeting{' '}
            {user.profile.targetCompanies.length > 0
              ? user.profile.targetCompanies.join(', ')
              : 'various companies'}
            . {user.trainingPlan ? `Started training on ${user.trainingPlan.startDate}. ` : ''}
            Currently at {user.metrics.readinessScore}/100 Readiness Score
            {isImproving && `, with strong progress in recent weeks.`}
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Readiness Score</p>
                <p className="text-4xl font-bold">{user.metrics.readinessScore}</p>
              </div>
              <div
                className={`flex items-center gap-1 ${
                  isImproving ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isImproving ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="text-lg font-semibold">
                  {isImproving ? '+' : ''}
                  {scoreDiff}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">Last 30 Days</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">AI Sessions</span>
                </div>
                <span className="font-semibold">{user.metrics.last30Days.aiMockSessions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Practice Hours</span>
                </div>
                <span className="font-semibold">{user.metrics.last30Days.practiceHours}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Mentor Sessions</span>
                </div>
                <span className="font-semibold">{user.metrics.last30Days.mentorSessions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Progress Trend</p>
            {user.metrics.trendOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={user.metrics.trendOverTime}>
                  <XAxis dataKey="week" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No trend data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {scoreDiff > 0 && (
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <span>
                  Readiness improved +{scoreDiff} points in recent period
                </span>
              </li>
            )}
            {user.trainingPlan && user.trainingPlan.progressPercent > 50 && (
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <span>
                  Training plan {user.trainingPlan.progressPercent}% complete
                </span>
              </li>
            )}
            {user.mentorSessions.upcoming.length > 0 && (
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <span>
                  Has {user.mentorSessions.upcoming.length} upcoming mentor session
                  {user.mentorSessions.upcoming.length > 1 ? 's' : ''}
                </span>
              </li>
            )}
            {user.metrics.totalAIMockSessions > 20 && (
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <span>
                  Completed over {user.metrics.totalAIMockSessions} AI mock sessions
                </span>
              </li>
            )}
            {user.reports.length === 0 && user.metrics.readinessScore === 0 && (
              <li className="flex items-start gap-3 text-muted-foreground">
                <span>No highlights available yet - user is just getting started</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
