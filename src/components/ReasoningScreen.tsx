import React, { useState, useEffect, useRef } from 'react';
import { transform } from 'sucrase';
import MatrixVisualization from './MatrixVisualization';
import PuzzleSelector from './PuzzleSelector';
import { ARC_REPO_BASE } from '../constants';


interface ReasoningScreenProps {
  initialTaskId?: string;
  initialMode?: 'solver' | 'visualization';
}

export interface ConnectedComponentStats {
  numComponents: number;
  maxSize: number;
  minSize: number;
  avgSize: number;
  componentMap: number[][]; // same dimensions as grid, elements are component indices (1-based) or 0 (background)
}

export function extractConnectedComponents(grid: number[][], bgVal: number): ConnectedComponentStats {
  if (!grid || grid.length === 0 || !grid[0]) {
    return { numComponents: 0, maxSize: 0, minSize: 0, avgSize: 0, componentMap: [] };
  }

  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const componentMap = Array.from({ length: rows }, () => Array(cols).fill(0));
  let componentId = 0;
  const sizes: number[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== bgVal && !visited[r][c]) {
        componentId++;
        let size = 0;
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift()!;
          componentMap[currR][currC] = componentId;
          size++;

          // 8-adjacency exploration
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = currR + dr;
              const nc = currC + dc;

              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (grid[nr][nc] !== bgVal && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              }
            }
          }
        }
        sizes.push(size);
      }
    }
  }

  // Filter out cases where total components < minCompCount if desired, or handle accordingly
  const numComponents = sizes.length;
  const maxSize = numComponents > 0 ? Math.max(...sizes) : 0;
  const minSize = numComponents > 0 ? Math.min(...sizes) : 0;
  const avgSize = numComponents > 0 ? parseFloat((sizes.reduce((a, b) => a + b, 0) / numComponents).toFixed(1)) : 0;

  return {
    numComponents,
    maxSize,
    minSize,
    avgSize,
    componentMap,
  };
}

