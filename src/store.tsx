import React, { createContext, useContext, useReducer } from 'react';
import type {
  Family, Kid, Chore, Completion, Reward, Redemption, LedgerEntry,
  RepeatRule, LatePolicy, Assignment,
} from './types';

// ── Utilities ─────────────────────────────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function getOccurrenceDate(rule: RepeatRule, today: string): string {
  if ('once' in rule) return rule.date;
  if ('daily' in rule) return today;
  const { weekday, startDate } = rule;
  const daysBack = (dayOfWeek(today) - weekday + 7) % 7;
  const occurrence = addDays(today, -daysBack);
  // If the most recent occurrence is before the start date, use the next one
  if (occurrence < startDate) return addDays(occurrence, 7);
  return occurrence;
}

export type Urgency = 'overdue' | 'soon' | 'later';

export function getUrgency(occurrenceDate: string, today: string): Urgency {
  if (occurrenceDate < today) return 'overdue';
  if (occurrenceDate <= addDays(today, 1)) return 'soon';
  return 'later';
}

export const URGENCY_COLORS: Record<Urgency, string> = {
  overdue: '#FF453A',
  soon: '#FF9F0A',
  later: '#30D158',
};

export const COLORS = {
  bg: '#121212',
  card: '#1E1E1E',
  cardElevated: '#252525',
  border: '#2C2C2E',
  borderLight: '#3A3A3C',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  primary: '#0A84FF',
  primaryDim: 'rgba(10,132,255,0.18)',
  star: '#FFD60A',
  starDim: 'rgba(255,214,10,0.15)',
  success: '#30D158',
  successDim: 'rgba(48,209,88,0.18)',
  danger: '#FF453A',
  dangerDim: 'rgba(255,69,58,0.18)',
  // keep alias so existing refs compile
  surface: '#1E1E1E',
};

function calculateStars(stars: number, latePolicy: LatePolicy, dueDate: string, submittedAt: string): number {
  const submittedDate = submittedAt.split('T')[0];
  if (submittedDate <= dueDate) return stars;
  if (latePolicy === 'full') return stars;
  if (latePolicy === 'half') return Math.floor(stars / 2);
  return 0;
}

// ── State & Actions ───────────────────────────────────────────────────────────

const FAMILY_ID = 'family-1';

interface AppState {
  family: Family;
  kids: Kid[];
  chores: Chore[];
  completions: Completion[];
  rewards: Reward[];
  redemptions: Redemption[];
  ledger: LedgerEntry[];
  role: 'parent' | 'kid' | null;
  currentKidId: string | null;
}

type AppAction =
  | { type: 'SET_ROLE'; role: 'parent' | 'kid' | null }
  | { type: 'SET_CURRENT_KID'; kidId: string | null }
  | { type: 'ADD_KID'; kid: Kid }
  | { type: 'UPDATE_KID'; id: string; updates: Partial<Kid> }
  | { type: 'REMOVE_KID'; id: string }
  | { type: 'ADD_CHORE'; chore: Chore }
  | { type: 'UPDATE_CHORE'; id: string; updates: Partial<Chore> }
  | { type: 'DELETE_CHORE'; id: string }
  | { type: 'ADD_COMPLETION'; completion: Completion }
  | { type: 'UPDATE_COMPLETION'; id: string; updates: Partial<Completion> }
  | { type: 'ADD_REWARD'; reward: Reward }
  | { type: 'UPDATE_REWARD'; id: string; updates: Partial<Reward> }
  | { type: 'DELETE_REWARD'; id: string }
  | { type: 'ADD_REDEMPTION'; redemption: Redemption }
  | { type: 'UPDATE_REDEMPTION'; id: string; updates: Partial<Redemption> }
  | { type: 'ADD_LEDGER_ENTRY'; entry: LedgerEntry };

