import { cn } from "@/lib/utils";

/** Status dock: coordinate footprint · resolution · UTM zone · pipeline latency (2.1). */
export default function StatusDock({ location, loading, elapsed }) {
  const zone = location ? utmZone(location.lng) : "—";
  return (
    <footer className="relative z-10 mx-auto mt-2 max-w-[1600px] px-6 pb-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-3 t-telemetry text-steel">
        <span>
          FOOTPRINT{" "}
          <b className="text-slate-200">
            {location ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E` : "UNRESOLVED"}
          </b>
        </span>
        <span>RESOLUTION <b className="text-slate-200">10 m/px</b></span>
        <span>UTM ZONE <b className="text-slate-200">{zone}</b></span>
        <span>
          PIPELINE{" "}
          <b className={cn("mono", loading ? "text-sky" : "text-emerald")}>{loading ? `RUNNING ${elapsed}s` : "IDLE"}</b>
        </span>
        <span className="ml-auto hidden lg:inline">SENTINEL-2 MSI SR · SENTINEL-1 GRD · GEE t4/bestEffort</span>
      </div>
    </footer>
  );
}

function utmZone(lng) {
  const z = Math.floor((lng + 180) / 6) + 1;
  return `${z}${lng >= 0 ? "N" : "S"}`;
}