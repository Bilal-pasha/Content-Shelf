# Mobile-Only Google OAuth Setup

> **⚠️ SECURITY NOTICE:** An earlier version of this document contained a real
> Google OAuth client secret in plaintext. That secret is compromised (it's
> in git history) and **must be rotated in the Google Cloud Console**
> (APIs & Services → Credentials → regenerate the client secret) before this
> app is trusted in production. This document now uses placeholders only —
> never put a real secret in a committed file.

This guide is specifically for setting up Google OAuth for **mobile apps only** when your backend is deployed on a server with an IP address (not a domain).

## The Challenge

Google OAuth doesn't allow raw IP addresses in redirect URIs. However, for mobile apps, **the redirect URI isn't actually used** because the mobile SDK handles authentication differently.

## How Mobile OAuth Works

```
┌─────────────┐
│  Mobile App │
│   (Expo)    │
└──────┬──────┘
       │ 1. User taps "Continue with Google"
       ▼
┌─────────────────────┐
│ Google Sign-In SDK  │
│   (Native Modal)    │
└──────┬──────────────┘
       │ 2. User authenticates with Google
       │ 3. SDK returns ID Token to app
       ▼
┌─────────────┐
│  Mobile App │
└──────┬──────┘
       │ 4. POST /v1/api/auth/google
       │    Body: { idToken: "..." }
       ▼
┌─────────────────────┐
│  Backend Server     │
│  18.212.234.107     │
└──────┬──────────────┘
       │ 5. Verify token with Google
       │ 6. Create/login user
       │ 7. Return JWT tokens
       ▼
┌─────────────┐
│  Mobile App │
│  (Dashboard)│
└─────────────┘
```

**Key Point**: The callback URL is never used in this flow!

## Your Current Setup

### Backend
```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
# Explicit allowlist required — the server refuses a wildcard origin
# combined with credentialed cookies (see server/src/common/constants/app.constants.ts)
CORS_ORIGIN=https://your-frontend-domain
```

### Mobile App
```env
EXPO_PUBLIC_API_URL=https://your-api-domain
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Google Cloud Console Configuration

### 1. OAuth Consent Screen
- **Application name**: Video Mobile App
- **User support email**: Your email
- **Scopes**: `email`, `profile`
- **Test users**: Add your test accounts (if in testing mode)

### 2. OAuth 2.0 Client IDs

You need **TWO** client IDs:

#### Web Application Client (Required)
- **Type**: Web application
- **Name**: Video App Web Client
- **Authorized redirect URIs**: 
  ```
  http://localhost:3000/api/auth/google/callback
  ```
  *(This won't be used by mobile, but Google requires it)*
- **Client ID**: `your-web-client-id.apps.googleusercontent.com`
- **Client Secret**: stored only in your deployment's secret manager / `.env` (never committed)

#### Android Client (For Android App)
- **Type**: Android
- **Name**: Video App Android
- **Package name**: `com.bilal_pasha.videomobileapplication`
- **SHA-1 certificate fingerprint**: 
  ```bash
  # Get debug SHA-1
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  
  # Get release SHA-1 (when you build for production)
  keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
  ```

#### iOS Client (For iOS App) - Optional
- **Type**: iOS
- **Name**: Video App iOS
- **Bundle ID**: `com.video-mobile-application.app`

## Configuration Files

### Backend `.env` (at server root)
```env
NODE_ENV=production
SERVER_PORT=8000

# Google OAuth - Mobile Only
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback

# CORS - explicit allowlist, no wildcard (see security notice above)
CORS_ORIGIN=https://your-frontend-domain

# Frontend URL
FRONTEND_URL=http://18.212.234.107
```

### Mobile `.env`
```env
# Backend API (your deployed server)
EXPO_PUBLIC_API_URL=http://18.212.234.107

# Google OAuth (use WEB client ID, not Android/iOS)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=816917709083-jb0c8j5rhuloskeobklqvt9r6f6squ0e.apps.googleusercontent.com

# iOS Client ID (optional, for iOS-specific features)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

## Testing the Setup

### 1. Verify Backend is Running
```bash
curl http://18.212.234.107/api/health
```

