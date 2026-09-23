import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEarthEngine } from "@/hooks/useEarthEngine";

const API = "http://localhost:8000";

function Probe() {
  const h = useEarthEngine();
  return (
    <div>
      <button onClick={() => h.search("Kanpur")}>GO</button>
      <span data-testid="loading">{String(h.loading)}</span>
      <span data-testid="lat">{h.location?.lat ?? "none"}</span>
      <span data-testid="before">{h.before?.image_url ?? "none"}</span>
    </div>
  );
}

describe("useEarthEngine — imagery lifecycle (DESIGN.md §7)", () => {
  it("searches a location then fetches scene/index/change", async () => {
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ name: "Kanpur", lat: 26.4499, lng: 80.3319 }))
      .mockResolvedValueOnce(json({ image_url: "/thumb/b.png", date: "2020-06-01" }))
      .mockResolvedValueOnce(json({ image_url: "/thumb/a.png" }))
      .mockResolvedValueOnce(json({ change_pct: 4.2 }));

    render(<Probe />);
    screen.getByText("GO").click();

    await waitFor(() => expect(screen.getByTestId("lat")).toHaveTextContent("26.4499"));
    await waitFor(() => expect(screen.getByTestId("before")).toHaveTextContent("/thumb/b.png"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/search?q=Kanpur"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/img?"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/index?"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/change?"));

    fetchMock.mockRestore();
  });
});