import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import gsap from "gsap";

/**
 * 3D Earth Digital Twin — v4.0 §6. Zero-failure WebGL.
 *  - Single WebGL context for the whole application.
 *  - Globe radius R=2.0; target marker anchored at R*1.012 with tangent orientation.
 *  - Quaternion setFromUnitVectors + slerp camera transition (no Euler gimbal lock).
 *  - Sentinel-2 Sun-Synchronous (98.6° inc) polar orbit spacecraft.
 *  - Vector continental fallback + progressive NASA Blue Marble streaming.
 */
const R = 2;
const MARKER_R = R * 1.012;
const SUN_SSYNC_INC = 8.6; // orbit plane tilt from the polar axis â†’ 98.6° inclination

function llToUnit(lat, lng) {
  const phi = THREE.MathUtils.degToRad(lat);
  const lam = THREE.MathUtils.degToRad(lng);
  return new THREE.Vector3(
    Math.cos(phi) * Math.sin(lam),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(lam),
  );
}

const DAY_TEXTURES = [
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
];
const BUMP_TEXTURE = "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";

/* Continental geometry fallback (DESIGN.md §6.2) — 2:1 equirectangular vector map. */
const CONTINENTS = [
  { name: "North America", pts: [[-167,67],[-164,60],[-158,57],[-150,58],[-140,58],[-132,54],[-128,50],[-124,49],[-124,40],[-121,33],[-118,32],[-112,29],[-111,24],[-106,21],[-98,17],[-94,15],[-84,11],[-81,9],[-78,8],[-72,10],[-66,11],[-62,13],[-60,45],[-64,49],[-66,60],[-64,70],[-74,78],[-92,73],[-110,72],[-130,70],[-150,66]] },
  { name: "Greenland", pts: [[-45,60],[-42,64],[-38,66],[-34,68],[-28,70],[-22,72],[-18,77],[-20,81],[-38,83],[-56,81],[-66,76],[-68,73],[-58,68],[-50,62]] },
  { name: "South America", pts: [[-77,8],[-80,0],[-81,-5],[-77,-9],[-73,-17],[-71,-20],[-69,-22],[-66,-27],[-64,-33],[-61,-39],[-58,-45],[-56,-51],[-65,-55],[-68,-54],[-70,-50],[-73,-45],[-76,-39],[-81,-32],[-78,-22],[-82,-18],[-80,-12],[-76,-6],[-72,3]] },
  { name: "Europe", pts: [[-9,36],[-9,42],[-4,44],[-4,50],[8,58],[14,60],[21,59],[27,64],[34,57],[30,52],[26,47],[22,45],[18,43],[16,40],[12,38],[6,36],[-2,35]] },
  { name: "Africa", pts: [[-17,15],[-17,20],[-14,25],[-10,30],[-5,36],[-2,37],[8,38],[12,34],[20,32],[24,31],[30,28],[32,22],[36,19],[40,13],[44,11],[48,9],[50,6],[49,1],[46,-5],[42,-9],[40,-14],[40,-19],[38,-25],[35,-30],[32,-34],[28,-30],[20,-30],[16,-26],[14,-20],[12,-15],[9,-10],[4,-6],[-9,-5],[-13,-8],[-17,-5],[-17,-2],[-14,4],[0,6],[-4,10],[-8,12],[-12,14]] },
  { name: "Asia", pts: [[34,28],[40,32],[56,37],[58,42],[53,46],[48,52],[42,52],[40,56],[44,61],[40,66],[50,70],[58,72],[66,78],[84,63],[88,53],[96,46],[104,42],[112,39],[120,35],[126,38],[129,43],[128,49],[132,56],[134,60],[142,58],[148,53],[152,50],[158,58],[158,65],[164,68],[170,68],[178,64],[180,61],[174,56],[160,52],[152,47],[150,43],[145,42],[141,38],[136,33],[131,31],[126,30],[120,28],[112,26],[108,22],[104,18],[99,16],[97,10],[93,8],[89,5],[87,8],[82,9],[78,9],[76,7],[74,10],[72,5],[70,9],[66,13],[60,12],[56,12],[52,16],[48,18],[44,20],[40,24],[36,26]] },
  { name: "Australia", pts: [[114,-22],[113,-26],[115,-31],[115,-35],[118,-38],[122,-39],[127,-38],[132,-38],[138,-38],[141,-37],[146,-40],[147,-35],[151,-35],[153,-32],[153,-28],[152,-24],[150,-21],[148,-17],[145,-15],[141,-14],[138,-17],[135,-17],[132,-20],[128,-20],[124,-19],[120,-20],[117,-22]] },
  { name: "Japan", pts: [[130,31],[133,33],[137,35],[141,39],[143,42],[143,45],[140,44],[136,42],[132,39],[130,36],[130,32]] },
  { name: "UK", pts: [[-5,50],[-2,51],[1,52],[1,54],[-2,56],[-3,58],[-5,58],[-5,54]] },
  { name: "New Zealand", pts: [[173,-35],[176,-37],[178,-39],[177,-44],[174,-47],[171,-44],[170,-40],[171,-36]] },
  { name: "Antarctica", pts: [[-60,-63],[-60,-70],[-75,-69],[-100,-70],[-120,-73],[-140,-73],[-160,-68],[-180,-70],[180,-72],[150,-72],[130,-68],[110,-68],[90,-66],[70,-68],[50,-66],[30,-68],[10,-68],[-10,-68],[-30,-66],[-50,-66]] },
];

