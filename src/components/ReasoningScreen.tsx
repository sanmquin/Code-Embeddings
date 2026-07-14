import React, { useState, useEffect, useRef } from 'react';
import { transform } from 'sucrase';
import MatrixVisualization from './MatrixVisualization';
import { ARC_REPO_BASE } from '../constants';

// @ts-ignore
import v2SetRaw from '../../data/v2_public_evaluation_set.json.txt?raw';

const v2Set: string[] = JSON.parse(v2SetRaw).sort();

interface ReasoningScreenProps {
  // Shared state with App if any, or self-contained. Let's make it fully self-contained!
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

const ReasoningScreen: React.FC<ReasoningScreenProps> = () => {
  const [taskId, setTaskId] = useState<string>('00576224');
  const [taskData, setTaskData] = useState<any>(null);
  const [solutionCode, setSolutionCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Case selection
  const [selectedCaseType, setSelectedCaseType] = useState<'train' | 'test'>('train');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);

  // Playback states
  const [snapshots, setSnapshots] = useState<number[][][]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(500); // ms per frame

  // Dropdown combobox states
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [failedPuzzles, setFailedPuzzles] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<any>(null);

  // Load solutions from localStorage to show green checkmarks
  const [savedSolutions] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('arc_solutions');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchTerm = taskId.trim();
  let filteredPuzzles = v2Set;

  if (searchTerm) {
    try {
      const pattern = searchTerm.startsWith('^') ? searchTerm : `^${searchTerm}`;
      const regex = new RegExp(pattern, 'i');
      filteredPuzzles = v2Set.filter(id => regex.test(id));
    } catch (e) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredPuzzles = v2Set.filter(id => id.toLowerCase().startsWith(lowerSearch));
    }
  }

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
      <p>Select an ARC puzzle to fetch its published solution and visualize step-by-step matrix changes during transformation.</p>

      {/* Task Selector section */}
      <div className="task-loader" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div className="puzzle-selector-container" ref={containerRef} style={{ position: 'relative' }}>
          <input
            type="text"
            value={taskId}
            onChange={(e) => {
              setTaskId(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                loadPuzzleAndSolution(taskId);
                setShowDropdown(false);
              } else if (e.key === 'Escape') {
                setShowDropdown(false);
              }
            }}
            placeholder="Enter Task ID (e.g. 1ae2feb7)"
            style={{
              padding: '10px',
              backgroundColor: '#1e1e1e',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              width: '250px'
            }}
          />

          {showDropdown && (
            <ul className="puzzle-dropdown-list" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: '#1e1e1e',
              border: '1px solid #444',
              borderRadius: '4px',
              zIndex: 100,
              listStyle: 'none',
              padding: 0,
              margin: '4px 0 0'
            }}>
              {filteredPuzzles.length > 0 ? (
                filteredPuzzles.map((id) => {
                  const isSolved = !!savedSolutions[id];
                  const isFailed = failedPuzzles.has(id);
                  return (
                    <li
                      key={id}
                      className={`puzzle-dropdown-item ${id === taskId ? 'selected' : ''}`}
                      onClick={() => {
                        setTaskId(id);
                        loadPuzzleAndSolution(id);
                        setShowDropdown(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: id === taskId ? '#333' : 'transparent'
                      }}
                    >
                      <span className="puzzle-id-text">{id}</span>
                      <div className="puzzle-status-icons" style={{ display: 'flex', gap: '4px' }}>
                        {isSolved && (
                          <span className="status-icon solved-icon" style={{ color: '#4caf50' }} title="Solved">✓</span>
                        )}
                        {isFailed && (
                          <span className="status-icon failed-icon" style={{ color: '#f44336' }} title="Failed to load">✗</span>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="puzzle-dropdown-no-matches" style={{ padding: '8px 12px', color: '#888' }}>No matching puzzles</li>
              )}
            </ul>
          )}
        </div>

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

      {taskData && solutionCode && (
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
    </div>
  );
};

export default ReasoningScreen;
