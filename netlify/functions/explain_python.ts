import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '../../src/constants';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not set' }) };
  }

  try {
    const { taskId, solution } = JSON.parse(event.body || '{}');

    if (!taskId || !solution) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId or solution' }) };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
      You are an expert AI software engineer specialized in analyzing ARC (Abstraction and Reasoning Corpus) puzzle solutions.

      Please analyze the following Python code for ARC task ${taskId} and provide a detailed, clear explanation of how the puzzle is solved.

      Requirements for the explanation:
      1. Write in clear, concise markdown format.
      2. Include a high-level summary of the overall logic/strategy.
      3. Explain the key helper functions and core steps of the solution.
      4. Describe any patterns, grids transformations, or specific rules identified and used.

      Python Solution for Task ${taskId}:
      \`\`\`python
      ${solution}
      \`\`\`

      Response Format:
      Respond ONLY with a valid JSON object:
      {
        "explanation": "Markdown description of the solution..."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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
