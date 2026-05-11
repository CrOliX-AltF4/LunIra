import type { Plugin } from '../types.js';

interface GithubIssueInput {
  title: string;
  body: string;
  labels?: string[];
}

export const githubCreateIssuePlugin: Plugin = {
  id: 'github_create_issue',
  name: 'GitHub Create Issue',
  role: 'qa',
  tool: {
    name: 'github_create_issue',
    description: 'Open a GitHub issue with the QA report when verdict is FAIL.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'body'],
    },
  },
  handler(input, _context) {
    const { title, body, labels = [] } = input as GithubIssueInput;
    return Promise.resolve(
      `[github_create_issue] Stub: would create issue "${title}" labels=[${labels.join(', ')}]. Body: ${body.slice(0, 200)}`,
    );
  },
};
