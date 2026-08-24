import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type BadgeProps = {
  label: string;
  tone?: 'success' | 'danger' | 'primary' | 'neutral';
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors, radius, spacing, typography } = useAppTheme();

  const toneStyle = {
    success: { bg: colors.successMuted, fg: colors.success },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    neutral: { bg: colors.surface, fg: colors.textMuted },
  }[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: toneStyle.bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs / 2,
        },
      ]}>
      <Text style={{ color: toneStyle.fg, fontSize: typography.xs.fontSize, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
});
