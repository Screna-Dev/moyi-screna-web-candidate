import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Bold, 
  Italic, 
  List, 
  Plus, 
  Trash2, 
  Building2, 
  Briefcase, 
  BarChart, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Textarea } from '@/components/newDesign/ui/textarea';
import { Label } from '@/components/newDesign/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/newDesign/ui/select";
import { Link } from 'react-router';

// Mock data for dropdowns
const roles = ["Software Engineer", "Product Manager", "Data Scientist", "Product Designer", "Engineering Manager"];
const levels = ["Junior (L3)", "Mid-level (L4)", "Senior (L5)", "Staff (L6)", "Principal (L7)"];
const rounds = ["Recruiter Screen", "Technical Screen", "Onsite - Coding", "Onsite - System Design", "Onsite - Behavioral", "Hiring Manager", "Final Round"];
const questionTypes = ["Behavioral", "Coding", "System Design", "App Critique", "Product Sense", "Strategy", "Other"];

interface QuestionEntry {
  id: string;
  type: string;
  question: string;
  answer: string;
}

export function AddExperiencePage() {
  const [questions, setQuestions] = useState<QuestionEntry[]>([
    { id: '1', type: 'Behavioral', question: '', answer: '' }
  ]);
  
  // State for form fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [lastRound, setLastRound] = useState('');
  const [interviewProcess, setInterviewProcess] = useState('');

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: Math.random().toString(36).substring(7), 
      type: 'Behavioral', 
      question: '', 
      answer: '' 
    }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, field: keyof QuestionEntry, value: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const handleSubmit = () => {
    console.log({
      company,
      role,
      level,
      lastRound,
      interviewProcess,
      questions
    });
    // Here we would typically send data to backend
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#F9FAFB]/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/question-bank" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Library</span>
          </Link>
          <div className="text-sm font-medium text-gray-400">Draft saved just now</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Add Interview Experience</h1>
          <p className="text-gray-500 text-lg">Share your journey to help the community prepare.</p>
        </div>

        {/* Card 1: Basic Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-[20px] p-8 border border-gray-100 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-500 font-medium">Company</Label>
              <div className="relative">
                <Input 
                  placeholder="e.g. Google, Airbnb" 
                  className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl pl-10"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-500 font-medium">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-500 font-medium">Level / Seniority</Label>
              <div className="relative">
                <Input 
                  placeholder="e.g. L4, Senior" 
                  className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl pl-10"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
                <BarChart className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-500 font-medium">Last Round Completed</Label>
              <Select value={lastRound} onValueChange={setLastRound}>
                <SelectTrigger className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl">
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Interview Process */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-[20px] p-8 border border-gray-100 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Interview Process
            </h2>
          </div>
          
          <div className="bg-gray-50/50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500/50 transition-all overflow-hidden group">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Italic className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            <Textarea 
              placeholder="1. Recruiter screen...&#10;2. Technical phone screen...&#10;3. Onsite loop..." 
              className="min-h-[200px] border-none shadow-none resize-none focus-visible:ring-0 bg-transparent p-4 text-base leading-relaxed placeholder:text-gray-300"
              value={interviewProcess}
              onChange={(e) => setInterviewProcess(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">Markdown supported</p>
        </motion.div>

        {/* Card 3: Specific Questions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-[20px] p-8 border border-gray-100 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-500" />
              Interview Questions <span className="text-gray-400 font-normal text-sm ml-2">(Optional)</span>
            </h2>
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-50 rounded-xl p-6 border border-gray-200 relative group"
              >
                {questions.length > 1 && (
                  <button 
                    onClick={() => removeQuestion(q.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <div className="grid gap-5">
                  <div className="w-full sm:w-1/3">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Type</Label>
                    <Select value={q.type} onValueChange={(val) => updateQuestion(q.id, 'type', val)}>
                      <SelectTrigger className="h-9 bg-white border-gray-200 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {questionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Question</Label>
                    <Input 
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                      className="bg-white border-gray-200 h-10"
                      placeholder="What was the question?"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Your Answer / Approach</Label>
                    <Textarea 
                      value={q.answer}
                      onChange={(e) => updateQuestion(q.id, 'answer', e.target.value)}
                      className="bg-white border-gray-200 min-h-[100px] resize-y"
                      placeholder="Briefly describe how you approached it..."
                    />
                  </div>
                </div>
              </motion.div>
            ))}

            <Button 
              variant="outline" 
              onClick={addQuestion}
              className="w-full h-12 border-dashed border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 rounded-xl gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add another question
            </Button>
          </div>
        </motion.div>

      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex justify-between items-center px-6">
          <p className="text-sm text-gray-500 hidden sm:block">
            By submitting, you agree to our <span className="underline cursor-pointer hover:text-gray-900">Community Guidelines</span>
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-900 font-medium">Cancel</Button>
            <Button 
              onClick={() => {
                handleSubmit();
                // Using alert to stay within selection constraints. Ideally this would be a toast notification.
                alert("Submission received! Your experience is under review. We'll notify you once it's approved.");
              }} 
              className="bg-black hover:bg-gray-800 text-white rounded-lg px-8 py-2.5 h-11 font-medium shadow-lg shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Submit Experience
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
