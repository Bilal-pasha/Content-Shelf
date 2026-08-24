import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StyleSheet, View, Text } from 'react-native';
import Toast from 'react-native-toast-message';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { PublicRoutes } from '@/constants/routes';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas/auth.schemas';
import { useForgotPassword } from '@/services/auth/auth.services';

export default function ForgotPasswordScreen() {
  const forgotPassword = useForgotPassword();
  const { colors, spacing, typography } = useAppTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

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

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email and we'll send you a link to reset your password.">
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.xxl }}>
            <TextField
              label="Email"
              placeholder="Enter your email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              error={errors.email?.message}
            />
          </View>
        )}
      />

      <View style={{ marginBottom: spacing.xxl }}>
        <Button
          label={forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
          onPress={handleSubmit(onSubmit)}
          disabled={forgotPassword.isPending}
        />
      </View>

      <View style={styles.backLinkWrap}>
        <Link href={PublicRoutes.LOGIN}>
          <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '500' }}>Back to Sign In</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backLinkWrap: {
    alignItems: 'center',
  },
});
