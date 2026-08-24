/**
 * Design tokens for the app: semantic colors, spacing, typography, radius,
 * and shadow presets. Dark is the primary/flagship theme (Linear/Vercel-style
 * minimal dark UI); light is a fully-specified but secondary fallback for
 * users with the OS set to light mode.
 */

import { Platform } from 'react-native';

const primaryLight = '#2563EB';
const primaryDark = '#60A5FA';

export const Colors = {
  light: {
    background: '#F7F8FA',
    surface: '#EEF0F3',
    surfaceElevated: '#FFFFFF',
    border: '#D8DCE2',
    borderSubtle: '#E8EAED',
    text: '#11181C',
    textMuted: '#6B7280',
    textInverse: '#FFFFFF',
    primary: primaryLight,
    primaryMuted: 'rgba(37,99,235,0.10)',
    success: '#16A34A',
    successMuted: 'rgba(22,163,74,0.12)',
    danger: '#DC2626',
    dangerMuted: 'rgba(220,38,38,0.10)',
    warning: '#D97706',
    // Legacy keys kept for any not-yet-migrated call sites.
    tint: primaryLight,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: primaryLight,
  },
  dark: {
    background: '#0B0D0F',
    surface: '#15171A',
    surfaceElevated: '#1B1E22',
    border: '#262A2E',
    borderSubtle: '#1D2024',
    text: '#ECEDEE',
    textMuted: '#8B9198',
    textInverse: '#0B0D0F',
    primary: primaryDark,
    primaryMuted: 'rgba(96,165,250,0.14)',
    success: '#34D399',
    successMuted: 'rgba(52,211,153,0.14)',
    danger: '#F87171',
    dangerMuted: 'rgba(248,113,113,0.14)',
    warning: '#FBBF24',
    // Legacy keys kept for any not-yet-migrated call sites.
    tint: primaryDark,
    icon: '#8B9198',
    tabIconDefault: '#8B9198',
    tabIconSelected: primaryDark,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

type TypeScale = { fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700' };

export const Typography: Record<
  'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xxl' | 'display',
  TypeScale
> = {
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  sm: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  base: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  lg: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  xl: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  xxl: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  display: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
};

export const Shadows = {
  // React Native shadow props only render on iOS (shadowColor/Offset/etc.);
  // `elevation` is the Android equivalent — both included per preset.
  card: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
  },
  sheet: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 16,
    },
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
