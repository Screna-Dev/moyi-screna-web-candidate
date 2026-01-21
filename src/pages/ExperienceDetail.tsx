import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Building2, 
  Clock, 
  CalendarDays,
  Layers,
  MessageSquare,
  Lock,
  Unlock,
  ThumbsUp,
  Sparkles,
  Coins,
  Eye,
  Send,
  Play,
  ChevronLeft,
  Award,
  CheckCircle2,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  experienceLibrary, 
  answersForExperience, 
  currentUser, 
  tierConfigs,
  creditRules,
  type Answer,
  type InterviewQuestion
} from '@/data/experienceMockData';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const difficultyColors = {
  Easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const AnswerPreviewCard = ({ 
  answer, 
  onClick,
  isUnlocked 
}: { 
  answer: Answer; 
  onClick: () => void;
  isUnlocked: boolean;
}) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isUnlocked ? "border-primary/30 bg-primary/5" : "hover:border-primary/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {answer.userBadge}
            </Badge>
            {answer.qualityTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isUnlocked ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Unlock className="h-3 w-3 mr-1" />
                Unlocked
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <Coins className="h-3 w-3" />
                {answer.unlockCostCredits}
              </Badge>
            )}
          </div>
        </div>

        <div className={cn(
          "relative rounded-lg p-3 bg-muted/50",
          !isUnlocked && "select-none"
        )}>
          <p className={cn(
            "text-sm leading-relaxed",
            !isUnlocked && "blur-[6px]"
          )}>
            {answer.previewText}
          </p>
          {!isUnlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/90 border shadow-sm">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Click to unlock</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{answer.helpfulCount} found helpful</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ExperienceDetail = () => {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [unlockedAnswers, setUnlockedAnswers] = useState<Set<string>>(new Set());
  const [isSharePublic, setIsSharePublic] = useState(true);
  const [myAnswer, setMyAnswer] = useState('');
  const [creditBalance, setCreditBalance] = useState(currentUser.creditBalance);

  const experience = experienceLibrary.find(e => e.experienceId === experienceId);
  const answers = answersForExperience[experienceId || ''] || [];
  const tierConfig = tierConfigs[currentUser.tier];

  if (!experience) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="container max-w-4xl mx-auto py-12 px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Experience not found</h1>
            <Button onClick={() => navigate('/experience/library')}>
              Back to Library
            </Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const handleUnlockAnswer = (answer: Answer) => {
    if (creditBalance < answer.unlockCostCredits) {
      toast.error('Not enough credits. Please earn more credits first.');
      return;
    }
    
    setCreditBalance(prev => prev - answer.unlockCostCredits);
    setUnlockedAnswers(prev => new Set([...prev, answer.answerId]));
    toast.success(`Answer unlocked! -${answer.unlockCostCredits} Credits`);
    setSelectedAnswer({ ...answer, locked: false });
  };

  const handleUnlockAll = () => {
    const cost = creditRules.unlockAllAnswersDefaultCost;
    if (creditBalance < cost) {
      toast.error('Not enough credits. Please earn more credits first.');
      return;
    }
    
    setCreditBalance(prev => prev - cost);
    const allAnswerIds = answers.map(a => a.answerId);
    setUnlockedAnswers(new Set(allAnswerIds));
    toast.success(`All answers unlocked! -${cost} Credits`);
  };

  const handleStartMock = () => {
    const cost = creditRules.runMockDefaultCost;
    if (creditBalance < cost) {
      toast.error('Not enough credits. Please earn more credits first.');
      return;
    }
    
    toast.success('Starting AI Mock Interview with this experience...');
    // Navigate to mock page (placeholder)
    // navigate('/mock/real-experience');
  };

  const handleSubmitAnswer = () => {
    if (!myAnswer.trim()) {
      toast.error('Please enter your answer before submitting.');
      return;
    }

    const reward = isSharePublic ? tierConfig.answerShareReward : 0;
    if (reward > 0) {
      setCreditBalance(prev => prev + reward);
    }
    
    toast.success(
      isSharePublic 
        ? `🎉 Your answer is now visible to the community! +${reward} Credits` 
        : 'Your answer has been saved privately.'
    );
    setMyAnswer('');
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-24">
          <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              className="mb-6"
              onClick={() => navigate('/experience/library')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Library
            </Button>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Interview Experience Detail</h1>
              <p className="text-muted-foreground text-lg">
                Real experience + top community answers + AI mock in one place.
              </p>
            </div>

            {/* Interview Overview */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{experience.companyName}</CardTitle>
                      <CardDescription className="text-base">{experience.jobTitle}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tags & Meta */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {experience.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                  <Badge className={difficultyColors[experience.meta.difficulty]}>
                    {experience.meta.difficulty}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  {experience.meta.date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {experience.meta.date}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {experience.meta.duration}
                  </span>
                  {experience.meta.round && (
                    <span className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      {experience.meta.round}
                    </span>
                  )}
                </div>

                {/* Interview Questions */}
                {experience.questions && experience.questions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Interview Questions ({experience.questions.length})
                    </h4>
                    {experience.questions.map((q, index) => (
                      <div 
                        key={q.id} 
                        className="p-4 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                            {index + 1}
                          </div>
                          <p className="leading-relaxed">{q.question}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : experience.experienceText ? (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="leading-relaxed">{experience.experienceText}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Top Answers */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Top Answers from the Community
                </CardTitle>
                <CardDescription>
                  Click a high-quality answer to unlock and view the full content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {answers.map((answer) => (
                    <AnswerPreviewCard
                      key={answer.answerId}
                      answer={answer}
                      isUnlocked={unlockedAnswers.has(answer.answerId)}
                      onClick={() => setSelectedAnswer(answer)}
                    />
                  ))}

                  {answers.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No community answers yet. Be the first to contribute!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contribute Your Answer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Contribute Your Answer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Share my answer publicly</p>
                      <p className="text-sm text-muted-foreground">
                        Public answers help the community and earn you a one-time Credit reward.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isSharePublic}
                    onCheckedChange={setIsSharePublic}
                  />
                </div>

                <Textarea
                  placeholder="Paste your answer or your AI mock response here."
                  value={myAnswer}
                  onChange={(e) => setMyAnswer(e.target.value)}
                  className="min-h-[120px]"
                />

                {isSharePublic && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <Coins className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      Earn +{tierConfig.answerShareReward} Credits for sharing ({currentUser.tier} tier)
                    </span>
                  </div>
                )}

                <Button onClick={handleSubmitAnswer} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Answer & Earn Credits
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sticky Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-50">
            <div className="container max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Balance: {creditBalance} Credits</span>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleUnlockAll}
                    disabled={unlockedAnswers.size === answers.length}
                  >
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock All ({creditRules.unlockAllAnswersDefaultCost} Credits)
                  </Button>
                  <Button onClick={handleStartMock}>
                    <Play className="mr-2 h-4 w-4" />
                    Run AI Mock ({creditRules.runMockDefaultCost} Credits)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Detail Modal */}
        <Dialog open={!!selectedAnswer} onOpenChange={() => setSelectedAnswer(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Answer Detail
              </DialogTitle>
            </DialogHeader>
            
            {selectedAnswer && (
              <div className="space-y-4">
                {/* User info & badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{selectedAnswer.userBadge}</Badge>
                  {selectedAnswer.qualityTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {!unlockedAnswers.has(selectedAnswer.answerId) ? (
                  <>
                    {/* Locked State */}
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-300">
                          This is a locked high-quality answer
                        </span>
                      </div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Unlock to view the full content.
                      </p>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="blur-[4px] select-none">{selectedAnswer.previewText}</p>
                      </CardContent>
                    </Card>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => handleUnlockAnswer(selectedAnswer)}
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Unlock Full Answer ({selectedAnswer.unlockCostCredits} Credits)
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Unlocked State */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Full Answer
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="leading-relaxed">{selectedAnswer.fullText}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          AI Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-primary">{selectedAnswer.aiNotes}</p>
                      </CardContent>
                    </Card>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{selectedAnswer.helpfulCount} found this helpful</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Mark as Helpful
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ExperienceDetail;
