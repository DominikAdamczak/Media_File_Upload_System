import { create } from 'zustand';
import { uploadManager } from '../services/uploadManager';
import { UploadFile, UploadHistory, UploadConfig } from '../types/upload';

interface UploadStore {
  files: Map<string, UploadFile>;
  config: UploadConfig | null;
  history: UploadHistory[];
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  startUpload: (fileId: string) => void;
  pauseUpload: (fileId: string) => void;
  resumeUpload: (fileId: string) => void;
  cancelUpload: (fileId: string) => void;
  cancelAll: () => void;
  updateFileProgress: (fileId: string, progress: number, uploadedChunks: number) => void;
  updateFileStatus: (fileId: string, status: UploadFile['status']) => void;
  updateFileError: (fileId: string, error: string) => void;
  updateFileMetadata: (fileId: string, uploadId: string, totalChunks: number) => void;
  completeUpload: (fileId: string, storagePath: string) => void;
  loadHistory: () => void;
  clearHistory: () => void;
}

const HISTORY_STORAGE_KEY = 'upload_history';
const MAX_HISTORY_ITEMS = 50;

export const useUploadStore = create<UploadStore>((set, get) => ({
  files: new Map(),
  config: null,
  history: [],
  isInitialized: false,

  /**
   * Initialize upload manager and load config
   */
  initialize: async () => {
    if (get().isInitialized) return;

    await uploadManager.initialize();
    
    // Load history from localStorage
    get().loadHistory();

    set({ isInitialized: true });
  },

  /**
   * Add files to upload queue
   */
  addFiles: (newFiles: File[]) => {
    const { files, config } = get();
    const currentFiles = Array.from(files.values());

    // Validate file count
    if (config && currentFiles.length + newFiles.length > config.maxFiles) {
      alert(`Maximum ${config.maxFiles} files allowed`);
      return;
    }

    const updatedFiles = new Map(files);

    newFiles.forEach((file) => {
      // Validate file type
      if (config && !config.allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not allowed`);
        return;
      }

      // Validate file size
      if (config && file.size > config.maxFileSize) {
        alert(`File ${file.name} exceeds maximum size`);
        return;
      }

      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      const uploadFile: UploadFile = {
        id: fileId,
        file,
        status: 'pending',
        progress: 0,
        uploadedChunks: 0,
        totalChunks: 0,
        retryCount: 0,
      };

      updatedFiles.set(fileId, uploadFile);
    });

    set({ files: updatedFiles });
  },

  /**
   * Remove file from queue
   */
  removeFile: (fileId: string) => {
    const { files } = get();
    const file = files.get(fileId);

    if (file && file.status === 'uploading') {
      get().cancelUpload(fileId);
    }

    const updatedFiles = new Map(files);
    updatedFiles.delete(fileId);
    set({ files: updatedFiles });
  },

  /**
   * Start uploading a file
   */
  startUpload: (fileId: string) => {
    const { files } = get();
    const file = files.get(fileId);

    if (!file) return;

    uploadManager.startUpload(file, {
      onProgress: (id, progress) => {
        get().updateFileProgress(id, progress.progress, progress.uploadedChunks);
      },
      onStatusChange: (id, status) => {
        get().updateFileStatus(id, status);
      },
      onError: (id, error) => {
        get().updateFileError(id, error);
      },
      onMetadataUpdate: (id, uploadId, totalChunks) => {
        get().updateFileMetadata(id, uploadId, totalChunks);
      },
      onComplete: (id, storagePath) => {
        get().completeUpload(id, storagePath);
      },
    });
  },

  /**
   * Pause upload
   */
  pauseUpload: (fileId: string) => {
    uploadManager.pauseUpload(fileId);
    get().updateFileStatus(fileId, 'paused');
  },

  /**
   * Resume upload
   */
  resumeUpload: (fileId: string) => {
    const { files } = get();
    const file = files.get(fileId);

    if (!file) return;

    uploadManager.resumeUpload(file).catch((error) => {
      console.error('Failed to resume upload:', error);
      get().updateFileError(fileId, error.message || 'Failed to resume upload');
    });
  },

  /**
   * Cancel upload
   */
  cancelUpload: (fileId: string) => {
    const { files } = get();
    const file = files.get(fileId);

    uploadManager.cancelUpload(fileId, file?.uploadId);
    get().updateFileStatus(fileId, 'cancelled');
  },

  /**
   * Cancel all uploads
   */
  cancelAll: () => {
    uploadManager.cancelAll();
    const { files } = get();
    const updatedFiles = new Map(files);

    updatedFiles.forEach((file) => {
      if (file.status === 'uploading' || file.status === 'pending') {
        file.status = 'cancelled';
      }
    });

    set({ files: updatedFiles });
  },

  /**
   * Update file progress
   */
  updateFileProgress: (fileId: string, progress: number, uploadedChunks: number) => {
    const { files } = get();
    const file = files.get(fileId);

    if (!file) return;

    const updatedFiles = new Map(files);
    updatedFiles.set(fileId, {
      ...file,
      progress,
      uploadedChunks,
    });

    set({ files: updatedFiles });
  },

  /**
   * Update file status
   */
  updateFileStatus: (fileId: string, status: UploadFile['status']) => {
    const { files } = get();
    const file = files.get(fileId);

    if (!file) return;

    const updatedFiles = new Map(files);
    updatedFiles.set(fileId, {
      ...file,
      status,
    });

    set({ files: updatedFiles });
  },

  /**
   * Update file error
   */
  updateFileError: (fileId: string, error: string) => {
    const { files } = get();
    const file = files.get(fileId);

    if (!file) return;

    const updatedFiles = new Map(files);
    updatedFiles.set(fileId, {
      ...file,
      error,
      status: 'failed',
    });

    set({ files: updatedFiles });
  },

  /**
   * Update file metadata (uploadId and totalChunks)
   */
  updateFileMetadata: (fileId: string, uploadId: string, totalChunks: number) => {
    const { files } = get();
    const file = files.get(fileId);

    if (!file) return;

    const updatedFiles = new Map(files);
    updatedFiles.set(fileId, {
      ...file,
      uploadId,
      totalChunks,
    });

    set({ files: updatedFiles });
  },

  /**
   * Complete upload and add to history
   */
  completeUpload: (fileId: string, storagePath: string) => {
    const { files, history } = get();
    const file = files.get(fileId);

    if (!file) return;

    // Add to history
    const historyItem: UploadHistory = {
      id: fileId,
      filename: file.file.name,
      fileSize: file.file.size,
      mimeType: file.file.type,
      completedAt: new Date().toISOString(),
      storagePath,
    };

    const updatedHistory = [historyItem, ...history].slice(0, MAX_HISTORY_ITEMS);

    // Save to localStorage
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }

    set({ history: updatedHistory });
  },

  /**
   * Load history from localStorage
   */
  loadHistory: () => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        set({ history });
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  },

  /**
   * Clear upload history
   */
  clearHistory: () => {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      set({ history: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },
}));

export default useUploadStore;
