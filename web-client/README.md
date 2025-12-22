# Media Upload System - Web Client

React-based web client for the Media File Upload System with drag-and-drop support, chunked uploads, and real-time progress tracking.

## Features

- **Drag & Drop Interface**: Intuitive file selection
- **Multiple File Upload**: Upload up to 10 files simultaneously
- **Chunked Upload**: Files split into 1MB chunks for reliable transfer
- **Real-time Progress**: Track upload progress for each file
- **Pause/Resume/Cancel**: Full control over uploads
- **Auto-Retry**: Exponential backoff retry logic (max 3 retries)
- **Upload History**: Local storage of completed uploads
- **Responsive Design**: Works on desktop and tablet
- **Error Handling**: Clear error messages and recovery options

## Tech Stack

- **React 18** with TypeScript
- **Zustand** for state management
- **Axios** for HTTP requests
- **SparkMD5** for MD5 hash calculation
- **Create React App** build tooling

## Installation

```bash
# Install dependencies
npm install

# Dependencies include:
# - react & react-dom
# - typescript
# - axios (HTTP client)
# - zustand (state management)
# - spark-md5 (MD5 calculation)
# - @types/spark-md5 (TypeScript types)
```

## Running the Application

### Development Mode

```bash
npm start
```

Opens the app at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

### Testing

```bash
npm test
```

Launches the test runner in interactive watch mode.

## Project Structure

```
web-client/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── FileDropzone.tsx      # Drag & drop file picker
│   │   ├── FileDropzone.css
│   │   ├── FileItem.tsx           # Individual file upload item
│   │   └── FileItem.css
│   ├── services/
│   │   ├── apiClient.ts           # API communication
│   │   └── uploadManager.ts       # Upload logic & MD5 calculation
│   ├── store/
│   │   └── uploadStore.ts         # Zustand state management
│   ├── types/
│   │   └── upload.ts              # TypeScript type definitions
│   ├── App.tsx                    # Main application component
│   ├── App.css
│   └── index.tsx                  # Application entry point
└── package.json
```

## Configuration

### API Endpoint

The default API endpoint is `http://127.0.0.1:8000/api`. To change it, edit [`src/services/apiClient.ts`](src/services/apiClient.ts):

```typescript
constructor(baseURL: string = 'http://127.0.0.1:8000/api') {
  // Change the baseURL here
}
```

### Upload Settings

Upload settings are fetched from the backend `/upload/config` endpoint:
- Max file size
- Allowed file types
- Chunk size
- Max parallel uploads

## Key Components

### FileDropzone

Drag-and-drop file picker component with:
- Click to browse functionality
- Visual feedback for drag events
- File type and size validation
- Multiple file selection

### FileItem

Individual file upload component showing:
- File name, size, and type
- Upload progress bar
- Pause/Resume/Cancel buttons
- Error messages
- Retry count

### Upload Manager

Core upload logic including:
- **MD5 Calculation**: Uses SparkMD5 for proper MD5 hashing (browsers don't support MD5 in crypto.subtle)
- **Chunk Upload**: Splits files into 1MB chunks
- **Parallel Processing**: Max 3 concurrent uploads
- **Queue Management**: Automatic queue processing
- **Retry Logic**: Exponential backoff (1s, 2s, 4s)
- **Error Handling**: Categorized error messages

### Upload Store

Zustand-based state management for:
- File list and status
- Upload progress tracking
- History management
- Configuration caching

## Important: MD5 Hash Calculation

The web client uses **SparkMD5** library for MD5 calculation because:

⚠️ **Browser's `crypto.subtle.digest()` does NOT support MD5**

The implementation in [`uploadManager.ts`](src/services/uploadManager.ts) reads files in 2MB chunks and calculates the correct MD5 hash that matches the backend's PHP `md5_file()` function.

```typescript
import SparkMD5 from 'spark-md5';

private async calculateMD5(file: File): Promise<string> {
  // Reads file in chunks and calculates MD5
  // This ensures the hash matches backend verification
}
```

## Upload Flow

1. **File Selection**: User drags/drops or selects files
2. **Validation**: Client validates file type and size
3. **MD5 Calculation**: Calculate file hash using SparkMD5
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

## Error Handling

The application handles various error scenarios:

- **Network Errors**: Automatic retry with exponential backoff
- **Validation Errors**: Clear messages about file type/size issues
- **Server Errors**: Detailed error messages from backend
- **Integrity Errors**: MD5 mismatch detection

## Local Storage

Upload history is stored in browser's localStorage:
- Key: `upload_history`
- Max items: 50
- Data: filename, size, type, completion time, storage path

## Development Tips

### Enable Debug Logging

Add console logs in [`uploadManager.ts`](src/services/uploadManager.ts) for debugging:

```typescript
console.log('MD5 Hash:', md5Hash);
console.log('Upload initiated:', initResponse);
```

### Test with Different File Sizes

- Small files (< 1MB): Single chunk upload
- Medium files (1-10MB): Multiple chunks
- Large files (> 100MB): Test pause/resume

### Monitor Network

Use browser DevTools Network tab to:
- Inspect API requests/responses
- Check chunk upload timing
- Debug CORS issues

## Common Issues

### CORS Errors

Ensure backend CORS is configured:
```env
CORS_ALLOW_ORIGIN=http://localhost:3000
```

### MD5 Mismatch

If you get "File integrity check failed":
- Ensure SparkMD5 is installed: `npm install spark-md5 @types/spark-md5`
- Check that the MD5 calculation completes before upload
- Verify file isn't modified during upload

### Upload Stuck

If uploads don't progress:
- Check backend is running
- Verify API endpoint URL
- Check browser console for errors
- Ensure backend storage directories are writable

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- FileReader API
- Blob API
- FormData API
- LocalStorage API

## Performance

- **Chunk Size**: 1MB (optimal for most connections)
- **Parallel Uploads**: Max 3 files simultaneously
- **MD5 Calculation**: Chunked reading (2MB) for large files
- **Memory Usage**: Efficient chunk-based processing

## Security

- Client-side file type validation
- File size limits enforced
- MD5 integrity verification
- No sensitive data in localStorage

## Future Enhancements

- [ ] Upload progress persistence across page reloads
- [ ] Image preview before upload
- [ ] Video thumbnail generation
- [ ] Batch operations (pause all, cancel all)
- [ ] Upload speed indicator
- [ ] Estimated time remaining
- [ ] Compression before upload

## License

MIT

## Learn More

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Documentation](https://reactjs.org/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [SparkMD5 Documentation](https://github.com/satazor/js-spark-md5)
