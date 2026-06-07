import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Code2, Settings2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
type BarStatus = 'default' | 'comparing' | 'swapping' | 'sorted';

interface Bar {
  value: number;
  status: BarStatus;
  id: number;
}

const INITIAL_COUNT = 20;
const MIN_VALUE = 10;
const MAX_VALUE = 100;

export default function App() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [algorithm, setAlgorithm] = useState<'bubble' | 'selection' | 'insertion'>('bubble');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize bars
  const resetArray = () => {
    if (isSorting) {
      abortControllerRef.current?.abort();
      setIsSorting(false);
    }
    const newBars = Array.from({ length: INITIAL_COUNT }, (_, i) => ({
      value: Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1) + MIN_VALUE),
      status: 'default' as BarStatus,
      id: Math.random()
    }));
    setBars(newBars);
  };

  useEffect(() => {
    resetArray();
  }, []);

  // Sleep utility for animation delay
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Sorting Algorithms
  const bubbleSort = async (array: Bar[], signal: AbortSignal) => {
    const n = array.length;
    const currentArray = [...array];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (signal.aborted) return;

        // Highlight comparing
        currentArray[j].status = 'comparing';
        currentArray[j + 1].status = 'comparing';
        setBars([...currentArray]);
        await sleep(101 - speed);

        if (currentArray[j].value > currentArray[j + 1].value) {
          currentArray[j].status = 'swapping';
          currentArray[j + 1].status = 'swapping';
          setBars([...currentArray]);
          await sleep(101 - speed);

          // Swap
          const temp = currentArray[j];
          currentArray[j] = currentArray[j + 1];
          currentArray[j + 1] = temp;
        }

        currentArray[j].status = 'default';
        currentArray[j + 1].status = 'default';
      }
      currentArray[n - i - 1].status = 'sorted';
      setBars([...currentArray]);
    }
    setIsSorting(false);
  };

  const selectionSort = async (array: Bar[], signal: AbortSignal) => {
    const n = array.length;
    const currentArray = [...array];

    for (let i = 0; i < n; i++) {
      let minIdx = i;
      currentArray[i].status = 'comparing';

      for (let j = i + 1; j < n; j++) {
        if (signal.aborted) return;
        currentArray[j].status = 'comparing';
        setBars([...currentArray]);
        await sleep(101 - speed);

        if (currentArray[j].value < currentArray[minIdx].value) {
          if (minIdx !== i) currentArray[minIdx].status = 'default';
          minIdx = j;
          currentArray[minIdx].status = 'swapping';
        } else {
          currentArray[j].status = 'default';
        }
      }

      if (minIdx !== i) {
        const temp = currentArray[i];
        currentArray[i] = currentArray[minIdx];
        currentArray[minIdx] = temp;
      }
      
      currentArray[i].status = 'sorted';
      if (minIdx !== i) currentArray[minIdx].status = 'default';
      setBars([...currentArray]);
    }
    setIsSorting(false);
  };

  const handleSort = () => {
    if (isSorting) {
      abortControllerRef.current?.abort();
      setIsSorting(false);
      return;
    }

    setIsSorting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const freshBars = bars.map(b => ({ ...b, status: 'default' as BarStatus }));
    
    if (algorithm === 'bubble') bubbleSort(freshBars, controller.signal);
    if (algorithm === 'selection') selectionSort(freshBars, controller.signal);
    // Insertion sort can be added similarly
  };

  return (
    <div className="min-h-screen w-full p-8 flex flex-col items-center gap-8">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Sorting Visualizer
        </h1>
        <p className="text-slate-400">Mira la magia de los algoritmos en tiempo real</p>
      </header>

      {/* Controls */}
      <div className="w-full max-w-4xl bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-blue-400" />
          <select 
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as any)}
            disabled={isSorting}
          >
            <option value="bubble">Bubble Sort</option>
            <option value="selection">Selection Sort</option>
            <option value="insertion">Insertion Sort</option>
          </select>
        </div>

        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <Zap className="w-5 h-5 text-yellow-400" />
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="text-sm font-mono text-slate-400 w-8">{speed}%</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSort}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all",
              isSorting 
                ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"
            )}
          >
            {isSorting ? <><Pause className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start</>}
          </button>
          <button
            onClick={resetArray}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="Reset Array"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 w-full max-w-5xl bg-slate-900/50 rounded-2xl border border-slate-800 p-8 flex items-end justify-center gap-1 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {bars.map((bar) => (
            <motion.div
              key={bar.id}
              layout
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ 
                opacity: 1, 
                scaleY: 1,
                height: `${bar.value}%`,
              }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "flex-1 rounded-t-sm transition-colors duration-200 min-w-[4px]",
                bar.status === 'default' && "bg-blue-500/60",
                bar.status === 'comparing' && "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]",
                bar.status === 'swapping' && "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]",
                bar.status === 'sorted' && "bg-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
              )}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / Level Info */}
      <footer className="flex items-center gap-4 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500/60" /> <span>Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" /> <span>Comparando</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" /> <span>Intercambiando</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" /> <span>Ordenado</span>
        </div>
      </footer>
    </div>
  );
}
