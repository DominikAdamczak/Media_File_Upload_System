import React, { useEffect } from 'react';
import { FileDropzone } from './components/FileDropzone';
import { FileItem } from './components/FileItem';
import { useUploadStore } from './store/uploadStore';
import './App.css';

function App() {
  const { files, initialize, isInitialized, cancelAll } = useUploadStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const fileArray = Array.from(files.values());
  const activeUploads = fileArray.filter(
    (f) => f.status === 'uploading' || f.status === 'pending'
  );
  const completedUploads = fileArray.filter((f) => f.status === 'completed');
  const failedUploads = fileArray.filter((f) => f.status === 'failed');

  const overallProgress =
    fileArray.length > 0
      ? Math.round(fileArray.reduce((sum, f) => sum + f.progress, 0) / fileArray.length)
      : 0;

  if (!isInitialized) {
    return (
      <div className="app">
        <div className="loading">Initializing upload manager...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <svg className="app__icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
            />
          </svg>
          Media File Upload System
        </h1>
        <p className="app__subtitle">Upload images and videos with chunked transfer</p>
      </header>

      <main className="app__main">
        <section className="app__section">
          <FileDropzone />
        </section>

        {fileArray.length > 0 && (
          <>
            <section className="app__section">
              <div className="app__stats">
                <div className="stat-card">
                  <div className="stat-card__value">{fileArray.length}</div>
                  <div className="stat-card__label">Total Files</div>
                </div>
                <div className="stat-card stat-card--active">
                  <div className="stat-card__value">{activeUploads.length}</div>
                  <div className="stat-card__label">Uploading</div>
                </div>
                <div className="stat-card stat-card--success">
                  <div className="stat-card__value">{completedUploads.length}</div>
                  <div className="stat-card__label">Completed</div>
                </div>
                <div className="stat-card stat-card--error">
                  <div className="stat-card__value">{failedUploads.length}</div>
                  <div className="stat-card__label">Failed</div>
                </div>
                <div className="stat-card stat-card--progress">
                  <div className="stat-card__value">{overallProgress}%</div>
                  <div className="stat-card__label">Overall Progress</div>
                </div>
              </div>

              {activeUploads.length > 0 && (
                <div className="app__actions">
                  <button className="btn btn--danger" onClick={cancelAll}>
                    Cancel All Uploads
                  </button>
                </div>
              )}
            </section>

            <section className="app__section">
              <h2 className="app__section-title">Upload Queue</h2>
              <div className="file-list">
                {fileArray.map((file) => (
                  <FileItem key={file.id} file={file} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="app__footer">
        <p>
          Supports chunked uploads with pause/resume, automatic retry, and file deduplication
        </p>
      </footer>
    </div>
  );
}

export default App;
