export const DEFAULT_PORT = 8000;

// Fail closed: an explicit, comma-separated allowlist only. Never reflect an
// arbitrary Origin back with credentials enabled — that combination lets any
// site make authenticated requests using the visitor's cookies.
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const CORS_CONFIG = {
  ORIGIN: allowedOrigins,
  CREDENTIALS: true,
};

export const VALIDATION_CONFIG = {
  WHITELIST: true,
  FORBID_NON_WHITELISTED: true,
};

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;
