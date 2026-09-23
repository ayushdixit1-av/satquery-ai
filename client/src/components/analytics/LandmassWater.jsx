import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import PanelHeader from "@/components/common/PanelHeader";

/** Region-wide landmass water content — NDWI coverage over the full footprint (two epochs). */
function CoverageBar({ pct, className }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export default function LandmassWater({ water, loading }) {
  if (!water) {
    return (
      <section className="tile-card overflow-hidden">
        <PanelHeader title="Landmass Water Content" crumbs={["NDWI", "B3-B8", "ROI"]} tone="sky" />
        <p className="p-3 t-telemetry text-steel">{loading ? "AQUEOUS SURVEY…" : "NO WATER SURVEY YET"}</p>
      </section>
    );
  }

  const a = water.epoch_a;
  const b = water.epoch_b;
  const delta = Math.abs(water.delta_km2) ?? 0;
  const tone = delta > 3 ? (water.delta_km2 >= 0 ? "text-sky" : "text-amber") : "text-steel";

  return (
    <section className="tile-card overflow-hidden">
      <PanelHeader title="Landmass Water Content" crumbs={["NDWI", "B3-B8", "ALL PLACE"]} tone="sky" />
      <div className="p-3">
        <div className="mb-2 grid grid-cols-3 gap-3">
          <div>
            <p className="t-meta">Epoch 1</p>
            <p className="mono t-telemetry text-sky">{a.water_km2.toFixed(2)} km²</p>
            <p className="t-telemetry text-steel">{a.water_pct.toFixed(1)}% of footprint</p>
          </div>
          <div>
            <p className="t-meta">Epoch 2</p>
            <p className="mono t-telemetry text-emerald">{b.water_km2.toFixed(2)} km²</p>
            <p className="t-telemetry text-steel">{b.water_pct.toFixed(1)}% of footprint</p>
          </div>
          <div>
            <p className="t-meta">Delta</p>
            <p className={cn("mono t-telemetry", tone)}>
              {water.delta_km2 >= 0 ? "▲" : "▼"} {delta.toFixed(2)} km²
            </p>
            <p className="t-telemetry text-steel">ΔNDWI {water.delta_ndwi == null ? "—" : (water.delta_ndwi >= 0 ? "+" : "") + water.delta_ndwi}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="mb-1 flex justify-between t-telemetry text-steel">
              <span>EPOCH 1 WATER COVERAGE</span>
              <span className="mono">{a.water_pct.toFixed(1)}%</span>
            </div>
            <CoverageBar pct={a.water_pct} className="bg-sky" />
          </div>
          <div>
            <div className="mb-1 flex justify-between t-telemetry text-steel">
              <span>EPOCH 2 WATER COVERAGE</span>
              <span className="mono">{b.water_pct.toFixed(1)}%</span>
            </div>
            <CoverageBar pct={b.water_pct} className="bg-emerald" />
          </div>
        </div>

        {water.image_url && (
          <div className="tile-recessed relative mt-3 h-28 w-full overflow-hidden">
            <img src={water.image_url} alt="Region NDWI water-content heatmask" className="h-full w-full object-cover" draggable="false" />
            <span className="pointer-events-none absolute bottom-1 left-1.5 rounded border border-line bg-canvas/70 px-1.5 py-0.5 t-telemetry text-sky">
              AQUEOUS MASK · NDWI ±0.40 · {water.total_km2.toFixed(1)} km²
            </span>
          </div>
        )}

        <div className="mt-2">
          <div className="kv">
            <dt>Mean wetness E1 → E2</dt>
            <dd className="text-sky">
              {a.ndwi_mean} → {b.ndwi_mean}
            </dd>
          </div>
          <div className="kv">
            <dt>Wetness spread p25–p75 (E2)</dt>
            <dd>{b.ndwi_p25} → {b.ndwi_p75}</dd>
          </div>
          <div className="kv">
            <dt>Footprint</dt>
            <dd>{water.total_km2.toFixed(2)} km² @ {b.scale_m} m</dd>
          </div>
        </div>

        <p className="flex gap-2 border-t border-line/60 pt-2 text-body text-steel leading-relaxed">
          <Droplets size={14} className="mt-0.5 shrink-0 text-sky" />
          {water.interpretation}
        </p>
      </div>
    </section>
  );
}