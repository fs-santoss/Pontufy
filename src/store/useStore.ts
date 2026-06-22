import { create } from 'zustand';

interface UserSession {
  userId: string;
  tenantId: string;
  role: 'admin_rh' | 'employee';
  name: string;
}

interface PontufyState {
  currentUser: UserSession | null;
  currentPointsBalance: number;
  searchQuery: string;

  setUser: (user: UserSession) => void;
  clearUser: () => void;
  setPointsBalance: (balance: number) => void;
  addPoints: (amount: number) => void;
  deductPoints: (amount: number) => void;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<PontufyState>((set) => ({
  currentUser: null,
  currentPointsBalance: 0,
  searchQuery: '',

  setUser: (user) => set({ currentUser: user }),
  clearUser: () => set({ currentUser: null, currentPointsBalance: 0, searchQuery: '' }),
  setPointsBalance: (balance) => set({ currentPointsBalance: balance }),
  addPoints: (amount) => set((s) => ({ currentPointsBalance: s.currentPointsBalance + amount })),
  deductPoints: (amount) => set((s) => ({ currentPointsBalance: Math.max(0, s.currentPointsBalance - amount) })),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
