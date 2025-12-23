import { format } from 'date-fns';
import { Calendar, Clock, User, MessageSquare, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBooking } from '@/contexts/BookingContext';

interface MentorBookedSessionsProps {
  mentorId?: string;
}

export function MentorBookedSessions({ mentorId }: MentorBookedSessionsProps) {
  const { bookedSessions } = useBooking();

  // In a real app, we'd filter by mentorId. For now, show all bookings.
  const upcomingSessions = bookedSessions
    .filter(s => s.status === 'pending' || s.status === 'confirmed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcomingSessions.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Newly Booked Sessions ({upcomingSessions.length})
        </CardTitle>
        <CardDescription>
          Sessions booked by candidates awaiting your confirmation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Session Type</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcomingSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">
                      {format(new Date(session.date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-muted-foreground">{session.timeSlot}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{session.candidateName}</div>
                    <div className="text-muted-foreground text-xs">{session.candidateEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{session.sessionType.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {session.sessionType.durationMinutes} min
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {session.questions.length > 0 ? (
                    <div className="max-w-[200px]">
                      <p className="text-sm truncate">{session.questions[0]}</p>
                      {session.questions.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          +{session.questions.length - 1} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No questions</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 font-medium text-green-600">
                    <DollarSign className="w-4 h-4" />
                    {session.sessionFee.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm">
                      Confirm
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
