import useSWR from 'swr';

// ── Types matching Prisma schema ───────────────────────────────────────

export interface Reward {
  id: string;
  tenantId: string | null;
  partnerStore: string;
  title: string;
  affiliateLink: string;
  pricePoints: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Normaliser ─────────────────────────────────────────────────────────

/** Maps DB field names to the shape the UI components expect. */
function normaliseReward(r: Reward) {
  return {
    ...r,
    partner: r.partnerStore,
    pointsRequired: r.pricePoints,
  };
}

export type NormalisedReward = ReturnType<typeof normaliseReward>;

// ── Fetcher ────────────────────────────────────────────────────────────

const fetcher = (url: string): Promise<Reward[]> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`GET ${url} failed: ${r.status}`);
    return r.json();
  });

// ── Hook ───────────────────────────────────────────────────────────────

export function useRewards() {
  const { data, error, isLoading, mutate } = useSWR<Reward[]>(
    '/api/rewards',
    fetcher,
    { revalidateOnFocus: false, fallbackData: [] },
  );

  return {
    rewards: (data ?? []).map(normaliseReward),
    isLoading,
    isError: !!error,
    mutate,
  };
}