const GEOZONES = {
  desert: [
    [[-17,15],[-17,20],[-14,25],[-5,36],[-2,37],[0,32],[-5,25],[-12,18]],
    [[38,28],[42,26],[46,26],[46,22],[42,22],[38,24]],
    [[88,36],[96,40],[104,44],[108,43],[102,39],[94,36]],
  ],
  forest: [
    [[-74,1],[-71,-2],[-66,-4],[-59,-3],[-55,-5],[-57,-10],[-64,-9],[-69,-6],[-73,-2]],
    [[10,4],[16,2],[22,3],[27,1],[25,-3],[19,-4],[13,-2]],
  ],
};

function makeLandmassTexture() {
  const W = 2048, H = 1024;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");

  g.fillStyle = "#0a2432";
  g.fillRect(0, 0, W, H);

  const px = (lon) => ((lon + 180) / 360) * W;
  const py = (lat) => ((90 - lat) / 180) * H;

  for (const c of CONTINENTS) {
    const path = new Path2D();
    c.pts.forEach(([lon, lat], i) => {
      const x = px(lon), y = py(lat);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();
    if (c.name !== "Antarctica") {
      g.strokeStyle = "rgba(18,92,118,0.45)";
      g.lineWidth = 6;
      g.lineJoin = "round";
      g.stroke(path);
    }
    let fill = "#153228";
    if (c.name === "Antarctica") fill = "#e8f4fd";
    else if (c.name === "Greenland" || c.name === "UK" || c.name === "Japan") fill = "#2a3540";
    g.fillStyle = fill;
    g.fill(path);
  }

  for (const [kind, zones] of Object.entries(GEOZONES)) {
    for (const pts of zones) {
      const path = new Path2D();
      pts.forEach(([lon, lat], i) => {
        const x = px(lon), y = py(lat);
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
      g.fillStyle = kind === "desert" ? "#8c6e3b" : "#135424";
      g.fill(path);
    }
  }

  // graticules @30°, brightened equator
  g.strokeStyle = "rgba(70,120,160,0.28)";
  g.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    g.moveTo(0, py(lat));
    g.lineTo(W, py(lat));
    g.stroke();
  }
  for (let lon = -150; lon < 180; lon += 30) {
    g.beginPath();
    g.moveTo(px(lon), 0);
    g.lineTo(px(lon), H);
    g.stroke();
  }
  g.strokeStyle = "rgba(56,189,248,0.5)";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, py(0));
  g.lineTo(W, py(0));
  g.stroke();

  return cv;
}

const ATMOS_VERT = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const ATMOS_FRAG = `
varying vec3 vNormal;
void main() {
  float f = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
  gl_FragColor = vec4(0.35, 0.55, 0.9, 0.35 * f);
}`;

const EarthGlobe = forwardRef(function EarthGlobe({ lat, lng, targetName }, ref) {
  const mountRef = useRef(null);
  const instRef = useRef(null);

  useImperativeHandle(ref, () => ({ reset: () => instRef.current?.reset() }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let disposed = false;
    let cleanup = null;

    const attrs = {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: true,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    };
    const tryCreateRenderer = () => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs);
      if (!gl) return null;
      try {
        return new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
      } catch {
        return null;
      }
    };

    const boot = () => {
      if (disposed || !mount || !renderer) return;
      const width = mount.clientWidth || 640;
      const height = mount.clientHeight || 460;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(46, width / height || 1, 0.1, 100);
      camera.position.set(0, 0.35, 6.4);
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      mount.appendChild(renderer.domElement);

      const globeGroup = new THREE.Group();
      scene.add(globeGroup);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3.6;
      controls.maxDistance = 13;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;

      scene.add(new THREE.AmbientLight("#2a3a55", 1.1));
      const sun = new THREE.DirectionalLight("#ffffff", 2.8);
      sun.position.set(5, 3, 6);
      scene.add(sun);

      const mapTex = new THREE.CanvasTexture(makeLandmassTexture());
      mapTex.colorSpace = THREE.SRGBColorSpace;
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(R, 128, 128),
        new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.98, metalness: 0.02 }),
      );
      globeGroup.add(earth);

      const atmos = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.06, 96, 96),
        new THREE.ShaderMaterial({
          vertexShader: ATMOS_VERT,
          fragmentShader: ATMOS_FRAG,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        }),
      );
      globeGroup.add(atmos);

      // progressive NASA streaming (DESIGN.md §6.2 rule 5)
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const tryNet = () => {
        if (disposed) return;
        let done = false;
        for (const url of DAY_TEXTURES) {
          loader.load(
            url,
            (t) => {
              if (disposed || done) return;
              done = true;
              t.colorSpace = THREE.SRGBColorSpace;
              earth.material.map = t;
              earth.material.needsUpdate = true;
            },
            undefined,
            () => {},
          );
        }
        loader.load(
          BUMP_TEXTURE,
          (t) => {
            if (disposed) return;
            earth.material.bumpMap = t;
            earth.material.bumpScale = 0.04;
            earth.material.needsUpdate = true;
          },
          undefined,
          () => {},
        );
      };
      window.setTimeout(tryNet, 400);

      // target marker pinned to surface at R*1.012, tangent-oriented (DESIGN.md §6.2 rule 2)
      const marker = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.052, 0.085, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
      );
      const pin = new THREE.Mesh(
        new THREE.PlaneGeometry(0.02, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      pin.position.y = MARKER_R - 0.06;
      marker.add(ring, pin);
      globeGroup.add(marker);

      // Sentinel-2 Sun-Synchronous polar orbit spacecraft (98.6° inclination)
      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.order = "ZXY";
      orbitGroup.rotation.z = THREE.MathUtils.degToRad(SUN_SSYNC_INC);
      const arcPts = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        arcPts.push(new THREE.Vector3(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4));
      }
      orbitGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(arcPts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 }),
        ),
      );
      const track = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        track.push(new THREE.Vector3(Math.cos(a) * R * 1.004, 0, Math.sin(a) * R * 1.004));
      }
      orbitGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(track),
          new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.28 }),
        ),
      );
      const satellite = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      orbitGroup.add(satellite);
      globeGroup.add(orbitGroup);

      // starfield
      const sky = new THREE.BufferGeometry();
      const pts = new Float32Array(760 * 3);
      for (let i = 0; i < 760; i++) {
        const r = 18 + Math.random() * 40;
        const th = Math.acos(2 * Math.random() - 1);
        const ph = Math.random() * Math.PI * 2;
        pts[i * 3] = r * Math.sin(th) * Math.cos(ph);
        pts[i * 3 + 1] = r * Math.sin(th) * Math.sin(ph);
        pts[i * 3 + 2] = r * Math.cos(th);
      }
      sky.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      scene.add(new THREE.Points(sky, new THREE.PointsMaterial({ color: 0x93b8d8, size: 0.05, transparent: true, opacity: 0.85 })));

      const clock = new THREE.Clock();
      const fly = (ln, lt) => {
        const target = llToUnit(lt, ln);
        marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), target.clone().normalize());
        marker.position.copy(target).multiplyScalar(MARKER_R);
        const targetQ = new THREE.Quaternion().setFromUnitVectors(
          target.clone().normalize(),
          new THREE.Vector3(0, 0.2, 1).normalize(),
        );
        const startQ = globeGroup.quaternion.clone();
        const t = { p: 0 };
        gsap.to(t, {
          p: 1,
          duration: 1.6,
          ease: "power3.inOut",
          onUpdate: () => globeGroup.quaternion.slerpQuaternions(startQ, targetQ, t.p),
        });
      };

      const animate = () => {
        if (disposed) return;
        const e = clock.getElapsedTime();
        satellite.position.set(Math.cos(e * 0.28) * 3.4, 0, Math.sin(e * 0.28) * 3.4);
        const pulse = 1 + 0.25 * Math.sin(e * 3);
        pin.scale.set(pulse, 1, pulse);
        controls.update();
        renderer.render(scene, camera);
      };
      renderer.setAnimationLoop(animate);

      const onResize = () => {
        const w = mount.clientWidth, h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      window.addEventListener("resize", onResize);

      const onContextLost = (ev) => {
        ev.preventDefault();
        renderer.setAnimationLoop(null);
      };
      const onContextRestored = () => {
        if (!disposed) renderer.setAnimationLoop(animate);
      };
      renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
      renderer.domElement.addEventListener("webglcontextrestored", onContextRestored, false);

      instRef.current = {
        flyTo: (ln, lt) => fly(ln, lt),
        reset: () => {
          const targetQ = new THREE.Quaternion();
          const startQ = globeGroup.quaternion.clone();
          const t = { p: 0 };
          gsap.to(t, {
            p: 1, duration: 1.2, ease: "power3.inOut",
            onUpdate: () => globeGroup.quaternion.slerpQuaternions(startQ, targetQ, t.p),
          });
        },
      };

      cleanup = () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
        gsap.killTweensOf(globeGroup.quaternion);
        renderer.setAnimationLoop(null);
        controls.dispose();
        renderer.dispose();
        mapTex.dispose();
        instRef.current = null;
        mount.innerHTML = "";
      };
    };

    let renderer = tryCreateRenderer();
    boot();

    if (!renderer) {
      // transient context pressure â†’ one delayed retry; otherwise a precise engineering flag
      const pending = setTimeout(() => {
        if (disposed) return;
        renderer = tryCreateRenderer();
        if (renderer) boot();
        else {
          const note = document.createElement("div");
          note.className =
            "flex h-full w-full flex-col items-center justify-center gap-2 rounded-[6px] border border-line bg-recessed px-6 text-center";
          note.innerHTML =
            '<p class="t-section text-crimson">WEBGL OFFLINE</p>' +
            '<p class="t-telemetry text-steel">enable hardware acceleration / WebGL2, then reload</p>' +
            '<button class="mt-1 rounded border border-rim bg-float px-3 py-1 t-meta text-sky">RE-INITIALIZE</button>';
          note.querySelector("button").onclick = () => window.location.reload();
          mount.appendChild(note);
        }
      }, 900);
      return () => {
        disposed = true;
        clearTimeout(pending);
        cleanup?.();
        if (mount) mount.innerHTML = "";
      };
    }

    return () => {
      disposed = true;
      cleanup?.();
      if (mount) mount.innerHTML = "";
    };
  }, []);

  /* fly-to on coordinate change without rebuilding the WebGL scene */
  useEffect(() => {
    instRef.current?.flyTo(lng ?? 80.33, lat ?? 26.45);
  }, [lat, lng]);

  return (
    <div
      ref={mountRef}
      className="relative h-full w-full"
      role="img"
      aria-label={`3D Earth digital twin — ${targetName ?? "operator target"}`}
    >
      {!targetName && (
        <span className="pointer-events-none absolute left-3 top-3 z-10 rounded border border-line bg-canvas/70 px-2 py-1 t-telemetry text-steel">
          WEBGL · R=2.0 · MARKER R×1.012
        </span>
      )}
    </div>
  );
});

export default EarthGlobe;