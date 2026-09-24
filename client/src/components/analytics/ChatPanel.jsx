import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { API_BASE } from "@/hooks/useEarthEngine";
import PanelHeader from "@/components/common/PanelHeader";
import { cn } from "@/lib/utils";

/** Comparison copilot — ask anything about the two selected epoch images (DESIGN.md §7). */
export default function ChatPanel({ onClose, context }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history: next, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Chat request failed");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `⚠ SIGNAL LOST — ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const area = context?.area || "SELECTED FOOTPRINT";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas/60">
      <button className="absolute inset-0 z-0 cursor-default" aria-label="Close chat" onClick={onClose} tabIndex={-1} />
      <section className="tile relative z-10 mx-auto my-6 flex h-[min(720px,calc(100vh-3rem))] w-full max-w-2xl flex-col overflow-hidden">
        <PanelHeader
          title="Comparison Copilot"
          crumbs={["GEMINI", "2-IMG", context?.epochs?.s1?.slice(0, 4) + "→" + context?.epochs?.s2?.slice(0, 4)]}
          tone="emerald"
          right={
            <button className="btn-press flex items-center gap-1 rounded border border-line bg-recessed px-2 py-1 t-telemetry text-steel hover:text-crimson" onClick={onClose}>
              <X size={11} /> CLOSE
            </button>
          }
        />

        {/* the two selected epoch images */}
        <div className="grid grid-cols-2 gap-3 border-b border-line bg-recessed/40 p-3">
          {[
            { label: "EPOCH 1 · BASELINE", url: context?.image1, meta: context?.scene1 },
            { label: "EPOCH 2 · CURRENT", url: context?.image2, meta: context?.scene2 },
          ].map(({ label, url, meta }) => (
            <div key={label} className="relative h-28 overflow-hidden rounded-[4px] border border-line bg-panel">
              {url ? (
                <img src={url} alt={label} className="h-full w-full object-cover" draggable="false" />
              ) : (
                <div className="flex h-full items-center justify-center t-telemetry text-steel">AWAITING PASS</div>
              )}
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded border border-line bg-canvas/70 px-1.5 py-0.5 t-telemetry text-emerald">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 t-telemetry text-steel">
          <MessageSquare size={11} className="text-sky" />
          <span className="truncate">{area} — ask anything about the comparison or either epoch image</span>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.length === 0 && (
            <p className="rounded border border-line/60 bg-recessed p-3 text-body leading-relaxed text-slate-300">
              I'm loaded with both epoch images of <span className="text-emerald">{area}</span>. Ask about change,
              vegetation, surface water, urban growth, or what a specific detail in either image means.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-[4px] border px-3 py-2 text-body leading-relaxed",
                  m.role === "user"
                    ? "border-rim bg-float text-slate-100"
                    : "border-line bg-recessed text-slate-300",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded border border-line bg-recessed px-3 py-2 text-body text-steel">
                <span className="animate-pulse">ANALYZING IMAGE PAIR…</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line p-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="ask about this area… (Enter to send)"
            className="h-10 flex-1 rounded border border-line bg-recessed px-3 text-body text-slate-200 placeholder:text-steel focus-visible:border-rim"
            disabled={busy}
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="btn-press flex h-10 items-center gap-2 rounded border border-rim bg-float px-3 t-telemetry text-emerald hover:text-slate-100 disabled:opacity-40"
          >
            <Send size={13} /> SEND
          </button>
        </div>
      </section>
    </div>
  );
}