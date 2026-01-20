import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Library, 
  Search, 
  Building2, 
  Clock, 
  MessageSquare,
  Coins,
  ChevronRight,
  Plus,
  Filter
} from 'lucide-react';
import { experienceLibrary, type ExperienceCard as ExperienceCardType } from '@/data/experienceMockData';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const difficultyColors = {
  Easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ExperienceCard = ({ experience }: { experience: ExperienceCardType }) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
      onClick={() => navigate(`/experience/${experience.experienceId}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Company & Role */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {experience.companyName}
                </h3>
                <p className="text-sm text-muted-foreground">{experience.jobTitle}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {experience.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              <Badge className={difficultyColors[experience.meta.difficulty]}>
                {experience.meta.difficulty}
              </Badge>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {experience.meta.duration}
              </span>
              <span>•</span>
              <span>{experience.meta.posted}</span>
            </div>
          </div>

          {/* Right side - Answers count & CTA */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">{experience.highlightedAnswersCount}</span>
              <span className="text-xs text-muted-foreground">answers</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" />
              {experience.creditCostHint}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ExperienceLibrary = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Get unique companies for filter
  const companies = [...new Set(experienceLibrary.map(e => e.companyName))];

  // Filter experiences
  const filteredExperiences = experienceLibrary.filter(exp => {
    const matchesSearch = searchQuery === '' || 
      exp.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCompany = companyFilter === 'all' || exp.companyName === companyFilter;
    const matchesDifficulty = difficultyFilter === 'all' || exp.meta.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === 'all' || exp.tags.includes(categoryFilter);

    return matchesSearch && matchesCompany && matchesDifficulty && matchesCategory;
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                  <Library className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Interview Experience Library</h1>
                <p className="text-muted-foreground text-lg">
                  Browse real interview experiences and learn from top community answers.
                </p>
              </div>
              <Button onClick={() => navigate('/experience/upload')} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Share Experience
              </Button>
            </div>

            {/* Filter Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by company, role, or tag..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Building2 className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map(company => (
                          <SelectItem key={company} value={company}>{company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="w-[130px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Interview Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Behavioral">Behavioral</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="System Design">System Design</SelectItem>
                        <SelectItem value="Case Study">Case/Scenario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-4">
              Showing {filteredExperiences.length} experience{filteredExperiences.length !== 1 ? 's' : ''}
            </p>

            {/* Experience List */}
            <div className="space-y-4">
              {filteredExperiences.map(experience => (
                <ExperienceCard key={experience.experienceId} experience={experience} />
              ))}

              {filteredExperiences.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No experiences found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your filters or be the first to share an experience!
                    </p>
                    <Button onClick={() => navigate('/experience/upload')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Share Your Experience
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ExperienceLibrary;
