"use client";

import * as React from "react";

type HolidayFlyerProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  seePriceLabel: string;
  openLabel: string;
  tapLabel: string;
  closeLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetLabel: string;
  hintLabel: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function HolidayFlyer({
  src,
  alt,
  width,
  height,
  seePriceLabel,
  openLabel,
  tapLabel,
  closeLabel,
  zoomInLabel,
  zoomOutLabel,
  resetLabel,
  hintLabel,
}: HolidayFlyerProps) {
  const [open, setOpen] = React.useState(false);
  const closeLightbox = React.useCallback(() => setOpen(false), []);

  const scrollToPrice = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("unit-price");
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section id="holiday-flyer" className="mb-3 scroll-mt-3" data-holiday-flyer="true">
        <div className="overflow-hidden rounded-[28px] border border-[#1A3348] bg-[#0B1C2E] shadow-[0_18px_44px_rgba(11,28,46,0.18)]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative block w-full cursor-zoom-in bg-[#0B1C2E]"
          >
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              data-flyer-src={src}
              className="mx-auto block h-auto max-h-[min(40dvh,440px)] w-full object-contain"
            />
            <span className="sr-only">{openLabel}</span>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-[#0B1C2E]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F2E5BE] shadow-sm backdrop-blur-sm">
              {tapLabel}
            </span>
          </button>
          <a
            href="#unit-price"
            data-see-price="true"
            onClick={scrollToPrice}
            className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-[#0B1C2E] px-4 py-2.5 text-[13px] font-semibold tracking-tight text-[#F2E5BE] transition hover:bg-[#10283A] hover:text-white"
          >
            {seePriceLabel}
          </a>
        </div>
      </section>
      {open && (
        <FlyerLightbox
          src={src}
          alt={alt}
          width={width}
          height={height}
          closeLabel={closeLabel}
          zoomInLabel={zoomInLabel}
          zoomOutLabel={zoomOutLabel}
          resetLabel={resetLabel}
          hintLabel={hintLabel}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

function FlyerLightbox({
  src,
  alt,
  width,
  height,
  closeLabel,
  zoomInLabel,
  zoomOutLabel,
  resetLabel,
  hintLabel,
  onClose,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  closeLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetLabel: string;
  hintLabel: string;
  onClose: () => void;
}) {
  const [scale, setScale] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const stageRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ dist: number; scale: number } | null>(null);
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const moved = React.useRef(0);
  const lastTap = React.useRef(0);
  const scaleRef = React.useRef(1);

  React.useEffect(() => {
    scaleRef.current = scale;
    if (scale <= 1) setPan({ x: 0, y: 0 });
  }, [scale]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") setScale((s) => clamp(s * 1.25, 1, 5));
      if (event.key === "-" || event.key === "_") setScale((s) => clamp(s / 1.25, 1, 5));
      if (event.key === "0") setScale(1);
      if (event.key === "Tab" && dialogRef.current) {
        const list = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button")];
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((s) => clamp(s * (event.deltaY < 0 ? 1.12 : 0.89), 1, 5));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const pointDistance = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    moved.current = 0;
    if (pointers.current.size === 2) {
      pinch.current = { dist: pointDistance(), scale: scaleRef.current };
      drag.current = null;
      return;
    }
    drag.current = { x: event.clientX, y: event.clientY, ox: pan.x, oy: pan.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const prev = pointers.current.get(event.pointerId)!;
    moved.current += Math.hypot(event.clientX - prev.x, event.clientY - prev.y);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const dist = pointDistance();
      if (pinch.current.dist > 0) {
        setScale(clamp(pinch.current.scale * (dist / pinch.current.dist), 1, 5));
      }
      return;
    }

    if (scaleRef.current > 1 && drag.current) {
      setPan({
        x: drag.current.ox + (event.clientX - drag.current.x),
        y: drag.current.oy + (event.clientY - drag.current.y),
      });
    }
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  const onStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (moved.current > 8) return;
    if (event.target === event.currentTarget) onClose();
  };

  const onImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    if (moved.current > 8) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      setScale((s) => (s > 1.05 ? 1 : 2.5));
    }
    lastTap.current = now;
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-flyer-lightbox="true"
      className="fixed inset-0 z-[80]"
      style={{ backgroundColor: "rgba(6, 16, 24, 0.96)" }}
    >
      <div
        ref={stageRef}
        className="absolute inset-0 flex cursor-zoom-out items-center justify-center overflow-hidden touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onClick={onStageClick}
      >
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          draggable={false}
          onClick={onImageClick}
          className="max-h-[100dvh] max-w-[100vw] select-none object-contain will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
        <p className="pointer-events-none max-w-[70%] rounded-full bg-black/45 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#F2E5BE]">
          {scale > 1.05 ? `${Math.round(scale * 100)}%` : hintLabel}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="pointer-events-auto rounded-full border border-white/20 bg-[#0B1C2E] px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white shadow-lg"
        >
          {closeLabel}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-label={zoomOutLabel}
          onClick={() => setScale((s) => clamp(s / 1.25, 1, 5))}
          className="pointer-events-auto h-11 min-w-11 rounded-full border border-white/20 bg-[#0B1C2E] px-4 text-lg font-semibold text-white shadow-lg"
        >
          −
        </button>
        <button
          type="button"
          aria-label={resetLabel}
          onClick={() => setScale(1)}
          className="pointer-events-auto h-11 rounded-full border border-[#C5A572]/50 bg-[#0B1C2E] px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#F2E5BE] shadow-lg"
        >
          {resetLabel}
        </button>
        <button
          type="button"
          aria-label={zoomInLabel}
          onClick={() => setScale((s) => clamp(s * 1.25, 1, 5))}
          className="pointer-events-auto h-11 min-w-11 rounded-full border border-white/20 bg-[#0B1C2E] px-4 text-lg font-semibold text-white shadow-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}
