import { ContextRequest } from "../interfaces/context";
import { hashToken } from "../utils/hash";

/**
 * Asynchronously hash sensitive fields in the payload.
 * Walks the payload tree and replaces sensitive values.
 * Throws a secure error on hashing failure to prevent fallback leaks.
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
        try {
          obj[k] = await hashToken(v);
        } catch (e) {
          // Security standard: never fallback to raw values or null silently on crypto errors
          throw new Error(`Critical hashing failure for key '${k}': secure sanitation aborted.`);
        }
      } else if (typeof v === 'object') {
        await walk(v);
      }
    }
  }

  await walk(cloned.payload);
  return cloned;
}
