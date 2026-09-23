# SATQUERY — Industrial Satellite Intelligence Platform
## Master Frontend Architecture & Design Specification (v4.0)

> **Document Classification**: Core Engineering Blueprint & Single Source of Truth  
> **Target Environment**: Localhost 8000 (`server/app.py` FastAPI ASGI + `client/` React 19 SPA)  
> **Design Philosophy**: Rigorous GIS Workbench · Engineered Density · Zero-Failure WebGL · Human Technical Clarity

---

## 1. Visual Aesthetics & Grounded Surface System

### 1.1 Palette Architecture: Eradication of Generic Dark Mode
Generic AI templates rely on `#000000` pitch black paired with saturated violet/purple radial blur gradients (`bg-indigo-500/20 blur-3xl`). SatQuery eliminates all superficial gradients and adopts a grounded, high-contrast industrial charcoal and slate surface system.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Canvas Base: #080c14 (Deep Void Slate)                                  │
│  ├─ Layer 1 (Base Panel):        #0d1424  (Solid Charcoal-Slate)        │
│  ├─ Layer 2 (Raised Container):  #131c31  (Elevated Console Surface)    │
│  ├─ Layer 3 (Active Item/Input): #1a2640  (Interactive Focus Surface)   │
│  ├─ Stroke Subtle:               #1e2c4a  (1px Structural Boundary)     │
│  └─ Stroke Highlight:            #2c3e66  (1px Interactive Active Rim) │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Surface Contrast & Elevation Matrix
Elevation is communicated strictly through calibrated luminance steps and crisp 1px borders—never through oversaturated neon glows or heavy outer drop-shadows.

| Level | Background | Border Token | Usage |
| :--- | :--- | :--- | :--- |
| **L0 Canvas** | `#080c14` | *None* | Root viewport background |
| **L1 Panel** | `#0d1424` | `1px solid #1c2842` | Major Bento tiles, 3D viewport frame, inspector docks |
| **L2 Card** | `#131c31` | `1px solid #233354` | Data metric containers, index toggle chips, telemetry cards |
| **L3 Recessed**| `#090e1a` | `1px solid #17223b` | Tabular data grids, image comparison viewports, code readouts |
| **L4 Float** | `#1a2640` | `1px solid #334876` | Tooltips, keyboard shortcut pills, active dropdown menus |

### 1.3 Elimination of Arbitrary Glassmorphism
* **Strict Rule**: No `backdrop-blur` on data cards, metrics grids, or tabular views. Frosted glass introduces legibility degradation and WebGL composite frame drops.
* **Exceptions**: Only the floating top status bar and transient target badges retain a restrained `backdrop-blur-md` backed by an opaque `rgba(13, 20, 36, 0.88)` foundation to guarantee `WCAG AAA` contrast ratios.

### 1.4 Purposeful Semantic Accent Tokens
Bright accents are restricted to actionable triggers and data status states. Neon purple, magenta, and electric violet are eliminated.

| Accent Class | Hex Value | Semantic Function |
| :--- | :--- | :--- |
| **Telemetry Sky** | `#38bdf8` | Primary coordinate reticle, active UI focus rings, camera path lines |
| **Canopy Emerald** | `#10b981` | Positive NDVI shifts, authenticated Earth Engine cloud heartbeat, healthy biomass |
| **Thermal Amber** | `#f59e0b` | NBR burn scars, moderate surface change warnings, SAR backscatter shifts |
| **Hazard Crimson** | `#ef4444` | Vegetative destruction, cloud mask occlusion alerts, network disconnection |
| **Muted Steel** | `#64748b` | Sub-labels, inactive states, unit suffixes, graticule lines |

---

## 2. Layout Architecture & Spatial Hierarchy (Asymmetric Bento)

