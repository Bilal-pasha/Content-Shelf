import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { httpNextPublic } from '../axiosConfig';
import { API_ENDPOINTS } from '@/utils/api.endpoints';
import { tokenStorage } from './token.storage';
import { extractTokensFromCookies } from './cookie.utils';
import { ApiResponse, AuthResponse } from './auth.types';

/**
 * Google OAuth Configuration
 */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// Validate configuration
if (!GOOGLE_WEB_CLIENT_ID) {
  console.error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured');
}
if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
  console.warn('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not configured for iOS');
}

/**
 * Initialize Google Sign-In
 * Call this once when the app starts
 */
export const configureGoogleSignIn = () => {
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
  } catch (error) {
    console.error('Error configuring Google Sign-In:', error);
  }
};

/**
 * Google Authentication Service
 */
class GoogleAuthService {
  /**
   * Sign in with Google
   * Returns user data and tokens on success
   */
  async signInWithGoogle(): Promise<ApiResponse<AuthResponse['data']>> {
    try {
      // Validate configuration before attempting sign-in
      if (!GOOGLE_WEB_CLIENT_ID) {
        throw new Error('Google Sign-In is not properly configured. Please check your environment variables.');
      }

      // Check if Google Play Services are available (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Sign in with Google. v13+ returns a discriminated result:
      // { type: 'cancelled' } instead of throwing on user cancel.
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.type === 'cancelled') {
        throw new Error('Sign in was cancelled');
      }

      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('Failed to get Google ID token');
      }

      // Send ID token to backend for verification and authentication
      const response = await httpNextPublic.post<ApiResponse<AuthResponse['data']>>(
        API_ENDPOINTS.AUTH_SOCIAL_GOOGLE,
        { idToken }
      );

      // Extract and store tokens from cookies
      const { accessToken, refreshToken } = extractTokensFromCookies(response);
      if (accessToken && refreshToken) {
        await tokenStorage.setTokens(accessToken, refreshToken);
      }

      return response.data;
    } catch (error: any) {
      // Handle specific Google Sign-In errors
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        console.error('Google Sign-In error:', error);
        // Provide more helpful error message for DEVELOPER_ERROR
        if (error.message?.includes('DEVELOPER_ERROR')) {
          throw new Error(
            'Google Sign-In configuration error. Please ensure:\n' +
            '1. Your OAuth client IDs are correctly set in .env\n' +
            '2. SHA-1/SHA-256 certificates are added to Google Cloud Console (Android)\n' +
            '3. The bundle identifier matches your Google Cloud Console configuration'
          );
        }
        throw new Error(error.message || 'Failed to sign in with Google');
      }
    }
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Error signing out from Google:', error);
    }
  }

  /**
   * Whether this device has an existing Google session we could restore.
   * (`isSignedIn()` was removed from the SDK in v13 — `hasPreviousSignIn()`
   * is the replacement.)
   */
  hasPreviousSignIn(): boolean {
    try {
      return GoogleSignin.hasPreviousSignIn();
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      return false;
    }
  }

  /**
   * Get current Google user info (if signed in)
   */
  async getCurrentUser() {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }

  /**
   * Revoke access (disconnect from Google)
   */
  async revokeAccess(): Promise<void> {
    try {
      await GoogleSignin.revokeAccess();
    } catch (error) {
      console.error('Error revoking Google access:', error);
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