const initialState: AppState = {
  family: { id: FAMILY_ID, name: 'The Hills Family', parentUids: [] },
  kids: [
    { id: 'kid-emma', familyId: FAMILY_ID, name: 'Emma', avatarColor: '#EC4899', pin: '1234' },
    { id: 'kid-liam', familyId: FAMILY_ID, name: 'Liam', avatarColor: '#3B82F6', pin: '5678' },
  ],
  chores: [
    {
      id: 'chore-dishes',
      familyId: FAMILY_ID,
      title: 'Wash dishes',
      icon: 'restaurant-outline',
      stars: 5,
      repeatRule: { daily: true, startDate: '2026-06-01' },
      latePolicy: 'half',
      assignment: { kid: true, kidId: 'kid-emma' },
      requiresPhoto: false,
      requiresApproval: true,
    },
    {
      id: 'chore-trash',
      familyId: FAMILY_ID,
      title: 'Take out trash',
      icon: 'trash-outline',
      stars: 4,
      repeatRule: { weekly: true, startDate: '2026-06-01', weekday: 5 }, // Friday
      latePolicy: 'full',
      assignment: { kid: true, kidId: 'kid-emma' },
      requiresPhoto: false,
      requiresApproval: false,
    },
    {
      id: 'chore-bedroom',
      familyId: FAMILY_ID,
      title: 'Tidy bedroom',
      icon: 'bed-outline',
      stars: 3,
      repeatRule: { weekly: true, startDate: '2026-06-01', weekday: 1 }, // Monday
      latePolicy: 'full',
      assignment: { kid: true, kidId: 'kid-liam' },
      requiresPhoto: false,
      requiresApproval: false,
    },
    {
      id: 'chore-bathroom',
      familyId: FAMILY_ID,
      title: 'Clean bathroom',
      icon: 'water-outline',
      stars: 6,
      repeatRule: { once: true, date: '2026-06-10' },
      latePolicy: 'half',
      assignment: { kid: true, kidId: 'kid-liam' },
      requiresPhoto: true,
      requiresApproval: true,
    },
  ],
  completions: [],
  rewards: [
    { id: 'reward-movie', familyId: FAMILY_ID, title: 'Movie night', description: 'A movie of your choice', starCost: 30, isActive: true },
    { id: 'reward-screen', familyId: FAMILY_ID, title: 'Extra screen time', description: '30 extra minutes', starCost: 15, isActive: true },
    { id: 'reward-dinner', familyId: FAMILY_ID, title: 'Choose dinner', description: 'Pick what\'s for dinner', starCost: 20, isActive: true },
  ],
  redemptions: [],
  ledger: [],
  role: null,
  currentKidId: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE': return { ...state, role: action.role };
    case 'SET_CURRENT_KID': return { ...state, currentKidId: action.kidId };
    case 'ADD_KID': return { ...state, kids: [...state.kids, action.kid] };
    case 'UPDATE_KID':
      return { ...state, kids: state.kids.map(k => k.id === action.id ? { ...k, ...action.updates } : k) };
    case 'REMOVE_KID': return { ...state, kids: state.kids.filter(k => k.id !== action.id) };
    case 'ADD_CHORE': return { ...state, chores: [...state.chores, action.chore] };
    case 'UPDATE_CHORE':
      return { ...state, chores: state.chores.map(c => c.id === action.id ? { ...c, ...action.updates } : c) };
    case 'DELETE_CHORE': return { ...state, chores: state.chores.filter(c => c.id !== action.id) };
    case 'ADD_COMPLETION': return { ...state, completions: [...state.completions, action.completion] };
    case 'UPDATE_COMPLETION':
      return { ...state, completions: state.completions.map(c => c.id === action.id ? { ...c, ...action.updates } : c) };
    case 'ADD_REWARD': return { ...state, rewards: [...state.rewards, action.reward] };
    case 'UPDATE_REWARD':
      return { ...state, rewards: state.rewards.map(r => r.id === action.id ? { ...r, ...action.updates } : r) };
    case 'DELETE_REWARD': return { ...state, rewards: state.rewards.filter(r => r.id !== action.id) };
    case 'ADD_REDEMPTION': return { ...state, redemptions: [...state.redemptions, action.redemption] };
    case 'UPDATE_REDEMPTION':
      return { ...state, redemptions: state.redemptions.map(r => r.id === action.id ? { ...r, ...action.updates } : r) };
    case 'ADD_LEDGER_ENTRY': return { ...state, ledger: [...state.ledger, action.entry] };
    default: return state;
  }
}

