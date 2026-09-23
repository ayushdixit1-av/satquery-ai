import PanelHeader from "@/components/common/PanelHeader";
import SwipeSlider from "@/components/comparison/SwipeSlider";

/** Compact before/after strip with a centre slider (DESIGN.md 7.2). */
export default function CompareCard({ beforeUrl, afterUrl, beforeLabel, afterLabel, loading }) {
  return (
    <section className="tile flex flex-col overflow-hidden">
      <PanelHeader title="Before / After Compare" crumbs={["SLIDER", "DUAL IMAGE"]} tone="amber" />
      <div className="p-3">
        <SwipeSlider
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          loading={loading}
          frameClassName="h-[240px] min-h-[160px]"
        />
      </div>
    </section>
  );
}