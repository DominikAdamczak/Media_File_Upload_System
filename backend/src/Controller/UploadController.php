<?php

namespace App\Controller;

use App\Service\UploadManagerService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/upload')]
class UploadController extends AbstractController
{
    private UploadManagerService $uploadManager;

    public function __construct(UploadManagerService $uploadManager)
    {
        $this->uploadManager = $uploadManager;
    }

    /**
     * Initiate upload
     * POST /api/upload/initiate
     */
    #[Route('/initiate', name: 'upload_initiate', methods: ['POST'])]
    public function initiate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Validate required fields
        $required = ['filename', 'mimeType', 'fileSize', 'md5Hash'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return $this->json([
                    'success' => false,
                    'error' => sprintf('Missing required field: %s', $field),
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        // Extract user ID from headers (if authentication is implemented)
        $userId = $request->headers->get('X-User-Id', null);

        $result = $this->uploadManager->initiateUpload(
            $data['filename'],
            $data['mimeType'],
            (int) $data['fileSize'],
            $data['md5Hash'],
            $userId
        );

        $statusCode = $result['success'] ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST;

        return $this->json($result, $statusCode);
    }

    /**
     * Upload chunk
     * POST /api/upload/chunk
     */
    #[Route('/chunk', name: 'upload_chunk', methods: ['POST'])]
    public function uploadChunk(Request $request): JsonResponse
    {
        $uploadId = $request->request->get('uploadId');
        $chunkIndex = $request->request->get('chunkIndex');
        $chunkFile = $request->files->get('chunk');

        // Validate required fields
        if ($uploadId === null || $chunkIndex === null || $chunkFile === null) {
            return $this->json([
                'success' => false,
                'error' => 'Missing required fields: uploadId, chunkIndex, or chunk file',
            ], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->uploadManager->uploadChunk(
            $uploadId,
            (int) $chunkIndex,
            $chunkFile
        );

        $statusCode = $result['success'] ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST;

        return $this->json($result, $statusCode);
    }

    /**
     * Finalize upload
     * POST /api/upload/finalize
     */
    #[Route('/finalize', name: 'upload_finalize', methods: ['POST'])]
    public function finalize(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['uploadId'])) {
            return $this->json([
                'success' => false,
                'error' => 'Missing required field: uploadId',
            ], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->uploadManager->finalizeUpload($data['uploadId']);

        $statusCode = $result['success'] ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST;

        return $this->json($result, $statusCode);
    }

    /**
     * Get upload status
     * GET /api/upload/status/{uploadId}
     */
    #[Route('/status/{uploadId}', name: 'upload_status', methods: ['GET'])]
    public function status(string $uploadId): JsonResponse
    {
        $status = $this->uploadManager->getUploadStatus($uploadId);

        if ($status === null) {
            return $this->json([
                'success' => false,
                'error' => 'Upload not found',
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'success' => true,
            'data' => $status,
        ]);
    }

    /**
     * Cancel upload
     * POST /api/upload/cancel/{uploadId}
     */
    #[Route('/cancel/{uploadId}', name: 'upload_cancel', methods: ['POST'])]
    public function cancel(string $uploadId): JsonResponse
    {
        $result = $this->uploadManager->cancelUpload($uploadId);

        $statusCode = $result['success'] ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST;

        return $this->json($result, $statusCode);
    }

    /**
     * Get configuration
     * GET /api/upload/config
     */
    #[Route('/config', name: 'upload_config', methods: ['GET'])]
    public function config(): JsonResponse
    {
        return $this->json([
            'success' => true,
            'config' => [
                'maxFileSize' => $this->uploadManager->getMaxParallelUploads(),
                'allowedTypes' => explode(',', $_ENV['UPLOAD_ALLOWED_TYPES'] ?? ''),
                'chunkSize' => (int) ($_ENV['UPLOAD_CHUNK_SIZE'] ?? 1048576),
                'maxFiles' => (int) ($_ENV['UPLOAD_MAX_FILES'] ?? 10),
                'maxParallelUploads' => $this->uploadManager->getMaxParallelUploads(),
            ],
        ]);
    }

    /**
     * Health check
     * GET /api/upload/health
     */
    #[Route('/health', name: 'upload_health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'timestamp' => time(),
        ]);
    }
}
