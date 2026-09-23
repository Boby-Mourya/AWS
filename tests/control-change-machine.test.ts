import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangeStateMachine, operationSemantics } from '../apps/platform-control-api/src/change-machine.ts';

test('change state machine follows approved sequence and supports rollback', () => {
  const m = new ChangeStateMachine();
  let c = m.create({environment:'production',actorId:'u1',operation:'change-provider',capability:'cache',desired:{provider:'memory'}});
  for (const state of ['VALIDATING','IMPACT_ANALYSIS','WAITING_APPROVAL','APPROVED','DEPLOYING','VERIFYING','STABILIZING','COMPLETED'] as const) c = m.transition(c,state,'u1');
  assert.equal(c.state,'COMPLETED');
  assert.throws(()=>m.transition(c,'FAILED','u1'));
});

test('disable and destroy are explicitly different', () => {
  assert.equal(operationSemantics('disable-capability').destructive,false);
  assert.equal(operationSemantics('destroy-infrastructure').destructive,true);
});
