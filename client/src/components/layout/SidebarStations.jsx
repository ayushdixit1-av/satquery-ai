import { CalendarRange, Layers, Radar } from "lucide-react";
import PanelHeader from "@/components/common/PanelHeader";
import { cn } from "@/lib/utils";

const INDICES = [
  { id: "ndvi", label: "NDVI", sub: "FLORA", key: "1" },
  { id: "ndwi", label: "NDWI", sub: "AQUA", key: "2" },
  { id: "nbr", label: "NBR", sub: "THERMAL", key: "3" },
];

/** Temporal epoch selector — Epoch 1 (Baseline) vs Epoch 2 (Current). */
export function TemporalEpochSelector({ epochs, onChange }) {
  const field = (label, value, k) => (
    <label className="flex items-center gap-2 text-meta">
      <span className="w-4 text-right">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(k, e.target.value)}
        className="mono w-[7.5rem] rounded border border-line bg-recessed px-2 py-1 text-[11px] text-slate-200 focus-visible:border-rim"
      />
    </label>
  );
  return (
    <section className="tile-card overflow-hidden">
      <PanelHeader title="Temporal Epoch Selection" crumbs={["PIPELINE"]} />
      <div className="space-y-3 p-3">
        <div className="text-meta">
          EPOCH 1 <span className="text-steel">BASELINE</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {field("S", epochs.s1, "s1")}
          {field("E", epochs.e1, "e1")}
        </div>
        <div className="text-meta">
          EPOCH 2 <span className="text-steel">CURRENT</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {field("S", epochs.s2, "s2")}
          {field("E", epochs.e2, "e2")}
        </div>
        <p className="flex items-center gap-2 t-telemetry text-steel">
          <CalendarRange size={12} /> bi-temporal differencing window · cached per range
        </p>
      </div>
    </section>
  );
}

/** Spectral sensing chips with band shortcuts (9.2). */
export function SpectralChips({ index, onSelect }) {
  return (
    <section className="tile-card overflow-hidden">
      <PanelHeader title="Spectral Sensing Bands" crumbs={["B2 B3 B4 B8A B11 B12"]} />
      <div className="space-y-2 p-3">
        {INDICES.map((i) => (
          <button
            key={i.id}
            onClick={() => onSelect(i.id)}
            className={cn(
              "btn-press flex h-7 w-full items-center gap-3 rounded-[4px] border px-3 text-body",
              index === i.id
                ? "border-rim bg-float text-slate-100"
                : "border-line bg-recessed text-slate-400 hover:border-rim hover:text-slate-200",
            )}
          >
            <Layers size={13} className={index === i.id ? "text-sky" : "text-steel"} />
            <b>{i.label}</b>
            <em className="not-italic t-telemetry text-steel">{i.sub}</em>
            <kbd className="ml-auto rounded border border-line bg-panel px-1.5 py-0.5 text-[9px] text-steel">[{i.key}]</kbd>
          </button>
        ))}
        <p className="flex items-center gap-2 pt-1 t-telemetry text-steel">
          <Radar size={12} /> keys 1–3 · S toggle inspection mode
        </p>
      </div>
    </section>
  );
}