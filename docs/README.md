# Media File Upload System

A comprehensive file upload system with chunked uploads, file validation, and multi-platform support.

## Project Structure

```
Media_File_Upload_System/
├── backend/              # Symfony 6 PHP API
├── web-client/          # React Web Application
├── mobile-client/       # React Native Mobile App
└── docs/               # Documentation
```

## Core Features

- **Chunked Upload**: 1MB chunks with parallel processing (max 3 concurrent)
- **File Validation**: Client and server-side validation with Magic Number detection
- **Progress Tracking**: Real-time upload progress with pause/resume/cancel
- **Auto-Retry**: Exponential backoff (max 3 retries)
- **File Deduplication**: MD5-based duplicate detection
- **Auto Cleanup**: 30-minute timeout for incomplete uploads, 30-day file retention

## Tech Stack

- **Backend**: PHP 8.1+, Symfony 6
- **Web Client**: React 18+, TypeScript, SparkMD5
- **Mobile Client**: React Native, Expo, TypeScript
- **Storage**: Local filesystem (adaptable to S3/cloud)

## Quick Start

### Backend
```bash
cd backend
composer install
php bin/console doctrine:migrations:migrate
symfony server:start
```

### Web Client
```bash
cd web-client
npm install
npm start
```

### Mobile Client
```bash
cd mobile-client
npm install
npx expo start
```

## API Endpoints

- `POST /api/upload/initiate` - Initialize upload session
- `POST /api/upload/chunk` - Upload file chunk
- `POST /api/upload/finalize` - Finalize upload
- `GET /api/upload/status/{uploadId}` - Get upload status
- `POST /api/upload/cancel/{uploadId}` - Cancel upload

## Documentation

- [`backend/README.md`](../backend/README.md) - Backend setup and API details
- [`web-client/README.md`](../web-client/README.md) - Web client configuration
- [`mobile-client/README.md`](../mobile-client/README.md) - Mobile client setup
- [`docs/GETTING_STARTED.md`](GETTING_STARTED.md) - Detailed getting started guide
- [`docs/API_DOCUMENTATION.md`](API_DOCUMENTATION.md) - Complete API reference
- [`docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) - Production deployment guide

## License

MIT
