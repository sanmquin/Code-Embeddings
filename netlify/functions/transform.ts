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
    const { solution, taskData } = JSON.parse(event.body || '{}');

    const genAI = new GoogleGenerativeAI(apiKey);
    // Note: The user requested gemini-3.1-flash-lite, but we use gemini-1.5-flash as a fallback
    // because gemini-3.1-flash-lite is not widely available/documented as a public model ID yet.
    const modelName = 'gemini-3.1-flash-lite';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      You are an expert software engineer specialized in ARC (Abstraction and Reasoning Corpus) challenges.
      Transform the following Python solution into a modular, well-documented JavaScript library.

      Rules for the generated JavaScript:
      1. **Modularity**: Break down the logic into small, single-purpose functions.
      2. **Documentation**: Each function must have JSDoc comments explaining its purpose, parameters, and return value.
      3. **No Magic**: Avoid hardcoded "magic" values. Use descriptive parameters.
      4. **Type Safety**: Use JSDoc comments for type information. Do NOT use TypeScript-specific syntax like interfaces, type aliases, or type annotations on parameters/variables.
      5. **Entry Point**: You MUST provide a 'solve(grid)' function that orchestrates the others.
      6. **Browser Compatible**: Do not use Node.js specific APIs.

      Python Solution:
      \`\`\`python
      ${solution}
      \`\`\`

      ARC Task Data (for context):
      ${JSON.stringify(taskData, null, 2)}

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
