import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const STAGES = [
  [0, "resolving scene footprint"],
  [4, "queueing Sentinel-2 L2A product"],
  [9, "computing spectral index raster"],
  [16, "assembling change matrix"],
  [28, "pipeline saturated — first pass caches data"],
];

const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Skeleton pulse + live elapsed timer + stage readout for slow links (DESIGN.md 8.1). */
export default function WaitShimmer({ label = "PIPELINE", compact = false, className }) {
  const [sec, setSec] = useState(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      setSec(Math.floor((performance.now() - t0) / 1000));
      setBeat((b) => (b + 1) % 4);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const stage = useMemo(() => {
    let current = STAGES[0][1];
    for (const [at, txt] of STAGES) if (sec >= at) current = txt;
    return current;
  }, [sec]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 border border-line bg-recessed px-3 py-2", className)}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky" />
        <span className="truncate t-telemetry text-steel">{stage}</span>
        <span className="mono ml-auto t-telemetry text-sky">{mmss(sec)}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-3 overflow-hidden border border-line bg-recessed px-6", className)}>
      <div className="absolute inset-x-6 top-1/3 space-y-2 opacity-40">
        {[90, 60, 75, 45].map((w, i) => (
          <div
            key={i}
            className="h-1.5 animate-pulse rounded bg-line"
            style={{ width: `${w}%`, animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>

      <div className="relative flex items-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              i === beat ? "scale-125 bg-sky" : "bg-line",
            )}
          />
        ))}
      </div>
      <p className="relative font-script text-lg text-slate-100">{stage}...</p>
      <p className="mono relative t-telemetry text-steel">{label} · ELAPSED {mmss(sec)}</p>
      <p className="mono relative text-[9px] text-crimson/80">first pass downloads the raster — cached afterward</p>
    </div>
  );
}