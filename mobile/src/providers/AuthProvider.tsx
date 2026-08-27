import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'expo-router';

import { authService } from '@/services/auth/auth.services';
import type { User } from '@/services/auth/auth.types';
import type { LoginFormData, RegisterFormData } from '@/schemas/auth.schemas';
import { PrivateRoutes, PublicRoutes } from '@/constants/routes';
import { useQueryClient } from '@tanstack/react-query';
import { linksService } from '@/services/links/links.services';
import { pendingLinkStorage } from '@/services/links/pending-link.storage';
import { googleAuthService } from '@/services/auth/google-auth.service';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signIn: (
    credentials: LoginFormData
  ) => Promise<{ success: boolean; message?: string }>;
  signUp: (
    userData: RegisterFormData
  ) => Promise<{ success: boolean; message?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  fetchUserStatus: () => Promise<User | null>;
  clearError: () => void;
  updateUserProfile: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const fetchUserStatus = useCallback(async (): Promise<User | null> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const response = await Promise.race([
        authService.getCurrentUser(),
        timeoutPromise,
      ]);

      if (!response.success) {
        throw new Error(response.message);
      }

      const user = response.data?.user ?? null;

      setState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        error: null,
      });

      if (user) {
        queryClient.setQueryData(['user'], user);
      } else {
        queryClient.removeQueries({ queryKey: ['user'] });
      }

      return user;
    } catch (error) {
      console.log('Auth check failed:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      queryClient.removeQueries({ queryKey: ['user'] });
      return null;
    }
  }, [queryClient]);

  // Save a link the user shared before authenticating (see pending-link.storage).
  // Isolated in its own try/catch so a save failure never turns a successful
  // sign-in into a failed one.
  const consumePendingLink = useCallback(async (): Promise<void> => {
    try {
      const pendingUrl = await pendingLinkStorage.get();
      if (pendingUrl) {
        await linksService.create({ url: pendingUrl });
        await pendingLinkStorage.clear();
      }
    } catch (err) {
      console.log('Failed to save pending shared link:', err);
    }
  }, []);

  const signIn = useCallback(
    async (
      credentials: LoginFormData
    ): Promise<{ success: boolean; message?: string }> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await authService.login(credentials);

        if (!response.success) {
          throw new Error(response.message);
        }

        const user = await fetchUserStatus();

        if (user) {
          await consumePendingLink();
          router.replace(PrivateRoutes.DASHBOARD);
        }

        return { success: true, message: response.message };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Sign in failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          isAuthenticated: false,
          user: null,
        }));
        return { success: false, message };
      }
    },
    [fetchUserStatus, consumePendingLink, router]
  );

  const signUp = useCallback(
    async (
      userData: RegisterFormData
    ): Promise<{ success: boolean; message?: string }> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await authService.register(userData);

        if (!response.success) {
          throw new Error(response.message);
        }

        const user = await fetchUserStatus();

        if (user) {
          await consumePendingLink();
          router.replace(PrivateRoutes.DASHBOARD);
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        return { success: true, message: response.message };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Sign up failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        return { success: false, message };
      }
    },
    [fetchUserStatus, consumePendingLink, router]
  );

  const signInWithGoogle = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await googleAuthService.signInWithGoogle();
      if (!response.success) {
        throw new Error(response.message);
      }

      // Google service already stored the tokens; refresh provider state so
      // the protected layout sees `isAuthenticated` before we navigate.
      const user = await fetchUserStatus();
      if (user) {
        await consumePendingLink();
        router.replace(PrivateRoutes.DASHBOARD);
      }

      return { success: true, message: response.message };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google sign in failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
        isAuthenticated: false,
        user: null,
      }));
      return { success: false, message };
    }
  }, [fetchUserStatus, consumePendingLink, router]);

  const signOut = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      await authService.logout();
      // Best-effort: drop the native Google session too so the next
      // "Continue with Google" shows the account chooser.
      await googleAuthService.signOut();
      queryClient.removeQueries({ queryKey: ['user'] });

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      router.replace(PublicRoutes.LOGIN);
    } catch {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      queryClient.removeQueries({ queryKey: ['user'] });
      router.replace(PublicRoutes.LOGIN);
    }
  }, [queryClient, router]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const updateUserProfile = useCallback((userData: Partial<User>) => {
    setState((prev) =>
      prev.user
        ? { ...prev, user: { ...prev.user, ...userData } }
        : prev
    );
  }, []);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    fetchUserStatus,
    clearError,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
