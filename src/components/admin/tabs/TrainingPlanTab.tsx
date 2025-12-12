import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AdminUser } from '@/data/adminMockData';
import { Calendar, Target, Clock, CheckCircle2, Circle } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface TrainingPlanTabProps {
  user: AdminUser;
}

export function TrainingPlanTab({ user }: TrainingPlanTabProps) {
  const skillData = [
    { skill: 'Coding', value: user.metrics.skillScores.coding },
    { skill: 'System Design', value: user.metrics.skillScores.systemDesign },
    { skill: 'Communication', value: user.metrics.skillScores.communication },
    { skill: 'Problem Solving', value: user.metrics.skillScores.problemDecomposition },
    { skill: 'Domain', value: user.metrics.skillScores.domainKnowledge },
  ];

  if (!user.trainingPlan) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No Training Plan</h3>
            <p className="text-muted-foreground">
              This user hasn't set up a training plan yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Training Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Training Plan</CardTitle>
            <Badge variant="secondary">AI Generated</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Target Role</p>
                <p className="font-medium">{user.profile.targetRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Plan Period</p>
                <p className="font-medium">
                  {user.trainingPlan.startDate} – {user.trainingPlan.estimatedCompletion}
                </p>
              </div>
            </div>
          </div>

          {user.profile.targetCompanies.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Target Companies:</span>
              {user.profile.targetCompanies.map((company) => (
                <Badge key={company} variant="outline">
                  {company}
                </Badge>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {user.trainingPlan.progressPercent}%
              </span>
            </div>
            <Progress value={user.trainingPlan.progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Training Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {user.trainingPlan.stages.map((stage, index) => (
              <div key={stage.name} className="flex gap-4">
                <div className="flex flex-col items-center">
                  {stage.completionPercent === 100 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                  {index < user.trainingPlan!.stages.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">{stage.name}</h4>
                    <span className="text-sm text-muted-foreground">
                      {stage.completionPercent}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{stage.description}</p>
                  <Progress value={stage.completionPercent} className="h-1.5 mb-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Last: {stage.lastCompletedTask}</span>
                    {stage.remainingHours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stage.remainingHours}h remaining
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skills Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Radar
                  name="Skills"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
