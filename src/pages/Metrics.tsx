import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, BookOpen, MessageCircle, Briefcase, 
  Play, FileText, TrendingUp, BarChart3, Clock, CheckCircle2,
  Lightbulb, CheckSquare, Square, Brain, Plus, Trash2, Edit2, CheckCircle,
  Upload, Award, GraduationCap, ExternalLink, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

export default function Metrics() {
  const { toast } = useToast();
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  
  // Job Title Selection
  const [selectedJobTitle, setSelectedJobTitle] = useState('Software Engineer');
  const [profileUploaded, setProfileUploaded] = useState(false);
  const [overallScore, setOverallScore] = useState(78);
  
  const jobTitles = [
    'Software Engineer',
    'Data Analyst', 
    'Product Manager',
    'Frontend Developer',
    'Backend Engineer',
    'Full Stack Developer',
    'DevOps Engineer',
    'UX Designer',
    'Data Scientist',
    'QA Engineer'
  ];

  const handleJobTitleChange = (value: string) => {
    setSelectedJobTitle(value);
    toast({ 
      title: 'Target Job Updated', 
      description: `AI is analyzing requirements for ${value}...` 
    });
  };



  // Mock data - Past Training Sessions
  const metrics = [
    {
      id: 'session-1',
      name: 'Software Engineer — Resume Training',
      dateCompleted: 'March 10, 2025',
      averageScore: 8.5,
      theme: 'Resume',
      questions: [
        { question: 'Tell me about your most challenging project.', score: 8, comment: 'Strong structure, could add quantifiable results.' },
        { question: 'How did you measure the impact of your work?', score: 9, comment: 'Excellent use of metrics and concrete examples.' },
        { question: 'Describe a time when you had to learn a new technology quickly.', score: 8, comment: 'Good storytelling, add more technical depth.' }
      ],
      feedback: {
        strengths: ['Clear articulation of technical challenges', 'Good use of metrics', 'Strong project storytelling'],
        weaknesses: ['Could provide more context about team dynamics', 'Needs more emphasis on leadership role']
      },
      improvements: [
        'Include specific numbers and percentages when discussing impact',
        'Structure your answers using the STAR framework consistently',
        'Highlight cross-team collaboration experiences',
        'Add measurable metrics when discussing achievements'
      ]
    },
    {
      id: 'session-2',
      name: 'Software Engineer — Domain Knowledge',
      dateCompleted: 'March 5, 2025',
      averageScore: 7.8,
      theme: 'Domain',
      questions: [
        { question: 'Explain the difference between SQL and NoSQL databases.', score: 8, comment: 'Good theoretical knowledge, add real-world trade-offs.' },
        { question: 'How would you optimize a slow database query?', score: 7, comment: 'Solid approach, dive deeper into indexing strategies.' },
        { question: 'What are microservices and when would you use them?', score: 8, comment: 'Strong understanding, mention scaling challenges.' }
      ],
      feedback: {
        strengths: ['Strong theoretical knowledge', 'Good real-world examples', 'Clear explanations'],
        weaknesses: ['Could dive deeper into trade-offs', 'Missing some advanced scaling concepts']
      },
      improvements: [
        'Study distributed systems patterns in depth',
        'Practice whiteboard problem-solving with time constraints',
        'Review recent technology trends in backend architecture',
        'Refresh domain-specific knowledge before next training'
      ]
    },
    {
      id: 'session-3',
      name: 'Software Engineer — Communication Skills',
      dateCompleted: 'March 1, 2025',
      averageScore: 9.0,
      theme: 'Communication',
      questions: [
        { question: 'How do you handle disagreements with team members?', score: 9, comment: 'Excellent emotional intelligence and concrete examples.' },
        { question: 'Describe your communication style.', score: 9, comment: 'Strong self-awareness and well-structured answer.' },
        { question: 'Tell me about a time you had to give difficult feedback.', score: 9, comment: 'Outstanding STAR framework usage.' }
      ],
      feedback: {
        strengths: ['Excellent self-awareness', 'Strong emotional intelligence', 'Concrete examples from recent work'],
        weaknesses: ['Slightly rushed delivery in first answer', 'Could use more pauses between key points']
      },
      improvements: [
        'Practice speaking at a measured pace',
        'Add brief pauses between key points for emphasis',
        'Rehearse STAR-based answers for situational questions',
        'Practice concise answers under time constraints'
      ]
    },
    {
      id: 'session-4',
      name: 'Software Engineer — Behavioral Training',
      dateCompleted: 'February 25, 2025',
      averageScore: 7.5,
      theme: 'Behavioral',
      questions: [
        { question: 'Tell me about a time you failed.', score: 7, comment: 'Good honesty, focus more on learnings and actions taken.' },
        { question: 'Describe a situation where you had to work under pressure.', score: 8, comment: 'Strong example, add more details about outcome.' },
        { question: 'How do you prioritize competing tasks?', score: 8, comment: 'Clear framework, mention specific tools or methods.' }
      ],
      feedback: {
        strengths: ['Honest and authentic responses', 'Good use of specific examples', 'Clear problem-solving approach'],
        weaknesses: ['Could emphasize learnings more', 'Some answers lack quantifiable results', 'STAR structure could be tighter']
      },
      improvements: [
        'Rehearse STAR-based answers for situational questions',
        'Strengthen project storytelling and quantifiable results',
        'Focus on learnings and actions in failure stories',
        'Add more metrics to demonstrate impact'
      ]
    }
  ];

  // Insights data - aggregated from all trainings
  const insightsData = [
    { category: 'Resume', score: 85 },
    { category: 'Domain', score: 78 },
    { category: 'Skills', score: 90 },
    { category: 'Communication', score: 90 },
    { category: 'Behavioral', score: 75 }
  ];

  const radarData = [
    { subject: 'Resume', value: 85 },
    { subject: 'Domain', value: 78 },
    { subject: 'Communication', value: 90 },
    { subject: 'Confidence', value: 82 },
    { subject: 'Structure', value: 88 }
  ];

  // To-Do List - generated from improvements
  const [todoItems, setTodoItems] = useState([
    { id: 1, text: 'Rehearse STAR-based answers for situational questions', completed: false, category: 'Behavioral' },
    { id: 2, text: 'Strengthen project storytelling and quantifiable results', completed: false, category: 'Resume' },
    { id: 3, text: 'Practice concise answers under time constraints', completed: false, category: 'Skills' },
    { id: 4, text: 'Refresh domain-specific knowledge before next training', completed: false, category: 'Domain' },
    { id: 5, text: 'Add measurable metrics when discussing achievements', completed: true, category: 'Resume' },
    { id: 6, text: 'Study distributed systems patterns in depth', completed: false, category: 'Domain' }
  ]);

  const toggleTodo = (id: number) => {
    setTodoItems(todoItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const openDetailReport = (metric: any) => {
    setSelectedMetric(metric);
    setReportDrawerOpen(true);
  };

  const overallAverage = (metrics.reduce((sum, m) => sum + m.averageScore, 0) / metrics.length).toFixed(1);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="container mx-auto max-w-7xl space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Metrics</h1>
            <p className="text-muted-foreground">AI-powered job preparation dashboard tailored to your career goals.</p>
          </div>
          <Button asChild size="default" className="bg-gradient-primary hover:opacity-90 transition-opacity">
            <Link to="/interview?metric=active">
              <Play className="w-4 h-4 mr-2" />
              Start New Training
            </Link>
          </Button>
        </div>

        {/* Job Title Selection & Overall Score */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Target Job Title */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Target Job Title
              </CardTitle>
              <CardDescription>
                Select your desired position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedJobTitle} onValueChange={handleJobTitleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job title" />
                </SelectTrigger>
                <SelectContent>
                  {jobTitles.map(title => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    AI analyzes core competencies, skills, and requirements for this role
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Score with Details */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Overall Score
              </CardTitle>
              <CardDescription>
                Profile vs. job requirements evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Score</span>
                  <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {overallScore}/100
                  </span>
                </div>
                <Progress value={overallScore} className="h-3" />
              </div>

              <div className="flex-1 grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">12</div>
                  <div className="text-xs text-muted-foreground">Trainings Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">8.3</div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">+15%</div>
                  <div className="text-xs text-muted-foreground">Improvement</div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Technical Skills</span>
                    <span className="font-medium">82/100</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Experience Match</span>
                    <span className="font-medium">75/100</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Communication</span>
                    <span className="font-medium">90/100</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Domain Knowledge</span>
                    <span className="font-medium">68/100</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI-Generated Training Plan */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Screening Trainings
            </CardTitle>
            <CardDescription>
              Personalized trainings generated based on your profile analysis and {selectedJobTitle} requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  id: 'upcoming-1', 
                  name: 'Resume Experience', 
                  theme: 'resume', 
                  description: 'Strengthen your project storytelling',
                  difficulty: 'Medium',
                  icon: FileText 
                },
                { 
                  id: 'upcoming-2', 
                  name: 'Domain Knowledge', 
                  theme: 'domain', 
                  description: `${selectedJobTitle} technical skills`, 
                  difficulty: 'High',
                  icon: BookOpen 
                },
                { 
                  id: 'upcoming-3', 
                  name: 'Professional Skills', 
                  theme: 'skills', 
                  description: 'Leadership and communication',
                  difficulty: 'Low',
                  icon: Target 
                },
                { 
                  id: 'upcoming-4', 
                  name: 'Behavioral Scenarios', 
                  theme: 'behavioral', 
                  description: 'STAR framework practice',
                  difficulty: 'Medium',
                  icon: MessageCircle 
                }
              ].map(training => (
                <Card key={training.id} className="hover:shadow-glow hover:border-primary/50 transition-smooth">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <training.icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-base">{training.name}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {training.description}
                    </CardDescription>
                    <Badge variant="outline" className="mt-2 w-fit text-xs">
                      {training.difficulty} Priority
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      asChild 
                      size="sm" 
                      className="w-full bg-gradient-primary hover:opacity-90"
                    >
                      <Link to={`/interview?metric=active&theme=${training.theme}`}>
                        <Play className="w-4 h-4 mr-2" />
                        Start Training
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommended Courses */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Recommended External Courses
            </CardTitle>
            <CardDescription>
              Curated learning paths based on your profile and {selectedJobTitle} career goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  id: 'course-1',
                  title: 'Advanced System Design',
                  provider: 'Coursera',
                  duration: '8 weeks',
                  level: 'Intermediate',
                  price: '$49/month',
                  url: '#'
                },
                {
                  id: 'course-2',
                  title: 'Data Structures & Algorithms Masterclass',
                  provider: 'Udemy',
                  duration: '12 weeks',
                  level: 'Beginner to Advanced',
                  price: '$89.99',
                  url: '#'
                },
                {
                  id: 'course-3',
                  title: 'Leadership & Communication for Engineers',
                  provider: 'LinkedIn Learning',
                  duration: '4 weeks',
                  level: 'All Levels',
                  price: 'Free with membership',
                  url: '#'
                },
                {
                  id: 'course-4',
                  title: 'Full-Stack Web Development Bootcamp',
                  provider: 'Udacity',
                  duration: '16 weeks',
                  level: 'Intermediate',
                  price: '$399/month',
                  url: '#'
                },
                {
                  id: 'course-5',
                  title: 'Cloud Architecture & DevOps',
                  provider: 'AWS Training',
                  duration: '10 weeks',
                  level: 'Advanced',
                  price: 'Free',
                  url: '#'
                }
              ].map(course => (
                <div 
                  key={course.id} 
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-smooth group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-1">{course.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium">{course.provider}</span>
                        <span>•</span>
                        <span>{course.duration}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">{course.level}</Badge>
                        <span>•</span>
                        <span className="text-foreground font-medium">{course.price}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-shrink-0 ml-4"
                    asChild
                  >
                    <a href={course.url} target="_blank" rel="noopener noreferrer">
                      View Course
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completed Trainings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Completed Trainings
            </CardTitle>
            <CardDescription>
              Review all your completed Intelligence Trainings, analyze detailed reports, and retake anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {metrics.map(metric => (
                <Card 
                  key={metric.id} 
                  className="group hover:shadow-glow hover:border-primary/50 transition-smooth overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{metric.name}</CardTitle>
                        <CardDescription className="text-sm flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {metric.dateCompleted}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="text-lg px-3 py-1 bg-gradient-primary text-white border-0"
                      >
                        {metric.averageScore.toFixed(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="w-4 h-4" />
                      {metric.questions.length} questions · Avg Score: {metric.averageScore}/10
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openDetailReport(metric)}
                        className="flex-1"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                      <Button 
                        asChild
                        size="sm" 
                        className="flex-1 bg-gradient-primary hover:opacity-90"
                      >
                        <Link to={`/interview?metric=active&retake=${metric.id}`}>
                          <Play className="w-4 h-4 mr-2" />
                          Retake
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Overall Evaluation Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Overall Evaluation</CardTitle>
            <CardDescription>Consolidated view of your Intelligence Training performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Average Score */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20">
                <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                  {overallAverage}
                </div>
                <p className="text-sm text-muted-foreground">Average Score (out of 10)</p>
              </div>

              {/* Radar Chart */}
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis dataKey="subject" className="text-xs" />
                    <PolarRadiusAxis domain={[0, 100]} className="text-xs" />
                    <Radar 
                      name="Performance" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3} 
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold">{payload[0].payload.subject}</p>
                              <p className="text-primary">Score: {payload[0].value}/100</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>

                {/* Summary paragraph */}
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground">
                    Your performance shows balanced strengths across all areas with particular excellence in Communication and Structure. Continue building on your solid foundation in Resume presentation while maintaining your strong technical knowledge.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Detail Report Drawer */}
      <Sheet open={reportDrawerOpen} onOpenChange={setReportDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">
              {selectedMetric?.name} — Detailed Report
            </SheetTitle>
            <SheetDescription>
              Complete analysis of your training session
            </SheetDescription>
          </SheetHeader>
          
          {selectedMetric && (
            <div className="mt-6 space-y-6">
              {/* Summary Card */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                      <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {selectedMetric.averageScore.toFixed(1)}/10
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Date Completed</p>
                      <p className="font-semibold">{selectedMetric.dateCompleted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions Table */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Question-by-Question Breakdown
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Question</th>
                        <th className="text-center p-3 text-sm font-semibold w-24">Score</th>
                        <th className="text-left p-3 text-sm font-semibold">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMetric.questions.map((q: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-3 text-sm">{q.question}</td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className="bg-gradient-primary text-white">
                              {q.score}/10
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{q.comment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* Feedback Section */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Feedback
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-green-600 dark:text-green-400">
                        ✓ Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedMetric.feedback.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-green-500">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-amber-600 dark:text-amber-400">
                        ⚠ Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedMetric.feedback.weaknesses.map((w: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-amber-500">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Improvement Advice */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Improvement Advice
                </h3>
                <div className="space-y-3">
                  {selectedMetric.improvements.map((imp: string, i: number) => (
                    <div 
                      key={i} 
                      className="flex gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 hover:border-primary/40 transition-smooth"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-primary text-white flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm flex-1">{imp}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Footer Actions */}
              <SheetFooter className="flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => toast({ title: 'Replay feature coming soon!' })}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Replay
                </Button>
                <Button 
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  asChild
                >
                  <Link to={`/interview?metric=${selectedMetric.id}`}>
                    <Target className="w-4 h-4 mr-2" />
                    Retake Training
                  </Link>
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
