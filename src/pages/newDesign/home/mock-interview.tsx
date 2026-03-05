import { useState } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { Button } from '@/components/newDesign/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/newDesign/ui/card';
import { Badge } from '@/components/newDesign/ui/badge';
import { Label } from '@/components/newDesign/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/newDesign/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/newDesign/ui/select";
import { 
  Zap, 
  Mic, 
  Video, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Play, 
  History,
  Filter,
  BarChart,
  BrainCircuit,
  Code,
  Coins
} from 'lucide-react';
import { Separator } from '@/components/newDesign/ui/separator';

// Mock Data for Practice Sets
const PRACTICE_SETS = [
  {
    id: 1,
    title: "Product Sense Essentials",
    role: "Product Manager",
    type: "Product",
    count: 5,
    duration: "30 min",
    difficulty: "Intermediate",
    popular: true,
    credits: 5
  },
  {
    id: 2,
    title: "Behavioral STAR Method",
    role: "General",
    type: "Behavioral",
    count: 8,
    duration: "45 min",
    difficulty: "Junior",
    popular: true,
    credits: 5
  },
  {
    id: 3,
    title: "System Design Scalability",
    role: "Software Engineer",
    type: "System",
    count: 3,
    duration: "45 min",
    difficulty: "Senior",
    popular: false,
    credits: 10
  },
  {
    id: 4,
    title: "React Frontend Core",
    role: "Software Engineer",
    type: "Technical",
    count: 10,
    duration: "20 min",
    difficulty: "Intermediate",
    popular: false,
    credits: 5
  },
  {
    id: 5,
    title: "A/B Testing & Metrics",
    role: "Data Scientist",
    type: "Analytical",
    count: 6,
    duration: "30 min",
    difficulty: "Staff",
    popular: false,
    credits: 10
  },
  {
    id: 6,
    title: "Leadership Principles",
    role: "Engineering Manager",
    type: "Behavioral",
    count: 5,
    duration: "25 min",
    difficulty: "Senior",
    popular: true,
    credits: 5
  }
];

const RECENT_MOCKS = [
  { id: 101, title: "Product Execution", date: "2 days ago", score: "8/10", type: "Product" },
  { id: 102, title: "Google Behavioral", date: "5 days ago", score: "Pending", type: "Behavioral" },
  { id: 103, title: "System Design Practice", date: "1 week ago", score: "7/10", type: "System" },
];

