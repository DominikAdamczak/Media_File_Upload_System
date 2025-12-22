export interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  uploadedChunks: number;
  totalChunks: number;
  uploadId?: string;
  error?: string;
  retryCount: number;
}

export type UploadStatus =
  | 'pending'
  | 'validating'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  chunkSize: number;
  maxFiles: number;
  maxParallelUploads: number;
}

export interface ChunkUploadProgress {
  chunkIndex: number;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
}

export interface UploadHistory {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  completedAt: string;
  storagePath: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  message?: string;
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
  storagePath?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
