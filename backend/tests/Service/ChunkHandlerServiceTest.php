<?php

namespace App\Tests\Service;

use App\Service\ChunkHandlerService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use RuntimeException;

class ChunkHandlerServiceTest extends TestCase
{
    private ChunkHandlerService $service;
    private string $tempPath;

    protected function setUp(): void
    {
        $this->tempPath = sys_get_temp_dir() . '/test_chunks_' . uniqid();
        $this->service = new ChunkHandlerService(
            tempPath: $this->tempPath,
            chunkSize: 1048576, // 1MB
            chunkTimeout: 1800 // 30 minutes
        );
    }

    protected function tearDown(): void
    {
        // Clean up test directory
        if (is_dir($this->tempPath)) {
            $this->removeDirectory($this->tempPath);
        }
    }

    public function testSaveChunk(): void
    {
        $uploadId = 'test_upload_' . uniqid();
        $chunkIndex = 0;
        
        // Create a temporary file to simulate uploaded chunk
        $tempFile = tempnam(sys_get_temp_dir(), 'chunk_');
        file_put_contents($tempFile, 'test chunk data');
        
        $uploadedFile = new UploadedFile(
            $tempFile,
            'chunk.bin',
            'application/octet-stream',
            null,
            true
        );

        $chunkPath = $this->service->saveChunk($uploadId, $chunkIndex, $uploadedFile);

        $this->assertFileExists($chunkPath);
        $this->assertEquals('test chunk data', file_get_contents($chunkPath));
    }

    public function testChunkExists(): void
    {
        $uploadId = 'test_upload_' . uniqid();
        $chunkIndex = 0;

        $this->assertFalse($this->service->chunkExists($uploadId, $chunkIndex));

        // Create chunk
        $tempFile = tempnam(sys_get_temp_dir(), 'chunk_');
        file_put_contents($tempFile, 'test data');
        
        $uploadedFile = new UploadedFile(
            $tempFile,
            'chunk.bin',
            'application/octet-stream',
            null,
            true
        );

        $this->service->saveChunk($uploadId, $chunkIndex, $uploadedFile);

        $this->assertTrue($this->service->chunkExists($uploadId, $chunkIndex));
    }

    public function testGetUploadedChunks(): void
    {
        $uploadId = 'test_upload_' . uniqid();

        // Initially no chunks
        $chunks = $this->service->getUploadedChunks($uploadId);
        $this->assertEmpty($chunks);

        // Save multiple chunks
        for ($i = 0; $i < 3; $i++) {
            $tempFile = tempnam(sys_get_temp_dir(), 'chunk_');
            file_put_contents($tempFile, "chunk $i data");
            
            $uploadedFile = new UploadedFile(
                $tempFile,
                'chunk.bin',
                'application/octet-stream',
                null,
                true
            );

            $this->service->saveChunk($uploadId, $i, $uploadedFile);
        }

        $chunks = $this->service->getUploadedChunks($uploadId);
        $this->assertCount(3, $chunks);
        $this->assertContains(0, $chunks);
        $this->assertContains(1, $chunks);
        $this->assertContains(2, $chunks);
    }

    public function testReassembleChunks(): void
    {
        $uploadId = 'test_upload_' . uniqid();
        $totalChunks = 3;

        // Create chunks
        for ($i = 0; $i < $totalChunks; $i++) {
            $tempFile = tempnam(sys_get_temp_dir(), 'chunk_');
            file_put_contents($tempFile, "Part$i");
            
            $uploadedFile = new UploadedFile(
                $tempFile,
                'chunk.bin',
                'application/octet-stream',
                null,
                true
            );

            $this->service->saveChunk($uploadId, $i, $uploadedFile);
        }

        // Reassemble
        $outputPath = $this->tempPath . '/output.bin';
        $result = $this->service->reassembleChunks($uploadId, $totalChunks, $outputPath);

        $this->assertTrue($result);
        $this->assertFileExists($outputPath);
        $this->assertEquals('Part0Part1Part2', file_get_contents($outputPath));
    }

