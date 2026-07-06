import React, { useState, useEffect } from 'react';

interface JudgeCheck {
  id: string;
  label: string;
  fulfilled: boolean;
  feedback: string;
}

interface JudgeResult {
  checks: JudgeCheck[];
  combinedFeedback: string;
}

interface TransformationScreenProps {
  pythonSolution: string;
  taskData: any;
  refactoredCode: string;
  onCodeChange: (code: string) => void;
}

const Window: React.FC<{ title: string; children: React.ReactNode; flex?: number; minHeight?: string; style?: React.CSSProperties }> = ({ title, children, flex, minHeight, style }) => (
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
    <div style={{ padding: '0', flex: 1, overflow: 'auto', ...style }}>
      {children}
    </div>
  </div>
);

const TransformationScreen: React.FC<TransformationScreenProps> = ({
  pythonSolution,
  taskData,
  refactoredCode,
  onCodeChange
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isJudging, setIsJudging] = useState<boolean>(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFeedback('');
    setJudgeResult(null);
  }, [pythonSolution]);

  const handleJudge = async () => {
    if (!refactoredCode) return;
    setIsJudging(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: refactoredCode,
          taskData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setJudgeResult(result);

      const allFulfilled = result.checks.every((c: JudgeCheck) => c.fulfilled);
      if (!allFulfilled && result.combinedFeedback) {
        setFeedback(result.combinedFeedback);
      }
    } catch (err: any) {
      setError('Judging failed: ' + err.message);
    } finally {
      setIsJudging(false);
    }
  };

  const handleRefactor = async () => {
    setIsLoading(true);
    setError(null);
    setJudgeResult(null);
    try {
      const response = await fetch('/.netlify/functions/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solution: pythonSolution,
          taskData,
          feedback,
          currentCode: refactoredCode
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      onCodeChange(result.code);
    } catch (err: any) {
      setError('Transformation failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
        ) : refactoredCode ? (
          <>
            <pre style={{ margin: 0, borderRadius: 0, overflow: 'auto', maxHeight: '600px', padding: '12px' }}>{refactoredCode}</pre>
            {judgeResult && (
              <div style={{ padding: '16px', borderTop: '1px solid #444', backgroundColor: '#252525' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>Judge Checklist</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {judgeResult.checks.map(check => (
                    <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        color: check.fulfilled ? '#4caf50' : '#f44336',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}>
                        {check.fulfilled ? '✓' : '✗'}
                      </span>
                      <span style={{ color: '#e0e0e0' }}>{check.label}</span>
                      {!check.fulfilled && check.feedback && (
                        <span style={{ color: '#aaa', fontSize: '0.85rem', marginLeft: '8px' }}>- {check.feedback}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isJudging && (
              <div style={{ padding: '16px', borderTop: '1px solid #444', backgroundColor: '#252525' }}>
                <p style={{ margin: 0, color: '#aaa' }}>Judging code...</p>
              </div>
            )}
          </>
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

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button onClick={handleRefactor} disabled={isLoading || isJudging}>
          {refactoredCode ? 'Refactor with Feedback' : 'Refactor'}
        </button>
        {refactoredCode && (
          <button
            onClick={handleJudge}
            disabled={isLoading || isJudging}
            style={{ backgroundColor: '#4a4a4a' }}
          >
            {isJudging ? 'Judging...' : 'Judge Code'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TransformationScreen;
