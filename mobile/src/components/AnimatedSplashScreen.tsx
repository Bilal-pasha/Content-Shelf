import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

SplashScreen.preventAutoHideAsync().catch(() => {});

const BRAND_BG = '#2563EB';
const MIN_DISPLAY_MS = 1100;
const EXIT_DURATION_MS = 320;

interface AnimatedSplashScreenProps {
  /** Flip to true once the app has finished its real startup work (auth check, etc). */
  ready: boolean;
  children: ReactNode;
}

/**
 * Renders the app underneath an animated brand overlay that visually
 * continues the native splash (same background + mark), then hands off to
 * the app once both the entrance animation and real startup work are done.
 */
export function AnimatedSplashScreen({
  ready,
  children,
}: AnimatedSplashScreenProps) {
  const [overlayMounted, setOverlayMounted] = useState(true);
  const [nativeHidden, setNativeHidden] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const exitStartedRef = useRef(false);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0.4);
  const titleTranslateY = useSharedValue(10);
  const titleOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);

  // Swap the native splash for this overlay as soon as we can paint — both
  // start from the same icon at near-full opacity/scale, so the handoff
  // reads as one continuous motion instead of a native-splash-then-blank gap.
  useEffect(() => {
    SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => {
        shownAtRef.current = Date.now();
        setNativeHidden(true);
      });
  }, []);

  useEffect(() => {
    if (!nativeHidden) return;

    logoScale.value = withSpring(1, { damping: 13, stiffness: 180 });
    logoOpacity.value = withTiming(1, { duration: 260 });

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 }),
      ),
      -1,
      false,
    );

    titleTranslateY.value = withDelay(160, withSpring(0, { damping: 15, stiffness: 180 }));
    titleOpacity.value = withDelay(160, withTiming(1, { duration: 320 }));
  }, [nativeHidden]);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    overlayOpacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
    overlayScale.value = withTiming(
      1.04,
      { duration: EXIT_DURATION_MS, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(setOverlayMounted)(false);
      },
    );
  }, []);

  // Wait for both the entrance animation to finish and real startup work
  // (auth check, etc) to complete before handing off to the app.
  useEffect(() => {
    if (!nativeHidden || !ready) return;

    const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const timer = setTimeout(beginExit, remaining);

    return () => clearTimeout(timer);
  }, [nativeHidden, ready, beginExit]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  return (
    <View style={styles.fill}>
      {children}
      {overlayMounted && nativeHidden && (
        <Animated.View
          style={[styles.overlay, overlayStyle]}
          pointerEvents="none">
          <View style={styles.center}>
            <Animated.View style={[styles.ring, pulseStyle]} />

            <Animated.View style={logoStyle}>
              <Image
                source={require('@/assets/images/splash-icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.Text style={[styles.title, titleStyle]}>
              Content Shelf
            </Animated.Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  logo: {
    width: 108,
    height: 108,
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
});
