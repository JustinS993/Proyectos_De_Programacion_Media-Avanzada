import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LevelData, PlayerProgress } from '../types';

const DEFAULT_LEVELS: LevelData[] = [
  {
    id: 'level_1',
    name: 'Principiante',
    difficulty: 'Fácil',
    createdBy: 'Sistema',
    maze: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
    ],
    challenges: [
      {
        id: 'challenge_1',
        title: 'Bucle For',
        description: '¿Cuál es la sintaxis para un bucle de 0 a 4?',
        options: [
          { text: 'for(let i=0; i<5; i++)', correct: true },
          { text: 'for(let i=1; i<5; i++)', correct: false },
          { text: 'for(i=0 to 5)', correct: false },
        ],
        position: { x: 2, y: 1 },
      },
    ],
  },
  {
    id: 'level_2',
    name: 'Refuerzo',
    difficulty: 'Medio',
    createdBy: 'Sistema',
    maze: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 1, 1, 0, 1],
      [1, 1, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
    ],
    challenges: [
      {
        id: 'challenge_2',
        title: 'Map',
        description: '¿Qué método transforma cada elemento de un array?',
        options: [
          { text: 'map()', correct: true },
          { text: 'filter()', correct: false },
          { text: 'reduce()', correct: false },
        ],
        position: { x: 4, y: 2 },
      },
    ],
  },
];

const defaultProgress: PlayerProgress = {
  completedLevelIds: [],
  bestTimes: {},
  leaderboard: [],
};

const GameContext = createContext<{
  levels: LevelData[];
  setLevels: React.Dispatch<React.SetStateAction<LevelData[]>>;
  progress: PlayerProgress;
  saveProgress: (newProgress: PlayerProgress) => void;
} | null>(null);

function loadStoredState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [levels, setLevels] = useState<LevelData[]>(() => loadStoredState('syntaxquest-levels', DEFAULT_LEVELS));
  const [progress, setProgress] = useState<PlayerProgress>(() => loadStoredState('syntaxquest-progress', defaultProgress));

  useEffect(() => {
    window.localStorage.setItem('syntaxquest-levels', JSON.stringify(levels));
  }, [levels]);

  useEffect(() => {
    window.localStorage.setItem('syntaxquest-progress', JSON.stringify(progress));
  }, [progress]);

  const saveProgress = (newProgress: PlayerProgress) => {
    setProgress(newProgress);
  };

  return (
    <GameContext.Provider value={{ levels, setLevels, progress, saveProgress }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used inside GameProvider!');
  return ctx;
};
