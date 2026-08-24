import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { SOURCES, CATEGORIES } from './constants';
import type { LinkSource, LinkCategory } from '@/services/links/links.types';

export function FiltersSheet({
  visible,
  source,
  category,
  onSourceChange,
  onCategoryChange,
  onClear,
  onClose,
}: {
  visible: boolean;
  source: '' | LinkSource;
  category: '' | LinkCategory;
  onSourceChange: (s: '' | LinkSource) => void;
  onCategoryChange: (c: '' | LinkCategory) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const hasFilters = Boolean(source || category);

  const select = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: spacing.xl,
              paddingBottom: spacing.xxl,
            },
          ]}>
          <View style={[styles.header, { paddingHorizontal: spacing.xxl, marginBottom: spacing.lg }]}>
            <Text style={{ color: colors.text, fontSize: typography.xl.fontSize, fontWeight: typography.xl.fontWeight }}>
              Filters
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: colors.textMuted, paddingHorizontal: spacing.xxl, marginBottom: spacing.sm }]}>
            Platform
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.pillRow, { paddingHorizontal: spacing.xxl, marginBottom: spacing.xl, gap: spacing.md }]}>
            {SOURCES.map((item) => (
              <Chip
                key={item.key || 'all'}
                label={item.label}
                selected={source === item.key}
                showCheck={false}
                onPress={() => select(() => onSourceChange(item.key))}
              />
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textMuted, paddingHorizontal: spacing.xxl, marginBottom: spacing.sm }]}>
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.pillRow, { paddingHorizontal: spacing.xxl, marginBottom: spacing.xl, gap: spacing.md }]}>
            {CATEGORIES.map((item) => (
              <Chip
                key={item.key || 'all'}
                label={item.label}
                selected={category === item.key}
                showCheck={false}
                onPress={() => select(() => onCategoryChange(item.key))}
              />
            ))}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { borderColor: colors.border, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, gap: spacing.md },
            ]}>
            <View style={{ flex: 1 }}>
              <Button label="Clear all" variant="secondary" onPress={() => select(onClear)} disabled={!hasFilters} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Done" variant="primary" onPress={onClose} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: { padding: 4 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillRow: { flexDirection: 'row' },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});
