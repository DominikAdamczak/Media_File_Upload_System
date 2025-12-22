export interface UploadFile {
  id: string;
  uri: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'validating' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  uploadedChunks: number;
  totalChunks: number;
  uploadId?: string;
  error?: string;
  retryCount: number;
  storagePath?: string;
}

export interface ChunkUploadProgress {
  chunkIndex: number;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  errors?: string[];
  data?: T;
}

export interface InitiateUploadResponse {
  uploadId: string;
  totalChunks: number;
  chunkSize: number;
  duplicate?: boolean;
  storagePath?: string;
}

export interface FinalizeUploadResponse {
  storagePath: string;
  uploadId: string;
  message: string;
}

export interface UploadStatusResponse {
  uploadId: string;
  status: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number;
  progress: number;
  storagePath: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  chunkSize: number;
  maxFiles: number;
  maxParallelUploads: number;
}

export interface UploadHistory {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  completedAt: string;
  storagePath: string;
}
