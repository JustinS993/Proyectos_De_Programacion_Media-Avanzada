import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Play, Plus, Save, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useGameContext } from '../context/GameContext';
import type { Challenge, LevelData } from '../types';

interface Props {
  editingLevelId: string | null;
  onBack: () => void;
}

const TOOLS = ['floor', 'wall', 'start', 'exit'] as const;

export default function LevelEditor({ editingLevelId, onBack }: Props) {
  const { levels, setLevels } = useGameContext();
  const [levelName, setLevelName] = useState('');
  const [maze, setMaze] = useState<(0 | 1 | 2 | 3)[][]>([]);
  const [gridSize, setGridSize] = useState(12);
  const [selectedTool, setSelectedTool] = useState<(typeof TOOLS)[number]>('wall');
  const [editMode, setEditMode] = useState<'maze' | 'challenges'>('maze');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');

  useEffect(() => {
    if (editingLevelId) {
      const existingLevel = levels.find((level) => level.id === editingLevelId);
      if (existingLevel) {
        setLevelName(existingLevel.name);
        setMaze(existingLevel.maze);
        setGridSize(existingLevel.maze[0]?.length ?? 12);
        if (existingLevel.challenges[0]) {
          setChallengeTitle(existingLevel.challenges[0].title);
          setChallengeDescription(existingLevel.challenges[0].description);
        }
      }
    } else {
      const newGrid = createGrid(12);
      newGrid[1][1] = 2;
      newGrid[11][11] = 3;
      setMaze(newGrid);
      setGridSize(12);
      setLevelName('Nuevo Nivel');
      setChallengeTitle('');
      setChallengeDescription('');
    }
  }, [editingLevelId, levels]);

  const handleCellClick = (x: number, y: number) => {
    if (editMode !== 'maze') return;

    const nextMaze = maze.map((row) => [...row]);
    let newValue: 0 | 1 | 2 | 3;

    switch (selectedTool) {
      case 'floor':
        newValue = 0;
        break;
      case 'wall':
        newValue = 1;
        break;
      case 'start':
        newValue = 2;
        break;
      case 'exit':
        newValue = 3;
        break;
      default:
        newValue = 0;
    }

    if (newValue === 2 || newValue === 3) {
      nextMaze.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
          if (cell === newValue) nextMaze[rowIndex][cellIndex] = 0;
        });
      });
    }

    nextMaze[y][x] = newValue;
    setMaze(nextMaze);
  };

  const resetGrid = () => {
    const freshGrid = createGrid(gridSize);
    freshGrid[1][1] = 2;
    freshGrid[gridSize - 2][gridSize - 2] = 3;
    setMaze(freshGrid);
  };

  const saveLevel = () => {
    const challenge: Challenge | null = challengeTitle.trim()
      ? {
          id: `challenge_${Date.now()}`,
          title: challengeTitle.trim(),
          description: challengeDescription.trim() || 'Responde para avanzar.',
          options: [
            { text: 'Sí', correct: true },
            { text: 'No', correct: false },
          ],
          position: { x: 2, y: 2 },
        }
      : null;

    const newLevel: LevelData = {
      id: editingLevelId || `level_${Date.now()}`,
      name: levelName.trim() || 'Nivel sin título',
      maze,
      challenges: challenge ? [challenge] : [],
      createdBy: 'Tú',
      difficulty: 'Medio',
    };

    if (editingLevelId) {
      setLevels((prev) => prev.map((level) => (level.id === editingLevelId ? newLevel : level)));
    } else {
      setLevels((prev) => [...prev, newLevel]);
    }

    alert('¡Nivel guardado con éxito!');
  };

  const deleteLevel = () => {
    if (editingLevelId && window.confirm('¿Seguro que quieres borrar este nivel?')) {
      setLevels((prev) => prev.filter((level) => level.id !== editingLevelId));
      onBack();
    }
  };

  const getCellColor = (cell: number) => {
    switch (cell) {
      case 0:
        return 'bg-slate-700/50';
      case 1:
        return 'bg-slate-400';
      case 2:
        return 'bg-emerald-500';
      case 3:
        return 'bg-orange-500';
      default:
        return 'bg-slate-800';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button onClick={onBack} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <input
            value={levelName}
            onChange={(event) => setLevelName(event.target.value)}
            placeholder="Nombre del nivel"
            className="text-3xl font-bold text-slate-100 bg-transparent border-b border-slate-700 focus:outline-none focus:border-cyan-500 flex-1 text-center"
          />
          <div className="flex items-center gap-3">
            {editingLevelId && (
              <button onClick={deleteLevel} className="p-3 bg-red-800 rounded-full hover:bg-red-700 transition-colors">
                <Trash2 className="w-6 h-6" />
              </button>
            )}
            <button onClick={saveLevel} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold text-xl hover:opacity-90">
              <Save className="w-6 h-6" />
              Guardar
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setEditMode('maze')}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all',
              editMode === 'maze' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300',
            )}
          >
            <Play className="w-5 h-5" /> Mapa
          </button>
          <button
            onClick={() => setEditMode('challenges')}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all',
              editMode === 'challenges' ? 'bg-violet-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300',
            )}
          >
            <Plus className="w-5 h-5" /> Desafíos
          </button>
        </div>

        {editMode === 'maze' && (
          <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3">
              {TOOLS.map((tool) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool)}
                  className={clsx(
                    'px-4 py-3 rounded-xl text-left flex items-center justify-between transition-all',
                    selectedTool === tool ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-700 hover:bg-slate-600',
                  )}
                >
                  <span className="capitalize">{tool}</span>
                  {selectedTool === tool && <Check className="w-4 h-4" />}
                </button>
              ))}
              <div className="h-px bg-slate-700 my-2" />
              <div className="flex gap-2">
                {[8, 10, 12].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setGridSize(size);
                      setMaze(createGrid(size));
                    }}
                    className={clsx('px-3 py-2 rounded-lg text-sm', gridSize === size ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300')}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
              <button onClick={resetGrid} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300">Reiniciar mapa</button>
              <p className="text-xs text-slate-500 text-center">Haz clic para pintar tu laberinto.</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maze[0]?.length || 10}, 1fr)` }}>
                {maze.map((row, rowIndex) =>
                  row.map((cell, cellIndex) => (
                    <button
                      key={`${cellIndex}-${rowIndex}`}
                      onClick={() => handleCellClick(cellIndex, rowIndex)}
                      className={clsx('w-8 h-8 rounded-sm border border-slate-700/50 transition-all hover:opacity-80', getCellColor(cell))}
                    />
                  )),
                )}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-700/50 rounded border border-slate-700" /> Piso</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-400 rounded border border-slate-700" /> Pared</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded border border-slate-700" /> Inicio</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded border border-slate-700" /> Salida</span>
              </div>
            </div>
          </div>
        )}

        {editMode === 'challenges' && (
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 max-w-2xl mx-auto space-y-4 text-slate-200">
            <h3 className="text-2xl font-bold">Añadir un desafío</h3>
            <input
              value={challengeTitle}
              onChange={(event) => setChallengeTitle(event.target.value)}
              placeholder="Título del desafío"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            />
            <textarea
              value={challengeDescription}
              onChange={(event) => setChallengeDescription(event.target.value)}
              placeholder="Pregunta o reto para el jugador"
              className="w-full min-h-24 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
            />
            <p className="text-sm text-slate-400">Tu reto se guardará junto al nivel para que otros puedan resolverlo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function createGrid(size: number): (0 | 1 | 2 | 3)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 1 as 0 | 1 | 2 | 3));
}
