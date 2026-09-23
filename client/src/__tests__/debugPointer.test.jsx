import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import SwipeSlider from "@/components/comparison/SwipeSlider";

describe("dbg2", () => {
  it("pointerId variant", () => {
    const { getByTestId } = render(<SwipeSlider beforeUrl="/a.png" afterUrl="/b.png" beforeLabel="A" afterLabel="B" loading={false} />);
    const frame = getByTestId("frame");
    frame.addEventListener("pointerdown", () => console.log("NATIVE FIRED (with pointerId)"));
    frame.dispatchEvent(new (window.PointerEvent || window.MouseEvent)("pointerdown", { bubbles: true, pointerId: 1, clientX: 100 }));
    expect(frame).toBeTruthy();
  });
});
