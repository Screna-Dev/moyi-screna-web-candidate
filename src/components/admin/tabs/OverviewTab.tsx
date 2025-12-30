import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Brain, Clock, Users, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { adminService } from '@/services';

export function OverviewTab({ user }) {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch overview when user changes
  useEffect(() => {
    const fetchOverview = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await adminService.getUserOverview(user.id);
        setOverview(response.data.data);
      } catch (err) {
        console.error('Failed to fetch overview:', err);
        setError('Failed to load overview');
        setOverview(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [user?.id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
            <h3 className="font-semibold mb-2">Error Loading Overview</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!overview) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No Overview Data</h3>
            <p className="text-muted-foreground">Overview data is not available for this user.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate score difference (using previous score from user if available, otherwise show as positive)
  const previousScore = user?.metrics?.previousScore || 0;
  const scoreDiff = overview.readinessScore - previousScore;
  const isImproving = scoreDiff >= 0;

  // Transform progressTrend array to chart data
  const trendData = (overview.progressTrend || []).map((score, index) => ({
    week: `Week ${index + 1}`,
    score: score,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Journey Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Journey Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {overview.journeySummary || 'No journey summary available.'}
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
                <p className="text-4xl font-bold">{overview.readinessScore || 0}</p>
              </div>
              {scoreDiff !== 0 && (
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
              )}
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
                <span className="font-semibold">{overview.aiSessions || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Practice Hours</span>
                </div>
                <span className="font-semibold">{overview.practiceHours || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Mentor Sessions</span>
                </div>
                <span className="font-semibold">{overview.mentorSessions || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Progress Trend</p>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={trendData}>
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
            {overview.highlights && overview.highlights.length > 0 ? (
              overview.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))
            ) : (
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