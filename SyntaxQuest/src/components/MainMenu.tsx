import { Crown, Gamepad2, PencilRuler, Trophy } from 'lucide-react';

interface Props {
  onStartGame: () => void;
  onStartRace: () => void;
  onOpenEditor: () => void;
}

export default function MainMenu({ onStartGame, onStartRace, onOpenEditor }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg mb-4">
          SyntaxQuest
        </h1>
        <p className="text-xl text-slate-300">
          Laberinto de sintaxis con progreso persistente, carrera contra otro jugador y niveles creados por la comunidad.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <button
          onClick={onStartGame}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold text-2xl hover:opacity-90 transition-all shadow-lg shadow-emerald-900/50"
        >
          <Gamepad2 className="w-8 h-8" />
          Jugar solo
        </button>
        <button
          onClick={onStartRace}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-2xl hover:opacity-90 transition-all shadow-lg shadow-orange-900/50"
        >
          <Crown className="w-8 h-8" />
          Carrera 1v1
        </button>
        <button
          onClick={onOpenEditor}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl font-bold text-2xl hover:opacity-90 transition-all shadow-lg shadow-violet-900/50"
        >
          <PencilRuler className="w-8 h-8" />
          Editor de niveles
        </button>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-slate-300">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <span>Guarda tu progreso en el navegador y compite por los mejores tiempos.</span>
      </div>
    </div>
  );
}
