<?php

namespace App\Service;

use RuntimeException;
use DateTimeImmutable;

class StorageService
{
    private string $storagePath;
    private int $retentionDays;

    public function __construct(
        string $storagePath,
        int $retentionDays
    ) {
        $this->storagePath = $storagePath;
        $this->retentionDays = $retentionDays;

        $this->ensureDirectoryExists($this->storagePath);
    }

    /**
     * Store file with organized directory structure (by date/user)
     */
    public function storeFile(
        string $sourcePath,
        string $originalFilename,
        ?string $userId = null
    ): string {
        if (!file_exists($sourcePath)) {
            throw new RuntimeException('Source file does not exist');
        }

        // Create organized directory structure: YYYY/MM/DD/userId/
        $date = new DateTimeImmutable();
        $datePath = $date->format('Y/m/d');
        $userPath = $userId ?? 'anonymous';
        
        $targetDir = sprintf(
            '%s/%s/%s',
            $this->storagePath,
            $datePath,
            $userPath
        );

        $this->ensureDirectoryExists($targetDir);

        // Generate unique filename to avoid conflicts
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $basename = pathinfo($originalFilename, PATHINFO_FILENAME);
        $basename = $this->sanitizeFilename($basename);
        
        $uniqueId = uniqid('', true);
        $filename = sprintf('%s_%s.%s', $basename, $uniqueId, $extension);
        $targetPath = $targetDir . '/' . $filename;

        // Move file to storage
        if (!rename($sourcePath, $targetPath)) {
            throw new RuntimeException('Failed to move file to storage');
        }

        // Return relative path from storage root
        return str_replace($this->storagePath . '/', '', $targetPath);
    }

    /**
     * Check if file with same MD5 hash already exists (deduplication)
     */
    public function findDuplicateByMd5(string $md5Hash): ?string
    {
        $indexFile = $this->storagePath . '/md5_index.json';
        
        if (!file_exists($indexFile)) {
            return null;
        }

        $index = json_decode(file_get_contents($indexFile), true);
        
        if (isset($index[$md5Hash]) && file_exists($this->storagePath . '/' . $index[$md5Hash])) {
            return $index[$md5Hash];
        }

        return null;
    }

    /**
     * Register file in MD5 index for deduplication
     */
    public function registerFileInIndex(string $md5Hash, string $relativePath): void
    {
        $indexFile = $this->storagePath . '/md5_index.json';
        
        $index = [];
        if (file_exists($indexFile)) {
            $index = json_decode(file_get_contents($indexFile), true) ?? [];
        }

        $index[$md5Hash] = $relativePath;
        
        file_put_contents($indexFile, json_encode($index, JSON_PRETTY_PRINT));
    }

    /**
     * Get file path from storage
     */
    public function getFilePath(string $relativePath): string
    {
        return $this->storagePath . '/' . $relativePath;
    }

    /**
     * Check if file exists in storage
     */
    public function fileExists(string $relativePath): bool
    {
        return file_exists($this->getFilePath($relativePath));
    }

    /**
     * Delete file from storage
     */
    public function deleteFile(string $relativePath): bool
    {
        $filePath = $this->getFilePath($relativePath);
        
        if (!file_exists($filePath)) {
            return false;
        }

        return unlink($filePath);
    }

    /**
     * Clean up old files based on retention policy
     */
    public function cleanupOldFiles(): array
    {
        $stats = [
            'scanned' => 0,
            'deleted' => 0,
            'errors' => 0,
            'freed_space' => 0,
        ];

        $cutoffDate = new DateTimeImmutable(sprintf('-%d days', $this->retentionDays));
        $cutoffTimestamp = $cutoffDate->getTimestamp();

        $this->cleanupDirectory($this->storagePath, $cutoffTimestamp, $stats);

        return $stats;
    }

    /**
     * Recursively clean up directory
     */
    private function cleanupDirectory(string $dir, int $cutoffTimestamp, array &$stats): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        
        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === 'md5_index.json') {
                continue;
            }

            $path = $dir . '/' . $item;

            if (is_dir($path)) {
                $this->cleanupDirectory($path, $cutoffTimestamp, $stats);
                
                // Remove empty directories
                if (count(scandir($path)) === 2) { // Only . and ..
                    rmdir($path);
                }
            } else {
                $stats['scanned']++;
                
                $fileTime = filemtime($path);
                
                if ($fileTime < $cutoffTimestamp) {
                    $fileSize = filesize($path);
                    
                    if (unlink($path)) {
                        $stats['deleted']++;
                        $stats['freed_space'] += $fileSize;
                    } else {
                        $stats['errors']++;
                    }
                }
            }
        }
    }

    /**
     * Get storage statistics
     */
    public function getStorageStats(): array
    {
        $stats = [
            'total_files' => 0,
            'total_size' => 0,
            'storage_path' => $this->storagePath,
        ];

        $this->calculateDirectoryStats($this->storagePath, $stats);

        $stats['total_size_formatted'] = $this->formatBytes($stats['total_size']);

        return $stats;
    }

    /**
     * Calculate directory statistics recursively
     */
    private function calculateDirectoryStats(string $dir, array &$stats): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        
        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === 'md5_index.json') {
                continue;
            }

            $path = $dir . '/' . $item;

            if (is_dir($path)) {
                $this->calculateDirectoryStats($path, $stats);
            } else {
                $stats['total_files']++;
                $stats['total_size'] += filesize($path);
            }
        }
    }

    /**
     * Sanitize filename for safe storage
     */
    private function sanitizeFilename(string $filename): string
    {
        // Remove any non-alphanumeric characters except dash, underscore
        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $filename);
        
        // Limit length
        if (strlen($filename) > 100) {
            $filename = substr($filename, 0, 100);
        }

        return $filename;
    }

    /**
     * Ensure directory exists
     */
    private function ensureDirectoryExists(string $path): void
    {
        if (!is_dir($path)) {
            if (!mkdir($path, 0755, true) && !is_dir($path)) {
                throw new RuntimeException(sprintf('Failed to create directory: %s', $path));
            }
        }
    }

    /**
     * Format bytes to human-readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = floor((strlen((string) $bytes) - 1) / 3);
        return sprintf('%.2f %s', $bytes / (1024 ** $factor), $units[$factor]);
    }

    public function getStoragePath(): string
    {
        return $this->storagePath;
    }

    public function getRetentionDays(): int
    {
        return $this->retentionDays;
    }
}
