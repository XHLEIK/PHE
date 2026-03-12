/**
 * POST /api/upload
 * Upload media files to Cloudinary.
 *
 * Body: multipart/form-data with:
 *   - file: File (image or video)
 *   - complaintId: string (optional — required for attaching to complaint)
 *
 * Returns: { success, data: { url, publicId, thumbnailUrl, fileType, fileSize, fileName } }
 *
 * Auth: Optional. If admin token present, stores admin email. If citizen token present, stores citizen email.
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getClientIp, checkRateLimit } from '@/lib/api-utils';
import { validateFile, uploadFile } from '@/lib/cloudinary';
import { verifyAccessToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30s timeout for uploads

// Max payload size for the upload route (includes multipart overhead)
const MAX_IMAGE_UPLOAD = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_UPLOAD = 50 * 1024 * 1024;  // 50 MB
const MAX_UPLOAD_SIZE  = MAX_VIDEO_UPLOAD;   // use the higher limit for Content-Length check

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const correlationId = uuidv4();

    // In-memory rate limit: 10 uploads per minute
    const rl = checkRateLimit(`upload:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return errorResponse('Upload rate limit exceeded. Try again later.', 429);
    }

    // Check Content-Length header early to reject oversized payloads
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength > MAX_UPLOAD_SIZE + 1024) { // +1KB for multipart boundaries
      return errorResponse(`File too large. Maximum size is ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB.`, 413);
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr) {
      console.error('[UPLOAD] FormData parse error:', parseErr);
      return errorResponse('Failed to parse upload. The file may be too large or the request was malformed.', 400);
    }

    const file = formData.get('file') as File | null;
    const complaintId = formData.get('complaintId') as string | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Enforce size limits based on file type
    const isVideo = file.type.startsWith('video/');
    const sizeLimit = isVideo ? MAX_VIDEO_UPLOAD : MAX_IMAGE_UPLOAD;
    if (file.size > sizeLimit) {
      return errorResponse(`File too large. Maximum size is ${sizeLimit / (1024 * 1024)} MB for ${isVideo ? 'videos' : 'images'}.`, 413);
    }

    // Validate file type and size
    const validation = validateFile(file.type, file.size);
    if (!validation.valid) {
      return errorResponse(validation.error || 'Invalid file', 400);
    }

    // Determine uploader identity
    let uploadedBy = 'anonymous';

    // Check admin token first
    const adminToken = req.cookies.get('access_token')?.value;
    if (adminToken) {
      const payload = verifyAccessToken(adminToken);
      if (payload) uploadedBy = payload.email;
    }

    // Check citizen token
    if (uploadedBy === 'anonymous') {
      const citizenToken = req.cookies.get('citizen_access_token')?.value;
      if (citizenToken) {
        const payload = verifyAccessToken(citizenToken);
        if (payload) uploadedBy = payload.email;
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const result = await uploadFile(buffer, {
      complaintId: complaintId || `temp-${correlationId}`,
      fileName: file.name,
      mimeType: file.type,
      uploadedBy,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Upload failed', 500);
    }

    return successResponse({
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: result.thumbnailUrl,
      fileType: result.fileType,
      fileSize: result.fileSize,
      fileName: file.name,
      width: result.width,
      height: result.height,
      duration: result.duration,
      streamingUrl: result.streamingUrl,
      posterUrl: result.posterUrl,
    }, undefined, 201);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[UPLOAD ERROR]', message, err);
    return errorResponse(
      message.includes('body')
        ? 'Upload failed — the file may be too large or the connection was interrupted.'
        : 'Upload failed. Please try again.',
      500
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