### 2. Test Mobile App

1. **Start the mobile app**:
   ```bash
   cd mobile
   npx expo start
   ```

2. **On your device/emulator**:
   - Navigate to Login or Register screen
   - Tap "Continue with Google"
   - Select your Google account
   - Authorize the app

3. **Expected behavior**:
   - Google Sign-In modal opens
   - After selecting account, modal closes
   - Toast notification: "Welcome! Successfully signed in with Google"
   - Redirected to Dashboard

### 3. Verify Backend Receives Request

Check your backend logs for:
```
POST /v1/api/auth/google
Body: { idToken: "eyJhbGc..." }
Response: { success: true, message: "Login successful", data: { user: {...} } }
```

## Troubleshooting

### "Developer Error" on Android
**Cause**: SHA-1 certificate not registered in Google Console

**Fix**:
1. Get your SHA-1:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
2. Add it to your Android OAuth client in Google Console
3. Wait a few minutes for changes to propagate

### "Sign in was cancelled"
**Cause**: User cancelled the flow (expected behavior)

**Fix**: No fix needed - this is normal user behavior

### "Invalid Google token"
**Cause**: 
- Wrong Web Client ID in mobile `.env`
- Token expired before reaching backend
- Backend can't reach Google's servers

**Fix**:
1. Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` matches your Web Client ID
2. Check backend logs for specific error
3. Ensure backend has internet access to verify tokens

### "Network Error" / "Failed to fetch"
**Cause**: Mobile app can't reach backend at `18.212.234.107`

**Fix**:
1. Verify backend is running: `curl http://18.212.234.107`
2. Check firewall rules on your server
3. Ensure port is open (default: 80 or 3000)
4. For Android emulator, you might need to use `10.0.2.2` instead of `localhost`

### "CORS Error"
**Cause**: Backend CORS not configured for mobile requests

**Fix**: Ensure backend `.env` has:
```env
CORS_ORIGIN=*
```

## Security Considerations

### ✅ What's Secure
- ID tokens are verified server-side
- Tokens are short-lived
- Client secret is never exposed to mobile app
- JWT tokens are stored via `expo-secure-store` (iOS Keychain / Android
  Keystore) — earlier versions of this doc and the app used AsyncStorage,
  which is **not** encrypted at rest; that has been fixed

### ⚠️ Important Notes
1. **Never commit `.env` files** - they contain secrets
2. **Use HTTPS in production** - Consider getting a domain and SSL certificate
3. **Rotate secrets regularly** - Change client secret periodically
4. **Monitor failed auth attempts** - Set up logging and alerts

## Production Checklist

- [ ] Google OAuth credentials created (Web + Android + iOS)
- [ ] SHA-1 certificate registered for Android
- [ ] Backend `.env` configured with correct credentials
- [ ] Mobile `.env` configured with backend IP and Web Client ID
- [ ] Database migration run (`npm run migration:run`)
- [ ] Backend deployed and accessible at `18.212.234.107`
- [ ] CORS configured to allow mobile requests
- [ ] Tested on Android device/emulator
- [ ] Tested on iOS device/simulator (if applicable)
- [ ] Error handling tested (cancel, network errors, etc.)

## Future Improvements

When you get a domain name:

1. **Point domain to your server**:
   ```
   yourdomain.com → 18.212.234.107
   ```

2. **Update Google Console**:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```

3. **Update environment variables**:
   ```env
   # Backend
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   
   # Mobile
   EXPO_PUBLIC_API_URL=https://yourdomain.com
   ```

4. **Add SSL certificate** (use Let's Encrypt with Caddy - already configured!)

## Support

For issues:
1. Check backend logs for errors
2. Check mobile app console for errors
3. Verify Google Cloud Console configuration
4. Review [Full Documentation](./docs/GOOGLE_OAUTH_SETUP.md)

## Summary

✅ **Mobile OAuth works without a domain** because:
- Mobile SDK gets ID token directly from Google
- No browser redirect needed
- Backend only verifies the token
- Callback URL is required by Google but not used

✅ **Your setup is production-ready** for mobile-only OAuth!
