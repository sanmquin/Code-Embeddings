import React, { useState, useEffect } from 'react';

interface TransformationScreenProps {
  onApprove: (code: string) => void;
}

const TransformationScreen: React.FC<TransformationScreenProps> = ({ onApprove }) => {
  const [pythonSolution, setPythonSolution] = useState<string>('');
  const [taskData, setTaskData] = useState<any>(null);
  const [transformedCode, setTransformedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial solution and task data
    Promise.all([
      fetch('/solutions/00576224.py').then(res => res.text()),
      fetch('/data/00576224.json').then(res => res.json())
    ]).then(([solution, data]) => {
      setPythonSolution(solution);
      setTaskData(data);
    }).catch(err => {
      setError('Failed to load solution or task data: ' + err.message);
    });
  }, []);

  const handleRefactor = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution: pythonSolution, taskData })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setTransformedCode(result.code);
    } catch (err: any) {
      setError('Transformation failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="transformation-screen">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Original Python Solution</h3>
          <pre>{pythonSolution}</pre>
        </div>
        <div>
          <h3>Refactored TypeScript Code</h3>
          {isLoading ? (
            <p>Refactoring...</p>
          ) : transformedCode ? (
            <pre>{transformedCode}</pre>
          ) : (
            <p>No refactored code yet. Click "Refactor" to start.</p>
          )}
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleRefactor} disabled={isLoading}>
          Refactor
        </button>
        {transformedCode && (
          <button onClick={() => onApprove(transformedCode)} style={{ backgroundColor: '#4CAF50', color: 'white', marginLeft: '10px' }}>
            Approve & Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default TransformationScreen;