// ── Context & Actions ─────────────────────────────────────────────────────────

export interface StoreValue {
  state: AppState;
  // Navigation state
  setRole: (role: 'parent' | 'kid' | null) => void;
  setCurrentKid: (kidId: string | null) => void;
  // Kids
  addKid: (name: string, pin: string, color: string) => void;
  updateKid: (id: string, updates: Partial<Pick<Kid, 'name' | 'pin' | 'avatarColor'>>) => void;
  removeKid: (id: string) => void;
  // Chores
  addChore: (data: Omit<Chore, 'id' | 'familyId'>) => void;
  updateChore: (id: string, updates: Partial<Omit<Chore, 'id' | 'familyId'>>) => void;
  deleteChore: (id: string) => void;
  // Completions
  submitCompletion: (choreId: string, kidId: string, dueDate: string, photoUri?: string) => void;
  approveCompletion: (completionId: string) => void;
  rejectCompletion: (completionId: string) => void;
  // Rewards
  addReward: (data: Omit<Reward, 'id' | 'familyId'>) => void;
  updateReward: (id: string, updates: Partial<Omit<Reward, 'id' | 'familyId'>>) => void;
  deleteReward: (id: string) => void;
  // Redemptions
  requestRedemption: (rewardId: string, kidId: string) => void;
  approveRedemption: (redemptionId: string) => void;
  declineRedemption: (redemptionId: string) => void;
  markRewardGiven: (redemptionId: string) => void;
  // Bonuses
  addBonus: (kidId: string, stars: number, note?: string) => void;
  // Computed (INVARIANT: never cached — always derived from ledger)
  getBalance: (kidId: string) => number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  function getBalance(kidId: string): number {
    return state.ledger.filter(e => e.kidId === kidId).reduce((sum, e) => sum + e.delta, 0);
  }

  function setRole(role: 'parent' | 'kid' | null) {
    dispatch({ type: 'SET_ROLE', role });
  }

  function setCurrentKid(kidId: string | null) {
    dispatch({ type: 'SET_CURRENT_KID', kidId });
  }

  function addKid(name: string, pin: string, color: string) {
    dispatch({ type: 'ADD_KID', kid: { id: uuid(), familyId: FAMILY_ID, name, pin, avatarColor: color } });
  }

  function updateKid(id: string, updates: Partial<Pick<Kid, 'name' | 'pin' | 'avatarColor'>>) {
    dispatch({ type: 'UPDATE_KID', id, updates });
  }

  function removeKid(id: string) {
    dispatch({ type: 'REMOVE_KID', id });
  }

  function addChore(data: Omit<Chore, 'id' | 'familyId'>) {
    dispatch({ type: 'ADD_CHORE', chore: { id: uuid(), familyId: FAMILY_ID, ...data } });
  }

  function updateChore(id: string, updates: Partial<Omit<Chore, 'id' | 'familyId'>>) {
    dispatch({ type: 'UPDATE_CHORE', id, updates });
  }

  function deleteChore(id: string) {
    dispatch({ type: 'DELETE_CHORE', id });
  }

  function submitCompletion(choreId: string, kidId: string, dueDate: string, photoUri?: string) {
    const chore = state.chores.find(c => c.id === choreId);
    if (!chore) return;
    const id = uuid();
    const submittedAt = new Date().toISOString();
    const stars = chore.requiresApproval
      ? undefined
      : calculateStars(chore.stars, chore.latePolicy, dueDate, submittedAt);
    dispatch({
      type: 'ADD_COMPLETION',
      completion: {
        id, familyId: FAMILY_ID, choreId, kidId, dueDate, submittedAt,
        status: chore.requiresApproval ? 'submitted' : 'approved',
        photoUri,
        starsAwarded: stars,
      },
    });
    if (!chore.requiresApproval && stars !== undefined) {
      dispatch({
        type: 'ADD_LEDGER_ENTRY',
        entry: { id: uuid(), familyId: FAMILY_ID, kidId, delta: stars, type: 'chore_earn', referenceId: id, createdAt: submittedAt },
      });
    }
  }

