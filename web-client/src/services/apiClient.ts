import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  InitiateUploadResponse,
  FinalizeUploadResponse,
  UploadStatusResponse,
  UploadConfig,
} from '../types/upload';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://127.0.0.1:8000/api') {
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
   * Get upload configuration from backend
   */
  async getConfig(): Promise<UploadConfig> {
    try {
      const response = await this.client.get<any>(
        '/upload/config'
      );
      // The backend returns { success: true, config: {...} }
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
    chunk: Blob
  ): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('chunk', chunk);

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
