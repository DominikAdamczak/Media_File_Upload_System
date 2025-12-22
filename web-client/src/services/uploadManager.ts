import { apiClient } from './apiClient';
import { UploadFile, ChunkUploadProgress } from '../types/upload';
import SparkMD5 from 'spark-md5';

export interface UploadCallbacks {
  onProgress?: (fileId: string, progress: ChunkUploadProgress) => void;
  onStatusChange?: (fileId: string, status: UploadFile['status']) => void;
  onError?: (fileId: string, error: string) => void;
  onComplete?: (fileId: string, storagePath: string) => void;
  onMetadataUpdate?: (fileId: string, uploadId: string, totalChunks: number) => void;
}

class UploadManager {
  private chunkSize: number = 1048576; // 1MB default
  private maxParallelUploads: number = 3;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // Initial retry delay in ms
  private activeUploads: Map<string, boolean> = new Map();
  private cancelledUploads: Set<string> = new Set();
  private pausedUploads: Set<string> = new Set();
  private uploadQueue: string[] = [];
  private callbacks: Map<string, UploadCallbacks> = new Map();
  private fileRegistry: Map<string, UploadFile> = new Map();
  private queueProcessor?: () => void;

  /**
   * Initialize upload manager with configuration
   */
  async initialize(): Promise<void> {
    try {
      const config = await apiClient.getConfig();
      this.chunkSize = config.chunkSize;
      this.maxParallelUploads = config.maxParallelUploads;
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
    }
  }

  /**
   * Set queue processor callback
   */
  setQueueProcessor(processor: () => void): void {
    this.queueProcessor = processor;
  }

  /**
   * Start uploading a file
   */
  async startUpload(
    uploadFile: UploadFile,
    callbacks?: UploadCallbacks
  ): Promise<void> {
    const fileId = uploadFile.id;

    // Store file reference
    this.fileRegistry.set(fileId, uploadFile);

    if (callbacks) {
      this.callbacks.set(fileId, callbacks);
    }

    // Add to queue if max parallel uploads reached
    if (this.activeUploads.size >= this.maxParallelUploads) {
      this.uploadQueue.push(fileId);
      this.updateStatus(fileId, 'pending');
      return;
    }

    await this.processUpload(uploadFile);
  }

  /**
   * Process file upload
   */
  private async processUpload(uploadFile: UploadFile, skipInitiation: boolean = false): Promise<void> {
    const fileId = uploadFile.id;
    this.activeUploads.set(fileId, true);

    try {
      // Skip initiation if resuming an existing upload
      if (!skipInitiation) {
        // Update status to validating
        this.updateStatus(fileId, 'validating');

        // Calculate MD5 hash
        const md5Hash = await this.calculateMD5(uploadFile.file);

        // Initiate upload
        const initResponse = await apiClient.initiateUpload(
          uploadFile.file.name,
          uploadFile.file.type,
          uploadFile.file.size,
          md5Hash
        );

        // Check for duplicate
        if (initResponse.duplicate && initResponse.storagePath) {
          this.updateStatus(fileId, 'completed');
          this.triggerComplete(fileId, initResponse.storagePath);
          this.finishUpload(fileId);
          return;
        }

        uploadFile.uploadId = initResponse.uploadId;
        uploadFile.totalChunks = initResponse.totalChunks;
        
        // Notify store about metadata update
        this.triggerMetadataUpdate(fileId, initResponse.uploadId, initResponse.totalChunks);
      }

      // Update status to uploading
      this.updateStatus(fileId, 'uploading');

      // Upload chunks
      await this.uploadChunks(uploadFile);

      // Finalize upload
      if (!uploadFile.uploadId) {
        throw new Error('Upload ID is missing');
      }
      
      const finalizeResponse = await apiClient.finalizeUpload(uploadFile.uploadId);

      // Mark as completed
      this.updateStatus(fileId, 'completed');
      this.triggerComplete(fileId, finalizeResponse.storagePath);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Don't mark as failed if it was paused or cancelled
      if (errorMessage === 'Upload paused') {
        // Status already set to paused, don't trigger error
        this.activeUploads.delete(fileId);
        return;
      } else if (errorMessage === 'Upload cancelled') {
        // Status already set to cancelled, don't trigger error
        this.finishUpload(fileId);
        return;
      }
      
      this.updateStatus(fileId, 'failed');
      this.triggerError(fileId, errorMessage);
    } finally {
      // Only finish upload if not paused
      if (!this.pausedUploads.has(fileId)) {
        this.finishUpload(fileId);
      }
    }
  }

