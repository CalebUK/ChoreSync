// Domain model — single source of truth for all data shapes.

export type RepeatRule =
  | { once: true; date: string }
  | { daily: true; startDate: string }
  | { weekly: true; startDate: string; weekday: number }; // weekday: JS getDay, 0=Sun..6=Sat

export type LatePolicy = 'full' | 'half' | 'none';

export type Assignment =
  | { kid: true; kidId: string }
  | { free: true }
  | { everyone: true };

export interface Family {
  id: string;
  name: string;
  parentUids: string[];
}

export interface Kid {
  id: string;
  familyId: string;
  name: string;
  avatarColor: string;
  pin: string; // 4-digit; will be hashed server-side in Firebase phase
}

export interface Chore {
  id: string;
  familyId: string;
  title: string;
  icon?: string; // Ionicons name, e.g. 'restaurant-outline'
  description?: string;
  stars: number;
  repeatRule: RepeatRule;
  latePolicy: LatePolicy;
  assignment: Assignment;
  requiresPhoto: boolean;
  requiresApproval: boolean;
  ownerId?: string | null; // free-for-all: kidId who has claimed current occurrence
}

export interface Completion {
  id: string;
  familyId: string;
  choreId: string;
  kidId: string;
  dueDate: string;        // ISO YYYY-MM-DD — which occurrence this covers
  submittedAt: string;    // ISO timestamp
  status: 'submitted' | 'approved' | 'rejected';
  photoUri?: string;
  starsAwarded?: number;
}

export interface Reward {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  starCost: number;
  isActive: boolean;
}

export interface Redemption {
  id: string;
  familyId: string;
  rewardId: string;
  kidId: string;
  requestedAt: string;
  status: 'requested' | 'approved' | 'given' | 'declined';
  starsDeducted: number; // stars were taken at request time; refunded on decline
}

export type LedgerEntryType = 'chore_earn' | 'reward_spend' | 'bonus' | 'refund';

export interface LedgerEntry {
  id: string;
  familyId: string;
  kidId: string;
  delta: number;          // positive = earn, negative = spend
  type: LedgerEntryType;
  referenceId?: string;   // completionId, redemptionId, etc.
  createdAt: string;
  note?: string;
}
