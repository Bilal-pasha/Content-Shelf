import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Linking,
  useWindowDimensions,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/providers/AuthProvider';
import {
  linksService,
  useLinks,
  useSemanticSearch,
} from '@/services/links/links.services';
import type { LinkSource, LinkCategory, SavedLink } from '@/services/links/links.types';
import { PrivateRoutes } from '@/constants/routes';

import {
  getColumns,
  HORZ_PADDING,
  CARD_GAP,
} from '@/components/dashboard/constants';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSearch } from '@/components/dashboard/DashboardSearch';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { VideoBox } from '@/components/dashboard/VideoBox';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SkeletonGrid } from '@/components/dashboard/SkeletonGrid';
import { AddLinkSheet } from '@/components/save/AddLinkSheet';

const SEARCH_DEBOUNCE_MS = 300;

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [source, setSource] = useState<'' | LinkSource>('');
  const [category, setCategory] = useState<'' | LinkCategory>('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualCategory, setManualCategory] = useState<LinkCategory | null>(null);
  const [manualSource, setManualSource] = useState<LinkSource | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const columns = getColumns(width);
  const cardWidth =
    (width - HORZ_PADDING * 2 - CARD_GAP * (columns - 1)) / columns;

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#2D2D2D' },
    'icon',
  );
  const inputBg = useThemeColor(
    { light: '#F5F5F5', dark: '#1C1C1E' },
    'background',
  );
  const iconColor = useThemeColor({ light: '#9BA1A6', dark: '#687076' }, 'icon');
  const placeholderBg = useThemeColor(
    { light: '#E8E8ED', dark: '#2C2C2E' },
    'background',
  );

  const {
    data: filteredLinks = [],
    isLoading: isFilterLoading,
    isRefetching: isFilterRefetching,
    refetch: refetchFilter,
  } = useLinks({
    // Semantic search (below) replaces plain substring search entirely
    // when active — this query is the pill-filtered browsing path only.
    search: undefined,
    source: source || undefined,
    category: category || undefined,
  });

  // Combining semantic search with source/category filters is a reasonable
  // future improvement — not built in this prototype; search is query-only.
  const isSearching = debouncedSearch.trim().length > 0;
  const {
    data: searchResults = [],
    isLoading: isSearchLoading,
    isRefetching: isSearchRefetching,
    refetch: refetchSearch,
  } = useSemanticSearch(debouncedSearch.trim());

  const links = isSearching ? searchResults : filteredLinks;
  const isLoading = isSearching ? isSearchLoading : isFilterLoading;
  const isRefetching = isSearching ? isSearchRefetching : isFilterRefetching;
  const refetch = isSearching ? refetchSearch : refetchFilter;

  const addLinkMutation = useMutation({
    mutationFn: linksService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddSheet(false);
      setManualUrl('');
      setManualCategory(null);
      setManualSource(null);
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const handleAvatarPress = useCallback(() => {
    router.push(PrivateRoutes.PROFILE);
  }, [router]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut]);

  const handleOpenAddSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addLinkMutation.reset();
    setShowAddSheet(true);
  }, [addLinkMutation]);

  const handleCancelAddSheet = useCallback(() => {
    setShowAddSheet(false);
    setManualUrl('');
    setManualCategory(null);
    setManualSource(null);
  }, []);

  const handleSaveManualLink = useCallback(() => {
    if (!manualUrl.trim() || !manualCategory) return;
    addLinkMutation.mutate({
      url: manualUrl.trim(),
      category: manualCategory,
      ...(manualSource && { source: manualSource }),
    });
  }, [manualUrl, manualCategory, manualSource, addLinkMutation]);

  const hasFilters = Boolean(search.trim() || source || category);

  const renderItem = useCallback(
    ({ item, index }: { item: SavedLink; index: number }) => (
      <ThemedView
        style={{
          marginBottom: CARD_GAP,
          paddingHorizontal: columns === 1 ? HORZ_PADDING : 0,
        }}>
        <VideoBox
          item={item}
          index={index}
          cardWidth={cardWidth}
          placeholderBg={placeholderBg}
          iconColor={iconColor}
          onPress={() => handleOpenLink(item.url)}
        />
      </ThemedView>
    ),
    [cardWidth, columns, placeholderBg, iconColor, handleOpenLink],
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor, paddingTop: insets.top || 40 }]}>
      <FlatList
        key={columns}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        data={links}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={
          columns > 1 ? { gap: CARD_GAP, paddingHorizontal: HORZ_PADDING } : undefined
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={refetch}
            tintColor="#2563EB"
          />
        }
        ListHeaderComponent={
          <>
            <DashboardHeader
              userEmail={user?.email}
              iconColor={iconColor}
              inputBg={inputBg}
              onSignOut={handleSignOut}
              onAvatarPress={handleAvatarPress}
            />

            <DashboardSearch
              value={search}
              onChangeText={setSearch}
              placeholder="Search videos..."
              textColor={textColor}
              iconColor={iconColor}
              inputBg={inputBg}
            />

            <DashboardFilters
              source={source}
              category={category}
              onSourceChange={setSource}
              onCategoryChange={setCategory}
              iconColor={iconColor}
            />

            <Animated.View
              entering={FadeIn.delay(200).duration(400)}
              style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Saved videos
              </ThemedText>
              <ThemedText style={[styles.sectionCount, { color: iconColor }]}>
                {links.length} {links.length === 1 ? 'video' : 'videos'}
              </ThemedText>
            </Animated.View>

            {isLoading && (
              <Animated.View entering={FadeIn.duration(300)}>
                <SkeletonGrid columns={columns} cardWidth={cardWidth} tint={placeholderBg} />
              </Animated.View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              hasFilters={hasFilters}
              borderColor={borderColor}
              iconColor={iconColor}
            />
          ) : null
        }
      />

      <Pressable
        onPress={handleOpenAddSheet}
        accessibilityRole="button"
        accessibilityLabel="Add a video link"
        style={({ pressed }) => [
          styles.fab,
          { bottom: (insets.bottom || 16) + 16, opacity: pressed ? 0.9 : 1 },
        ]}>
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </Pressable>

      <AddLinkSheet
        visible={showAddSheet}
        url={manualUrl}
        category={manualCategory}
        source={manualSource}
        onCategoryChange={setManualCategory}
        onSourceChange={setManualSource}
        onUrlChange={setManualUrl}
        onSave={handleSaveManualLink}
        onCancel={handleCancelAddSheet}
        isSaving={addLinkMutation.isPending}
        error={addLinkMutation.isError ? 'Could not save. Try again.' : null}
        backgroundColor={backgroundColor}
        textColor={textColor}
        iconColor={iconColor}
        inputBg={inputBg}
        borderColor={borderColor}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: HORZ_PADDING,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  sectionCount: { fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
