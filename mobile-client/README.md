# Media Upload System - Mobile Client

React Native mobile client for the Media File Upload System with native file picker, camera integration, and chunked uploads.

## Features

- **Native File Picker**: Access device gallery and files
- **Camera Integration**: Direct photo/video capture
- **Multiple File Upload**: Upload up to 10 files simultaneously
- **Chunked Upload**: Files split into 1MB chunks for reliable transfer
- **Real-time Progress**: Track upload progress for each file
- **Pause/Resume/Cancel**: Full control over uploads
- **Auto-Retry**: Exponential backoff retry logic (max 3 retries)
- **Upload History**: Persistent storage of completed uploads
- **Background Upload**: Continue uploads when app is in background
- **Error Handling**: Clear error messages and recovery options

## Tech Stack

- **React Native** with Expo
- **TypeScript**
- **Zustand** for state management
- **Axios** for HTTP requests
- **Expo File System** for file system access
- **Expo Crypto** for MD5 calculation
- **AsyncStorage** for persistent data

## Installation

```bash
# Install dependencies
npm install

# Dependencies include:
# - expo & react-native
# - typescript
# - axios (HTTP client)
# - zustand (state management)
# - expo-file-system (file system access)
# - expo-crypto (MD5 hash calculation)
# - @react-native-async-storage/async-storage
```

## Running the Application

### iOS

```bash
npm run ios
# OR
npx expo run:ios
```

### Android

```bash
npm run android
# OR
npx expo run:android
```

### Development Mode

```bash
npx expo start
```

## Project Structure

```
mobile-client/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Upload screen
│   │   └── explore.tsx        # History screen
│   └── _layout.tsx
├── services/
│   ├── apiClient.ts           # API communication
│   └── uploadManager.ts       # Upload logic & MD5 calculation
├── store/
│   └── uploadStore.ts         # Zustand state management
├── types/
│   └── upload.ts              # TypeScript type definitions
├── components/
│   └── (UI components)
└── package.json
```

## Configuration

### API Endpoint

Configure the backend server URL in [`config/api.config.ts`](config/api.config.ts):

```typescript
// For Android emulator (default - works out of the box)
const DEV_CONFIG = {
  API_URL: 'http://10.0.2.2:8000/api',
  DEBUG: true,
};

// For physical devices (update with your computer's IP)
const DEV_CONFIG = {
  API_URL: 'http://192.168.1.100:8000/api',
  DEBUG: true,
};

// For production
const PROD_CONFIG = {
  API_URL: 'https://your-domain.com/api',
  DEBUG: false,
};
```

**Note:** The default configuration (`10.0.2.2`) works for Android emulators. For physical devices, update with your computer's IP address.

## Key Services

### API Client

Handles all HTTP communication with the backend:
- Initiate upload sessions
- Upload file chunks
- Finalize uploads
- Query upload status
- Cancel uploads

### Upload Manager

Core upload logic including:
- **MD5 Calculation**: Uses Expo Crypto's `digestStringAsync()` function for proper MD5 calculation
- **Chunk Upload**: Splits files into 1MB chunks using Expo File System
- **Parallel Processing**: Max 3 concurrent uploads
- **Queue Management**: Automatic queue processing
- **Retry Logic**: Exponential backoff (1s, 2s, 4s)
- **Error Handling**: Categorized error messages

### Upload Store

Zustand-based state management for:
- File list and status
- Upload progress tracking
- History management (AsyncStorage)
- Configuration caching

## Important: MD5 Hash Calculation

The mobile client uses **Expo Crypto's `digestStringAsync()` function** for MD5 calculation:

```typescript
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

private async calculateMD5(fileUri: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    })
  );
  return hash;
}
```

This ensures the hash matches the backend's PHP `md5_file()` verification, which is critical for file integrity checks.

## Upload Flow

1. **File Selection**: User picks files from gallery or camera
2. **Validation**: Client validates file type and size
3. **MD5 Calculation**: Calculate file hash using Expo Crypto
4. **Initiate Upload**: POST to `/api/upload/initiate`
5. **Chunk Upload**: Upload 1MB chunks in parallel (max 3)
6. **Progress Tracking**: Real-time progress updates
7. **Finalize**: POST to `/api/upload/finalize`
8. **Completion**: File saved and added to history

## Supported File Types

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Videos
- MP4 (.mp4, .m4v)
- QuickTime (.mov, .qt)
- AVI (.avi)
- MPEG (.mpeg, .mpg)

