<?php

namespace App\Tests\Service;

use App\Service\FileValidationService;
use PHPUnit\Framework\TestCase;

class FileValidationServiceTest extends TestCase
{
    private FileValidationService $service;

    protected function setUp(): void
    {
        $this->service = new FileValidationService(
            allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
            maxFileSize: 10485760, // 10MB
            maxFiles: 5
        );
    }

    public function testValidateFileMetadataSuccess(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'test.jpg',
            mimeType: 'image/jpeg',
            fileSize: 1048576, // 1MB
            fileCount: 1
        );

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
    }

    public function testValidateFileMetadataFileTooLarge(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'large.jpg',
            mimeType: 'image/jpeg',
            fileSize: 20971520, // 20MB
            fileCount: 1
        );

        $this->assertFalse($result['valid']);
        $this->assertNotEmpty($result['errors']);
        $this->assertStringContainsString('too large', $result['errors'][0]);
    }

    public function testValidateFileMetadataEmptyFile(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'empty.jpg',
            mimeType: 'image/jpeg',
            fileSize: 0,
            fileCount: 1
        );

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('empty', $result['errors'][0]);
    }

    public function testValidateFileMetadataInvalidMimeType(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            fileSize: 1048576,
            fileCount: 1
        );

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('not allowed', $result['errors'][0]);
    }

    public function testValidateFileMetadataTooManyFiles(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'test.jpg',
            mimeType: 'image/jpeg',
            fileSize: 1048576,
            fileCount: 10
        );

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('Too many files', $result['errors'][0]);
    }

    public function testValidateFileMetadataWrongExtension(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'test.png',
            mimeType: 'image/jpeg',
            fileSize: 1048576,
            fileCount: 1
        );

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('extension', $result['errors'][0]);
    }

    public function testValidateFileContentNonExistentFile(): void
    {
        $result = $this->service->validateFileContent(
            filePath: '/nonexistent/file.jpg',
            expectedMimeType: 'image/jpeg'
        );

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('does not exist', $result['errors'][0]);
    }

    public function testValidateFileContentWithRealJpeg(): void
    {
        // Create a temporary JPEG file with proper magic number
        $tempFile = tempnam(sys_get_temp_dir(), 'test_jpeg_');
        file_put_contents($tempFile, hex2bin('FFD8FFE000104A46494600')); // JPEG magic number

        $result = $this->service->validateFileContent(
            filePath: $tempFile,
            expectedMimeType: 'image/jpeg'
        );

        unlink($tempFile);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals('image/jpeg', $result['detectedMimeType']);
    }

    public function testValidateFileContentWithRealPng(): void
    {
        // Create a temporary PNG file with proper magic number
        $tempFile = tempnam(sys_get_temp_dir(), 'test_png_');
        file_put_contents($tempFile, hex2bin('89504E470D0A1A0A')); // PNG magic number

        $result = $this->service->validateFileContent(
            filePath: $tempFile,
            expectedMimeType: 'image/png'
        );

        unlink($tempFile);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
        $this->assertEquals('image/png', $result['detectedMimeType']);
    }

    public function testValidateFileContentMismatch(): void
    {
        // Create a file with PNG magic number but claim it's video/mp4
        $tempFile = tempnam(sys_get_temp_dir(), 'test_mismatch_');
        file_put_contents($tempFile, hex2bin('89504E470D0A1A0A')); // PNG magic number

        $result = $this->service->validateFileContent(
            filePath: $tempFile,
            expectedMimeType: 'video/mp4'
        );

        unlink($tempFile);

        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('does not match', $result['errors'][0]);
    }

    public function testGetAllowedTypes(): void
    {
        $types = $this->service->getAllowedTypes();
        
        $this->assertIsArray($types);
        $this->assertContains('image/jpeg', $types);
        $this->assertContains('image/png', $types);
        $this->assertContains('video/mp4', $types);
    }

    public function testGetMaxFileSize(): void
    {
        $this->assertEquals(10485760, $this->service->getMaxFileSize());
    }

    public function testGetMaxFiles(): void
    {
        $this->assertEquals(5, $this->service->getMaxFiles());
    }

    public function testValidateMultipleErrors(): void
    {
        $result = $this->service->validateFileMetadata(
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            fileSize: 20971520, // Too large
            fileCount: 10 // Too many
        );

        $this->assertFalse($result['valid']);
        $this->assertGreaterThanOrEqual(3, count($result['errors'])); // At least: too many files, too large, wrong type
    }
}
