# Media File Upload System

A comprehensive file upload system supporting chunked uploads, file validation, and multi-platform support (Web & Mobile).

## Project Structure

```
Media_File_Upload_System/
├── backend/              # Symfony 6 PHP Backend
├── web-client/          # React Web Application
├── mobile-client/       # React Native Mobile Application
└── docs/               # Documentation
```

## Features

### Common Features (All Clients)
- **File Picker**: Support for 1-10 files with image/* and video/* filtering
- **Chunked Upload**: Fixed 1MB chunks with concurrent upload support (max 3 parallel)
- **Upload Progress**: Real-time progress tracking for individual and overall uploads
- **Pause/Resume/Cancel**: Full control over upload operations
- **Auto-Retry**: Exponential backoff with max 3 retries
- **Error Handling**: Categorized error messages for better user experience

### Web-Specific Features
- Drag-and-drop upload interface
- Responsive layout (desktop/tablet)
- Upload history in local storage

### Mobile-Specific Features
- Native file picker integration
- Direct camera upload
- Background upload support
- Permission management (camera/gallery/storage)

### Backend Features
- Chunk reception and reassembly
- Secondary file validation (Magic Number detection)
- Automatic cleanup of incomplete chunks (30-minute timeout)
- Organized storage by date/user
- File deduplication (MD5 checksum)
- Automatic file cleanup (30-day retention)
- RESTful API with chunk upload endpoints

## Tech Stack

- **Backend**: PHP 8.1+, Symfony 6
- **Web Client**: React 18+, TypeScript
- **Mobile Client**: React Native, TypeScript
- **Storage**: Local filesystem (easily adaptable to S3/cloud storage)

## Quick Start

### Backend (Symfony)
```bash
cd backend
composer install
php bin/console doctrine:migrations:migrate
symfony server:start
# OR: php -S localhost:8000 -t public/
```

### Web Client (React)
```bash
cd web-client
npm install  # Includes spark-md5 for proper MD5 calculation
npm start
```

**Important:** The web client uses SparkMD5 library for MD5 hash calculation because browsers don't support MD5 in the native crypto API. This ensures the hash matches the backend's PHP `md5_file()` verification.

### Mobile Client (React Native with Expo)
```bash
cd mobile-client
npm install

# Start Expo development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

**Note:** The mobile client uses React Native FS's built-in `hash()` function for MD5 calculation, which is native and efficient.

## API Endpoints

- `POST /api/upload/initiate` - Initialize upload session
- `POST /api/upload/chunk` - Upload file chunk
- `POST /api/upload/finalize` - Finalize and reassemble chunks
- `GET /api/upload/status/{uploadId}` - Query upload status
- `POST /api/upload/cancel/{uploadId}` - Cancel upload

## Configuration

See individual README files in each directory for detailed configuration options.

## License

MIT License