  function approveCompletion(completionId: string) {
    const completion = state.completions.find(c => c.id === completionId);
    if (!completion) return;
    const chore = state.chores.find(c => c.id === completion.choreId);
    if (!chore) return;
    const stars = calculateStars(chore.stars, chore.latePolicy, completion.dueDate, completion.submittedAt);
    const now = new Date().toISOString();
    dispatch({ type: 'UPDATE_COMPLETION', id: completionId, updates: { status: 'approved', starsAwarded: stars } });
    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      entry: { id: uuid(), familyId: FAMILY_ID, kidId: completion.kidId, delta: stars, type: 'chore_earn', referenceId: completionId, createdAt: now },
    });
  }

  function rejectCompletion(completionId: string) {
    dispatch({ type: 'UPDATE_COMPLETION', id: completionId, updates: { status: 'rejected' } });
  }

  function addReward(data: Omit<Reward, 'id' | 'familyId'>) {
    dispatch({ type: 'ADD_REWARD', reward: { id: uuid(), familyId: FAMILY_ID, ...data } });
  }

  function updateReward(id: string, updates: Partial<Omit<Reward, 'id' | 'familyId'>>) {
    dispatch({ type: 'UPDATE_REWARD', id, updates });
  }

  function deleteReward(id: string) {
    dispatch({ type: 'DELETE_REWARD', id });
  }

  function requestRedemption(rewardId: string, kidId: string) {
    const reward = state.rewards.find(r => r.id === rewardId);
    if (!reward) return;
    if (getBalance(kidId) < reward.starCost) return;
    const id = uuid();
    const now = new Date().toISOString();
    dispatch({
      type: 'ADD_REDEMPTION',
      redemption: { id, familyId: FAMILY_ID, rewardId, kidId, requestedAt: now, status: 'requested', starsDeducted: reward.starCost },
    });
    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      entry: { id: uuid(), familyId: FAMILY_ID, kidId, delta: -reward.starCost, type: 'reward_spend', referenceId: id, createdAt: now },
    });
  }

  function approveRedemption(redemptionId: string) {
    dispatch({ type: 'UPDATE_REDEMPTION', id: redemptionId, updates: { status: 'approved' } });
  }

  function declineRedemption(redemptionId: string) {
    const redemption = state.redemptions.find(r => r.id === redemptionId);
    if (!redemption) return;
    const now = new Date().toISOString();
    dispatch({ type: 'UPDATE_REDEMPTION', id: redemptionId, updates: { status: 'declined' } });
    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      entry: { id: uuid(), familyId: FAMILY_ID, kidId: redemption.kidId, delta: redemption.starsDeducted, type: 'refund', referenceId: redemptionId, createdAt: now },
    });
  }

  function markRewardGiven(redemptionId: string) {
    dispatch({ type: 'UPDATE_REDEMPTION', id: redemptionId, updates: { status: 'given' } });
  }

  function addBonus(kidId: string, stars: number, note?: string) {
    dispatch({
      type: 'ADD_LEDGER_ENTRY',
      entry: { id: uuid(), familyId: FAMILY_ID, kidId, delta: stars, type: 'bonus', createdAt: new Date().toISOString(), note },
    });
  }

  const value: StoreValue = {
    state,
    setRole, setCurrentKid,
    addKid, updateKid, removeKid,
    addChore, updateChore, deleteChore,
    submitCompletion, approveCompletion, rejectCompletion,
    addReward, updateReward, deleteReward,
    requestRedemption, approveRedemption, declineRedemption, markRewardGiven,
    addBonus,
    getBalance,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