### 2.1 Eradication of the Uniform 3-Card Row
The classic AI layout of three identical rounded cards with generic icons and centered text is replaced with an asymmetric, high-density Bento grid engineered for geospatial intelligence workflows.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP COMMAND BAR: System Status (EE Active) · Location Search (Cmd+K) · Orbital Telemetry Readout │
├────────────────────────────────────────────────────────┬─────────────────────────────────────────┤
│ [2x2 PRIMARY HERO BENTO: 62% Width]                    │ [INSPECTOR SIDEBAR: 38% Width]          │
│                                                        │                                         │
│ ┌────────────────────────────────────────────────────┐ │ ┌─────────────────────────────────────┐ │
│ │ 3D EARTH DIGITAL TWIN (WebGL)                      │ │ │ TEMPORAL EPOCH SELECTOR             │ │
│ │ Continental Mesh · Sentinel-2 SSO Polar Orbit      │ │ │ Epoch 1 (Baseline) vs Epoch 2 (Curr)│ │
│ │ Surface Reticle · Quaternion Slerp Fly-To          │ │ └─────────────────────────────────────┘ │
│ └────────────────────────────────────────────────────┘ │ ┌─────────────────────────────────────┐ │
│                                                        │ │ SPECTRAL SENSING CHIPS              │ │
│ ┌────────────────────────────────────────────────────┐ │ │ NDVI (Flora) · NDWI (Aqua) · NBR   │ │
│ │ DUAL-EPOCH INSPECTION CONSOLE                      │ │ └─────────────────────────────────────┘ │
│ │ Mode Switch: [ SWIPE ] [ SIDE-BY-SIDE ]            │ │ ┌─────────────────────────────────────┐ │
│ │ Synchronized Pan/Zoom · Pixel Reticle              │ │ │ TABULAR METRIC MATRIX               │ │
│ │ True Color (TCI) vs Spectral Heatmap               │ │ │ 4-Column Dense GIS Properties Table │ │
│ └────────────────────────────────────────────────────┘ │ └─────────────────────────────────────┘ │
│                                                        │ ┌─────────────────────────────────────┐ │
│ ┌────────────────────────────────────────────────────┐ │ │ SENTINEL-1 SAR COHERENCE LEDGER   │ │
│ │ STEREO CHANGE DETECTION RASTER                     │ │ │ Radar Penetration & Cloud Pierce    │ │
│ │ Tri-Band Shift Map · 10m Ground Resolution         │ │ └─────────────────────────────────────┘ │
│ └────────────────────────────────────────────────────┘ │ ┌─────────────────────────────────────┐ │
│                                                        │ │ SATELLITE PROVENANCE INSPECTOR      │ │
│                                                        │ │ Sensor, Sun El/Az, Baseline, Granule│ │
│                                                        │ └─────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┴─────────────────────────────────────────┤
│ STATUS DOCK: Coordinate Footprint · Resolution 10m/px · UTM Zone · Pipeline Latency             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Industrial Information Density Standards
* **Property-Value Pairs**: Key-value data must use horizontal monospace alignments with right-aligned numbers and left-aligned labels.
* **No Artificial Centering**: Headers, labels, descriptions, and data tables are strictly left-aligned to establish a clean scan line down the left margin.
* **Compact Height Tokens**: Control rows and table rows are capped at 28px–32px to maximize data visibility without vertical pagination.

---

## 3. Typography & Typesetting Engine

### 3.1 Strict Prohibition of Novelty Script
* **Banned**: All decorative cursive handwriting fonts (*Playfair Display Italic*, *Caveat*, *Great Vibes*, *Dancing Script*) are removed from all technical and scientific dashboards.
* **Principle**: Geospatial telemetry requires geometric precision and unambiguous legibility under all zoom levels and display resolutions.

### 3.2 Engineered Typographic Pairing
1. **Primary Interface & Display Grotesque**:
   - **Font**: `Geist Sans`, `General Sans`, or `Inter` (geometric neo-grotesque).
   - **Characteristics**: Neutral geometry, high x-height, tabular numerals capability, zero stylistic distractions.
   - **Tracking**: Tight display tracking (`-0.025em`) on headings; normal tracking (`-0.01em`) on body text.
2. **Technical Telemetry & Quantitative Data**:
   - **Font**: `JetBrains Mono` or `IBM Plex Mono`.
   - **Characteristics**: Crisp square punctuation, distinct zero (`0` with dot or slash), unambiguous `l`, `1`, `I` distinction.
   - **Enforcement**: Applied to all coordinates, spectral percentages, dates, granules, UTM zones, and telemetry values with `font-variant-numeric: tabular-nums`.

### 3.3 Standard Typographic Scale

