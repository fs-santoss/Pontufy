import { create } from 'zustand';

interface UserSession {
  userId: string;
  tenantId: string;
  role: 'admin_rh' | 'employee';
  name: string;
  company: string;
}

interface PontufyState {
  currentUser: UserSession;
  currentPointsBalance: number;
  searchQuery: string;

  setPointsBalance: (balance: number) => void;
  addPoints: (amount: number) => void;
  deductPoints: (amount: number) => void;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<PontufyState>((set) => ({
  currentUser: {
    userId: 'mock-user-id',
    tenantId: 'tenant-uuid-1234',
    role: 'employee',
    name: 'Alex',
    company: 'TechCorp',
  },

  currentPointsBalance: 1250,
  searchQuery: '',

  setPointsBalance: (balance) => set({ currentPointsBalance: balance }),
  addPoints: (amount) => set((s) => ({ currentPointsBalance: s.currentPointsBalance + amount })),
  deductPoints: (amount) => set((s) => ({ currentPointsBalance: Math.max(0, s.currentPointsBalance - amount) })),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
