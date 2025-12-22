import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '../config/api.config';

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

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = API_CONFIG.API_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set base URL (useful for mobile to configure server address)
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  /**
   * Get upload configuration from backend
   */
  async getConfig(): Promise<UploadConfig> {
    try {
      const response = await this.client.get<any>('/upload/config');
      return response.data.config;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Initiate upload session
   */
  async initiateUpload(
    filename: string,
    mimeType: string,
    fileSize: number,
    md5Hash: string
  ): Promise<InitiateUploadResponse> {
    try {
      const response = await this.client.post<ApiResponse<InitiateUploadResponse>>(
        '/upload/initiate',
        {
          filename,
          mimeType,
          fileSize,
          md5Hash,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to initiate upload');
      }

      return response.data as any;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload file chunk
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob | FormData
  ): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      
      if (chunk instanceof FormData) {
        // Already a FormData, merge it
        chunk.forEach((value, key) => {
          if (key !== 'uploadId' && key !== 'chunkIndex') {
            formData.append(key, value);
          }
        });
      } else {
        formData.append('chunk', chunk);
      }

      const response = await this.client.post<ApiResponse>(
        '/upload/chunk',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Finalize upload (trigger reassembly)
   */
  async finalizeUpload(uploadId: string): Promise<FinalizeUploadResponse> {
    try {
      const response = await this.client.post<ApiResponse<FinalizeUploadResponse>>(
        '/upload/finalize',
        { uploadId }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to finalize upload');
      }

      return response.data as any;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(uploadId: string): Promise<UploadStatusResponse> {
    try {
      const response = await this.client.get<ApiResponse<UploadStatusResponse>>(
        `/upload/status/${uploadId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get upload status');
      }

      return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Cancel upload
   */
  async cancelUpload(uploadId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post<ApiResponse>(
        `/upload/cancel/${uploadId}`
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/upload/health');
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>;

      if (axiosError.response) {
        const errorMessage =
          axiosError.response.data?.error ||
          axiosError.response.data?.errors?.join(', ') ||
          'An error occurred';
        return new Error(errorMessage);
      }

      if (axiosError.request) {
        return new Error('Network error: Unable to reach server');
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('An unknown error occurred');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
