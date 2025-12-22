<?php

namespace App\Service;

use App\Entity\Upload;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use RuntimeException;
use DateTimeImmutable;

class UploadManagerService
{
    private EntityManagerInterface $entityManager;
    private FileValidationService $validationService;
    private ChunkHandlerService $chunkHandler;
    private StorageService $storageService;
    private int $maxParallelUploads;

    public function __construct(
        EntityManagerInterface $entityManager,
        FileValidationService $validationService,
        ChunkHandlerService $chunkHandler,
        StorageService $storageService,
        int $maxParallelUploads
    ) {
        $this->entityManager = $entityManager;
        $this->validationService = $validationService;
        $this->chunkHandler = $chunkHandler;
        $this->storageService = $storageService;
        $this->maxParallelUploads = $maxParallelUploads;
    }

    /**
     * Initiate a new upload
     */
    public function initiateUpload(
        string $filename,
        string $mimeType,
        int $fileSize,
        string $md5Hash,
        ?string $userId = null
    ): array {
        // Validate file metadata
        $validation = $this->validationService->validateFileMetadata(
            $filename,
            $mimeType,
            $fileSize
        );

        if (!$validation['valid']) {
            return [
                'success' => false,
                'errors' => $validation['errors'],
            ];
        }

        // Check for duplicate file (deduplication)
        $existingFile = $this->storageService->findDuplicateByMd5($md5Hash);
        if ($existingFile !== null) {
            return [
                'success' => true,
                'duplicate' => true,
                'message' => 'File already exists',
                'storagePath' => $existingFile,
            ];
        }

        // Calculate total chunks
        $chunkSize = $this->chunkHandler->getChunkSize();
        $totalChunks = (int) ceil($fileSize / $chunkSize);

        // Create upload entity
        $upload = new Upload();
        $upload->setUploadId($this->generateUploadId());
        $upload->setUserId($userId);
        $upload->setOriginalFilename($filename);
        $upload->setMimeType($mimeType);
        $upload->setFileSize($fileSize);
        $upload->setMd5Hash($md5Hash);
        $upload->setTotalChunks($totalChunks);
        $upload->setStatus(Upload::STATUS_INITIATED);

        $this->entityManager->persist($upload);
        $this->entityManager->flush();

        return [
            'success' => true,
            'uploadId' => $upload->getUploadId(),
            'totalChunks' => $totalChunks,
            'chunkSize' => $chunkSize,
        ];
    }

