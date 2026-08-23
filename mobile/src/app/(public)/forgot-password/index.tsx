import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { Mail } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PublicRoutes } from '@/constants/routes';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas/auth.schemas';
import { useForgotPassword } from '@/services/auth/auth.services';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function ForgotPasswordScreen() {
  const forgotPassword = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({ light: '#9BA1A6', dark: '#687076' }, 'icon');
  const borderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#2D2D2D' },
    'icon'
  );
  const inputBg = useThemeColor(
    { light: '#F5F5F5', dark: '#1C1C1E' },
    'background'
  );
  const linkColor = useThemeColor({}, 'tint');

  // Animation values
  const titleTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(24);
  const subtitleOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(24);
  const inputOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(24);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.96);
  const backLinkOpacity = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    titleTranslateY.value = withDelay(
      80,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    titleOpacity.value = withDelay(80, withTiming(1, { duration: 500 }));

    subtitleTranslateY.value = withDelay(
      160,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    subtitleOpacity.value = withDelay(160, withTiming(1, { duration: 500 }));

    inputTranslateY.value = withDelay(
      240,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    inputOpacity.value = withDelay(240, withTiming(1, { duration: 500 }));

    buttonTranslateY.value = withDelay(
      320,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    buttonOpacity.value = withDelay(320, withTiming(1, { duration: 500 }));
    buttonScale.value = withDelay(
      320,
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    backLinkOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonTranslateY.value },
      { scale: buttonScale.value * pressScale.value },
    ],
  }));

  const backLinkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backLinkOpacity.value,
  }));

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword.mutateAsync(data);
      Toast.show({
        type: 'success',
        text1: 'Check your email',
        text2: 'If that address is registered, a reset link is on its way.',
        position: 'top',
        visibilityTime: 4000,
      });
      router.push(PublicRoutes.LOGIN);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Could not send reset link',
        text2: message,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handlePressIn = () => {
    pressScale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.content}>
          {/* Title */}
          <AnimatedThemedView style={[styles.header, titleAnimatedStyle]}>
            <ThemedText type="title" style={styles.title}>
              Forgot Password?
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: iconColor }]}>
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </ThemedText>
          </AnimatedThemedView>

          {/* Form */}
          <ThemedView style={styles.form}>
            <AnimatedThemedView
              style={[styles.inputWrapper, inputAnimatedStyle]}>
              <View
                style={[
                  styles.inputRow,
                  {
                    borderColor,
                    backgroundColor: inputBg,
                  },
                ]}>
                <Mail size={20} color={iconColor} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { color: textColor }]}
                      placeholder="Enter your email"
                      placeholderTextColor={iconColor}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                    />
                  )}
                />
              </View>
              {errors.email && (
                <ThemedText style={styles.errorText}>{errors.email.message}</ThemedText>
              )}
            </AnimatedThemedView>

            <AnimatedPressable
              style={[styles.buttonWrap, buttonAnimatedStyle]}
              onPressIn={handlePressIn}
              onPress={handleSubmit(onSubmit)}
              disabled={forgotPassword.isPending}
              accessibilityRole="button"
              accessibilityLabel="Send reset link">
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}>
                <Text style={styles.buttonText}>
                  {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </LinearGradient>
            </AnimatedPressable>

            <Animated.View style={[styles.backLinkWrap, backLinkAnimatedStyle]}>
              <Link href={PublicRoutes.LOGIN}>
                <ThemedText style={[styles.backLinkText, { color: linkColor }]}>
                  Back to Sign In
                </ThemedText>
              </Link>
            </Animated.View>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  buttonWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLinkWrap: {
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
