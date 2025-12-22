<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use RuntimeException;

class ChunkHandlerService
{
    private string $tempPath;
    private int $chunkSize;
    private int $chunkTimeout;

    public function __construct(
        string $tempPath,
        int $chunkSize,
        int $chunkTimeout
    ) {
        $this->tempPath = $tempPath;
        $this->chunkSize = $chunkSize;
        $this->chunkTimeout = $chunkTimeout;

        $this->ensureDirectoryExists($this->tempPath);
    }

    /**
     * Save uploaded chunk to temporary storage
     */
    public function saveChunk(
        string $uploadId,
        int $chunkIndex,
        UploadedFile $chunkFile
    ): string {
        $chunkDir = $this->getChunkDirectory($uploadId);
        $this->ensureDirectoryExists($chunkDir);

        $chunkPath = $this->getChunkPath($uploadId, $chunkIndex);
        $chunkFile->move(dirname($chunkPath), basename($chunkPath));

        if (!file_exists($chunkPath)) {
            throw new RuntimeException('Failed to save chunk');
        }

        return $chunkPath;
    }

    /**
     * Check if chunk already exists
     */
    public function chunkExists(string $uploadId, int $chunkIndex): bool
    {
        return file_exists($this->getChunkPath($uploadId, $chunkIndex));
    }

    /**
     * Get list of uploaded chunks for an upload
     */
    public function getUploadedChunks(string $uploadId): array
    {
        $chunkDir = $this->getChunkDirectory($uploadId);
        
        if (!is_dir($chunkDir)) {
            return [];
        }

        $chunks = glob($chunkDir . '/chunk_*.bin');
        
        return array_map(function ($path) {
            preg_match('/chunk_(\d+)\.bin$/', $path, $matches);
            return (int)$matches[1];
        }, $chunks);
    }

    /**
     * Reassemble chunks into final file
     */
    public function reassembleChunks(
        string $uploadId,
        int $totalChunks,
        string $outputPath
    ): bool {
        $this->ensureDirectoryExists(dirname($outputPath));
        
        $outputHandle = fopen($outputPath, 'wb');
        if ($outputHandle === false) {
            throw new RuntimeException('Failed to create output file');
        }

        try {
            for ($i = 0; $i < $totalChunks; $i++) {
                $chunkPath = $this->getChunkPath($uploadId, $i);
                
                if (!file_exists($chunkPath)) {
                    throw new RuntimeException(sprintf('Chunk %d is missing', $i));
                }

                $chunkHandle = fopen($chunkPath, 'rb');
                if ($chunkHandle === false) {
                    throw new RuntimeException(sprintf('Failed to read chunk %d', $i));
                }

                while (!feof($chunkHandle)) {
                    $data = fread($chunkHandle, 8192);
                    if ($data === false) {
                        throw new RuntimeException(sprintf('Failed to read data from chunk %d', $i));
                    }
                    fwrite($outputHandle, $data);
                }

                fclose($chunkHandle);
            }

            fclose($outputHandle);
            return true;

        } catch (\Exception $e) {
            fclose($outputHandle);
            if (file_exists($outputPath)) {
                unlink($outputPath);
            }
            throw $e;
        }
    }

    /**
     * Verify reassembled file integrity
     */
    public function verifyFileIntegrity(string $filePath, string $expectedMd5): bool
    {
        if (!file_exists($filePath)) {
            return false;
        }

        $actualMd5 = md5_file($filePath);
        return $actualMd5 === $expectedMd5;
    }

    /**
     * Calculate MD5 hash of file
     */
    public function calculateMd5(string $filePath): string
    {
        if (!file_exists($filePath)) {
            throw new RuntimeException('File does not exist');
        }

        return md5_file($filePath);
    }

    /**
     * Clean up chunks for an upload
     */
    public function cleanupChunks(string $uploadId): void
    {
        $chunkDir = $this->getChunkDirectory($uploadId);
        
        if (!is_dir($chunkDir)) {
            return;
        }

        $this->removeDirectory($chunkDir);
    }

    /**
     * Clean up expired chunks (older than timeout)
     */
    public function cleanupExpiredChunks(): int
    {
        $cleanedCount = 0;
        $uploadDirs = glob($this->tempPath . '/upload_*');

        foreach ($uploadDirs as $dir) {
            if (!is_dir($dir)) {
                continue;
            }

            $lastModified = filemtime($dir);
            $age = time() - $lastModified;

            if ($age > $this->chunkTimeout) {
                $this->removeDirectory($dir);
                $cleanedCount++;
            }
        }

        return $cleanedCount;
    }

    /**
     * Get chunk directory path
     */
    private function getChunkDirectory(string $uploadId): string
    {
        return $this->tempPath . '/upload_' . $uploadId;
    }

    /**
     * Get chunk file path
     */
    private function getChunkPath(string $uploadId, int $chunkIndex): string
    {
        return $this->getChunkDirectory($uploadId) . '/chunk_' . $chunkIndex . '.bin';
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
     * Remove directory recursively
     */
    private function removeDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->removeDirectory($path) : unlink($path);
        }

        rmdir($dir);
    }

    public function getChunkSize(): int
    {
        return $this->chunkSize;
    }

    public function getChunkTimeout(): int
    {
        return $this->chunkTimeout;
    }
}
