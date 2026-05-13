import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { CodeFile } from '../agents/types.js';

export async function writeOutputFiles(files: CodeFile[], outputDir: string): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const absPath = join(outputDir, file.path);
    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, file.content, 'utf-8');
    written.push(file.path);
  }
  return written;
}
