import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadStore } from '../store/uploadStore';
import './FileDropzone.css';

export const FileDropzone: React.FC = () => {
  const { addFiles, config } = useUploadStore();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        addFiles(acceptedFiles);
      }
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: config
      ? Object.fromEntries(config.allowedTypes.map((type) => [type, []]))
      : {
          'image/*': [],
          'video/*': [],
        },
    maxFiles: config?.maxFiles || 10,
    maxSize: config?.maxFileSize || 524288000, // 500MB default
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${
        isDragReject ? 'dropzone--reject' : ''
      }`}
    >
      <input {...getInputProps()} />
      <div className="dropzone__content">
        {isDragActive ? (
          isDragReject ? (
            <>
              <svg className="dropzone__icon dropzone__icon--error" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
              </svg>
              <p className="dropzone__text dropzone__text--error">
                Invalid file type or too many files
              </p>
            </>
          ) : (
            <>
              <svg className="dropzone__icon dropzone__icon--active" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                />
              </svg>
              <p className="dropzone__text dropzone__text--active">Drop files here</p>
            </>
          )
        ) : (
          <>
            <svg className="dropzone__icon" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
              />
            </svg>
            <p className="dropzone__text">
              <strong>Drag & drop</strong> files here, or <strong>click to select</strong>
            </p>
            <p className="dropzone__hint">
              Supports images and videos (max {config?.maxFiles || 10} files,{' '}
              {formatBytes(config?.maxFileSize || 524288000)} each)
            </p>
          </>
        )}
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
}

export default FileDropzone;
