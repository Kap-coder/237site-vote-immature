import { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  hasVoted: boolean;
  role: UserRole;
  totalVotesPurchased?: number; // Total paid votes
}

export interface Candidate {
  id: string;
  name: string;
  description: string;
  fullDescription?: string; // Detailed description for candidate page
  image: string;
  voteCount: number;
  age?: number;
  category?: string;
}

export interface Vote {
  id?: string;
  userId: string;
  candidateId: string;
  timestamp: Timestamp;
  voteType: 'free' | 'paid'; // free = 1 vote, paid = multiple votes
  quantity: number; // Number of votes (1 for free, N for paid)
  paymentMethod?: string;
  amountPaid?: number; // Amount paid in XAF
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface SiteConfig {
  votePrice: number; // Price per vote in XAF
  eventName: string;
  eventDescription: string;
}