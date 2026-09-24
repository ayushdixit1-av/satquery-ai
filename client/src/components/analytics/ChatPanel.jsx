import { useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, Cpu, Droplets, Leaf, MessageSquare, Send, Sprout, Timer, X } from "lucide-react";
import { API_BASE } from "@/hooks/useEarthEngine";
import PanelHeader from "@/components/common/PanelHeader";
import { cn } from "@/lib/utils";

/** Inline renderer: **bold** segments + fallback plain spans. */
function Rich({ text }) {
  const clean = String(text ?? "").replace(/^\s+/, "");
  return clean.split(/\*\*(.+?)\*\*/g).map((p, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-emerald">
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** Split "## Section" blocks. */
function splitSections(text) {
  const sections = [];
  for (const raw of text.split("\n")) {
    const m = raw.match(/^##\s+(.+?)\s*$/);
    if (m) {
      sections.push({ title: m[1], lines: [] });
      continue;
    }
    if (sections.length) sections[sections.length - 1].lines.push(raw);
  }
  return sections;
}

/** Split "### Category" blocks inside a section. */
function splitH3(lines) {
  const blocks = [];
  for (const raw of lines) {
    const m = raw.match(/^###\s+(.+?)\s*$/);
    if (m) {
      blocks.push({ title: m[1], body: [] });
      continue;
    }
    if (blocks.length) blocks[blocks.length - 1].body.push(raw.trim());
  }
  return blocks;
}

/** Fields like "**Observation:** text". */
function parseFields(lines) {
  const fields = [];
  for (const raw of lines) {
    const m = raw.match(/^\*\*([A-Za-z][^*]*?):\*\*\s*(.*)$/);
    if (m) {
      fields.push({ label: m[1], text: [m[2]] });
      continue;
    }
    if (fields.length && raw) fields[fields.length - 1].text.push(raw);
  }
  return fields.map((f) => ({ ...f, text: f.text.filter(Boolean).join(" ") }));
}

/** Bullet items "- **label:** text". */
function parseLabelled(lines) {
  const out = [];
  for (const raw of lines) {
    const m = raw.match(/^\s*-\s*\*\*([^*]+):\*\*\s*(.*)$/);
    if (m) out.push({ label: m[1], text: m[2] });
  }
  return out;
}

const CATS = [
  {
    re: /vegetation|crop|veg/i,
    label: "VEGETATION",
    icon: Leaf,
    frame: "border-emerald/25 bg-emerald/[0.05]",
    iconCls: "text-emerald",
    fieldCls: "text-emerald/80",
  },
  {
    re: /water|hydro|wet/i,
    label: "WATER",
    icon: Droplets,
    frame: "border-sky/25 bg-sky/[0.05]",
    iconCls: "text-sky",
    fieldCls: "text-sky/80",
  },
  {
    re: /urban|built/i,
    label: "BUILT-UP",
    icon: Building2,
    frame: "border-amber/25 bg-amber/[0.05]",
    iconCls: "text-amber",
    fieldCls: "text-amber/80",
  },
  {
    re: /agri|bare|soil/i,
    label: "AGRICULTURE",
    icon: Sprout,
    frame: "border-[#a3e635]/30 bg-[#a3e635]/[0.06]",
    iconCls: "text-[#a3e635]",
    fieldCls: "text-[#a3e635]/80",
  },
];

const CONF_MAP = [
  { re: /high confidence/i, pct: 85, dot: "bg-emerald", bar: "bg-emerald" },
  { re: /moderate confidence/i, pct: 55, dot: "bg-amber", bar: "bg-amber" },
  { re: /uncertain/i, pct: 25, dot: "bg-steel", bar: "bg-steel" },
];

function CategoryCard({ title, body }) {
  const cat = CATS.find((c) => c.re.test(title)) || CATS[3];
  const Icon = cat.icon;
  const fields = parseFields(body);
  return (
    <div className={cn("rounded-[4px] border px-3 py-2", cat.frame)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={13} className={cat.iconCls} />
        <span className="text-telemetry font-semibold uppercase tracking-telemetry text-steel">
          {cat.label}
          <span className="ml-1.5 font-normal normal-case tracking-normal text-steel/60">
            {title.replace(/[^\x00-\x7F]/g, "").trim()}
          </span>
        </span>
      </div>
      <div className="space-y-1.5">
        {fields.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn("mt-px w-[92px] shrink-0 text-telemetry font-semibold uppercase tracking-telemetry", cat.fieldCls)}>
              {f.label}
            </span>
            <span className="text-body leading-relaxed text-slate-200">
              <Rich text={f.text} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceBlock({ lines }) {
  const items = parseLabelled(lines);
  const rows = items.map((it) => {
    const c = CONF_MAP.find((m) => m.re.test(it.label)) || CONF_MAP[2];
    return { ...it, ...c, short: it.label.replace(/confidence/i, "conf.") };
  });
  return (
    <div className="rounded-[4px] border border-line bg-recessed px-3 py-2">
      <span className="t-telemetry font-semibold uppercase tracking-telemetry text-steel">CONFIDENCE & LIMITATIONS</span>
      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", r.dot)} />
            <div className="mt-1 h-1.5 w-16 shrink-0 overflow-hidden rounded bg-line">
              <div className={cn("h-full rounded", r.bar)} style={{ width: `${r.pct}%` }} />
            </div>
            <span className="w-[86px] shrink-0 pt-0.5 text-telemetry font-semibold uppercase tracking-telemetry text-steel">{r.short}</span>
            <span className="text-body leading-relaxed text-slate-200">
              <Rich text={r.text} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendedBlock({ lines }) {
  const items = lines.map((l) => l.replace(/^\s*(-|•|\d+[.)])\s*/, "")).filter(Boolean);
  return (
    <div className="rounded-[4px] border border-line bg-recessed px-3 py-2">
      <span className="t-telemetry font-semibold uppercase tracking-telemetry text-steel">RECOMMENDED NEXT ANALYSES</span>
      <div className="mt-2 space-y-1">
        {items.map((it, i) => (
          <div
            key={i}
            className="group flex items-start gap-2 rounded-[4px] border border-transparent px-1.5 py-1 transition hover:border-rim hover:bg-float/60"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-rim/50 bg-float text-telemetry font-semibold text-sky">
              {i + 1}
            </span>
            <span className="pt-0.5 text-body leading-relaxed text-slate-200">
              <Rich text={it} />
            </span>
            <ArrowRight size={12} className="mt-1.5 ml-auto shrink-0 text-steel transition group-hover:text-emerald" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Report({ text, model, ms }) {
  const sections = splitSections(text);
  const find = (re) => sections.find((s) => re.test(s.title));
  const overall = find(/overall change/i);
  const keySec = find(/key changes/i);
  const confidence = find(/confidence/i);
  const recommended = find(/recommended/i);
  const cats = keySec ? splitH3(keySec.lines) : [];
  return (
    <div className="space-y-2.5">
      {(model || ms != null) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line pb-2 t-telemetry text-steel">
          <Cpu size={11} className="text-sky" />
          <span className="max-w-[260px] truncate uppercase tracking-telemetry">{model}</span>
          {ms != null && (
            <>
              <span className="text-line">|</span>
              <Timer size={11} className="text-emerald" />
              <span className="uppercase text-emerald">{ms}s</span>
            </>
          )}
        </div>
      )}
      {overall && (
        <div className="rounded-[4px] border border-rim/40 bg-float/40 px-3 py-2">
          <span className="t-telemetry font-semibold uppercase tracking-telemetry text-sky">OVERALL CHANGE</span>
          <p className="mt-1 text-body leading-relaxed text-slate-100">
            <Rich text={overall.lines.join(" ")} />
          </p>
        </div>
      )}
      {cats.map((c, i) => (
        <CategoryCard key={i} title={c.title} body={c.body} />
      ))}
      {confidence && <ConfidenceBlock lines={confidence.lines} />}
      {recommended && <RecommendedBlock lines={recommended.lines} />}
    </div>
  );
}

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
    const t = setInterval(() => {
      fetch(`${API_BASE}/api/health`).catch(() => {});
    }, 180000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  const postChat = async (ct, hist, msg) => {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: ct, history: hist, message: msg }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Chat request failed");
    return data;
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const t0 = performance.now();
      let data;
      for (let attempt = 0; ; attempt += 1) {
        try {
          data = await postChat(context, next, text);
          break;
        } catch (e) {
          if (attempt >= 2 || !(e instanceof TypeError || e instanceof SyntaxError)) throw e;
          await new Promise((r) => setTimeout(r, 8000));
        }
      }
      const ms = Math.round((performance.now() - t0) / 100) / 10;
      setMessages([...next, { role: "assistant", content: data.reply, model: data.model, ms }]);
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
                  "max-w-[85%] rounded-[4px] leading-relaxed",
                  m.role === "user"
                    ? "border border-rim bg-float px-3 py-2 text-body text-slate-100"
                    : m.content.startsWith("## ")
                      ? "space-y-2.5 border border-line bg-float/25 px-3 py-2"
                      : "border border-line bg-recessed px-3 py-2 text-body text-slate-200",
                )}
              >
                {m.role === "user" ? m.content : m.content.startsWith("## ") ? <Report text={m.content} model={m.model} ms={m.ms} /> : <Rich text={m.content} />}
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