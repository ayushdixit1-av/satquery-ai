import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function WaitSpark() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </div>
  );
}

/** Satellite imagery surface with offline fallback + retry (DESIGN.md 8.1). */
export default function SatImg({ src, alt, className, style, loading, onRetry }) {
  const [broken, setBroken] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setBroken(false);
    setDone(false);
  }, [src]);

  const show = !!src && !broken;
  return (
    <>
      {show ? (
        <img
          src={src}
          alt={alt}
          style={style}
          draggable="false"
          className={cn("h-full w-full object-cover", className)}
          onError={() => setBroken(true)}
          onLoad={() => setDone(true)}
        />
      ) : (
        <div style={style} className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-recessed", className)}>
          <span className="font-script text-xl text-slate-100">{onRetry ? "NO SIGNAL — RE-ACQUIRE" : "NO SIGNAL — AWAITING PASS"}</span>
          {alt && <span className="mono truncate px-3 text-[9px] text-steel">{alt}</span>}
          {onRetry && (
            <button onClick={onRetry} className="btn-press mt-1 rounded border border-rim bg-float px-3 py-1 t-meta text-sky">
              ⟳ RETRY
            </button>
          )}
        </div>
      )}
      {loading && !done && show && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas/70">
          <WaitSpark />
        </div>
      )}
    </>
  );
}