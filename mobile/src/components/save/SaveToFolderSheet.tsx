import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, FolderPlus, Link2 } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FolderIcon } from '@/components/folders/folder-icons';
import type { Folder, FolderSuggestion } from '@/services/folders/folders.types';

export type FolderSelection = { folderId?: string; folderName?: string } | null;

function truncateUrl(str: string, max = 56): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

export function SaveToFolderSheet({
  visible,
  url,
  folders,
  foldersLoading,
  suggestion,
  suggestionLoading,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  url: string;
  folders: Folder[];
  foldersLoading: boolean;
  suggestion: FolderSuggestion | undefined;
  suggestionLoading: boolean;
  isSaving: boolean;
  error: string | null;
  /** null = save without a folder (Skip / dismiss). */
  onSubmit: (selection: FolderSelection) => void;
  onCancel: () => void;
}) {
  const { colors, spacing, radius, typography, shadow, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [closePressed, setClosePressed] = useState(false);
  // Once the user picks anything, stop letting the async suggestion move it.
  const touched = useRef(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      touched.current = false;
      setSelectedId(null);
      setCreating(false);
      setNewName('');
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Apply the auto-suggestion once, and only if the user hasn't chosen yet.
  useEffect(() => {
    if (!visible || touched.current || !suggestion) return;
    if (suggestion.folderId) {
      setSelectedId(suggestion.folderId);
    } else if (suggestion.folderName) {
      setCreating(true);
      setNewName(suggestion.folderName);
    }
  }, [visible, suggestion]);

  const win = useWindowDimensions();
  const fallback = Dimensions.get('window');
  const width = win.width > 0 ? win.width : fallback.width;
  const height = win.height > 0 ? win.height : fallback.height;

  const isShort = height < 700;
  const sheetHeight = isShort ? Math.min(height * 0.9, height - 40) : Math.min(height * 0.8, 620);
  const sheetWidth = Math.min(width - spacing.xxl, 500);
  const urlTruncate = width < 360 ? 44 : width < 400 ? 54 : 66;

  const backdropColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });

  const trimmedNew = newName.trim();
  const existingMatch = useMemo(
    () =>
      folders.find(
        (f) => f.name.trim().toLowerCase() === trimmedNew.toLowerCase(),
      ),
    [folders, trimmedNew],
  );

  const handlePickFolder = (id: string) => {
    touched.current = true;
    setCreating(false);
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const handleStartCreating = () => {
    touched.current = true;
    setSelectedId(null);
    setCreating(true);
  };

  const canSubmit = creating ? trimmedNew.length > 0 : Boolean(selectedId);

  const handleSave = () => {
    if (isSaving) return;
    if (creating) {
      if (!trimmedNew) return;
      if (existingMatch) {
        onSubmit({ folderId: existingMatch.id });
      } else {
        onSubmit({ folderName: trimmedNew });
      }
      return;
    }
    if (selectedId) onSubmit({ folderId: selectedId });
  };

  const primaryLabel = creating
    ? existingMatch
      ? 'Save'
      : 'Create & Save'
    : 'Save';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.backdrop, { backgroundColor: backdropColor, opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              width: sheetWidth,
              height: sheetHeight,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              transform: [{ translateY }],
              borderTopWidth: 1,
              borderColor: colors.border,
              ...shadow.sheet,
            },
          ]}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border, marginTop: spacing.md }]} />

          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg }]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.xl.fontSize,
                    fontWeight: typography.xl.fontWeight,
                  }}>
                  Save to folder
                </Text>
                <View style={[styles.urlRow, { marginTop: spacing.xs, gap: spacing.xs }]}>
                  <Link2 size={12} color={colors.textMuted} strokeWidth={2.5} />
                  <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }} numberOfLines={1}>
                    {url ? truncateUrl(url, urlTruncate) : 'No link'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onCancel}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPressIn={() => setClosePressed(true)}
                onPressOut={() => setClosePressed(false)}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.pill,
                    opacity: closePressed ? 0.7 : 1,
                  },
                ]}>
                <X size={18} color={colors.textMuted} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{
              paddingHorizontal: spacing.xxl,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
              gap: spacing.sm,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {foldersLoading ? (
              <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              folders.map((folder) => {
                const selected = selectedId === folder.id && !creating;
                const isSuggested = suggestion?.folderId === folder.id;
                return (
                  <Pressable
                    key={folder.id}
                    onPress={() => handlePickFolder(folder.id)}
                    style={[
                      styles.folderRow,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        borderWidth: selected ? 2 : 1,
                        backgroundColor: selected ? colors.primaryMuted : colors.surface,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        gap: spacing.md,
                      },
                    ]}>
                    <View
                      style={[
                        styles.folderIconWrap,
                        { backgroundColor: `${folder.color}22`, borderRadius: radius.sm },
                      ]}>
                      <FolderIcon icon={folder.icon} color={folder.color} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: colors.text, fontSize: typography.sm.fontSize, fontWeight: '600' }}
                        numberOfLines={1}>
                        {folder.name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize }}>
                        {folder.linkCount} {folder.linkCount === 1 ? 'video' : 'videos'}
                      </Text>
                    </View>
                    {isSuggested && !selected && <Badge label="Suggested" tone="primary" />}
                    {selected && (
                      <View style={[styles.check, { backgroundColor: colors.primary }]}>
                        <Check size={13} color={colors.textInverse} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}

            {/* New folder */}
            {creating ? (
              <View
                style={[
                  styles.folderRow,
                  {
                    borderColor: colors.primary,
                    borderWidth: 2,
                    backgroundColor: colors.primaryMuted,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.md,
                  },
                ]}>
                <View
                  style={[
                    styles.folderIconWrap,
                    { backgroundColor: colors.primary, borderRadius: radius.sm },
                  ]}>
                  <FolderPlus size={18} color={colors.textInverse} strokeWidth={2.5} />
                </View>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Folder name"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  maxLength={50}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: typography.sm.fontSize,
                    fontWeight: '600',
                    paddingVertical: spacing.xs,
                  }}
                />
                {suggestionLoading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
            ) : (
              <Pressable
                onPress={handleStartCreating}
                style={[
                  styles.folderRow,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    backgroundColor: 'transparent',
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.md,
                  },
                ]}>
                <View
                  style={[
                    styles.folderIconWrap,
                    { backgroundColor: colors.surface, borderRadius: radius.sm },
                  ]}>
                  <FolderPlus size={18} color={colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '700' }}>
                  New folder
                </Text>
                {suggestionLoading && !folders.length && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </Pressable>
            )}

            {error ? (
              <View
                style={{
                  backgroundColor: colors.dangerMuted,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.xs,
                }}>
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: typography.sm.fontSize,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.surfaceElevated,
                borderTopColor: colors.border,
                paddingHorizontal: spacing.xxl,
                paddingTop: spacing.lg,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
                gap: spacing.md,
              },
            ]}>
            <View style={{ flex: 1 }}>
              <Button
                label="Skip"
                variant="secondary"
                onPress={() => onSubmit(null)}
                disabled={isSaving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={primaryLabel}
                variant="primary"
                onPress={handleSave}
                disabled={!canSubmit}
                loading={isSaving}
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { flexDirection: 'column', overflow: 'hidden' },
  dragHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  header: {},
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  urlRow: { flexDirection: 'row', alignItems: 'center' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  folderRow: { flexDirection: 'row', alignItems: 'center' },
  folderIconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', borderTopWidth: 1 },
});
