import Fastify from 'fastify';
import { ChangeStateMachine, operationSemantics, type ControlOperation } from './change-machine.js';
import { InMemoryControlStore } from './store.js';

const app = Fastify({ logger: true, bodyLimit: 1024 * 256 });
const machine = new ChangeStateMachine();
const store = new InMemoryControlStore();

app.get('/health', async () => ({ status:'HEALTHY', service:'platform-control-api' }));
app.get('/v1/control/overview', async () => ({ environment:process.env.PLATFORM_ENV ?? 'development', region:process.env.AWS_REGION ?? 'ap-south-1', health:'HEALTHY', configVersion:1, drift:'UNKNOWN' }));
app.get('/v1/control/changes', async () => ({ items:store.listChanges() }));
app.post<{Body:{environment:string;actorId:string;operation:ControlOperation;capability:string;desired:Record<string,unknown>}}>('/v1/control/changes', async (request, reply) => {
  const body = request.body;
  const semantics = operationSemantics(body.operation);
  if (body.operation === 'destroy-infrastructure') return reply.code(409).send({ error:{code:'DESTRUCTIVE_ACTION_REQUIRES_ORCHESTRATOR',message:semantics.description,requestId:request.id} });
  const change = machine.create({ ...body });
  store.saveChange(change);
  return reply.code(201).send(change);
});
app.get('/v1/control/audit', async () => ({ items:store.auditHistory() }));
app.get('/v1/control/secrets', async () => ({ items:[], note:'Only secret metadata is exposed. Plaintext values are never returned.' }));

if (process.env.NODE_ENV !== 'test') app.listen({ port:Number(process.env.PORT ?? 4100), host:'0.0.0.0' });
export { app, machine, store };
