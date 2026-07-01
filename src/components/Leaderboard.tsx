import { auth } from '@/auth';
import { getTenantDb } from '@/backend/db';
import { unstable_cache } from 'next/cache';
import { Trophy } from 'lucide-react';

// Args are part of the cache key, so each tenant gets its own cached entry —
// a 60s-stale Top 5 is an acceptable trade for skipping a sort-heavy query
// (ORDER BY pointsBalance DESC) on every dashboard render.
const getTopUsers = unstable_cache(
  async (tenantId: string) => {
    const db = getTenantDb(tenantId);
    return db.user.findMany({
      orderBy: { pointsBalance: 'desc' },
      take: 5,
      select: { id: true, name: true, pointsBalance: true },
    });
  },
  ['leaderboard-top5'],
  { revalidate: 60 },
);

export default async function Leaderboard() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-gray-500">Não autenticado.</p>
      </div>
    );
  }

  const tenantId = session.user.tenantId;

  let users: { id: string; name: string; pointsBalance: number }[] = [];
  try {
    users = await getTopUsers(tenantId);
  } catch (err) {
    console.error('[Leaderboard] Query error:', err);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
        <Trophy className="text-amber-500" size={20} />
        <h2 className="text-lg font-bold text-brand-slate">Top 5 Pontuadores</h2>
      </div>

      {users.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">
          Nenhum usuário com pontos ainda.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {users.map((user, idx) => (
            <div key={user.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-sm">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-slate truncate">{user.name}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-base font-bold text-emerald-600">{user.pointsBalance}</p>
                <p className="text-xs text-gray-400">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
