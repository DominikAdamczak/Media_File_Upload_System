# Getting Started - Media File Upload System

Quick start guide to get the Media File Upload System running on your local machine.

## Prerequisites

- **PHP 8.1+** with Composer
- **Node.js 18+** with npm
- **Web Server** (Apache/Nginx) or Symfony CLI

## Quick Setup

### 1. Backend Setup (5 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
composer install

# Create storage directories
mkdir -p var/uploads var/temp_chunks
chmod -R 775 var/

# Configure environment (use defaults for quick start)
cp .env .env.local

# Start Symfony development server
symfony server:start

# OR use PHP built-in server
php -S localhost:8000 -t public/
```

Backend API will be available at: **http://localhost:8000**

### 2. Frontend Setup (3 minutes)

```bash
# Open new terminal, navigate to web client
cd web-client

# Install dependencies (includes spark-md5 for proper MD5 calculation)
npm install

# Start development server
npm start
```

Frontend will be available at: **http://localhost:3000**

### 3. Test the System

1. Open browser to `http://localhost:3000`
2. Drag and drop an image or video file
3. Watch the upload progress
4. View completed uploads

## Project Structure

```
Media_File_Upload_System/
├── backend/              # Symfony 6 PHP Backend
│   ├── src/
│   │   ├── Controller/   # API endpoints
│   │   ├── Entity/       # Database models
│   │   ├── Service/      # Business logic
│   │   └── Kernel.php
│   ├── config/           # Configuration
│   ├── public/           # Web root
│   └── var/             # Storage & logs
│
├── web-client/          # React Web Application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── services/    # API & upload logic
│   │   ├── store/       # State management
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main component
│   └── index.html
│
└── docs/                # Documentation
    ├── API_DOCUMENTATION.md
    └── DEPLOYMENT_GUIDE.md
```

## Key Features

### Backend Features
✅ Chunked upload (1MB chunks)  
✅ File validation (type, size, magic number)  
✅ Automatic chunk reassembly  
✅ MD5-based deduplication  
✅ Organized storage (by date/user)  
✅ Automatic cleanup (expired chunks & old files)  
✅ RESTful API with 7 endpoints  

### Frontend Features
✅ Drag & drop file picker  
✅ Multiple file upload (max 10)  
✅ Real-time progress tracking  
✅ Pause/resume/cancel controls  
✅ Auto-retry with exponential backoff  
✅ Upload history in local storage  
✅ Responsive design  
✅ Error handling with detailed messages  

## Configuration

### Backend Configuration

Edit [`backend/.env`](backend/.env:1):

```env
# Upload limits
UPLOAD_MAX_FILE_SIZE=524288000    # 500MB
UPLOAD_MAX_FILES=10
UPLOAD_CHUNK_SIZE=1048576          # 1MB

# File types
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/mpeg

# Storage
UPLOAD_STORAGE_PATH=../var/uploads
UPLOAD_TEMP_PATH=../var/temp_chunks

# Cleanup
UPLOAD_CHUNK_TIMEOUT=1800          # 30 minutes
UPLOAD_FILE_RETENTION_DAYS=30

# Concurrency
UPLOAD_MAX_PARALLEL_UPLOADS=3
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/upload/health` | Health check |
| GET | `/api/upload/config` | Get configuration |
| POST | `/api/upload/initiate` | Start upload session |
| POST | `/api/upload/chunk` | Upload file chunk |
| POST | `/api/upload/finalize` | Complete upload |
| GET | `/api/upload/status/{id}` | Query upload status |
| POST | `/api/upload/cancel/{id}` | Cancel upload |

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/api/upload/health

# Get configuration
curl http://localhost:8000/api/upload/config

# Initiate upload
curl -X POST http://localhost:8000/api/upload/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 1024000,
    "md5Hash": "5d41402abc4b2a76b9719d911017c592"
  }'
