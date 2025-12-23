# Backend API

Symfony 6 REST API for chunked file uploads with validation, deduplication, and automatic cleanup.

## Requirements

- PHP 8.1+
- Composer
- Symfony CLI (optional)

## Installation

```bash
# Install dependencies
composer install

# Configure environment
cp .env .env.local

# Run migrations
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate

# Create upload directories
mkdir -p var/uploads var/temp_chunks
chmod 755 var/uploads var/temp_chunks
```

## Running

```bash
# Using Symfony CLI (recommended)
symfony server:start

# Using PHP built-in server
php -S localhost:8000 -t public/
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/initiate` | Initialize upload session |
| POST | `/api/upload/chunk` | Upload file chunk |
| POST | `/api/upload/finalize` | Finalize and reassemble chunks |
| GET | `/api/upload/status/{uploadId}` | Get upload status |
| POST | `/api/upload/cancel/{uploadId}` | Cancel upload |
| GET | `/api/upload/config` | Get upload configuration |
| GET | `/api/upload/health` | Health check |

See [`docs/API_DOCUMENTATION.md`](../docs/API_DOCUMENTATION.md) for detailed request/response examples.

## Configuration

Edit `.env.local`:

```env
# Upload settings
UPLOAD_CHUNK_SIZE=1048576              # 1MB chunks
UPLOAD_MAX_FILE_SIZE=524288000         # 500MB max
UPLOAD_MAX_FILES=10
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,video/mp4
UPLOAD_STORAGE_PATH=../var/uploads
UPLOAD_TEMP_PATH=../var/temp_chunks
UPLOAD_CHUNK_TIMEOUT=1800              # 30 minutes
UPLOAD_FILE_RETENTION_DAYS=30

# CORS
CORS_ALLOW_ORIGIN=http://localhost:3000,http://localhost:19006
```

## File Validation

- **Metadata**: File size, type, extension
- **Content**: Magic Number detection (JPEG, PNG, GIF, WebP, MP4, MOV, AVI, MPEG)

## Storage Structure

```
var/uploads/YYYY/MM/DD/user_id/filename_hash.ext
```

## Maintenance

```bash
# Clean expired chunks
php bin/console app:cleanup-chunks

# Clean old files
php bin/console app:cleanup-files
```

## Testing

```bash
# Install dependencies (includes PHPUnit)
composer install

# Run all tests
composer test

# Run tests with coverage report
composer test:coverage

# Run specific test file
vendor/bin/phpunit tests/Service/FileValidationServiceTest.php
vendor/bin/phpunit tests/Service/ChunkHandlerServiceTest.php
vendor/bin/phpunit tests/Service/StorageServiceTest.php
```

**Test Coverage:**
- [`FileValidationServiceTest`](tests/Service/FileValidationServiceTest.php) - 18 tests for file validation
- [`ChunkHandlerServiceTest`](tests/Service/ChunkHandlerServiceTest.php) - 15 tests for chunk handling
- [`StorageServiceTest`](tests/Service/StorageServiceTest.php) - 18 tests for storage operations

## Development

```bash
# Clear cache
php bin/console cache:clear
```

## Production Deployment

1. Set `APP_ENV=prod` and secure `APP_SECRET` in `.env`
2. Configure file permissions (755 for directories)
3. Set up cron jobs:
   ```cron
   0 * * * * php bin/console app:cleanup-chunks
   0 2 * * * php bin/console app:cleanup-files
   ```
4. Configure CORS for production origins
5. Use reverse proxy (nginx/Apache)

See [`docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## License

MIT
