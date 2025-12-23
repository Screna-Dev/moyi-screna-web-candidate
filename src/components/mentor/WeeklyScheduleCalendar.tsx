import { useMemo, useState } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvailabilitySlot, MentorSession } from '@/data/mentorMockData';

interface WeeklyScheduleCalendarProps {
  availabilitySlots: AvailabilitySlot[];
  sessions: MentorSession[];
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
const WEEKDAY_MAP: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
};

export function WeeklyScheduleCalendar({ availabilitySlots, sessions }: WeeklyScheduleCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const getAvailabilityForDay = (date: Date) => {
    const dayName = format(date, 'EEEE');
    return availabilitySlots.filter(slot => slot.weekday === dayName);
  };

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return isSameDay(sessionDate, date) && session.status !== 'cancelled';
    });
  };

  const timeToPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return ((hours - 8) * 60 + minutes) / 60; // Position in hours from 8 AM
  };

  const getSlotHeight = (startTime: string, endTime: string) => {
    const start = timeToPosition(startTime);
    const end = timeToPosition(endTime);
    return (end - start) * 48; // 48px per hour
  };

  const getSlotTop = (startTime: string) => {
    return timeToPosition(startTime) * 48; // 48px per hour
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300';
      case 'confirmed': return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'completed': return 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentWeekStart(prev => subWeeks(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
            <span className="text-xs text-muted-foreground">Confirmed</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header with day names */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
              <div className="p-2 text-xs text-muted-foreground border-r" />
              {weekDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-2 text-center border-r last:border-r-0",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                  <div className={cn(
                    "text-sm font-medium",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
              {/* Time column */}
              <div className="border-r">
                {HOURS.map(hour => (
                  <div 
                    key={hour} 
                    className="h-12 border-b text-xs text-muted-foreground pr-2 text-right pt-0 -mt-2"
                  >
                    {hour === 8 ? '' : `${hour}:00`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const availability = getAvailabilityForDay(day);
                const daySessions = getSessionsForDay(day);

                return (
                  <div 
                    key={dayIdx} 
                    className={cn(
                      "relative border-r last:border-r-0",
                      isSameDay(day, new Date()) && "bg-primary/5"
                    )}
                  >
                    {/* Hour lines */}
                    {HOURS.map(hour => (
                      <div key={hour} className="h-12 border-b border-dashed border-border/50" />
                    ))}

                    {/* Availability blocks */}
                    {availability.map((slot, slotIdx) => {
                      const startHour = parseInt(slot.startTime.split(':')[0]);
                      const endHour = parseInt(slot.endTime.split(':')[0]);
                      
                      if (startHour < 8 || endHour > 22) return null;

                      return (
                        <div
                          key={`avail-${slotIdx}`}
                          className="absolute left-0.5 right-0.5 bg-green-500/20 border border-green-500/50 rounded-sm pointer-events-none"
                          style={{
                            top: `${getSlotTop(slot.startTime)}px`,
                            height: `${getSlotHeight(slot.startTime, slot.endTime)}px`,
                          }}
                        />
                      );
                    })}

                    {/* Session blocks */}
                    {daySessions.map((session, sessionIdx) => {
                      const startHour = parseInt(session.startTime.split(':')[0]);
                      
                      if (startHour < 8 || startHour > 22) return null;

                      return (
                        <div
                          key={`session-${sessionIdx}`}
                          className={cn(
                            "absolute left-1 right-1 rounded border px-1 py-0.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity z-10",
                            getSessionStatusColor(session.status)
                          )}
                          style={{
                            top: `${getSlotTop(session.startTime)}px`,
                            height: `${getSlotHeight(session.startTime, session.endTime)}px`,
                          }}
                          title={`${session.candidateName} - ${session.type}`}
                        >
                          <div className="text-[10px] font-medium truncate">
                            {session.candidateName}
                          </div>
                          <div className="text-[9px] truncate opacity-80">
                            {session.startTime} - {session.endTime}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
