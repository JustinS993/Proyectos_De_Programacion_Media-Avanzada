import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Settings2, Split, Download, History, BarChart3 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import gifshot from 'gifshot';
import html2canvas from 'html2canvas';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BarStatus = 'default' | 'comparing' | 'swapping' | 'sorted';

interface Bar {
  value: number;
  status: BarStatus;
  id: number;
}

interface SortHistoryItem {
  id: string;
  algorithm: string;
  arraySize: number;
  timeMs: number;
  steps: number;
  timestamp: Date;
}

const INITIAL_COUNT = 30;
const MIN_VALUE = 10;
const MAX_VALUE = 100;

const ALGORITHMS = [
  'bubble', 'selection', 'insertion', 'quick', 'merge', 'heap', 'radix'
] as const;

export default function App() {
  const [bars1, setBars1] = useState<Bar[]>([]);
  const [bars2, setBars2] = useState<Bar[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [algorithm1, setAlgorithm1] = useState<(typeof ALGORITHMS)[number]>('bubble');
  const [algorithm2, setAlgorithm2] = useState<(typeof ALGORITHMS)[number]>('quick');
  const [showComparison, setShowComparison] = useState(false);
  const [history, setHistory] = useState<SortHistoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrames, setRecordingFrames] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const visualizerRef1 = useRef<HTMLDivElement>(null);
  const visualizerRef2 = useRef<HTMLDivElement>(null);

  const generateArray = (size = INITIAL_COUNT): Bar[] => {
    return Array.from({ length: size }, (_, i) => ({
      value: Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1) + MIN_VALUE),
      status: 'default' as BarStatus,
      id: Math.random()
    }));
  };

  const resetArrays = () => {
    if (isSorting) {
      abortControllerRef.current?.abort();
      setIsSorting(false);
    }
    const newArr = generateArray();
    setBars1(newArr);
    if (showComparison) {
      setBars2([...newArr]);
    }
  };

  useEffect(() => {
    resetArrays();
    const savedHistory = localStorage.getItem('sortHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory).map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
    }
  }, [showComparison]);

  const saveHistory = (item: SortHistoryItem) => {
    const newHistory = [item, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('sortHistory', JSON.stringify(newHistory));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const recordFrame = async () => {
    if (!isRecording) return;
    try {
      const canvas = await html2canvas(document.body, { backgroundColor: '#0f172a' });
      setRecordingFrames(prev => [...prev, canvas.toDataURL('image/png')]);
    } catch (error) {
      console.error('Frame capture failed:', error);
    }
  };

  const exportGIF = async () => {
    if (recordingFrames.length === 0) return alert('No frames to export');

    gifshot.createGIF({
      images: recordingFrames,
      gifWidth: 1200,
      gifHeight: 600,
      interval: 0.1,
      numFrames: recordingFrames.length,
      sampleInterval: 1,
      numWorkers: 2,
      backgroundColor: '#0f172a',
      fontWeight: 'bold',
      fontFamily: 'Arial',
      frameDuration: 10,
      onProgress: (captureProgress) => {
        console.log(`GIF export progress: ${captureProgress}`);
      },
      onComplete: (obj) => {
        if (!obj.error) {
          const image = obj.image;
          const anchor = document.createElement('a');
          anchor.href = image;
          anchor.download = `sorting-${Date.now()}.gif`;
          anchor.click();
        }
      }
    });
  };

  const swap = async (array: Bar[], i: number, j: number, setFn: React.Dispatch<React.SetStateAction<Bar[]>>) => {
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
    array[i].status = 'swapping';
    array[j].status = 'swapping';
    setFn([...array]);
    await sleep(101 - speed);
    await recordFrame();
    array[i].status = 'default';
    array[j].status = 'default';
    setFn([...array]);
  };

  const bubbleSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;
    const n = array.length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (signal.aborted) return;

        array[j].status = 'comparing';
        array[j + 1].status = 'comparing';
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();
        steps++;

        if (array[j].value > array[j + 1].value) {
          await swap(array, j, j + 1, setFn);
          steps++;
        }
        array[j].status = 'default';
        array[j + 1].status = 'default';
      }
      array[n - i - 1].status = 'sorted';
      setFn([...array]);
      await recordFrame();
    }
    return steps;
  };

  const selectionSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;
    const n = array.length;
    for (let i = 0; i < n; i++) {
      let minIdx = i;
      array[i].status = 'comparing';
      setFn([...array]);
      await sleep(101 - speed);
      await recordFrame();

      for (let j = i + 1; j < n; j++) {
        if (signal.aborted) return;
        steps++;
        array[j].status = 'comparing';
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();

        if (array[j].value < array[minIdx].value) {
          if (minIdx !== i) array[minIdx].status = 'default';
          minIdx = j;
          array[minIdx].status = 'swapping';
        } else {
          array[j].status = 'default';
        }
      }
      if (minIdx !== i) {
        await swap(array, i, minIdx, setFn);
        steps++;
      }
      array[i].status = 'sorted';
      setFn([...array]);
      await recordFrame();
    }
    return steps;
  };

  const insertionSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;
    const n = array.length;
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && array[j - 1].value > array[j].value) {
        if (signal.aborted) return;
        steps++;
        await swap(array, j, j - 1, setFn);
        j--;
      }
      setFn([...array]);
      await recordFrame();
    }
    array.forEach(b => b.status = 'sorted');
    setFn([...array]);
    await recordFrame();
    return steps;
  };

  const quickSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;
    const partition = async (low: number, high: number): Promise<number> => {
      const pivot = array[high];
      pivot.status = 'comparing';
      setFn([...array]);
      await sleep(101 - speed);
      await recordFrame();

      let i = low - 1;
      for (let j = low; j < high; j++) {
        if (signal.aborted) return -1;
        steps++;
        array[j].status = 'comparing';
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();

        if (array[j].value < pivot.value) {
          i++;
          await swap(array, i, j, setFn);
          steps++;
        }
        array[j].status = 'default';
      }
      if (i + 1 !== high) {
        await swap(array, i + 1, high, setFn);
        steps++;
      }
      array[i + 1].status = 'sorted';
      setFn([...array]);
      await recordFrame();
      return i + 1;
    };

    const sort = async (low: number, high: number) => {
      if (low < high && !signal.aborted) {
        const pi = await partition(low, high);
        if (pi === -1) return;
        await sort(low, pi - 1);
        await sort(pi + 1, high);
      }
    };

    await sort(0, array.length - 1);
    array.forEach(b => b.status = 'sorted');
    setFn([...array]);
    await recordFrame();
    return steps;
  };

  const mergeSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;

    const merge = async (left: number, mid: number, right: number) => {
      const leftArr = array.slice(left, mid + 1);
      const rightArr = array.slice(mid + 1, right + 1);
      let i = 0, j = 0, k = left;

      while (i < leftArr.length && j < rightArr.length && !signal.aborted) {
        steps++;
        array[left + i].status = 'comparing';
        array[mid + 1 + j].status = 'comparing';
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();

        if (leftArr[i].value <= rightArr[j].value) {
          array[k] = leftArr[i];
          i++;
        } else {
          array[k] = rightArr[j];
          j++;
        }
        array[k].status = 'swapping';
        k++;
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();
      }

      while (i < leftArr.length && !signal.aborted) {
        array[k] = leftArr[i];
        i++;
        k++;
        setFn([...array]);
        await recordFrame();
      }
      while (j < rightArr.length && !signal.aborted) {
        array[k] = rightArr[j];
        j++;
        k++;
        setFn([...array]);
        await recordFrame();
      }
    };

    const sort = async (left: number, right: number) => {
      if (left < right && !signal.aborted) {
        const mid = Math.floor((left + right) / 2);
        await sort(left, mid);
        await sort(mid + 1, right);
        await merge(left, mid, right);
      }
    };
    await sort(0, array.length - 1);
    array.forEach(b => b.status = 'sorted');
    setFn([...array]);
    await recordFrame();
    return steps;
  };

  const heapSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;
    const heapify = async (n: number, i: number) => {
      let largest = i;
      let l = 2 * i + 1;
      let r = 2 * i + 2;

      if (l < n) {
        steps++;
        array[l].status = 'comparing';
        if (r < n) array[r].status = 'comparing';
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();

        if (array[l].value > array[largest].value) largest = l;
      }
      if (r < n && array[r].value > array[largest].value) largest = r;

      if (l < n) array[l].status = 'default';
      if (r < n) array[r].status = 'default';

      if (largest !== i) {
        await swap(array, i, largest, setFn);
        steps++;
        await heapify(n, largest);
      }
    };

    const n = array.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      if (signal.aborted) return steps;
      await heapify(n, i);
    }
    for (let i = n - 1; i >= 0; i--) {
      if (signal.aborted) return steps;
      await swap(array, 0, i, setFn);
      steps++;
      array[i].status = 'sorted';
      setFn([...array]);
      await recordFrame();
      await heapify(i, 0);
    }
    return steps;
  };

  const radixSort = async (array: Bar[], setFn: React.Dispatch<React.SetStateAction<Bar[]>>, signal: AbortSignal) => {
    let steps = 0;
    const getMax = () => {
      let max = 0;
      for (let i = 0; i < array.length; i++) {
        if (array[i].value > max) max = array[i].value;
      }
      return max;
    };

    const countingSort = async (exp: number) => {
      const output = new Array(array.length);
      const count = new Array(10).fill(0);

      for (let i = 0; i < array.length; i++) {
        steps++;
        count[Math.floor(array[i].value / exp) % 10]++;
      }
      for (let i = 1; i < 10; i++) {
        count[i] += count[i - 1];
      }

      for (let i = array.length - 1; i >= 0; i--) {
        if (signal.aborted) return;
        steps++;
        const idx = Math.floor(array[i].value / exp) % 10;
        output[count[idx] - 1] = array[i];
        count[idx]--;
      }

      for (let i = 0; i < array.length; i++) {
        array[i] = output[i];
        array[i].status = 'comparing';
        setFn([...array]);
        await sleep(101 - speed);
        await recordFrame();
        array[i].status = 'default';
      }
    };

    const max = getMax();
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      if (signal.aborted) return steps;
      await countingSort(exp);
    }
    array.forEach(b => b.status = 'sorted');
    setFn([...array]);
    await recordFrame();
    return steps;
  };

  const getSorter = (algo: string) => {
    switch (algo) {
      case 'bubble': return bubbleSort;
      case 'selection': return selectionSort;
      case 'insertion': return insertionSort;
      case 'quick': return quickSort;
      case 'merge': return mergeSort;
      case 'heap': return heapSort;
      case 'radix': return radixSort;
      default: return bubbleSort;
    }
  };

  const handleSort = async () => {
    if (isSorting) {
      abortControllerRef.current?.abort();
      setIsSorting(false);
      setIsRecording(false);
      return;
    }

    setIsSorting(true);
    setIsRecording(true);
    setRecordingFrames([]);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fresh1 = bars1.map(b => ({ ...b, status: 'default' as BarStatus }));
    const fresh2 = bars2.map(b => ({ ...b, status: 'default' as BarStatus }));

    const sorter1 = getSorter(algorithm1);
    const sorter2 = getSorter(algorithm2);

    const startTime1 = Date.now();
    const startTime2 = Date.now();

    const promises = [sorter1(fresh1, setBars1, controller.signal)];
    if (showComparison) {
      promises.push(sorter2(fresh2, setBars2, controller.signal));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    saveHistory({
      id: crypto.randomUUID(),
      algorithm: algorithm1,
      arraySize: fresh1.length,
      timeMs: endTime - startTime1,
      steps: results[0] || 0,
      timestamp: new Date()
    });

    if (showComparison && results[1]) {
      saveHistory({
        id: crypto.randomUUID(),
        algorithm: algorithm2,
        arraySize: fresh2.length,
        timeMs: endTime - startTime2,
        steps: results[1],
        timestamp: new Date()
      });
    }

    setIsSorting(false);
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 flex flex-col items-center gap-6">
      <header className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent">
          Sorting Visualizer Pro
        </h1>
        <p className="text-slate-400">Visualiza, compara y exporta algoritmos de ordenamiento</p>
      </header>

      <div className="w-full max-w-7xl bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            <select
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={algorithm1}
              onChange={(e) => setAlgorithm1(e.target.value as any)}
              disabled={isSorting}
            >
              <option value="bubble">Bubble</option>
              <option value="selection">Selection</option>
              <option value="insertion">Insertion</option>
              <option value="quick">Quick</option>
              <option value="merge">Merge</option>
              <option value="heap">Heap</option>
              <option value="radix">Radix</option>
            </select>
          </div>

          {showComparison && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">VS</span>
              <select
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={algorithm2}
                onChange={(e) => setAlgorithm2(e.target.value as any)}
                disabled={isSorting}
              >
                <option value="bubble">Bubble</option>
                <option value="selection">Selection</option>
                <option value="insertion">Insertion</option>
                <option value="quick">Quick</option>
                <option value="merge">Merge</option>
                <option value="heap">Heap</option>
                <option value="radix">Radix</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { setShowComparison(!showComparison); resetArrays(); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              showComparison
                ? "bg-purple-600 text-white shadow-purple-900/20"
                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
            )}
          >
            <Split className="w-4 h-4" />
            {showComparison ? 'Hide Comparison' : 'Compare'}
          </button>
        </div>

        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <Zap className="w-5 h-5 text-yellow-400" />
          <input
            type="range" min="1" max="100" value={speed}
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
                : "bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:opacity-90 shadow-lg"
            )}
          >
            {isSorting ? <><Pause className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start</>}
          </button>
          <button onClick={resetArrays} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={exportGIF}
            disabled={recordingFrames.length === 0}
            className="p-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl gap-4 flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col">
          <div className="text-center text-slate-300 font-semibold mb-2">{algorithm1.charAt(0).toUpperCase() + algorithm1.slice(1)} Sort</div>
          <div
            ref={visualizerRef1}
            className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex items-end justify-center gap-1 min-h-[350px]"
          >
            <AnimatePresence mode="popLayout">
              {bars1.map((bar) => (
                <motion.div
                  key={bar.id}
                  layout
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1, height: `${bar.value}%` }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={cn(
                    "flex-1 rounded-t-sm transition-colors duration-200 min-w-[3px]",
                    bar.status === 'default' && "bg-blue-500/60",
                    bar.status === 'comparing' && "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]",
                    bar.status === 'swapping' && "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]",
                    bar.status === 'sorted' && "bg-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                  )}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {showComparison && (
          <div className="flex-1 flex flex-col">
            <div className="text-center text-slate-300 font-semibold mb-2">{algorithm2.charAt(0).toUpperCase() + algorithm2.slice(1)} Sort</div>
            <div
              ref={visualizerRef2}
              className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex items-end justify-center gap-1 min-h-[350px]"
            >
              <AnimatePresence mode="popLayout">
                {bars2.map((bar) => (
                  <motion.div
                    key={bar.id}
                    layout
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1, height: `${bar.value}%` }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                      "flex-1 rounded-t-sm transition-colors duration-200 min-w-[3px]",
                      bar.status === 'default' && "bg-purple-500/60",
                      bar.status === 'comparing' && "bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]",
                      bar.status === 'swapping' && "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]",
                      bar.status === 'sorted' && "bg-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                    )}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-7xl bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-yellow-400" />
          Execution History
        </h3>
        {history.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No runs yet. Start sorting to see your history!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {history.map((item) => (
              <div key={item.id} className="bg-slate-900/70 p-4 rounded-xl border border-slate-700">
                <h4 className="font-bold text-blue-400 mb-2">{item.algorithm.charAt(0).toUpperCase() + item.algorithm.slice(1)}</h4>
                <p className="text-slate-400 text-sm mb-1">Size: {item.arraySize}</p>
                <p className="text-slate-400 text-sm mb-1">Time: {(item.timeMs / 1000).toFixed(2)}s</p>
                <p className="text-slate-400 text-sm mb-1">Steps: {item.steps}</p>
                <p className="text-slate-500 text-xs mt-2">{item.timestamp.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-4 md:gap-8 text-slate-500 text-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500/60" /> <span>Normal</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400" /> <span>Comparing</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> <span>Swapping</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400" /> <span>Sorted</span></div>
      </footer>
    </div>
  );
}
