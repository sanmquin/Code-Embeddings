import { Handler } from '@netlify/functions';
import { transform } from 'sucrase';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, taskData } = JSON.parse(event.body || '{}');

    if (!code || !taskData) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing code or taskData' })
      };
    }

    // Transpile using sucrase (handling TypeScript types/features if any)
    const compiled = transform(code, {
      transforms: ['typescript'],
    });
    const jsCode = compiled.code;

    // Wrap code and return solve function
    const wrappedCode = `
      ${jsCode}
      return solve;
    `;

    const solveFn = new Function(wrappedCode)();

    if (typeof solveFn !== 'function') {
      throw new Error('The refactored code must export a "solve" function.');
    }

    const results: any[] = [];
    let allPassed = true;

    // Run train cases
    if (Array.isArray(taskData.train)) {
      taskData.train.forEach((ex: any, i: number) => {
        try {
          const actual = solveFn(ex.input, taskData.train);
          const passed = JSON.stringify(actual) === JSON.stringify(ex.output);
          if (!passed) allPassed = false;
          results.push({ index: i, type: 'train', passed, actual, expected: ex.output });
        } catch (err: any) {
          allPassed = false;
          results.push({ index: i, type: 'train', passed: false, error: err.message, expected: ex.output });
        }
      });
    }

    // Run test cases
    if (Array.isArray(taskData.test)) {
      taskData.test.forEach((ex: any, i: number) => {
        try {
          const actual = solveFn(ex.input, taskData.train);
          const passed = JSON.stringify(actual) === JSON.stringify(ex.output);
          if (!passed) allPassed = false;
          results.push({ index: i, type: 'test', passed, actual, expected: ex.output });
        } catch (err: any) {
          allPassed = false;
          results.push({ index: i, type: 'test', passed: false, error: err.message, expected: ex.output });
        }
      });
    }

    if (results.length === 0) {
      allPassed = false;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passed: allPassed, results })
    };

  } catch (error: any) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passed: false, error: error.message, results: [] })
    };
  }
};

export { handler };
