import { useState } from 'react';
import { GameProvider } from './context/GameContext';
import MainMenu from './components/MainMenu';
import LevelSelect from './components/LevelSelect';
import GameScene from './components/GameScene';
import LevelEditor from './components/LevelEditor';

type ViewMode = 'menu' | 'select' | 'game' | 'editor';
type GameMode = 'single' | 'race';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('single');

  return (
    <GameProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        {viewMode === 'menu' && (
          <MainMenu
            onStartGame={() => {
              setGameMode('single');
              setViewMode('select');
            }}
            onStartRace={() => {
              setGameMode('race');
              setViewMode('select');
            }}
            onOpenEditor={() => {
              setEditingLevelId(null);
              setViewMode('editor');
            }}
          />
        )}

        {viewMode === 'select' && (
          <LevelSelect
            onBack={() => setViewMode('menu')}
            onSelectLevel={(id) => {
              setSelectedLevelId(id);
              setViewMode('game');
            }}
          />
        )}

        {viewMode === 'game' && selectedLevelId && (
          <GameScene
            levelId={selectedLevelId}
            gameMode={gameMode}
            onBack={() => setViewMode('select')}
          />
        )}

        {viewMode === 'editor' && (
          <LevelEditor
            editingLevelId={editingLevelId}
            onBack={() => setViewMode('menu')}
          />
        )}
      </div>
    </GameProvider>
  );
}
