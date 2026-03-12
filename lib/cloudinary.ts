/**
 * lib/cloudinary.ts
 * Cloudinary integration for media upload, retrieval, and deletion.
 *
 * Supports:
 * - Image uploads (JPG, JPEG, PNG, WEBP) with auto quality & format compression
 * - Video uploads (MP4, MOV) with adaptive quality compression
 * - Automatic thumbnail generation for images and video poster frames
 * - Optimized delivery URLs for images, videos, and streaming
 * - Folder organization by complaint ID
 * - Signed upload URLs for client-side uploads
 *
 * All uploads go to a "samadhan-ai/{complaintId}" folder structure.
 */

import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
let _configured = false;

function ensureConfigured(): void {
  if (_configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      '[CLOUDINARY] Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  _configured = true;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const BASE_FOLDER = 'samadhan-ai';

export type AllowedFileType = 'image' | 'video';

export interface UploadResult {
  success: boolean;
  url?: string;            // Optimized delivery URL
  publicId?: string;
  thumbnailUrl?: string;   // Small preview (image thumb / video poster)
  fileType?: string;       // 'image' | 'video'
  fileSize?: number;       // Original upload bytes
  width?: number;
  height?: number;
  duration?: number;       // seconds, for videos
  streamingUrl?: string;   // Adaptive streaming URL for videos
  posterUrl?: string;      // Full-size video poster frame
  error?: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateFile(
  mimeType: string,
  size: number
): { valid: boolean; fileType?: AllowedFileType; error?: string } {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    if (size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit` };
    }
    return { valid: true, fileType: 'image' };
  }

  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    if (size > MAX_VIDEO_SIZE) {
      return { valid: false, error: `Video size exceeds ${MAX_VIDEO_SIZE / 1024 / 1024}MB limit` };
    }
    return { valid: true, fileType: 'video' };
  }

  return {
    valid: false,
    error: `Unsupported file type: ${mimeType}. Allowed: JPG, PNG, WEBP, MP4, MOV`,
  };
}

// ---------------------------------------------------------------------------
// URL Helpers — generate optimized Cloudinary delivery URLs
// ---------------------------------------------------------------------------

/** Get an optimized image URL with auto quality, format, and optional resize */
export function getOptimizedImageUrl(
  publicId: string,
  opts: { width?: number; height?: number; crop?: string } = {}
): string {
  ensureConfigured();
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'auto',
        ...(opts.width ? { width: opts.width } : {}),
        ...(opts.height ? { height: opts.height } : {}),
        crop: opts.crop || (opts.width || opts.height ? 'limit' : undefined),
      },
    ],
  });
}

/** Get a video streaming URL (mp4 with auto quality, compressed) */
export function getOptimizedVideoUrl(publicId: string): string {
  ensureConfigured();
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    transformation: [
      { quality: 'auto', fetch_format: 'mp4' },
    ],
  });
}

/** Get a video poster frame (jpg snapshot at 0s or mid-point) */
export function getVideoPosterUrl(publicId: string, width = 640): string {
  ensureConfigured();
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    transformation: [
      { width, crop: 'limit', quality: 'auto', start_offset: '0' },
    ],
    format: 'jpg',
  });
}

// ---------------------------------------------------------------------------
// Upload from Buffer
// ---------------------------------------------------------------------------

export async function uploadFile(
  buffer: Buffer,
  options: {
    complaintId: string;
    fileName: string;
    mimeType: string;
    uploadedBy?: string; // "citizen" or admin email
  }
): Promise<UploadResult> {
  ensureConfigured();

  const validation = validateFile(options.mimeType, buffer.length);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const isVideo = validation.fileType === 'video';
  const folder = `${BASE_FOLDER}/${options.complaintId}`;

  const uploadOptions: UploadApiOptions = {
    folder,
    resource_type: isVideo ? 'video' : 'image',
    public_id: `${Date.now()}-${options.fileName.replace(/\.[^.]+$/, '')}`,
    overwrite: false,
    tags: [options.complaintId, options.uploadedBy || 'unknown'],
  };

  if (isVideo) {
    // Video compression: auto quality, mp4 output, limit to 720p
    uploadOptions.eager = [
      { quality: 'auto', fetch_format: 'mp4', width: 1280, height: 720, crop: 'limit' },
    ];
    uploadOptions.eager_async = true;
  } else {
    // Image compression: auto quality & format, limit max dimension to 2048px
    uploadOptions.transformation = [
      { quality: 'auto', fetch_format: 'auto', width: 2048, height: 2048, crop: 'limit' },
    ];
  }

  try {
    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        })
        .end(buffer);
    });

    let thumbnailUrl: string;
    let optimizedUrl: string;
    let streamingUrl: string | undefined;
    let posterUrl: string | undefined;

    if (isVideo) {
      // Video: generate thumbnail poster, optimized streaming URL
      thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        secure: true,
        transformation: [
          { width: 400, crop: 'limit', quality: 'auto', start_offset: '0' },
        ],
        format: 'jpg',
      });

      posterUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        secure: true,
        transformation: [
          { width: 1280, crop: 'limit', quality: 'auto', start_offset: '0' },
        ],
        format: 'jpg',
      });

      // Optimized video URL — auto quality, mp4 format
      optimizedUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        secure: true,
        transformation: [
          { quality: 'auto', fetch_format: 'mp4' },
        ],
      });

      streamingUrl = optimizedUrl;
    } else {
      // Image: responsive thumbnail + optimized full
      thumbnailUrl = cloudinary.url(result.public_id, {
        secure: true,
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
        ],
      });

      optimizedUrl = cloudinary.url(result.public_id, {
        secure: true,
        transformation: [
          { quality: 'auto', fetch_format: 'auto', width: 1600, crop: 'limit' },
        ],
      });
    }

    return {
      success: true,
      url: optimizedUrl,
      publicId: result.public_id,
      thumbnailUrl,
      fileType: isVideo ? 'video' : 'image',
      fileSize: result.bytes,
      width: result.width,
      height: result.height,
      duration: isVideo ? result.duration : undefined,
      streamingUrl,
      posterUrl,
    };
  } catch (err) {
    console.error('[CLOUDINARY] Upload error:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Delete file
// ---------------------------------------------------------------------------

export async function deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<boolean> {
  ensureConfigured();

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch (err) {
    console.error('[CLOUDINARY] Delete error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Delete all files for a complaint
// ---------------------------------------------------------------------------

export async function deleteComplaintFiles(complaintId: string): Promise<boolean> {
  ensureConfigured();

  try {
    await cloudinary.api.delete_resources_by_prefix(`${BASE_FOLDER}/${complaintId}/`, {
      resource_type: 'image',
    });
    await cloudinary.api.delete_resources_by_prefix(`${BASE_FOLDER}/${complaintId}/`, {
      resource_type: 'video',
    });
    return true;
  } catch (err) {
    console.error('[CLOUDINARY] Delete complaint files error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Generate signed upload parameters (for client-side direct uploads)
// ---------------------------------------------------------------------------

export function generateSignedUploadParams(complaintId: string): {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
} {
  ensureConfigured();

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${BASE_FOLDER}/${complaintId}`;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
  };
}
