import { useEffect, useMemo, useRef, useState } from "react";
import TopCommandBar from "@/components/layout/TopCommandBar";
import StatusDock from "@/components/layout/StatusDock";
import { TemporalEpochSelector, SpectralChips } from "@/components/layout/SidebarStations";
import SwipeSlider from "@/components/comparison/SwipeSlider";
import DualCanvas from "@/components/comparison/DualCanvas";
import ChangeRaster from "@/components/comparison/ChangeRaster";
import CompareCard from "@/components/comparison/CompareCard";
import MetricMatrix from "@/components/analytics/MetricMatrix";
import SarLedger from "@/components/analytics/SarLedger";
import ProvenanceInspector from "@/components/analytics/ProvenanceInspector";
import LandmassWater from "@/components/analytics/LandmassWater";
import PanelHeader from "@/components/common/PanelHeader";
import WaitShimmer from "@/components/common/WaitShimmer";
import EarthGlobe from "@/components/3d/EarthGlobe";
import { useEarthEngine, API_BASE } from "@/hooks/useEarthEngine";
import { useKeyboard } from "@/hooks/useKeyboard";
import { cn } from "@/lib/utils";

export default function App() {
  const { location, search, index, setIndex, epochs, setEpoch, fetchPixel, before, after, afterRaw, change, water, loading, error } = useEarthEngine();
  const [ee, setEe] = useState(false);
  const [mode, setMode] = useState("swipe");
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const globeRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.json())
      .then((h) => setEe(!!h.ee_ok))
      .catch(() => setEe(false));
  }, []);

  useEffect(() => {
    if (!location) search("Kanpur");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) return undefined;
    const t0 = performance.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.round((performance.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  // Pipeline bar crawls forward while loading, snaps to 100 when done (DESIGN.md 6.4).
  useEffect(() => {
    if (loading) {
      setProgress(6);
      const id = setInterval(() => setProgress((p) => Math.min(94, p + (94 - p) / 9 + 1.4)), 260);
      return () => clearInterval(id);
    }
    setProgress(100);
    const t = setTimeout(() => setProgress(0), 800);
    return () => clearTimeout(t);
  }, [loading]);

  useKeyboard({
    onSearchFocus: () => searchRef.current?.focus(),
    onBand: (b) => setIndex(b),
    onToggleMode: () => setMode((m) => (m === "swipe" ? "dual" : "swipe")),
    onResetGlobe: () => globeRef.current?.reset(),
  });

  const e1 = epochs.s1.slice(0, 4);
  const e2 = epochs.s2.slice(0, 4);
  const beforeUrl = before?.image_url;
  const afterUrl = after?.image_url;
  const loadingComp = loading && !afterUrl;

  const overlayTags = useMemo(
    () => ({
      before: `EPOCH 1 · ${e1} · TCI RGB`,
      after: `EPOCH 2 · ${e2} · ${index.toUpperCase()} HEATMAP`,
    }),
    [e1, e2, index],
  );

  return (
    <div className="relative min-h-screen bg-canvas">
      <TopCommandBar ee={ee} location={location} onSearch={search} />

      <main className="relative z-10 mx-auto grid w-full max-w-[1800px] items-start gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Left cluster */}
        <div className="flex flex-col gap-4">
          <section className="tile flex flex-col overflow-hidden">
            <PanelHeader title="3D Earth Digital Twin" crumbs={["WEBGL", "R=2.0", "S2 SSO ORBIT"]} tone="emerald" />
            <div className="relative h-[46vh] min-h-[300px] overflow-hidden bg-recessed">
              <EarthGlobe ref={globeRef} lat={location?.lat} lng={location?.lng} targetName={location?.name} />
              <span className="pointer-events-none absolute bottom-3 left-3 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry text-emerald">
                ● UNDER OBSERVATION{location ? ` · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : ""}
              </span>
            </div>
          </section>

          <section className="tile flex flex-col overflow-hidden">
            <PanelHeader
              title="Dual-Epoch Inspection Console"
              crumbs={["TCI ↑", "HEATMAP ↓"]}
              right={
                <div className="flex items-center gap-1 rounded border border-line bg-recessed p-0.5 t-meta">
                  {(
                    [
                      ["swipe", "SWIPE"],
                      ["dual", "SIDE-BY-SIDE"],
                    ]
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "btn-press rounded px-2 py-0.5",
                        mode === m ? "bg-float text-sky shadow-[0_0_0_1px_#2c3e66]" : "text-steel hover:text-slate-200",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky to-emerald transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="mono w-20 text-right t-telemetry text-sky">
                  {progress > 0 && progress < 100 ? `${Math.round(progress)}%` : "SYNC"}
                </span>
              </div>

              {mode === "swipe" ? (
                <SwipeSlider
                  beforeUrl={beforeUrl}
                  afterUrl={afterUrl}
                  beforeLabel={overlayTags.before}
                  afterLabel={overlayTags.after}
                  loading={loading && !beforeUrl && !afterUrl}
                />
              ) : (
                <DualCanvas
                  beforeUrl={beforeUrl}
                  afterUrl={afterUrl}
                  beforeLabel={overlayTags.before}
                  afterLabel={overlayTags.after}
                  location={location}
                  index={index}
                  fetchPixel={fetchPixel}
                  loading={loadingComp}
                />
              )}

              {loading && !change ? (
                <WaitShimmer compact label="CHANGE MATRIX" />
              ) : (
                change?.interpretation && (
                  <p className="border-l-2 border-sky bg-recessed px-3 py-2 font-script text-xl leading-tight text-slate-100">
                    {change.interpretation}
                  </p>
                )
              )}
            </div>
          </section>

          <ChangeRaster imageUrl={change?.image_url} change={change} location={location} loading={loading} />
        </div>

        {/* Inspector rail */}
        <aside className="flex flex-col gap-4">
          <TemporalEpochSelector epochs={epochs} onChange={setEpoch} />
          <SpectralChips index={index} onSelect={setIndex} />
          <CompareCard
            beforeUrl={beforeUrl}
            afterUrl={afterRaw?.image_url}
            beforeLabel={overlayTags.before}
            afterLabel={`EPOCH 2 · ${e2} · TCI RGB`}
            loading={loading && !beforeUrl && !afterUrl}
          />
          <MetricMatrix change={change} />
          <SarLedger change={change} />
          <LandmassWater water={water} loading={loading} />
          <ProvenanceInspector before={before} />
        </aside>
      </main>

      <StatusDock location={location} loading={loading} elapsed={elapsed} />

      {error && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded border border-crimson/50 bg-float px-4 py-2 t-telemetry text-slate-200 shadow-2xl">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}