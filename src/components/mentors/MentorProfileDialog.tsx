import { Star, MapPin, Globe, Briefcase, Clock, DollarSign, GraduationCap, Building2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type MentorApplication } from '@/data/mentorMockData';

interface MentorProfileDialogProps {
  mentor: MentorApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rating: string;
  onBookSession?: () => void;
}

// Mock reviews data
const mockReviews = [
  {
    id: '1',
    candidateName: 'John D.',
    rating: 5,
    comment: 'Amazing mentor! Very insightful and helped me prepare for my PM interviews effectively.',
    date: '2025-11-15',
  },
  {
    id: '2',
    candidateName: 'Sarah M.',
    rating: 5,
    comment: 'Great session, covered all the key areas I needed help with. Highly recommend!',
    date: '2025-11-10',
  },
  {
    id: '3',
    candidateName: 'Michael K.',
    rating: 4,
    comment: 'Very knowledgeable and provided actionable feedback on my resume.',
    date: '2025-11-05',
  },
];

export function MentorProfileDialog({ mentor, open, onOpenChange, rating, onBookSession }: MentorProfileDialogProps) {
  if (!mentor) return null;

  const enabledSessionTypes = mentor.sessionTypes.filter(st => 
    mentor.baseRates.find(r => r.sessionTypeId === st.id && r.enabled)
  );

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={mentor.avatarUrl} alt={mentor.displayName} />
                  <AvatarFallback className="text-xl">{mentor.displayName.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-2xl">{mentor.displayName}</DialogTitle>
                  <p className="text-muted-foreground">{mentor.currentTitle}</p>
                  <p className="font-medium text-primary">{mentor.currentCompany}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{mentor.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>{mentor.languages.join(', ')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl font-bold">{rating}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{mockReviews.length} reviews</p>
                </div>
              </div>
            </DialogHeader>

            <Separator className="my-4" />

            {/* Background Profile */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Background
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{mentor.shortBio}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <span>{mentor.yearsOfExperience} experience</span>
                </div>
              </div>
              {mentor.companiesHighlights.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">NOTABLE COMPANIES</p>
                  <div className="flex flex-wrap gap-2">
                    {mentor.companiesHighlights.map((company, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Building2 className="w-3 h-3 mr-1" />
                        {company}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {mentor.linkedInUrl && (
                <a
                  href={mentor.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View LinkedIn Profile
                </a>
              )}
            </section>

            <Separator className="my-4" />

            {/* Tags Section */}
            <section className="space-y-4">
              <h3 className="font-semibold">Expertise & Topics</h3>
              
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">SPECIALIZATIONS</p>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertises.map((exp, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">CAN HELP WITH</p>
                <div className="flex flex-wrap gap-2">
                  {mentor.topics.map((topic, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {mentor.industries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">INDUSTRIES</p>
                  <div className="flex flex-wrap gap-2">
                    {mentor.industries.map((industry, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-muted">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <Separator className="my-4" />

            {/* Available Sessions */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Available Sessions
              </h3>
              <div className="grid gap-3">
                {enabledSessionTypes.map((sessionType) => {
                  const rate = mentor.baseRates.find(r => r.sessionTypeId === sessionType.id);
                  return (
                    <div
                      key={sessionType.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{sessionType.name}</p>
                        <p className="text-sm text-muted-foreground">{sessionType.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sessionType.durationMinutes} minutes</p>
                      </div>
                      <div className="flex items-center gap-1 text-lg font-bold text-primary">
                        <DollarSign className="w-5 h-5" />
                        {rate?.priceUsd}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator className="my-4" />

            {/* Reviews */}
            <section className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Star className="w-4 h-4" />
                Reviews ({mockReviews.length})
              </h3>
              <div className="space-y-4">
                {mockReviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{review.candidateName}</span>
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-4" />

            {/* Book Button */}
            <Button className="w-full" size="lg" onClick={onBookSession}>
              Book Session Now
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
