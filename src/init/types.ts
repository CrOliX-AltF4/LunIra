export type ProjectType = 'frontend' | 'fullstack' | 'cli' | 'lib';

export const VALID_PROJECT_TYPES: readonly ProjectType[] = ['frontend', 'fullstack', 'cli', 'lib'];

export const PROJECT_TYPE_STACKS: Record<ProjectType, string> = {
  frontend: 'Vite · React · TypeScript · CSS Modules',
  fullstack: 'Next.js · TypeScript',
  cli: 'Node.js · Commander · Ink · TypeScript',
  lib: 'TypeScript (pure library)',
};

export interface ScaffoldOptions {
  name: string;
  type: ProjectType;
  targetDir: string;
  skipInstall?: boolean;
}

export interface ScaffoldFile {
  path: string;
  content: string;
}