    /**
     * Process chunk upload
     */
    public function uploadChunk(
        string $uploadId,
        int $chunkIndex,
        UploadedFile $chunkFile
    ): array {
        // Find upload
        $upload = $this->findUploadByUploadId($uploadId);
        
        if ($upload === null) {
            return [
                'success' => false,
                'error' => 'Upload not found',
            ];
        }

        if ($upload->isFinished()) {
            return [
                'success' => false,
                'error' => sprintf('Upload is already %s', $upload->getStatus()),
            ];
        }

        // Validate chunk index
        if ($chunkIndex < 0 || $chunkIndex >= $upload->getTotalChunks()) {
            return [
                'success' => false,
                'error' => 'Invalid chunk index',
            ];
        }

        // Check if chunk already uploaded
        if ($this->chunkHandler->chunkExists($uploadId, $chunkIndex)) {
            return [
                'success' => true,
                'message' => 'Chunk already uploaded',
                'chunkIndex' => $chunkIndex,
            ];
        }

        try {
            // Save chunk
            $this->chunkHandler->saveChunk($uploadId, $chunkIndex, $chunkFile);

            // Update upload status
            $upload->incrementUploadedChunks();
            $upload->updateLastChunkAt();
            
            if ($upload->getStatus() === Upload::STATUS_INITIATED) {
                $upload->setStatus(Upload::STATUS_UPLOADING);
            }

            $this->entityManager->flush();

            return [
                'success' => true,
                'chunkIndex' => $chunkIndex,
                'uploadedChunks' => $upload->getUploadedChunks(),
                'totalChunks' => $upload->getTotalChunks(),
                'progress' => $upload->getProgressPercentage(),
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to save chunk: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Finalize upload (reassemble chunks)
     */
    public function finalizeUpload(string $uploadId): array
    {
        $upload = $this->findUploadByUploadId($uploadId);
        
        if ($upload === null) {
            return [
                'success' => false,
                'error' => 'Upload not found',
            ];
        }

        if ($upload->isCompleted()) {
            return [
                'success' => true,
                'message' => 'Upload already completed',
                'storagePath' => $upload->getStoragePath(),
            ];
        }

        if ($upload->getUploadedChunks() < $upload->getTotalChunks()) {
            return [
                'success' => false,
                'error' => sprintf(
                    'Not all chunks uploaded. Expected: %d, Got: %d',
                    $upload->getTotalChunks(),
                    $upload->getUploadedChunks()
                ),
            ];
        }

        try {
            // Create temporary file for reassembly
            $tempFile = tempnam(sys_get_temp_dir(), 'upload_');
            
            // Reassemble chunks
            $this->chunkHandler->reassembleChunks(
                $uploadId,
                $upload->getTotalChunks(),
                $tempFile
            );

            // Verify file integrity
            if (!$this->chunkHandler->verifyFileIntegrity($tempFile, $upload->getMd5Hash())) {
                unlink($tempFile);
                throw new RuntimeException('File integrity check failed');
            }

            // Validate file content (magic number detection)
            $contentValidation = $this->validationService->validateFileContent(
                $tempFile,
                $upload->getMimeType()
            );

            if (!$contentValidation['valid']) {
                unlink($tempFile);
                throw new RuntimeException(
                    'File validation failed: ' . implode(', ', $contentValidation['errors'])
                );
            }

            // Store file
            $storagePath = $this->storageService->storeFile(
                $tempFile,
                $upload->getOriginalFilename(),
                $upload->getUserId()
            );

            // Register in MD5 index
            $this->storageService->registerFileInIndex(
                $upload->getMd5Hash(),
                $storagePath
            );

            // Update upload entity
            $upload->setStoragePath($storagePath);
            $upload->setStatus(Upload::STATUS_COMPLETED);
            $upload->setCompletedAt(new DateTimeImmutable());

            $this->entityManager->flush();

            // Clean up chunks
            $this->chunkHandler->cleanupChunks($uploadId);

            return [
                'success' => true,
                'message' => 'Upload completed successfully',
                'storagePath' => $storagePath,
                'uploadId' => $uploadId,
            ];

        } catch (\Exception $e) {
            $upload->setStatus(Upload::STATUS_FAILED);
            $upload->setErrorMessage($e->getMessage());
            $this->entityManager->flush();

            return [
                'success' => false,
                'error' => 'Failed to finalize upload: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get upload status
     */
    public function getUploadStatus(string $uploadId): ?array
    {
        $upload = $this->findUploadByUploadId($uploadId);
        
        if ($upload === null) {
            return null;
        }

        return [
            'uploadId' => $upload->getUploadId(),
            'status' => $upload->getStatus(),
            'filename' => $upload->getOriginalFilename(),
            'mimeType' => $upload->getMimeType(),
            'fileSize' => $upload->getFileSize(),
            'totalChunks' => $upload->getTotalChunks(),
            'uploadedChunks' => $upload->getUploadedChunks(),
            'progress' => $upload->getProgressPercentage(),
            'storagePath' => $upload->getStoragePath(),
            'errorMessage' => $upload->getErrorMessage(),
            'createdAt' => $upload->getCreatedAt()->format('c'),
            'completedAt' => $upload->getCompletedAt()?->format('c'),
        ];
    }

    /**
     * Cancel upload
     */
    public function cancelUpload(string $uploadId): array
    {
        $upload = $this->findUploadByUploadId($uploadId);
        
        if ($upload === null) {
            return [
                'success' => false,
                'error' => 'Upload not found',
            ];
        }

        if ($upload->isFinished()) {
            return [
                'success' => false,
                'error' => sprintf('Upload is already %s', $upload->getStatus()),
            ];
        }

        $upload->setStatus(Upload::STATUS_CANCELLED);
        $this->entityManager->flush();

        // Clean up chunks
        $this->chunkHandler->cleanupChunks($uploadId);

        return [
            'success' => true,
            'message' => 'Upload cancelled',
        ];
    }

    /**
     * Find upload by upload ID
     */
    private function findUploadByUploadId(string $uploadId): ?Upload
    {
        return $this->entityManager
            ->getRepository(Upload::class)
            ->findOneBy(['uploadId' => $uploadId]);
    }

    /**
     * Generate unique upload ID
     */
    private function generateUploadId(): string
    {
        return sprintf(
            '%s-%s',
            date('YmdHis'),
            bin2hex(random_bytes(8))
        );
    }

    /**
     * Get active uploads count for concurrency control
     */
    public function getActiveUploadsCount(?string $userId = null): int
    {
        $qb = $this->entityManager
            ->getRepository(Upload::class)
            ->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('u.status IN (:statuses)')
            ->setParameter('statuses', [Upload::STATUS_INITIATED, Upload::STATUS_UPLOADING]);

        if ($userId !== null) {
            $qb->andWhere('u.userId = :userId')
               ->setParameter('userId', $userId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function getMaxParallelUploads(): int
    {
        return $this->maxParallelUploads;
    }
}
