import React, { useState, useEffect } from 'react';

interface TransformationScreenProps {
  pythonSolution: string;
  taskData: any;
  onApprove: (code: string) => void;
}

const TransformationScreen: React.FC<TransformationScreenProps> = ({
  pythonSolution,
  taskData,
  onApprove
}) => {
  const [transformedCode, setTransformedCode] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTransformedCode('');
    setFeedback('');
  }, [pythonSolution]);

  const handleRefactor = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: pythonSolution,
          taskData,
          feedback,
          currentCode: transformedCode
        })
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

  const Window: React.FC<{ title: string; children: React.ReactNode; flex?: number; minHeight?: string }> = ({ title, children, flex, minHeight }) => (
    <div style={{
      border: '1px solid #444',
      borderRadius: '6px',
      overflow: 'hidden',
      backgroundColor: '#1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      flex: flex ?? 'none',
      minHeight: minHeight ?? 'auto'
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
      <div style={{ padding: '0', flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="transformation-screen" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Window title="Original Python Solution">
        <pre style={{ margin: 0, borderRadius: 0, overflow: 'auto', maxHeight: '400px', padding: '12px' }}>{pythonSolution}</pre>
      </Window>

      <Window title="Refactored JavaScript Code">
        {isLoading ? (
          <div style={{ padding: '20px' }}>
            <p>Refactoring...</p>
          </div>
        ) : transformedCode ? (
          <pre style={{ margin: 0, borderRadius: 0, overflow: 'auto', maxHeight: '600px', padding: '12px' }}>{transformedCode}</pre>
        ) : (
          <div style={{ padding: '20px' }}>
            <p>No refactored code yet. Click "Refactor" to start.</p>
          </div>
        )}
      </Window>

      <Window title="Feedback for LLM">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Provide feedback to improve the refactored code..."
          style={{
            width: '100%',
            minHeight: '120px',
            backgroundColor: '#1e1e1e',
            color: '#e0e0e0',
            border: 'none',
            padding: '12px',
            fontSize: '1rem',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </Window>

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
