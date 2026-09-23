import { useEffect, useRef } from "react";
import { Crosshair, Satellite, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

/** Top command bar: system status, location search (Cmd+K), orbital telemetry (2.1). */
export default function TopCommandBar({ ee, location, onSearch }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const v = inputRef.current?.value.trim();
    if (v) onSearch(v);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[rgba(13,20,36,0.88)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-4 px-6">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-sky" />
          <span className="t-section tracking-tighter">SATQUERY</span>
          <span className="hidden font-script text-base text-sky/90 md:inline">endless orbit intelligence workbench</span>
        </div>

        <form onSubmit={submit} className="relative mx-auto w-full max-w-md">
          <Crosshair className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-steel" size={13} />
          <input
            ref={inputRef}
            type="text"
            placeholder={location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "search place or lat,lng…"}
            aria-label="Location search"
            className="h-8 w-full rounded-[4px] border border-line bg-recessed pl-8 pr-12 text-body text-slate-200 placeholder:text-steel focus-visible:border-rim"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-panel px-1.5 py-0.5 text-[9px] text-steel">
            ⌘K
          </kbd>
        </form>

        <div className="ml-auto flex items-center gap-4">
          <div className={cn("flex items-center gap-2 rounded border px-2.5 py-1 t-telemetry", ee ? "border-emerald/40 text-emerald" : "border-crimson/50 text-crimson")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", ee ? "bg-emerald" : "bg-crimson animate-pulse")} />
            {ee ? "EE CLOUD: ACTIVE" : "EE CLOUD: OFFLINE"}
          </div>
          <div className="hidden items-center gap-2 t-telemetry text-steel xl:flex">
            <Satellite size={12} className="text-sky" />
            S2A · 786 KM · SSO 98.6° · 10:30 LDTC
          </div>
        </div>
      </div>
    </header>
  );
}