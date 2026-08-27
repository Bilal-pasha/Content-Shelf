import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { linksService } from '@/services/links/links.services';
import { pendingLinkStorage } from '@/services/links/pending-link.storage';
import {
  useFolders,
  useFolderSuggestion,
} from '@/services/folders/folders.services';
import { PrivateRoutes, PublicRoutes } from '@/constants/routes';
import {
  SaveToFolderSheet,
  type FolderSelection,
} from '@/components/save/SaveToFolderSheet';

export default function SaveLinkScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, typography } = useAppTheme();

  const [url, setUrl] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  const canSuggest = Boolean(url) && isAuthenticated && !authLoading;
  const { data: folders = [], isLoading: foldersLoading } = useFolders({
    enabled: isAuthenticated && !authLoading,
  });
  const { data: suggestion, isLoading: suggestionLoading } = useFolderSuggestion(
    url ?? '',
    canSuggest,
  );

  useEffect(() => {
    if (authLoading || handled.current) return;

    let linkUrl: string | undefined;
    try {
      const raw = typeof params.url === 'string' ? params.url : params.url?.[0];
      linkUrl = raw ? decodeURIComponent(raw).trim() : undefined;
    } catch {
      linkUrl = (typeof params.url === 'string' ? params.url : params.url?.[0])?.trim();
    }

    if (!linkUrl) {
      handled.current = true;
      router.replace(PublicRoutes.WELCOME);
      return;
    }

    if (!isAuthenticated) {
      handled.current = true;
      pendingLinkStorage.set(linkUrl).then(() => {
        router.replace(PublicRoutes.LOGIN);
      });
      return;
    }

    handled.current = true;
    setUrl(linkUrl);
    setSheetVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.url, isAuthenticated, authLoading]);

  const handleSubmit = (selection: FolderSelection) => {
    if (!url || isSaving) return;
    setError(null);
    setIsSaving(true);
    linksService
      .create({
        url,
        ...(selection?.folderId
          ? { folderId: selection.folderId }
          : selection?.folderName
            ? { folderName: selection.folderName }
            : {}),
      })
      .then(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ['links'] });
        queryClient.invalidateQueries({ queryKey: ['folders'] });
        setSheetVisible(false);
        router.replace(PrivateRoutes.DASHBOARD);
      })
      .catch(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsSaving(false);
        setError('Could not save. Try again.');
      });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, gap: spacing.lg }]}>
      {(authLoading || !sheetVisible) && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: typography.base.fontSize }}>
            {authLoading ? 'Checking sign-in…' : 'Opening…'}
          </Text>
        </>
      )}

      <SaveToFolderSheet
        visible={sheetVisible}
        url={url ?? ''}
        folders={folders}
        foldersLoading={foldersLoading}
        suggestion={suggestion}
        suggestionLoading={suggestionLoading}
        isSaving={isSaving}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => handleSubmit(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
