import { useMemo } from 'react';

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Single entry point for the design system: colors for the active scheme
 * plus the shared spacing/radius/typography/shadow scales. Use this instead
 * of ad-hoc `useThemeColor({light:'#..', dark:'#..'}, key)` calls so colors
 * stay centralized in constants/theme.ts.
 */
export function useAppTheme() {
  const scheme = useColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';

  return useMemo(
    () => ({
      scheme,
      isDark,
      colors: Colors[scheme],
      spacing: Spacing,
      radius: Radius,
      typography: Typography,
      shadow: {
        card: Shadows.card[scheme],
        sheet: Shadows.sheet[scheme],
      },
    }),
    [scheme, isDark],
  );
}
