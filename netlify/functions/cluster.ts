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
    const { readme, type = 'functions' } = JSON.parse(event.body || '{}');

    if (!readme) {
      return { statusCode: 400, body: 'Missing readme content' };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const isSolutions = type === 'solutions';

    const prompt = `
      You are an expert software engineer and data scientist.
      I will provide you with a file containing ARC (Abstraction and Reasoning Corpus) puzzle ${isSolutions ? 'solutions' : 'modular functions'}.
      Your task is to cluster these ${isSolutions ? 'solutions' : 'functions'} into logical groups (clusters) based on their logic, methodology, or purpose.

      For each cluster, provide:
      1. A concise and descriptive Title.
      2. A lengthy, detailed Description explaining what kinds of puzzles or problems this cluster addresses and how the ${isSolutions ? 'solutions' : 'functions'} in it work.
      3. A list of Examples from the content that belong to this cluster. Each example should include the ${isSolutions ? 'Task ID or Solution Name' : 'function name'} and a brief summary of what it does / how it solves it.

      Content to cluster:
      ${readme}

      Respond ONLY with a valid JSON object in the following format:
      {
        "clusters": [
          {
            "title": "Cluster Title",
            "description": "Lengthy description of the cluster...",
            "examples": [
              {
                "name": "${isSolutions ? 'Task XXXXXXXX' : 'functionName'}",
                "description": "What the ${isSolutions ? 'solution' : 'function'} does / how it is solved"
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
