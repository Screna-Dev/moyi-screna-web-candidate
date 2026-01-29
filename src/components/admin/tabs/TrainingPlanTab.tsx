import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Clock, CheckCircle2, Circle, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getUserTrainingPlans } from '@/services/adminService';

export function TrainingPlanTab({ user }) {
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch training plans when user changes
  useEffect(() => {
    const fetchTrainingPlans = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getUserTrainingPlans(user.id);
        setTrainingPlans(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch training plans:', err);
        setError('Failed to load training plans');
        setTrainingPlans([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrainingPlans();
  }, [user?.id]);

  const hasPlans = trainingPlans.length > 0;
  const latestPlan = hasPlans ? trainingPlans[0] : null;

  // Build skill data from focus_areas
  const buildSkillData = () => {
    const defaultScores = {
      coding: 0,
      systemDesign: 0,
      communication: 0,
      problemDecomposition: 0,
      domainKnowledge: 0,
    };

    if (latestPlan?.focus_areas) {
      const dimensionMap = {
        coding: 'coding',
        technical: 'coding',
        'system design': 'systemDesign',
        architecture: 'systemDesign',
        communication: 'communication',
        behavioral: 'communication',
        'problem solving': 'problemDecomposition',
        'problem decomposition': 'problemDecomposition',
        domain: 'domainKnowledge',
        'domain knowledge': 'domainKnowledge',
      };

      latestPlan.focus_areas.forEach((area) => {
        const key = dimensionMap[area.dimension?.toLowerCase()] ||
          dimensionMap[area.name?.toLowerCase()];
        if (key) {
          defaultScores[key] = Math.round(area.score );
        }
      });
    }

    return [
      { skill: 'Coding', value: defaultScores.coding },
      { skill: 'System Design', value: defaultScores.systemDesign },
      { skill: 'Communication', value: defaultScores.communication },
      { skill: 'Problem Solving', value: defaultScores.problemDecomposition },
      { skill: 'Domain', value: defaultScores.domainKnowledge },
    ];
  };

  const skillData = buildSkillData();
  const hasSkillData = skillData.some((s) => s.value > 0);

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
            <h3 className="font-semibold mb-2">Error Loading Training Plans</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No training plan
  if (!hasPlans) {
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

  // Helper functions
  const getModuleStatusColor = (status) => {
    const normalizedStatus = status?.toUpperCase() || '';
    switch (normalizedStatus) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PENDING':
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Calculate module stats from API data
  const completedModules = latestPlan?.modules?.filter(
    (m) => m.status?.toUpperCase() === 'COMPLETED'
  ).length || 0;
  const inProgressModules = latestPlan?.modules?.filter(
    (m) => m.status?.toUpperCase() === 'IN_PROGRESS'
  ).length || 0;
  const totalModules = latestPlan?.modules?.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Training Plan Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Training Plan</CardTitle>
            <div className="flex items-center gap-2">
              {latestPlan?.status && (
                <Badge 
                  variant="secondary" 
                  className={latestPlan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
                >
                  {latestPlan.status}
                </Badge>
              )}
              <Badge variant="secondary">AI Generated</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Target Role</p>
                <p className="font-medium">
                  {latestPlan?.target_job_title || 'Not specified'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Plan Period</p>
                <p className="font-medium">
                  {formatDate(latestPlan.created_at)} – {formatDate(latestPlan.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Target Company */}
          {latestPlan?.target_company && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Target Company:</span>
              <Badge variant="outline">{latestPlan.target_company}</Badge>
            </div>
          )}

          {/* Summary */}
          {latestPlan?.summary && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">{latestPlan.summary}</p>
            </div>
          )}

          {/* Error if any */}
          {latestPlan?.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{latestPlan.error}</p>
            </div>
          )}

          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {latestPlan?.progress || 0}%
              </span>
            </div>
            <Progress 
              value={latestPlan?.progress || 0} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Module Statistics */}
      {totalModules > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalModules}</p>
              <p className="text-xs text-muted-foreground">Total Modules</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedModules}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{inProgressModules}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{latestPlan?.pending_modules || 0}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training Modules from API */}
      {latestPlan.modules && latestPlan.modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Training Modules ({latestPlan.modules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {latestPlan.modules.map((module) => (
                <AccordionItem key={module.module_id} value={module.module_id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      {module.status?.toUpperCase() === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{module.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getModuleStatusColor(module.status)}`}
                          >
                            {module.status || 'Pending'}
                          </Badge>
                          {module.difficulty && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getDifficultyColor(module.difficulty)}`}
                            >
                              {module.difficulty}
                            </Badge>
                          )}
                          {module.category && (
                            <Badge variant="outline" className="text-xs">
                              {module.category}
                            </Badge>
                          )}
                          {module.duration_minutes > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {module.duration_minutes}min
                            </span>
                          )}
                        </div>
                      </div>
                      {module.score > 0 && (
                        <Badge variant="outline" className="mr-2">
                          Score: {Math.round(module.score)}%
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-8 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {module.topic && (
                          <div>
                            <p className="text-muted-foreground">Topic</p>
                            <p className="font-medium">{module.topic}</p>
                          </div>
                        )}
                        {module.persona && (
                          <div>
                            <p className="text-muted-foreground">Persona</p>
                            <p className="font-medium">{module.persona}</p>
                          </div>
                        )}
                        {module.session_outcome && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Session Outcome</p>
                            <p className="font-medium">{module.session_outcome}</p>
                          </div>
                        )}
                      </div>

                      {/* Session Config Objectives */}
                      {module.session_config?.objectives && module.session_config.objectives.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Objectives</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {module.session_config.objectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Evaluation Dimensions */}
                      {module.session_config?.evaluation_dimensions && module.session_config.evaluation_dimensions.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Evaluation Dimensions</p>
                          <div className="flex flex-wrap gap-1">
                            {module.session_config.evaluation_dimensions.map((dim, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {dim}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Report Link */}
                      {module.report_id && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            Report ID: {module.report_id}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Focus Areas from API */}
      {latestPlan.focus_areas && latestPlan.focus_areas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {latestPlan.focus_areas.map((area, index) => (
                <div key={index} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{area.name}</span>
                      {area.dimension && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {area.dimension}
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant="secondary"
                      className={area.score >= 0.7 ? 'bg-green-100 text-green-800' : area.score >= 0.4 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}
                    >
                      {Math.round(area.score)}%
                    </Badge>
                  </div>
                  
                  <Progress value={area.score} className="h-1.5 mb-2" />
                  
                  {area.reason && (
                    <p className="text-sm text-muted-foreground mb-2">{area.reason}</p>
                  )}
                  
                  {area.recommended_resources && area.recommended_resources.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Recommended Resources:</p>
                      <div className="flex flex-wrap gap-1">
                        {area.recommended_resources.map((resource, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Radar */}
      {hasSkillData && (
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
      )}
    </div>
  );
}