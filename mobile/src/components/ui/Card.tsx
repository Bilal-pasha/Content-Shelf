import { View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type CardProps = ViewProps & {
  elevated?: boolean;
};

/** Token-based surface container — replaces ad-hoc bordered/tinted `View`s. */
export function Card({ elevated = false, style, ...rest }: CardProps) {
  const { colors, radius, spacing } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
      {...rest}
    />
  );
}
