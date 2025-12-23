import { format } from 'date-fns';
import { Calendar, Clock, User, Video, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBooking } from '@/contexts/BookingContext';
import { useNavigate } from 'react-router-dom';

export function UpcomingSessions() {
  const { bookedSessions, cancelBooking } = useBooking();
  const navigate = useNavigate();

  const upcomingSessions = bookedSessions
    .filter(s => s.status === 'pending' || s.status === 'confirmed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcomingSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>
            Your scheduled mentoring sessions will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">No upcoming sessions</p>
            <Button variant="outline" onClick={() => navigate('/mentors')}>
              Find a Mentor
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Sessions ({upcomingSessions.length})
        </CardTitle>
        <CardDescription>
          Your scheduled mentoring sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingSessions.map((session) => (
          <div
            key={session.id}
            className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={session.mentor.avatarUrl} alt={session.mentor.displayName} />
              <AvatarFallback>{session.mentor.displayName.substring(0, 2)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{session.mentor.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.mentor.currentTitle} at {session.mentor.currentCompany}
                  </p>
                </div>
                <Badge variant="secondary">{session.sessionType.name}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(session.date), 'EEEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{session.timeSlot} ({session.sessionType.durationMinutes} min)</span>
                </div>
              </div>

              {session.questions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">YOUR QUESTIONS:</p>
                  <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                    {session.questions.slice(0, 2).map((q, i) => (
                      <li key={i} className="truncate">{q}</li>
                    ))}
                    {session.questions.length > 2 && (
                      <li className="text-xs">+{session.questions.length - 2} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" variant="default">
                  <Video className="w-4 h-4 mr-1" />
                  Join Session
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => cancelBooking(session.id)}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Confirmation: {session.confirmationNumber}
              </p>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={() => navigate('/mentors')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Book Another Session
        </Button>
      </CardContent>
    </Card>
  );
}
