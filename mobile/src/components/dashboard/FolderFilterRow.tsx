import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { FolderCog, Layers } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { FolderIcon } from '@/components/folders/folder-icons';
import type { Folder } from '@/services/folders/folders.types';
import { HORZ_PADDING } from './constants';

export function FolderFilterRow({
  folders,
  selectedId,
  onSelect,
  onManage,
}: {
  folders: Folder[];
  selectedId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();

  if (folders.length === 0) {
    return (
      <Animated.View
        entering={FadeIn.delay(140).duration(400)}
        style={{ paddingHorizontal: HORZ_PADDING, marginBottom: spacing.xl }}>
        <Pressable
          onPress={onManage}
          style={[
            styles.chip,
            {
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.border,
            },
          ]}>
          <FolderCog size={16} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize, fontWeight: '600' }}>
            Organize with folders
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  const renderChip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
    leading?: React.ReactNode,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[
        styles.chip,
        {
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: active ? 2 : 1,
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primaryMuted : colors.surface,
        },
      ]}>
      {leading}
      <Text
        style={{
          color: active ? colors.primary : colors.textMuted,
          fontSize: typography.sm.fontSize,
          fontWeight: active ? '700' : '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View entering={FadeIn.delay(140).duration(400)} style={{ marginBottom: spacing.xl }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: HORZ_PADDING, gap: spacing.sm }}>
        <Pressable
          onPress={onManage}
          accessibilityLabel="Manage folders"
          style={[
            styles.chip,
            {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}>
          <FolderCog size={16} color={colors.textMuted} />
        </Pressable>

        {renderChip('all', 'All', selectedId === '', () => onSelect(''), (
          <Layers size={14} color={selectedId === '' ? colors.primary : colors.textMuted} />
        ))}

        {folders.map((f) =>
          renderChip(
            f.id,
            f.name,
            selectedId === f.id,
            () => onSelect(selectedId === f.id ? '' : f.id),
            <FolderIcon icon={f.icon} color={f.color} size={14} />,
          ),
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
