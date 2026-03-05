import { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  ExternalLink, 
  MoreHorizontal, 
  PlayCircle, 
  Search,
  Bookmark,
  Trash2,
  Filter,
  Plus,
  FolderPlus,
  Clock,
  LayoutGrid,
  List as ListIcon,
  GripVertical,
  X,
  Mic,
  Type
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '@/components/newDesign/ui/button';
import { Input } from '@/components/newDesign/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/newDesign/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/newDesign/ui/card';
import { Badge } from '@/components/newDesign/ui/badge';
import { Checkbox } from '@/components/newDesign/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/newDesign/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/newDesign/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/newDesign/ui/dialog";
import { Label } from "@/components/newDesign/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/newDesign/ui/radio-group";
import { ScrollArea } from "@/components/newDesign/ui/scroll-area";
import { toast } from "sonner";

// Mock Data
const SAVED_QUESTIONS = [
  {
    id: 1,
    title: "Reverse a Linked List",
    difficulty: "Junior",
    category: "Data Structures",
    addedDate: "2023-10-15",
    status: "Not Started",
    lastPracticed: null,
    attempts: 0
  },
  {
    id: 2,
    title: "Design a URL Shortener",
    difficulty: "Staff",
    category: "System Design",
    addedDate: "2023-10-18",
    status: "In Progress",
    lastPracticed: "2 days ago",
    attempts: 3
  },
  {
    id: 3,
    title: "Tell me about a time you failed",
    difficulty: "Intermediate",
    category: "Behavioral",
    addedDate: "2023-10-20",
    status: "Completed",
    lastPracticed: "1 week ago",
    attempts: 5
  },
  {
    id: 4,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Intermediate",
    category: "Algorithms",
    addedDate: "2023-10-22",
    status: "Not Started",
    lastPracticed: null,
    attempts: 0
  },
  {
    id: 5,
    title: "Explain the difference between SQL and NoSQL",
    difficulty: "Junior",
    category: "Database",
    addedDate: "2023-10-25",
    status: "Completed",
    lastPracticed: "Yesterday",
    attempts: 12
  }
];

const COLLECTIONS = [
  {
    id: 1,
    title: "Frontend Essentials",
    questionCount: 12,
    lastUpdated: "2 days ago",
    questions: [SAVED_QUESTIONS[0], SAVED_QUESTIONS[3]]
  },
  {
    id: 2,
    title: "Behavioral Prep",
    questionCount: 8,
    lastUpdated: "1 week ago",
    questions: [SAVED_QUESTIONS[2]]
  },
  {
    id: 3,
    title: "System Design Drill",
    questionCount: 5,
    lastUpdated: "3 days ago",
    questions: [SAVED_QUESTIONS[1]]
  }
];

const READ_ARTICLES = [
  {
    id: 1,
    title: "Mastering the System Design Interview",
    source: "Screna Blog",
    readDate: "2023-10-10",
    tags: ["System Design", "Interview Tips"]
  },
  {
    id: 2,
    title: "Top 10 Behavioral Questions for 2024",
    source: "Career Insights",
    readDate: "2023-10-12",
    tags: ["Behavioral", "Soft Skills"]
  },
  {
    id: 3,
    title: "React vs Angular: Which one to choose?",
    source: "Tech Daily",
    readDate: "2023-10-14",
    tags: ["Frontend", "Frameworks"]
  },
  {
    id: 4,
    title: "How to negotiate your salary effectively",
    source: "HR Weekly",
    readDate: "2023-10-28",
    tags: ["Career Growth", "Salary"]
  }
];

export function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("questions");
  
  // Sheet & Dialog States
  const [isCollectionDrawerOpen, setIsCollectionDrawerOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<typeof COLLECTIONS[0] | null>(null);
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState({
    mode: "text",
    timer: "10",
    order: "sequential"
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Junior": return "text-green-600 bg-green-50 border-green-200";
      case "Intermediate": return "text-amber-600 bg-amber-50 border-amber-200";
      case "Senior": return "text-orange-600 bg-orange-50 border-orange-200";
      case "Staff": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "text-green-600 bg-green-50";
      case "In Progress": return "text-blue-600 bg-blue-50";
      default: return "text-gray-500 bg-gray-100";
    }
  };

  const handleSelectQuestion = (id: number) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === SAVED_QUESTIONS.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(SAVED_QUESTIONS.map(q => q.id));
    }
  };

  const openCollection = (collection: typeof COLLECTIONS[0]) => {
    setActiveCollection(collection);
    setIsCollectionDrawerOpen(true);
  };

  const openPracticeSetup = (order: string = "sequential") => {
    setPracticeConfig(prev => ({ ...prev, order }));
    setIsPracticeModalOpen(true);
  };

  return (
    <DashboardLayout headerTitle="My Library">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(222,22%,15%)]">My Library</h1>
            <p className="text-[hsl(222,12%,45%)] mt-1">Save questions, organize collections, and practice anytime.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search library..." 
              className="bg-white border-[hsl(220,16%,90%)] pl-[36px] pr-[12px] py-[4px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
              {activeTab === 'questions' && selectedQuestions.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button size="sm" variant="outline" className="gap-2 text-[hsl(222,12%,45%)]">
                  <FolderPlus className="w-4 h-4" />
                  Add to collection
                </Button>
                <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                  <Trash2 className="w-4 h-4" />
                  Remove ({selectedQuestions.length})
                </Button>
                <div className="h-6 w-px bg-gray-200 mx-1"></div>
              </div>
              )}
              <Button variant="outline" className="shrink-0 bg-white border-[hsl(220,16%,90%)] gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filters
            </Button>
          </div>
        </div>

        <Tabs defaultValue="questions" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-transparent p-0 w-full flex items-center border-b border-[hsl(220,16%,90%)] rounded-none h-auto">
            <TabsTrigger 
              value="questions" 
              className="px-6 py-3 rounded-none border-0 border-b-2 border-transparent text-sm font-medium text-[hsl(222,12%,55%)] bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[hsl(221,91%,60%)] data-[state=active]:shadow-none data-[state=active]:border-[hsl(221,91%,60%)] transition-all hover:text-[hsl(222,22%,15%)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none shadow-none"
            >
              Saved Questions
              <Badge className="ml-2 bg-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)] data-[state=active]:bg-[hsl(221,91%,60%)]/10 data-[state=active]:text-[hsl(221,91%,60%)] hover:bg-[hsl(220,16%,85%)] border-0 pointer-events-none rounded-full px-2">
                {SAVED_QUESTIONS.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="collections" 
              className="px-6 py-3 rounded-none border-0 border-b-2 border-transparent text-sm font-medium text-[hsl(222,12%,55%)] bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[hsl(221,91%,60%)] data-[state=active]:shadow-none data-[state=active]:border-[hsl(221,91%,60%)] transition-all hover:text-[hsl(222,22%,15%)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none shadow-none"
            >
              Collections
              <Badge className="ml-2 bg-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)] data-[state=active]:bg-[hsl(221,91%,60%)]/10 data-[state=active]:text-[hsl(221,91%,60%)] hover:bg-[hsl(220,16%,85%)] border-0 pointer-events-none rounded-full px-2">
                {COLLECTIONS.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="articles" 
              className="px-6 py-3 rounded-none border-0 border-b-2 border-transparent text-sm font-medium text-[hsl(222,12%,55%)] bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[hsl(221,91%,60%)] data-[state=active]:shadow-none data-[state=active]:border-[hsl(221,91%,60%)] transition-all hover:text-[hsl(222,22%,15%)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none shadow-none"
            >
              Reading History
            </TabsTrigger>
          </TabsList>
          
          {/* Saved Questions Content */}
          <TabsContent value="questions" className="space-y-4 mt-6">
            <div className="grid gap-3">
              {/* Select All Header (Optional, good for bulk) */}
              <div className="flex items-center px-5 py-2 text-sm text-[hsl(222,12%,55%)]">
                <div className="flex items-center gap-4">
                  <Checkbox 
                    checked={selectedQuestions.length === SAVED_QUESTIONS.length && SAVED_QUESTIONS.length > 0} 
                    onCheckedChange={handleSelectAll}
                  />
                  <span>Select All</span>
                </div>
              </div>

              {SAVED_QUESTIONS.map((question) => (
                <Card 
                  key={question.id} 
                  className={`group bg-white border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/30 hover:shadow-md transition-all duration-300 ${selectedQuestions.includes(question.id) ? 'border-[hsl(221,91%,60%)] bg-blue-50/10' : ''}`}
                >
                  <CardContent className="p-4 sm:p-5 flex gap-4 items-start sm:items-center">
                    <div className="pt-1 sm:pt-0">
                      <Checkbox 
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={() => handleSelectQuestion(question.id)}
                      />
                    </div>

                    <div className="w-10 h-10 rounded-full bg-[hsl(220,20%,97%)] flex items-center justify-center shrink-0 group-hover:bg-[hsl(221,91%,60%)]/10 transition-colors hidden sm:flex">
                      <Bookmark className="w-5 h-5 text-[hsl(222,12%,55%)] group-hover:text-[hsl(221,91%,60%)] transition-colors" />
                    </div>
                    
                    <div className="flex-1 min-w-0 grid gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[hsl(222,22%,15%)] group-hover:text-[hsl(221,91%,60%)] transition-colors truncate">
                          {question.title}
                        </h3>
                        {question.status === "Completed" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                         <Badge variant="outline" className={`rounded-md font-medium border ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </Badge>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                          {question.category}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">
                          {question.lastPracticed ? `Last practiced ${question.lastPracticed}` : 'Not practiced yet'}
                        </span>
                        {question.attempts > 0 && (
                           <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{question.attempts} attempts</span>
                           </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0 ml-auto sm:ml-0">
                      <Button variant="ghost" size="sm" className="h-8 text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] hidden md:flex gap-2">
                        <FolderPlus className="w-4 h-4" />
                        Add to collection
                      </Button>
                      
                      <Button size="sm" onClick={() => openPracticeSetup("sequential")} className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white shadow-sm shadow-blue-200 h-9 px-4">
                        <PlayCircle className="w-4 h-4 mr-1.5" />
                        Practice
                      </Button>

                      <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => toast.success("Question removed from library")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-[hsl(222,22%,15%)]">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="md:hidden">Add to Collection</DropdownMenuItem>
                          <DropdownMenuItem>View Solution</DropdownMenuItem>
                          <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Remove from Library</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center mt-6">
              <Button variant="outline" className="text-gray-500 border-dashed border-gray-300">
                Load More Questions
              </Button>
            </div>
          </TabsContent>

          {/* Collections Content */}
          <TabsContent value="collections" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
               <h2 className="text-lg font-semibold text-[hsl(222,22%,15%)]">Your Collections</h2>
               <Button onClick={() => toast.success("New collection created")} className="bg-[hsl(222,22%,15%)] text-white hover:bg-[hsl(222,22%,25%)]">
                 <Plus className="w-4 h-4 mr-2" /> New Collection
               </Button>
            </div>

            {COLLECTIONS.length === 0 ? (
               <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderPlus className="w-8 h-8 text-gray-400" />
                 </div>
                 <h3 className="text-lg font-medium text-gray-900">No collections yet</h3>
                 <p className="text-gray-500 max-w-sm mx-auto mt-2 mb-6">Create collections to organize specific questions for focused practice sessions.</p>
                 <Button variant="outline">Create Collection</Button>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {COLLECTIONS.map((collection) => (
                  <Card key={collection.id} className="group hover:border-[hsl(221,91%,60%)]/50 transition-all hover:shadow-md cursor-pointer">
                    <CardHeader className="pb-3 relative">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-lg bg-[hsl(220,20%,97%)] flex items-center justify-center text-[hsl(222,12%,45%)] group-hover:bg-[hsl(221,91%,60%)] group-hover:text-white transition-colors">
                           <LayoutGrid className="w-5 h-5" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-400 hover:text-[hsl(222,22%,15%)]">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Rename</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="mt-3 group-hover:text-[hsl(221,91%,60%)] transition-colors">{collection.title}</CardTitle>
                      <CardDescription>{collection.questionCount} questions • Updated {collection.lastUpdated}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mt-2">
                        <Button className="flex-1 bg-white border border-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)] hover:bg-gray-50 hover:text-[hsl(222,22%,15%)] shadow-sm" onClick={() => openCollection(collection)}>
                           Open
                        </Button>
                        <Button className="flex-1 bg-[hsl(222,22%,15%)] text-white hover:bg-[hsl(222,22%,25%)]" onClick={() => openPracticeSetup("sequential")}>
                           <PlayCircle className="w-4 h-4 mr-2" /> Practice
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reading History Content */}
          <TabsContent value="articles" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {READ_ARTICLES.map((article) => (
                <Card key={article.id} className="group bg-white border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/30 hover:shadow-md transition-all h-full flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100">
                        {article.source}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => toast.success("Removed from reading history")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-[hsl(221,91%,60%)] transition-colors mt-2">
                      {article.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs mt-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Read on {article.readDate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {article.tags.map(tag => (
                        <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full justify-between group-hover:border-[hsl(221,91%,60%)]/30 group-hover:text-[hsl(221,91%,60%)] transition-all">
                      Read Again
                      <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Collection Detail Drawer */}
        <Sheet open={isCollectionDrawerOpen} onOpenChange={setIsCollectionDrawerOpen}>
           <SheetContent className="sm:max-w-xl w-full flex flex-col h-full overflow-hidden">
             <SheetHeader className="pb-4 border-b">
               <SheetTitle className="flex items-center gap-2 text-xl">
                 <span className="cursor-pointer hover:border-b hover:border-dashed hover:border-gray-400">{activeCollection?.title}</span>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400">
                   <Type className="w-3 h-3" />
                 </Button>
               </SheetTitle>
               <SheetDescription>
                  {activeCollection?.questionCount} questions • Last updated {activeCollection?.lastUpdated}
               </SheetDescription>
               <div className="flex gap-3 pt-4">
                 <Button className="flex-1 bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)]" onClick={() => openPracticeSetup("sequential")}>
                   <PlayCircle className="w-4 h-4 mr-2" /> Practice
                 </Button>
                 <Button variant="outline" className="flex-1" onClick={() => openPracticeSetup("random")}>
                   Random Shuffle
                 </Button>
               </div>
             </SheetHeader>
             
             <div className="flex-1 overflow-y-auto py-6 pr-2">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Questions in collection</h4>
                   <Button size="sm" variant="ghost" className="text-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,50%)] hover:bg-blue-50">
                     + Add Questions
                   </Button>
                </div>
                
                <div className="space-y-3">
                   {activeCollection?.questions && activeCollection.questions.length > 0 ? (
                     activeCollection.questions.map((q, i) => (
                       <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 group transition-colors">
                          <div className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500">
                             <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-medium">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium text-gray-900 truncate">{q.title}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-auto ${getDifficultyColor(q.difficulty)}`}>{q.difficulty}</Badge>
                               <span className="text-[10px] text-gray-400">{q.category}</span>
                             </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <X className="w-4 h-4" />
                          </Button>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-12 border border-dashed rounded-lg bg-gray-50/50">
                        <p className="text-sm text-gray-500">This collection is empty.</p>
                        <Button variant="link" size="sm">Add questions from Library</Button>
                     </div>
                   )}
                </div>
             </div>
             
             <SheetFooter className="pt-4 border-t mt-auto">
                <Button variant="outline" onClick={() => setIsCollectionDrawerOpen(false)} className="w-full">Close</Button>
             </SheetFooter>
           </SheetContent>
        </Sheet>

        {/* Practice Setup Modal */}
        <Dialog open={isPracticeModalOpen} onOpenChange={setIsPracticeModalOpen}>
           <DialogContent className="sm:max-w-md">
             <DialogHeader>
               <DialogTitle>Practice Setup</DialogTitle>
               <DialogDescription>
                 Configure your session preferences before starting.
               </DialogDescription>
             </DialogHeader>
             
             <div className="grid gap-6 py-4">
               <div className="space-y-3">
                 <Label className="text-sm font-medium">Mode</Label>
                 <RadioGroup 
                    defaultValue="voice" 
                    value={practiceConfig.mode === 'text' ? 'voice' : practiceConfig.mode} 
                    onValueChange={(val) => setPracticeConfig({...practiceConfig, mode: val})}
                    className="grid grid-cols-2 gap-4"
                  >
                   <div>
                     <RadioGroupItem value="voice" id="mode-voice" className="peer sr-only" />
                     <Label
                       htmlFor="mode-voice"
                       className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[hsl(221,91%,60%)] [&:has([data-state=checked])]:border-[hsl(221,91%,60%)] cursor-pointer transition-all"
                     >
                       <Mic className="mb-2 h-6 w-6 text-gray-500 peer-data-[state=checked]:text-[hsl(221,91%,60%)]" />
                       <span className="text-sm font-medium">Voice</span>
                     </Label>
                   </div>
                   <div>
                     <RadioGroupItem value="video" id="mode-video" className="peer sr-only" />
                     <Label
                       htmlFor="mode-video"
                       className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[hsl(221,91%,60%)] [&:has([data-state=checked])]:border-[hsl(221,91%,60%)] cursor-pointer transition-all"
                     >
                       <PlayCircle className="mb-2 h-6 w-6 text-gray-500 peer-data-[state=checked]:text-[hsl(221,91%,60%)]" />
                       <span className="text-sm font-medium">Video</span>
                     </Label>
                   </div>
                 </RadioGroup>
               </div>

               <div className="space-y-3">
                 <Label className="text-sm font-medium">Timer (per question)</Label>
                 <div className="flex flex-wrap gap-2">
                   {['Off', '5', '10', '20'].map((time) => (
                     <Button 
                        key={time} 
                        variant={practiceConfig.timer === time ? "default" : "outline"}
                        className={practiceConfig.timer === time ? "bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)]" : ""}
                        onClick={() => setPracticeConfig({...practiceConfig, timer: time})}
                        size="sm"
                     >
                       {time === 'Off' ? 'Off' : `${time} min`}
                     </Button>
                   ))}
                 </div>
               </div>

                <div className="space-y-3">
                 <Label className="text-sm font-medium">Order</Label>
                 <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button 
                      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${practiceConfig.order === 'sequential' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setPracticeConfig({...practiceConfig, order: 'sequential'})}
                    >
                      Sequential
                    </button>
                    <button 
                      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${practiceConfig.order === 'random' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setPracticeConfig({...practiceConfig, order: 'random'})}
                    >
                      Random
                    </button>
                 </div>
               </div>
             </div>
             
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsPracticeModalOpen(false)}>Cancel</Button>
               <Button className="bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,25%)] text-white">Start Practice</Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* Floating Action Button for Selected Questions */}
        {selectedQuestions.length > 0 && activeTab === 'questions' && (
          <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <Button 
              size="lg" 
              onClick={() => openPracticeSetup("sequential")}
              className="h-14 rounded-full px-6 shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white gap-2.5 transition-all hover:scale-105"
            >
              <PlayCircle className="w-5 h-5 fill-current" />
              <span className="font-semibold text-base">Start Practice ({selectedQuestions.length})</span>
            </Button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
