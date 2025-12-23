<?php

namespace App\Tests\Service;

use App\Service\StorageService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class StorageServiceTest extends TestCase
{
    private StorageService $service;
    private string $storagePath;

    protected function setUp(): void
    {
        $this->storagePath = sys_get_temp_dir() . '/test_storage_' . uniqid();
        $this->service = new StorageService(
            storagePath: $this->storagePath,
            retentionDays: 30
        );
    }

    protected function tearDown(): void
    {
        // Clean up test directory
        if (is_dir($this->storagePath)) {
            $this->removeDirectory($this->storagePath);
        }
    }

    public function testStoreFile(): void
    {
        // Create a source file
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test file content');

        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test_file.txt',
            userId: 'user123'
        );

        $this->assertNotEmpty($relativePath);
        $this->assertStringContainsString('user123', $relativePath);
        $this->assertStringContainsString('.txt', $relativePath);
        
        // Verify file was moved (source should not exist)
        $this->assertFileDoesNotExist($sourceFile);
        
        // Verify file exists in storage
        $this->assertTrue($this->service->fileExists($relativePath));
    }

    public function testStoreFileAnonymousUser(): void
    {
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');

        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test.jpg',
            userId: null
        );

        $this->assertStringContainsString('anonymous', $relativePath);
    }

    public function testStoreFileNonExistentSource(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Source file does not exist');

        $this->service->storeFile(
            sourcePath: '/nonexistent/file.txt',
            originalFilename: 'test.txt',
            userId: 'user123'
        );
    }

    public function testStoreFileCreatesDateStructure(): void
    {
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');

        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test.jpg',
            userId: 'user123'
        );

        // Should contain YYYY/MM/DD structure
        $this->assertMatchesRegularExpression('/\d{4}\/\d{2}\/\d{2}/', $relativePath);
    }

    public function testFindDuplicateByMd5NoIndex(): void
    {
        $duplicate = $this->service->findDuplicateByMd5('somehash123');
        $this->assertNull($duplicate);
    }

    public function testFindDuplicateByMd5WithIndex(): void
    {
        // Create a file and register it
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');
        
        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test.txt',
            userId: 'user123'
        );

        $md5Hash = 'test_hash_123';
        $this->service->registerFileInIndex($md5Hash, $relativePath);

        // Find duplicate
        $found = $this->service->findDuplicateByMd5($md5Hash);
        $this->assertEquals($relativePath, $found);
    }

    public function testFindDuplicateByMd5FileDeleted(): void
    {
        // Register a file that doesn't exist
        $md5Hash = 'test_hash_456';
        $fakePath = 'fake/path/file.txt';
        
        $this->service->registerFileInIndex($md5Hash, $fakePath);

        // Should return null because file doesn't exist
        $found = $this->service->findDuplicateByMd5($md5Hash);
        $this->assertNull($found);
    }

    public function testRegisterFileInIndex(): void
    {
        $md5Hash = 'abc123';
        $relativePath = '2023/12/25/user123/file.txt';

        $this->service->registerFileInIndex($md5Hash, $relativePath);

        $indexFile = $this->storagePath . '/md5_index.json';
        $this->assertFileExists($indexFile);

        $index = json_decode(file_get_contents($indexFile), true);
        $this->assertEquals($relativePath, $index[$md5Hash]);
    }

    public function testRegisterMultipleFilesInIndex(): void
    {
        $this->service->registerFileInIndex('hash1', 'path1.txt');
        $this->service->registerFileInIndex('hash2', 'path2.txt');
        $this->service->registerFileInIndex('hash3', 'path3.txt');

        $indexFile = $this->storagePath . '/md5_index.json';
        $index = json_decode(file_get_contents($indexFile), true);

        $this->assertCount(3, $index);
        $this->assertEquals('path1.txt', $index['hash1']);
        $this->assertEquals('path2.txt', $index['hash2']);
        $this->assertEquals('path3.txt', $index['hash3']);
    }

    public function testGetFilePath(): void
    {
        $relativePath = '2023/12/25/user123/file.txt';
        $fullPath = $this->service->getFilePath($relativePath);

        $this->assertEquals($this->storagePath . '/' . $relativePath, $fullPath);
    }

    public function testFileExists(): void
    {
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');

        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test.txt',
            userId: 'user123'
        );

        $this->assertTrue($this->service->fileExists($relativePath));
        $this->assertFalse($this->service->fileExists('nonexistent/path.txt'));
    }

    public function testDeleteFile(): void
    {
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');

        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test.txt',
            userId: 'user123'
        );

        $this->assertTrue($this->service->fileExists($relativePath));
        
        $deleted = $this->service->deleteFile($relativePath);
        $this->assertTrue($deleted);
        $this->assertFalse($this->service->fileExists($relativePath));
    }

    public function testDeleteNonExistentFile(): void
    {
        $deleted = $this->service->deleteFile('nonexistent/file.txt');
        $this->assertFalse($deleted);
    }

    public function testCleanupOldFiles(): void
    {
        // Create an old file
        $oldDir = $this->storagePath . '/2020/01/01/user123';
        mkdir($oldDir, 0755, true);
        $oldFile = $oldDir . '/old_file.txt';
        file_put_contents($oldFile, 'old content');
        
        // Set modification time to 60 days ago
        touch($oldFile, time() - (60 * 24 * 3600));

        // Create a recent file
        $recentDir = $this->storagePath . '/2023/12/25/user123';
        mkdir($recentDir, 0755, true);
        $recentFile = $recentDir . '/recent_file.txt';
        file_put_contents($recentFile, 'recent content');

        $stats = $this->service->cleanupOldFiles();

        $this->assertEquals(2, $stats['scanned']);
        $this->assertEquals(1, $stats['deleted']);
        $this->assertGreaterThan(0, $stats['freed_space']);
        
        $this->assertFileDoesNotExist($oldFile);
        $this->assertFileExists($recentFile);
    }

    public function testGetStorageStats(): void
    {
        // Create some files
        for ($i = 0; $i < 3; $i++) {
            $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
            file_put_contents($sourceFile, str_repeat('x', 1024)); // 1KB each
            
            $this->service->storeFile(
                sourcePath: $sourceFile,
                originalFilename: "file$i.txt",
                userId: 'user123'
            );
        }

        $stats = $this->service->getStorageStats();

        $this->assertEquals(3, $stats['total_files']);
        $this->assertGreaterThanOrEqual(3072, $stats['total_size']); // At least 3KB
        $this->assertEquals($this->storagePath, $stats['storage_path']);
        $this->assertArrayHasKey('total_size_formatted', $stats);
    }

    public function testGetStoragePath(): void
    {
        $this->assertEquals($this->storagePath, $this->service->getStoragePath());
    }

    public function testGetRetentionDays(): void
    {
        $this->assertEquals(30, $this->service->getRetentionDays());
    }

    public function testSanitizeFilenameInStoreFile(): void
    {
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');

        // Filename with special characters
        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: 'test file!@#$%^&*().txt',
            userId: 'user123'
        );

        // Should not contain special characters (replaced with underscores)
        $filename = basename($relativePath);
        $this->assertDoesNotMatchRegularExpression('/[!@#$%^&*()]/', $filename);
    }

    public function testStoreFileLongFilename(): void
    {
        $sourceFile = tempnam(sys_get_temp_dir(), 'source_');
        file_put_contents($sourceFile, 'test content');

        // Very long filename
        $longName = str_repeat('a', 200) . '.txt';
        
        $relativePath = $this->service->storeFile(
            sourcePath: $sourceFile,
            originalFilename: $longName,
            userId: 'user123'
        );

        $this->assertNotEmpty($relativePath);
        $this->assertTrue($this->service->fileExists($relativePath));
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
