import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  /** Hides the back button (e.g. when this is a dead-end screen after a link tap). */
  showBack?: boolean;
  /** Vertically centers the title/form block in the remaining space below the back button. */
  centered?: boolean;
  children: ReactNode;
};

/** Shared scaffold for auth screens: back button, title/subtitle, scrollable form area. */
export function AuthLayout({ title, subtitle, showBack = true, centered = false, children }: AuthLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useAppTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, padding: spacing.xxl, paddingTop: Math.max(insets.top, spacing.xxl) }}>
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[styles.backButton, { marginBottom: spacing.xxl, gap: spacing.sm }]}>
              <ArrowLeft size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: typography.base.fontSize }}>Back</Text>
            </Pressable>
          )}

          <View style={centered ? styles.centeredBlock : undefined}>
            <View style={{ marginBottom: spacing.xxl }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.xxl.fontSize,
                  fontWeight: typography.xxl.fontWeight,
                  marginBottom: spacing.xs,
                }}>
                {title}
              </Text>
              {subtitle && (
                <Text style={{ color: colors.textMuted, fontSize: typography.base.fontSize }}>{subtitle}</Text>
              )}
            </View>

            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centeredBlock: {
    flex: 1,
    justifyContent: 'center',
  },
});
