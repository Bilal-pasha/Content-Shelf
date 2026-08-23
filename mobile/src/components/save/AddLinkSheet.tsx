import React, { useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Text,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Link2, Check, Sparkles } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  { key: 'tiktok', label: 'TikTok', color: '#000000' },
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
  onSave,
  onCancel,
  isSaving,
  error,
  backgroundColor,
  textColor,
  iconColor,
  inputBg,
  borderColor,
}: {
  visible: boolean;
  url: string;
  category: LinkCategory | null;
  source: LinkSource | null;
  onCategoryChange: (c: LinkCategory) => void;
  onSourceChange: (s: LinkSource | null) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  inputBg: string;
  borderColor: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const primaryColor = useThemeColor(
    { light: '#2563EB', dark: '#60A5FA' },
    'tint',
  );
  const errorColor = useThemeColor(
    { light: '#DC2626', dark: '#F87171' },
    'text',
  );
  const saveBtnTextColor = '#FFFFFF';
  const insets = useSafeAreaInsets();

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const sparkleRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);

      // Start entrance animations
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 7,
        }),
      ]).start();

      // Continuous sparkle rotation
      Animated.loop(
        Animated.timing(sparkleRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [visible]);

  const sparkleRotation = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const win = useWindowDimensions();
  const fallback = Dimensions.get('window');
  const width = win.width > 0 ? win.width : fallback.width;
  const height = win.height > 0 ? win.height : fallback.height;

  // Screen size breakpoints
  const isVeryNarrow = width < 340;
  const isNarrow = width < 380;
  const isVeryShort = height < 600;  // Very small phones
  const isShort = height < 700;      // Small phones
  const isMedium = height >= 700 && height < 850;  // Standard phones
  const isTall = height >= 850;      // Large phones/tablets

  // Dynamic height calculation based on screen size
  const getSheetHeight = () => {
    if (isVeryShort) {
      // For very small screens, use more of the available space
      return Math.min(height * 0.92, height - 40);
    } else if (isShort) {
      // For small screens
      return Math.min(height * 0.88, height - 60);
    } else if (isMedium) {
      // For medium screens
      return Math.min(height * 0.85, 650);
    } else {
      // For tall screens, cap at reasonable height
      return Math.min(height * 0.82, 720);
    }
  };

  const sheetWidth = Math.min(width - (isVeryNarrow ? 16 : isNarrow ? 24 : 32), 500);
  const sheetMaxHeight = getSheetHeight();
  const bodyPadding = isVeryNarrow ? 16 : isNarrow ? 20 : 24;
  const sheetPadding = isVeryNarrow ? 16 : isNarrow ? 20 : 24;
  const categoryGap = isVeryNarrow ? 12 : isNarrow ? 14 : 16;

  // Adjust section margins based on available height
  const sectionMargin = isVeryShort ? 14 : isShort ? 18 : isMedium ? 24 : 28;

  const contentWidth = sheetWidth - sheetPadding * 2;
  const categoryColumns =
    contentWidth < 260 ? 2 : contentWidth < 340 ? 3 : contentWidth < 420 ? 4 : 5;
  const categoryTileWidth =
    (contentWidth - bodyPadding * 2 - categoryGap * (categoryColumns - 1)) / categoryColumns;

  // Adjust padding based on screen size
  const tilePaddingV = isVeryShort ? 10 : isVeryNarrow ? 12 : isNarrow ? 14 : 16;
  const tilePaddingH = isVeryNarrow ? 12 : isNarrow ? 14 : 18;
  const tileFontSize = isVeryNarrow ? 13 : isNarrow ? 14 : 15;
  const labelFontSize = isVeryShort ? 11 : isVeryNarrow ? 12 : isNarrow ? 13 : 14;
  const labelMarginBottom = isVeryShort ? 8 : isVeryNarrow ? 10 : 12;
  const sourceTileMinWidth = isVeryNarrow ? 90 : isNarrow ? 100 : 110;
  const urlTruncate = width < 360 ? 50 : width < 400 ? 60 : 72;

  const gradientColors =
    isDark ? (['#38BDF8', '#0EA5E9'] as const) : (['#3B82F6', '#2563EB'] as const);
  const gradientDisabled =
    isDark ? (['#4B5563', '#374151'] as const) : (['#D1D5DB', '#9CA3AF'] as const);
  const backdropOpacity = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)';

  // Adjust footer padding based on screen size and safe area
  const footerBottom = isVeryShort
    ? Math.max(insets.bottom, 12)
    : Math.max(insets.bottom, 16);

  const optionShadow = isDark
    ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    }
    : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    };

  // Adjust button height based on screen size
  const footerBtnHeight = isVeryShort ? 44 : isVeryNarrow ? 48 : isNarrow ? 52 : 56;

  // Calculate total footer height for scroll padding
  const footerPaddingTop = isVeryShort ? 12 : isVeryNarrow ? 16 : isNarrow ? 18 : 20;
  const totalFooterHeight = footerBtnHeight + footerPaddingTop + footerBottom + 2; // +2 for border

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetMaxHeight, 0],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: backdropOpacity, opacity: fadeAnim },
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor,
              width: sheetWidth,
              height: sheetMaxHeight,
              paddingHorizontal: 0,
              paddingTop: 0,
              paddingBottom: 0,
              transform: [{ translateY }, { scale: scaleAnim }],
              ...(isDark
                ? { borderTopWidth: 1.5, borderColor: borderColor }
                : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 24,
                  elevation: 16,
                }),
            },
          ]}>
          {/* Header with gradient accent */}
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: isVeryNarrow ? 16 : isNarrow ? 20 : 24,
                paddingTop: isVeryShort ? 6 : isVeryNarrow ? 8 : 10,
                paddingBottom: isVeryShort ? 10 : isVeryNarrow ? 14 : 16,
              },
            ]}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerAccent}
            />
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <View style={styles.titleIconWrap}>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.titleIcon,
                      (isVeryShort || isVeryNarrow) && { width: 38, height: 38 },
                    ]}>
                    <Animated.View style={{ transform: [{ rotate: sparkleRotation }] }}>
                      <Sparkles
                        size={isVeryShort || isVeryNarrow ? 18 : 22}
                        color="#FFF"
                        strokeWidth={2}
                      />
                    </Animated.View>
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="subtitle"
                    style={[
                      styles.title,
                      {
                        fontSize: isVeryShort ? 17 : isVeryNarrow ? 18 : isNarrow ? 20 : 22,
                      },
                    ]}>
                    Add Video
                  </ThemedText>
                  {!isVeryShort && (
                    <ThemedText
                      style={[
                        styles.subtitle,
                        {
                          color: iconColor,
                          fontSize: isVeryNarrow ? 11 : 13,
                        },
                      ]}>
                      Save your favorite content
                    </ThemedText>
                  )}
                </View>
              </View>
              <Pressable
                onPress={onCancel}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: inputBg,
                    borderWidth: 1,
                    borderColor: borderColor,
                    width: isVeryShort || isVeryNarrow ? 36 : 42,
                    height: isVeryShort || isVeryNarrow ? 36 : 42,
                    borderRadius: isVeryShort || isVeryNarrow ? 18 : 21,
                  },
                  pressed && styles.pressed,
                ]}>
                <X size={isVeryShort || isVeryNarrow ? 17 : 20} color={iconColor} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={[
              styles.bodyContent,
              {
                paddingHorizontal: bodyPadding,
                paddingTop: isVeryShort ? 8 : 12,
                paddingBottom: isVeryShort ? 16 : 20,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}>
            {/* URL preview */}
            <View style={[styles.section, { marginBottom: sectionMargin }]}>
              <ThemedText
                style={[
                  styles.sectionLabel,
                  {
                    color: iconColor,
                    fontSize: labelFontSize,
                    marginBottom: labelMarginBottom,
                  },
                ]}>
                VIDEO LINK
              </ThemedText>
              <View
                style={[
                  styles.urlCard,
                  {
                    backgroundColor: isDark ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.05)',
                    borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(96,165,250,0.2)' : 'rgba(37,99,235,0.15)',
                    paddingVertical: isVeryShort ? tilePaddingV - 2 : tilePaddingV,
                    paddingHorizontal: tilePaddingH,
                    borderRadius: isVeryShort ? 14 : isNarrow ? 16 : 18,
                  },
                  !isDark && {
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                ]}>
                <View style={[
                  styles.urlIconWrap,
                  {
                    backgroundColor: primaryColor,
                    width: isVeryShort ? 28 : 32,
                    height: isVeryShort ? 28 : 32,
                    borderRadius: isVeryShort ? 8 : 10,
                  }
                ]}>
                  <Link2
                    size={isVeryShort ? 13 : isVeryNarrow ? 14 : 16}
                    color="#FFF"
                    strokeWidth={2.5}
                  />
                </View>
                <ThemedText
                  style={[
                    styles.urlText,
                    {
                      color: textColor,
                      fontSize: isVeryShort ? 12 : isVeryNarrow ? 13 : 14,
                    },
                  ]}
                  numberOfLines={isVeryShort ? 1 : 2}>
                  {url ? truncateUrl(url, urlTruncate) : 'No link provided'}
                </ThemedText>
              </View>
            </View>

            {/* Category – required, responsive grid with option backgrounds */}
            <View style={[styles.section, { marginBottom: sectionMargin }]}>
              <View style={styles.labelRow}>
                <ThemedText
                  style={[
                    styles.sectionLabel,
                    {
                      color: iconColor,
                      fontSize: labelFontSize,
                      marginBottom: labelMarginBottom,
                    },
                  ]}>
                  CATEGORY <Text style={{ color: errorColor, fontSize: labelFontSize + 1 }}>*</Text>
                </ThemedText>
                {category && (
                  <View style={[styles.requiredBadge, { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)' }]}>
                    <Check size={10} color="#22C55E" strokeWidth={3} />
                    <Text style={[styles.requiredBadgeText, { color: '#22C55E' }]}>Selected</Text>
                  </View>
                )}
              </View>
              <View style={[styles.categoryGrid, { gap: categoryGap }]}>
                {CATEGORY_OPTIONS.map(({ key, label }) => {
                  const active = category === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => onCategoryChange(key)}
                      style={({ pressed }) => [
                        styles.categoryTile,
                        {
                          width: categoryTileWidth,
                          paddingVertical: tilePaddingV,
                          paddingHorizontal: tilePaddingH,
                          borderRadius: isNarrow ? 14 : 16,
                          borderColor: active ? primaryColor : borderColor,
                          borderWidth: active ? 2 : 1.5,
                          backgroundColor: active
                            ? primaryColor
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.02)',
                          ...optionShadow,
                        },
                        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                      ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Text style={{ fontSize: tileFontSize, fontWeight: active ? '700' : '600' }}>{label}</Text>
                        {active && (
                          <View style={styles.checkWrap}>
                            <Check size={12} color={'#fff'} strokeWidth={3} />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Platform – optional, horizontal row with option backgrounds */}
            <View style={[styles.section, { marginBottom: sectionMargin }]}>
              <ThemedText
                style={[
                  styles.sectionLabel,
                  {
                    color: iconColor,
                    fontSize: labelFontSize,
                    marginBottom: labelMarginBottom,
                  },
                ]}>
                PLATFORM <Text style={[styles.optional, { color: iconColor, opacity: 0.7 }]}>(optional)</Text>
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: categoryGap, paddingVertical: 4, paddingRight: bodyPadding }}>
                {SOURCE_OPTIONS.map(({ key, label, color: accent }) => {
                  const active = source === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => onSourceChange(active ? null : key)}
                      style={({ pressed }) => [
                        styles.sourceTile,
                        {
                          minWidth: sourceTileMinWidth,
                          paddingVertical: tilePaddingV,
                          paddingHorizontal: tilePaddingH,
                          borderRadius: isNarrow ? 14 : 16,
                          borderColor: active ? accent : borderColor,
                          borderWidth: active ? 2 : 1.5,
                          backgroundColor: active
                            ? isDark
                              ? `${accent}20`
                              : `${accent}15`
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.02)',
                          ...optionShadow,
                        },
                        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                      ]}>
                      <View
                        style={[styles.sourceBar, { backgroundColor: accent }]}
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Text style={{ fontSize: tileFontSize, fontWeight: active ? '700' : '600' }}>{label}</Text>
                        {active && (
                          <View style={styles.checkWrap}>
                            <Check size={12} color={'#fff'} strokeWidth={3} />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' }]}>
                <Text style={[styles.errorText, { color: errorColor }]}>⚠️ {error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer - Fixed at bottom */}
          <View
            style={[
              styles.footer,
              {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor,
                borderTopColor: borderColor,
                paddingHorizontal: bodyPadding,
                paddingTop: footerPaddingTop,
                paddingBottom: footerBottom,
                gap: isVeryShort ? 8 : isVeryNarrow ? 10 : 12,
                ...(!isDark && {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 8,
                }),
              },
            ]}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.cancelBtn,
                {
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: borderColor,
                  height: footerBtnHeight,
                  borderRadius: isVeryShort ? 12 : isNarrow ? 14 : 16,
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}>
              <ThemedText
                style={[
                  styles.cancelBtnText,
                  {
                    color: textColor,
                    fontSize: isVeryShort ? 14 : isVeryNarrow ? 15 : 16,
                    fontWeight: '600'
                  },
                ]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={!category || isSaving}
              style={({ pressed }) => [
                styles.footerBtn,
                {
                  height: footerBtnHeight,
                  borderRadius: isVeryShort ? 12 : isNarrow ? 14 : 16,
                },
                (!category || isSaving) && { opacity: 0.5 },
                pressed && category && !isSaving && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}>
              <LinearGradient
                colors={category && !isSaving ? gradientColors : gradientDisabled}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveGradientBg}>
                <View style={styles.saveBtnContent}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={saveBtnTextColor} />
                  ) : (
                    <>
                      <Check size={isVeryShort ? 18 : 20} color={saveBtnTextColor} strokeWidth={2.5} />
                      <Text
                        style={[
                          styles.saveBtnText,
                          {
                            color: saveBtnTextColor,
                            fontSize: isVeryShort ? 14 : isVeryNarrow ? 15 : 16,
                          },
                        ]}>
                        Save Video
                      </Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    flexDirection: 'column',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  titleIconWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  titleIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  optional: { fontWeight: '500', textTransform: 'none' },
  urlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  urlIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  urlIcon: { marginRight: 10 },
  urlText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryTile: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  checkWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#50C878',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 0,
    paddingRight: 14,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: 110,
  },
  sourceBar: {
    width: 5,
    alignSelf: 'stretch',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: 12,
  },
  errorContainer: {
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1.5,
  },
  footerBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {},
  cancelBtnText: {
    fontWeight: '600',
  },
  saveGradientBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
