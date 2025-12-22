import React from 'react';
import { UploadFile } from '../types/upload';
import { useUploadStore } from '../store/uploadStore';
import './FileItem.css';

interface FileItemProps {
  file: UploadFile;
}

export const FileItem: React.FC<FileItemProps> = ({ file }) => {
  const { startUpload, pauseUpload, resumeUpload, cancelUpload, removeFile } = useUploadStore();

  const getStatusColor = (status: UploadFile['status']): string => {
    switch (status) {
      case 'completed':
        return '#48bb78';
      case 'uploading':
        return '#4299e1';
      case 'failed':
        return '#f56565';
      case 'paused':
        return '#ed8936';
      case 'cancelled':
        return '#718096';
      default:
        return '#a0aec0';
    }
  };

  const getStatusText = (status: UploadFile['status']): string => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'validating':
        return 'Validating...';
      case 'uploading':
        return `Uploading ${file.progress}%`;
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleAction = () => {
    if (file.status === 'pending') {
      startUpload(file.id);
    } else if (file.status === 'uploading') {
      pauseUpload(file.id);
    } else if (file.status === 'paused') {
      resumeUpload(file.id);
    } else if (file.status === 'failed') {
      resumeUpload(file.id);
    }
  };

  const handleCancel = () => {
    if (file.status === 'uploading' || file.status === 'paused' || file.status === 'pending') {
      cancelUpload(file.id);
    } else {
      removeFile(file.id);
    }
  };

  const isImage = file.file.type.startsWith('image/');
  const isVideo = file.file.type.startsWith('video/');

  return (
    <div className="file-item">
      <div className="file-item__preview">
        {isImage ? (
          <img
            src={URL.createObjectURL(file.file)}
            alt={file.file.name}
            className="file-item__thumbnail"
          />
        ) : isVideo ? (
          <video
            src={URL.createObjectURL(file.file)}
            className="file-item__thumbnail"
            muted
          />
        ) : (
          <div className="file-item__icon">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="file-item__info">
        <div className="file-item__name" title={file.file.name}>
          {file.file.name}
        </div>
        <div className="file-item__meta">
          <span>{formatFileSize(file.file.size)}</span>
          {file.totalChunks > 0 && (
            <span>
              {file.uploadedChunks} / {file.totalChunks} chunks
            </span>
          )}
          {file.retryCount > 0 && <span>Retry: {file.retryCount}</span>}
        </div>
        <div className="file-item__status" style={{ color: getStatusColor(file.status) }}>
          {getStatusText(file.status)}
          {file.error && <span className="file-item__error">: {file.error}</span>}
        </div>

        {(file.status === 'uploading' || file.status === 'validating') && (
          <div className="file-item__progress">
            <div
              className="file-item__progress-bar"
              style={{
                width: `${file.progress}%`,
                backgroundColor: getStatusColor(file.status),
              }}
            />
          </div>
        )}
      </div>

      <div className="file-item__actions">
        {(file.status === 'pending' ||
          file.status === 'uploading' ||
          file.status === 'paused' ||
          file.status === 'failed') && (
          <button
            className="file-item__btn file-item__btn--action"
            onClick={handleAction}
            title={
              file.status === 'pending'
                ? 'Start upload'
                : file.status === 'uploading'
                ? 'Pause'
                : 'Resume'
            }
          >
            {file.status === 'uploading' ? (
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        )}

        <button
          className="file-item__btn file-item__btn--cancel"
          onClick={handleCancel}
          title={
            file.status === 'completed' || file.status === 'cancelled' ? 'Remove' : 'Cancel'
          }
        >
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FileItem;
