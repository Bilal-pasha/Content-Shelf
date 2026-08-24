import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { HORZ_PADDING, CARD_GAP } from './constants';

function SkeletonCard({
  width,
  tint,
  opacity,
}: {
  width: number;
  tint: string;
  opacity: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{ width, marginBottom: CARD_GAP }}>
      <Animated.View
        style={[
          styles.thumb,
          { aspectRatio: 16 / 9, backgroundColor: tint },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[styles.line, { width: '80%', backgroundColor: tint }, animatedStyle]}
      />
      <Animated.View
        style={[styles.line, { width: '50%', backgroundColor: tint }, animatedStyle]}
      />
    </View>
  );
}

export function SkeletonGrid({
  columns,
  cardWidth,
  rows = 2,
}: {
  columns: number;
  cardWidth: number;
  rows?: number;
}) {
  const { colors } = useAppTheme();
  const tint = colors.surface;
  const count = columns * rows;
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 600 }),
        withTiming(0.4, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, [opacity]);

  return (
    <View
      style={[
        styles.grid,
        {
          paddingHorizontal: columns > 1 ? HORZ_PADDING : 0,
          gap: CARD_GAP,
        },
      ]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{ paddingHorizontal: columns === 1 ? HORZ_PADDING : 0 }}>
          <SkeletonCard width={cardWidth} tint={tint} opacity={opacity} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  thumb: { width: '100%', borderRadius: 14, marginBottom: 8 },
  line: { height: 10, borderRadius: 5, marginBottom: 6 },
});
