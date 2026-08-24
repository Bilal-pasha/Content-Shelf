import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FilterPill } from './FilterPill';
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
  iconColor,
  borderColor,
  backgroundColor,
}: {
  visible: boolean;
  source: '' | LinkSource;
  category: '' | LinkCategory;
  onSourceChange: (s: '' | LinkSource) => void;
  onCategoryChange: (c: '' | LinkCategory) => void;
  onClear: () => void;
  onClose: () => void;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
}) {
  const tintColor = useThemeColor({ light: '#2563EB', dark: '#60A5FA' }, 'tint');
  const hasFilters = Boolean(source || category);

  const select = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor, borderColor }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Filters
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              style={styles.closeBtn}>
              <X size={20} color={iconColor} />
            </Pressable>
          </View>

          <ThemedText style={[styles.label, { color: iconColor }]}>Platform</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}>
            {SOURCES.map((item) => (
              <FilterPill
                key={item.key || 'all'}
                item={item}
                active={source === item.key}
                onPress={() => select(() => onSourceChange(item.key))}
              />
            ))}
          </ScrollView>

          <ThemedText style={[styles.label, { color: iconColor }]}>Category</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}>
            {CATEGORIES.map((item) => (
              <FilterPill
                key={item.key || 'all'}
                item={item}
                active={category === item.key}
                onPress={() => select(() => onCategoryChange(item.key))}
              />
            ))}
          </ScrollView>

          <View style={[styles.footer, { borderColor }]}>
            <Pressable
              onPress={() => select(onClear)}
              disabled={!hasFilters}
              style={[styles.footerBtn, { opacity: hasFilters ? 1 : 0.4 }]}>
              <ThemedText style={styles.clearText}>Clear all</ThemedText>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.footerBtn, styles.doneBtn, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.doneText}>Done</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 15, fontWeight: '600' },
  doneBtn: {},
  doneText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
