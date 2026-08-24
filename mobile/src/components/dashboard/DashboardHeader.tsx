import { Pressable, StyleSheet, Text, View } from 'react-native';
import { User, LogOut } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { HORZ_PADDING } from './constants';

export function DashboardHeader({
  userEmail,
  onSignOut,
  onAvatarPress,
}: {
  userEmail: string | undefined;
  onSignOut: () => void;
  onAvatarPress: () => void;
}) {
  const { colors, spacing, radius, typography } = useAppTheme();

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <View style={[styles.header, { paddingHorizontal: HORZ_PADDING, paddingVertical: spacing.lg }]}>
        <View style={[styles.headerLeft, { gap: spacing.md }]}>
          <Pressable
            onPress={onAvatarPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={[
              styles.avatar,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
            ]}>
            <User size={20} color={colors.textMuted} />
          </Pressable>
          <View style={styles.headerUser}>
            <Text style={{ color: colors.text, fontSize: typography.sm.fontSize, fontWeight: '600' }}>
              Saved links
            </Text>
            <Text
              style={{ color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 }}
              numberOfLines={1}>
              {userEmail ?? '—'}
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.iconButton}
          hitSlop={12}
          onPress={onSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out">
          <LogOut size={22} color={colors.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUser: { flex: 1, minWidth: 0 },
  iconButton: { padding: 8 },
});
