const $ = (id) => document.getElementById(id);

const form = $("searchForm");
const btn = $("searchBtn");
const badge = $("locationBadge");
const toast = $("toast");

let location = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 5000);
}

function setLoad(id, on) {
  const el = document.getElementById(id);
  if (el) el.style.display = on ? "flex" : "none";
}

function showCardLoad(cardId, on) {
  setLoad(cardId + "Load", on);
}

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setImage(id, url) {
  const img = document.getElementById(id);
  img.onload = () => {
    img.style.transitionProperty = "opacity";
    img.style.opacity = 1;
  };
  img.style.opacity = 0;
  img.src = url;
}

async function search() {
  const q = $("q").value.trim();
  if (!q) return;
  btn.disabled = true;
  btn.textContent = "…";
  try {
    location = await getJSON("/api/search?q=" + encodeURIComponent(q));
    badge.textContent = `📍 ${location.name}  (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`;
    badge.classList.remove("hidden");
    await analyze();
  } catch (e) {
    showToast(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Search";
  }
}

async function analyze() {
  if (!location) return;
  const s1 = $("s1").value, e1 = $("e1").value;
  const s2 = $("s2").value, e2 = $("e2").value;
  const base = `/api/img?lat=${location.lat}&lng=${location.lng}`;

  showCardLoad("before", true);
  showCardLoad("after", true);
  showCardLoad("change", true);

  const pending = {
    before: getJSON(`${base}&start=${s1}&end=${e1}`),
    after: getJSON(`${base}&start=${s2}&end=${e2}`),
    change: getJSON(`/api/change?lat=${location.lat}&lng=${location.lng}&s1=${s1}&e1=${e1}&s2=${s2}&e2=${e2}`),
  };

  pending.before.then((res) => {
    showCardLoad("before", false);
    setImage("beforeImg", res.image_url);
    $("beforeMeta").textContent = `${res.date} · ☁ ${res.cloud_pct}%`;
  }).catch((e) => { showCardLoad("before", false); showToast(e.message); });

  pending.after.then((res) => {
    showCardLoad("after", false);
    setImage("afterImg", res.image_url);
    $("afterMeta").textContent = `${res.date} · ☁ ${res.cloud_pct}%`;
    pending.before.then((b) => primeSlider(b.image_url, res.image_url)).catch(() => {});
  }).catch((e) => { showCardLoad("after", false); showToast(e.message); });

  try {
    const st = await pending.change;
    showCardLoad("change", false);
    setImage("changeImg", st.image_url);
    $("stats").innerHTML = `
      <div class="stat"><span class="k">${st.changed_km2}</span><span class="v">Changed (km²)</span></div>
      <div class="stat"><span class="k">${st.stable_km2}</span><span class="v">Stable (km²)</span></div>
      <div class="stat"><span class="k">${st.water_km2}</span><span class="v">Water (km²)</span></div>
      <div class="stat"><span class="k">${st.confidence}%</span><span class="v">Confidence</span></div>`;
    $("aiText").innerHTML = `🧠 <b>AI:</b> ${st.interpretation}<br/>📏 <b>${st.change_pct}%</b> of the land footprint changed between the two periods.`;
    const sarEl = $("sarFlag");
    sarEl.textContent = st.sar_evidence ? "✓ detected" : "✗ not found";
    sarEl.style.color = st.sar_evidence ? "#7de2d1" : "#d9534f";
  } catch (e) {
    showCardLoad("change", false);
    showToast(e.message);
  }
}

function primeSlider(beforeUrl, afterUrl) {
  const top = $("slideTop");      // after
  const bottom = $("slideBottom"); // before
  top.src = afterUrl;
  bottom.src = beforeUrl;
  updateSlider($("slider").value);
}

function updateSlider(v) {
  const wrap = $("slideAfterWrap");
  const handle = $("slideHandle");
  wrap.style.clipPath = `inset(0 0 0 ${v}%)`;
  handle.style.left = `${v}%`;
  $("slider").value = v;
}

$("slider").addEventListener("input", (e) => updateSlider(e.target.value));

$("sarToggle").addEventListener("change", (e) => {
  const img = $("changeImg");
  if (!img.src) return;
  if (e.target.checked) {
    img.style.filter = "saturate(1.4) contrast(1.15)";
  } else {
    img.style.filter = "none";
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  search();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement.id === "q") {
    e.preventDefault();
    search();
  }
});

search();