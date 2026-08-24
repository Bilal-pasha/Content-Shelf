import { Link, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, View, Text } from 'react-native';
import Toast from 'react-native-toast-message';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { PublicRoutes } from '@/constants/routes';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/schemas/auth.schemas';
import { useResetPassword } from '@/services/auth/auth.services';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const resetPassword = useResetPassword();
  const { colors, spacing, typography } = useAppTheme();

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
      await resetPassword.mutateAsync({ token, newPassword: data.password });
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
      <AuthLayout title="Link expired or invalid" showBack={false}>
        <Text style={{ color: colors.textMuted, fontSize: typography.base.fontSize, marginBottom: spacing.xxl, lineHeight: 22 }}>
          This password reset link is missing its token. Request a new one from the forgot-password screen.
        </Text>
        <View style={{ marginBottom: spacing.xxl }}>
          <Button label="Request a new link" onPress={() => router.replace(PublicRoutes.FORGOT_PASSWORD)} />
        </View>
        <View style={styles.backContainer}>
          <Link href={PublicRoutes.LOGIN}>
            <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '600' }}>Back to Sign In</Text>
          </Link>
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your new password below" showBack={false}>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.lg }}>
            <TextField
              label="New Password"
              placeholder="Enter new password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              error={errors.password?.message}
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.xxl }}>
            <TextField
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              error={errors.confirmPassword?.message}
            />
          </View>
        )}
      />

      <View style={{ marginBottom: spacing.xxl }}>
        <Button
          label={resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
          onPress={handleSubmit(onSubmit)}
          disabled={resetPassword.isPending}
        />
      </View>

      <View style={styles.backContainer}>
        <Link href={PublicRoutes.LOGIN}>
          <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '600' }}>Back to Sign In</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backContainer: {
    alignItems: 'center',
  },
});
