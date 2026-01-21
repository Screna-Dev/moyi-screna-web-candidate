import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Upload, 
  Building2, 
  Briefcase, 
  CalendarIcon, 
  Clock, 
  Layers, 
  FileText,
  Gift,
  Eye,
  Sparkles,
  Coins,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentUser, tierConfigs } from '@/data/experienceMockData';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface InterviewQuestion {
  id: string;
  question: string;
}

const ExperienceUpload = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [date, setDate] = useState<Date>();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([
    { id: crypto.randomUUID(), question: '' }
  ]);
  
  const [formData, setFormData] = useState({
    companyName: '',
    jobTitle: '',
    jobDescription: '',
    duration: '',
    round: '',
  });

  const tierConfig = tierConfigs[currentUser.tier];

  const totalCharCount = questions.reduce((sum, q) => sum + q.question.length, 0);

  const handleAddQuestion = () => {
    setQuestions(prev => [...prev, { id: crypto.randomUUID(), question: '' }]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleQuestionChange = (id: string, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, question: value } : q));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalCharCount < 200) {
      toast.error('Please provide at least 200 characters total describing your interview questions.');
      return;
    }

    const hasEmptyQuestion = questions.some(q => q.question.trim() === '');
    if (hasEmptyQuestion) {
      toast.error('Please fill in all question fields or remove empty ones.');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    toast.success('🎉 Interview experience submitted! Credits will be added after quality review.');
    navigate('/experience/library');
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Share Your Real Interview Experience</h1>
              <p className="text-muted-foreground text-lg">
                Help others prepare better — and earn Credits.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Interview Metadata Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Interview Metadata
                  </CardTitle>
                  <CardDescription>
                    Add basic details to make your experience easier to find and more valuable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company Name *
                      </Label>
                      <Input
                        id="companyName"
                        placeholder="e.g. Google"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Job Title *
                      </Label>
                      <Input
                        id="jobTitle"
                        placeholder="Software Engineer – Backend"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description (Optional)</Label>
                    <Textarea
                      id="jobDescription"
                      placeholder="Paste the JD if available"
                      value={formData.jobDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobDescription: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Interview Date *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !date && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration *
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30 mins">30 mins</SelectItem>
                          <SelectItem value="45 mins">45 mins</SelectItem>
                          <SelectItem value="60 mins">60 mins</SelectItem>
                          <SelectItem value="90+ mins">90+ mins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Interview Round *
                      </Label>
                      <Select
                        value={formData.round}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, round: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select round" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Phone Screen">Phone Screen</SelectItem>
                          <SelectItem value="Technical">Technical</SelectItem>
                          <SelectItem value="Onsite">Onsite</SelectItem>
                          <SelectItem value="Final">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Questions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Interview Questions
                  </CardTitle>
                  <CardDescription>
                    Add the questions you were asked during the interview. Be as detailed as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {questions.map((q, index) => (
                    <div key={q.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Question {index + 1}
                        </Label>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder="Describe the question asked by the interviewer, including any context or follow-up questions..."
                        value={q.question}
                        onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="w-full border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>

                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className={cn(
                      'transition-colors',
                      totalCharCount < 200 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {totalCharCount < 200 
                        ? `${200 - totalCharCount} more characters needed`
                        : 'Minimum reached ✓'
                      }
                    </span>
                    <span className="text-muted-foreground">{totalCharCount} total characters</span>
                  </div>
                </CardContent>
              </Card>

              {/* Visibility & Rewards Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Visibility & Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Make this experience public</p>
                        <p className="text-sm text-muted-foreground">
                          Public experiences can be viewed by others and earn you Credit rewards.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                  </div>

                  {isPublic && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <Coins className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-primary">
                          As a {currentUser.tier} user, you will earn +{tierConfig.uploadRewardCredits} Credits after approval.
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {currentUser.tier}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full"
                disabled={isSubmitting || !formData.companyName || !formData.jobTitle || !date || !formData.duration || !formData.round || totalCharCount < 200}
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Analyzing & Structuring…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit & Earn Credits
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ExperienceUpload;
