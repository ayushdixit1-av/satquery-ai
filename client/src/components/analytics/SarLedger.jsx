import { Radar } from "lucide-react";
import PanelHeader from "@/components/common/PanelHeader";

/** Sentinel-1 SAR coherence ledger — radar penetration & cloud pierce status (2.1). */
export default function SarLedger({ change, interpretation }) {
  const ok = !!change?.sar_evidence;
  return (
    <section className="tile-card overflow-hidden">
      <PanelHeader title="SAR Coherence Ledger" crumbs={["S1 GRD", "VV/VH", "C-BAND"]} tone="amber" />
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-3 rounded-[4px] border border-line bg-recessed px-3 py-2">
          <Radar size={16} className={ok ? "text-emerald" : "text-steel"} />
          <div>
            <p className="text-body text-slate-200">{ok ? "COHERENT — structural integrity verified" : "NO RADAR PASS IN WINDOW"}</p>
            <p className="t-telemetry text-steel">
              {ok ? "VV/VH backscatter corroborated the optical change signal" : "cloud-piercing S1 unavailable — optical-only synthesis"}
            </p>
          </div>
        </div>
        {interpretation && (
          <p className="border-t border-line/60 pt-2 text-body text-steel leading-relaxed">{interpretation}</p>
        )}
      </div>
    </section>
  );
}