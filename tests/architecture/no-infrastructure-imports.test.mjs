import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const forbiddenInfrastructure = [
  /@aws-sdk\//,
  /ioredis/,
  /kafkajs/,
  /bullmq/,
  /amqplib/,
  /@opensearch-project\//,
  /kubernetes/i,
  /@platform\/adapter-/,
  /(?:^|[/'"])adapters\//,
  /(?:^|[/'"])infrastructure\//
];

async function walk(dir) {
  const out = [];
  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await walk(p));
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(p);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return out;
}

async function serviceBoundaryRoots() {
  const roots = [];
  try {
    for (const entry of await readdir('services', { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      roots.push(join('services', entry.name, 'src', 'domain'));
      roots.push(join('services', entry.name, 'src', 'application'));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return roots;
}

test('domain and application layers never import infrastructure implementations', async () => {
  const roots = ['packages/domain', ...(await serviceBoundaryRoots())];
  for (const root of roots) {
    for (const file of await walk(root)) {
      const source = await readFile(file, 'utf8');
      for (const rule of forbiddenInfrastructure) {
        assert.equal(rule.test(source), false, `${file} violates inward dependency rule: ${rule}`);
      }
    }
  }
});

test('capability contracts stay infrastructure-neutral', async () => {
  for (const file of await walk('packages/capability-contracts')) {
    const source = await readFile(file, 'utf8');
    for (const rule of forbiddenInfrastructure) {
      assert.equal(rule.test(source), false, `${file} leaks infrastructure into a stable port contract: ${rule}`);
    }
  }
});
