<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

class FileValidationService
{
    private const MAGIC_NUMBERS = [
        'image/jpeg' => [
            ['offset' => 0, 'bytes' => 'FFD8FF'],
        ],
        'image/png' => [
            ['offset' => 0, 'bytes' => '89504E47'],
        ],
        'image/gif' => [
            ['offset' => 0, 'bytes' => '474946383761'],
            ['offset' => 0, 'bytes' => '474946383961'],
        ],
        'image/webp' => [
            ['offset' => 8, 'bytes' => '57454250'],
        ],
        'video/mp4' => [
            ['offset' => 4, 'bytes' => '6674797069736F6D'],
            ['offset' => 4, 'bytes' => '66747970'],
        ],
        'video/quicktime' => [
            ['offset' => 4, 'bytes' => '6674797071742020'],
            ['offset' => 4, 'bytes' => '6D6F6F76'],
        ],
        'video/x-msvideo' => [
            ['offset' => 0, 'bytes' => '52494646'],
            ['offset' => 8, 'bytes' => '415649204C495354'],
        ],
        'video/mpeg' => [
            ['offset' => 0, 'bytes' => '000001BA'],
            ['offset' => 0, 'bytes' => '000001B3'],
        ],
    ];

    private array $allowedTypes;
    private int $maxFileSize;
    private int $maxFiles;

    public function __construct(
        array $allowedTypes,
        int $maxFileSize,
        int $maxFiles
    ) {
        $this->allowedTypes = $allowedTypes;
        $this->maxFileSize = $maxFileSize;
        $this->maxFiles = $maxFiles;
    }

    /**
     * Validate file metadata (size, type, quantity)
     */
    public function validateFileMetadata(
        string $filename,
        string $mimeType,
        int $fileSize,
        int $fileCount = 1
    ): array {
        $errors = [];

        // Validate file count
        if ($fileCount > $this->maxFiles) {
            $errors[] = sprintf(
                'Too many files. Maximum allowed: %d',
                $this->maxFiles
            );
        }

        // Validate file size
        if ($fileSize > $this->maxFileSize) {
            $errors[] = sprintf(
                'File "%s" is too large. Maximum size: %s',
                $filename,
                $this->formatBytes($this->maxFileSize)
            );
        }

        if ($fileSize <= 0) {
            $errors[] = sprintf('File "%s" is empty', $filename);
        }

        // Validate MIME type
        if (!in_array($mimeType, $this->allowedTypes, true)) {
            $errors[] = sprintf(
                'File type "%s" is not allowed for file "%s"',
                $mimeType,
                $filename
            );
        }

        // Validate file extension
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!$this->isExtensionAllowed($extension, $mimeType)) {
            $errors[] = sprintf(
                'File extension ".%s" does not match MIME type "%s" for file "%s"',
                $extension,
                $mimeType,
                $filename
            );
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Validate file content using Magic Number detection
     */
    public function validateFileContent(string $filePath, string $expectedMimeType): array
    {
        if (!file_exists($filePath)) {
            return [
                'valid' => false,
                'errors' => ['File does not exist'],
            ];
        }

        $detectedMimeType = $this->detectMimeTypeByMagicNumber($filePath);

        if ($detectedMimeType === null) {
            return [
                'valid' => false,
                'errors' => ['Unable to detect file type. File may be corrupted.'],
            ];
        }

        // Check if detected type matches expected type or is in the same category
        $expectedCategory = explode('/', $expectedMimeType)[0];
        $detectedCategory = explode('/', $detectedMimeType)[0];

        if ($detectedMimeType !== $expectedMimeType && $detectedCategory !== $expectedCategory) {
            return [
                'valid' => false,
                'errors' => [
                    sprintf(
                        'File content does not match declared type. Expected: %s, Detected: %s',
                        $expectedMimeType,
                        $detectedMimeType
                    ),
                ],
            ];
        }

        return [
            'valid' => true,
            'errors' => [],
            'detectedMimeType' => $detectedMimeType,
        ];
    }

    /**
     * Detect MIME type by reading file magic numbers
     */
    private function detectMimeTypeByMagicNumber(string $filePath): ?string
    {
        $handle = fopen($filePath, 'rb');
        if ($handle === false) {
            return null;
        }

        // Read first 32 bytes for magic number detection
        $bytes = fread($handle, 32);
        fclose($handle);

        if ($bytes === false) {
            return null;
        }

        $hexString = bin2hex($bytes);

        foreach (self::MAGIC_NUMBERS as $mimeType => $patterns) {
            foreach ($patterns as $pattern) {
                $offset = $pattern['offset'] * 2; // Convert byte offset to hex offset
                $magicBytes = $pattern['bytes'];
                $length = strlen($magicBytes);

                if (strlen($hexString) >= $offset + $length) {
                    $fileBytes = substr($hexString, $offset, $length);
                    if (strcasecmp($fileBytes, $magicBytes) === 0) {
                        return $mimeType;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Check if file extension matches MIME type
     */
    private function isExtensionAllowed(string $extension, string $mimeType): bool
    {
        $allowedExtensions = [
            'image/jpeg' => ['jpg', 'jpeg', 'jpe'],
            'image/png' => ['png'],
            'image/gif' => ['gif'],
            'image/webp' => ['webp'],
            'video/mp4' => ['mp4', 'm4v'],
            'video/quicktime' => ['mov', 'qt'],
            'video/x-msvideo' => ['avi'],
            'video/mpeg' => ['mpeg', 'mpg', 'mpe'],
        ];

        return isset($allowedExtensions[$mimeType]) &&
               in_array($extension, $allowedExtensions[$mimeType], true);
    }

    /**
     * Format bytes to human-readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $factor = floor((strlen((string) $bytes) - 1) / 3);
        return sprintf('%.2f %s', $bytes / (1024 ** $factor), $units[$factor]);
    }

    public function getAllowedTypes(): array
    {
        return $this->allowedTypes;
    }

    public function getMaxFileSize(): int
    {
        return $this->maxFileSize;
    }

    public function getMaxFiles(): int
    {
        return $this->maxFiles;
    }
}
