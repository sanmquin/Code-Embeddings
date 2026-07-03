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
      // Transpile TypeScript to JavaScript using Sucrase
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
          newResults.push({ index, type, passed, actual, expected: caseData.output });
        } catch (err: any) {
          newResults.push({ index, type, passed: false, error: err.message });
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

  return (
    <div className="execution-screen">
      <h3>Execution & Verification</h3>
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
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, i) => (
                <tr key={i}>
                  <td>{res.type}</td>
                  <td>{res.index}</td>
                  <td style={{ color: res.passed ? 'green' : 'red' }}>
                    {res.passed ? 'PASS' : 'FAIL'}
                  </td>
                  <td>
                    {res.error ? (
                      <span style={{ color: 'red' }}>{res.error}</span>
                    ) : !res.passed ? (
                      <span>Expected {JSON.stringify(res.expected)} but got {JSON.stringify(res.actual)}</span>
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

      <div style={{ marginTop: '20px' }}>
        <h4>Refactored TypeScript Code:</h4>
        <pre>{code}</pre>
      </div>
    </div>
  );
};

export default ExecutionScreen;
