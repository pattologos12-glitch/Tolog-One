import { hashSensitiveFields } from '../src/validators/_hashing_helper';

describe('hashSensitiveFields', () => {
  test('hashes sensitive fields and leaves others intact', async () => {
    const input = {
      id: '1',
      type: 'test',
      payload: {
        password: 's3cr3t',
        nested: { token: 'abc123' },
        safe: 'keep-me'
      }
    };

    const result = await hashSensitiveFields(input as any);
    expect(result.payload.password).not.toBe('s3cr3t');
    expect(result.payload.nested.token).not.toBe('abc123');
    expect(result.payload.safe).toBe('keep-me');
  });
});
