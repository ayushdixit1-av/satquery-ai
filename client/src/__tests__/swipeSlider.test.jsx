import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SwipeSlider from "@/components/comparison/SwipeSlider";

describe("SwipeSlider — dual-epoch swipe (DESIGN.md 7.2)", () => {
  const props = {
    beforeUrl: "/thumb/before.png",
    afterUrl: "/thumb/after.png",
    beforeLabel: "EPOCH 1 · 2020 · TCI RGB",
    afterLabel: "EPOCH 2 · 2025 · NDVI HEATMAP",
    loading: false,
  };

  it("renders both epoch images at once and their labels", () => {
    render(<SwipeSlider {...props} />);
    expect(screen.getByAltText("EPOCH 1 · 2020 · TCI RGB")).toBeInTheDocument();
    expect(screen.getByAltText("EPOCH 2 · 2025 · NDVI HEATMAP")).toBeInTheDocument();
  });

  it("defaults the divider to the centre (50%)", () => {
    const { getByTestId } = render(<SwipeSlider {...props} />);
    expect(getByTestId("divider")).toHaveStyle("left: 50%");
  });

  it("shows no percentage readout on the handle", () => {
    const { getByTestId } = render(<SwipeSlider {...props} />);
    expect(getByTestId("divider")).not.toHaveTextContent("%");
  });

  it("moves the divider to the drag point", () => {
    const view = render(<SwipeSlider {...props} />);
    const PE = window.PointerEvent || window.MouseEvent;
    const frame = view.getByTestId("frame");
    const fire = (type, clientX) =>
      frame.dispatchEvent(new PE(type, { bubbles: true, pointerId: 1, clientX }));
    act(() => {
      fire("pointerdown", 100);
      fire("pointermove", 300);
      fire("pointerup", 300);
    });
    expect(view.getByTestId("divider")).not.toHaveStyle("left: 50%");
  });
});