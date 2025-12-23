import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileItem } from './FileItem';
import { useUploadStore } from '../store/uploadStore';
import { UploadFile } from '../types/upload';

// Mock the upload store
jest.mock('../store/uploadStore');

const mockUseUploadStore = useUploadStore as jest.MockedFunction<typeof useUploadStore>;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('FileItem Component', () => {
  const mockStartUpload = jest.fn();
  const mockPauseUpload = jest.fn();
  const mockResumeUpload = jest.fn();
  const mockCancelUpload = jest.fn();
  const mockRemoveFile = jest.fn();

  const createMockFile = (overrides?: Partial<UploadFile>): UploadFile => ({
    id: 'test-file-1',
    file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    status: 'pending',
    progress: 0,
    uploadedChunks: 0,
    totalChunks: 10,
    retryCount: 0,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: jest.fn(),
      addFiles: jest.fn(),
      removeFile: mockRemoveFile,
      startUpload: mockStartUpload,
      pauseUpload: mockPauseUpload,
      resumeUpload: mockResumeUpload,
      cancelUpload: mockCancelUpload,
      cancelAll: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render file name', () => {
      const file = createMockFile();
      render(<FileItem file={file} />);
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    it('should render file size', () => {
      const file = createMockFile({
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      });
      render(<FileItem file={file} />);
      expect(screen.getByText(/B/)).toBeInTheDocument();
    });

    it('should render chunk information when available', () => {
      const file = createMockFile({
        uploadedChunks: 5,
        totalChunks: 10,
      });
      render(<FileItem file={file} />);
      expect(screen.getByText('5 / 10 chunks')).toBeInTheDocument();
    });

    it('should render retry count when greater than 0', () => {
      const file = createMockFile({
        retryCount: 2,
      });
      render(<FileItem file={file} />);
      expect(screen.getByText('Retry: 2')).toBeInTheDocument();
    });

    it('should render image thumbnail for image files', () => {
      const file = createMockFile({
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      });
      const { container } = render(<FileItem file={file} />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'test.jpg');
    });

    it('should render video thumbnail for video files', () => {
      const file = createMockFile({
        file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
      });
      const { container } = render(<FileItem file={file} />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should render generic icon for other file types', () => {
      const file = createMockFile({
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
      });
      const { container } = render(<FileItem file={file} />);
      const icon = container.querySelector('.file-item__icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display pending status', () => {
      const file = createMockFile({ status: 'pending' });
      render(<FileItem file={file} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display validating status', () => {
      const file = createMockFile({ status: 'validating' });
      render(<FileItem file={file} />);
      expect(screen.getByText('Validating...')).toBeInTheDocument();
    });

    it('should display uploading status with progress', () => {
      const file = createMockFile({ status: 'uploading', progress: 45 });
      render(<FileItem file={file} />);
      expect(screen.getByText('Uploading 45%')).toBeInTheDocument();
    });

    it('should display paused status', () => {
      const file = createMockFile({ status: 'paused' });
      render(<FileItem file={file} />);
      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('should display completed status', () => {
      const file = createMockFile({ status: 'completed', progress: 100 });
      render(<FileItem file={file} />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should display failed status', () => {
      const file = createMockFile({ status: 'failed' });
      render(<FileItem file={file} />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should display cancelled status', () => {
      const file = createMockFile({ status: 'cancelled' });
      render(<FileItem file={file} />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('should display error message when present', () => {
      const file = createMockFile({
        status: 'failed',
        error: 'Network error',
      });
      render(<FileItem file={file} />);
      expect(screen.getByText(': Network error')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should show progress bar when uploading', () => {
      const file = createMockFile({ status: 'uploading', progress: 50 });
      const { container } = render(<FileItem file={file} />);
      const progressBar = container.querySelector('.file-item__progress-bar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('should show progress bar when validating', () => {
      const file = createMockFile({ status: 'validating', progress: 25 });
      const { container } = render(<FileItem file={file} />);
      const progressBar = container.querySelector('.file-item__progress-bar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not show progress bar when completed', () => {
      const file = createMockFile({ status: 'completed', progress: 100 });
      const { container } = render(<FileItem file={file} />);
      const progressBar = container.querySelector('.file-item__progress-bar');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show start button for pending files', () => {
      const file = createMockFile({ status: 'pending' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveAttribute('title', 'Start upload');
    });

    it('should show pause button for uploading files', () => {
      const file = createMockFile({ status: 'uploading' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveAttribute('title', 'Pause');
    });

    it('should show resume button for paused files', () => {
      const file = createMockFile({ status: 'paused' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveAttribute('title', 'Resume');
    });

    it('should show resume button for failed files', () => {
      const file = createMockFile({ status: 'failed' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action');
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveAttribute('title', 'Resume');
    });

    it('should not show action button for completed files', () => {
      const file = createMockFile({ status: 'completed' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action');
      expect(actionButton).not.toBeInTheDocument();
    });

    it('should always show cancel/remove button', () => {
      const file = createMockFile({ status: 'pending' });
      const { container } = render(<FileItem file={file} />);
      const cancelButton = container.querySelector('.file-item__btn--cancel');
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call startUpload when start button is clicked for pending file', () => {
      const file = createMockFile({ status: 'pending' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action') as HTMLElement;
      fireEvent.click(actionButton);
      expect(mockStartUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call pauseUpload when pause button is clicked for uploading file', () => {
      const file = createMockFile({ status: 'uploading' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action') as HTMLElement;
      fireEvent.click(actionButton);
      expect(mockPauseUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call resumeUpload when resume button is clicked for paused file', () => {
      const file = createMockFile({ status: 'paused' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action') as HTMLElement;
      fireEvent.click(actionButton);
      expect(mockResumeUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call resumeUpload when resume button is clicked for failed file', () => {
      const file = createMockFile({ status: 'failed' });
      const { container } = render(<FileItem file={file} />);
      const actionButton = container.querySelector('.file-item__btn--action') as HTMLElement;
      fireEvent.click(actionButton);
      expect(mockResumeUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call cancelUpload when cancel button is clicked for uploading file', () => {
      const file = createMockFile({ status: 'uploading' });
      const { container } = render(<FileItem file={file} />);
      const cancelButton = container.querySelector('.file-item__btn--cancel') as HTMLElement;
      fireEvent.click(cancelButton);
      expect(mockCancelUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call cancelUpload when cancel button is clicked for paused file', () => {
      const file = createMockFile({ status: 'paused' });
      const { container } = render(<FileItem file={file} />);
      const cancelButton = container.querySelector('.file-item__btn--cancel') as HTMLElement;
      fireEvent.click(cancelButton);
      expect(mockCancelUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call cancelUpload when cancel button is clicked for pending file', () => {
      const file = createMockFile({ status: 'pending' });
      const { container } = render(<FileItem file={file} />);
      const cancelButton = container.querySelector('.file-item__btn--cancel') as HTMLElement;
      fireEvent.click(cancelButton);
      expect(mockCancelUpload).toHaveBeenCalledWith('test-file-1');
    });

    it('should call removeFile when remove button is clicked for completed file', () => {
      const file = createMockFile({ status: 'completed' });
      const { container } = render(<FileItem file={file} />);
      const cancelButton = container.querySelector('.file-item__btn--cancel') as HTMLElement;
      fireEvent.click(cancelButton);
      expect(mockRemoveFile).toHaveBeenCalledWith('test-file-1');
    });

    it('should call removeFile when remove button is clicked for cancelled file', () => {
      const file = createMockFile({ status: 'cancelled' });
      const { container } = render(<FileItem file={file} />);
      const cancelButton = container.querySelector('.file-item__btn--cancel') as HTMLElement;
      fireEvent.click(cancelButton);
      expect(mockRemoveFile).toHaveBeenCalledWith('test-file-1');
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      const testCases = [
        { size: 0, expected: '0 B' },
        { size: 500, expected: '500.00 B' },
        { size: 1024, expected: '1.00 KB' },
        { size: 1048576, expected: '1.00 MB' },
        { size: 1073741824, expected: '1.00 GB' },
      ];

      testCases.forEach(({ size, expected }) => {
        // Create a file with the specific size
        const buffer = new ArrayBuffer(size);
        const mockFile = new File([buffer], 'test.jpg', { type: 'image/jpeg' });
        
        // Create the upload file object
        const file = createMockFile({
          file: mockFile,
        });
        
        // Override the file size for testing
        Object.defineProperty(file.file, 'size', { value: size, writable: false, configurable: true });
        
        const { unmount } = render(<FileItem file={file} />);
        
        // For 0 bytes, the formatFileSize function returns "0 B" without decimals
        const displayText = size === 0 ? '0 B' : expected;
        expect(screen.getByText(displayText)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color for completed status', () => {
      const file = createMockFile({ status: 'completed' });
      const { container } = render(<FileItem file={file} />);
      const statusElement = container.querySelector('.file-item__status');
      expect(statusElement).toHaveStyle({ color: '#48bb78' });
    });

    it('should apply correct color for uploading status', () => {
      const file = createMockFile({ status: 'uploading' });
      const { container } = render(<FileItem file={file} />);
      const statusElement = container.querySelector('.file-item__status');
      expect(statusElement).toHaveStyle({ color: '#4299e1' });
    });

    it('should apply correct color for failed status', () => {
      const file = createMockFile({ status: 'failed' });
      const { container } = render(<FileItem file={file} />);
      const statusElement = container.querySelector('.file-item__status');
      expect(statusElement).toHaveStyle({ color: '#f56565' });
    });

    it('should apply correct color for paused status', () => {
      const file = createMockFile({ status: 'paused' });
      const { container } = render(<FileItem file={file} />);
      const statusElement = container.querySelector('.file-item__status');
      expect(statusElement).toHaveStyle({ color: '#ed8936' });
    });

    it('should apply correct color for cancelled status', () => {
      const file = createMockFile({ status: 'cancelled' });
      const { container } = render(<FileItem file={file} />);
      const statusElement = container.querySelector('.file-item__status');
      expect(statusElement).toHaveStyle({ color: '#718096' });
    });
  });
});
