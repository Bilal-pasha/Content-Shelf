import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/providers/AuthProvider';
import { authService } from '@/services/auth/auth.services';
import {
  updateProfileSchema,
  updatePasswordSchema,
  type UpdateProfileFormData,
  type UpdatePasswordFormData,
} from '@/schemas';

export default function ProfileScreen() {
  const { user, updateUserProfile } = useAuth();
  const { colors, spacing, typography } = useAppTheme();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name || '' },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      const response = await authService.updateProfile(data);
      if (response.success && response.data?.user) {
        updateUserProfile(response.data.user);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: UpdatePasswordFormData) => {
    setIsUpdatingPassword(true);
    try {
      await authService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      Alert.alert('Success', 'Password updated successfully');
      resetPasswordForm();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <AuthLayout title="Profile Settings" subtitle="Manage your account information">
      <Card style={{ marginBottom: spacing.xxl }}>
        <Text style={{ color: colors.text, fontSize: typography.lg.fontSize, fontWeight: typography.lg.fontWeight, marginBottom: spacing.lg }}>
          Profile Information
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          <TextField label="Email" value={user?.email} editable={false} style={{ opacity: 0.6 }} />
          <Text style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: spacing.xs }}>
            Email cannot be changed
          </Text>
        </View>

        <Controller
          control={profileControl}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={{ marginBottom: spacing.lg }}>
              <TextField
                label="Name"
                placeholder="Enter your name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                autoCorrect={false}
                error={profileErrors.name?.message}
              />
            </View>
          )}
        />

        <Button
          label={isUpdatingProfile ? 'Updating...' : 'Update Profile'}
          onPress={handleProfileSubmit(onProfileSubmit)}
          disabled={isUpdatingProfile}
        />
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: typography.lg.fontSize, fontWeight: typography.lg.fontWeight, marginBottom: spacing.lg }}>
          Change Password
        </Text>

        <Controller
          control={passwordControl}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={{ marginBottom: spacing.lg }}>
              <TextField
                label="Current Password"
                placeholder="Enter current password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordErrors.currentPassword?.message}
                trailing={
                  <Pressable onPress={() => setShowCurrentPassword((prev) => !prev)} hitSlop={12} style={styles.eyeButton}>
                    {showCurrentPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                  </Pressable>
                }
              />
            </View>
          )}
        />

        <Controller
          control={passwordControl}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={{ marginBottom: spacing.lg }}>
              <TextField
                label="New Password"
                placeholder="Enter new password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordErrors.newPassword?.message}
                trailing={
                  <Pressable onPress={() => setShowNewPassword((prev) => !prev)} hitSlop={12} style={styles.eyeButton}>
                    {showNewPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                  </Pressable>
                }
              />
            </View>
          )}
        />

        <Controller
          control={passwordControl}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={{ marginBottom: spacing.xxl }}>
              <TextField
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordErrors.confirmPassword?.message}
                trailing={
                  <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)} hitSlop={12} style={styles.eyeButton}>
                    {showConfirmPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
                  </Pressable>
                }
              />
            </View>
          )}
        />

        <Button
          label={isUpdatingPassword ? 'Updating...' : 'Update Password'}
          onPress={handlePasswordSubmit(onPasswordSubmit)}
          disabled={isUpdatingPassword}
        />
      </Card>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
