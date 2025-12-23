# Mobile Client

React Native mobile app with native file picker, camera integration, and chunked uploads.

## Tech Stack

- React Native + Expo + TypeScript
- Zustand (state management)
- Axios (HTTP client)
- Expo File System & Crypto (file handling & MD5)
- AsyncStorage (persistent data)

## Installation

```bash
npm install
```

## Running

```bash
# Development server
npx expo start

# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Configuration

Edit API endpoint in [`config/api.config.ts`](config/api.config.ts):

```typescript
// Android emulator (default)
API_URL: 'http://10.0.2.2:8000/api'

// Physical devices (use your computer's IP)
API_URL: 'http://192.168.1.100:8000/api'
```

## Key Features

### Native File Access
- File picker for gallery/files
- Camera integration for photo/video capture
- Permissions management (iOS/Android)

### MD5 Hash Calculation
Uses **Expo Crypto** for native MD5 calculation:

```typescript
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

// Calculates MD5 matching backend's PHP md5_file()
```

### Upload Manager
- Chunked upload (1MB chunks)
- Parallel processing (max 3 concurrent)
- Auto-retry with exponential backoff
- Queue management

### State Management
Zustand store with AsyncStorage for persistent upload history.

## Supported Files

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, MOV, AVI, MPEG

## Permissions

**iOS** (Info.plist):
```xml
<key>NSPhotoLibraryUsageDescription</key>
<key>NSCameraUsageDescription</key>
```

**Android** (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

## Common Issues

**Cannot Connect (Android Emulator)**: Default `10.0.2.2` should work. Ensure backend runs on port 8000.

**Cannot Connect (Physical Device)**: Update `API_URL` with your computer's IP. Ensure same network and firewall allows port 8000.

**Permission Denied**: Request permissions before file access. Reinstall app after adding permissions.

## Platform Notes

- **iOS**: Requires Xcode
- **Android**: Requires Android Studio, enable USB debugging for physical devices

## License

MIT
