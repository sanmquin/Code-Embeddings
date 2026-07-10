import React, { useState, useRef } from 'react';
import { getArcPythonUrlPatterns, getArcJsonUrl } from '../constants';

interface BatchTask {
  id: string;
  step1: 'pending' | 'running' | 'success' | 'failed';
  step2: 'pending' | 'running' | 'success' | 'failed';
  step3: 'pending' | 'running' | 'success' | 'failed';
  step4: 'pending' | 'running' | 'success' | 'failed';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  error?: string;
  prUrl?: string;
}

const BatchScreen: React.FC = () => {
  const [taskInput, setTaskInput] = useState<string>('');
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const stopRef = useRef<boolean>(false);

  const parseTasks = (input: string): string[] => {
    return input
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .slice(0, 10); // Limit to 10 puzzles
  };

  const handleStartBatch = async () => {
    const taskIds = parseTasks(taskInput);
    if (taskIds.length === 0) {
      alert('Please enter at least one Task ID.');
      return;
    }

    const initialTasks: BatchTask[] = taskIds.map((id) => ({
      id,
      step1: 'pending',
      step2: 'pending',
      step3: 'pending',
      step4: 'pending',
      status: 'pending',
    }));

    setTasks(initialTasks);
    setIsRunning(true);
    stopRef.current = false;

    for (let i = 0; i < initialTasks.length; i++) {
      if (stopRef.current) {
        updateTaskStatus(i, 'stopped');
        break;
      }

      const task = initialTasks[i];
      updateTaskStatus(i, 'running');

      try {
        // --- STEP 1: Loading Puzzle ---
        updateTaskStep(i, 'step1', 'running');
        const jsonUrl = getArcJsonUrl(task.id);
        const pythonUrlPatterns = getArcPythonUrlPatterns(task.id);

        const jsonRes = await fetch(jsonUrl);
        if (!jsonRes.ok) {
          throw new Error(`Failed to load Task JSON: ${jsonRes.status}`);
        }
        const taskData = await jsonRes.json();

        let pythonSolution = '';
        let success = false;
        for (const url of pythonUrlPatterns) {
          try {
            const pyRes = await fetch(url);
            if (pyRes.ok) {
              pythonSolution = await pyRes.text();
              success = true;
              break;
            }
          } catch (e) {}
        }

        if (!success) {
          throw new Error('Could not find Python solution.');
        }

        updateTaskStep(i, 'step1', 'success');

        if (stopRef.current) {
          updateTaskStatus(i, 'stopped');
          break;
        }

        // --- STEP 2: Drafting Solution ---
        updateTaskStep(i, 'step2', 'running');
        const transformRes = await fetch('/.netlify/functions/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solution: pythonSolution, taskData }),
        });

        if (!transformRes.ok) {
          throw new Error(`Drafting failed with status ${transformRes.status}`);
        }
        const transformData = await transformRes.json();
        const refactoredCode = transformData.code;
        if (!refactoredCode) {
          throw new Error('Drafting returned empty code.');
        }

        updateTaskStep(i, 'step2', 'success');

        if (stopRef.current) {
          updateTaskStatus(i, 'stopped');
          break;
        }

        // --- STEP 3: Verifying Solution ---
        updateTaskStep(i, 'step3', 'running');
        const verifyRes = await fetch('/.netlify/functions/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: refactoredCode, taskData }),
        });

        if (!verifyRes.ok) {
          throw new Error(`Verification request failed with status ${verifyRes.status}`);
        }
        const verifyData = await verifyRes.json();
        if (!verifyData.passed) {
          throw new Error(verifyData.error || 'Verification failed (some test cases did not pass).');
        }

        updateTaskStep(i, 'step3', 'success');

        if (stopRef.current) {
          updateTaskStatus(i, 'stopped');
          break;
        }

        // --- STEP 4: Submitting PR ---
        updateTaskStep(i, 'step4', 'running');
        const publishRes = await fetch('/.netlify/functions/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, code: refactoredCode }),
        });

        if (!publishRes.ok) {
          throw new Error(`Publish failed with status ${publishRes.status}`);
        }
        const publishData = await publishRes.json();
        updateTaskStep(i, 'step4', 'success');
        updateTaskStatus(i, 'completed', undefined, publishData.prUrl);

      } catch (err: any) {
        // Find current running step and mark it as failed
        setTasks((prevTasks) => {
          const updated = [...prevTasks];
          const t = updated[i];
          if (t.step1 === 'running') t.step1 = 'failed';
          else if (t.step2 === 'running') t.step2 = 'failed';
          else if (t.step3 === 'running') t.step3 = 'failed';
          else if (t.step4 === 'running') t.step4 = 'failed';
          t.status = 'failed';
          t.error = err.message;
          return updated;
        });
        // Continue to the next task if this one failed
      }
    }

    setIsRunning(false);
  };

  const handleStop = () => {
    stopRef.current = true;
    setIsRunning(false);
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.status === 'running' || t.status === 'pending'
          ? { ...t, status: 'stopped' }
          : t
      )
    );
  };

  const updateTaskStatus = (
    index: number,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped',
    error?: string,
    prUrl?: string
  ) => {
    setTasks((prevTasks) => {
      const updated = [...prevTasks];
      updated[index] = { ...updated[index], status, error, prUrl };
      return updated;
    });
  };

  const updateTaskStep = (
    idx: number,
    step: 'step1' | 'step2' | 'step3' | 'step4',
    state: 'pending' | 'running' | 'success' | 'failed'
  ) => {
    setTasks((prevTasks) => {
      const updated = [...prevTasks];
      updated[idx] = { ...updated[idx], [step]: state };
      return updated;
    });
  };

  const renderStepStatus = (state: 'pending' | 'running' | 'success' | 'failed') => {
    switch (state) {
      case 'pending':
        return <span style={{ color: '#888' }}>Pending</span>;
      case 'running':
        return <span style={{ color: '#2196F3', fontWeight: 'bold' }}>Running...</span>;
      case 'success':
        return <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ Success</span>;
      case 'failed':
        return <span style={{ color: '#f44336', fontWeight: 'bold' }}>✗ Failed</span>;
    }
  };

  const renderOverallStatus = (task: BatchTask) => {
    switch (task.status) {
      case 'pending':
        return <span style={{ color: '#888' }}>Pending</span>;
      case 'running':
        return <span style={{ color: '#2196F3', fontWeight: 'bold' }}>Running</span>;
      case 'completed':
        return (
          <div>
            <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Completed</span>
            {task.prUrl && (
              <div style={{ marginTop: '4px' }}>
                <a href={task.prUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#64b5f6', fontSize: '0.85rem' }}>
                  View PR
                </a>
              </div>
            )}
          </div>
        );
      case 'failed':
        return (
          <div>
            <span style={{ color: '#f44336', fontWeight: 'bold' }}>Failed</span>
            {task.error && <div style={{ fontSize: '0.8rem', color: '#e57373', marginTop: '2px' }}>{task.error}</div>}
          </div>
        );
      case 'stopped':
        return <span style={{ color: '#ffb74d', fontWeight: 'bold' }}>Stopped</span>;
    }
  };

  return (
    <div className="batch-screen" style={{ padding: '20px 0' }}>
      <h3>Batch Processing</h3>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Enter up to 10 ARC Task IDs (separated by commas or spaces) to sequentially load, refactor, verify, and submit PRs.
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="e.g. 00576224, 007bbfb7, 00d62c1b"
          disabled={isRunning}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            fontSize: '1rem',
          }}
        />
        {isRunning ? (
          <button onClick={handleStop} style={{ backgroundColor: '#f44336', color: '#fff' }}>
            Stop Batch
          </button>
        ) : (
          <button onClick={handleStartBatch} disabled={parseTasks(taskInput).length === 0}>
            Start Batch
          </button>
        )}
      </div>

      {tasks.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #444', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px' }}>Task ID</th>
              <th style={{ padding: '12px 8px' }}>1. Loading Puzzle</th>
              <th style={{ padding: '12px 8px' }}>2. Drafting Solution</th>
              <th style={{ padding: '12px 8px' }}>3. Verifying Solution</th>
              <th style={{ padding: '12px 8px' }}>4. Submitting PR</th>
              <th style={{ padding: '12px 8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{task.id}</td>
                <td style={{ padding: '12px 8px' }}>{renderStepStatus(task.step1)}</td>
                <td style={{ padding: '12px 8px' }}>{renderStepStatus(task.step2)}</td>
                <td style={{ padding: '12px 8px' }}>{renderStepStatus(task.step3)}</td>
                <td style={{ padding: '12px 8px' }}>{renderStepStatus(task.step4)}</td>
                <td style={{ padding: '12px 8px' }}>{renderOverallStatus(task)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BatchScreen;
