import { useStore } from './useStore';

/**
 * Focused Zustand selector for user point balance.
 * Provides the semantic API surface requested by Phase 1 Target 2:
 *   - currentPoints: readonly balance
 *   - setPoints(val): absolute setter
 *   - addPoints(val): optimistic increment
 */
export function useUserStore() {
  const currentPoints = useStore((s) => s.currentPointsBalance);
  const setPoints = useStore((s) => s.setPointsBalance);
  const addPoints = useStore((s) => s.addPoints);
  return { currentPoints, setPoints, addPoints } as const;
}
