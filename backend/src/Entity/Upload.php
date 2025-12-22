<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity]
#[ORM\Table(name: 'uploads')]
#[ORM\Index(name: 'idx_upload_id', columns: ['upload_id'])]
#[ORM\Index(name: 'idx_status', columns: ['status'])]
#[ORM\Index(name: 'idx_created_at', columns: ['created_at'])]
class Upload
{
    public const STATUS_INITIATED = 'initiated';
    public const STATUS_UPLOADING = 'uploading';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 36, unique: true)]
    private string $uploadId;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $userId = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $originalFilename;

    #[ORM\Column(type: 'string', length: 100)]
    private string $mimeType;

    #[ORM\Column(type: 'bigint')]
    private int $fileSize;

    #[ORM\Column(type: 'string', length: 32)]
    private string $md5Hash;

    #[ORM\Column(type: 'integer')]
    private int $totalChunks;

    #[ORM\Column(type: 'integer')]
    private int $uploadedChunks = 0;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = self::STATUS_INITIATED;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $storagePath = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $errorMessage = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?DateTimeImmutable $completedAt = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $lastChunkAt;

    public function __construct()
    {
        $this->createdAt = new DateTimeImmutable();
        $this->lastChunkAt = new DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUploadId(): string
    {
        return $this->uploadId;
    }

    public function setUploadId(string $uploadId): self
    {
        $this->uploadId = $uploadId;
        return $this;
    }

    public function getUserId(): ?string
    {
        return $this->userId;
    }

    public function setUserId(?string $userId): self
    {
        $this->userId = $userId;
        return $this;
    }

    public function getOriginalFilename(): string
    {
        return $this->originalFilename;
    }

    public function setOriginalFilename(string $originalFilename): self
    {
        $this->originalFilename = $originalFilename;
        return $this;
    }

    public function getMimeType(): string
    {
        return $this->mimeType;
    }

    public function setMimeType(string $mimeType): self
    {
        $this->mimeType = $mimeType;
        return $this;
    }

    public function getFileSize(): int
    {
        return $this->fileSize;
    }

    public function setFileSize(int $fileSize): self
    {
        $this->fileSize = $fileSize;
        return $this;
    }

    public function getMd5Hash(): string
    {
        return $this->md5Hash;
    }

    public function setMd5Hash(string $md5Hash): self
    {
        $this->md5Hash = $md5Hash;
        return $this;
    }

    public function getTotalChunks(): int
    {
        return $this->totalChunks;
    }

    public function setTotalChunks(int $totalChunks): self
    {
        $this->totalChunks = $totalChunks;
        return $this;
    }

    public function getUploadedChunks(): int
    {
        return $this->uploadedChunks;
    }

    public function setUploadedChunks(int $uploadedChunks): self
    {
        $this->uploadedChunks = $uploadedChunks;
        return $this;
    }

    public function incrementUploadedChunks(): self
    {
        $this->uploadedChunks++;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getStoragePath(): ?string
    {
        return $this->storagePath;
    }

    public function setStoragePath(?string $storagePath): self
    {
        $this->storagePath = $storagePath;
        return $this;
    }

    public function getErrorMessage(): ?string
    {
        return $this->errorMessage;
    }

    public function setErrorMessage(?string $errorMessage): self
    {
        $this->errorMessage = $errorMessage;
        return $this;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getCompletedAt(): ?DateTimeImmutable
    {
        return $this->completedAt;
    }

    public function setCompletedAt(?DateTimeImmutable $completedAt): self
    {
        $this->completedAt = $completedAt;
        return $this;
    }

    public function getLastChunkAt(): DateTimeImmutable
    {
        return $this->lastChunkAt;
    }

    public function setLastChunkAt(DateTimeImmutable $lastChunkAt): self
    {
        $this->lastChunkAt = $lastChunkAt;
        return $this;
    }

    public function updateLastChunkAt(): self
    {
        $this->lastChunkAt = new DateTimeImmutable();
        return $this;
    }

    public function getProgressPercentage(): float
    {
        if ($this->totalChunks === 0) {
            return 0.0;
        }
        return round(($this->uploadedChunks / $this->totalChunks) * 100, 2);
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function isFinished(): bool
    {
        return in_array($this->status, [
            self::STATUS_COMPLETED,
            self::STATUS_FAILED,
            self::STATUS_CANCELLED
        ]);
    }
}
