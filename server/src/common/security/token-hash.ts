import { createHash } from 'crypto';

/** SHA-256 hex digest — used to store a lookup-able hash of a bearer token/reset token, never the raw value. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
