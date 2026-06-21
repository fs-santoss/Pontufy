import useSWR from 'swr';
import { useStore } from '@/store/useStore';

// ── Generic Fetcher ─────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── Data Fetching Hooks (SWR) ───────────────────────────────────────────────

export function useCourses() {
  const tenantId = useStore((s) => s.currentUser.tenantId);
  return useSWR(`/api/courses?tenantId=${tenantId}`, fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useRewards() {
  const tenantId = useStore((s) => s.currentUser.tenantId);
  return useSWR(`/api/rewards?tenantId=${tenantId}`, fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

// ── Mutation Functions (POST calls) ─────────────────────────────────────────

export async function triggerLessonCompletion(lessonId: string): Promise<{
  success: boolean;
  newBalance?: number;
  message?: string;
  error?: string;
}> {
  const res = await fetch('/api/lessons/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonId }),
  });
  const data = await res.json();
  if (data.success && data.newBalance !== undefined) {
    useStore.getState().setPointsBalance(data.newBalance);
  }
  return data;
}

export async function triggerRewardRedemption(rewardId: string): Promise<{
  success: boolean;
  newBalance?: number;
  affiliateUrl?: string;
  message?: string;
  error?: string;
}> {
  const res = await fetch('/api/rewards/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewardId }),
  });
  const data = await res.json();
  if (data.success && data.newBalance !== undefined) {
    useStore.getState().setPointsBalance(data.newBalance);
  }
  return data;
}
