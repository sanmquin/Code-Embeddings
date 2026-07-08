import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '../../src/constants';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'GEMINI_API_KEY is not set' };
  }

  try {
    const { readme } = JSON.parse(event.body || '{}');

    if (!readme) {
      return { statusCode: 400, body: 'Missing readme content' };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
      You are an expert software engineer and data scientist.
      I will provide you with a README file that contains a list of modular functions used to solve ARC (Abstraction and Reasoning Corpus) puzzles.
      Your task is to cluster these functions into logical groups (clusters) based on their functionality and purpose.

      For each cluster, provide:
      1. A concise and descriptive Title.
      2. A lengthy, detailed Description explaining what kinds of problems this cluster of functions addresses and how they work together.
      3. A list of Examples from the README that belong to this cluster. Each example should include the function name and a brief summary of what it does.

      README content:
      ${readme}

      Respond ONLY with a valid JSON object in the following format:
      {
        "clusters": [
          {
            "title": "Cluster Title",
            "description": "Lengthy description of the cluster...",
            "examples": [
              {
                "name": "functionName",
                "description": "What the function does"
              }
            ]
          }
        ]
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
