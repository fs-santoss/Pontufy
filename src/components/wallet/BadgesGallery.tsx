import { ShieldCheck, Sparkles, Target, Cloud, Trophy, LucideIcon } from 'lucide-react';

// Mapeamento simples de ícones → componentes
const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Sparkles,
  Target,
  Cloud,
  Trophy,
};

/**
 * BadgesGallery – mural de competências.
 *
 * Exige:
 *  - Grid responsivo com gap fixo (16px).
 *  - Cards quadrados (aspect‑ratio 1:1) com padding interno constante.
 *  - Estado "locked" usa cor #E9ECEF (cinza neutro) e opacidade reduzida.
 *  - Estado "unlocked" usa o gradiente da marca (bg-gradient-pontufy).
 *  - Tipografia em Cinza Ardósia (text‑brand‑slate).
 */
interface Badge {
  id: string;
  title: string;
  icon: string;
  unlocked?: boolean;
}

export default function BadgesGallery({ badges }: { badges: Badge[] }) {
  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="text-brand-slate" size={24} />
        <h2 className="text-xl font-bold text-brand-slate">Mural de Competências</h2>
      </div>

      {/* Grid responsivo – usa auto‑fit para adaptar ao viewport */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}
      >
        {badges.map((badge) => {
          const Icon = iconMap[badge.icon] || Trophy;
          const isUnlocked = Boolean(badge.unlocked);

          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-4 rounded-xl border transition-colors ${
                isUnlocked
                  ? 'bg-white border-emerald-100 shadow-sm hover:shadow-md'
                  : 'bg-[#E9ECEF] border-gray-200 text-gray-400 opacity-80'
              }`}
            >
              {/* Ícone – caixa quadrada fixa 48×48 */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-lg mb-3 transition-colors ${
                  isUnlocked ? 'bg-gradient-pontufy text-emerald-900' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Icon size={28} />
              </div>

              {/* Rótulo */}
              <div className={`font-medium text-sm text-center ${isUnlocked ? 'text-brand-slate' : 'text-gray-500'}`}>
                {badge.title}
              </div>

              {/* Badge de status */}
              {isUnlocked && (
                <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Desbloqueado
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
