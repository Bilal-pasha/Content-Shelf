import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useShareIntent } from "expo-share-intent";

import { useColorScheme } from "@/hooks/use-color-scheme";
import "../../global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { configureGoogleSignIn } from "@/services/auth/google-auth.service";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AnimatedSplashScreen } from "@/components/AnimatedSplashScreen";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const router = useRouter();

  // Initialize Google Sign-In
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    // Extract URL from share intent
    // Priority: webUrl > text (if it's a URL) > files (if it's a file URL)
    let urlToSave: string | undefined;

    if (shareIntent.webUrl) {
      urlToSave = shareIntent.webUrl;
    } else if (shareIntent.text) {
      // Check if text contains a URL
      const urlMatch = shareIntent.text.match(
        /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i
      );
      if (urlMatch) {
        urlToSave = urlMatch[0].startsWith("http")
          ? urlMatch[0]
          : `https://${urlMatch[0]}`;
      }
    } else if (shareIntent.files && shareIntent.files.length > 0) {
      // For files, we could save the file path, but typically we want URLs
      // If the file has a URL-like path, we could handle it
      // For now, we'll skip files that aren't URLs
    }

    if (urlToSave) {
      // Navigate to save route with the URL
      const encodedUrl = encodeURIComponent(urlToSave);
      router.push(`/save?url=${encodedUrl}`);
    }

    // Reset share intent after handling
    resetShareIntent();
  }, [hasShareIntent, shareIntent, router, resetShareIntent]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent colorScheme={colorScheme} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppContent({
  colorScheme,
}: {
  colorScheme: ReturnType<typeof useColorScheme>;
}) {
  const { isLoading } = useAuth();

  return (
    <AnimatedSplashScreen ready={!isLoading}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <OfflineBanner />
        <Stack>
          <Stack.Screen name="(public)" options={{ headerShown: false }} />
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AnimatedSplashScreen>
  );
}
