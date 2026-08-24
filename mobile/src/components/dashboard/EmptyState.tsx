import { StyleSheet, Text } from 'react-native';
import { Film } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { HORZ_PADDING } from './constants';

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { colors, spacing, radius, typography } = useAppTheme();

  return (
    <Animated.View
      entering={FadeIn.delay(100).duration(400)}
      style={[
        styles.empty,
        {
          marginHorizontal: HORZ_PADDING,
          padding: spacing.xxxl,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}>
      <Film size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.sm.fontSize,
          textAlign: 'center',
          lineHeight: 22,
        }}>
        {hasFilters
          ? 'No videos match your filters.'
          : 'Share a link from Instagram, Facebook, Twitter, or TikTok to save it here.'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
  },
});
