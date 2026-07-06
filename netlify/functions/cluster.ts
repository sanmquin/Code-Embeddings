import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const handler: Handler = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not set' }) };
  }

  try {
    const readmeUrl = 'https://raw.githubusercontent.com/sanmquin/Code-Embeddings/refs/heads/main/library/README.md';
    const readmeRes = await fetch(readmeUrl);
    if (!readmeRes.ok) {
       throw new Error('Failed to fetch README');
    }
    const readmeText = await readmeRes.text();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      I have a README file that lists various modular functions for ARC puzzles, grouped by task IDs.
      Your goal is to:
      1. Extract all function names and their brief descriptions from the README.
      2. Cluster these functions into logical groups based on their purpose (e.g., Grid Manipulation, Object Detection, Pattern Recognition, Tiling/Symmetry, etc.).
      3. For each group, provide a "title" and a detailed "description" of what kind of transformations or operations this group covers.
      4. List the "functions" that belong to each group.

      README Content:
      ${readmeText}

      Response Format:
      Respond ONLY with a valid JSON array of objects:
      [
        {
          "id": "grid-manipulation",
          "title": "Grid Manipulation",
          "description": "Functions related to changing the grid size, flipping, rotating, or basic cell updates.",
          "functions": ["flipRow", "repeatRow", "cloneGrid"]
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
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