export function MockInterviewPage() {
  const [selectedMode, setSelectedMode] = useState("voice");

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              AI Mock Interview
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Start a realistic mock in under a minute. Choose a curated set or customize your session to fit your goals.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" className="bg-white" onClick={() => document.getElementById('practice-sets')?.scrollIntoView({ behavior: 'smooth' })}>
              Browse sets
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200">
              <Zap className="w-4 h-4 mr-2" />
              Start mock
            </Button>
          </div>
        </div>

        {/* Quick Start Card */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden" style={{ borderTop: "4px solid #2563eb" }}>
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold uppercase tracking-wider text-amber-600">Quick Start</span>
            </div>
            <CardTitle className="text-xl">Custom Session</CardTitle>
            <CardDescription>Configure a personalized interview session instantly.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Target Role</Label>
                <Select defaultValue="pm">
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="swe">Software Engineer</SelectItem>
                    <SelectItem value="ds">Data Scientist</SelectItem>
                    <SelectItem value="pd">Product Designer</SelectItem>
                    <SelectItem value="em">Engineering Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Interview Type</Label>
                <Select defaultValue="behavioral">
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="product">Product Sense</SelectItem>
                    <SelectItem value="system">System Design</SelectItem>
                    <SelectItem value="coding">Coding / Technical</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Duration</Label>
                <Select defaultValue="20">
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 min (Quick)</SelectItem>
                    <SelectItem value="20">20 min (Standard)</SelectItem>
                    <SelectItem value="30">30 min (Deep Dive)</SelectItem>
                    <SelectItem value="45">45 min (Full)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Difficulty</Label>
                <Select defaultValue="intermediate">
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                 <Tabs value={selectedMode} onValueChange={setSelectedMode} className="w-full">
                    <TabsList className="h-9">
                      <TabsTrigger value="voice" className="px-4 text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Mic className="w-3.5 h-3.5" /> Voice Mode
                      </TabsTrigger>
                      <TabsTrigger value="video" className="px-4 text-xs gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Video className="w-3.5 h-3.5" /> Video Mode
                      </TabsTrigger>
                    </TabsList>
                 </Tabs>
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <span className="hidden md:inline text-xs text-slate-400">
                   You can preview question titles before starting.
                 </span>
                 <Link to="/ai-mock">
                   <Button className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 px-8">
                     Start Practice
                   </Button>
                 </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Practice Sets Section */}
        <div id="practice-sets" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Curated Practice Sets</h2>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
               <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-[130px] bg-white text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="swe">Software Engineer</SelectItem>
                  </SelectContent>
               </Select>
               <Select defaultValue="all">
                  <SelectTrigger className="h-9 w-[130px] bg-white text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
               </Select>
               <Select defaultValue="recommended">
                  <SelectTrigger className="h-9 w-[160px] bg-white text-xs">
                    <SelectValue placeholder="Interview Style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="startup">Startup Style</SelectItem>
                    <SelectItem value="midsize">Mid-size Company</SelectItem>
                    <SelectItem value="bigtech">Big Tech Style</SelectItem>
                  </SelectContent>
               </Select>
               <Button variant="outline" size="sm" className="h-9 gap-2 text-xs bg-white text-slate-600">
                 <Filter className="w-3.5 h-3.5" /> Sort: Popular
               </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRACTICE_SETS.map((set) => (
              <Card key={set.id} className="group hover:border-blue-200 hover:shadow-md transition-all duration-200 bg-white border-slate-200 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-normal">
                      {set.role}
                    </Badge>
                    {set.popular && (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 shadow-none font-medium text-[10px] px-1.5 py-0">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2 group-hover:text-blue-700 transition-colors">
                    {set.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                   <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mt-1">
                     <span className="flex items-center gap-1.5 font-medium text-slate-700">
                       <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                       {set.credits || 5} Credits
                     </span>
                     <span className="flex items-center gap-1.5">
                       <Zap className="w-3.5 h-3.5 text-slate-400" />
                       {set.type}
                     </span>
                     <span className="flex items-center gap-1.5">
                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                       {set.duration}
                     </span>
                     <span className="flex items-center gap-1.5">
                       <BarChart className="w-3.5 h-3.5 text-slate-400" />
                       {set.difficulty}
                     </span>
                   </div>
                </CardContent>
                <CardFooter className="pt-0 mt-auto flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                         {/* Mock Company Logos based on set ID to show variety */}
                         {set.id % 2 === 0 ? (
                            <>
                               <div className="w-6 h-6 rounded-full bg-[#4285F4]/10 border border-white flex items-center justify-center text-[9px] font-bold text-[#4285F4]" title="Google">G</div>
                               <div className="w-6 h-6 rounded-full bg-[#0668E1]/10 border border-white flex items-center justify-center text-[9px] font-bold text-[#0668E1]" title="Meta">M</div>
                               <div className="w-6 h-6 rounded-full bg-black/5 border border-white flex items-center justify-center text-[9px] font-bold text-black" title="Uber">U</div>
                            </>
                         ) : (
                            <>
                               <div className="w-6 h-6 rounded-full bg-[#FF9900]/10 border border-white flex items-center justify-center text-[9px] font-bold text-[#FF9900]" title="Amazon">A</div>
                               <div className="w-6 h-6 rounded-full bg-[#E50914]/10 border border-white flex items-center justify-center text-[9px] font-bold text-[#E50914]" title="Netflix">N</div>
                               <div className="w-6 h-6 rounded-full bg-[#000000]/5 border border-white flex items-center justify-center text-[9px] font-bold text-black" title="Apple">A</div>
                            </>
                         )}
                         <div className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-medium text-slate-500">+2</div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {520 + set.id * 15} practiced
                      </span>
                   </div>
                   <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 -mr-2">
                     <ArrowRight className="w-4 h-4" />
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Recent Mocks Section */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                Recent Mocks
              </h3>
              <Link to="/history" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all history <ArrowRight className="w-3.5 h-3.5" />
              </Link>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {RECENT_MOCKS.map(mock => (
                 <div key={mock.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="font-semibold text-slate-900 text-sm">{mock.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{mock.type} • {mock.date}</p>
                       </div>
                       <Badge variant="outline" className={`
                          ${mock.score === 'Pending' ? 'bg-slate-50 text-slate-500' : 'bg-green-50 text-green-700 border-green-200'}
                       `}>
                          {mock.score}
                       </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2">
                       <Button size="sm" variant="outline" className="h-8 flex-1 text-xs">Review</Button>
                       <Button size="sm" variant="ghost" className="h-8 flex-1 text-xs text-blue-600 hover:bg-blue-50">Practice again</Button>
                    </div>
                 </div>
              ))}
           </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}