import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { Badge } from '@/components/ui/Badge';
import { HORZ_PADDING } from './constants';
import { FiltersSheet } from './FiltersSheet';
import type { LinkSource, LinkCategory } from '@/services/links/links.types';

export function DashboardFilters({
  source,
  category,
  onSourceChange,
  onCategoryChange,
}: {
  source: '' | LinkSource;
  category: '' | LinkCategory;
  onSourceChange: (s: '' | LinkSource) => void;
  onCategoryChange: (c: '' | LinkCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const { colors, spacing, radius, typography } = useAppTheme();

  const activeCount = Number(Boolean(source)) + Number(Boolean(category));
  const hasFilters = activeCount > 0;

  return (
    <>
      <Animated.View
        entering={FadeIn.delay(120).duration(400)}
        style={{ paddingHorizontal: HORZ_PADDING, marginBottom: spacing.xl }}>
        <Pressable
          onPress={() => setOpen(true)}
          style={[
            styles.trigger,
            {
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: hasFilters ? colors.primary : colors.border,
              backgroundColor: hasFilters ? colors.primaryMuted : colors.surface,
            },
          ]}>
          <SlidersHorizontal size={16} color={hasFilters ? colors.primary : colors.textMuted} />
          <Text
            style={{
              color: hasFilters ? colors.primary : colors.text,
              fontSize: typography.sm.fontSize,
              fontWeight: hasFilters ? '700' : '600',
            }}>
            Filters
          </Text>
          {hasFilters && <Badge label={String(activeCount)} tone="primary" />}
        </Pressable>
      </Animated.View>

      <FiltersSheet
        visible={open}
        source={source}
        category={category}
        onSourceChange={onSourceChange}
        onCategoryChange={onCategoryChange}
        onClear={() => {
          onSourceChange('');
          onCategoryChange('');
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
