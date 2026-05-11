import type { Plugin } from '../types.js';

interface WebSearchInput {
  query: string;
}

export const webSearchPlugin: Plugin = {
  id: 'web_search',
  name: 'Web Search',
  role: 'all',
  tool: {
    name: 'web_search',
    description: 'Search the web for relevant information.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  handler(input, _context) {
    const { query } = input as WebSearchInput;
    return Promise.resolve(
      `[web_search] Query "${query}" — search API not configured. Set BRAVE_API_KEY to enable.`,
    );
  },
};
