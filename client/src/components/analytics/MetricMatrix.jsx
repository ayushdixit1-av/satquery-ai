import { Table } from "lucide-react";
import { cn } from "@/lib/utils";
import PanelHeader from "@/components/common/PanelHeader";

/** Dense 4-column GIS property matrix (2.2). */
export default function MetricMatrix({ change }) {
  const rows = change
    ? [
        ["Changed area", `${change.changed_km2?.toFixed(2)}`, "km²", change?.changed_km2 > 0 ? "emerald" : "steel"],
        ["Stable area", `${change.stable_km2?.toFixed(2)}`, "km²", "steel"],
        ["Water / masked", `${change.water_km2?.toFixed(2)}`, "km²", "sky"],
        ["Total footprint", `${change.total_km2?.toFixed(2)}`, "km²", "steel"],
        ["Change fraction", `${Math.abs(change.change_pct ?? 0).toFixed(2)}`, "%", Math.abs(change.change_pct) > 5 ? "amber" : "steel"],
        ["SAR coherence", change.sar_evidence ? "DETECTED" : "ABSENT", "", change.sar_evidence ? "emerald" : "crimson"],
      ]
    : [["Scenario", "—", "", "steel"], ["Resolution", "10 m/px", "", "steel"], ["Projection", "UTM", "", "steel"], ["Source", "S2 SR / S1 GRD", "", "steel"]];

  const tone = {
    sky: "text-sky",
    steel: "text-slate-300",
    emerald: "text-emerald",
    amber: "text-amber",
    crimson: "text-crimson",
  };

  return (
    <section className="tile-card overflow-hidden">
      <PanelHeader title="Spectral Metric Matrix" crumbs={["O1 4x2"]} />
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-line t-meta">
            <th className="px-3 py-1.5 text-left font-medium">Measure</th>
            <th className="px-3 py-1.5 text-right font-medium">Value</th>
            <th className="px-3 py-1.5 text-left font-medium">Unit</th>
            <th className="px-3 py-1.5 text-right font-medium text-steel">Ref</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v, u, c]) => (
            <tr key={k} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-1.5 text-steel">{k}</td>
              <td className={cn("mono px-3 py-1.5 text-right", tone[c])}>{v}</td>
              <td className="px-3 py-1.5 text-steel">{u}</td>
              <td className="mono px-3 py-1.5 text-right text-[10px] text-steel">{change ? (c === "emerald" ? "OK D" : "D") : "L"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}