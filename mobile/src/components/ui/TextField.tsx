import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  /** Render inline content (e.g. a show/hide-password icon button) after the input. */
  trailing?: ReactNode;
};

export function TextField({ label, error, trailing, style, ...inputProps }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const hasError = Boolean(error);

  return (
    <View>
      {label && (
        <Text
          style={[
            styles.label,
            { color: colors.textMuted, fontSize: typography.xs.fontSize, marginBottom: spacing.xs },
          ]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
          },
        ]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { color: colors.text, fontSize: typography.base.fontSize, paddingVertical: spacing.md },
            style,
          ]}
          {...inputProps}
        />
        {trailing}
      </View>
      {hasError && (
        <Text style={[styles.error, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
  },
});
