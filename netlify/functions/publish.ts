import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GITHUB_OWNER as OWNER, GITHUB_REPO as REPO, GEMINI_MODEL } from '../../src/constants';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN is not set' }) };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not set' }) };
  }

  try {
    const { taskId, code, documentation: userDocumentation } = JSON.parse(event.body || '{}');
    if (!taskId || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId or code' }) };
    }

    // 0. Extract modular functions and convert to TypeScript
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const libraryPrompt = `
      You are an expert software engineer. I have a JavaScript solution for an ARC (Abstraction and Reasoning Corpus) task.
      Your task is two-fold:
      1. Provide a detailed explanation of how the puzzle was solved based on the code logic.
      2. Extract all individual modular helper functions from this code, EXCEPT the main 'solve' function.

      For each extracted function:
      1. Convert it to strictly typed TypeScript.
      2. Expand and improve the documentation (JSDoc/TSDoc).
      3. Ensure it is a standalone modular function.

      Original JavaScript Code:
      \`\`\`javascript
      ${code}
      \`\`\`

      Response Format:
      Respond ONLY with a valid JSON object:
      {
        "summary": "Descriptive explanation of the solution logic.",
        "functions": [
          {
            "name": "functionName",
            "description": "A detailed description of what the function does.",
            "code": "/* TypeScript code here */"
          }
        ]
      }
    `;

    const geminiResult = await model.generateContent(libraryPrompt);
    const geminiResponse = await geminiResult.response;
    const geminiText = geminiResponse.text();
    const jsonMatch = geminiText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) {
      throw new Error('Failed to parse function library from LLM response');
    }
    const geminiData = JSON.parse(jsonMatch[0]);
    const libraryFunctions: { name: string, description: string, code: string }[] = Array.isArray(geminiData) ? geminiData : (geminiData.functions || []);
    const solutionSummary: string = userDocumentation || geminiData.summary || 'No solution summary provided.';

    const branchName = `feat/solution-${taskId}`;
    const filePath = `solutions/${taskId}.js`;

    // 1. Get the SHA of the main branch
    const mainBranchRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/main`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });

    if (!mainBranchRes.ok) {
        const error = await mainBranchRes.text();
        throw new Error(`Failed to get main branch ref: ${error}`);
    }
    const mainBranchData = await mainBranchRes.json();
    const mainSha = mainBranchData.object.sha;

    // 2. Create a new branch
    const createBranchRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: mainSha
      })
    });

    if (!createBranchRes.ok) {
      const errorData = await createBranchRes.json();
      if (errorData.message !== 'Reference already exists') {
        throw new Error(`Failed to create branch: ${errorData.message}`);
      }
      console.log('Branch already exists, continuing...');
    }

    // 3. Create a tree with multiple files
    // 3a. Get current library/README.md and solutions/README.md content
    const solutionsReadmePath = 'solutions/README.md';
    const solutionsReadmeRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${solutionsReadmePath}?ref=main`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });

    let solutionsReadmeContent = '# Solutions\n\nDocumentation of ARC puzzle solutions.\n\n';
    if (solutionsReadmeRes.ok) {
      const solutionsReadmeData = await solutionsReadmeRes.json();
      solutionsReadmeContent = Buffer.from(solutionsReadmeData.content, 'base64').toString('utf8');
    }

    // Append new solution summary to solutions/README.md
    solutionsReadmeContent += `\n### Task ${taskId}\n${solutionSummary}\n`;

    const readmePath = 'library/README.md';
    const readmeRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${readmePath}?ref=main`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });

    let readmeContent = '# Library\n\nModular functions for ARC puzzles.\n\n';
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf8');
    }

    // Append new functions to README
    readmeContent += `\n### Task ${taskId}\n`;
    libraryFunctions.forEach(fn => {
      readmeContent += `- **${fn.name}**: ${fn.description}\n`;
    });

    // 3b. Create tree objects
    const treeItems = [
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        content: code
      },
      {
        path: readmePath,
        mode: '100644',
        type: 'blob',
        content: readmeContent
      },
      {
        path: solutionsReadmePath,
        mode: '100644',
        type: 'blob',
        content: solutionsReadmeContent
      },
      ...libraryFunctions.map(fn => ({
        path: `library/${taskId}_${fn.name}.ts`,
        mode: '100644',
        type: 'blob',
        content: fn.code
      }))
    ];

    // 3c. Create the tree
    const createTreeRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base_tree: mainSha,
        tree: treeItems
      })
    });

    if (!createTreeRes.ok) {
      const error = await createTreeRes.text();
      throw new Error(`Failed to create tree: ${error}`);
    }
    const treeData = await createTreeRes.json();

    // 3d. Create a commit
    const createCommitRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add refactored solution and library functions for task ${taskId}`,
        tree: treeData.sha,
        parents: [mainSha]
      })
    });

    if (!createCommitRes.ok) {
      const error = await createCommitRes.text();
      throw new Error(`Failed to create commit: ${error}`);
    }
    const commitData = await createCommitRes.json();

    // 3e. Update the branch reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: commitData.sha,
        force: true
      })
    });

    if (!updateRefRes.ok) {
      const error = await updateRefRes.text();
      throw new Error(`Failed to update branch reference: ${error}`);
    }

    // 4. Create a Pull Request
    const prRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Solution for Task ${taskId}`,
        head: branchName,
        base: 'main',
        body: `This PR adds the refactored JavaScript solution for ARC task ${taskId}.\n\n### Solution Summary\n${solutionSummary}`
      })
    });

    if (!prRes.ok) {
      const errorData = await prRes.json();
      if (errorData.errors && errorData.errors[0].message.includes('A pull request already exists')) {
          // If PR exists, find it and return the link
          const existingPrsRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls?head=${OWNER}:${branchName}&state=open`, {
              headers: { 'Authorization': `token ${githubToken}` }
          });
          const existingPrs = await existingPrsRes.json();
          if (existingPrs.length > 0) {
              return {
                  statusCode: 200,
                  body: JSON.stringify({ prUrl: existingPrs[0].html_url, alreadyExisted: true })
              };
          }
      }
      throw new Error(`Failed to create PR: ${errorData.message}`);
    }

    const prData = await prRes.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ prUrl: prData.html_url })
    };

  } catch (error: any) {
    console.error('Publish error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };
