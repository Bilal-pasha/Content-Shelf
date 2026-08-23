# Your Google OAuth Setup - Quick Reference

## Your Configuration

### Backend Server
- **IP Address**: `18.212.234.107`
- **API Endpoint**: `http://18.212.234.107/v1/api/auth/google`

### Google OAuth Credentials
- **Web Client ID**: `816917709083-jb0c8j5rhuloskeobklqvt9r6f6squ0e.apps.googleusercontent.com`
- **Client Secret**: `<rotate-this-in-google-cloud-console-see-MOBILE_OAUTH_SETUP.md>`

### Package Names
- **Android**: `com.bilal_pasha.videomobileapplication`
- **iOS**: `com.video-mobile-application.app`

## Google Cloud Console Setup

### 1. Create Web Application OAuth Client

Go to: [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

**Settings**:
- Type: **Web application**
- Name: `Video App Web Client`
- Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`

**Credentials** (already created):
- Client ID: `816917709083-jb0c8j5rhuloskeobklqvt9r6f6squ0e.apps.googleusercontent.com`
- Client Secret: `<rotate-this-in-google-cloud-console-see-MOBILE_OAUTH_SETUP.md>`

### 2. Create Android OAuth Client

**Settings**:
- Type: **Android**
- Name: `Video App Android`
- Package name: `com.bilal_pasha.videomobileapplication`
- SHA-1 certificate fingerprint: 

**Get your SHA-1**:
```bash
# For debug builds (development)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release builds (production)
keytool -list -v -keystore /path/to/release.keystore -alias your-key-alias
```

Copy the SHA-1 fingerprint and paste it in Google Console.

### 3. Create iOS OAuth Client (Optional)

**Settings**:
- Type: **iOS**
- Name: `Video App iOS`
- Bundle ID: `com.video-mobile-application.app`

## Environment Files

### Backend `.env` (Root directory)
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=816917709083-jb0c8j5rhuloskeobklqvt9r6f6squ0e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<rotate-this-in-google-cloud-console-see-MOBILE_OAUTH_SETUP.md>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# CORS Configuration
CORS_ORIGIN=*

# Frontend URL
FRONTEND_URL=http://18.212.234.107
```

### Mobile `.env` (mobile/ directory)
```env
# Backend API
EXPO_PUBLIC_API_URL=http://18.212.234.107

# Google OAuth (use WEB client ID)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=816917709083-jb0c8j5rhuloskeobklqvt9r6f6squ0e.apps.googleusercontent.com

# iOS Client ID (optional)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

## Deployment Steps

### 1. Backend Deployment

```bash
# SSH into your server
ssh user@18.212.234.107

# Navigate to project
cd /path/to/Video-Mobile-Application

# Update .env with the configuration above

# Run database migration
cd server
npm run migration:run

# Restart the server
# (depends on your deployment method - Docker, PM2, etc.)
```

### 2. Mobile App Build

```bash
cd mobile

# Make sure .env is configured

# For Android
npx expo run:android

# For iOS
npx expo run:ios

# Or build for production
eas build --platform android
eas build --platform ios
```

## Testing Checklist

### Backend Tests
```bash
# Test server is accessible
curl http://18.212.234.107

# Test auth endpoint exists
curl http://18.212.234.107/v1/api/auth/google
# Should return 400 or 401 (not 404)
```

### Mobile App Tests
- [ ] App builds successfully
- [ ] Login screen shows "Continue with Google" button
- [ ] Register screen shows "Continue with Google" button
- [ ] Tapping button opens Google Sign-In modal
- [ ] Can select Google account
- [ ] After selection, redirects to dashboard
- [ ] User data is saved in backend
- [ ] Can logout and login again with Google

### Google Console Verification
- [ ] Web OAuth client created with correct redirect URI
- [ ] Android OAuth client created with correct package name
- [ ] SHA-1 certificate added to Android client
- [ ] iOS OAuth client created (if building for iOS)
- [ ] OAuth consent screen configured
- [ ] Test users added (if in testing mode)

## Common Issues & Solutions

### Issue: "Developer Error" on Android
**Solution**: Add SHA-1 certificate to Android OAuth client in Google Console

### Issue: "Invalid Google token"
**Solution**: Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` matches Web Client ID (not Android/iOS)

### Issue: "Network Error"
**Solution**: 
1. Check backend is running: `curl http://18.212.234.107`
2. Check firewall allows traffic on port 80/3000
3. Verify `EXPO_PUBLIC_API_URL` in mobile `.env`

### Issue: "CORS Error"
**Solution**: Set `CORS_ORIGIN=*` in backend `.env`

## Important Notes

⚠️ **Security**:
- Never commit `.env` files to Git
- Keep client secret secure
- Use HTTPS in production (get a domain + SSL)

✅ **Mobile OAuth**:
- Callback URL is NOT used for mobile apps
- Mobile SDK handles authentication directly
- Backend only verifies the ID token

🎯 **Production Ready**:
- This setup works for mobile-only apps
- No domain required
- Backend can be on IP address

## Next Steps

1. **Get SHA-1 certificate** and add to Google Console
2. **Update both `.env` files** with the credentials above
3. **Run database migration** on backend
4. **Restart backend server**
5. **Build and test mobile app**

## Support

For detailed guides:
- **Mobile-Only Setup**: [MOBILE_OAUTH_SETUP.md](./MOBILE_OAUTH_SETUP.md)
- **Quick Start**: [GOOGLE_OAUTH_QUICKSTART.md](./GOOGLE_OAUTH_QUICKSTART.md)
- **Full Documentation**: [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md)

---

**Last Updated**: January 27, 2026
**Backend IP**: 18.212.234.107
**Status**: ✅ Configured for mobile-only OAuth
