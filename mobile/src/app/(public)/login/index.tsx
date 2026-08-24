import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { PublicRoutes, PrivateRoutes } from '@/constants/routes';
import { loginSchema, type LoginFormData } from '@/schemas';
import { useAuth } from '@/providers/AuthProvider';
import { images } from '@/constants/images';
import { useGoogleSignIn } from '@/services/auth/google-auth.hooks';

const GoogleIcon = images.googleLogo;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, clearError, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleSignIn = useGoogleSignIn();
  const { colors, spacing, typography } = useAppTheme();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(PrivateRoutes.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
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
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: error.message || 'Failed to sign in with Google',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue">
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.lg }}>
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

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.sm }}>
            <TextField
              label="Password"
              placeholder="Enter your password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              error={errors.password?.message}
              trailing={
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                </Pressable>
              }
            />
          </View>
        )}
      />

      <Link href={PublicRoutes.FORGOT_PASSWORD} style={[styles.forgotLink, { marginBottom: spacing.xxl }]}>
        <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '500' }}>Forgot Password?</Text>
      </Link>

      <View style={{ marginBottom: spacing.xxl }}>
        <Button label={isSubmitting ? 'Signing In...' : 'Sign In'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
      </View>

      <View style={[styles.dividerRow, { marginBottom: spacing.xxl, gap: spacing.lg }]}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>or continue with</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <Pressable
        onPress={handleGoogleLogin}
        disabled={googleSignIn.isPending}
        style={({ pressed }) => [
          styles.googleButton,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 12,
            gap: spacing.sm,
            opacity: pressed ? 0.85 : googleSignIn.isPending ? 0.6 : 1,
          },
        ]}>
        <GoogleIcon width={20} height={20} />
        <Text style={{ color: colors.text, fontSize: typography.base.fontSize, fontWeight: '600' }}>
          {googleSignIn.isPending ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </Pressable>

      <View style={[styles.signUpRow, { marginTop: spacing.xxl }]}>
        <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>Don&apos;t have an account? </Text>
        <Link href={PublicRoutes.REGISTER}>
          <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '600' }}>Sign Up</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgotLink: {
    alignSelf: 'flex-end',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
