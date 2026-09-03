import { ContextService } from '../src/services/context.service';

describe('ContextService', () => {
  test('rejects invalid input', async () => {
    const orchestrator = { send: jest.fn() };
    const svc = new ContextService(orchestrator as any);
    const res = await svc.processRequest(null);
    expect(res.status).toBe('rejected');
  });

  test('forwards valid input to orchestrator', async () => {
    const orchestrator = { send: jest.fn().mockResolvedValue({ ok: true }) };
    const svc = new ContextService(orchestrator as any);
    const res = await svc.processRequest({ type: 't', payload: {} });
    expect(res.status).toBe('processed');
    expect(orchestrator.send).toHaveBeenCalled();
  });
});
