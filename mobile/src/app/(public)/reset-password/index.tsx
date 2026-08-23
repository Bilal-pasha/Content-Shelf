import { Link, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PublicRoutes } from '@/constants/routes';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/schemas/auth.schemas';
import { useResetPassword } from '@/services/auth/auth.services';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const resetPassword = useResetPassword();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#2D2D2D' }, 'icon');
  const placeholderColor = useThemeColor({ light: '#9BA1A6', dark: '#687076' }, 'icon');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '', token: token ?? '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    try {
      await resetPassword.mutateAsync({
        token,
        newPassword: data.password,
      });
      Toast.show({
        type: 'success',
        text1: 'Password reset',
        text2: 'Sign in with your new password.',
        position: 'top',
        visibilityTime: 4000,
      });
      router.replace(PublicRoutes.LOGIN);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Could not reset password',
        text2: message,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  if (!token) {
    return (
      <ThemedView style={[styles.container, styles.content, { backgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          Link expired or invalid
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          This password reset link is missing its token. Request a new one from the
          forgot-password screen.
        </ThemedText>
        <Pressable
          style={styles.button}
          onPress={() => router.replace(PublicRoutes.FORGOT_PASSWORD)}
          accessibilityRole="button"
          accessibilityLabel="Request a new reset link">
          <ThemedText style={styles.buttonText}>Request a new link</ThemedText>
        </Pressable>
        <ThemedView style={styles.backContainer}>
          <Link href={PublicRoutes.LOGIN}>
            <ThemedText type="link">Back to Sign In</ThemedText>
          </Link>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Reset Password
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter your new password below
        </ThemedText>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.label}>New Password</ThemedText>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { color: textColor, borderColor }]}
                  placeholder="Enter new password"
                  placeholderTextColor={placeholderColor}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
              )}
            />
            {errors.password && (
              <ThemedText style={styles.errorText}>{errors.password.message}</ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.label}>Confirm New Password</ThemedText>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { color: textColor, borderColor }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={placeholderColor}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
              )}
            />
            {errors.confirmPassword && (
              <ThemedText style={styles.errorText}>
                {errors.confirmPassword.message}
              </ThemedText>
            )}
          </ThemedView>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed || resetPassword.isPending ? 0.8 : 1 },
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={resetPassword.isPending}
            accessibilityRole="button"
            accessibilityLabel="Reset password">
            <ThemedText style={styles.buttonText}>
              {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.backContainer}>
            <Link href={PublicRoutes.LOGIN}>
              <ThemedText type="link">Back to Sign In</ThemedText>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
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
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#0a7ea4',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backContainer: {
    alignItems: 'center',
  },
});
