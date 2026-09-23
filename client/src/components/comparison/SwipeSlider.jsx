import { useEffect, useRef, useState } from "react";
import SatImg from "@/components/common/SatImg";
import { cn } from "@/lib/utils";

/**
 * SWIPE mode (DESIGN.md 7.2): hardware clip-path reveal, pointer-captured for a
 * buttery 1:1 drag with a settled ease-out when released. Both epochs are always
 * mounted — Epoch 1 (TCI) beneath, Epoch 2 (heatmap) clipped on top.
 */
export default function SwipeSlider({ beforeUrl, afterUrl, beforeLabel, afterLabel, loading, frameClassName = "h-[54vh] min-h-[340px]" }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (beforeUrl && afterUrl) setPos(50);
  }, [beforeUrl, afterUrl]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const clamp = (n) => Math.min(99, Math.max(1, n));
    const pressed = { current: false };
    const move = (clientX) => {
      const r = wrap.getBoundingClientRect();
      setPos(clamp(((clientX - r.left) / r.width) * 100));
    };

    const onDown = (e) => {
      e.preventDefault();
      pressed.current = true;
      setDragging(true);
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture unsupported (throw-safe) */
      }
      move(e.clientX);
    };
    const onMove = (e) => {
      if (!pressed.current) return;
      e.preventDefault();
      move(e.clientX);
    };
    const onUp = () => {
      pressed.current = false;
      setDragging(false);
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    return () => {
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      data-testid="frame"
      className={cn("relative w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-[4px] border border-line bg-recessed", frameClassName)}
    >
      {/* Epoch 2 heatmap — full frame */}
      <SatImg key={afterUrl} src={afterUrl} alt={afterLabel} />

      {/* Epoch 1 TCI — clipped from the divider to the left */}
      <div
        data-testid="beforeLayer"
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - pos}% 0 0)`,
          transition: dragging ? "none" : "clip-path 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <SatImg key={beforeUrl} src={beforeUrl} alt={beforeLabel} />
      </div>

      {loading && !beforeUrl && !afterUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas/70">
          <span className="font-script text-lg text-slate-100">receiving raster feed…</span>
        </div>
      )}

      {/* Divider rule + handle (no percentage) */}
      <div
        data-testid="divider"
        className="pointer-events-none absolute bottom-0 top-0 w-[2px] -translate-x-1/2 bg-sky shadow-[0_0_10px_rgba(56,189,248,0.5)]"
        style={{ left: `${pos}%`, transition: dragging ? "none" : "left 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded border border-rim bg-float px-2 py-1 t-telemetry text-sky">
          ◂▸
        </span>
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry text-slate-300">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry text-emerald">
        {afterLabel}
      </span>
    </div>
  );
}