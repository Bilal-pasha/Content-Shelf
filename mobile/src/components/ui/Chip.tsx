import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Per-item brand accent (e.g. platform color) overriding the default primary. */
  accentColor?: string;
  showCheck?: boolean;
  style?: object;
};

/**
 * Selectable pill used for category/platform choices. Label color is always
 * set explicitly for both states — this is what the plain-`<Text>` version
 * in AddLinkSheet got wrong (no color at all, invisible on dark surfaces).
 */
export function Chip({ label, selected, onPress, accentColor, showCheck = true, style }: ChipProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const accent = accentColor ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? accent : colors.border,
          backgroundColor: selected ? `${accent}22` : colors.surface,
          gap: spacing.sm,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}>
      <Text
        style={{
          color: selected ? colors.text : colors.textMuted,
          fontSize: typography.sm.fontSize,
          fontWeight: selected ? '700' : '600',
        }}>
        {label}
      </Text>
      {selected && showCheck && (
        <View style={[styles.checkWrap, { backgroundColor: colors.success }]}>
          <Check size={12} color={colors.textInverse} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
