import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Video, VideoOff, SkipForward } from "lucide-react";
import aiBrain from "@/assets/ai-brain.png";

const Interview = () => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const navigate = useNavigate();
  const posthog = usePostHog();

  const totalQuestions = 5;
  const questions = [
    "Tell me about your experience with React and modern frontend frameworks.",
    "Describe a challenging technical problem you solved recently.",
    "How do you approach code review and collaboration in a distributed team?",
    "What's your experience with cloud infrastructure and DevOps practices?",
    "Where do you see yourself in the next 2-3 years as a contractor?",
  ];

  const handleStart = () => {
    // Track training started event
    if (posthog) {
      posthog.capture('training_started', {
        total_questions: totalQuestions,
      });
    }
    setIsStarted(true);
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Interview complete
      setTimeout(() => {
        navigate("/report");
      }, 2000);
    }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center">
            <img src={aiBrain} alt="AI" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Ready to Start Your AI Interview?</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            This interview will take approximately 15-20 minutes. Make sure you're in a quiet environment 
            with good lighting and internet connection.
          </p>
          
          <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4">What to expect:</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">1.</span>
                <span>5 questions covering technical skills and behavioral scenarios</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">2.</span>
                <span>Real-time AI analysis of your responses</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">3.</span>
                <span>Detailed performance report at the end</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="outline" onClick={() => navigate("/interview")}>
              Cancel
            </Button>
            <Button size="xl" className="gradient-primary" onClick={handleStart}>
              Start Interview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AI Mock Interview</p>
              <p className="font-semibold">
                Question {currentQuestion} of {totalQuestions}
              </p>
            </div>
            <div className="text-sm font-medium">
              Time: <span className="text-primary">02:45</span>
            </div>
          </div>
          <Progress value={(currentQuestion / totalQuestions) * 100} className="h-2 mt-4" />
        </div>
      </div>

      {/* Main Interview Area */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* AI Avatar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 overflow-hidden">
                <img src={aiBrain} alt="AI Interviewer" className="w-32 h-32 animate-glow-pulse" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-2">AI Interviewer</h3>
                <p className="text-sm text-muted-foreground mb-4">Analyzing your response...</p>
                <div className="flex gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                </div>
              </div>
            </Card>
          </div>

          {/* Question & Transcript */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Card */}
            <Card className="p-8 bg-gradient-to-br from-card to-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold">{currentQuestion}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Question</p>
                  <h2 className="text-2xl font-bold leading-tight">
                    {questions[currentQuestion - 1]}
                  </h2>
                </div>
              </div>
            </Card>

            {/* Live Transcript */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                Live Transcript
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                <p className="text-muted-foreground italic">
                  Your response will appear here as you speak...
                </p>
                <p className="mt-4">
                  "Well, I have been working with React for the past 4 years, and I've built several 
                  large-scale applications using modern patterns like hooks, context API, and state 
                  management with Redux and Zustand..."
                </p>
              </div>
            </Card>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Card className="flex-1 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Audio</span>
                  <Button
                    size="icon"
                    variant={isMicOn ? "default" : "destructive"}
                    onClick={() => setIsMicOn(!isMicOn)}
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>

              <Card className="flex-1 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Video</span>
                  <Button
                    size="icon"
                    variant={isVideoOn ? "default" : "secondary"}
                    onClick={() => setIsVideoOn(!isVideoOn)}
                  >
                    {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>

              <Button
                size="lg"
                className="sm:flex-1"
                onClick={handleNext}
              >
                <SkipForward className="mr-2 w-4 h-4" />
                {currentQuestion < totalQuestions ? "Next Question" : "Finish Interview"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
