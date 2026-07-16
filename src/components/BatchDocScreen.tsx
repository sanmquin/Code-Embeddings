import React, { useState, useEffect, useRef } from 'react';

interface BatchDocScreenProps {
  startTaskId: string;
  v2Set: string[];
  getArcPythonUrlPatterns: (id: string) => string[];
  onPuzzleDocumented?: (id: string) => void;
}

type TaskStatus = 'pending' | 'fetching' | 'explaining' | 'committing' | 'completed' | 'failed' | 'skipped';

interface TaskProgress {
  taskId: string;
  status: TaskStatus;
  error?: string;
  explanation?: string;
  commitSha?: string;
}

const BatchDocScreen: React.FC<BatchDocScreenProps> = ({
  startTaskId,
  v2Set,
  getArcPythonUrlPatterns,
  onPuzzleDocumented
}) => {
  const [batchTasks, setBatchTasks] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, TaskProgress>>({});
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [branchName, setBranchName] = useState<string>('');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [selectedExplanation, setSelectedExplanation] = useState<{ taskId: string; text: string } | null>(null);

  const stopRequested = useRef<boolean>(false);

  // Calculate the 10 tasks starting from startTaskId
  useEffect(() => {
    if (isRunning) return; // Do not recalculate tasks while running

    const startIndex = v2Set.indexOf(startTaskId);
    let tasks: string[] = [];
    if (startIndex !== -1) {
      tasks = v2Set.slice(startIndex, startIndex + 10);
      if (tasks.length < 10) {
        tasks = [...tasks, ...v2Set.slice(0, 10 - tasks.length)];
      }
    } else {
      tasks = v2Set.slice(0, 10);
    }
    setBatchTasks(tasks);

    // Reset progress object
    const initialProgress: Record<string, TaskProgress> = {};
    tasks.forEach(id => {
      initialProgress[id] = { taskId: id, status: 'pending' };
    });
    setProgress(initialProgress);
    setCurrentIndex(-1);
    setPrUrl(null);
    setGlobalError(null);
  }, [startTaskId, v2Set]);

  const fetchPythonCode = async (id: string): Promise<string> => {
    const urls = getArcPythonUrlPatterns(id);
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          return await res.text();
        }
      } catch (e) {
        // Continue to next URL
      }
    }
    throw new Error('No Python solution file found in remote repository.');
  };

  const handleStart = async () => {
    setIsRunning(true);
    setGlobalError(null);
    stopRequested.current = false;

    // Generate a unique branch name
    const generatedBranch = `feat/batch-docs-${startTaskId}-${Date.now()}`;
    setBranchName(generatedBranch);

    // Initialize/Reset progress
    const freshProgress: Record<string, TaskProgress> = {};
    batchTasks.forEach(id => {
      freshProgress[id] = { taskId: id, status: 'pending' };
    });
    setProgress(freshProgress);

    for (let i = 0; i < batchTasks.length; i++) {
      if (stopRequested.current) {
        setGlobalError('Batch process stopped by user.');
        break;
      }

      const id = batchTasks[i];
      setCurrentIndex(i);

      // 1. Fetching Python Code
      setProgress(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'fetching' }
      }));

      let pythonCode = '';
      try {
        pythonCode = await fetchPythonCode(id);
      } catch (err: any) {
        setProgress(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'skipped', error: err.message }
        }));
        continue;
      }

      if (stopRequested.current) break;

      // 2. Generating Explanation (LLM step)
      setProgress(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'explaining' }
      }));

      let explanation = '';
      try {
        const explainRes = await fetch('/.netlify/functions/explain_python', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: id, solution: pythonCode })
        });

        if (!explainRes.ok) {
          const errData = await explainRes.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! status: ${explainRes.status}`);
        }

        const explainData = await explainRes.json();
        explanation = explainData.explanation;
        setProgress(prev => ({
          ...prev,
          [id]: { ...prev[id], explanation }
        }));
      } catch (err: any) {
        setProgress(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'failed', error: `Explanation error: ${err.message}` }
        }));
        continue;
      }

      if (stopRequested.current) break;

      // 3. Committing to GitHub (No LLM step)
      setProgress(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'committing' }
      }));

      try {
        const commitRes = await fetch('/.netlify/functions/commit_docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: id,
            explanation,
            branchName: generatedBranch
          })
        });

        if (!commitRes.ok) {
          const errData = await commitRes.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! status: ${commitRes.status}`);
        }

        const commitData = await commitRes.json();
        if (commitData.prUrl) {
          setPrUrl(commitData.prUrl);
        }

        // Update localStorage for documented puzzles
        try {
          const documented = localStorage.getItem('arc_documented');
          let docList: string[] = [];
          if (documented) {
            docList = JSON.parse(documented);
          }
          if (!docList.includes(id)) {
            docList.push(id);
            localStorage.setItem('arc_documented', JSON.stringify(docList));
          }
        } catch (e) {
          console.error('Failed to update documented list in localStorage', e);
        }

        if (onPuzzleDocumented) {
          onPuzzleDocumented(id);
        }

        setProgress(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'completed', commitSha: commitData.commitSha }
        }));
      } catch (err: any) {
        setProgress(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'failed', error: `GitHub Commit error: ${err.message}` }
        }));
      }
    }

    setIsRunning(false);
  };

  const handleStop = () => {
    stopRequested.current = true;
  };

  const getStatusBadgeStyle = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return { backgroundColor: '#2ecc40', color: '#fff' };
      case 'failed': return { backgroundColor: '#ff4136', color: '#fff' };
      case 'skipped': return { backgroundColor: '#aaaaaa', color: '#111' };
      case 'fetching': return { backgroundColor: '#0074d9', color: '#fff' };
      case 'explaining': return { backgroundColor: '#f012be', color: '#fff' };
      case 'committing': return { backgroundColor: '#ff851b', color: '#fff' };
      default: return { backgroundColor: '#333333', color: '#888' };
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'fetching': return 'Fetching Code...';
      case 'explaining': return 'Documenting (LLM)...';
      case 'committing': return 'Committing to Git...';
      case 'completed': return 'Completed ✓';
      case 'failed': return 'Failed ✗';
      case 'skipped': return 'Skipped';
      default: return status;
    }
  };

  return (
    <div className="batch-doc-screen" style={{
      backgroundColor: '#1e1e1e',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #444',
      marginTop: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff' }}>Batch Python Solutions Documentation</h2>
          <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.95rem' }}>
            Documenting the next 10 solutions sequentially from Python code and committing them to <code>SOLUTIONS.md</code>.
          </p>
        </div>
        <div>
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={batchTasks.length === 0}
              style={{
                backgroundColor: '#2ecc40',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Start Batch Documentation
            </button>
          ) : (
            <button
              onClick={handleStop}
              style={{
                backgroundColor: '#ff4136',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {branchName && (
        <div style={{
          backgroundColor: '#252525',
          padding: '12px 16px',
          borderRadius: '4px',
          borderLeft: '4px solid #0074d9',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          <div><strong>Branch:</strong> <code>{branchName}</code></div>
          {prUrl && (
            <div style={{ marginTop: '5px' }}>
              <strong>GitHub Pull Request:</strong>{' '}
              <a href={prUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0074d9', textDecoration: 'underline' }}>
                {prUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {globalError && (
        <div style={{
          backgroundColor: '#ff413622',
          border: '1px solid #ff4136',
          padding: '12px',
          borderRadius: '4px',
          color: '#ff4136',
          marginBottom: '20px',
          fontSize: '0.9rem'
        }}>
          {globalError}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #444', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Task ID</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Details / Actions</th>
          </tr>
        </thead>
        <tbody>
          {batchTasks.map((id, index) => {
            const taskProgress = progress[id] || { taskId: id, status: 'pending' };
            const isActive = index === currentIndex && isRunning;
            return (
              <tr
                key={id}
                style={{
                  borderBottom: '1px solid #333',
                  backgroundColor: isActive ? '#1a2736' : 'transparent',
                  transition: 'background-color 0.3s'
                }}
              >
                <td style={{ padding: '12px', fontWeight: 'bold' }}>
                  {id}
                  {isActive && <span style={{ color: '#0074d9', marginLeft: '10px', fontSize: '0.8rem' }}>(Processing...)</span>}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    ...getStatusBadgeStyle(taskProgress.status)
                  }}>
                    {getStatusText(taskProgress.status)}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                  {taskProgress.error ? (
                    <span style={{ color: '#ff4136' }}>{taskProgress.error}</span>
                  ) : taskProgress.status === 'completed' ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ color: '#2ecc40' }}>Commit created successfully.</span>
                      {taskProgress.explanation && (
                        <button
                          onClick={() => setSelectedExplanation({ taskId: id, text: taskProgress.explanation! })}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            backgroundColor: '#2b2b2b',
                            border: '1px solid #555',
                            margin: 0
                          }}
                        >
                          View Explanation
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#888' }}>
                      {taskProgress.status === 'pending' ? 'Waiting...' : 'In progress...'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedExplanation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#333',
              padding: '12px 20px',
              borderBottom: '1px solid #444',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Task {selectedExplanation.taskId} Explanation</h3>
              <button
                onClick={() => setSelectedExplanation(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#aaa',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: 0,
                  margin: 0
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#e0e0e0', lineHeight: '1.6' }}>
              {selectedExplanation.text}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #444', textAlign: 'right', backgroundColor: '#252525' }}>
              <button
                onClick={() => setSelectedExplanation(null)}
                style={{ margin: 0, backgroundColor: '#0074d9', color: '#fff', border: 'none' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchDocScreen;
