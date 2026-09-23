import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Satellite data lifecycle: location → epochs → imagery/index/change (DESIGN.md §7). */
export const API_BASE = (
  import.meta.env.VITE_API_URL || new URLSearchParams(location.search).get("api") || ""
).replace(/\/$/, "");

export function absUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

const INDEX_PRIORITY = ["ndvi", "ndwi", "nbr"];

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Request failed");
  // Backend thumbnail paths are host-relative (/thumb/...); resolve them to the API host
  // so the GitHub-Pages frontend can render imagery cross-origin.
  for (const o of [data, ...Object.values(data).filter((v) => v && typeof v === "object")]) {
    if (typeof o?.image_url === "string") o.image_url = absUrl(o.image_url);
  }
  return data;
}

export function useEarthEngine() {
  const [location, setLocation] = useState(null);
  const [index, setIndex] = useState("ndvi");
  const [epochs, setEpochs] = useState({
    s1: "2020-01-01", e1: "2020-12-31",
    s2: "2025-01-01", e2: "2025-12-31",
  });
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [afterRaw, setAfterRaw] = useState(null);
  const [change, setChange] = useState(null);
  const [water, setWater] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const search = useCallback(async (query) => {
    setError(null);
    try {
      const loc = await getJSON(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
      setLocation(loc);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    const id = ++seq.current;
    const { lat, lng } = location;
    const { s1, e1, s2, e2 } = epochs;
    setLoading(true);
    setBefore(null);
    setAfter(null);
    setAfterRaw(null);
    setChange(null);
    setWater(null);

    const beforeP = getJSON(`${API_BASE}/api/img?lat=${lat}&lng=${lng}&start=${s1}&end=${e1}`);
    const afterP = getJSON(`${API_BASE}/api/index?lat=${lat}&lng=${lng}&start=${s2}&end=${e2}&type=${index}`)
      .catch(() => getJSON(`${API_BASE}/api/img?lat=${lat}&lng=${lng}&start=${s2}&end=${e2}`));
    const afterRawP = getJSON(`${API_BASE}/api/img?lat=${lat}&lng=${lng}&start=${s2}&end=${e2}`);
    const changeP = getJSON(`${API_BASE}/api/change?lat=${lat}&lng=${lng}&s1=${s1}&e1=${e1}&s2=${s2}&e2=${e2}`);
    const waterP = getJSON(`${API_BASE}/api/water?lat=${lat}&lng=${lng}&s1=${s1}&e1=${e1}&s2=${s2}&e2=${e2}`);

    beforeP.then((r) => { if (seq.current === id) setBefore(r); }).catch((e) => { if (seq.current === id) setError(e.message); });
    afterP.then((r) => { if (seq.current === id) setAfter(r); }).catch((e) => { if (seq.current === id) setError(e.message); });
    afterRawP.then((r) => { if (seq.current === id) setAfterRaw(r); }).catch((e) => { if (seq.current === id) setError(e.message); });
    changeP.then((r) => { if (seq.current === id) setChange(r); }).catch((e) => { if (seq.current === id) setError(e.message); });
    waterP.then((r) => { if (seq.current === id) setWater(r); }).catch((e) => { if (seq.current === id) setError(e.message); });
    Promise.allSettled([afterP, changeP, waterP]).then(() => { if (seq.current === id) setLoading(false); });
  }, [location, index, epochs]);

  const setEpoch = useCallback((key, value) => {
    setEpochs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchPixel = useCallback(async (lat, lng, indexType) => {
    const { s1, e1, s2, e2 } = epochs;
    return getJSON(`${API_BASE}/api/pixel?lat=${lat}&lng=${lng}&s1=${s1}&e1=${e1}&s2=${s2}&e2=${e2}&type=${indexType}`);
  }, [epochs]);

  const activeIndex = useMemo(() => index || INDEX_PRIORITY[0], [index]);

  return {
    location, search, index: activeIndex, setIndex,
    epochs, setEpoch, fetchPixel, before, after, afterRaw, change, water, loading, error,
  };
}