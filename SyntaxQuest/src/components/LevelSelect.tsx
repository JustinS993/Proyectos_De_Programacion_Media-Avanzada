import { ArrowLeft } from 'lucide-react';
import { useGameContext } from '../context/GameContext';

interface Props {
  onBack: () => void;
  onSelectLevel: (levelId: string) => void;
}

export default function LevelSelect({ onBack, onSelectLevel }: Props) {
  const { levels, progress } = useGameContext();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
            Selecciona un nivel
          </h2>
          <div className="w-12"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {levels.map((level) => {
            const bestTime = progress.bestTimes[level.id];
            const completed = progress.completedLevelIds.includes(level.id);

            return (
              <button
                key={level.id}
                onClick={() => onSelectLevel(level.id)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  completed
                    ? 'bg-emerald-900/30 border-emerald-500/60 hover:bg-emerald-900/50'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-slate-100">{level.name}</h3>
                  <span className="text-xs rounded-full bg-slate-700 px-2 py-1 text-slate-300">{level.difficulty ?? 'Fácil'}</span>
                </div>
                <p className="text-slate-400 text-sm">
                  {completed ? <span className="text-emerald-400">✅ Completado</span> : '¡Pendiente!'}
                </p>
                {bestTime ? <p className="text-slate-400 text-sm mt-1">🏁 Mejor: {(bestTime / 1000).toFixed(1)}s</p> : null}
                {level.challenges.length > 0 && (
                  <p className="text-slate-500 text-xs mt-2">{level.challenges.length} desafío(s)</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
