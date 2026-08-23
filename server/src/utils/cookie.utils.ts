import type { Response } from 'express';
import { COOKIE_NAMES } from '../common/constants/app.constants';

/**
 * Parses a time string (e.g., "1h", "7d") to milliseconds
 * @param expiresIn - Time string in format: number + unit (s, m, h, d)
 * @returns Time in milliseconds, defaults to 1 hour if parsing fails
 */
export function parseExpiresInToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 3600000; // Default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 3600000);
}

/**
 * Sets HTTP-only cookies for access and refresh tokens
 * @param res - Express response object
 * @param accessToken - JWT access token
 * @param refreshToken - JWT refresh token
 * @param isProduction - Whether the app is running in production
 * @param accessTokenExpiresIn - Access token expiration time (e.g., "1h")
 * @param refreshTokenExpiresIn - Refresh token expiration time (e.g., "7d")
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean,
  accessTokenExpiresIn: string,
  refreshTokenExpiresIn: string,
): void {
  // Parse expires in to milliseconds
  const accessTokenMaxAge = parseExpiresInToMs(accessTokenExpiresIn);
  const refreshTokenMaxAge = parseExpiresInToMs(refreshTokenExpiresIn);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: accessTokenMaxAge,
    path: '/',
  });

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: refreshTokenMaxAge,
    path: '/',
  });
}

/**
 * Clears authentication cookies from the response
 * @param res - Express response object
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
}
