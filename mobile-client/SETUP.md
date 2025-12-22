# Mobile Client Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend Server

Make sure your backend server is running:

```bash
cd ../backend
symfony server:start
```

The backend should be accessible at `http://YOUR_IP:8000`

### 4. Run the Mobile App

```bash
# Start Expo development server
npm start

# Or run directly on a platform
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Testing Connection

Once the backend is running:
1. The app will load configuration from the backend
2. You can start uploading files
3. Upload progress will be displayed in real-time

## Common Issues

### "Network error: Unable to reach server"

**Cause:** The mobile app cannot connect to the backend.

**Solutions:**
1. ✅ Ensure backend server is running (`symfony server:start`)
2. ✅ For physical devices: Update `API_URL` in `config/api.config.ts` with your computer's IP address
3. ✅ Check that your phone is on the same network as your computer (for physical devices)
4. ✅ Disable firewall or allow connections on port 8000
5. ✅ Test the URL in a browser: `http://10.0.2.2:8000/api/upload/config` (emulator) or `http://YOUR_IP:8000/api/upload/config` (physical device)

### "Cannot read property 'RNFSFileTypeRegular' of null"

**Cause:** This error occurred with the old `react-native-fs` library.

**Solution:** This has been fixed! The app now uses `expo-file-system` and `expo-crypto` which are fully compatible with Expo.

### Permission Errors

**iOS:**
- Camera and photo library permissions are requested automatically
- If denied, go to Settings → Your App → Permissions

**Android:**
- Storage and camera permissions are requested automatically
- If denied, go to Settings → Apps → Your App → Permissions

## Network Requirements

### For Android Emulator
- Default configuration (`10.0.2.2`) works out of the box
- No network configuration needed

### For Physical Devices
- Your computer and mobile device must be on the **same WiFi network**
- Update `API_URL` in `config/api.config.ts` with your computer's IP address
- The backend server must be accessible from your device
- Port 8000 must not be blocked by firewall

## Testing the Setup

1. Open the app
2. Tap "Pick Files" or "Camera"
3. Select a small image file
4. Watch the upload progress
5. Check the backend for the uploaded file

## Development Tips

### Enable Debug Logging

In [`config/api.config.ts`](config/api.config.ts):
```typescript
DEBUG: true,  // Shows detailed logs in console
```

### Test with Different File Sizes

- Small (< 1MB): Tests single chunk upload
- Medium (1-10MB): Tests multiple chunks
- Large (> 10MB): Tests progress tracking and pause/resume

### Check Backend Logs

Monitor backend logs to see incoming requests:
```bash
cd ../backend
tail -f var/log/dev.log
```

## Production Deployment

For production, update the production configuration:

```typescript
const PROD_CONFIG = {
  API_URL: 'https://your-production-domain.com/api',
  DEBUG: false,
};
```

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the [API Documentation](../docs/API_DOCUMENTATION.md)
- Check backend logs for errors
- Verify network connectivity with `ping YOUR_IP`
