import { apiClient } from './apiClient';

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should fetch upload configuration successfully', async () => {
      const mockConfig = {
        maxFileSize: 524288000,
        allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
        chunkSize: 1048576,
        maxFiles: 10,
        maxParallelUploads: 3,
      };

      const mockResponse = {
        data: {
          success: true,
          config: mockConfig,
        },
      };

      jest.spyOn(apiClient['client'], 'get').mockResolvedValue(mockResponse as any);

      const config = await apiClient.getConfig();
      expect(config).toEqual(mockConfig);
    });

    it('should handle errors when fetching config', async () => {
      jest.spyOn(apiClient['client'], 'get').mockRejectedValue(new Error('Network error'));

      await expect(apiClient.getConfig()).rejects.toThrow();
    });
  });

  describe('initiateUpload', () => {
    it('should initiate upload successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          uploadId: 'test-upload-id',
          totalChunks: 10,
          chunkSize: 1048576,
        },
      };

      jest.spyOn(apiClient['client'], 'post').mockResolvedValue(mockResponse as any);

      const result = await apiClient.initiateUpload(
        'test.jpg',
        'image/jpeg',
        1048576,
        'abc123'
      );

      expect(result.uploadId).toBe('test-upload-id');
      expect(result.totalChunks).toBe(10);
    });
  });

  describe('uploadChunk', () => {
    it('should upload chunk successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Chunk uploaded',
        },
      };

      jest.spyOn(apiClient['client'], 'post').mockResolvedValue(mockResponse as any);

      const chunk = new Blob(['test data']);
      const result = await apiClient.uploadChunk('upload-id', 0, chunk);

      expect(result.success).toBe(true);
    });
  });

  describe('finalizeUpload', () => {
    it('should finalize upload successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          storagePath: '/uploads/test.jpg',
          uploadId: 'test-upload-id',
          message: 'Upload completed',
        },
      };

      jest.spyOn(apiClient['client'], 'post').mockResolvedValue(mockResponse as any);

      const result = await apiClient.finalizeUpload('test-upload-id');

      expect(result.storagePath).toBe('/uploads/test.jpg');
      expect(result.uploadId).toBe('test-upload-id');
    });
  });

  describe('cancelUpload', () => {
    it('should cancel upload successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Upload cancelled',
        },
      };

      jest.spyOn(apiClient['client'], 'post').mockResolvedValue(mockResponse as any);

      const result = await apiClient.cancelUpload('test-upload-id');

      expect(result.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true when server is healthy', async () => {
      const mockResponse = {
        data: {
          status: 'ok',
        },
      };

      jest.spyOn(apiClient['client'], 'get').mockResolvedValue(mockResponse as any);

      const result = await apiClient.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false on network error', async () => {
      jest.spyOn(apiClient['client'], 'get').mockRejectedValue(new Error('Network error'));

      const result = await apiClient.healthCheck();

      expect(result).toBe(false);
    });
  });
});
