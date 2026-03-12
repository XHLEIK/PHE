'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, Loader2, CheckCircle2 } from 'lucide-react';

export interface UploadedFile {
  fileName: string;
  fileType: string;      // 'image' | 'video'
  fileSize: number;
  url: string;
  publicId: string;
  thumbnailUrl: string;
  streamingUrl?: string;  // Optimized video URL
  posterUrl?: string;     // Video poster frame
}

interface FileUploadProps {
  complaintId?: string;
  maxFiles?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime',
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export default function FileUpload({
  complaintId,
  maxFiles = 5,
  onFilesChange,
  existingFiles = [],
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.name}. Use JPG, PNG, WEBP, MP4, or MOV.`);
      return null;
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      setError(`${file.name} exceeds ${isVideo ? '50MB' : '10MB'} limit.`);
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (complaintId) formData.append('complaintId', complaintId);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!json.success) {
      setError(json.error || `Failed to upload ${file.name}`);
      return null;
    }

    return {
      fileName: json.data.fileName,
      fileType: json.data.fileType,
      fileSize: json.data.fileSize,
      url: json.data.url,
      publicId: json.data.publicId,
      thumbnailUrl: json.data.thumbnailUrl,
      streamingUrl: json.data.streamingUrl || '',
      posterUrl: json.data.posterUrl || '',
    };
  }, [complaintId]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    setError('');

    const remaining = maxFiles - files.length;
    if (remaining <= 0) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const toUpload = Array.from(fileList).slice(0, remaining);
    setUploading(true);

    const uploaded: UploadedFile[] = [];
    for (const f of toUpload) {
      const result = await uploadFile(f);
      if (result) uploaded.push(result);
    }

    if (uploaded.length > 0) {
      const newFiles = [...files, ...uploaded];
      setFiles(newFiles);
      onFilesChange(newFiles);
    }

    setUploading(false);
  }, [files, maxFiles, uploadFile, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-amber-500 bg-amber-50'
            : 'border-slate-200 bg-slate-50/50 hover:border-amber-300 hover:bg-amber-50/30'
        } ${files.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 size={24} className="animate-spin text-amber-700" />
            <p className="text-sm text-slate-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload size={24} className="text-slate-400" />
            <p className="text-sm text-slate-600 font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-slate-400">
              Images (JPG, PNG, WEBP — 10MB) · Videos (MP4, MOV — 50MB) · Max {maxFiles} files
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Uploaded files preview */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((f, i) => (
            <div
              key={f.publicId || i}
              className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                {f.fileType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.thumbnailUrl || f.url}
                    alt={f.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Video size={24} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400">Video</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-[10px] text-slate-600 font-medium truncate">{f.fileName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {f.fileType === 'image' ? (
                    <Image size={10} className="text-slate-400" />
                  ) : (
                    <Video size={10} className="text-slate-400" />
                  )}
                  <span className="text-[10px] text-slate-400">{formatSize(f.fileSize)}</span>
                  <CheckCircle2 size={10} className="text-emerald-500 ml-auto" />
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
