export const PrivateRoutes = {
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  FOLDERS: '/folders',
} as const;

export const PublicRoutes = {
  WELCOME: '/welcome',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  SAVE: '/save',
} as const;