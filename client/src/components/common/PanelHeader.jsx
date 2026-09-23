import { Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Window chrome header: status dots, title, breadcrumb tags, window controls (DESIGN.md §5.3). */
export default function PanelHeader({
  title,
  crumbs,
  tone = "sky",
  right,
  className,
}) {
  return (
    <header className={cn("flex h-[34px] items-center gap-3 border-b border-line px-3", className)}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
        <span className={cn("h-2 w-2 rounded-full", tone === "emerald" ? "bg-emerald" : tone === "amber" ? "bg-amber" : "bg-sky")} />
        <span className="h-2 w-2 rounded-full bg-canvas/60" />
      </div>
      <span className="font-script text-[17px] leading-[22px] text-slate-100">{title}</span>
      {crumbs && (
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="spectral breadcrumb">
          {crumbs.map((c) => (
            <span key={c} className="mono rounded border border-line bg-recessed px-1.5 py-0.5 text-[9px] tracking-wider text-steel">
              {c}
            </span>
          ))}
        </nav>
      )}
      <div className="ml-auto flex items-center gap-1" aria-hidden="true">
        <button className="btn-press rounded px-1.5 py-0.5 text-steel hover:text-slate-200" tabIndex={-1} type="button">
          <Minus size={12} />
        </button>
        <button className="btn-press rounded px-1.5 py-0.5 text-steel hover:text-slate-200" tabIndex={-1} type="button">
          <Square size={10} />
        </button>
        <button className="btn-press rounded px-1.5 py-0.5 text-steel hover:text-crimson" tabIndex={-1} type="button">
          <X size={12} />
        </button>
      </div>
      {right}
    </header>
  );
}