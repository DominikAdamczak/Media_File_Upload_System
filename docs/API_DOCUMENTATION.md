# Media Upload System - API Documentation

Complete API reference for the Media File Upload System backend.

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API does not require authentication. User identification can be passed via the `X-User-Id` header.

```http
X-User-Id: user123
```

---

## Endpoints

### 1. Health Check

Check if the API is operational.

**Endpoint:** `GET /upload/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1703251496
}
```

---

### 2. Get Configuration

Retrieve upload configuration and limits.

**Endpoint:** `GET /upload/config`

**Response:**
```json
{
  "success": true,
  "config": {
    "maxFileSize": 524288000,
    "allowedTypes": [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/mpeg"
    ],
    "chunkSize": 1048576,
    "maxFiles": 10,
    "maxParallelUploads": 3
  }
}
```

---

### 3. Initiate Upload

Start a new upload session. This endpoint validates file metadata and checks for duplicates.

**Endpoint:** `POST /upload/initiate`

**Headers:**
```http
Content-Type: application/json
X-User-Id: user123 (optional)
```

**Request Body:**
```json
{
  "filename": "vacation_video.mp4",
  "mimeType": "video/mp4",
  "fileSize": 52428800,
  "md5Hash": "5d41402abc4b2a76b9719d911017c592"
}
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filename | string | Yes | Original filename with extension |
| mimeType | string | Yes | MIME type of the file |
| fileSize | integer | Yes | File size in bytes |
| md5Hash | string | Yes | MD5 hash of the entire file |

**Success Response (200 OK):**
```json
{
  "success": true,
  "uploadId": "20231222123456-a1b2c3d4e5f6",
  "totalChunks": 50,
  "chunkSize": 1048576
}
```

**Duplicate File Response (200 OK):**
```json
{
  "success": true,
  "duplicate": true,
  "message": "File already exists",
  "storagePath": "2023/12/22/user123/vacation_video_abc123.mp4"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "File too large. Maximum size: 500.00 MB",
  "errors": [
    "File too large. Maximum size: 500.00 MB"
  ]
}
```

**Error Codes:**
- `400` - Validation error (file too large, invalid type, etc.)
- `500` - Server error

---

### 4. Upload Chunk

Upload a single chunk of the file.

**Endpoint:** `POST /upload/chunk`

**Headers:**
```http
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| uploadId | string | Yes | Upload session ID from initiate |
| chunkIndex | integer | Yes | Zero-based chunk index (0, 1, 2...) |
| chunk | file | Yes | Binary chunk data |

**Example using cURL:**
```bash
curl -X POST http://localhost:8000/api/upload/chunk \
  -F "uploadId=20231222123456-a1b2c3d4e5f6" \
  -F "chunkIndex=0" \
  -F "chunk=@chunk_0.bin"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "chunkIndex": 0,
  "uploadedChunks": 1,
  "totalChunks": 50,
  "progress": 2.0
}
```

**Chunk Already Uploaded (200 OK):**
```json
{
  "success": true,
  "message": "Chunk already uploaded",
  "chunkIndex": 0
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid chunk index"
}
```

**Notes:**
- Chunks can be uploaded in any order
- Chunks can be uploaded in parallel (max 3 concurrent)
- Already uploaded chunks are skipped (idempotent)

---

### 5. Finalize Upload

Trigger chunk reassembly and file validation.

**Endpoint:** `POST /upload/finalize`

**Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "uploadId": "20231222123456-a1b2c3d4e5f6"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Upload completed successfully",
  "storagePath": "2023/12/22/user123/vacation_video_abc123.mp4",
  "uploadId": "20231222123456-a1b2c3d4e5f6"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Not all chunks uploaded. Expected: 50, Got: 45"
}
```

**Error Response (400 Bad Request - Validation Failed):**
```json
{
  "success": false,
  "error": "Failed to finalize upload: File integrity check failed"
}
```

**Process:**
1. Verifies all chunks are uploaded
2. Reassembles chunks into complete file
3. Verifies MD5 hash integrity
4. Validates file content (Magic Number detection)
5. Moves file to organized storage
6. Updates MD5 index for deduplication
7. Cleans up temporary chunks

---

### 6. Get Upload Status

Query the status of an upload session.

**Endpoint:** `GET /upload/status/{uploadId}`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uploadId | string | Yes | Upload session ID |

**Example:**
```
GET /upload/status/20231222123456-a1b2c3d4e5f6
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "uploadId": "20231222123456-a1b2c3d4e5f6",
    "status": "uploading",
    "filename": "vacation_video.mp4",
    "mimeType": "video/mp4",
    "fileSize": 52428800,
    "totalChunks": 50,
    "uploadedChunks": 25,
    "progress": 50.0,
    "storagePath": null,
    "errorMessage": null,
    "createdAt": "2023-12-22T12:34:56+00:00",
    "completedAt": null
  }
}
```

**Status Values:**
- `initiated` - Upload session created
- `uploading` - Chunks being uploaded
- `completed` - Upload successful
- `failed` - Upload failed with error
- `cancelled` - Upload cancelled by user

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Upload not found"
}
```

---

### 7. Cancel Upload

Cancel an active upload and clean up chunks.

**Endpoint:** `POST /upload/cancel/{uploadId}`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uploadId | string | Yes | Upload session ID |

**Example:**
```
POST /upload/cancel/20231222123456-a1b2c3d4e5f6
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Upload cancelled"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Upload is already completed"
}
```

---

## File Validation

### Supported File Types

**Images:**
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/gif` (.gif)
- `image/webp` (.webp)

**Videos:**
- `video/mp4` (.mp4, .m4v)
- `video/quicktime` (.mov, .qt)
- `video/x-msvideo` (.avi)
- `video/mpeg` (.mpeg, .mpg)

### Validation Levels

**1. Metadata Validation (Initiate)**
- File size check
- MIME type validation
- File extension validation
- File count limit

**2. Content Validation (Finalize)**
- Magic Number detection
- File integrity check (MD5)
- Content-type verification

### Magic Number Detection

The system verifies file types by examining file headers:

| Type | Magic Bytes | Offset |
|------|-------------|--------|
| JPEG | FF D8 FF | 0 |
| PNG | 89 50 4E 47 | 0 |
| GIF | 47 49 46 38 | 0 |
| WebP | 57 45 42 50 | 8 |
| MP4 | 66 74 79 70 | 4 |

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errors": [
    "Detailed error 1",
    "Detailed error 2"
  ]
}
```

### Common Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid parameters, validation failed |
| 404 | Not Found | Upload ID doesn't exist |
| 413 | Payload Too Large | File exceeds size limit |
| 500 | Internal Server Error | Server-side error |

### Error Categories

**Validation Errors:**
- File too large
- Invalid file type
- Too many files
- Invalid chunk index

**Network Errors:**
- Connection timeout
- Network disconnected
- Server unreachable

**Server Errors:**
- Chunk save failed
- Reassembly failed
- File integrity check failed
- Storage error

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding:
- Per-IP rate limits
- Per-user upload quotas
- Concurrent upload limits

---

## Best Practices

### Client Implementation

1. **Calculate MD5 before upload:**
```javascript
// Use SparkMD5 library for proper MD5 calculation
// Note: Browser's crypto.subtle.digest() does NOT support MD5
import SparkMD5 from 'spark-md5';

const calculateMD5 = (file) => {
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // 2MB chunks
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();
    let currentChunk = 0;
    const chunks = Math.ceil(file.size / chunkSize);

    fileReader.onload = (e) => {
      spark.append(e.target.result);
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = () => reject(new Error('Failed to read file'));

    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      fileReader.readAsArrayBuffer(file.slice(start, end));
    };

    loadNext();
  });
};

const md5Hash = await calculateMD5(file);
```

2. **Initiate upload first:**
```javascript
const { uploadId, totalChunks } = await initiateUpload(...);
```

3. **Upload chunks with retry:**
```javascript
for (let i = 0; i < totalChunks; i++) {
  await uploadChunkWithRetry(uploadId, i, chunk);
}
```

4. **Finalize after all chunks:**
```javascript
await finalizeUpload(uploadId);
```

5. **Poll status for updates:**
```javascript
const status = await getUploadStatus(uploadId);
```

### Error Recovery

