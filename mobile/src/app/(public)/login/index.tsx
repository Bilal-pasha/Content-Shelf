import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PublicRoutes, PrivateRoutes } from '@/constants/routes';
import { loginSchema, type LoginFormData } from '@/schemas';
import { useAuth } from '@/providers/AuthProvider';
import { images } from '@/constants/images';
import React from 'react';
import { useGoogleSignIn } from '@/services/auth/google-auth.hooks';
import Toast from 'react-native-toast-message';

const GoogleIcon = images.googleLogo;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, error: authError, clearError, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleSignIn = useGoogleSignIn();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(PrivateRoutes.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  // Animation values
  const backButtonOpacity = useSharedValue(0);
  const backButtonTranslateX = useSharedValue(-20);
  const headerTranslateY = useSharedValue(30);
  const headerOpacity = useSharedValue(0);
  const emailInputTranslateY = useSharedValue(30);
  const emailInputOpacity = useSharedValue(0);
  const passwordInputTranslateY = useSharedValue(30);
  const passwordInputOpacity = useSharedValue(0);
  const forgotLinkOpacity = useSharedValue(0);
  const signInButtonScale = useSharedValue(0.9);
  const signInButtonOpacity = useSharedValue(0);
  const dividerOpacity = useSharedValue(0);
  const dividerScale = useSharedValue(0.8);
  const googleButtonTranslateY = useSharedValue(30);
  const googleButtonOpacity = useSharedValue(0);

  useEffect(() => {
    // Back button animation
    backButtonOpacity.value = withTiming(1, { duration: 400 });
    backButtonTranslateX.value = withSpring(0, { damping: 15, stiffness: 150 });

    // Header animation
    headerTranslateY.value = withDelay(
      100,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    headerOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));

    // Email input animation
    emailInputTranslateY.value = withDelay(
      200,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    emailInputOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));

    // Password input animation
    passwordInputTranslateY.value = withDelay(
      300,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    passwordInputOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Forgot link animation
    forgotLinkOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Sign in button animation
    signInButtonScale.value = withDelay(
      500,
      withSpring(1, { damping: 15, stiffness: 150 })
    );
    signInButtonOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Divider animation
    dividerOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    dividerScale.value = withDelay(
      600,
      withSpring(1, { damping: 15, stiffness: 150 })
    );

    // Social buttons animation
    googleButtonTranslateY.value = withDelay(
      800,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    googleButtonOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#2D2D2D' }, 'icon');
  const inputBorderColor = useThemeColor({ light: '#E5E5E5', dark: '#2D2D2D' }, 'icon');
  const inputBackgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const iconColor = useThemeColor({ light: '#9BA1A6', dark: '#687076' }, 'icon');
  const placeholderColor = useThemeColor({ light: '#9BA1A6', dark: '#687076' }, 'icon');
  const linkColor = useThemeColor({}, 'tint');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    setIsSubmitting(true);
    try {
      const result = await signIn(data);
      if (!result.success) {
        Alert.alert('Error', result.message || 'Failed to login. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      clearError();
      const result = await googleSignIn.mutateAsync();

      if (result?.user) {
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: 'Successfully signed in with Google',
          position: 'top',
          visibilityTime: 3000,
        });
        router.replace(PrivateRoutes.DASHBOARD);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: error.message || 'Failed to sign in with Google',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  // Animated styles
  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backButtonOpacity.value,
    transform: [{ translateX: backButtonTranslateX.value }],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const emailInputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: emailInputOpacity.value,
    transform: [{ translateY: emailInputTranslateY.value }],
  }));

  const passwordInputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: passwordInputOpacity.value,
    transform: [{ translateY: passwordInputTranslateY.value }],
  }));

  const forgotLinkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: forgotLinkOpacity.value,
  }));

  const signInButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: signInButtonOpacity.value,
    transform: [{ scale: signInButtonScale.value }],
  }));

  const dividerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dividerOpacity.value,
    transform: [{ scale: dividerScale.value }],
  }));


  const googleButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: googleButtonOpacity.value,
    transform: [{ translateY: googleButtonTranslateY.value }],
  }));

  const buttonPressScale = useSharedValue(1);

  const buttonPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPressScale.value }],
  }));

  const handleButtonPress = (callback: () => void) => {
    buttonPressScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 150 })
    );
    setTimeout(callback, 150);
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
          {/* Back Button */}
          <AnimatedPressable
            style={[styles.backButton, backButtonAnimatedStyle]}
            onPress={() => router.back()}>
            <ArrowLeft size={20} color={textColor} />
            <ThemedText style={styles.backButtonText}>Back</ThemedText>
          </AnimatedPressable>

          {/* Header */}
          <AnimatedThemedView style={[styles.header, headerAnimatedStyle]}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to continue</ThemedText>
          </AnimatedThemedView>

          {/* Form */}
          <ThemedView style={styles.form}>
            {/* Email Input */}
            <AnimatedThemedView style={[styles.inputContainer, emailInputAnimatedStyle]}>
              <ThemedView
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: inputBorderColor,
                    backgroundColor: inputBackgroundColor,
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
                      placeholderTextColor={placeholderColor}
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
              </ThemedView>
              {errors.email && (
                <ThemedText style={styles.errorText}>{errors.email.message}</ThemedText>
              )}
            </AnimatedThemedView>

            {/* Password Input */}
            <AnimatedThemedView style={[styles.inputContainer, passwordInputAnimatedStyle]}>
              <ThemedView
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: inputBorderColor,
                    backgroundColor: inputBackgroundColor,
                  },
                ]}>
                <Lock size={20} color={iconColor} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { color: textColor }]}
                      placeholder="Enter your password"
                      placeholderTextColor={placeholderColor}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                      autoCorrect={false}
                    />
                  )}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  style={styles.eyeButton}>
                  {showPassword ? (
                    <EyeOff size={20} color={iconColor} />
                  ) : (
                    <Eye size={20} color={iconColor} />
                  )}
                </Pressable>
              </ThemedView>
              {errors.password && (
                <ThemedText style={styles.errorText}>{errors.password.message}</ThemedText>
              )}
            </AnimatedThemedView>

            {/* Forgot Password Link */}
            <Animated.View style={forgotLinkAnimatedStyle}>
              <Link href={PublicRoutes.FORGOT_PASSWORD} style={styles.forgotLink}>
                <ThemedText style={styles.forgotPasswordText}>Forgot Password?</ThemedText>
              </Link>
            </Animated.View>

            {/* Sign In Button */}
            <AnimatedPressable
              style={[styles.signInButton, signInButtonAnimatedStyle, buttonPressStyle]}
              onPress={() => {
                buttonPressScale.value = withSequence(
                  withTiming(0.95, { duration: 100 }),
                  withSpring(1, { damping: 15, stiffness: 150 })
                );
                handleSubmit(onSubmit)();
              }}
              disabled={isSubmitting}>
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInGradient}>
                <Text style={styles.signInButtonText}>
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </AnimatedPressable>

            {/* Divider */}
            <AnimatedThemedView style={[styles.dividerContainer, dividerAnimatedStyle]}>
              <ThemedView style={[styles.dividerLine, { backgroundColor: borderColor }]} />
              <ThemedText style={[styles.dividerText, { color: iconColor }]}>
                or continue with
              </ThemedText>
              <ThemedView style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            </AnimatedThemedView>

            {/* Social Login Buttons */}
            <ThemedView style={styles.socialButtons}>
              {/* Google Button */}
              <AnimatedPressable
                style={[
                  styles.googleButton,
                  {
                    borderColor,
                    backgroundColor: inputBackgroundColor,
                  },
                  googleButtonAnimatedStyle,
                  buttonPressStyle,
                ]}
                onPress={() => handleButtonPress(handleGoogleLogin)}
                disabled={googleSignIn.isPending}>
                <ThemedView style={styles.socialButtonContent}>
                  <ThemedView style={styles.iconWrapper}>
                    <GoogleIcon width={20} height={20} />
                  </ThemedView>
                  <Text style={[styles.googleButtonText, { color: textColor }]}>
                    {googleSignIn.isPending ? 'Signing in...' : 'Continue with Google'}
                  </Text>
                </ThemedView>
              </AnimatedPressable>
            </ThemedView>

            {/* Sign Up Link */}
            <ThemedView style={styles.signUpContainer}>
              <ThemedText style={styles.signUpPrompt}>Don&apos;t have an account? </ThemedText>
              <Link href={PublicRoutes.REGISTER}>
                <ThemedText style={[styles.signUpLinkText, { color: linkColor }]}>
                  Sign Up
                </ThemedText>
              </Link>
            </ThemedView>
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
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    minHeight: '100%',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 8,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
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
  eyeButton: {
    padding: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  signInGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButtons: {
    gap: 12,
  },
  googleButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  signUpPrompt: {
    fontSize: 15,
  },
  signUpLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

