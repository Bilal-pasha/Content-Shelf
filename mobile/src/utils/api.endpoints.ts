export const API_ENDPOINTS = {
  AUTH_LOGIN: '/v1/api/auth/login',
  AUTH_SIGNUP: '/v1/api/auth/signup',
  AUTH_LOGOUT: '/v1/api/auth/logout',
  AUTH_TOKEN_REFRESH: '/v1/api/auth/token/refresh',
  AUTH_ME: '/v1/api/auth/me',
  AUTH_PROFILE: '/v1/api/auth/profile',
  AUTH_PASSWORD: '/v1/api/auth/password',
  AUTH_FORGOT_PASSWORD: '/v1/api/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/v1/api/auth/reset-password',
  AUTH_SOCIAL_GOOGLE: '/v1/api/auth/google',
  LINKS: '/v1/api/links',
  LINKS_LIST: '/v1/api/links',
} as const;