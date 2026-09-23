import { Radar } from "lucide-react";
import PanelHeader from "@/components/common/PanelHeader";
import SatImg from "@/components/common/SatImg";
import WaitShimmer from "@/components/common/WaitShimmer";
import { cn } from "@/lib/utils";

/** Stereo change-detection raster tile with overlay tags (DESIGN.md 2.1, 5.3). */
export default function ChangeRaster({ imageUrl, change, location, loading, className }) {
  return (
    <section className={cn("tile flex flex-col overflow-hidden", className)}>
      <PanelHeader title="Stereo Change Detection Raster" crumbs={["S2A // L2A", "D NDVI", "S1 VV/VH"]} tone="amber" />
      <div className="relative h-[30vh] min-h-[30vh] overflow-hidden rounded-b-[6px] bg-recessed">
        {loading && !imageUrl ? (
          <WaitShimmer label="CHANGE MATRIX" />
        ) : (
          <>
            <SatImg key={imageUrl} src={imageUrl} alt="Bi-temporal change classification raster" />
            <span className="absolute right-3 top-3 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry text-slate-300">
              512x512 · 10 m/px · {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "—"}
            </span>
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded border border-amber/40 bg-canvas/70 px-2 py-1 t-telemetry text-amber">
              <Radar size={11} />
              {change?.sar_evidence ? "S1 VV/VH BACKSCATTER COHERENT" : "S1 VV/VH NO RADAR PASS"}
            </span>
            {change && (
              <span className="absolute bottom-3 right-3 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry text-slate-200">
                {change.changed_km2.toFixed(2)} km² shifted · {Math.abs(change.change_pct).toFixed(1)}%{" "}
                {change.change_pct >= 0 ? "▲" : "▼"}
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}