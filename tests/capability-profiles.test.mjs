import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async p => JSON.parse(await readFile(p, 'utf8'));

test('all mandated deployment profiles exist', async () => {
  const profiles = await readJson('config/profiles.json');
  assert.deepEqual(Object.keys(profiles), ['local','minimal','standard','high-availability','enterprise','ai-enterprise']);
});

test('primary database cannot be disabled and optional providers have fallbacks', async () => {
  const catalog = await readJson('config/capability-catalog.json');
  assert.equal(catalog.database.disable, 'never');
  for (const name of ['cache','distributed_lock','idempotency','queue','event_bus','search','ai']) assert.ok(catalog[name].fallback, `${name} needs fallback`);
});
