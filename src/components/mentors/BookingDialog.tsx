import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Check, Download, Clock, DollarSign, Calendar, MessageSquare, CreditCard, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useBooking, type BookedSession } from '@/contexts/BookingContext';
import { type MentorApplication, type SessionType } from '@/data/mentorMockData';

interface BookingDialogProps {
  mentor: MentorApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

// Generate mock available time slots for the next 7 days
const generateTimeSlots = () => {
  const slots: { date: string; times: string[] }[] = [];
  for (let i = 1; i <= 7; i++) {
    const date = addDays(new Date(), i);
    slots.push({
      date: format(date, 'yyyy-MM-dd'),
      times: ['09:00 AM', '10:30 AM', '02:00 PM', '04:00 PM', '06:00 PM'].filter(() => Math.random() > 0.3),
    });
  }
  return slots.filter(s => s.times.length > 0);
};

type BookingStep = 'session' | 'questions' | 'timeslot' | 'payment' | 'confirmation';

export function BookingDialog({ mentor, open, onOpenChange }: BookingDialogProps) {
  const { toast } = useToast();
  const { addBooking } = useBooking();
  
  const [step, setStep] = useState<BookingStep>('session');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookedSession | null>(null);
  
  const [timeSlots] = useState(generateTimeSlots);

  if (!mentor) return null;

  const enabledSessionTypes = mentor.sessionTypes.filter(st => 
    mentor.baseRates.find(r => r.sessionTypeId === st.id && r.enabled)
  );

  const getSessionPrice = (sessionTypeId: string) => {
    const rate = mentor.baseRates.find(r => r.sessionTypeId === sessionTypeId);
    return rate?.priceUsd || 0;
  };

  const sessionPrice = selectedSessionType ? getSessionPrice(selectedSessionType.id) : 0;
  const platformFee = sessionPrice * PLATFORM_FEE_PERCENT;
  const totalPrice = sessionPrice + platformFee;

  const handleSelectSession = (sessionType: SessionType) => {
    setSelectedSessionType(sessionType);
  };

  const handleNextStep = () => {
    if (step === 'session' && selectedSessionType) {
      setStep('questions');
    } else if (step === 'questions') {
      setStep('timeslot');
    } else if (step === 'timeslot' && selectedDate && selectedTime) {
      setStep('payment');
    }
  };

  const handleBack = () => {
    if (step === 'questions') setStep('session');
    else if (step === 'timeslot') setStep('questions');
    else if (step === 'payment') setStep('timeslot');
  };

  const handlePayment = async () => {
    if (!selectedSessionType || !selectedDate || !selectedTime) return;
    
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const booking = addBooking({
      mentor,
      sessionType: selectedSessionType,
      date: selectedDate,
      timeSlot: selectedTime,
      questions: questions.filter(q => q.trim()),
      sessionFee: sessionPrice,
      platformFee,
      totalPaid: totalPrice,
      status: 'pending',
      candidateName: 'Alex Carter',
      candidateEmail: 'alex.carter@email.com',
    });
    
    setConfirmedBooking(booking);
    setIsProcessing(false);
    setStep('confirmation');
    
    toast({
      title: 'Session Booked!',
      description: `Your session with ${mentor.displayName} has been confirmed.`,
    });
  };

  const handleDownloadConfirmation = () => {
    if (!confirmedBooking) return;
    
    const content = `
BOOKING CONFIRMATION
====================

Confirmation Number: ${confirmedBooking.confirmationNumber}
Booked on: ${format(new Date(confirmedBooking.bookedAt), 'PPpp')}

MENTOR DETAILS
--------------
Name: ${confirmedBooking.mentor.displayName}
Title: ${confirmedBooking.mentor.currentTitle}
Company: ${confirmedBooking.mentor.currentCompany}

SESSION DETAILS
---------------
Type: ${confirmedBooking.sessionType.name}
Duration: ${confirmedBooking.sessionType.durationMinutes} minutes
Date: ${format(new Date(confirmedBooking.date), 'PPPP')}
Time: ${confirmedBooking.timeSlot}

YOUR QUESTIONS
--------------
${confirmedBooking.questions.length > 0 ? confirmedBooking.questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'No questions provided'}

PAYMENT SUMMARY
---------------
Session Fee: $${confirmedBooking.sessionFee.toFixed(2)}
Platform Fee: $${confirmedBooking.platformFee.toFixed(2)}
Total Paid: $${confirmedBooking.totalPaid.toFixed(2)}

Thank you for booking with Screna!
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${confirmedBooking.confirmationNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    // Reset state
    setStep('session');
    setSelectedSessionType(null);
    setQuestions([]);
    setCurrentQuestion('');
    setSelectedDate(null);
    setSelectedTime(null);
    setConfirmedBooking(null);
    onOpenChange(false);
  };

  const steps: { key: BookingStep; label: string; icon: React.ReactNode }[] = [
    { key: 'session', label: 'Session', icon: <Clock className="w-4 h-4" /> },
    { key: 'questions', label: 'Questions', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'timeslot', label: 'Time', icon: <Calendar className="w-4 h-4" /> },
    { key: 'payment', label: 'Payment', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'confirmation', label: 'Done', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl">
                {step === 'confirmation' ? 'Booking Confirmed!' : `Book Session with ${mentor.displayName}`}
              </DialogTitle>
            </DialogHeader>

            {/* Progress Steps */}
            {step !== 'confirmation' && (
              <div className="flex items-center justify-between mb-6">
                {steps.slice(0, -1).map((s, index) => (
                  <div key={s.key} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                        index <= currentStepIndex 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground/30 text-muted-foreground"
                      )}>
                        {index < currentStepIndex ? <Check className="w-4 h-4" /> : s.icon}
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        index <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                      )}>
                        {s.label}
                      </span>
                    </div>
                    {index < steps.length - 2 && (
                      <div className={cn(
                        "w-8 h-0.5 mx-1 mb-5",
                        index < currentStepIndex ? "bg-primary" : "bg-muted-foreground/30"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Select Session Type */}
            {step === 'session' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select the type of session you want to book:</p>
                <RadioGroup
                  value={selectedSessionType?.id || ''}
                  onValueChange={(value) => {
                    const st = enabledSessionTypes.find(s => s.id === value);
                    if (st) handleSelectSession(st);
                  }}
                >
                  <div className="grid gap-3">
                    {enabledSessionTypes.map((sessionType) => {
                      const price = getSessionPrice(sessionType.id);
                      return (
                        <label
                          key={sessionType.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                            selectedSessionType?.id === sessionType.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={sessionType.id} />
                            <div>
                              <p className="font-medium">{sessionType.name}</p>
                              <p className="text-sm text-muted-foreground">{sessionType.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">{sessionType.durationMinutes} minutes</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-lg font-bold text-primary">
                            <DollarSign className="w-5 h-5" />
                            {price}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleNextStep} disabled={!selectedSessionType}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Input Questions */}
            {step === 'questions' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Questions for the mentor</Label>
                  <p className="text-sm text-muted-foreground">
                    Help your mentor prepare by adding questions one by one.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a question and press Add..."
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && currentQuestion.trim()) {
                          setQuestions([...questions, currentQuestion.trim()]);
                          setCurrentQuestion('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (currentQuestion.trim()) {
                          setQuestions([...questions, currentQuestion.trim()]);
                          setCurrentQuestion('');
                        }
                      }}
                      disabled={!currentQuestion.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {questions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Your questions ({questions.length})</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {questions.map((q, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <span className="text-sm text-muted-foreground w-5">{index + 1}.</span>
                          <span className="flex-1 text-sm">{q}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button onClick={handleNextStep}>
                    {questions.length > 0 ? 'Continue' : 'Skip & Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Select Time Slot */}
            {step === 'timeslot' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select an available time slot:</p>
                
                <div className="space-y-4">
                  {timeSlots.map((slot) => (
                    <div key={slot.date} className="space-y-2">
                      <p className="font-medium text-sm">
                        {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slot.times.map((time) => (
                          <Button
                            key={`${slot.date}-${time}`}
                            variant={selectedDate === slot.date && selectedTime === time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setSelectedDate(slot.date);
                              setSelectedTime(time);
                            }}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button onClick={handleNextStep} disabled={!selectedDate || !selectedTime}>
                    Continue to Payment
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {step === 'payment' && selectedSessionType && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Booking Summary</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session Type</span>
                      <span className="font-medium">{selectedSessionType.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{selectedSessionType.durationMinutes} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{selectedDate && format(new Date(selectedDate), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span>{selectedTime}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session Fee</span>
                      <span>${sessionPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Service Fee (15%)</span>
                      <span>${platformFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Payment Method</h3>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Credit Card</p>
                      <p className="text-xs text-muted-foreground">**** **** **** 4242</p>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment will be processed securely via Stripe (mock)
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
                    Back
                  </Button>
                  <Button onClick={handlePayment} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 'confirmation' && confirmedBooking && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>

                <div>
                  <p className="text-lg font-semibold mb-1">Your session is confirmed!</p>
                  <p className="text-sm text-muted-foreground">
                    A confirmation email has been sent to {confirmedBooking.candidateEmail}
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 text-left space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Confirmation Number</span>
                    <Badge variant="outline" className="font-mono">{confirmedBooking.confirmationNumber}</Badge>
                  </div>
                  
                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mentor</span>
                      <span className="font-medium">{confirmedBooking.mentor.displayName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session</span>
                      <span>{confirmedBooking.sessionType.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{format(new Date(confirmedBooking.date), 'EEEE, MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span>{confirmedBooking.timeSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{confirmedBooking.sessionType.durationMinutes} minutes</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-medium">
                    <span>Total Paid</span>
                    <span className="text-primary">${confirmedBooking.totalPaid.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleDownloadConfirmation} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download Confirmation
                  </Button>
                  <Button onClick={handleClose} className="w-full">
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
