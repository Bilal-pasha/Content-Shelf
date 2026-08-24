import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...pressableProps
}: ButtonProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const isDisabled = disabled || loading;

  const variantStyle = {
    primary: { backgroundColor: colors.primary, borderWidth: 0 },
    secondary: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    danger: { backgroundColor: colors.danger, borderWidth: 0 },
  }[variant];

  const labelColor = {
    primary: colors.textInverse,
    secondary: colors.text,
    ghost: colors.primary,
    danger: colors.textInverse,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        {
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
      {...pressableProps}>
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: labelColor, fontSize: typography.sm.fontSize, lineHeight: typography.sm.lineHeight },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    fontWeight: '600',
  },
});
