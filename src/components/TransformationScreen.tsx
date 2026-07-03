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

  const Window: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{
      border: '1px solid #444',
      borderRadius: '6px',
      overflow: 'hidden',
      marginBottom: '20px',
      backgroundColor: '#1e1e1e'
    }}>
      <div style={{
        backgroundColor: '#333',
        padding: '8px 16px',
        borderBottom: '1px solid #444',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: '#e0e0e0'
      }}>
        {title}
      </div>
      <div style={{ padding: '0' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="transformation-screen">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <Window title="Original Python Solution">
          <pre style={{ margin: 0, borderRadius: 0 }}>{pythonSolution}</pre>
        </Window>

        <Window title="Refactored JavaScript Code">
          {isLoading ? (
            <div style={{ padding: '20px' }}>
              <p>Refactoring...</p>
            </div>
          ) : transformedCode ? (
            <pre style={{ margin: 0, borderRadius: 0 }}>{transformedCode}</pre>
          ) : (
            <div style={{ padding: '20px' }}>
              <p>No refactored code yet. Click "Refactor" to start.</p>
            </div>
          )}
        </Window>
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
