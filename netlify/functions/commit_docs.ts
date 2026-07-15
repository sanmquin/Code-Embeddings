import { Handler } from '@netlify/functions';
import { GITHUB_OWNER as OWNER, GITHUB_REPO as REPO } from '../../src/constants';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN is not set' }) };
  }

  try {
    const { taskId, explanation, branchName } = JSON.parse(event.body || '{}');

    if (!taskId || !explanation || !branchName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing taskId, explanation, or branchName' }) };
    }

    let parentSha = '';

    // 1. Check if branch exists
    const checkBranchRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${branchName}`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });

    if (checkBranchRes.ok) {
      const branchData = await checkBranchRes.json();
      parentSha = branchData.object.sha;
    } else {
      // Branch does not exist. Get SHA of main branch.
      const mainBranchRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/main`, {
        headers: { 'Authorization': `token ${githubToken}` }
      });

      if (!mainBranchRes.ok) {
        const error = await mainBranchRes.text();
        throw new Error(`Failed to get main branch ref: ${error}`);
      }
      const mainBranchData = await mainBranchRes.json();
      const mainSha = mainBranchData.object.sha;
      parentSha = mainSha;

      // Create branch
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
      }
    }

    // 2. Fetch current SOLUTIONS.md if it exists on the branch
    const fileRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/SOLUTIONS.md?ref=${branchName}`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });

    let solutionsContent = '# ARC Python Solutions Documentation\n\nThis file contains automatically generated explanations of ARC puzzle solutions in Python.\n';
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      solutionsContent = Buffer.from(fileData.content, 'base64').toString('utf8');
    }

    // Append new solution explanation
    solutionsContent += `\n\n## Task ${taskId}\n\n${explanation}\n`;

    // 3. Create a tree with the new/updated SOLUTIONS.md
    const treeItems = [
      {
        path: 'SOLUTIONS.md',
        mode: '100644',
        type: 'blob',
        content: solutionsContent
      }
    ];

    const createTreeRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base_tree: parentSha,
        tree: treeItems
      })
    });

    if (!createTreeRes.ok) {
      const error = await createTreeRes.text();
      throw new Error(`Failed to create tree: ${error}`);
    }
    const treeData = await createTreeRes.json();

    // 4. Create commit
    const createCommitRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Document Python solution for task ${taskId}`,
        tree: treeData.sha,
        parents: [parentSha]
      })
    });

    if (!createCommitRes.ok) {
      const error = await createCommitRes.text();
      throw new Error(`Failed to create commit: ${error}`);
    }
    const commitData = await createCommitRes.json();
    const newCommitSha = commitData.sha;

    // 5. Update branch reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: true
      })
    });

    if (!updateRefRes.ok) {
      const error = await updateRefRes.text();
      throw new Error(`Failed to update branch reference: ${error}`);
    }

    // 6. Check/Create Pull Request
    let prUrl = '';
    const pullsRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls?head=${OWNER}:${branchName}&state=open`, {
      headers: { 'Authorization': `token ${githubToken}` }
    });

    if (pullsRes.ok) {
      const pullsData = await pullsRes.json();
      if (pullsData.length > 0) {
        prUrl = pullsData[0].html_url;
      }
    }

    if (!prUrl) {
      const createPrRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Batch Python Solutions Documentation`,
          head: branchName,
          base: 'main',
          body: `This PR adds automatically generated documentation for a batch of ARC puzzle Python solutions to SOLUTIONS.md.`
        })
      });

      if (createPrRes.ok) {
        const prData = await createPrRes.json();
        prUrl = prData.html_url;
      } else {
        const errorData = await createPrRes.json();
        if (errorData.errors && errorData.errors[0].message.includes('A pull request already exists')) {
          const existingPrsRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls?head=${OWNER}:${branchName}&state=open`, {
            headers: { 'Authorization': `token ${githubToken}` }
          });
          const existingPrs = await existingPrsRes.json();
          if (existingPrs.length > 0) {
            prUrl = existingPrs[0].html_url;
          }
        } else {
          throw new Error(`Failed to create PR: ${errorData.message}`);
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, prUrl, commitSha: newCommitSha })
    };

  } catch (error: any) {
    console.error('Commit documentation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };
