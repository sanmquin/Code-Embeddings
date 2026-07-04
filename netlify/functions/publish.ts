import { Handler } from '@netlify/functions';

const OWNER = 'sanmquin';
const REPO = 'Code-Embeddings';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN is not set' }) };
  }

  try {
    const { taskId, code } = JSON.parse(event.body || '{}');
    if (!taskId || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId or code' }) };
    }

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

    // 3. Create or update the file
    // First, check if file exists to get its SHA (if updating)
    const fileRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${branchName}`, {
        headers: { 'Authorization': `token ${githubToken}` }
    });

    let fileSha: string | undefined;
    if (fileRes.ok) {
        const fileData = await fileRes.json();
        fileSha = fileData.sha;
    }

    const commitRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add refactored solution for task ${taskId}`,
        content: Buffer.from(code).toString('base64'),
        branch: branchName,
        sha: fileSha
      })
    });

    if (!commitRes.ok) {
      const error = await commitRes.text();
      throw new Error(`Failed to commit file: ${error}`);
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
        body: `This PR adds the refactored JavaScript solution for ARC task ${taskId}.`
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
