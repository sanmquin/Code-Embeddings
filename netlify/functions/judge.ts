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
    const { code, taskData } = JSON.parse(event.body || '{}');

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = 'gemini-3.1-flash-lite';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      You are an expert software engineer acting as a judge for ARC (Abstraction and Reasoning Corpus) solution code refactoring.
      Evaluate the following JavaScript code based on three specific criteria.

      Criteria:
      1. No logic on solve function: The 'solve' function should only contain sequential calls to modular reusable functions. It should not contain loops, complex conditionals, or direct grid manipulations.
      2. No magic numbers or parameters: Especially for colors. All parameters should be inferred from training data using helper functions.
      3. Single responsibility per function: Each function must do a single job, avoid complex logic, and not have nested function definitions. Functions should be modular and independent.

      JavaScript Code to Evaluate:
      \`\`\`javascript
      ${code}
      \`\`\`

      ARC Task Data (for context):
      ${JSON.stringify(taskData, null, 2)}

      Response Format:
      Respond ONLY with a valid JSON object:
      {
        "checks": [
          {
            "id": "no_logic_solve",
            "label": "No logic on solve function",
            "fulfilled": boolean,
            "feedback": "Specific feedback if failed, otherwise empty"
          },
          {
            "id": "no_magic",
            "label": "No magic numbers or parameters",
            "fulfilled": boolean,
            "feedback": "Specific feedback if failed, otherwise empty"
          },
          {
            "id": "single_responsibility",
            "label": "Single responsibility per function",
            "fulfilled": boolean,
            "feedback": "Specific feedback if failed, otherwise empty"
          }
        ],
        "combinedFeedback": "A concise summary of all improvements needed to satisfy the failed criteria."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Failed to parse JSON from judge response');
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
