import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropzone } from './FileDropzone';
import { useUploadStore } from '../store/uploadStore';

// Mock the upload store
jest.mock('../store/uploadStore');

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, accept, maxFiles, maxSize }: any) => ({
    getRootProps: () => ({
      onClick: jest.fn(),
      onDrop: (e: any) => {
        const files = Array.from(e.dataTransfer?.files || []);
        onDrop(files);
      },
    }),
    getInputProps: () => ({
      type: 'file',
      accept: Object.keys(accept || {}).join(','),
      multiple: true,
    }),
    isDragActive: false,
    isDragReject: false,
  }),
}));

const mockUseUploadStore = useUploadStore as jest.MockedFunction<typeof useUploadStore>;

describe('FileDropzone Component', () => {
  const mockAddFiles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dropzone with default text', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: jest.fn(),
      addFiles: mockAddFiles,
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      cancelAll: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<FileDropzone />);
    
    expect(screen.getByText(/Drag & drop/i)).toBeInTheDocument();
    expect(screen.getByText(/click to select/i)).toBeInTheDocument();
  });

  it('should display default file limits when no config', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: jest.fn(),
      addFiles: mockAddFiles,
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      cancelAll: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<FileDropzone />);
    
    expect(screen.getByText(/max 10 files/i)).toBeInTheDocument();
    expect(screen.getByText(/500 MB each/i)).toBeInTheDocument();
  });

  it('should display config limits when config is available', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: {
        maxFileSize: 104857600, // 100MB
        allowedTypes: ['image/jpeg', 'image/png'],
        chunkSize: 1048576,
        maxFiles: 5,
        maxParallelUploads: 3,
      },
      history: [],
      isInitialized: true,
      initialize: jest.fn(),
      addFiles: mockAddFiles,
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      cancelAll: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    render(<FileDropzone />);
    
    expect(screen.getByText(/max 5 files/i)).toBeInTheDocument();
    expect(screen.getByText(/100 MB each/i)).toBeInTheDocument();
  });

  it('should have correct CSS classes', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: jest.fn(),
      addFiles: mockAddFiles,
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      cancelAll: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    const { container } = render(<FileDropzone />);
    const dropzone = container.querySelector('.dropzone');
    
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).toHaveClass('dropzone');
  });

  it('should render upload icon', () => {
    mockUseUploadStore.mockReturnValue({
      files: new Map(),
      config: null,
      history: [],
      isInitialized: true,
      initialize: jest.fn(),
      addFiles: mockAddFiles,
      removeFile: jest.fn(),
      startUpload: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn(),
      cancelAll: jest.fn(),
      updateFileProgress: jest.fn(),
      updateFileStatus: jest.fn(),
      updateFileError: jest.fn(),
      updateFileMetadata: jest.fn(),
      completeUpload: jest.fn(),
      loadHistory: jest.fn(),
      clearHistory: jest.fn(),
    });

    const { container } = render(<FileDropzone />);
    const icon = container.querySelector('.dropzone__icon');
    
    expect(icon).toBeInTheDocument();
  });
});

describe('FileDropzone formatBytes utility', () => {
  const mockAddFiles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format bytes correctly for different sizes', () => {
    const testCases = [
      { bytes: 1024, expected: '1 KB' },
      { bytes: 1048576, expected: '1 MB' },
      { bytes: 1073741824, expected: '1 GB' },
      { bytes: 524288000, expected: '500 MB' },
    ];

    testCases.forEach(({ bytes, expected }) => {
      mockUseUploadStore.mockReturnValue({
        files: new Map(),
        config: {
          maxFileSize: bytes,
          allowedTypes: ['image/jpeg'],
          chunkSize: 1048576,
          maxFiles: 10,
          maxParallelUploads: 3,
        },
        history: [],
        isInitialized: true,
        initialize: jest.fn(),
        addFiles: mockAddFiles,
        removeFile: jest.fn(),
        startUpload: jest.fn(),
        pauseUpload: jest.fn(),
        resumeUpload: jest.fn(),
        cancelUpload: jest.fn(),
        cancelAll: jest.fn(),
        updateFileProgress: jest.fn(),
        updateFileStatus: jest.fn(),
        updateFileError: jest.fn(),
        updateFileMetadata: jest.fn(),
        completeUpload: jest.fn(),
        loadHistory: jest.fn(),
        clearHistory: jest.fn(),
      });

      const { unmount } = render(<FileDropzone />);
      expect(screen.getByText(new RegExp(expected, 'i'))).toBeInTheDocument();
      unmount();
    });
  });
});
