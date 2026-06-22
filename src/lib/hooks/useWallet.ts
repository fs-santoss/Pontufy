import useSWR from 'swr';

// ── Types ──────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  role: string;
  pointsBalance: number;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  tenantId: string;
  type: 'gain' | 'loss';
  pointsAmount: number;
  description: string;
  timestamp: string;
}

// ── Fetcher ────────────────────────────────────────────────────────────

const fetcher = <T>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`GET ${url} failed: ${r.status}`);
    return r.json();
  });

// ── Hook ───────────────────────────────────────────────────────────────

export function useWallet() {
  const {
    data: user,
    error: userError,
    isLoading: userLoading,
  } = useSWR<UserProfile>('/api/users/me', fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: rawHistory,
    error: historyError,
    isLoading: historyLoading,
  } = useSWR<LedgerEntry[]>('/api/users/me/history', fetcher, {
    revalidateOnFocus: false,
    fallbackData: [],
  });

  // Normalise ledger entries to the shape PointsHistory component expects
  const history = (rawHistory ?? []).map((entry) => ({
    id: entry.id,
    type: entry.type,
    description: entry.description,
    date: entry.timestamp,
    amount: entry.pointsAmount,
  }));

  return {
    user: user ?? null,
    history,
    isLoading: userLoading || historyLoading,
    isError: !!userError || !!historyError,
  };
}
