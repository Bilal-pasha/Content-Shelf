import { useEffect, useState, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { linksService } from '@/services/links/links.services';
import { pendingLinkStorage } from '@/services/links/pending-link.storage';
import {
  PrivateRoutes,
  PublicRoutes,
} from '@/constants/routes';
import type { LinkCategory, LinkSource } from '@/services/links/links.types';

import { AddLinkSheet } from '@/components/save/AddLinkSheet';

export default function SaveLinkScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'saving' | 'redirecting'>('idle');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<LinkCategory | null>(null);
  const [source, setSource] = useState<LinkSource | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const handled = useRef(false);
  const { colors, spacing, typography } = useAppTheme();

  useEffect(() => {
    if (authLoading || handled.current) return;

    let linkUrl: string | undefined;
    try {
      const raw = typeof params.url === 'string' ? params.url : params.url?.[0];
      linkUrl = raw ? decodeURIComponent(raw).trim() : undefined;
    } catch {
      linkUrl = (typeof params.url === 'string' ? params.url : params.url?.[0])
        ?.trim();
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
    setPendingUrl(linkUrl ?? null);
    setShowCategoryModal(true);
  }, [params.url, isAuthenticated, authLoading, router]);

  const handleSave = () => {
    if (!pendingUrl || !category) {
      setSaveError('Please choose a category.');
      return;
    }
    setSaveError(null);
    setStatus('saving');
    linksService
      .create({
        url: pendingUrl,
        category,
        ...(source && { source }),
      })
      .then(() => {
        setStatus('redirecting');
        setShowCategoryModal(false);
        router.replace(PrivateRoutes.DASHBOARD);
      })
      .catch(() => {
        setStatus('idle');
        setSaveError('Could not save. Try again.');
      });
  };

  const handleCancel = () => {
    setShowCategoryModal(false);
    setPendingUrl(null);
    setCategory(null);
    setSource(null);
    setSaveError(null);
    router.replace(PublicRoutes.WELCOME);
  };

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, gap: spacing.lg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, fontSize: typography.base.fontSize }}>
          Checking sign-in…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, gap: spacing.lg }]}>
      <AddLinkSheet
        visible={showCategoryModal}
        url={pendingUrl ?? ''}
        category={category}
        source={source}
        onCategoryChange={setCategory}
        onSourceChange={setSource}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={status === 'saving'}
        error={saveError}
      />

      {!showCategoryModal && status !== 'idle' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: typography.base.fontSize }}>
            {status === 'saving'
              ? 'Saving link…'
              : 'Taking you to dashboard…'}
          </Text>
        </>
      )}
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
