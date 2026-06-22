'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface EngagementData {
  date: string;
  completions: number;
  points: number;
}

interface SummaryData {
  totalUsers: number;
  totalCompletions: number;
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
}

export default function AnalyticsDashboard() {
  const [engagement, setEngagement] = useState<EngagementData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((data) => {
        setEngagement(data.engagement || []);
        setSummary(data.summary || null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Colaboradores" value={summary.totalUsers} />
          <StatCard label="Aulas Concluídas" value={summary.totalCompletions} />
          <StatCard label="Pontos Distribuídos" value={summary.totalPointsAwarded} />
          <StatCard label="Pontos Resgatados" value={summary.totalPointsRedeemed} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-brand-slate mb-4">Aulas Concluídas por Dia</h3>
        {engagement.length === 0 ? (
          <p className="text-brand-text text-sm">Sem dados de engajamento ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completions" fill="#10b981" radius={[4, 4, 0, 0]} name="Conclusões" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-brand-slate mb-4">Pontos Distribuídos por Dia</h3>
        {engagement.length === 0 ? (
          <p className="text-brand-text text-sm">Sem dados de pontos ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="points" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Pontos" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-sm text-brand-text">{label}</p>
      <p className="text-2xl font-black text-brand-slate">{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}
