import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'GEMINI_API_KEY is not set' };
  }

  try {
    const { solution, taskData, feedback, currentCode } = JSON.parse(event.body || '{}');

    const genAI = new GoogleGenerativeAI(apiKey);
    // Note: The user requested gemini-3.1-flash-lite, but we use gemini-1.5-flash as a fallback
    // because gemini-3.1-flash-lite is not widely available/documented as a public model ID yet.
    const modelName = 'gemini-3.1-flash-lite';
    const model = genAI.getGenerativeModel({ model: modelName });

    let prompt = `
      You are an expert software engineer specialized in ARC (Abstraction and Reasoning Corpus) challenges.

      Use the following Python code as a starting point to a solution based on reusable JavaScript functions.

      Rules for the generated JavaScript:
      1. Modularity: Break down the logic into small, single-purpose functions.
      2. Documentation: Each function must have JSDoc comments explaining its purpose, parameters, and return value.
      3. Type Safety: Use JSDoc comments for type information. Do NOT use TypeScript-specific syntax like interfaces, type aliases, or type annotations on parameters/variables.
      4. Entry Point: You MUST provide a 'solve(grid, training)' function that orchestrates the others.
      5. Browser Compatible: Do not use Node.js specific APIs.

      However, the Python solution often uses “MAGIC” parameters that are puzzle specific instead of generalizable solutions. In addition to the code, you will be provided with the puzzle, your task is to use the training data to convert any magic parameters into reusable functions.

      There are two types of expected functions: the first that a list of matrices as input (i.e. the training data) and output a parameter (often hard-coded in the original solution). The second set of functions takes a matrix as an input performs a transformation to it. 

      There should be no logic on the solve function, it is only a composition of reusable functions.

      Python Solution:
      \`\`\`python
      ${solution}
      \`\`\`

      ARC Task Data (puzzle):
      ${JSON.stringify(taskData, null, 2)}
    `;

    if (feedback) {
      if (currentCode) {
        prompt += `

      Existing JavaScript Implementation:
      \`\`\`javascript
      ${currentCode}
      \`\`\`

      User Feedback for the existing implementation:
      "${feedback}"

      Please provide an updated JavaScript implementation that addresses the feedback while following all the rules above.
      The output should be the complete updated script.
      `;
      } else {
        prompt += `

      User Feedback for the initial implementation:
      "${feedback}"

      Please incorporate this feedback into the generated JavaScript code.
      `;
      }
    }

    prompt += `
      Response Format:
      Respond ONLY with a valid JSON object:
      {
        "code": "/* JavaScript code here */"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse JSON from model response');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: jsonMatch[0],
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
