import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { useUploadStore } from './store/uploadStore';
import { UploadFile } from './types/upload';

// Mock the upload store
jest.mock('./store/uploadStore');

const mockUseUploadStore = useUploadStore as jest.MockedFunction<typeof useUploadStore>;

describe('App Component', () => {
  const mockInitialize = jest.fn();
  const mockCancelAll = jest.fn();

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
  });

  it('should render loading state when not initialized', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: false,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(screen.getByText('Initializing upload manager...')).toBeInTheDocument();
  });

  it('should call initialize on mount', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('should render main UI when initialized', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(screen.getByText('Media File Upload System')).toBeInTheDocument();
    expect(screen.getByText('Upload images and videos with chunked transfer')).toBeInTheDocument();
  });

  it('should display file statistics when files are present', () => {
    const files = new Map<string, UploadFile>([
      ['file-1', createMockFile({ id: 'file-1', status: 'uploading', progress: 50 })],
      ['file-2', createMockFile({ id: 'file-2', status: 'completed', progress: 100 })],
      ['file-3', createMockFile({ id: 'file-3', status: 'failed', progress: 30 })],
    ]);

    mockUseUploadStore.mockReturnValue({
      files,
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    
    // Check total files
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total Files')).toBeInTheDocument();
    
    // Check uploading count - use getAllByText since there are multiple "1"s
    const uploadingLabels = screen.getAllByText('Uploading');
    const uploadingSection = uploadingLabels[0].closest('.stat-card');
    expect(uploadingSection).toHaveTextContent('1');
    
    // Check completed count
    const completedLabels = screen.getAllByText('Completed');
    const completedSection = completedLabels[0].closest('.stat-card');
    expect(completedSection).toHaveTextContent('1');
    
    // Check failed count
    const failedLabels = screen.getAllByText('Failed');
    const failedSection = failedLabels[0].closest('.stat-card');
    expect(failedSection).toHaveTextContent('1');
  });

  it('should calculate overall progress correctly', () => {
    const files = new Map<string, UploadFile>([
      ['file-1', createMockFile({ id: 'file-1', progress: 50 })],
      ['file-2', createMockFile({ id: 'file-2', progress: 100 })],
      ['file-3', createMockFile({ id: 'file-3', progress: 25 })],
    ]);

    mockUseUploadStore.mockReturnValue({
      files,
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    
    // Overall progress should be (50 + 100 + 25) / 3 = 58%
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
  });

  it('should show cancel all button when there are active uploads', () => {
    const files = new Map<string, UploadFile>([
      ['file-1', createMockFile({ id: 'file-1', status: 'uploading' })],
    ]);

    mockUseUploadStore.mockReturnValue({
      files,
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(screen.getByText('Cancel All Uploads')).toBeInTheDocument();
  });

  it('should call cancelAll when cancel all button is clicked', () => {
    const files = new Map<string, UploadFile>([
      ['file-1', createMockFile({ id: 'file-1', status: 'uploading' })],
    ]);

    mockUseUploadStore.mockReturnValue({
      files,
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    const cancelButton = screen.getByText('Cancel All Uploads');
    fireEvent.click(cancelButton);
    
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });

  it('should not show cancel all button when no active uploads', () => {
    const files = new Map<string, UploadFile>([
      ['file-1', createMockFile({ id: 'file-1', status: 'completed' })],
    ]);

    mockUseUploadStore.mockReturnValue({
      files,
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(screen.queryByText('Cancel All Uploads')).not.toBeInTheDocument();
  });

  it('should render file list when files are present', () => {
    const files = new Map<string, UploadFile>([
      ['file-1', createMockFile({ id: 'file-1' })],
    ]);

    mockUseUploadStore.mockReturnValue({
      files,
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(screen.getByText('Upload Queue')).toBeInTheDocument();
  });

  it('should render footer with information', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: mockInitialize,
      cancelAll: mockCancelAll,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<App />);
    expect(screen.getByText(/Supports chunked uploads with pause\/resume/i)).toBeInTheDocument();
  });
});
