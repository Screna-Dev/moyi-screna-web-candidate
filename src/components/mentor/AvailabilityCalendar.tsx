import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { Clock, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayOverride {
  date: Date;
  slots: TimeSlot[];
}

export function AvailabilityCalendar() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateOverrides, setDateOverrides] = useState<DayOverride[]>([]);
  
  // Form states
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  const getOverrideForDate = (date: Date): DayOverride | undefined => {
    return dateOverrides.find(o => isSameDay(o.date, date));
  };

  const getSlotsForDate = (date: Date): TimeSlot[] => {
    const override = getOverrideForDate(date);
    return override?.slots || [];
  };

  const addSlotForDate = () => {
    if (!selectedDate) return;
    if (newStartTime >= newEndTime) {
      toast({ title: "Invalid Time Range", description: "End time must be after start time.", variant: "destructive" });
      return;
    }

    const newSlot: TimeSlot = {
      id: `${selectedDate.toISOString()}-${Date.now()}`,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    setDateOverrides(prev => {
      const existing = prev.find(o => isSameDay(o.date, selectedDate));
      if (existing) {
        return prev.map(o => isSameDay(o.date, selectedDate) 
          ? { ...o, slots: [...o.slots, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime)) }
          : o
        );
      }
      return [...prev, { date: selectedDate, slots: [newSlot] }];
    });
    toast({ title: "Time Slot Added" });
  };

  const deleteSlotForDate = (slotId: string) => {
    if (!selectedDate) return;
    setDateOverrides(prev => prev.map(o => 
      isSameDay(o.date, selectedDate) ? { ...o, slots: o.slots.filter(s => s.id !== slotId) } : o
    ).filter(o => o.slots.length > 0));
    toast({ title: "Time Slot Removed" });
  };

  const startEditingForDate = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
  };

  const saveEditForDate = (slotId: string) => {
    if (!selectedDate) return;
    if (editStartTime >= editEndTime) {
      toast({ title: "Invalid Time Range", description: "End time must be after start time.", variant: "destructive" });
      return;
    }

    setDateOverrides(prev => prev.map(o => 
      isSameDay(o.date, selectedDate) 
        ? { ...o, slots: o.slots.map(s => s.id === slotId ? { ...s, startTime: editStartTime, endTime: editEndTime } : s)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)) }
        : o
    ));
    setEditingSlotId(null);
    toast({ title: "Time Slot Updated" });
  };

  const cancelEditing = () => {
    setEditingSlotId(null);
    setEditStartTime('');
    setEditEndTime('');
  };

  const saveAvailability = () => {
    toast({ title: "Availability Saved", description: "Your availability has been saved successfully." });
  };

  const currentSlots = selectedDate ? getSlotsForDate(selectedDate) : [];
  const datesWithSlots = dateOverrides.map(o => o.date);

  const TimeSlotRow = ({ slot }: { slot: TimeSlot }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
      {editingSlotId === slot.id ? (
        <div className="flex items-center gap-2 flex-1">
          <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="w-28" />
          <span className="text-muted-foreground">to</span>
          <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="w-28" />
          <Button size="icon" variant="ghost" onClick={() => saveEditForDate(slot.id)}><Check className="w-4 h-4 text-green-600" /></Button>
          <Button size="icon" variant="ghost" onClick={cancelEditing}><X className="w-4 h-4 text-destructive" /></Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => startEditingForDate(slot)}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => deleteSlotForDate(slot.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose a date to manage availability</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border pointer-events-auto"
            modifiers={{ hasSlots: datesWithSlots }}
            modifiersStyles={{
              hasSlots: { backgroundColor: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))', fontWeight: 'bold' },
            }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a Date'}</CardTitle>
          <CardDescription>
            {currentSlots.length} slot{currentSlots.length !== 1 ? 's' : ''} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium mb-3 block">Add Slot for This Date</Label>
                <div className="flex items-center gap-2">
                  <Input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="w-32" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className="w-32" />
                  <Button onClick={addSlotForDate} size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button>
                </div>
              </div>

              <div className="space-y-2">
                {currentSlots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No slots for this date. Add availability above.</p>
                ) : (
                  currentSlots.map(slot => <TimeSlotRow key={slot.id} slot={slot} />)
                )}
              </div>

              {currentSlots.length > 0 && (
                <Button onClick={saveAvailability} className="w-full">Save Changes</Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Select a date from the calendar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
