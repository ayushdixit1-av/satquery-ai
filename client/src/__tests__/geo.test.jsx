import { describe, expect, it } from "vitest";
import { geoFromUV } from "@/components/comparison/DualCanvas";

describe("geoFromUV — canvas UV → geographic (DESIGN.md §7.3)", () => {
  const center = { lat: 26.4499, lng: 80.3319 };

  it("maps the canvas centre back to the centre coordinate", () => {
    const g = geoFromUV(0.5, 0.5, center);
    expect(g.lat).toBeCloseTo(center.lat, 4);
    expect(g.lng).toBeCloseTo(center.lng, 4);
  });

  it("maps top-left toward north-west", () => {
    const g = geoFromUV(0, 0, center);
    expect(g.lat).toBeGreaterThan(center.lat);
    expect(g.lng).toBeLessThan(center.lng);
  });

  it("maps bottom-right toward south-east within the 8 km footprint", () => {
    const g = geoFromUV(1, 1, center);
    expect(g.lat).toBeLessThan(center.lat);
    expect(g.lng).toBeGreaterThan(center.lng);
    expect(Math.abs(g.lat - center.lat) * 111.32).toBeLessThan(9);
  });
});