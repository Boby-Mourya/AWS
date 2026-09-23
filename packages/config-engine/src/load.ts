import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import type { DesiredState } from './types.js';
import { assertValidDesiredState } from './validate.js';

export async function loadDesiredStateFile(path: string): Promise<DesiredState> {
  const raw = await readFile(path, 'utf8');
  const value = YAML.parse(raw) as DesiredState;
  assertValidDesiredState(value);
  return value;
}
