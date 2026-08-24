import { useCallback, useState } from 'react';
import { StyleSheet, Pressable, Image, View, Platform, Text } from 'react-native';
import { Film } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import type { SavedLink } from '@/services/links/links.types';
import {
  SOURCE_COLORS,
  formatCategory,
  truncate,
} from './constants';

export function VideoBox({
  item,
  index,
  cardWidth,
  onPress,
}: {
  item: SavedLink;
  index: number;
  cardWidth: number;
  onPress: () => void;
}) {
  const { colors, radius, spacing, typography, shadow } = useAppTheme();
  const title = item.title || truncate(item.url, 45);
  const badgeColor = SOURCE_COLORS[item.source] ?? SOURCE_COLORS.other;
  const [imgError, setImgError] = useState(false);
  const [pressed, setPressed] = useState(false);
  const showThumb = Boolean(item.thumbnailUrl) && !imgError;
  const handleImgError = useCallback(() => setImgError(true), []);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50)
        .duration(380)
        .springify()
        .damping(14)}>
      <Pressable
        style={[
          styles.videoBox,
          {
            width: cardWidth,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.92 : 1,
            ...shadow.card,
          },
        ]}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress}>
        <View style={[styles.thumbWrap, { aspectRatio: 16 / 9, borderRadius: radius.md }]}>
          {showThumb ? (
            <Image
              source={{ uri: item.thumbnailUrl! }}
              style={styles.thumbImage}
              resizeMode="cover"
              onError={handleImgError}
            />
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: colors.surface }]}>
              <Film size={32} color={colors.textMuted} />
            </View>
          )}
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeColor, borderRadius: radius.sm, top: spacing.sm, left: spacing.sm, paddingHorizontal: spacing.sm },
            ]}>
            <Text style={{ color: colors.textInverse, fontSize: typography.xs.fontSize, fontWeight: '600' }}>
              {formatCategory(item.source) || 'Link'}
            </Text>
          </View>
          {item.category ? (
            <View
              style={[
                styles.categoryChip,
                {
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: radius.sm,
                  bottom: spacing.sm,
                  right: spacing.sm,
                  paddingHorizontal: spacing.sm,
                },
              ]}>
              <Text style={{ color: '#fff', fontSize: typography.xs.fontSize, fontWeight: '500' }}>
                {formatCategory(item.category)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: spacing.md }}>
          <Text
            style={{ color: colors.text, fontSize: typography.sm.fontSize, fontWeight: '500', lineHeight: 20 }}
            numberOfLines={2}>
            {title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  videoBox: {
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 3 },
    }),
  },
  thumbWrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    paddingVertical: 4,
  },
  categoryChip: {
    position: 'absolute',
    paddingVertical: 4,
  },
});
