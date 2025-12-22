<?php
/**
 * Test script to demonstrate the chunked upload workflow
 * 
 * Usage: php test_upload.php <path_to_file>
 */

if ($argc < 2) {
    echo "Usage: php test_upload.php <path_to_file>\n";
    exit(1);
}

$filePath = $argv[1];

if (!file_exists($filePath)) {
    echo "Error: File not found: $filePath\n";
    exit(1);
}

$baseUrl = 'http://127.0.0.1:8000/api/upload';
$chunkSize = 1048576; // 1MB

// Step 1: Calculate file metadata
$filename = basename($filePath);
$mimeType = mime_content_type($filePath);
$fileSize = filesize($filePath);
$md5Hash = md5_file($filePath);

echo "File: $filename\n";
echo "MIME Type: $mimeType\n";
echo "Size: $fileSize bytes\n";
echo "MD5: $md5Hash\n\n";

// Step 2: Initiate upload
echo "Step 1: Initiating upload...\n";
$initiateData = [
    'filename' => $filename,
    'mimeType' => $mimeType,
    'fileSize' => $fileSize,
    'md5Hash' => $md5Hash
];

$ch = curl_init("$baseUrl/initiate");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($initiateData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if (!$result['success']) {
    echo "Error initiating upload: " . ($result['error'] ?? 'Unknown error') . "\n";
    exit(1);
}

$uploadId = $result['uploadId'];
$totalChunks = $result['totalChunks'];
$chunkSize = $result['chunkSize'];

echo "Upload ID: $uploadId\n";
echo "Total chunks: $totalChunks\n";
echo "Chunk size: $chunkSize bytes\n\n";

// Step 3: Upload chunks
echo "Step 2: Uploading chunks...\n";
$fileHandle = fopen($filePath, 'rb');

for ($i = 0; $i < $totalChunks; $i++) {
    $chunkData = fread($fileHandle, $chunkSize);
    
    // Create temporary file for chunk
    $tempChunk = tempnam(sys_get_temp_dir(), 'chunk_');
    file_put_contents($tempChunk, $chunkData);
    
    // Upload chunk
    $ch = curl_init("$baseUrl/chunk");
    $postData = [
        'uploadId' => $uploadId,
        'chunkIndex' => $i,
        'chunk' => new CURLFile($tempChunk, 'application/octet-stream', "chunk_$i.bin")
    ];
    
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $result = json_decode($response, true);
    unlink($tempChunk);
    
    if (!$result['success']) {
        echo "Error uploading chunk $i: " . ($result['error'] ?? 'Unknown error') . "\n";
        fclose($fileHandle);
        exit(1);
    }
    
    echo "Uploaded chunk $i/" . ($totalChunks - 1) . " - Progress: {$result['progress']}%\n";
}

fclose($fileHandle);
echo "\n";

// Step 4: Finalize upload
echo "Step 3: Finalizing upload...\n";
$ch = curl_init("$baseUrl/finalize");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['uploadId' => $uploadId]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if (!$result['success']) {
    echo "Error finalizing upload: " . ($result['error'] ?? 'Unknown error') . "\n";
    exit(1);
}

echo "Upload completed successfully!\n";
echo "Storage path: {$result['storagePath']}\n";