- **Network Error:** Retry with exponential backoff
- **Chunk Failed:** Retry specific chunk (idempotent)
- **Validation Failed:** Re-upload with correct metadata
- **Server Error:** Cancel and restart upload

### Optimization Tips

- Upload chunks in parallel (max 3)
- Use chunk deduplication (check before upload)
- Implement resume from last uploaded chunk
- Cache MD5 calculation results
- Use compression for chunks (if supported)

---

## Example Workflows

### Complete Upload Flow

```javascript
// 1. Calculate file hash
const md5Hash = await calculateMD5(file);

// 2. Initiate upload
const initResponse = await fetch('/api/upload/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    md5Hash: md5Hash
  })
});

const { uploadId, totalChunks, chunkSize } = await initResponse.json();

// 3. Upload chunks
for (let i = 0; i < totalChunks; i++) {
  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);
  
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', i);
  formData.append('chunk', chunk);
  
  await fetch('/api/upload/chunk', {
    method: 'POST',
    body: formData
  });
}

// 4. Finalize upload
await fetch('/api/upload/finalize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ uploadId })
});
```

### Resume Upload After Disconnect

```javascript
// 1. Get current status
const statusResponse = await fetch(`/api/upload/status/${uploadId}`);
const { uploadedChunks, totalChunks } = await statusResponse.json();

// 2. Resume from last chunk
for (let i = uploadedChunks; i < totalChunks; i++) {
  // Upload remaining chunks...
}

// 3. Finalize
await fetch('/api/upload/finalize', {
  method: 'POST',
  body: JSON.stringify({ uploadId })
});
```

---

## Storage Structure

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

**Path Format:** `{YEAR}/{MONTH}/{DAY}/{USER_ID}/{FILENAME}_{UNIQUE_ID}.{EXT}`

---

## Cleanup & Maintenance

### Automatic Cleanup

**Incomplete Chunks:**
- Timeout: 30 minutes
- Cron: Every hour
- Command: `php bin/console app:cleanup-chunks`

**Old Files:**
- Retention: 30 days
- Cron: Daily at 2 AM
- Command: `php bin/console app:cleanup-files`

### Manual Cleanup

```bash
# Clean up expired chunks
php bin/console app:cleanup-chunks

# Clean up old files
php bin/console app:cleanup-files

# Clear cache
php bin/console cache:clear
```

---

## Testing

### Using cURL

```bash
# Health check
curl http://localhost:8000/api/upload/health

# Get config
curl http://localhost:8000/api/upload/config

# Initiate upload
curl -X POST http://localhost:8000/api/upload/initiate \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","mimeType":"image/jpeg","fileSize":1024000,"md5Hash":"abc123"}'

# Upload chunk
curl -X POST http://localhost:8000/api/upload/chunk \
  -F "uploadId=20231222123456-abc" \
  -F "chunkIndex=0" \
  -F "chunk=@chunk_0.bin"

# Get status
curl http://localhost:8000/api/upload/status/20231222123456-abc

# Finalize
curl -X POST http://localhost:8000/api/upload/finalize \
  -H "Content-Type: application/json" \
  -d '{"uploadId":"20231222123456-abc"}'

# Cancel
curl -X POST http://localhost:8000/api/upload/cancel/20231222123456-abc
```

### Using Postman

Import the API collection:
1. Create new collection
2. Add requests for each endpoint
3. Set up environment variables
4. Test complete upload flow

---

## Security Considerations

1. **File Type Validation:** Magic Number detection prevents spoofing
2. **File Size Limits:** Prevents DoS attacks
3. **Chunk Timeout:** Automatic cleanup of abandoned uploads
4. **MD5 Verification:** Ensures file integrity
5. **Path Sanitization:** Prevents directory traversal
6. **CORS Configuration:** Restrict allowed origins

### Recommended Improvements

- Add authentication/authorization
- Implement rate limiting
- Add virus scanning
- Enable HTTPS only
- Implement upload quotas
- Add audit logging
- Implement file encryption at rest

---

## Support

For issues or questions:
- Check backend logs: `var/log/`
- Review upload status endpoint
- Check chunk cleanup status
- Verify storage permissions

## License

MIT
