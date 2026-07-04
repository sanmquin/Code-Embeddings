# GitHub Setup for Code-Embeddings

To enable the "Publish to GitHub" feature, you need to provide a GitHub Personal Access Token (PAT) with appropriate permissions.

## 1. Generate a GitHub Personal Access Token

1.  Log in to your GitHub account.
2.  Navigate to **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
3.  Click **Generate new token** > **Generate new token (classic)**.
4.  Give your token a descriptive **Note** (e.g., "Code-Embeddings Publisher").
5.  Select the **repo** scope. This allows the application to:
    -   Read repository data.
    -   Create branches.
    -   Commit files.
    -   Create Pull Requests.
6.  Click **Generate token** at the bottom of the page.
7.  **Copy the token immediately.** You won't be able to see it again.

## 2. Configure Environment Variables

### Local Development
1.  Create a `.env` file in the root of the project (you can copy `.env.example`).
2.  Add your token to the `.env` file:
    ```env
    GITHUB_TOKEN=your_generated_token_here
    ```

### Netlify Deployment
1.  Go to your site's dashboard on Netlify.
2.  Navigate to **Site settings** > **Environment variables**.
3.  Click **Add a variable** > **Import from .env** or **Add a single variable**.
4.  Enter `GITHUB_TOKEN` as the key and your token as the value.
5.  Trigger a new deploy for the changes to take effect.

## Security Note
Keep your `GITHUB_TOKEN` secret. Never commit your `.env` file or expose the token in client-side code. The application uses Netlify Functions to interact with the GitHub API securely from the backend.
