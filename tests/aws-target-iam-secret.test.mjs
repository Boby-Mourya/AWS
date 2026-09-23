import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const policyPath='infrastructure/terraform/aws-target/iam-execution-secret.tf';

test('ECS execution role can read only the RDS-managed database secret and decrypt platform KMS data',async()=>{
  const source=await readFile(policyPath,'utf8');
  for(const token of ['secretsmanager:GetSecretValue','master_user_secret[0].secret_arn','kms:Decrypt','aws_kms_key.platform.arn'])assert.ok(source.includes(token),`missing ${token}`);
  assert.equal(source.includes('secretsmanager:*'),false);
  assert.equal(source.includes('kms:*'),false);
  assert.equal(source.includes('AdministratorAccess'),false);
  assert.equal(source.includes('Resource = "*"'),false);
});
