import { useEffect, useCallback } from "react";

/**
 * Global keyboard shortcuts (DESIGN.md §9.2):
 * Cmd/Ctrl+K focus search · 1/2/3 spectral bands · S toggle inspect mode · R reset globe · Esc dismiss.
 */
export function useKeyboard({ onSearchFocus, onBand, onToggleMode, onResetGlobe }) {
  const handler = useCallback(
    (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearchFocus?.();
        return;
      }
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if (typing) return;
      if (e.key === "1") onBand("ndvi");
      else if (e.key === "2") onBand("ndwi");
      else if (e.key === "3") onBand("nbr");
      else if (e.key.toLowerCase() === "s") onToggleMode?.();
      else if (e.key.toLowerCase() === "r") onResetGlobe?.();
      else if (e.key === "Escape") document.activeElement?.blur();
    },
    [onSearchFocus, onBand, onToggleMode, onResetGlobe],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}