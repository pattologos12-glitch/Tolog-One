import { ContextRequest } from "../interfaces/context";
import { hashToken } from "../utils/hash";

/**
 * Asynchronously hash sensitive fields in the payload.
 * This walks the payload tree and replaces string values for keys
 * like 'password', 'pwd', 'token', 'secret' with a secure hash.
 */
export async function hashSensitiveFields(input: ContextRequest): Promise<ContextRequest> {
  const cloned: ContextRequest = JSON.parse(JSON.stringify(input));

  async function walk(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    const keys = Object.keys(obj);
    for (const k of keys) {
      const v = obj[k];
      if (v == null) continue;
      const keyLower = k.toLowerCase();
      if (['password', 'pwd', 'token', 'secret'].includes(keyLower) && typeof v === 'string') {
        // replace raw with hashed value using project's hashToken function
        try {
          obj[k] = await hashToken(v);
        } catch (e) {
          // on error, fallback to removing the value to avoid leaking raw secret
          obj[k] = null;
        }
      } else if (typeof v === 'object') {
        await walk(v);
      }
    }
  }

  await walk(cloned.payload);
  return cloned;
}