  /**
   * Upload file chunks with retry logic
   */
  private async uploadChunks(uploadFile: UploadFile): Promise<void> {
    const { file, uploadId, totalChunks, id: fileId } = uploadFile;

    if (!uploadId || !totalChunks) {
      throw new Error('Upload not properly initiated');
    }

    // Start from the last uploaded chunk (for resume functionality)
    const startChunk = uploadFile.uploadedChunks || 0;

    for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
      // Check if upload was cancelled or paused
      if (this.cancelledUploads.has(fileId)) {
        this.cancelledUploads.delete(fileId);
        throw new Error('Upload cancelled');
      }

      if (this.pausedUploads.has(fileId)) {
        throw new Error('Upload paused');
      }

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);

      // Upload chunk with retry
      await this.uploadChunkWithRetry(
        uploadFile,
        uploadId,
        chunkIndex,
        chunk
      );

      // Update progress
      uploadFile.uploadedChunks = chunkIndex + 1;
      uploadFile.progress = Math.round((uploadFile.uploadedChunks / totalChunks) * 100);

      this.triggerProgress(uploadFile.id, {
        chunkIndex,
        uploadedChunks: uploadFile.uploadedChunks,
        totalChunks,
        progress: uploadFile.progress,
      });
    }
  }

  /**
   * Upload single chunk with exponential backoff retry
   */
  private async uploadChunkWithRetry(
    uploadFile: UploadFile,
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    retryCount: number = 0
  ): Promise<void> {
    try {
      // Check if upload was cancelled or paused before uploading chunk
      if (this.cancelledUploads.has(uploadFile.id)) {
        throw new Error('Upload cancelled');
      }

      if (this.pausedUploads.has(uploadFile.id)) {
        throw new Error('Upload paused');
      }

      const response = await apiClient.uploadChunk(uploadId, chunkIndex, chunk);

      if (!response.success) {
        throw new Error(response.error || 'Chunk upload failed');
      }
    } catch (error) {
      // Don't retry if upload was cancelled or paused
      if (error instanceof Error &&
          (error.message === 'Upload cancelled' || error.message === 'Upload paused')) {
        throw error;
      }

      if (retryCount < this.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await this.sleep(delay);

        uploadFile.retryCount = retryCount + 1;

        return this.uploadChunkWithRetry(
          uploadFile,
          uploadId,
          chunkIndex,
          chunk,
          retryCount + 1
        );
      }

      throw error;
    }
  }

  /**
   * Pause upload
   */
  pauseUpload(fileId: string): void {
    if (this.activeUploads.has(fileId)) {
      // Mark as paused to stop the upload loop
      this.pausedUploads.add(fileId);
      this.updateStatus(fileId, 'paused');
    }
  }

  /**
   * Resume upload
   */
  async resumeUpload(uploadFile: UploadFile): Promise<void> {
    const fileId = uploadFile.id;
    
    // Get the file from registry which has the uploadId and totalChunks
    const registeredFile = this.fileRegistry.get(fileId);
    
    // If file is in registry, use that (it has uploadId and totalChunks)
    // Otherwise, validate the passed file has the necessary info
    const fileToResume = registeredFile || uploadFile;
    
    if (!fileToResume.uploadId || !fileToResume.totalChunks) {
      throw new Error('Cannot resume upload: missing uploadId or totalChunks');
    }
    
    // Update the registry with latest file data (in case it came from store)
    if (!registeredFile) {
      this.fileRegistry.set(fileId, fileToResume);
    }
    
    // Remove from paused set
    this.pausedUploads.delete(fileId);
    
    // Update status to uploading
    this.updateStatus(fileId, 'uploading');
    
    // Resume the upload from where it left off, skipping initiation
    await this.processUpload(fileToResume, true);
  }

  /**
   * Cancel upload
   */
  async cancelUpload(fileId: string, uploadId?: string): Promise<void> {
    // Mark as cancelled to stop the upload loop immediately
    this.cancelledUploads.add(fileId);
    this.pausedUploads.delete(fileId);
    this.activeUploads.delete(fileId);

    // Get uploadId from registry if not provided
    const registeredFile = this.fileRegistry.get(fileId);
    const actualUploadId = uploadId || registeredFile?.uploadId;

    if (actualUploadId) {
      try {
        await apiClient.cancelUpload(actualUploadId);
      } catch (error) {
        console.error('Failed to cancel upload on server:', error);
      }
    }

    this.callbacks.delete(fileId);
    this.fileRegistry.delete(fileId);
    this.updateStatus(fileId, 'cancelled');
  }

  /**
   * Cancel all active uploads
   */
  cancelAll(): void {
    // Mark all active uploads as cancelled
    this.activeUploads.forEach((_, fileId) => {
      this.cancelledUploads.add(fileId);
      this.updateStatus(fileId, 'cancelled');
    });
    
    this.activeUploads.clear();
    this.pausedUploads.clear();
    this.uploadQueue = [];
    this.callbacks.clear();
    this.fileRegistry.clear();
  }

  /**
   * Calculate MD5 hash of file
   */
  private async calculateMD5(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunkSize = 2097152; // Read in chunks of 2MB
      const spark = new SparkMD5.ArrayBuffer();
      const fileReader = new FileReader();
      let currentChunk = 0;
      const chunks = Math.ceil(file.size / chunkSize);

      fileReader.onload = (e) => {
        spark.append(e.target?.result as ArrayBuffer);
        currentChunk++;

        if (currentChunk < chunks) {
          loadNext();
        } else {
          resolve(spark.end());
        }
      };

      fileReader.onerror = () => {
        reject(new Error('Failed to read file for MD5 calculation'));
      };

      const loadNext = () => {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        fileReader.readAsArrayBuffer(file.slice(start, end));
      };

      loadNext();
    });
  }

  /**
   * Finish upload and process queue
   */
  private finishUpload(fileId: string): void {
    this.activeUploads.delete(fileId);
    // Don't delete from registry if paused - we need it for resume
    if (!this.pausedUploads.has(fileId)) {
      this.fileRegistry.delete(fileId);
    }

    // Process next in queue
    if (this.uploadQueue.length > 0) {
      const nextFileId = this.uploadQueue.shift();
      if (nextFileId) {
        const nextFile = this.fileRegistry.get(nextFileId);
        if (nextFile) {
          // Process the next file from queue
          this.processUpload(nextFile);
        } else if (this.queueProcessor) {
          // Fallback: notify the store to process the queue
          this.queueProcessor();
        }
      }
    }
  }

  /**
   * Trigger progress callback
   */
  private triggerProgress(fileId: string, progress: ChunkUploadProgress): void {
    const callbacks = this.callbacks.get(fileId);
    if (callbacks?.onProgress) {
      callbacks.onProgress(fileId, progress);
    }
  }

  /**
   * Trigger status change callback
   */
  private updateStatus(fileId: string, status: UploadFile['status']): void {
    const callbacks = this.callbacks.get(fileId);
    if (callbacks?.onStatusChange) {
      callbacks.onStatusChange(fileId, status);
    }
  }

  /**
   * Trigger error callback
   */
  private triggerError(fileId: string, error: string): void {
    const callbacks = this.callbacks.get(fileId);
    if (callbacks?.onError) {
      callbacks.onError(fileId, error);
    }
  }

  /**
   * Trigger complete callback
   */
  private triggerComplete(fileId: string, storagePath: string): void {
    const callbacks = this.callbacks.get(fileId);
    if (callbacks?.onComplete) {
      callbacks.onComplete(fileId, storagePath);
    }
  }

  /**
   * Trigger metadata update callback
   */
  private triggerMetadataUpdate(fileId: string, uploadId: string, totalChunks: number): void {
    const callbacks = this.callbacks.get(fileId);
    if (callbacks?.onMetadataUpdate) {
      callbacks.onMetadataUpdate(fileId, uploadId, totalChunks);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active uploads count
   */
  getActiveUploadsCount(): number {
    return this.activeUploads.size;
  }

  /**
   * Get queued uploads count
   */
  getQueuedUploadsCount(): number {
    return this.uploadQueue.length;
  }
}

export const uploadManager = new UploadManager();
export default uploadManager;
