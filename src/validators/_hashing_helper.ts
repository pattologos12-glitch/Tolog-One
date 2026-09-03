import { ContextRequest } from "../interfaces/context";
import { hashToken } from "./../utils/hash";

/**
 * Example: hash any keys named 'secret', 'token' or 'password' inside payload
 */
export async function hashSensitiveFields(input: ContextRequest): Promise<ContextRequest> {
  const cloned: ContextRequest = JSON.parse(JSON.stringify(input));

  function walk(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v == null) continue;
      const keyLower = k.toLowerCase();
      if (['password', 'pwd', 'token', 'secret'].includes(keyLower) && typeof v === 'string') {
        // replace raw with hashed placeholder
        obj[k] = 'hashed:' + (Math.random().toString(36).slice(2,10));
        // In production use hashToken(v) and store only the hash
        // obj[k] = await hashToken(v);
      } else if (typeof v === 'object') {
        walk(v);
      }
    }
  }

  walk(cloned.payload);
  return cloned;
}
