import { ContextRequest } from "../interfaces/context";

export function validateContextRequest(input: any): { valid: boolean; errors?: string[]; normalized?: ContextRequest } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    errors.push('input must be an object');
    return { valid: false, errors };
  }
  if (!input.type || typeof input.type !== 'string') {
    errors.push('type is required and must be a string');
  }
  if (!('payload' in input)) {
    errors.push('payload is required');
  }

  if (errors.length) return { valid: false, errors };

  const normalized: ContextRequest = {
    id: input.id,
    type: input.type,
    payload: input.payload,
    metadata: input.metadata || {},
  };

  return { valid: true, normalized };
}
