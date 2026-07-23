export interface LevelData {
  id: string;
  name: string;
  maze: (0 | 1 | 2 | 3)[][];
  challenges: Challenge[];
  createdBy?: string;
  difficulty?: 'Fácil' | 'Medio' | 'Difícil';
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  options: { text: string; correct: boolean }[];
  position: { x: number; y: number };
}

export interface PlayerProgress {
  completedLevelIds: string[];
  bestTimes: Record<string, number>;
  leaderboard: Array<{
    id: string;
    levelId: string;
    playerName: string;
    time: number;
    mode: 'single' | 'race';
    completedAt: string;
  }>;
}