| Token | Size | Line Height | Weight | Tracking | Target Element |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display` | `24px` | `28px` | 600 | `-0.025em` | Primary workspace title |
| `text-section` | `14px` | `18px` | 600 | `-0.015em` | Bento tile headers, module titles |
| `text-body` | `13px` | `18px` | 400 | `-0.005em` | Technical narrative, documentation |
| `text-meta` | `11px` | `15px` | 500 | `+0.020em` | Table headers, chip titles, sensor IDs |
| `text-telemetry`| `10px` | `13px` | 500 | `+0.050em` | Coordinates, true anomaly, orbital speed |

---

## 4. Technical Voice & Editorial Standards

### 4.1 Banned Generative Buzzwords
The following terms are banned from the codebase, UI copy, and backend narrative synthesis:
> ❌ *Unleash, Supercharge, Seamlessly, Redefine, Turbocharge, Delve, Paramount, Elevate, Reimagined, Magic, Next-Gen, Groundbreaking.*

### 4.2 Technical Clarity Examples

| AI Template Cliché (Banned) | SatQuery Engineering Standard (Required) |
| :--- | :--- |
| *"Unleash AI power to seamlessly supercharge your Earth analytics."* | *"Query 10-meter Sentinel-2 MSI surface reflectance paired with Sentinel-1 SAR C-band backscatter."* |
| *"Elevate your environmental insights with cutting-edge detection."* | *"Bi-temporal NDVI differencing across 4,000-meter bounding box with cloud-mask thresholding."* |
| *"Delve into magical orbital changes reimagined for everyone."* | *"Detected 2.41 km² vegetation decline (p < 0.01) corroborated by dual-polarization VV/VH backscatter."* |

### 4.3 Asymmetric Sentence Cadence
Avoid predictable LLM cadence (one 6-word punchline followed by two 16-word sentences). Use concise technical fragments followed by dense analytical commentary:
> *"10m resolution. Sentinel-2A pass recorded at 05:42 UTC. Surface reflectance indicates an 8.4% moisture reduction across the agricultural sector; stable backscatter in Sentinel-1 indicates soil structure integrity without structural deforestation."*

---

## 5. Imagery, UI Chrome & Iconography Standards

### 5.1 Elimination of Abstract Illustrations
* **Banned**: Midjourney/DALL-E illustrations, floating glass spheres, pastel isometric hands, generic 3D neon cubes.
* **Required**: Real functional satellite data layers, authentic orbital telemetry, actual GeoTIFF/PNG rasters generated by Google Earth Engine.

### 5.2 Context-Accurate SVG Iconography (Replacement of Sparkles ✨)
* **Banned**: 4-point sparkle (`✨`) for searches, filters, and AI summaries.
* **Required**:
  - Location Search: Crosshair reticle (`⌖` / `lucide:crosshair`)
  - Spectral Bands: Split-raster matrix (`lucide:layers`)
  - SAR Verification: Microwave radar cone (`lucide:radar`)
  - Coordinate Copy: Clipboard with bounding box (`lucide:copy`)
  - Temporal Range: Discrete date range slider (`lucide:calendar-range`)

### 5.3 Real Technical UI Chrome
* **Window Headers**: Every panel features an authentic header with status indicator dots, mono breadcrumb tags (`S2A // L2A // B8A-B4`), and close/maximize controls.
* **Coordinate Overlay Tags**: Overlays on satellite imagery must display pixel dimensions ($512 \times 512$), ground sample distance ($10\text{ m/px}$), and center coordinate (`lat, lng`).

---

## 6. Real-World 3D Earth Digital Twin & WebGL Zero-Failure Architecture

### 6.1 Root Causes of Failure in Previous Implementations
1. **Multiple Context Loss**: Spawning secondary `WebGLRenderer` instances in telemetry preview boxes exhausted GPU WebGL contexts.
2. **Target Marker Submersion**: Target coordinates plotted at unit radius $R=1$ were buried inside the planet sphere geometry of radius $R=2$.
3. **Euler Axis Inversion**: Camera rotation using nested Euler angle assignments caused gimbal lock and inverted viewports on Southern Hemisphere coordinates.
4. **Procedural Noise Artifacts**: Generating textures with sine-cosine noise created an unconvincing, alien surface rather than accurate continental landmasses.

### 6.2 Zero-Failure WebGL Implementation Rules

```
┌────────────────────────────────────────────────────────────────────────┐
│ THREE.JS ENGINE SPECIFICATION                                          │
│                                                                        │
│ 1. SINGLETON RENDERER: Exactly ONE WebGL context per browser window.  │
│ 2. RADIUS FORMULATION: Globe radius = R (2.0).                         │
│    Target marker radius = R * 1.012 (2.024) -> Anchored on surface.    │
│ 3. CAMERA MATH: Quaternion.setFromUnitVectors() for target fly-to.     │
│ 4. ORBIT MECHANICS: Sentinel-2 Sun-Synchronous Polar Orbit (98.6° inc). │
│ 5. TEXTURE PIPELINE: Equirectangular vector landmass canvas fallback   │
│    + progressive NASA Blue Marble asynchronous streaming.              │
└────────────────────────────────────────────────────────────────────────┘
```

