import { renderHook, act } from '@testing-library/react';
import { useUploadStore } from './uploadStore';
import { uploadManager } from '../services/uploadManager';

// Mock dependencies
jest.mock('../services/uploadManager');

const mockedUploadManager = uploadManager as jest.Mocked<typeof uploadManager>;

describe('UploadStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset store state
    const { result } = renderHook(() => useUploadStore());
    act(() => {
      result.current.files.clear();
      result.current.history = [];
      result.current.isInitialized = false;
    });

    // Clear localStorage
    localStorage.clear();
  });

  describe('initialize', () => {
    it('should initialize the upload manager', async () => {
      mockedUploadManager.initialize.mockResolvedValue();

      const { result } = renderHook(() => useUploadStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockedUploadManager.initialize).toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockedUploadManager.initialize.mockResolvedValue();

      const { result } = renderHook(() => useUploadStore());

      await act(async () => {
        await result.current.initialize();
        await result.current.initialize();
      });

      expect(mockedUploadManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should load history on initialization', async () => {
      const mockHistory = [
        {
          id: 'file-1',
          filename: 'test.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          completedAt: '2023-01-01T00:00:00Z',
          storagePath: '/uploads/test.jpg',
        },
      ];

      localStorage.setItem('upload_history', JSON.stringify(mockHistory));
      mockedUploadManager.initialize.mockResolvedValue();

      const { result } = renderHook(() => useUploadStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.history).toEqual(mockHistory);
    });
  });

  describe('addFiles', () => {
    it('should add files to the store', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFiles = [
        new File(['content'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      act(() => {
        result.current.addFiles(mockFiles);
      });

      expect(result.current.files.size).toBe(2);
      const filesArray = Array.from(result.current.files.values());
      expect(filesArray[0].file.name).toBe('test1.jpg');
      expect(filesArray[1].file.name).toBe('test2.jpg');
      expect(filesArray[0].status).toBe('pending');
    });

    it('should not exceed max files limit', () => {
      const { result } = renderHook(() => useUploadStore());
      
      act(() => {
        result.current.config = {
          maxFileSize: 524288000,
          allowedTypes: ['image/jpeg'],
          chunkSize: 1048576,
          maxFiles: 2,
          maxParallelUploads: 3,
        };
      });

      const mockFiles = [
        new File(['content'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test3.jpg', { type: 'image/jpeg' }),
      ];

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      act(() => {
        result.current.addFiles(mockFiles);
      });

      expect(alertSpy).toHaveBeenCalledWith('Maximum 2 files allowed');
      expect(result.current.files.size).toBe(0);

      alertSpy.mockRestore();
    });

    it('should validate file types', () => {
      const { result } = renderHook(() => useUploadStore());
      
      act(() => {
        result.current.config = {
          maxFileSize: 524288000,
          allowedTypes: ['image/jpeg'],
          chunkSize: 1048576,
          maxFiles: 10,
          maxParallelUploads: 3,
        };
      });

      const mockFiles = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      ];

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      act(() => {
        result.current.addFiles(mockFiles);
      });

      expect(alertSpy).toHaveBeenCalledWith('File type application/pdf is not allowed');

      alertSpy.mockRestore();
    });

    it('should validate file size', () => {
      const { result } = renderHook(() => useUploadStore());
      
      act(() => {
        result.current.config = {
          maxFileSize: 1024, // 1KB
          allowedTypes: ['image/jpeg'],
          chunkSize: 1048576,
          maxFiles: 10,
          maxParallelUploads: 3,
        };
      });

      const largeContent = new Array(2048).fill('a').join('');
      const mockFiles = [
        new File([largeContent], 'large.jpg', { type: 'image/jpeg' }),
      ];

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      act(() => {
        result.current.addFiles(mockFiles);
      });

      expect(alertSpy).toHaveBeenCalledWith('File large.jpg exceeds maximum size');

      alertSpy.mockRestore();
    });
  });

  describe('removeFile', () => {
    it('should remove a file from the store', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.files.size).toBe(0);
    });

    it('should cancel upload before removing if uploading', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.updateFileStatus(fileId, 'uploading');
      });

      mockedUploadManager.cancelUpload.mockResolvedValue();

      act(() => {
        result.current.removeFile(fileId);
      });

      expect(result.current.files.size).toBe(0);
    });
  });

  describe('startUpload', () => {
    it('should start upload for a file', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      mockedUploadManager.startUpload.mockResolvedValue();

      act(() => {
        result.current.startUpload(fileId);
      });

      expect(mockedUploadManager.startUpload).toHaveBeenCalled();
    });

    it('should not start upload for non-existent file', () => {
      const { result } = renderHook(() => useUploadStore());

      mockedUploadManager.startUpload.mockResolvedValue();

      act(() => {
        result.current.startUpload('non-existent-id');
      });

      expect(mockedUploadManager.startUpload).not.toHaveBeenCalled();
    });
  });

  describe('pauseUpload', () => {
    it('should pause an upload', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.pauseUpload(fileId);
      });

      expect(mockedUploadManager.pauseUpload).toHaveBeenCalledWith(fileId);
      
      const file = result.current.files.get(fileId);
      expect(file?.status).toBe('paused');
    });
  });

  describe('resumeUpload', () => {
    it('should resume an upload', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      mockedUploadManager.resumeUpload.mockResolvedValue();

      act(() => {
        result.current.resumeUpload(fileId);
      });

      expect(mockedUploadManager.resumeUpload).toHaveBeenCalled();
    });

    it('should handle resume errors', async () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      mockedUploadManager.resumeUpload.mockRejectedValue(new Error('Resume failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await act(async () => {
        result.current.resumeUpload(fileId);
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('cancelUpload', () => {
    it('should cancel an upload', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      mockedUploadManager.cancelUpload.mockResolvedValue();

      act(() => {
        result.current.cancelUpload(fileId);
      });

      expect(mockedUploadManager.cancelUpload).toHaveBeenCalledWith(fileId, undefined);
      
      const file = result.current.files.get(fileId);
      expect(file?.status).toBe('cancelled');
    });
  });

  describe('cancelAll', () => {
    it('should cancel all uploads', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFiles = [
        new File(['content'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      act(() => {
        result.current.addFiles(mockFiles);
      });

      const fileIds = Array.from(result.current.files.keys());

      act(() => {
        result.current.updateFileStatus(fileIds[0], 'uploading');
        result.current.updateFileStatus(fileIds[1], 'pending');
      });

      act(() => {
        result.current.cancelAll();
      });

      expect(mockedUploadManager.cancelAll).toHaveBeenCalled();
      
      const file1 = result.current.files.get(fileIds[0]);
      const file2 = result.current.files.get(fileIds[1]);
      expect(file1?.status).toBe('cancelled');
      expect(file2?.status).toBe('cancelled');
    });
  });

  describe('updateFileProgress', () => {
    it('should update file progress', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.updateFileProgress(fileId, 50, 5);
      });

      const file = result.current.files.get(fileId);
      expect(file?.progress).toBe(50);
      expect(file?.uploadedChunks).toBe(5);
    });
  });

  describe('updateFileStatus', () => {
    it('should update file status', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.updateFileStatus(fileId, 'uploading');
      });

      const file = result.current.files.get(fileId);
      expect(file?.status).toBe('uploading');
    });
  });

  describe('updateFileError', () => {
    it('should update file error and set status to failed', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.updateFileError(fileId, 'Network error');
      });

      const file = result.current.files.get(fileId);
      expect(file?.error).toBe('Network error');
      expect(file?.status).toBe('failed');
    });
  });

  describe('updateFileMetadata', () => {
    it('should update file metadata', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.updateFileMetadata(fileId, 'upload-123', 10);
      });

      const file = result.current.files.get(fileId);
      expect(file?.uploadId).toBe('upload-123');
      expect(file?.totalChunks).toBe(10);
    });
  });

  describe('completeUpload', () => {
    it('should complete upload and add to history', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.completeUpload(fileId, '/uploads/test.jpg');
      });

      expect(result.current.history.length).toBe(1);
      expect(result.current.history[0].filename).toBe('test.jpg');
      expect(result.current.history[0].storagePath).toBe('/uploads/test.jpg');
    });

    it('should save history to localStorage', () => {
      const { result } = renderHook(() => useUploadStore());
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.addFiles([mockFile]);
      });

      const fileId = Array.from(result.current.files.keys())[0];

      act(() => {
        result.current.completeUpload(fileId, '/uploads/test.jpg');
      });

      const stored = localStorage.getItem('upload_history');
      expect(stored).toBeTruthy();
      
      const history = JSON.parse(stored!);
      expect(history.length).toBe(1);
      expect(history[0].filename).toBe('test.jpg');
    });

    it('should limit history to max items', () => {
      const { result } = renderHook(() => useUploadStore());

      // Add 51 files to exceed the limit of 50
      for (let i = 0; i < 51; i++) {
        const mockFile = new File(['content'], `test${i}.jpg`, { type: 'image/jpeg' });
        
        act(() => {
          result.current.addFiles([mockFile]);
        });

        // Get the file ID that was just added
        const allFiles = Array.from(result.current.files.values());
        const fileId = allFiles[allFiles.length - 1].id;

        act(() => {
          result.current.completeUpload(fileId, `/uploads/test${i}.jpg`);
        });
      }

      expect(result.current.history.length).toBe(50);
    });
  });

  describe('loadHistory', () => {
    it('should load history from localStorage', () => {
      const mockHistory = [
        {
          id: 'file-1',
          filename: 'test.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          completedAt: '2023-01-01T00:00:00Z',
          storagePath: '/uploads/test.jpg',
        },
      ];

      localStorage.setItem('upload_history', JSON.stringify(mockHistory));

      const { result } = renderHook(() => useUploadStore());

      act(() => {
        result.current.loadHistory();
      });

      expect(result.current.history).toEqual(mockHistory);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorage.setItem('upload_history', 'invalid json');

      const { result } = renderHook(() => useUploadStore());
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      act(() => {
        result.current.loadHistory();
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.history).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('clearHistory', () => {
    it('should clear history from store and localStorage', () => {
      const mockHistory = [
        {
          id: 'file-1',
          filename: 'test.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          completedAt: '2023-01-01T00:00:00Z',
          storagePath: '/uploads/test.jpg',
        },
      ];

      localStorage.setItem('upload_history', JSON.stringify(mockHistory));

      const { result } = renderHook(() => useUploadStore());

      act(() => {
        result.current.loadHistory();
      });

      expect(result.current.history.length).toBe(1);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toEqual([]);
      expect(localStorage.getItem('upload_history')).toBeNull();
    });
  });
});
