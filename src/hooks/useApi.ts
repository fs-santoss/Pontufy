import useSWR from 'swr';
import { useStore } from '@/store/useStore';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCourses() {
  return useSWR('/api/courses', fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export function useRewards() {
  return useSWR('/api/rewards', fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });
}

export async function triggerLessonCompletion(lessonId: string): Promise<{
  success: boolean;
  newBalance?: number;
  alreadyCompleted?: boolean;
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
