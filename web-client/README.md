# Web Client

React web application with drag-and-drop file upload, chunked transfers, and real-time progress tracking.

## Tech Stack

- React 18 + TypeScript
- Zustand (state management)
- Axios (HTTP client)
- SparkMD5 (MD5 calculation)

## Installation

```bash
npm install
```

## Running

```bash
# Development
npm start

# Production build
npm run build

# Tests
npm test
```

## Configuration

Edit API endpoint in [`src/services/apiClient.ts`](src/services/apiClient.ts):

```typescript
constructor(baseURL: string = 'http://127.0.0.1:8000/api') {
  // Change baseURL for production
}
```

## Key Features

### Drag & Drop Interface
- [`FileDropzone.tsx`](src/components/FileDropzone.tsx) - File picker with drag-and-drop
- [`FileItem.tsx`](src/components/FileItem.tsx) - Individual file upload UI

### MD5 Hash Calculation
Uses **SparkMD5** library (browsers don't support MD5 in `crypto.subtle`):

```typescript
import SparkMD5 from 'spark-md5';

// Reads file in chunks and calculates MD5
// Matches backend's PHP md5_file() verification
```

### Upload Manager
- Chunked upload (1MB chunks)
- Parallel processing (max 3 concurrent)
- Auto-retry with exponential backoff
- Queue management

### State Management
Zustand store for file list, progress tracking, and upload history (localStorage).

## Supported Files

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, MOV, AVI, MPEG

## Common Issues

**CORS Errors**: Configure backend `.env`:
```env
CORS_ALLOW_ORIGIN=http://localhost:3000
```

**MD5 Mismatch**: Ensure SparkMD5 is installed:
```bash
npm install spark-md5 @types/spark-md5
```

**Upload Stuck**: Check backend is running and API endpoint is correct.

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## License

MIT
