import { StyleSheet, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { HORZ_PADDING } from './constants';

export function DashboardSearch({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();

  return (
    <Animated.View
      entering={FadeIn.delay(80).duration(400)}
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          marginHorizontal: HORZ_PADDING,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          marginBottom: spacing.lg,
          gap: spacing.md,
        },
      ]}>
      <Search size={18} color={colors.textMuted} />
      <TextInput
        style={[styles.input, { color: colors.text, fontSize: typography.base.fontSize }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, paddingVertical: 0 },
});
