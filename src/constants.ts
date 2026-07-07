export const GITHUB_OWNER = 'sanmquin';
export const GITHUB_REPO = 'Matrix';
export const GEMINI_MODEL = 'gemini-1.5-flash';

export const ARC_REPO_BASE = 'https://raw.githubusercontent.com/sanmquin/ARC/refs/heads/main';

export const getArcPythonUrlPatterns = (id: string) => [
  `${ARC_REPO_BASE}/solves/${id}/solver.py`,
  `${ARC_REPO_BASE}/solves/${id}/solve.py`,
  `${ARC_REPO_BASE}/solves/${id}.py`
];

export const getArcJsonUrl = (id: string) => `${ARC_REPO_BASE}/dataset/tasks/${id}.json`;
