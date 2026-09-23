import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Minus, Plus, RotateCcw } from "lucide-react";
import SatImg from "@/components/common/SatImg";
import WaitShimmer from "@/components/common/WaitShimmer";
import { cn } from "@/lib/utils";

/** Convert a UV point on the 8 km image canvas back to geographic coordinates. */
export function geoFromUV(u, v, center, boxDeg = 8 / 111.32) {
  const lat = center.lat + (0.5 - v) * boxDeg;
  const lng = center.lng + (u - 0.5) * (boxDeg / Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)));
  return { lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
}

const Z_MIN = 1, Z_MAX = 6;

/**
 * SIDE-BY-SIDE mode (DESIGN.md 7.3): locked 1–6x zoom + shared pan, linked
 * crosshair, and on-click pixel Δ-probe (index + B8 NIR + B4 Red reflectance).
 */
export default function DualCanvas({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
  location,
  index,
  fetchPixel,
  loading,
}) {
  const [view, setView] = useState({ z: 1, ox: 0, oy: 0 });
  const [hover, setHover] = useState(null); // { u, v } of primary hover
  const [probe, setProbe] = useState(null); // { u, v, data }
  const [probing, setProbing] = useState(false);
  const frameA = useRef(null);
  const frameB = useRef(null);
  const drag = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const clamp = (v) => Math.min(Z_MAX, Math.max(Z_MIN, v));

  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      const k = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => {
        const nz = clamp(v.z * k);
        const r = frameA.current.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        const rx = (cx - v.ox) / v.z;
        const ry = (cy - v.oy) / v.z;
        return { z: nz, ox: cx - rx * nz, oy: cy - ry * nz };
      });
    },
    [],
  );

  const startPan = (e) => {
    const { clientX, clientY } = e;
    drag.current = { sx: clientX, sy: clientY, ox: viewRef.current.ox, oy: viewRef.current.oy };
    const move = (ev) => {
      setView((v) => ({
        z: v.z,
        ox: drag.current.ox + (ev.clientX - drag.current.sx),
        oy: drag.current.oy + (ev.clientY - drag.current.sy),
      }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const hoverAt = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    setHover({ u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height });
  };

  const probeAt = async (e) => {
    if (!location || probing) return;
    const r = e.currentTarget.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = (e.clientY - r.top) / r.height;
    const geo = geoFromUV(u, v, location);
    setProbing(true);
    setProbe({ u, v, data: null });
    try {
      const data = await fetchPixel(geo.lat, geo.lng, index);
      setProbe({ u, v, data });
    } catch {
      setProbe({ u, v, data: { error: true } });
    } finally {
      setProbing(false);
    }
  };

  const transform = { transform: `scale(${view.z}) translate(${view.ox / view.z}px, ${view.oy / view.z}px)` };

  const crosshair = (u, v) => (
    <span className="pointer-events-none absolute z-10" style={{ left: `${u * 100}%`, top: `${v * 100}%` }}>
      <span className="absolute -left-3 top-1/2 h-px w-6 bg-sky" />
      <span className="absolute left-1/2 -top-3 h-6 w-px bg-sky" />
    </span>
  );

  const frame = (url, label, accent, primary, handlers) => (
    <div
      ref={primary ? frameA : frameB}
      className={cn(
        "relative h-[32vh] min-h-[220px] cursor-crosshair touch-none select-none overflow-hidden rounded-[4px] border border-line bg-recessed",
        accent,
      )}
      onWheel={onWheel}
      onMouseDown={(e) => startPan(e)}
      onMouseMove={(e) => primary && hoverAt(e)}
      onMouseLeave={() => primary && setHover(null)}
      onClick={probeAt}
      {...handlers}
    >
      <SatImg key={url} src={url} alt={label} className="h-full w-full object-cover will-change-transform" style={transform} />
      {hover && crosshair(hover.u, hover.v)}
      <span className={cn("absolute left-2.5 top-2.5 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry", accent)}>
        {label}
      </span>
      {probe?.data?.value_epochA != null && (
        <span
          className="absolute z-20 -translate-y-2 rounded border border-line bg-float px-2 py-1 t-telemetry text-slate-100"
          style={{ left: `${probe.u * 100}%`, top: `${probe.v * 100}%` }}
        >
          D {probe.data.index.toUpperCase()}:{" "}
          <b className={probe.data.delta >= 0 ? "text-emerald" : "text-crimson"}>{probe.data.delta >= 0 ? "+" : ""}{probe.data.delta}</b>
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {frame(beforeUrl, beforeLabel, "text-slate-300", true)}
        {frame(afterUrl, afterLabel, "text-emerald", false, {})}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-[4px] border border-line bg-recessed px-3 py-2">
        <div className="flex items-center gap-1 t-telemetry text-steel">
          ZOOM
          <button className="btn-press rounded border border-line bg-card px-1.5 text-slate-200" onClick={() => setView((v) => ({ ...v, z: clamp(v.z / 1.2) }))}>
            <Minus size={11} />
          </button>
          <span className="mono mx-1 text-sky">{view.z.toFixed(1)}x</span>
          <button className="btn-press rounded border border-line bg-card px-1.5 text-slate-200" onClick={() => setView((v) => ({ ...v, z: clamp(v.z * 1.2) }))}>
            <Plus size={11} />
          </button>
        </div>
        <span className="t-telemetry text-steel">LINKED CROSSHAIR · CLICK TO PROBE D</span>
        <button
          className="btn-press ml-auto flex items-center gap-1 rounded border border-line bg-card px-2 py-1 t-telemetry text-slate-300 hover:text-sky"
          onClick={() => setView({ z: 1, ox: 0, oy: 0 })}
        >
          <RotateCcw size={11} /> RESET
        </button>
      </div>

      {probing && <WaitShimmer compact label="PIXEL DELTA READBACK" />}

      {probe?.data && !probing && (
        <dl className="rounded-[4px] border border-line bg-recessed p-3">
          <div className="mb-1 flex items-center gap-2 t-meta">
            <Crosshair size={12} className="text-sky" /> PIXEL DELTA READBACK
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="kv"><dt>{probe.data.index.toUpperCase()} A>B</dt><dd>{probe.data.value_epochA ?? "—"} → {probe.data.value_epochB ?? "—"}</dd></div>
            <div className="kv"><dt>B8 NIR rho</dt><dd>{probe.data.nir_reflectance_epochA ?? "—"} → {probe.data.nir_reflectance_epochB ?? "—"}</dd></div>
            <div className="kv"><dt>B4 RED rho</dt><dd>{probe.data.red_reflectance_epochA ?? "—"} → {probe.data.red_reflectance_epochB ?? "—"}</dd></div>
          </div>
          <p className="mt-2 text-body text-steel">{probe.data.interpretation}</p>
        </dl>
      )}
    </div>
  );
}