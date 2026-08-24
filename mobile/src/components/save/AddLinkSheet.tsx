import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Link2 } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import type { LinkCategory, LinkSource } from '@/services/links/links.types';

const CATEGORY_OPTIONS: { key: LinkCategory; label: string }[] = [
  { key: 'nature', label: 'Nature' },
  { key: 'cooking', label: 'Cooking' },
  { key: 'food', label: 'Food' },
  { key: 'sports', label: 'Sports' },
  { key: 'music', label: 'Music' },
  { key: 'tech', label: 'Tech' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'other', label: 'Other' },
];

const SOURCE_OPTIONS: { key: LinkSource; label: string; color: string }[] = [
  { key: 'instagram', label: 'Instagram', color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'twitter', label: 'Twitter', color: '#1DA1F2' },
  { key: 'tiktok', label: 'TikTok', color: '#525252' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'other', label: 'Other', color: '#6B7280' },
];

function truncateUrl(str: string, max = 56): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

export function AddLinkSheet({
  visible,
  url,
  category,
  source,
  onCategoryChange,
  onSourceChange,
  onUrlChange,
  onSave,
  onCancel,
  isSaving,
  error,
}: {
  visible: boolean;
  url: string;
  category: LinkCategory | null;
  source: LinkSource | null;
  onCategoryChange: (c: LinkCategory) => void;
  onSourceChange: (s: LinkSource | null) => void;
  onUrlChange?: (u: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  const urlEditable = Boolean(onUrlChange);
  const { colors, spacing, radius, typography, shadow, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [closePressed, setClosePressed] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const win = useWindowDimensions();
  const fallback = Dimensions.get('window');
  const width = win.width > 0 ? win.width : fallback.width;
  const height = win.height > 0 ? win.height : fallback.height;

  // Structural breakpoints only — sheet height and grid column count
  // genuinely need to respond to available space. Padding/type sizing
  // below uses fixed design-system tokens instead of per-size ternaries.
  const isShort = height < 700;
  const sheetHeight = isShort ? Math.min(height * 0.9, height - 40) : Math.min(height * 0.85, 680);
  const sheetWidth = Math.min(width - spacing.xxl, 500);
  const contentWidth = sheetWidth - spacing.xxl * 2;
  const categoryColumns = contentWidth < 260 ? 2 : contentWidth < 340 ? 3 : contentWidth < 420 ? 4 : 5;
  const categoryTileWidth = (contentWidth - spacing.md * (categoryColumns - 1)) / categoryColumns;
  const urlTruncate = width < 360 ? 50 : width < 400 ? 60 : 72;

  const backdropOpacity = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });

  const canSave = Boolean(category) && !(urlEditable && !url.trim()) && !isSaving;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.backdrop, { backgroundColor: backdropOpacity, opacity: fadeAnim }]}>
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
          <View
            style={[
              styles.header,
              { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
            ]}>
            <View style={styles.headerRow}>
              <View style={[styles.titleRow, { gap: spacing.md }]}>
                <View
                  style={[
                    styles.titleIcon,
                    { backgroundColor: colors.primaryMuted, borderRadius: radius.md },
                  ]}>
                  <Link2 size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: typography.xl.fontSize,
                      fontWeight: typography.xl.fontWeight,
                    }}>
                    Add Video
                  </Text>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: typography.xs.fontSize,
                      marginTop: 2,
                    }}>
                    Save your favorite content
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
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* URL preview */}
            <View style={{ marginBottom: spacing.xxl }}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: spacing.md }]}>
                VIDEO LINK
              </Text>
              <View
                style={[
                  styles.urlCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    gap: spacing.md,
                  },
                ]}>
                <View
                  style={[
                    styles.urlIconWrap,
                    { backgroundColor: colors.primary, borderRadius: radius.sm },
                  ]}>
                  <Link2 size={14} color={colors.textInverse} strokeWidth={2.5} />
                </View>
                {urlEditable ? (
                  <TextInput
                    style={[styles.urlText, { color: colors.text, fontSize: typography.sm.fontSize }]}
                    value={url}
                    onChangeText={onUrlChange}
                    placeholder="Paste a video link…"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="done"
                  />
                ) : (
                  <Text
                    style={[styles.urlText, { color: colors.text, fontSize: typography.sm.fontSize }]}
                    numberOfLines={isShort ? 1 : 2}>
                    {url ? truncateUrl(url, urlTruncate) : 'No link provided'}
                  </Text>
                )}
              </View>
            </View>

            {/* Category — required */}
            <View style={{ marginBottom: spacing.xxl }}>
              <View style={[styles.labelRow, { marginBottom: spacing.md }]}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  CATEGORY <Text style={{ color: colors.danger }}>*</Text>
                </Text>
                {category && <Badge label="Selected" tone="success" />}
              </View>
              <View style={[styles.grid, { gap: spacing.md }]}>
                {CATEGORY_OPTIONS.map(({ key, label }) => (
                  <Chip
                    key={key}
                    label={label}
                    selected={category === key}
                    onPress={() => onCategoryChange(key)}
                    style={{ width: categoryTileWidth }}
                  />
                ))}
              </View>
            </View>

            {/* Platform — optional */}
            <View style={{ marginBottom: spacing.xl }}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: spacing.md }]}>
                PLATFORM{' '}
                <Text style={{ color: colors.textMuted, textTransform: 'none', fontWeight: '500' }}>
                  (optional)
                </Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingVertical: 4 }}>
                {SOURCE_OPTIONS.map(({ key, label, color: accent }) => (
                  <Chip
                    key={key}
                    label={label}
                    selected={source === key}
                    accentColor={accent}
                    onPress={() => onSourceChange(source === key ? null : key)}
                  />
                ))}
              </ScrollView>
            </View>

            {error ? (
              <View
                style={{
                  backgroundColor: colors.dangerMuted,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}>
                <Text style={{ color: colors.danger, fontSize: typography.sm.fontSize, fontWeight: '600', textAlign: 'center' }}>
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
              <Button label="Cancel" variant="secondary" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Save Video" variant="primary" onPress={onSave} disabled={!canSave} loading={isSaving} />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  urlIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});
