import { uploadManager } from './uploadManager';
import { apiClient } from './apiClient';
import { UploadFile } from '../types/upload';
import SparkMD5 from 'spark-md5';

// Mock dependencies
jest.mock('./apiClient');
jest.mock('spark-md5');

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('UploadManager', () => {
  const createMockFile = (overrides?: Partial<UploadFile>): UploadFile => ({
    id: 'test-file-1',
    file: new File(['test content'], 'test.jpg', { type: 'image/jpeg' }),
    status: 'pending',
    progress: 0,
    uploadedChunks: 0,
    totalChunks: 0,
    retryCount: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset uploadManager state
    uploadManager['activeUploads'] = new Map();
    uploadManager['cancelledUploads'] = new Set();
    uploadManager['pausedUploads'] = new Set();
    uploadManager['uploadQueue'] = [];
    uploadManager['callbacks'] = new Map();
    uploadManager['fileRegistry'] = new Map();
  });

  describe('initialize', () => {
    it('should initialize with config from API', async () => {
      const mockConfig = {
        maxFileSize: 524288000,
        allowedTypes: ['image/jpeg', 'video/mp4'],
        chunkSize: 2097152,
        maxFiles: 10,
        maxParallelUploads: 5,
      };

      mockedApiClient.getConfig.mockResolvedValue(mockConfig);

      await uploadManager.initialize();

      expect(mockedApiClient.getConfig).toHaveBeenCalled();
      expect(uploadManager['chunkSize']).toBe(2097152);
      expect(uploadManager['maxParallelUploads']).toBe(5);
    });

    it('should use defaults when config fetch fails', async () => {
      mockedApiClient.getConfig.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await uploadManager.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load config, using defaults:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('startUpload', () => {
    it('should add file to registry when starting upload', () => {
      const mockFile = createMockFile();
      const mockCallbacks = {
        onProgress: jest.fn(),
        onStatusChange: jest.fn(),
        onError: jest.fn(),
        onComplete: jest.fn(),
        onMetadataUpdate: jest.fn(),
      };

      uploadManager.startUpload(mockFile, mockCallbacks);

      expect(uploadManager['fileRegistry'].has(mockFile.id)).toBe(true);
      expect(uploadManager['callbacks'].has(mockFile.id)).toBe(true);
    });

    it('should queue upload when max parallel uploads reached', async () => {
      uploadManager['maxParallelUploads'] = 1;
      
      const mockFile1 = createMockFile({ id: 'file-1' });
      const mockFile2 = createMockFile({ id: 'file-2' });

      // Set one active upload
      uploadManager['activeUploads'].set('file-1', true);

      const mockCallbacks = {
        onStatusChange: jest.fn(),
      };

      await uploadManager.startUpload(mockFile2, mockCallbacks);

      expect(uploadManager['uploadQueue']).toContain('file-2');
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('file-2', 'pending');
    });

    it('should handle duplicate files', async () => {
      const mockFile = createMockFile();
      const mockCallbacks = {
        onStatusChange: jest.fn(),
        onComplete: jest.fn(),
      };

      mockedApiClient.initiateUpload.mockResolvedValue({
        uploadId: 'upload-123',
        totalChunks: 0,
        chunkSize: 1048576,
        duplicate: true,
        storagePath: '/uploads/test.jpg',
      });

      // Mock MD5 calculation
      const mockMD5 = 'abc123def456';
      (SparkMD5.ArrayBuffer as any) = jest.fn().mockImplementation(() => ({
        append: jest.fn(),
        end: jest.fn().mockReturnValue(mockMD5),
      }));

      await uploadManager.startUpload(mockFile, mockCallbacks);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.onComplete).toHaveBeenCalledWith(
        mockFile.id,
        '/uploads/test.jpg'
      );
    });
  });

  describe('pauseUpload', () => {
    it('should pause an active upload', () => {
      const fileId = 'test-file-1';
      uploadManager['activeUploads'].set(fileId, true);

      const mockCallbacks = {
        onStatusChange: jest.fn(),
      };
      uploadManager['callbacks'].set(fileId, mockCallbacks);

      uploadManager.pauseUpload(fileId);

      expect(uploadManager['pausedUploads'].has(fileId)).toBe(true);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith(fileId, 'paused');
    });

    it('should not pause non-active upload', () => {
      const fileId = 'test-file-1';

      uploadManager.pauseUpload(fileId);

      expect(uploadManager['pausedUploads'].has(fileId)).toBe(false);
    });
  });

  describe('resumeUpload', () => {
    it('should resume a paused upload', async () => {
      const mockFile = createMockFile({
        uploadId: 'upload-123',
        totalChunks: 5,
        uploadedChunks: 2,
      });

      uploadManager['pausedUploads'].add(mockFile.id);
      uploadManager['fileRegistry'].set(mockFile.id, mockFile);

      mockedApiClient.uploadChunk.mockResolvedValue({
        success: true,
      });

      mockedApiClient.finalizeUpload.mockResolvedValue({
        storagePath: '/uploads/test.jpg',
        uploadId: 'upload-123',
        message: 'Upload completed',
      });

      const promise = uploadManager.resumeUpload(mockFile);

      expect(uploadManager['pausedUploads'].has(mockFile.id)).toBe(false);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should throw error when resuming without uploadId', async () => {
      const mockFile = createMockFile({
        uploadId: undefined,
        totalChunks: 0,
      });

      await expect(uploadManager.resumeUpload(mockFile)).rejects.toThrow(
        'Cannot resume upload: missing uploadId or totalChunks'
      );
    });
  });

  describe('cancelUpload', () => {
    it('should cancel an active upload', async () => {
      const fileId = 'test-file-1';
      const uploadId = 'upload-123';

      uploadManager['activeUploads'].set(fileId, true);
      uploadManager['fileRegistry'].set(fileId, createMockFile({ uploadId }));

      mockedApiClient.cancelUpload.mockResolvedValue({
        success: true,
      });

      await uploadManager.cancelUpload(fileId, uploadId);

      expect(uploadManager['cancelledUploads'].has(fileId)).toBe(true);
      expect(mockedApiClient.cancelUpload).toHaveBeenCalledWith(uploadId);
    });

    it('should handle cancel errors gracefully', async () => {
      const fileId = 'test-file-1';
      const uploadId = 'upload-123';

      uploadManager['activeUploads'].set(fileId, true);
      uploadManager['fileRegistry'].set(fileId, createMockFile({ uploadId }));

      mockedApiClient.cancelUpload.mockRejectedValue(new Error('Cancel failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await uploadManager.cancelUpload(fileId, uploadId);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cancel upload on server:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cancelAll', () => {
    it('should cancel all active uploads', () => {
      uploadManager['activeUploads'].set('file-1', true);
      uploadManager['activeUploads'].set('file-2', true);
      uploadManager['uploadQueue'] = ['file-3'];

      const mockCallbacks1 = { onStatusChange: jest.fn() };
      const mockCallbacks2 = { onStatusChange: jest.fn() };
      uploadManager['callbacks'].set('file-1', mockCallbacks1);
      uploadManager['callbacks'].set('file-2', mockCallbacks2);

      uploadManager.cancelAll();

      expect(uploadManager['activeUploads'].size).toBe(0);
      expect(uploadManager['pausedUploads'].size).toBe(0);
      expect(uploadManager['uploadQueue'].length).toBe(0);
      expect(uploadManager['callbacks'].size).toBe(0);
      expect(mockCallbacks1.onStatusChange).toHaveBeenCalledWith('file-1', 'cancelled');
      expect(mockCallbacks2.onStatusChange).toHaveBeenCalledWith('file-2', 'cancelled');
    });
  });

  describe('getActiveUploadsCount', () => {
    it('should return the number of active uploads', () => {
      uploadManager['activeUploads'].set('file-1', true);
      uploadManager['activeUploads'].set('file-2', true);

      expect(uploadManager.getActiveUploadsCount()).toBe(2);
    });

    it('should return 0 when no active uploads', () => {
      expect(uploadManager.getActiveUploadsCount()).toBe(0);
    });
  });

  describe('getQueuedUploadsCount', () => {
    it('should return the number of queued uploads', () => {
      uploadManager['uploadQueue'] = ['file-1', 'file-2', 'file-3'];

      expect(uploadManager.getQueuedUploadsCount()).toBe(3);
    });

    it('should return 0 when no queued uploads', () => {
      expect(uploadManager.getQueuedUploadsCount()).toBe(0);
    });
  });

  describe('setQueueProcessor', () => {
    it('should set queue processor callback', () => {
      const mockProcessor = jest.fn();

      uploadManager.setQueueProcessor(mockProcessor);

      expect(uploadManager['queueProcessor']).toBe(mockProcessor);
    });
  });

});
