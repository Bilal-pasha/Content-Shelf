/**
 * @nestjs/jwt's `expiresIn` option is typed against the `ms` package's
 * template-literal `StringValue` type, which a plain `string` read from env
 * doesn't satisfy. This is the one place that cast happens, instead of a
 * scattered `as any` at every call site.
 */

export function toJwtExpiresIn(value: string): any {
  return value;
}
