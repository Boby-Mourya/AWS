import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const forbidden = [/@aws-sdk\//, /ioredis/, /kafkajs/, /bullmq/, /amqplib/, /@opensearch-project\//, /kubernetes/i];

async function walk(dir) {
  const out = [];
  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await walk(p));
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(p);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  return out;
}

test('domain and application code never imports infrastructure SDKs', async () => {
  const roots = ['packages/domain', 'services'];
  for (const root of roots) {
    for (const file of await walk(root)) {
      const source = await readFile(file, 'utf8');
      for (const rule of forbidden) assert.equal(rule.test(source), false, `${file} violates inward dependency rule`);
    }
  }
});
