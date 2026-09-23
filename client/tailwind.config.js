/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#080c14",   // L0 root viewport
        panel: "#0d1424",    // L1 major bento tiles, 3D viewport
        card: "#131c31",     // L2 metric containers, chips, telemetry
        recessed: "#090e1a", // L3 grids, image viewports, code readouts
        float: "#1a2640",    // L4 tooltips, active dropdown items
        line: "#1c2842",     // structural 1px boundary
        rim: "#2c3e66",      // interactive active rim
        sky: "#38bdf8",      // telemetry / reticle / focus
        emerald: "#10b981",  // positive NDVI / EE heartbeat
        amber: "#f59e0b",    // NBR burn scars / SAR shifts
        crimson: "#ef4444",  // destruction / cloud mask / disconnect
        steel: "#64748b",    // sub-labels, graticules, inactive
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "SFMono-Regular", "Consolas", "monospace"],
        script: ["Caveat", "Bradley Hand", "Segoe Script", "Brush Script MT", "cursive"],
      },
      fontSize: {
        display: ["24px", "28px"],
        section: ["14px", "18px"],
        body: ["13px", "18px"],
        meta: ["11px", "15px"],
        telemetry: ["10px", "13px"],
      },
      letterSpacing: {
        display: "-0.025em",
        body: "-0.005em",
        meta: "0.02em",
        telemetry: "0.05em",
      },
    },
  },
  plugins: [],
};