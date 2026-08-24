import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HORZ_PADDING } from './constants';
import { FiltersSheet } from './FiltersSheet';
import type { LinkSource, LinkCategory } from '@/services/links/links.types';

export function DashboardFilters({
  source,
  category,
  onSourceChange,
  onCategoryChange,
  iconColor,
}: {
  source: '' | LinkSource;
  category: '' | LinkCategory;
  onSourceChange: (s: '' | LinkSource) => void;
  onCategoryChange: (c: '' | LinkCategory) => void;
  iconColor: string;
}) {
  const [open, setOpen] = useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#2D2D2D' }, 'icon');
  const tintColor = useThemeColor({ light: '#2563EB', dark: '#60A5FA' }, 'tint');

  const activeCount = Number(Boolean(source)) + Number(Boolean(category));
  const hasFilters = activeCount > 0;

  return (
    <>
      <Animated.View entering={FadeIn.delay(120).duration(400)} style={styles.wrap}>
        <Pressable
          onPress={() => setOpen(true)}
          style={[
            styles.trigger,
            {
              borderColor: hasFilters ? tintColor : borderColor,
              backgroundColor: hasFilters
                ? `${tintColor}15`
                : 'rgba(0,0,0,0.03)',
            },
          ]}>
          <SlidersHorizontal size={16} color={hasFilters ? tintColor : iconColor} />
          <ThemedText
            style={[styles.triggerText, hasFilters && { color: tintColor, fontWeight: '700' }]}>
            Filters
          </ThemedText>
          {hasFilters && (
            <View style={[styles.badge, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.badgeText}>{activeCount}</ThemedText>
            </View>
          )}
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
        iconColor={iconColor}
        borderColor={borderColor}
        backgroundColor={backgroundColor}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: HORZ_PADDING, marginBottom: 20 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  triggerText: { fontSize: 14, fontWeight: '600' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
