import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

SplashScreen.preventAutoHideAsync().catch(() => {});

const BRAND_BG = '#2563EB';
const MIN_DISPLAY_MS = 1700;
const EXIT_DURATION_MS = 380;

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

  const ring1Scale = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0.8);
  const ring2Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0.7);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);

  // Swap the native splash for this overlay as soon as we can paint —
  // both use the same background + mark, so the handoff is invisible.
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

    ring1Scale.value = withTiming(1.8, {
      duration: 900,
      easing: Easing.out(Easing.ease),
    });
    ring1Opacity.value = withTiming(0, {
      duration: 900,
      easing: Easing.out(Easing.ease),
    });

    ring2Scale.value = withDelay(
      150,
      withTiming(1.8, { duration: 900, easing: Easing.out(Easing.ease) })
    );
    ring2Opacity.value = withDelay(
      150,
      withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) })
    );

    logoScale.value = withDelay(
      100,
      withSpring(1, { damping: 14, stiffness: 160 })
    );
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 450 }));

    titleTranslateY.value = withDelay(
      500,
      withSpring(0, { damping: 16, stiffness: 160 })
    );
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));

    taglineOpacity.value = withDelay(750, withTiming(1, { duration: 400 }));

    progressWidth.value = withDelay(
      650,
      withTiming(100, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [nativeHidden]);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    overlayOpacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
    overlayScale.value = withTiming(
      1.05,
      { duration: EXIT_DURATION_MS, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(setOverlayMounted)(false);
      }
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

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
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
            <Animated.View style={[styles.ring, ring1Style]} />
            <Animated.View style={[styles.ring, ring2Style]} />

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
            <Animated.Text style={[styles.tagline, taglineStyle]}>
              Organize. Save. Discover.
            </Animated.Text>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
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
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  logo: {
    width: 108,
    height: 108,
  },
  title: {
    marginTop: 24,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.75)',
  },
  progressTrack: {
    marginTop: 32,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