## Permissions

The app requires the following permissions:

### iOS (Info.plist)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to upload images and videos</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos and videos</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

## Usage Example

```typescript
import { useUploadStore } from './store/uploadStore';
import * as DocumentPicker from 'expo-document-picker';

function UploadScreen() {
  const { addFiles, startUpload } = useUploadStore();

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'video/*'],
      multiple: true,
    });

    if (result.type === 'success') {
      const uploadFile = {
        id: `${result.name}-${Date.now()}`,
        uri: result.uri,
        name: result.name,
        type: result.mimeType,
        size: result.size,
        status: 'pending',
        progress: 0,
        uploadedChunks: 0,
        totalChunks: 0,
        retryCount: 0,
      };

      addFiles([uploadFile]);
      startUpload(uploadFile.id);
    }
  };

  return (
    <Button title="Pick Files" onPress={pickFiles} />
  );
}
```

## Error Handling

The application handles various error scenarios:

- **Network Errors**: Automatic retry with exponential backoff
- **Validation Errors**: Clear messages about file type/size issues
- **Server Errors**: Detailed error messages from backend
- **Integrity Errors**: MD5 mismatch detection
- **Permission Errors**: Prompts for required permissions

## AsyncStorage

Upload history is stored in AsyncStorage:
- Key: `@upload_history`
- Max items: 50
- Data: filename, size, type, completion time, storage path

## Development Tips

### Testing on Android Emulator

The default configuration works out of the box:
- Uses `10.0.2.2` which maps to `localhost` on your computer
- No network configuration needed

### Testing on Physical Devices

1. Find your computer's IP address (`ipconfig` on Windows, `ifconfig` on macOS/Linux)
2. Update `API_URL` in [`config/api.config.ts`](config/api.config.ts) with your IP
3. Ensure your device and computer are on the same network
4. Check firewall settings allow connections on port 8000

### Enable Debug Logging

Add console logs in [`uploadManager.ts`](services/uploadManager.ts) for debugging:

```typescript
console.log('MD5 Hash:', md5Hash);
console.log('Upload initiated:', initResponse);
```

### Test with Different File Sizes

- Small files (< 1MB): Single chunk upload
- Medium files (1-10MB): Multiple chunks
- Large files (> 100MB): Test pause/resume

## Common Issues

### Cannot Connect to Backend

**For Android Emulator:**
- Default configuration should work (`10.0.2.2`)
- Ensure backend is running on port 8000
- Check firewall settings

**For Physical Devices:**
- Update `API_URL` with your computer's IP address
- Ensure device and computer are on the same network
- Check firewall settings allow connections on port 8000
- Verify CORS configuration on backend

### MD5 Mismatch

If you get "File integrity check failed":
- Ensure expo-file-system and expo-crypto are properly installed
- Check that file isn't modified during upload
- Verify file permissions

### Permission Denied

**Solution:**
- Request permissions before accessing files/camera
- Check Info.plist (iOS) or AndroidManifest.xml (Android)
- Reinstall app after adding permissions

## Platform-Specific Notes

### iOS
- Requires Xcode for building
- Expo manages native dependencies automatically
- Test on simulator or physical device

### Android
- Requires Android Studio
- Enable USB debugging for physical devices
- Test on emulator or physical device

## Performance

- **Chunk Size**: 1MB (optimal for mobile networks)
- **Parallel Uploads**: Max 3 files simultaneously
- **MD5 Calculation**: Native implementation (fast)
- **Memory Usage**: Efficient chunk-based processing

## Security

- Client-side file type validation
- File size limits enforced
- MD5 integrity verification
- Secure HTTPS communication (production)
- No sensitive data in AsyncStorage

## Background Upload

For background upload support, consider using:
- `expo-task-manager`
- `expo-background-fetch`

## Future Enhancements

- [ ] Background upload continuation
- [ ] Image compression before upload
- [ ] Video thumbnail generation
- [ ] Batch operations (pause all, cancel all)
- [ ] Upload speed indicator
- [ ] Estimated time remaining
- [ ] Cloud storage integration

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
npx expo start -c

# iOS: Clean build
cd ios && pod install && cd ..

# Android: Clean build
cd android && ./gradlew clean && cd ..
```

### Network Issues

- Check API endpoint URL
- Verify backend is running
- Test with Postman/cURL first
- Check device network connection

## License

MIT

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/)
