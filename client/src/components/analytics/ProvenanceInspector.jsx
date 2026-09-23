import { useState } from "react";
import { Copy } from "lucide-react";
import PanelHeader from "@/components/common/PanelHeader";

/** Satellite provenance inspector — sensor, sun geometry, baseline, granule (2.1). */
export default function ProvenanceInspector({ before }) {
  const [copied, setCopied] = useState(false);
  const p = before?.provenance;
  const rows = p
    ? [
        ["Sensor", p.sensor],
        ["Spacecraft", p.spacecraft],
        ["Granule", p.granule],
        ["Processing baseline", p.processing_baseline],
        ["Correction", p.correction],
        ["Scene date", before.date],
        ["Cloud fraction", before.cloud_pct != null ? `${before.cloud_pct}%` : "—"],
        ["Sun elevation", p.sun_elevation_deg != null ? `${p.sun_elevation_deg}°` : "—"],
        ["Sun azimuth", p.sun_azimuth_deg != null ? `${p.sun_azimuth_deg}°` : "—"],
        ["Scene ID", before.scene_id],
      ]
    : [];

  const copy = async () => {
    if (!p) return;
    try {
      await navigator.clipboard.writeText(rows.map(([k, v]) => `${k}: ${v}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!before) {
    return (
      <section className="tile-card overflow-hidden">
        <PanelHeader title="Provenance Inspector" crumbs={["DIALOG"]} />
        <p className="p-3 t-telemetry text-steel">NO SCENE RESOLVED YET</p>
      </section>
    );
  }

  return (
    <section className="tile-card overflow-hidden">
      <PanelHeader
        title="Provenance Inspector"
        crumbs={["S2A // L2A"]}
        right={
          <button className="btn-press flex items-center gap-1 rounded border border-line bg-recessed px-2 py-1 t-telemetry text-steel hover:text-sky" onClick={copy}>
            <Copy size={11} /> {copied ? "COPIED" : "EXPORT"}
          </button>
        }
      />
      <dl className="p-3">
        {rows.map(([k, v]) => (
          <div className="kv" key={k}>
            <dt>{k}</dt>
            <dd className="max-w-[55%] truncate">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}