export function runAndTrack(inputGrid: number[][], jsCode: string, trainingData: any[]): number[][][] {
  const snapshots: number[][][] = [];
  const parentMap = new WeakMap<any, any>();
  let isTracking = false;

  // Backup original globals and prototypes
  const originalPush = Array.prototype.push;
  const originalPop = Array.prototype.pop;
  const originalShift = Array.prototype.shift;
  const originalUnshift = Array.prototype.unshift;
  const originalSplice = Array.prototype.splice;
  const originalFill = Array.prototype.fill;
  const originalReverse = Array.prototype.reverse;
  const originalSort = Array.prototype.sort;
  const originalMap = Array.prototype.map;
  const originalSlice = Array.prototype.slice;
  const originalFilter = Array.prototype.filter;
  const originalFrom = Array.from;

  function unwrap(val: any): any {
    if (!Array.isArray(val)) return val;
    const raw = (val as any).__rawTarget || val;
    // Use original map to prevent trigger mapping/tracking
    return originalMap.call(raw, (item: any) => unwrap(item));
  }

  function recordSnapshot(gridTarget: any) {
    if (!isGridLike(gridTarget)) return;
    const clean = unwrap(gridTarget);
    const last = snapshots[snapshots.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(clean)) {
      return;
    }
    if (snapshots.length < 1000) {
      originalPush.call(snapshots, clean);
    }
  }

  function isGridLike(arr: any): boolean {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    if (!Array.isArray(arr[0])) return false;
    for (let i = 0; i < arr.length; i++) {
      if (!Array.isArray(arr[i])) return false;
    }
    return true;
  }

  // Override mutating and copying methods
  Array.prototype.push = function(...args: any[]) {
    if (!isTracking) {
      return originalPush.apply(this, args);
    }
    isTracking = false;
    try {
      const res = originalPush.apply(this, args);
      for (const arg of args) {
        if (Array.isArray(arg)) {
          parentMap.set(arg, this);
        }
      }
      // Find root and snapshot
      let root: any = this;
      const visited = new Set();
      while (parentMap.has(root) && !visited.has(root)) {
        visited.add(root);
        root = parentMap.get(root);
      }
      recordSnapshot(root);
      return res;
    } finally {
      isTracking = true;
    }
  };

  Array.prototype.unshift = function(...args: any[]) {
    if (!isTracking) {
      return originalUnshift.apply(this, args);
    }
    isTracking = false;
    try {
      const res = originalUnshift.apply(this, args);
      for (const arg of args) {
        if (Array.isArray(arg)) {
          parentMap.set(arg, this);
        }
      }
      let root: any = this;
      const visited = new Set();
      while (parentMap.has(root) && !visited.has(root)) {
        visited.add(root);
        root = parentMap.get(root);
      }
      recordSnapshot(root);
      return res;
    } finally {
      isTracking = true;
    }
  };

  const mutatingMethods = ['pop', 'shift', 'splice', 'fill', 'reverse', 'sort'] as const;
  mutatingMethods.forEach(method => {
    const original = (Array.prototype as any)[method];
    (Array.prototype as any)[method] = function(...args: any[]) {
      if (!isTracking) {
        return original.apply(this, args);
      }
      isTracking = false;
      try {
        const res = original.apply(this, args);
        let root: any = this;
        const visited = new Set();
        while (parentMap.has(root) && !visited.has(root)) {
          visited.add(root);
          root = parentMap.get(root);
        }
        recordSnapshot(root);
        return res;
      } finally {
        isTracking = true;
      }
    };
  });

  // Track parent-child links for mapping/slicing
  (Array.prototype as any).map = function(callback: any, thisArg: any) {
    if (!isTracking) {
      return originalMap.call(this, callback, thisArg);
    }
    isTracking = false;
    try {
      const res = originalMap.call(this, callback, thisArg);
      if (Array.isArray(res)) {
        for (let i = 0; i < res.length; i++) {
          if (Array.isArray(res[i])) {
            parentMap.set(res[i], res);
          }
        }
      }
      return res;
    } finally {
      isTracking = true;
    }
  };

  (Array.prototype as any).slice = function(...args: any[]) {
    if (!isTracking) {
      return (originalSlice as any).apply(this, args);
    }
    isTracking = false;
    try {
      const res = (originalSlice as any).apply(this, args);
      if (Array.isArray(res)) {
        for (let i = 0; i < res.length; i++) {
          if (Array.isArray(res[i])) {
            parentMap.set(res[i], res);
          }
        }
      }
      return res;
    } finally {
      isTracking = true;
    }
  };

  (Array.prototype as any).filter = function(callback: any, thisArg: any) {
    if (!isTracking) {
      return originalFilter.call(this, callback, thisArg);
    }
    isTracking = false;
    try {
      const res = originalFilter.call(this, callback, thisArg);
      if (Array.isArray(res)) {
        for (let i = 0; i < res.length; i++) {
          if (Array.isArray(res[i])) {
            parentMap.set(res[i], res);
          }
        }
      }
      return res;
    } finally {
      isTracking = true;
    }
  };

  Array.from = function(iterable: any, mapFn?: any, thisArg?: any) {
    if (!isTracking) {
      return originalFrom.call(Array, iterable, mapFn, thisArg);
    }
    isTracking = false;
    try {
      const res = originalFrom.call(Array, iterable, mapFn, thisArg);
      if (Array.isArray(res)) {
        for (let i = 0; i < res.length; i++) {
          if (Array.isArray(res[i])) {
            parentMap.set(res[i], res);
          }
        }
      }
      return res;
    } finally {
      isTracking = true;
    }
  } as any;

  function wrap(arr: any, isOuter = false): any {
    if (!Array.isArray(arr)) return arr;
    if ((arr as any).__isProxy) return arr;

    const handler: ProxyHandler<any> = {
      get(target, prop, receiver) {
        if (prop === '__isProxy') return true;
        if (prop === '__rawTarget') return target;

        const value = Reflect.get(target, prop, receiver);

        if (typeof value === 'function') {
          return function(...args: any[]) {
            const res = value.apply(target, args);
            if (Array.isArray(res)) {
              return wrap(res, isOuter);
            }
            return res;
          };
        }

        if (Array.isArray(value)) {
          return new Proxy(value, {
            get(rowTarget, rowProp, rowReceiver) {
              if (rowProp === '__isProxy') return true;
              if (rowProp === '__rawTarget') return rowTarget;
              return Reflect.get(rowTarget, rowProp, rowReceiver);
            },
            set(rowTarget, rowProp, rowValue, rowReceiver) {
              const rawVal = rowValue && (rowValue as any).__rawTarget ? (rowValue as any).__rawTarget : rowValue;
              const ok = Reflect.set(rowTarget, rowProp, rawVal, rowReceiver);

              // Find parent/root of target
              let root: any = target;
              const visited = new Set();
              while (parentMap.has(root) && !visited.has(root)) {
                visited.add(root);
                root = parentMap.get(root);
              }
              recordSnapshot(root);
              return ok;
            }
          });
        }

        return value;
      },
      set(target, prop, value, receiver) {
        const rawVal = value && (value as any).__rawTarget ? (value as any).__rawTarget : value;
        const ok = Reflect.set(target, prop, rawVal, receiver);

        let root: any = target;
        const visited = new Set();
        while (parentMap.has(root) && !visited.has(root)) {
          visited.add(root);
          root = parentMap.get(root);
        }
        recordSnapshot(root);
        return ok;
      }
    };

    return new Proxy(arr, handler);
  }

  // Clone inputGrid initially so we don't mutate raw data!
  const clonedInput = JSON.parse(JSON.stringify(inputGrid));
  snapshots.push(clonedInput);

  const proxyGrid = wrap(clonedInput, true);

  const runnerCode = `
    return function(inputGrid, wrap, training) {
      const originalJSONParse = JSON.parse;
      JSON.parse = function(text, reviver) {
        const res = originalJSONParse(text, reviver);
        if (Array.isArray(res)) {
          return wrap(res, true);
        }
        return res;
      };

      ${jsCode}

      if (typeof solve !== 'function') {
        throw new Error('The retrieved solution must define a "solve" function.');
      }
      return solve(inputGrid, training);
    }
  `;

  try {
    const runnerFn = new Function(runnerCode)();
    isTracking = true;
    const finalOutput = runnerFn(proxyGrid, wrap, trainingData);
    isTracking = false;

    const unwrappedFinal = unwrap(finalOutput);
    const last = snapshots[snapshots.length - 1];
    if (unwrappedFinal && Array.isArray(unwrappedFinal) && JSON.stringify(last) !== JSON.stringify(unwrappedFinal)) {
      snapshots.push(unwrappedFinal);
    }
  } catch (err) {
    console.error('Tracking runner error:', err);
    throw err;
  } finally {
    // RESTORE ALL ORIGINAL GLOBALS AND PROTOTYPES!
    Array.prototype.push = originalPush;
    Array.prototype.pop = originalPop;
    Array.prototype.shift = originalShift;
    Array.prototype.unshift = originalUnshift;
    Array.prototype.splice = originalSplice;
    Array.prototype.fill = originalFill;
    Array.prototype.reverse = originalReverse;
    Array.prototype.sort = originalSort;
    Array.prototype.map = originalMap;
    Array.prototype.slice = originalSlice;
    Array.prototype.filter = originalFilter;
    Array.from = originalFrom;
  }

  return snapshots;
}