    public function testReassembleChunksMissingChunk(): void
    {
        $uploadId = 'test_upload_' . uniqid();
        $totalChunks = 3;

        // Create only 2 chunks (missing chunk 1)
        for ($i = 0; $i < $totalChunks; $i++) {
            if ($i === 1) continue; // Skip chunk 1
            
            $tempFile = tempnam(sys_get_temp_dir(), 'chunk_');
            file_put_contents($tempFile, "Part$i");
            
            $uploadedFile = new UploadedFile(
                $tempFile,
                'chunk.bin',
                'application/octet-stream',
                null,
                true
            );

            $this->service->saveChunk($uploadId, $i, $uploadedFile);
        }

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Chunk 1 is missing');

        $outputPath = $this->tempPath . '/output.bin';
        $this->service->reassembleChunks($uploadId, $totalChunks, $outputPath);
    }

    public function testVerifyFileIntegrity(): void
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'test_');
        $content = 'test file content';
        file_put_contents($tempFile, $content);
        
        $expectedMd5 = md5($content);

        $this->assertTrue($this->service->verifyFileIntegrity($tempFile, $expectedMd5));
        $this->assertFalse($this->service->verifyFileIntegrity($tempFile, 'wrong_hash'));

        unlink($tempFile);
    }

    public function testVerifyFileIntegrityNonExistentFile(): void
    {
        $this->assertFalse($this->service->verifyFileIntegrity('/nonexistent/file.txt', 'any_hash'));
    }

    public function testCalculateMd5(): void
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'test_');
        $content = 'test file content';
        file_put_contents($tempFile, $content);
        
        $expectedMd5 = md5($content);
        $actualMd5 = $this->service->calculateMd5($tempFile);

        $this->assertEquals($expectedMd5, $actualMd5);

        unlink($tempFile);
    }

    public function testCalculateMd5NonExistentFile(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('File does not exist');

        $this->service->calculateMd5('/nonexistent/file.txt');
    }

    public function testCleanupChunks(): void
    {
        $uploadId = 'test_upload_' . uniqid();

        // Create chunks
        $tempFile = tempnam(sys_get_temp_dir(), 'chunk_');
        file_put_contents($tempFile, 'test data');
        
        $uploadedFile = new UploadedFile(
            $tempFile,
            'chunk.bin',
            'application/octet-stream',
            null,
            true
        );

        $this->service->saveChunk($uploadId, 0, $uploadedFile);

        $this->assertTrue($this->service->chunkExists($uploadId, 0));

        // Cleanup
        $this->service->cleanupChunks($uploadId);

        $this->assertFalse($this->service->chunkExists($uploadId, 0));
    }

    public function testCleanupExpiredChunks(): void
    {
        // Create an old upload directory
        $oldUploadId = 'test_upload_old';
        $oldDir = $this->tempPath . '/upload_' . $oldUploadId;
        mkdir($oldDir, 0755, true);
        
        // Create a file in it
        file_put_contents($oldDir . '/chunk_0.bin', 'old data');
        
        // Set modification time to 2 hours ago (older than 30 min timeout)
        touch($oldDir, time() - 7200);

        // Create a recent upload directory
        $recentUploadId = 'test_upload_recent';
        $recentDir = $this->tempPath . '/upload_' . $recentUploadId;
        mkdir($recentDir, 0755, true);
        file_put_contents($recentDir . '/chunk_0.bin', 'recent data');

        $cleanedCount = $this->service->cleanupExpiredChunks();

        $this->assertEquals(1, $cleanedCount);
        $this->assertDirectoryDoesNotExist($oldDir);
        $this->assertDirectoryExists($recentDir);
    }

    public function testGetChunkSize(): void
    {
        $this->assertEquals(1048576, $this->service->getChunkSize());
    }

    public function testGetChunkTimeout(): void
    {
        $this->assertEquals(1800, $this->service->getChunkTimeout());
    }

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
}
