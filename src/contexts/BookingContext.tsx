import { createContext, useContext, useState, ReactNode } from 'react';
import { type MentorApplication, type SessionType } from '@/data/mentorMockData';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface BookedSession {
  id: string;
  confirmationNumber: string;
  mentor: MentorApplication;
  sessionType: SessionType;
  date: string;
  timeSlot: string;
  questions: string[];
  sessionFee: number;
  platformFee: number;
  totalPaid: number;
  status: BookingStatus;
  bookedAt: string;
  candidateName: string;
  candidateEmail: string;
}

interface BookingContextType {
  bookedSessions: BookedSession[];
  addBooking: (booking: Omit<BookedSession, 'id' | 'confirmationNumber' | 'bookedAt'>) => BookedSession;
  cancelBooking: (id: string) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([]);

  const generateConfirmationNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SCR-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const addBooking = (booking: Omit<BookedSession, 'id' | 'confirmationNumber' | 'bookedAt'>): BookedSession => {
    const newBooking: BookedSession = {
      ...booking,
      id: crypto.randomUUID(),
      confirmationNumber: generateConfirmationNumber(),
      bookedAt: new Date().toISOString(),
    };
    setBookedSessions(prev => [...prev, newBooking]);
    return newBooking;
  };

  const cancelBooking = (id: string) => {
    setBookedSessions(prev => 
      prev.map(session => 
        session.id === id ? { ...session, status: 'cancelled' as const } : session
      )
    );
  };

  return (
    <BookingContext.Provider value={{ bookedSessions, addBooking, cancelBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
