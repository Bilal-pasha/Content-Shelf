import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Video } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { PublicRoutes, PrivateRoutes } from '@/constants/routes';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, spacing, radius, typography } = useAppTheme();

  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(24);
  const titleOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(24);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(PrivateRoutes.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    iconOpacity.value = withTiming(1, { duration: 500 });

    titleTranslateY.value = withDelay(150, withSpring(0, { damping: 15, stiffness: 150 }));
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 500 }));

    taglineTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 150 }));
    taglineOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    buttonsTranslateY.value = withDelay(450, withSpring(0, { damping: 15, stiffness: 150 }));
    buttonsOpacity.value = withDelay(450, withTiming(1, { duration: 500 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));
  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: taglineTranslateY.value }],
    opacity: taglineOpacity.value,
  }));
  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsTranslateY.value }],
    opacity: buttonsOpacity.value,
  }));

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryMuted, borderRadius: radius.xl }]}>
            <Video size={52} color={colors.primary} strokeWidth={2} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryMuted, borderRadius: radius.xl, marginBottom: spacing.xxxl },
            iconAnimatedStyle,
          ]}>
          <Video size={52} color={colors.primary} strokeWidth={2} />
        </Animated.View>

        <Animated.Text
          style={[
            { color: colors.text, fontSize: typography.display.fontSize, fontWeight: typography.display.fontWeight, marginBottom: spacing.md },
            titleAnimatedStyle,
          ]}>
          Content Shelf
        </Animated.Text>

        <Animated.Text
          style={[
            styles.tagline,
            { color: colors.textMuted, fontSize: typography.base.fontSize, marginBottom: spacing.huge, paddingHorizontal: spacing.lg },
            taglineAnimatedStyle,
          ]}>
          Save, organize, and discover your favorite videos in one place.
        </Animated.Text>

        <Animated.View style={[styles.buttonContainer, { gap: spacing.md, marginBottom: spacing.huge }, buttonsAnimatedStyle]}>
          <Button label="Sign In" variant="primary" onPress={() => router.navigate(PublicRoutes.LOGIN)} />
          <Button label="Create Account" variant="secondary" onPress={() => router.push(PublicRoutes.REGISTER)} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
  },
});
