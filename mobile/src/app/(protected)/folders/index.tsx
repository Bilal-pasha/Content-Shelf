import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/hooks/use-app-theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import {
  FolderIcon,
  ICON_OPTIONS,
  COLOR_OPTIONS,
} from '@/components/folders/folder-icons';
import {
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '@/services/folders/folders.services';
import type { Folder } from '@/services/folders/folders.types';

type Editing = { mode: 'create' } | { mode: 'edit'; folder: Folder } | null;

export default function FoldersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography } = useAppTheme();

  const { data: folders = [], isLoading } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const [editing, setEditing] = useState<Editing>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setFormError(null);
    if (editing.mode === 'edit') {
      setName(editing.folder.name);
      setIcon(editing.folder.icon);
      setColor(editing.folder.color);
    } else {
      setName('');
      setIcon(ICON_OPTIONS[0]);
      setColor(COLOR_OPTIONS[0]);
    }
  }, [editing]);

  const busy =
    createFolder.isPending || updateFolder.isPending || deleteFolder.isPending;

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Give the folder a name.');
      return;
    }
    setFormError(null);
    const payload = { name: trimmed, icon, color };
    const onDone = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(null);
    };
    const onFail = (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setFormError(
        status === 409
          ? 'A folder with that name already exists.'
          : 'Could not save. Try again.',
      );
    };

    if (editing?.mode === 'edit') {
      updateFolder.mutate({ id: editing.folder.id, ...payload }, { onSuccess: onDone, onError: onFail });
    } else {
      createFolder.mutate(payload, { onSuccess: onDone, onError: onFail });
    }
  }, [name, icon, color, editing, createFolder, updateFolder]);

  const handleDelete = useCallback(() => {
    if (editing?.mode !== 'edit') return;
    const folder = editing.folder;
    Alert.alert(
      `Delete "${folder.name}"?`,
      folder.linkCount > 0
        ? `${folder.linkCount} ${folder.linkCount === 1 ? 'video stays' : 'videos stay'} saved — they just won't be in a folder anymore.`
        : 'This folder is empty.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteFolder.mutate(folder.id, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setEditing(null);
              },
            }),
        },
      ],
    );
  }, [editing, deleteFolder]);

  const renderItem = useCallback(
    ({ item }: { item: Folder }) => (
      <Pressable
        onPress={() => setEditing({ mode: 'edit', folder: item })}
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.lg,
            gap: spacing.md,
          },
        ]}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: `${item.color}22`, borderRadius: radius.sm },
          ]}>
          <FolderIcon icon={item.icon} color={item.color} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: typography.base.fontSize, fontWeight: '600' }} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
            {item.linkCount} {item.linkCount === 1 ? 'video' : 'videos'}
          </Text>
        </View>
      </Pressable>
    ),
    [colors, radius, spacing, typography],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top || 40 }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: typography.xl.fontSize, fontWeight: typography.xl.fontWeight }}>
          Folders
        </Text>
        <Pressable
          onPress={() => setEditing({ mode: 'create' })}
          accessibilityLabel="New folder"
          style={[
            styles.newBtn,
            { backgroundColor: colors.primary, borderRadius: radius.pill, gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
          ]}>
          <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={{ color: colors.textInverse, fontSize: typography.sm.fontSize, fontWeight: '700' }}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(f) => f.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.huge, fontSize: typography.sm.fontSize }}>
              No folders yet. Tap “New” to create one, or pick a folder when you
              share a video.
            </Text>
          ) : null
        }
      />

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.xl,
                padding: spacing.xl,
                gap: spacing.lg,
                paddingBottom: Math.max(insets.bottom, spacing.xl),
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: colors.text, fontSize: typography.lg.fontSize, fontWeight: typography.lg.fontWeight }}>
                {editing?.mode === 'edit' ? 'Edit folder' : 'New folder'}
              </Text>
              <Pressable onPress={() => setEditing(null)} hitSlop={12}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.preview, { gap: spacing.md }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${color}22`, borderRadius: radius.md, width: 44, height: 44 }]}>
                <FolderIcon icon={icon} color={color} size={24} />
              </View>
              <Text style={{ color: colors.text, fontSize: typography.base.fontSize, fontWeight: '600' }}>
                {name.trim() || 'Folder name'}
              </Text>
            </View>

            <TextField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cooking"
              maxLength={50}
              autoFocus={editing?.mode === 'create'}
              error={formError}
            />

            <View>
              <Text style={[styles.pickerLabel, { color: colors.textMuted, marginBottom: spacing.sm }]}>ICON</Text>
              <View style={[styles.pickerGrid, { gap: spacing.sm }]}>
                {ICON_OPTIONS.map((key) => {
                  const active = key === icon;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setIcon(key)}
                      style={[
                        styles.pickerCell,
                        {
                          borderRadius: radius.md,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primaryMuted : colors.surface,
                        },
                      ]}>
                      <FolderIcon icon={key} color={active ? colors.primary : colors.textMuted} size={18} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.pickerLabel, { color: colors.textMuted, marginBottom: spacing.sm }]}>COLOR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {COLOR_OPTIONS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: c,
                        borderRadius: radius.pill,
                        borderWidth: c === color ? 3 : 0,
                        borderColor: colors.text,
                      },
                    ]}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Button
                label={editing?.mode === 'edit' ? 'Save changes' : 'Create folder'}
                onPress={handleSave}
                loading={busy}
              />
              {editing?.mode === 'edit' && (
                <Pressable
                  onPress={handleDelete}
                  disabled={busy}
                  style={[styles.deleteRow, { gap: spacing.xs, paddingVertical: spacing.md }]}>
                  <Trash2 size={16} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: typography.sm.fontSize, fontWeight: '600' }}>
                    Delete folder
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  newBtn: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { flexDirection: 'row', alignItems: 'center' },
  pickerLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pickerCell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
