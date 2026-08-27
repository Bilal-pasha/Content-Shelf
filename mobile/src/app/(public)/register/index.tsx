import { useEffect, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { PublicRoutes, PrivateRoutes } from '@/constants/routes';
import { registerSchema, type RegisterFormData } from '@/schemas';
import { images } from '@/constants/images';
import { useAuth } from '@/providers/AuthProvider';

const GoogleIcon = images.googleLogo;

// TODO: these placeholder pages don't exist yet — host real Terms/Privacy
// Policy pages at this domain (or point elsewhere) before shipping.
const LEGAL_URLS = {
  terms: 'https://video-mobile-application.com/terms',
  privacy: 'https://video-mobile-application.com/privacy',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle, clearError, isAuthenticated, isLoading } =
    useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { colors, spacing, typography } = useAppTheme();
  const [googlePressed, setGooglePressed] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(PrivateRoutes.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    setIsSubmitting(true);
    try {
      const result = await signUp(data);
      if (!result.success) {
        Alert.alert('Error', result.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: 'Successfully signed in with Google',
          position: 'top',
          visibilityTime: 3000,
        });
        // Navigation is handled by AuthProvider once state is refreshed.
      } else if (result.message !== 'Sign in was cancelled') {
        Toast.show({
          type: 'error',
          text1: 'Sign In Failed',
          text2: result.message || 'Failed to sign in with Google',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Start your journey with us" centered showBack={false}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.lg }}>
            <TextField
              label="Full name"
              placeholder="Full name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect={false}
              error={errors.name?.message}
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ marginBottom: spacing.lg }}>
            <TextField
              label="Email"
              placeholder="Email address"
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
          <View style={{ marginBottom: spacing.xxl }}>
            <TextField
              label="Password"
              placeholder="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
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

      <View style={{ marginBottom: spacing.xxl }}>
        <Button
          label={isSubmitting ? 'Creating Account...' : 'Create Account'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />
      </View>

      <View style={[styles.dividerRow, { marginBottom: spacing.xxl, gap: spacing.lg }]}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>or continue with</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <Pressable
        onPress={handleGoogleLogin}
        onPressIn={() => setGooglePressed(true)}
        onPressOut={() => setGooglePressed(false)}
        disabled={googleLoading}
        style={[
          styles.googleButton,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 12,
            gap: spacing.sm,
            marginBottom: spacing.xxl,
            opacity: googlePressed ? 0.85 : googleLoading ? 0.6 : 1,
          },
        ]}>
        <GoogleIcon width={20} height={20} />
        <Text style={{ color: colors.text, fontSize: typography.base.fontSize, fontWeight: '600' }}>
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </Pressable>

      <View style={[styles.termsContainer, { marginBottom: spacing.xxl }]}>
        <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, textAlign: 'center', lineHeight: 18 }}>
          By creating an account, you agree to our{' '}
          <Text style={{ color: colors.primary, fontWeight: '500' }} onPress={() => Linking.openURL(LEGAL_URLS.terms)} accessibilityRole="link">
            Terms
          </Text>{' '}
          &{' '}
          <Text style={{ color: colors.primary, fontWeight: '500' }} onPress={() => Linking.openURL(LEGAL_URLS.privacy)} accessibilityRole="link">
            Privacy Policy
          </Text>
        </Text>
      </View>

      <View style={styles.loginContainer}>
        <Text style={{ color: colors.textMuted, fontSize: typography.sm.fontSize }}>Already have an account? </Text>
        <Link href={PublicRoutes.LOGIN}>
          <Text style={{ color: colors.primary, fontSize: typography.sm.fontSize, fontWeight: '600' }}>Sign In</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  termsContainer: {
    alignItems: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
