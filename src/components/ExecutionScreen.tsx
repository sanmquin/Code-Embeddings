import React, { useState, useEffect } from 'react';
import { transform } from 'sucrase';

interface ExecutionScreenProps {
  code: string;
}

interface TestResult {
  index: number;
  type: 'train' | 'test';
  passed: boolean;
  actual?: any;
  expected?: any;
  input?: any;
  error?: string;
}

const ExecutionScreen: React.FC<ExecutionScreenProps> = ({ code }) => {
  const [taskData, setTaskData] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [transpilationError, setTranspilationError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/00576224.json')
      .then(res => res.json())
      .then(data => setTaskData(data))
      .catch(err => console.error('Failed to load task data', err));
  }, []);

  const runTests = () => {
    if (!taskData || !code) return;

    setIsRunning(true);
    setTranspilationError(null);
    const newResults: TestResult[] = [];

    try {
      // Transpile JavaScript (could have modern features or remnants of types) using Sucrase
      const compiled = transform(code, {
        transforms: ['typescript'],
      });
      const jsCode = compiled.code;

      // Create a function from the transpiled code string
      const wrappedCode = `
        ${jsCode}
        return solve;
      `;
      const solveFn = new Function(wrappedCode)();

      if (typeof solveFn !== 'function') {
        throw new Error('The refactored code must export a "solve" function.');
      }

      const runCase = (caseData: any, type: 'train' | 'test', index: number) => {
        try {
          const actual = solveFn(caseData.input);
          const passed = JSON.stringify(actual) === JSON.stringify(caseData.output);
          newResults.push({ index, type, passed, actual, expected: caseData.output, input: caseData.input });
        } catch (err: any) {
          newResults.push({ index, type, passed: false, error: err.message, input: caseData.input, expected: caseData.output });
        }
      };

      taskData.train.forEach((ex: any, i: number) => runCase(ex, 'train', i));
      taskData.test.forEach((ex: any, i: number) => runCase(ex, 'test', i));

    } catch (err: any) {
      console.error('Failed to execute code', err);
      setTranspilationError(err.message);
      newResults.push({ index: 0, type: 'train', passed: false, error: 'Execution Error: ' + err.message });
    }

    setResults(newResults);
    setIsRunning(false);
  };

  const renderGrid = (grid: any) => (
    <pre style={{ margin: 0, padding: '0.5rem', fontSize: '0.8rem', background: '#1e1e1e' }}>
      {JSON.stringify(grid, null, 2)}
    </pre>
  );

  return (
    <div className="execution-screen">
      <h3>Execution & Verification</h3>

      <div style={{ marginBottom: '20px' }}>
        <h4>Test Cases to Run</h4>
        {taskData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {taskData.train.map((ex: any, i: number) => (
              <div key={`train-${i}`} style={{ border: '1px solid #444', padding: '10px', borderRadius: '4px' }}>
                <strong>Train Case #{i}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                  <div>
                    <small>Input:</small>
                    {renderGrid(ex.input)}
                  </div>
                  <div>
                    <small>Expected Output:</small>
                    {renderGrid(ex.output)}
                  </div>
                </div>
              </div>
            ))}
            {taskData.test.map((ex: any, i: number) => (
              <div key={`test-${i}`} style={{ border: '1px solid #444', padding: '10px', borderRadius: '4px' }}>
                <strong>Test Case #{i}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                  <div>
                    <small>Input:</small>
                    {renderGrid(ex.input)}
                  </div>
                  <div>
                    <small>Expected Output:</small>
                    {renderGrid(ex.output)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading task data...</p>
        )}
      </div>

      <button onClick={runTests} disabled={isRunning || !taskData}>
        {isRunning ? 'Running...' : 'Run Tests'}
      </button>

      {transpilationError && (
        <div style={{ color: 'red', marginTop: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
          <strong>Transpilation/Runtime Error:</strong> {transpilationError}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        {results.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Index</th>
                <th>Input</th>
                <th>Expected</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, i) => (
                <tr key={i}>
                  <td>{res.type}</td>
                  <td>{res.index}</td>
                  <td>{renderGrid(res.input)}</td>
                  <td>{renderGrid(res.expected)}</td>
                  <td style={{ color: res.passed ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                    {res.passed ? 'PASS' : 'FAIL'}
                  </td>
                  <td>
                    {res.error ? (
                      <span style={{ color: '#f44336' }}>{res.error}</span>
                    ) : !res.passed ? (
                      <div>
                        <small>Actual:</small>
                        {renderGrid(res.actual)}
                      </div>
                    ) : (
                      'Correct'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h4>Refactored JavaScript Code:</h4>
        <pre>{code}</pre>
      </div>
    </div>
  );
};

export default ExecutionScreen;
