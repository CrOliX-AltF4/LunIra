export const projectConfigSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'lunatar.config.schema.json',
  title: 'LunAtar Project Config',
  type: 'object',
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    skills: {
      type: 'object',
      additionalProperties: false,
      properties: {
        all: { type: 'array', items: { type: 'string' } },
        po: { type: 'array', items: { type: 'string' } },
        planner: { type: 'array', items: { type: 'string' } },
        dev: { type: 'array', items: { type: 'string' } },
        qa: { type: 'array', items: { type: 'string' } },
        external: { type: 'array', items: { type: 'string' } },
      },
    },
    plugins: {
      type: 'object',
      additionalProperties: false,
      properties: {
        all: { type: 'array', items: { type: 'string' } },
        po: { type: 'array', items: { type: 'string' } },
        planner: { type: 'array', items: { type: 'string' } },
        dev: { type: 'array', items: { type: 'string' } },
        qa: { type: 'array', items: { type: 'string' } },
        external: { type: 'array', items: { type: 'string' } },
      },
    },
    models: {
      type: 'object',
      additionalProperties: false,
      properties: {
        po: { type: 'string' },
        planner: { type: 'string' },
        dev: { type: 'string' },
        qa: { type: 'string' },
      },
    },
    providers: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fallback: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;
