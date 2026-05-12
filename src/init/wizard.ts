import { createInterface } from 'node:readline/promises';
import type { ProjectType } from './types.js';

const VALID_TYPES: ProjectType[] = ['cli', 'frontend', 'lib', 'fullstack'];

export function validateProjectName(name: string): true | string {
  if (!name) return 'Project name is required';
  if (!/^[a-z][a-z0-9-]*$/.test(name))
    return 'Project name must be lowercase letters, numbers, and hyphens only';
  return true;
}

export function validateProjectType(type: string): true | string {
  if (!VALID_TYPES.includes(type as ProjectType)) {
    return `Invalid type. Choose one of: ${VALID_TYPES.join(', ')}`;
  }
  return true;
}

export interface WizardResult {
  name: string;
  type: ProjectType;
}

export async function runWizard(): Promise<WizardResult> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write("\nLun'Atar — New Project\n\n");

  let name = '';
  let nameValid: true | string = 'init';
  while (nameValid !== true) {
    name = (await rl.question('Project name (lowercase-hyphen): ')).trim();
    nameValid = validateProjectName(name);
    if (nameValid !== true) process.stdout.write(`  ✗ ${nameValid}\n`);
  }

  process.stdout.write(`\nProject type:\n  1) cli\n  2) frontend\n  3) lib\n  4) fullstack\n`);
  let type: ProjectType = 'cli';
  let typeValid: true | string = 'init';
  while (typeValid !== true) {
    const input = (await rl.question('Type (cli/frontend/lib/fullstack): ')).trim();
    typeValid = validateProjectType(input);
    if (typeValid === true) {
      type = input as ProjectType;
    } else {
      process.stdout.write(`  ✗ ${typeValid}\n`);
    }
  }

  rl.close();
  return { name, type };
}