#### Exact Mathematical Vector Projection Formula
To anchor any geographical coordinate $(\phi = \text{lat}, \lambda = \text{lng})$ precisely on the globe surface without distortion:

$$\phi_{\text{rad}} = \text{lat} \times \frac{\pi}{180}, \quad \lambda_{\text{rad}} = \text{lng} \times \frac{\pi}{180}$$

$$X = R \cdot \cos(\phi_{\text{rad}}) \cdot \sin(\lambda_{\text{rad}})$$
$$Y = R \cdot \sin(\phi_{\text{rad}})$$
$$Z = R \cdot \cos(\phi_{\text{rad}}) \cdot \cos(\lambda_{\text{rad}})$$

#### Quaternion Camera Slerp Transition
To eliminate gimbal lock and achieve smooth camera transitions when the user selects a new target:

```javascript
// Target vector on globe surface
const targetNormal = new THREE.Vector3(X, Y, Z).normalize();
const cameraDirection = new THREE.Vector3(0, 0.2, 1).normalize();

// Compute minimum arc rotation quaternion
const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(targetNormal, cameraDirection);
const startQuaternion = globeGroup.quaternion.clone();

// Slerp interpolation over 1.6s
gsap.to(transitionProgress, {
  t: 1,
  duration: 1.6,
  ease: "power3.inOut",
  onUpdate: () => {
    globeGroup.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, transitionProgress.t);
  }
});
```

#### Continental Geometry Fallback Generator
When external NASA Blue Marble textures are delayed or offline, the fallback texture generator must construct exact continental boundaries on a 2:1 Equirectangular canvas:
- Eurasian Plate, Africa, North America, South America, Australia, Antarctica, Greenland, Japan, UK, New Zealand.
- Continental shelf cyan glows (`rgba(18, 92, 118, 0.45)`).
- Biome zoning: Sahara/Arabian/Gobi deserts (`#8c6e3b`), Amazon/Congo rainforests (`#135424`), Arctic/Antarctic ice sheets (`#e8f4fd`).
- Graticule lines spaced at $30^\circ$ latitude/longitude with brightened equator.

---

## 7. Dual Time-Frame Image Inspection System

### 7.1 Architecture: SWIPE vs SIDE-BY-SIDE
The user has explicit control over visual comparison modalities via a segmented switch:

```
[ ⟷ SWIPE SLIDER ]    [ ◫ SIDE-BY-SIDE DUAL CANVAS ]
```

### 7.2 SWIPE Mode Specification
- **Hardware Clip-Path**: High-performance CSS `clip-path: inset(0 0 0 ${v}%)` driven by hardware-accelerated pointer events.
- **Micro-Handle**: Minimalist 2px vertical rule with tactile chevron pill and tabular percentage readout.
- **Labels**: Epoch 1 (TCI True Color) pinned top-left; Epoch 2 (Spectral Heatmap) pinned top-right.

### 7.3 SIDE-BY-SIDE Mode Specification
- **Synchronized Viewports**: Two independent canvas/image elements locked to identical zoom ($1.0\times - 6.0\times$) and pan coordinates $(X, Y)$.
- **Linked Crosshair**: Moving the cursor over Frame A renders an identical micro-reticle at the corresponding pixel coordinate in Frame B.
- **On-Click Pixel $\Delta$-Probe**: Clicking any point queries `/api/pixel` to display exact spectral values:
  $$\Delta \text{NDVI} = \text{NDVI}_{\text{Epoch 2}} - \text{NDVI}_{\text{Epoch 1}}$$
  Displaying raw reflectance values for Band 8 (NIR) and Band 4 (Red).

---

## 8. State Handling, Edge Cases & Non-Happy Paths

### 8.1 Defensive UI Edge-Case Matrix

| Edge Case | Failure Mode | Required Engineering Solution |
| :--- | :--- | :--- |
| **Long Location Strings** | Label overflow / layout break | `max-w-[280px] truncate` with native `<abbr>` or tooltip showing full 60-character address. |
| **GEE Cloud Memory Limit** | `User memory limit exceeded` | Backend enforce `tileScale: 4`, `bestEffort: true`, downsampling from $30\text{m} \to 60\text{m} \to 100\text{m}$. |
| **Heavy Cloud Cover** | Occluded Sentinel-2 imagery | Automatic warning badge: `☁ 48% Cloud Cover · Spectral confidence reduced`, suggest SAR switch. |
| **Slow Network Link** | Blank screens / broken images | Progressive skeleton pulse with live elapsed timer (`00:04`) and descriptive stage readout. |
| **WebGL Context Lost** | Frozen black canvas | Register `webglcontextlost` and `webglcontextrestored` listeners; auto-rebuild scene. |
| **GEE Auth Expiration** | Silent API 500 error | Global health pill updates to crimson `EE Cloud: Offline` with copyable re-auth command. |

