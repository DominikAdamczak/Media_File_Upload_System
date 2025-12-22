# Media Upload System - Backend API

Symfony 6 backend API for handling chunked file uploads with validation, deduplication, and automatic cleanup.

## Features

- **Chunked Upload**: Fixed 1MB chunks with parallel upload support
- **File Validation**: Magic Number detection for security
- **Deduplication**: MD5-based file deduplication
- **Auto Cleanup**: 30-minute timeout for incomplete uploads, 30-day retention policy
- **RESTful API**: Well-structured endpoints for upload management
- **Organized Storage**: Files stored by date/user structure

## Requirements

- PHP 8.1 or higher
- Composer
- Symfony CLI (optional, but recommended)

## Installation

1. Install dependencies:
```bash
composer install
```

2. Configure environment:
```bash
cp .env .env.local
# Edit .env.local with your settings
```

3. Create database (if using database):
```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

4. Create required directories:
```bash
mkdir -p var/uploads var/temp_chunks
chmod 755 var/uploads var/temp_chunks
```

## Running the Server

### Using Symfony CLI (recommended):
```bash
symfony server:start
```

### Using PHP built-in server:
```bash
php -S localhost:8000 -t public/
```

## API Endpoints

### 1. Initiate Upload
**POST** `/api/upload/initiate`

Request body:
```json
{
  "filename": "video.mp4",
  "mimeType": "video/mp4",
  "fileSize": 52428800,
  "md5Hash": "d41d8cd98f00b204e9800998ecf8427e"
}
```

Response:
```json
{
  "success": true,
  "uploadId": "20231222123456-a1b2c3d4e5f6",
  "totalChunks": 50,
  "chunkSize": 1048576
}
```

### 2. Upload Chunk
**POST** `/api/upload/chunk`

Form data:
- `uploadId`: Upload session ID
- `chunkIndex`: Chunk number (0-indexed)
- `chunk`: File chunk (multipart/form-data)

Response:
```json
{
  "success": true,
  "chunkIndex": 0,
  "uploadedChunks": 1,
  "totalChunks": 50,
  "progress": 2.0
}
```

### 3. Finalize Upload
**POST** `/api/upload/finalize`

Request body:
```json
{
  "uploadId": "20231222123456-a1b2c3d4e5f6"
}
```

Response:
```json
{
  "success": true,
  "message": "Upload completed successfully",
  "storagePath": "2023/12/22/user123/video_abc123.mp4",
  "uploadId": "20231222123456-a1b2c3d4e5f6"
}
```

### 4. Get Upload Status
**GET** `/api/upload/status/{uploadId}`

Response:
```json
{
  "success": true,
  "data": {
    "uploadId": "20231222123456-a1b2c3d4e5f6",
    "status": "uploading",
    "filename": "video.mp4",
    "mimeType": "video/mp4",
    "fileSize": 52428800,
    "totalChunks": 50,
    "uploadedChunks": 25,
    "progress": 50.0,
    "createdAt": "2023-12-22T12:34:56+00:00"
  }
}
```

### 5. Cancel Upload
**POST** `/api/upload/cancel/{uploadId}`

Response:
```json
{
  "success": true,
  "message": "Upload cancelled"
}
```

### 6. Get Configuration
**GET** `/api/upload/config`

Response:
```json
{
  "success": true,
  "config": {
    "maxFileSize": 524288000,
    "allowedTypes": ["image/jpeg", "image/png", "video/mp4"],
    "chunkSize": 1048576,
    "maxFiles": 10,
    "maxParallelUploads": 3
  }
}
```

### 7. Health Check
**GET** `/api/upload/health`

Response:
```json
{
  "status": "ok",
  "timestamp": 1703251496
}
```

## Configuration

Edit `.env` or `.env.local`:

```env
# Upload Configuration
UPLOAD_CHUNK_SIZE=1048576              # 1MB chunks
UPLOAD_MAX_FILE_SIZE=524288000         # 500MB max file size
UPLOAD_MAX_FILES=10                     # Max 10 files per upload
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,video/mp4
UPLOAD_STORAGE_PATH=../var/uploads
UPLOAD_TEMP_PATH=../var/temp_chunks
UPLOAD_CHUNK_TIMEOUT=1800              # 30 minutes
UPLOAD_FILE_RETENTION_DAYS=30          # 30 days retention

# CORS Configuration
CORS_ALLOW_ORIGIN=http://localhost:3000,http://localhost:19006
```

## File Validation

The system performs two levels of validation:

1. **Metadata Validation**: Checks file size, type, and extension
2. **Content Validation**: Magic Number detection to verify actual file type

Supported formats:
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, QuickTime (MOV), AVI, MPEG

## Storage Organization

Files are organized in the following structure:
```
var/uploads/
├── 2023/
│   ├── 12/
│   │   ├── 22/
│   │   │   ├── user123/
│   │   │   │   ├── video_abc123.mp4
│   │   │   │   └── image_def456.jpg
│   │   │   └── anonymous/
│   │   │       └── file_xyz789.png
└── md5_index.json
```

## Maintenance Commands

### Clean up expired chunks:
```bash
php bin/console app:cleanup-chunks
```

### Clean up old files:
```bash
php bin/console app:cleanup-files
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

Common HTTP status codes:
- `200 OK`: Success
- `400 Bad Request`: Validation error or invalid request
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Development

### Running tests:
```bash
php bin/phpunit
```

### Clear cache:
```bash
php bin/console cache:clear
```

## Security Considerations

1. **Magic Number Detection**: Prevents file type spoofing
2. **File Size Limits**: Prevents DoS attacks
3. **Chunk Timeout**: Automatic cleanup of abandoned uploads
4. **File Retention**: Automatic cleanup after retention period
5. **CORS Configuration**: Restrict allowed origins

## Production Deployment

1. Set `APP_ENV=prod` in `.env`
2. Generate a secure `APP_SECRET`
3. Configure proper file permissions
4. Set up cron jobs for cleanup tasks:
```cron
# Clean up expired chunks every hour
0 * * * * cd /path/to/project && php bin/console app:cleanup-chunks

# Clean up old files daily at 2 AM
0 2 * * * cd /path/to/project && php bin/console app:cleanup-files
```
5. Configure proper CORS settings
6. Consider using a reverse proxy (nginx/Apache)

## License

MIT
