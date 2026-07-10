import { Handler } from '@netlify/functions';
import { GITHUB_OWNER as OWNER, GITHUB_REPO as REPO } from '../../src/constants';

interface Example {
  name: string;
  description: string;
}

interface Cluster {
  title: string;
  description: string;
  examples: Example[];
}

const renderClustersToMarkdown = (clusters: Cluster[]): string => {
  let md = '# Function Clusters\n\n';
  md += 'This file contains logical groupings of modular functions used to solve ARC puzzles.\n\n';

  clusters.forEach((cluster) => {
    md += `## ${cluster.title}\n\n`;
    md += `${cluster.description}\n\n`;
    md += '### Examples:\n';
    cluster.examples.forEach((ex) => {
      md += `- **${ex.name}**: ${ex.description}\n`;
    });
    md += '\n---\n\n';
  });

  return md.trim();
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN is not set' }) };
  }

  try {
    const { clusters } = JSON.parse(event.body || '{}');

    if (!clusters || !Array.isArray(clusters)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid clusters data' }) };
    }

    const markdownContent = renderClustersToMarkdown(clusters);
    const branchName = 'feat/update-clusters';
    const filePath = 'CLUSTERS.md';

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

    // 3. Create a tree with the new file
    const treeItems = [
      {
        path: filePath,
        mode: '100644',
        type: 'blob',
        content: markdownContent
      }
    ];

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

    // 4. Create a commit
    const createCommitRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update function clusters documentation',
        tree: treeData.sha,
        parents: [mainSha]
      })
    });

    if (!createCommitRes.ok) {
      const error = await createCommitRes.text();
      throw new Error(`Failed to create commit: ${error}`);
    }
    const commitData = await createCommitRes.json();

    // 5. Update the branch reference
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

    // 6. Create a Pull Request
    const prRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Update Function Clusters',
        head: branchName,
        base: 'main',
        body: 'This PR updates the function clusters documentation in CLUSTERS.md based on recent analysis.'
      })
    });

    if (!prRes.ok) {
      const errorData = await prRes.json();
      if (errorData.errors && errorData.errors[0].message.includes('A pull request already exists')) {
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
    console.error('Publish clusters error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

export { handler };