### 8.2 Tactile Micro-Interactions
- **Physical Button Press**: Buttons depress on click using `active:scale-[0.98]` and `active:translate-y-[0.5px]`.
- **Keyboard Focus Rings**: Native `:focus-visible` triggers an unambiguous `ring-1 ring-sky-400 ring-offset-1 ring-offset-[#080c14]`.
- **Haptic Tone**: Hover states brighten border tokens by 15% without jarring layout shifts or resizing.

---

## 9. Technical & Engineering Details

### 9.1 Semantic HTML Structure
Replace nested `div` soups with native HTML5 semantics:
- `<header class="top-command-bar">` for brand, search, and global telemetry.
- `<main class="workspace-grid">` for the Bento arrangement.
- `<section class="bento-tile">` for each modular workspace card.
- `<aside class="inspector-sidebar">` for analytical controls and tabular metrics.
- `<table class="property-table">` for numerical index comparisons.
- `<dialog class="modal-dialog">` for deep provenance inspectors.
- `<dl>`, `<dt>`, `<dd>` for key-value telemetry pairs.

### 9.2 Global Keyboard Shortcuts System

| Key Combo | Action | UI Indicator |
| :--- | :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Focus location search input | In-input pill: `⌘K` |
| `1` | Select NDVI (Flora) band | Chip tooltip: `Key [1]` |
| `2` | Select NDWI (Aqua) band | Chip tooltip: `Key [2]` |
| `3` | Select NBR (Thermal) band | Chip tooltip: `Key [3]` |
| `S` | Toggle between SWIPE and SIDE-BY-SIDE | Switch tooltip: `Key [S]` |
| `R` | Reset 3D globe camera to standard target | Button tooltip: `Key [R]` |
| `Esc` | Clear search / dismiss active overlay | Toast pill: `ESC` |

---

## 10. Execution & Implementation Checklist

### Phase 1: Palette & Surface Scrubbing
- [ ] Replace `#000000` canvas background with grounded slate `#080c14`.
- [ ] Replace purple/indigo blur gradients with solid charcoal surfaces (`#0d1424`).
- [ ] Remove `backdrop-blur` from data cards; enforce solid opaque contrast.
- [ ] Strip out neon cyan/violet pill borders; replace with subtle `#1e2c4a` border tokens.

### Phase 2: Typography & Copy Sanitization
- [ ] Remove all cursive fonts (`font-script`, `Playfair Display Italic`, `Caveat`).
- [ ] Implement `Geist Sans` / `Inter` for headers and `JetBrains Mono` for all tabular/numerical data.
- [ ] Scrub all banned words (*unleash, supercharge, seamlessly, redefine, delve*).
- [ ] Convert all narrative cards to technical, observational field notes.

### Phase 3: Layout & Asymmetric Bento
- [ ] Convert 3-card equal rows into 2x2 asymmetric Bento configuration.
- [ ] Implement dense property-value tables for spectral metrics.
- [ ] Left-align all headers, descriptions, and metadata pairs.
- [ ] Integrate coordinate reticle overlays on imagery with ground resolution tags.

### Phase 4: 3D Earth Digital Twin Zero-Failure Hardening
- [ ] Guarantee single WebGL context across the entire application lifecycle.
- [ ] Maintain target surface anchoring at radius $R \times 1.012$ with tangent orientation.
- [ ] Ensure quaternion slerp camera targeting operates cleanly on all global coordinates.
- [ ] Maintain 3D Sentinel-2 craft orbit on $98.6^\circ$ Sun-Synchronous Polar path.

### Phase 5: Dual Time-Frame Image Inspection
- [ ] Deliver seamless toggle between `SWIPE` and `SIDE-BY-SIDE` across React and fallback static clients.
- [ ] Maintain synchronized pan/zoom and on-click pixel $\Delta$-probe.
- [ ] Handle 50-character location titles without layout disruption.
- [ ] Implement keyboard shortcuts (`Cmd+K`, `1-3`, `S`, `R`).

---

*SatQuery AI Engineering Blueprint · Released for Immediate Execution*