```

### Using the Web Interface

1. **Select Files**: Drag files or click to browse
2. **Automatic Validation**: Files validated for type/size
3. **Upload Progress**: Watch real-time progress
4. **Control Uploads**: Pause, resume, or cancel
5. **View History**: Check completed uploads

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

## Important: MD5 Hash Calculation

The web client uses **SparkMD5** library for proper MD5 calculation:

⚠️ **Why?** Browser's `crypto.subtle.digest()` does NOT support MD5 algorithm.

The web client calculates MD5 using SparkMD5 to match the backend's PHP `md5_file()` verification. This was a critical fix - previously the client was falling back to SHA-256, causing "File integrity check failed" errors.

**Implementation:** See [`web-client/src/services/uploadManager.ts`](web-client/src/services/uploadManager.ts:276)

## Next Steps

### Development
- Read [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) for API details
- Check [`backend/README.md`](backend/README.md) for backend info
- Check [`web-client/README.md`](web-client/README.md) for frontend info

### Production Deployment
- Follow [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- Set up SSL certificates
- Configure production database
- Set up automated backups
- Configure monitoring

### Customization
- Adjust upload limits in backend config
- Customize UI colors in CSS files
- Add authentication/authorization
- Implement virus scanning
- Add cloud storage (S3, etc.)

## Architecture Overview

```
┌─────────────┐      HTTP/REST      ┌─────────────┐
│             │ ──────────────────> │             │
│   React     │                     │   Symfony   │
│   Web App   │ <────────────────── │   Backend   │
│             │    JSON Responses   │             │
└─────────────┘                     └─────────────┘
      │                                    │
      │ State Management                   │ Services
      │ (Zustand)                          │
      │                                    ├─ FileValidation
      ├─ Components                        ├─ ChunkHandler
      │  ├─ FileDropzone                   ├─ StorageService
      │  └─ FileItem                       └─ UploadManager
      │
      ├─ Services
      │  ├─ apiClient         ────────────> API Endpoints
      │  └─ uploadManager     ────────────> Chunking Logic
      │
      └─ Store               
         └─ uploadStore       ────────────> Local Storage
```

## Upload Flow

```
1. User selects file
   │
   ├─> Frontend calculates MD5
   │
2. Initiate upload (POST /initiate)
   │
   ├─> Backend validates metadata
   ├─> Checks for duplicates
   └─> Returns uploadId & chunkCount
   │
3. Upload chunks (POST /chunk)
   │
   ├─> Split file into 1MB chunks
   ├─> Upload chunks in parallel (max 3)
   ├─> Retry failed chunks (exponential backoff)
   └─> Save to temp storage
   │
4. Finalize upload (POST /finalize)
   │
   ├─> Verify all chunks received
   ├─> Reassemble chunks
   ├─> Validate file content (Magic Number)
   ├─> Verify MD5 integrity
   ├─> Move to permanent storage
   ├─> Update MD5 index
   └─> Cleanup temp chunks
   │
5. Upload complete ✓
```

## Performance Tips

- **Parallel Uploads**: Max 3 files upload simultaneously
- **Chunk Size**: 1MB chunks for optimal balance
- **Retry Logic**: Automatic retry with exponential backoff
- **Deduplication**: Prevents duplicate file uploads
- **Local Caching**: Upload history stored locally

## Security Features

- **File Type Validation**: Magic Number detection
- **Size Limits**: Prevents oversized uploads
- **MD5 Verification**: Ensures file integrity
- **Chunk Timeout**: Auto-cleanup after 30 minutes
- **Path Sanitization**: Prevents directory traversal
- **CORS Protection**: Configurable allowed origins

## Development Tips

### Backend Development
```bash
# Watch logs
tail -f backend/var/log/dev.log

# Clear cache
php bin/console cache:clear

# Run database migrations
php bin/console doctrine:migrations:migrate
```

### Frontend Development
```bash
# Type checking
npm run build

# Lint code
npm run lint
```

## Support

- **Documentation**: See `/docs` folder
- **API Reference**: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)
- **Deployment Guide**: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- **Issues**: Check backend/frontend logs

## License

MIT License - Free to use and modify

---

**Ready to start?** Follow the Quick Setup above and you'll be uploading files in under 10 minutes! 🚀