const ReasoningScreen: React.FC<ReasoningScreenProps> = ({ initialTaskId, initialMode }) => {
  const [taskId, setTaskId] = useState<string>(initialTaskId || '00576224');
  const [mode, setMode] = useState<'solver' | 'visualization'>(initialMode || 'solver');
  const [taskData, setTaskData] = useState<any>(null);
  const [solutionCode, setSolutionCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Component Extraction state
  const [minComponents, setMinComponents] = useState<number>(3);
  const [bgColor, setBgColor] = useState<number>(0);

  // Case selection
  const [selectedCaseType, setSelectedCaseType] = useState<'train' | 'test'>('train');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);

  // Playback states
  const [snapshots, setSnapshots] = useState<number[][][]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(500); // ms per frame

  // Dropdown combobox states
  const [failedPuzzles, setFailedPuzzles] = useState<Set<string>>(new Set());
  const playIntervalRef = useRef<any>(null);

  // Sync initial parameters when navigated from Clusters tab
  useEffect(() => {
    if (initialTaskId) {
      setTaskId(initialTaskId);
    }
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialTaskId, initialMode]);

  // Load solutions from localStorage to show green checkmarks
  const [savedSolutions] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('arc_solutions');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [documentedPuzzles] = useState<string[]>(() => {
    const saved = localStorage.getItem('arc_documented');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const loadPuzzleAndSolution = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setTaskData(null);
    setSolutionCode('');
    setSnapshots([]);
    setCurrentFrame(0);
    setIsPlaying(false);

    try {
      // 1. Fetch Task JSON
      const jsonUrl = `${ARC_REPO_BASE}/dataset/tasks/${id}.json`;
      const jsonRes = await fetch(jsonUrl);
      if (!jsonRes.ok) {
        throw new Error(`Failed to load Task JSON: ${jsonRes.status} ${jsonRes.statusText}`);
      }
      const taskJson = await jsonRes.json();
      setTaskData(taskJson);

      // 2. Fetch JS Solution from GitHub matrix repository
      const solUrl = `https://raw.githubusercontent.com/sanmquin/Matrix/main/solutions/${id}.js`;
      const solRes = await fetch(solUrl);
      if (!solRes.ok) {
        throw new Error(`Failed to retrieve solution code from GitHub Matrix repository. Code ${solRes.status}: ${solRes.statusText}`);
      }
      const codeText = await solRes.text();
      setSolutionCode(codeText);

      // Remove from failed if loaded successfully
      setFailedPuzzles(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // Initially select train case 0
      setSelectedCaseType('train');
      setSelectedCaseIndex(0);

    } catch (err: any) {
      setError(err.message);
      setFailedPuzzles(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run the code and generate snapshots when case selection or code changes
  useEffect(() => {
    if (!taskData || !solutionCode) return;

    try {
      // Transpile JavaScript/TypeScript code using sucrase
      const compiled = transform(solutionCode, {
        transforms: ['typescript'],
      });
      const jsCode = compiled.code;

      const cases = selectedCaseType === 'train' ? taskData.train : taskData.test;
      const currentCase = cases[selectedCaseIndex];
      if (!currentCase) return;

      const trackedSnapshots = runAndTrack(currentCase.input, jsCode, taskData.train);
      setSnapshots(trackedSnapshots);
      setCurrentFrame(0);
    } catch (err: any) {
      setError(`Execution/Transpilation error: ${err.message}`);
    }
  }, [taskData, solutionCode, selectedCaseType, selectedCaseIndex]);

  // Handle Playback Interval
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, snapshots.length, playSpeed]);

  const handleNext = () => {
    setIsPlaying(false);
    if (currentFrame < snapshots.length - 1) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  const handleFirst = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const handleLast = () => {
    setIsPlaying(false);
    setCurrentFrame(snapshots.length - 1);
  };

  const currentCase = taskData
    ? (selectedCaseType === 'train' ? taskData.train[selectedCaseIndex] : taskData.test[selectedCaseIndex])
    : null;

  return (
    <div className="reasoning-screen" style={{ color: '#e0e0e0', padding: '20px' }}>
      <h2>Matrix Transformation Reasoning</h2>
      <p>Select an ARC puzzle to explore reasoning visualization or interactive component solvers.</p>

      {/* Task Selector section */}
      <div className="task-loader" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <PuzzleSelector
          taskId={taskId}
          onChangeTaskId={setTaskId}
          onSelectTaskId={loadPuzzleAndSolution}
          savedSolutions={savedSolutions}
          documentedPuzzles={documentedPuzzles}
          failedPuzzles={failedPuzzles}
        />

        <button
          onClick={() => loadPuzzleAndSolution(taskId)}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Loading...' : 'Load Puzzle & Solution'}
        </button>

        {/* Mode Toggle Buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setMode('solver')}
            className={mode === 'solver' ? 'active' : ''}
            style={{
              padding: '8px 16px',
              backgroundColor: mode === 'solver' ? '#0074D9' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Interactive Solver
          </button>
          <button
            onClick={() => setMode('visualization')}
            className={mode === 'visualization' ? 'active' : ''}
            style={{
              padding: '8px 16px',
              backgroundColor: mode === 'visualization' ? '#0074D9' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Solution Visualization
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#442222',
          border: '1px solid #f44336',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {taskData && mode === 'visualization' && solutionCode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Case Selector and Case Visualizations */}
          <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Select Training/Testing Case</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {taskData.train.map((_: any, i: number) => (
                <button
                  key={`train-case-${i}`}
                  onClick={() => {
                    setSelectedCaseType('train');
                    setSelectedCaseIndex(i);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedCaseType === 'train' && selectedCaseIndex === i ? '#4caf50' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Train Case #{i}
                </button>
              ))}
              {taskData.test.map((_: any, i: number) => (
                <button
                  key={`test-case-${i}`}
                  onClick={() => {
                    setSelectedCaseType('test');
                    setSelectedCaseIndex(i);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedCaseType === 'test' && selectedCaseIndex === i ? '#2196F3' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Test Case #{i}
                </button>
              ))}
            </div>

            {/* Playback Controls Panel */}
            {snapshots.length > 0 && (
              <div style={{
                backgroundColor: '#252525',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #444',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#bbb' }}>Playback Controls</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  {/* Playback Buttons */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={handleFirst} disabled={currentFrame === 0} style={{ padding: '6px 12px', cursor: 'pointer' }}>First</button>
                    <button onClick={handlePrev} disabled={currentFrame === 0} style={{ padding: '6px 12px', cursor: 'pointer' }}>Prev</button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: isPlaying ? '#f44336' : '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button onClick={handleNext} disabled={currentFrame === snapshots.length - 1} style={{ padding: '6px 12px', cursor: 'pointer' }}>Next</button>
                    <button onClick={handleLast} disabled={currentFrame === snapshots.length - 1} style={{ padding: '6px 12px', cursor: 'pointer' }}>Last</button>
                  </div>

                  {/* Scrub Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#999' }}>0</span>
                    <input
                      type="range"
                      min={0}
                      max={snapshots.length - 1}
                      value={currentFrame}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentFrame(parseInt(e.target.value));
                      }}
                      style={{ flex: 1, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#999' }}>{snapshots.length - 1}</span>
                  </div>

                  {/* Frame Counter */}
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#2196F3', minWidth: '130px' }}>
                    Frame {currentFrame + 1} / {snapshots.length}
                    {currentFrame === 0 && ' (Initial)'}
                    {currentFrame === snapshots.length - 1 && snapshots.length > 1 && ' (Final)'}
                  </div>

                  {/* Speed Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: '#bbb' }}>Speed:</label>
                    <select
                      value={playSpeed}
                      onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
                      style={{
                        backgroundColor: '#333',
                        color: 'white',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={1000}>1.0s (Slow)</option>
                      <option value={500}>0.5s</option>
                      <option value={250}>0.25s</option>
                      <option value={100}>0.1s (Fast)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Matrix side-by-side view */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginTop: '15px'
            }}>
              {/* Input Grid */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <h4 style={{ margin: '0 0 10px 0', alignSelf: 'flex-start', color: '#bbb' }}>Input Matrix</h4>
                {currentCase && <MatrixVisualization data={currentCase.input} />}
              </div>

              {/* Live Transformation Grid */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #2196F3',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 0 10px rgba(33, 150, 243, 0.15)'
              }}>
                <h4 style={{ margin: '0 0 10px 0', alignSelf: 'flex-start', color: '#2196F3' }}>
                  Transformation Frame ({currentFrame + 1}/{snapshots.length})
                </h4>
                {snapshots[currentFrame] ? (
                  <MatrixVisualization data={snapshots[currentFrame]} />
                ) : (
                  <p style={{ color: '#888' }}>Generating transformation frames...</p>
                )}
              </div>

              {/* Expected Output Grid */}
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <h4 style={{ margin: '0 0 10px 0', alignSelf: 'flex-start', color: '#bbb' }}>Desired Output</h4>
                {currentCase && <MatrixVisualization data={currentCase.output} />}
              </div>
            </div>
          </div>

          {/* Solution Code Viewer */}
          <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Retrieved Solution Code (from GitHub)</h3>
            <pre style={{
              backgroundColor: '#121212',
              color: '#4caf50',
              padding: '15px',
              borderRadius: '6px',
              overflowX: 'auto',
              maxHeight: '400px',
              fontSize: '0.9rem',
              fontFamily: 'monospace',
              border: '1px solid #222'
            }}>
              {solutionCode}
            </pre>
          </div>
        </div>
      )}

      {taskData && mode === 'solver' && (
        <div className="interactive-solver-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Inputs Section */}
          <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Interactive Solver Configuration</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Configure parameters for the component extraction/identification function run on all matrices.</p>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginTop: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.9rem', color: '#bbb', fontWeight: 'bold' }}>Minimum Connected Components</label>
                <input
                  type="number"
                  min={1}
                  value={minComponents}
                  onChange={(e) => setMinComponents(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    width: '180px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.9rem', color: '#bbb', fontWeight: 'bold' }}>Background Value/Color</label>
                <select
                  value={bgColor}
                  onChange={(e) => setBgColor(parseInt(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    width: '180px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>Black (0)</option>
                  <option value={1}>Blue (1)</option>
                  <option value={2}>Red (2)</option>
                  <option value={3}>Green (3)</option>
                  <option value={4}>Yellow (4)</option>
                  <option value={5}>Gray (5)</option>
                  <option value={6}>Magenta (6)</option>
                  <option value={7}>Orange (7)</option>
                  <option value={8}>Teal (8)</option>
                  <option value={9}>Maroon (9)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Train & Test Cases Matrices Showcase */}
          <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Puzzle Matrices (Train & Test)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Train Cases */}
              <div>
                <h4 style={{ color: '#4caf50', margin: '0 0 10px 0' }}>Train Cases</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '15px' }}>
                  {taskData.train.map((tc: any, i: number) => {
                    const inputStats = extractConnectedComponents(tc.input, bgColor);
                    const outputStats = extractConnectedComponents(tc.output, bgColor);

                    return (
                      <div key={`solver-train-${i}`} style={{ backgroundColor: '#161616', border: '1px solid #333', borderRadius: '6px', padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', borderBottom: '1px solid #222', paddingBottom: '5px', marginBottom: '10px', color: '#999' }}>
                          Train Case #{i}
                        </div>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px', textAlign: 'center' }}>INPUT</div>
                            <MatrixVisualization data={tc.input} componentMap={inputStats.componentMap} />

                            {/* Input Stats Display */}
                            {inputStats.numComponents >= minComponents ? (
                              <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px solid #333', fontSize: '0.75rem', color: '#aaa', width: '150px' }}>
                                <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '3px' }}>Components Stats:</div>
                                <div>Count: {inputStats.numComponents}</div>
                                <div>Max Size: {inputStats.maxSize}</div>
                                <div>Min Size: {inputStats.minSize}</div>
                                <div>Avg Size: {inputStats.avgSize}</div>
                              </div>
                            ) : (
                              <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#2a1a1a', borderRadius: '4px', border: '1px solid #552222', fontSize: '0.75rem', color: '#ffa0a0', width: '150px' }}>
                                Component count ({inputStats.numComponents}) is below threshold ({minComponents})
                              </div>
                            )}
                          </div>
                          <div style={{ color: '#444', fontSize: '1.5rem', fontWeight: 'bold' }}>→</div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px', textAlign: 'center' }}>OUTPUT</div>
                            <MatrixVisualization data={tc.output} componentMap={outputStats.componentMap} />

                            {/* Output Stats Display */}
                            {outputStats.numComponents >= minComponents ? (
                              <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px solid #333', fontSize: '0.75rem', color: '#aaa', width: '150px' }}>
                                <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '3px' }}>Components Stats:</div>
                                <div>Count: {outputStats.numComponents}</div>
                                <div>Max Size: {outputStats.maxSize}</div>
                                <div>Min Size: {outputStats.minSize}</div>
                                <div>Avg Size: {outputStats.avgSize}</div>
                              </div>
                            ) : (
                              <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#2a1a1a', borderRadius: '4px', border: '1px solid #552222', fontSize: '0.75rem', color: '#ffa0a0', width: '150px' }}>
                                Component count ({outputStats.numComponents}) is below threshold ({minComponents})
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Test Cases */}
              {taskData.test && taskData.test.length > 0 && (
                <div>
                  <h4 style={{ color: '#2196F3', margin: '20px 0 10px 0' }}>Test Cases</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '15px' }}>
                    {taskData.test.map((tc: any, i: number) => {
                      const inputStats = extractConnectedComponents(tc.input, bgColor);
                      const outputStats = tc.output ? extractConnectedComponents(tc.output, bgColor) : null;

                      return (
                        <div key={`solver-test-${i}`} style={{ backgroundColor: '#161616', border: '1px solid #333', borderRadius: '6px', padding: '15px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', borderBottom: '1px solid #222', paddingBottom: '5px', marginBottom: '10px', color: '#999' }}>
                            Test Case #{i}
                          </div>
                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px', textAlign: 'center' }}>INPUT</div>
                              <MatrixVisualization data={tc.input} componentMap={inputStats.componentMap} />

                              {/* Input Stats Display */}
                              {inputStats.numComponents >= minComponents ? (
                                <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px solid #333', fontSize: '0.75rem', color: '#aaa', width: '150px' }}>
                                  <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '3px' }}>Components Stats:</div>
                                  <div>Count: {inputStats.numComponents}</div>
                                  <div>Max Size: {inputStats.maxSize}</div>
                                  <div>Min Size: {inputStats.minSize}</div>
                                  <div>Avg Size: {inputStats.avgSize}</div>
                                </div>
                              ) : (
                                <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#2a1a1a', borderRadius: '4px', border: '1px solid #552222', fontSize: '0.75rem', color: '#ffa0a0', width: '150px' }}>
                                  Component count ({inputStats.numComponents}) is below threshold ({minComponents})
                                </div>
                              )}
                            </div>
                            {tc.output && (
                              <>
                                <div style={{ color: '#444', fontSize: '1.5rem', fontWeight: 'bold' }}>→</div>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px', textAlign: 'center' }}>OUTPUT</div>
                                  <MatrixVisualization data={tc.output} componentMap={outputStats ? outputStats.componentMap : undefined} />

                                  {/* Output Stats Display */}
                                  {outputStats && (outputStats.numComponents >= minComponents ? (
                                    <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#1a1a1a', borderRadius: '4px', border: '1px solid #333', fontSize: '0.75rem', color: '#aaa', width: '150px' }}>
                                      <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '3px' }}>Components Stats:</div>
                                      <div>Count: {outputStats.numComponents}</div>
                                      <div>Max Size: {outputStats.maxSize}</div>
                                      <div>Min Size: {outputStats.minSize}</div>
                                      <div>Avg Size: {outputStats.avgSize}</div>
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: '#2a1a1a', borderRadius: '4px', border: '1px solid #552222', fontSize: '0.75rem', color: '#ffa0a0', width: '150px' }}>
                                      Component count ({outputStats.numComponents}) is below threshold ({minComponents})
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReasoningScreen;
