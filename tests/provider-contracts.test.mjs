import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mandatory capability ports exist', async () => {
  const source = await readFile('packages/capability-contracts/src/index.ts', 'utf8');
  for (const name of ['CachePort','EventBusPort','JobQueuePort','ObjectStoragePort','SearchPort','SecretProvider']) {
    assert.match(source, new RegExp(`interface ${name}\\b`));
  }
});

test('provider catalog exposes mandated providers', async () => {
  const source = await readFile('packages/platform-sdk/src/provider-registry.ts', 'utf8');
  for (const provider of ['redis','memory','none','sqs','bullmq','rabbitmq','sync','kafka','sns-sqs','outbox','opensearch','postgres','s3','minio','filesystem','eks','ecs','docker','local-ai','bedrock','external','disabled','aws-secrets-manager','vault','env']) assert.ok(source.includes(provider));
});
