/* eslint-disable react-hooks/set-state-in-effect -- image decode loads async and initializes crop state */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImageCropperProps {
  file: File;
  title?: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
}

const VIEWPORT = 288; // on-screen crop box size in px
const OUTPUT = 512; // exported square size in px

/**
 * Instagram-style crop modal: drag to reposition, slider/wheel to zoom,
 * circular guide, exports a square JPEG via canvas. No external deps.
 */
export function ImageCropper({ file, title = "Crop photo", onCancel, onCropped }: ImageCropperProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // "Cover" fit: the smallest scale where the image fills the viewport
  const baseScale = imgSize ? Math.max(VIEWPORT / imgSize.w, VIEWPORT / imgSize.h) : 1;
  const displayScale = baseScale * zoom;
  const maxOffsetX = imgSize ? Math.max(0, (imgSize.w * displayScale - VIEWPORT) / 2) : 0;
  const maxOffsetY = imgSize ? Math.max(0, (imgSize.h * displayScale - VIEWPORT) / 2) : 0;

  const clampOffset = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, next.x)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, next.y)),
    }),
    [maxOffsetX, maxOffsetY],
  );

  function handleImageLoad() {
    const el = imageRef.current;
    if (!el) return;
    setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!imgSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset(
      clampOffset({
        x: drag.baseX + (event.clientX - drag.startX),
        y: drag.baseY + (event.clientY - drag.startY),
      }),
    );
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!imgSize) return;
    event.preventDefault();
    setZoom((current) => {
      const next = Math.min(4, Math.max(1, current - event.deltaY * 0.0015));
      return next;
    });
  }

  // Re-clamp pan when zoom changes so the viewport always stays covered
  useEffect(() => {
    setOffset((current) => clampOffset(current));
  }, [clampOffset]);

  async function exportCrop() {
    const el = imageRef.current;
    if (!el || !imgSize || exporting) return;

    setExporting(true);
    try {
      // Viewport top-left in displayed-image coordinates -> source rect
      const topLeftX = (VIEWPORT - imgSize.w * displayScale) / 2 + offset.x;
      const topLeftY = (VIEWPORT - imgSize.h * displayScale) / 2 + offset.y;
      const sourceX = -topLeftX / displayScale;
      const sourceY = -topLeftY / displayScale;
      const sourceSize = VIEWPORT / displayScale;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(el, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("export failed");
      await onCropped(blob);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="card w-full max-w-sm p-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            Cancel
          </button>
          <p className="text-sm font-black tracking-tight text-[var(--color-ink)]">{title}</p>
          <button
            type="button"
            onClick={exportCrop}
            disabled={!imgSize || exporting}
            className="text-sm font-bold text-[var(--color-ink)] disabled:opacity-50"
          >
            {exporting ? "..." : "Done"}
          </button>
        </div>

        {/* Square crop viewport with circular guide (Instagram-style) */}
        <div
          className="relative mx-auto mt-4 touch-none select-none overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-2)]"
          style={{ width: VIEWPORT, height: VIEWPORT, maxWidth: "100%" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {objectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={objectUrl}
              alt=""
              draggable={false}
              onLoad={handleImageLoad}
              className="max-w-none origin-center"
              style={{
                width: imgSize ? imgSize.w : "auto",
                height: "auto",
                transform: `translate(calc(${VIEWPORT / 2}px - 50% + ${offset.x}px), calc(${VIEWPORT / 2}px - 50% + ${offset.y}px)) scale(${displayScale})`,
                transformOrigin: "center",
              }}
            />
          ) : null}

          {/* Circular guide */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={{ width: VIEWPORT - 16, height: VIEWPORT - 16 }}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-4 flex items-center gap-3 px-2">
          <span aria-hidden="true" className="text-xs text-[var(--color-faint)]">−</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-ink)]"
            aria-label="Zoom"
          />
          <span aria-hidden="true" className="text-xs text-[var(--color-faint)]">+</span>
        </div>

        <p className="mt-3 text-center text-[11px] text-[var(--color-faint)]">Drag to move · pinch/scroll or slider to zoom</p>
      </div>
    </div>
  );
}
