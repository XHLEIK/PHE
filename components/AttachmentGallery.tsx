'use client';

import React, { useState, useCallback } from 'react';
import {
  X, Download, ZoomIn, Play, Paperclip,
  ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AttachmentItem {
  fileName: string;
  fileType: string;        // 'image' | 'video'
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  storageKey?: string;     // Cloudinary publicId (from model)
  publicId?: string;       // Cloudinary publicId (from validation)
  streamingUrl?: string;   // Optimized video URL
  posterUrl?: string;      // Video poster frame
}

interface AttachmentGalleryProps {
  attachments: AttachmentItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isVideo = (att: AttachmentItem) =>
  att.fileType === 'video' ||
  att.fileType.startsWith('video/') ||
  att.url?.match(/\.(mp4|mov|webm)(\?|$)/i);

const formatSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ---------------------------------------------------------------------------
// Lightbox component (image zoom / video player)
// ---------------------------------------------------------------------------
function Lightbox({
  attachments,
  initialIndex,
  onClose,
}: {
  attachments: AttachmentItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const att = attachments[idx];
  const video = isVideo(att);
  const total = attachments.length;

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  // Keyboard navigation
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Content container — stop propagation so clicking media doesn't close */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              aria-label="Previous"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
              aria-label="Next"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Media */}
        {video ? (
          <video
            key={att.url}
            src={att.streamingUrl || att.url}
            poster={att.posterUrl || att.thumbnailUrl || undefined}
            controls
            autoPlay
            className="max-w-[85vw] max-h-[80vh] rounded-lg shadow-2xl bg-black"
            controlsList="nodownload"
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={att.url}
            src={att.url}
            alt={att.fileName}
            className="max-w-[85vw] max-h-[80vh] rounded-lg shadow-2xl object-contain bg-black"
          />
        )}

        {/* Bottom info bar */}
        <div className="mt-3 flex items-center gap-4 text-white/80 text-sm">
          <span className="font-medium truncate max-w-[300px]">{att.fileName}</span>
          {att.fileSize > 0 && <span className="text-white/50">{formatSize(att.fileSize)}</span>}
          {total > 1 && (
            <span className="text-white/50">
              {idx + 1} / {total}
            </span>
          )}
          <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-white/60 hover:text-white transition-colors"
          >
            <Download size={14} /> Open original
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Gallery Grid
// ---------------------------------------------------------------------------
export default function AttachmentGallery({ attachments }: AttachmentGalleryProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      {/* Section header */}
      <div className="mb-3">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
          <Paperclip size={11} />
          Attachments ({attachments.length})
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {attachments.map((att, i) => {
          const video = isVideo(att);
          const thumb = att.thumbnailUrl || att.posterUrl || (video ? '' : att.url);

          return (
            <button
              key={att.url || i}
              type="button"
              onClick={() => setLightboxIdx(i)}
              className="group relative block rounded-xl border border-slate-200 bg-slate-50 overflow-hidden hover:border-amber-300 hover:shadow-lg transition-all text-left focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
            >
              {/* Thumbnail area */}
              {video ? (
                <div className="aspect-video relative bg-slate-900 flex items-center justify-center overflow-hidden">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={att.fileName}
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
                      <Play size={20} className="text-slate-800 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  {/* Video badge */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-semibold rounded uppercase tracking-wider">
                    Video
                  </span>
                </div>
              ) : (
                <div className="aspect-video relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={att.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Zoom overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                  </div>
                </div>
              )}

              {/* Info bar */}
              <div className="px-2.5 py-1.5">
                <p className="text-[10px] text-slate-600 font-medium truncate">{att.fileName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-slate-400">{formatSize(att.fileSize)}</span>
                  <Maximize2 size={8} className="text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          attachments={attachments}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}
