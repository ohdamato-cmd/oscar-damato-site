import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SiteSettings, Writing, ResumeEntry, StockPick } from "@shared/schema";
import { useState, useRef, useCallback, useEffect, ReactNode } from "react";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// ── Win95 palette ────────────────────────────────────────────────────────────
const C = {
  desktop: "#008080",
  gray: "#c0c0c0",
  titleBar: "#000080",
  white: "#ffffff",
  black: "#000000",
  light: "#ffffff",
  shadow: "#808080",
  darkShadow: "#404040",
};

const raised: React.CSSProperties = {
  borderTop: `2px solid ${C.light}`,
  borderLeft: `2px solid ${C.light}`,
  borderBottom: `2px solid ${C.darkShadow}`,
  borderRight: `2px solid ${C.darkShadow}`,
};
const sunken: React.CSSProperties = {
  borderTop: `2px solid ${C.darkShadow}`,
  borderLeft: `2px solid ${C.darkShadow}`,
  borderBottom: `2px solid ${C.light}`,
  borderRight: `2px solid ${C.light}`,
};

const WIN_FONT = "'MS Sans Serif', 'Arial', sans-serif";
const MONO_FONT = "'Courier New', Courier, monospace";

// ── Drag hook ────────────────────────────────────────────────────────────────
function useDrag(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX, startY = e.clientY;
    const origX = posRef.current.x, origY = posRef.current.y;
    const onMove = (ev: MouseEvent) =>
      setPos({ x: Math.max(0, origX + ev.clientX - startX), y: Math.max(0, origY + ev.clientY - startY) });
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  }, []);

  return { pos, onMouseDown };
}

// ── Window component ─────────────────────────────────────────────────────────
interface WindowProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  initialPos: { x: number; y: number };
  width?: number;
  contentHeight?: number;
}

function Win95Window({
  title, children, onClose, onMinimize, isMinimized,
  zIndex, onFocus, initialPos, width = 420, contentHeight = 260,
}: WindowProps) {
  const { pos, onMouseDown } = useDrag(initialPos);
  if (isMinimized) return null;
  return (
    <div
      onMouseDown={onFocus}
      style={{ position: "absolute", left: pos.x, top: pos.y, width, zIndex, backgroundColor: C.gray, ...raised, fontFamily: WIN_FONT, fontSize: 11 }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onMouseDown}
        style={{ background: `linear-gradient(to right, ${C.titleBar}, #1084d0)`, padding: "3px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "default", userSelect: "none" }}
      >
        <span style={{ color: C.white, fontSize: 11, fontWeight: "bold", fontFamily: WIN_FONT }}>{title}</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            style={{ width: 16, height: 14, backgroundColor: C.gray, ...raised, border: "none", cursor: "pointer", fontFamily: WIN_FONT, fontSize: 10, padding: 0 }}
          >_</button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ width: 16, height: 14, backgroundColor: C.gray, ...raised, border: "none", cursor: "pointer", fontFamily: WIN_FONT, fontSize: 10, padding: 0 }}
          >✕</button>
        </div>
      </div>
      {/* Menu bar stub */}
      <div style={{ borderBottom: `1px solid ${C.shadow}`, padding: "1px 4px", fontSize: 11, display: "flex", gap: 12, color: C.black, userSelect: "none" }}>
        <span style={{ cursor: "default" }}>File</span>
        <span style={{ cursor: "default" }}>Edit</span>
        <span style={{ cursor: "default" }}>View</span>
      </div>
      {/* Content */}
      <div style={{ padding: 4, height: contentHeight, overflow: "auto" }}>{children}</div>
      {/* Status bar */}
      <div style={{ ...sunken, padding: "2px 6px", fontSize: 10, color: C.shadow, userSelect: "none" }}>Ready</div>
    </div>
  );
}

// ── Desktop icon ─────────────────────────────────────────────────────────────
function DesktopIcon({ icon, label, onDoubleClick }: { icon: string; label: string; onDoubleClick: () => void }) {
  const [sel, setSel] = useState(false);
  return (
    <div
      onClick={() => setSel(s => !s)}
      onDoubleClick={onDoubleClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 6px", cursor: "default", width: 68, textAlign: "center", userSelect: "none", backgroundColor: sel ? "rgba(0,0,128,0.45)" : "transparent" }}
    >
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
      <span style={{ color: C.white, fontSize: 10, fontFamily: WIN_FONT, textShadow: "1px 1px 2px #000", backgroundColor: sel ? "#000080" : "transparent", padding: "0 2px", lineHeight: 1.35, wordBreak: "break-word" }}>
        {label}
      </span>
    </div>
  );
}

// ── Taskbar button ────────────────────────────────────────────────────────────
function TaskbarBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ height: 22, padding: "0 6px", backgroundColor: C.gray, fontFamily: WIN_FONT, fontSize: 11, cursor: "pointer", ...(active ? sunken : raised), minWidth: 70, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}
    >
      {label}
    </button>
  );
}

// ── Window IDs ────────────────────────────────────────────────────────────────
type WinId = "readme" | "market" | "research" | "terminal" | "portfolio";

const WIN_DEFS: { id: WinId; icon: string; label: string; short: string }[] = [
  { id: "readme",    icon: "📄", label: "README.txt",           short: "README.txt"    },
  { id: "market",    icon: "📊", label: "Market_Terminal.xls",  short: "Market"        },
  { id: "research",  icon: "📚", label: "Research_Library",     short: "Research"      },
  { id: "terminal",  icon: "🖥️", label: "Terminal.exe",         short: "Terminal"      },
  { id: "portfolio", icon: "📁", label: "Portfolio",            short: "Portfolio"     },
];

const INITIAL_POSITIONS: Record<WinId, { x: number; y: number }> = {
  readme:    { x: 160, y: 48  },
  market:    { x: 340, y: 80  },
  research:  { x: 110, y: 200 },
  terminal:  { x: 420, y: 250 },
  portfolio: { x: 250, y: 140 },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function Home() {
  const [open, setOpen] = useState<Set<WinId>>(new Set(["readme"]));
  const [minimized, setMinimized] = useState<Set<WinId>>(new Set());
  const [zOrders, setZOrders] = useState<Record<WinId, number>>({ readme: 10, market: 9, research: 8, terminal: 7, portfolio: 6 });
  const zCounter = useRef(11);
  const [startOpen, setStartOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const focus = useCallback((id: WinId) => {
    zCounter.current += 1;
    setZOrders(prev => ({ ...prev, [id]: zCounter.current }));
  }, []);

  const openWin = (id: WinId) => {
    setOpen(prev => new Set(prev).add(id));
    setMinimized(prev => { const s = new Set(prev); s.delete(id); return s; });
    focus(id);
    setStartOpen(false);
  };

  const closeWin = (id: WinId) => setOpen(prev => { const s = new Set(prev); s.delete(id); return s; });
  const minWin   = (id: WinId) => setMinimized(prev => new Set(prev).add(id));

  const toggleWin = (id: WinId) => {
    if (!open.has(id)) { openWin(id); return; }
    if (minimized.has(id)) { setMinimized(prev => { const s = new Set(prev); s.delete(id); return s; }); focus(id); }
    else minWin(id);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("ohdamato@gmail.com").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/settings"); return r.json(); },
  });
  const { data: writings } = useQuery<Writing[]>({
    queryKey: ["/api/writings"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/writings"); return r.json(); },
  });
  const { data: resume } = useQuery<ResumeEntry[]>({
    queryKey: ["/api/resume"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/resume"); return r.json(); },
  });
  const { data: stockPicks } = useQuery<StockPick[]>({
    queryKey: ["/api/stock-picks"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/stock-picks"); return r.json(); },
  });
  const tickerKey = stockPicks?.map(p => p.ticker).join(",") || "";
  const { data: quotes } = useQuery<Record<string, { price: number; change: number; changePercent: number }>>({
    queryKey: ["/api/quotes", tickerKey],
    queryFn: async () => { const r = await apiRequest("GET", "/api/quotes"); return r.json(); },
    enabled: !!stockPicks && stockPicks.length > 0,
    refetchInterval: 5 * 60 * 1000,
  });

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Shared menu-item hover style ──────────────────────────────────────────
  const menuItem: React.CSSProperties = { padding: "4px 10px", cursor: "default", fontSize: 11, fontFamily: WIN_FONT };

  return (
    <div
      onClick={() => setStartOpen(false)}
      style={{ width: "100vw", height: "100vh", backgroundColor: C.desktop, position: "relative", overflow: "hidden", fontFamily: WIN_FONT }}
    >
      {/* ── Desktop icons ─────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 10, left: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {WIN_DEFS.map(w => (
          <DesktopIcon key={w.id} icon={w.icon} label={w.label} onDoubleClick={() => openWin(w.id)} />
        ))}
        <DesktopIcon icon="✉️" label="Mail" onDoubleClick={copyEmail} />
        <DesktopIcon icon="🔗" label="LinkedIn" onDoubleClick={() => window.open("https://www.linkedin.com/in/oscardamato", "_blank")} />
      </div>

      {/* ── README.txt ───────────────────────────────────────────────── */}
      {open.has("readme") && (
        <Win95Window title="📄 README.txt - Notepad" onClose={() => closeWin("readme")} onMinimize={() => minWin("readme")}
          isMinimized={minimized.has("readme")} zIndex={zOrders.readme} onFocus={() => focus("readme")}
          initialPos={INITIAL_POSITIONS.readme} width={440} contentHeight={260}>
          <div style={{ ...sunken, backgroundColor: C.white, height: "100%", padding: 8, overflow: "auto" }}>
            <pre style={{ fontFamily: MONO_FONT, fontSize: 12, whiteSpace: "pre-wrap", margin: 0, color: C.black, lineHeight: 1.6 }}>
{`====================================
  Oscar D'Amato — Portfolio
====================================

${settings?.greeting || "Hello, I'm Oscar."}

${settings?.subtitle || "I study how incentives shape outcomes —\nacross markets, institutions, and\ninfrastructure.\n\nFSU background. Focused on financial\nsystems, analytical frameworks, and\nthe structures that make markets work."}


> ${settings?.ctaText || "Double-click any desktop icon to open a window."}
====================================`}
            </pre>
          </div>
        </Win95Window>
      )}

      {/* ── Market Terminal ───────────────────────────────────────────── */}
      {open.has("market") && (
        <Win95Window title="📊 Market_Terminal.xls — Quarterly Favorites" onClose={() => closeWin("market")} onMinimize={() => minWin("market")}
          isMinimized={minimized.has("market")} zIndex={zOrders.market} onFocus={() => focus("market")}
          initialPos={INITIAL_POSITIONS.market} width={560} contentHeight={280}>
          <div style={{ ...sunken, backgroundColor: C.white, height: "100%", overflow: "auto", display: "flex", flexDirection: "column" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 28 }} /><col style={{ width: 64 }} /><col style={{ width: 140 }} />
                <col style={{ width: 68 }} /><col style={{ width: 68 }} /><col style={{ width: 68 }} />
                <col />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: C.gray }}>
                  {["#","TICKER","COMPANY","PRICE","CHG","CHG%","THESIS"].map(h => (
                    <th key={h} style={{ padding: "3px 5px", textAlign: "left", ...raised, fontFamily: WIN_FONT, fontSize: 11, whiteSpace: "nowrap", fontWeight: "bold" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockPicks?.map((pick, i) => {
                  const q = quotes?.[pick.ticker.toUpperCase()];
                  const pos = q && q.change > 0, neg = q && q.change < 0;
                  return (
                    <tr key={pick.id} style={{ backgroundColor: i % 2 === 0 ? C.white : "#f4f4f4" }}>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", color: "#888" }}>{i + 1}</td>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", fontWeight: "bold", color: "#000080", fontFamily: MONO_FONT }}>{pick.ticker}</td>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pick.company}</td>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", fontFamily: MONO_FONT, textAlign: "right" }}>{q ? `$${q.price.toFixed(2)}` : "—"}</td>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", fontFamily: MONO_FONT, textAlign: "right", color: pos ? "green" : neg ? "red" : "#666" }}>
                        {q ? `${pos ? "+" : ""}${q.change.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", fontFamily: MONO_FONT, textAlign: "right", color: pos ? "green" : neg ? "red" : "#666" }}>
                        {q ? `${pos ? "+" : ""}${q.changePercent.toFixed(2)}%` : "—"}
                      </td>
                      <td style={{ padding: "2px 5px", borderBottom: "1px solid #ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, color: "#555" }}>{pick.thesis}</td>
                    </tr>
                  );
                })}
                {(!stockPicks || stockPicks.length === 0) && (
                  <tr><td colSpan={7} style={{ padding: 8, textAlign: "center", color: "#888" }}>Loading data...</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ padding: "2px 6px", fontSize: 9, color: "#888", borderTop: "1px solid #ddd", backgroundColor: C.gray, marginTop: "auto" }}>
              Quotes via Yahoo Finance · Delayed up to 15 min · Not financial advice
            </div>
          </div>
        </Win95Window>
      )}

      {/* ── Research Library ─────────────────────────────────────────── */}
      {open.has("research") && (
        <Win95Window title="📚 Research_Library — Document Viewer" onClose={() => closeWin("research")} onMinimize={() => minWin("research")}
          isMinimized={minimized.has("research")} zIndex={zOrders.research} onFocus={() => focus("research")}
          initialPos={INITIAL_POSITIONS.research} width={470} contentHeight={300}>
          <div style={{ ...sunken, backgroundColor: C.white, height: "100%", padding: 8, overflow: "auto" }}>
            <div style={{ fontSize: 10, color: "#666", borderBottom: "1px solid #ddd", paddingBottom: 4, marginBottom: 8, fontFamily: MONO_FONT }}>
              C:\Research\writings\
            </div>
            {writings?.map(w => (
              <div key={w.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #eee", alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                <div>
                  <a href={w.link || "#"} target={w.link ? "_blank" : undefined} rel="noopener noreferrer"
                    style={{ color: "#000080", fontWeight: "bold", fontSize: 11, textDecoration: "none", fontFamily: WIN_FONT }}
                    onMouseOver={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseOut={e => (e.currentTarget.style.textDecoration = "none")}
                  >{w.title}</a>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2, lineHeight: 1.4 }}>{w.excerpt}</div>
                  <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>{w.date}</div>
                </div>
              </div>
            ))}
            {(!writings || writings.length === 0) && <div style={{ color: "#888", padding: 8 }}>No documents found.</div>}
          </div>
        </Win95Window>
      )}

      {/* ── Terminal ─────────────────────────────────────────────────── */}
      {open.has("terminal") && (
        <Win95Window title="🖥️ Terminal.exe — Opinions & Analysis" onClose={() => closeWin("terminal")} onMinimize={() => minWin("terminal")}
          isMinimized={minimized.has("terminal")} zIndex={zOrders.terminal} onFocus={() => focus("terminal")}
          initialPos={INITIAL_POSITIONS.terminal} width={500} contentHeight={320}>
          <div style={{ backgroundColor: C.black, height: "100%", padding: 10, overflow: "auto", fontFamily: MONO_FONT, fontSize: 12, color: "#00ff00", lineHeight: 1.5 }}>
            <div style={{ color: "#aaa", marginBottom: 4 }}>Microsoft(R) Windows 95</div>
            <div style={{ marginBottom: 4 }}>C:\&gt; analysis --load opinions</div>
            <div style={{ color: "#00cc00", marginBottom: 12 }}>Loading... OK</div>
            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 8 }}>
              {writings?.map((w, i) => (
                <div key={w.id} style={{ marginBottom: 16 }}>
                  <div style={{ color: "#ffff00" }}>[{String(i + 1).padStart(2, "0")}] {w.title}</div>
                  {w.date && <div style={{ color: "#888", fontSize: 10, paddingLeft: 6 }}>DATE: {w.date}</div>}
                  {w.excerpt && <div style={{ color: "#aaa", fontSize: 10, paddingLeft: 6, marginTop: 2 }}>&gt; {w.excerpt}</div>}
                  {w.link && (
                    <div style={{ paddingLeft: 6, marginTop: 2 }}>
                      <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ color: "#00aaff", fontSize: 10 }}>
                        &gt; OPEN [{w.link.length > 50 ? w.link.substring(0, 50) + "..." : w.link}]
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {(!writings || writings.length === 0) && <div style={{ color: "#666" }}>No data. Populate via admin panel.</div>}
            </div>
            <div style={{ marginTop: 8, color: "#00ff00" }}>C:\&gt; <span className="win95-cursor">_</span></div>
          </div>
        </Win95Window>
      )}

      {/* ── Portfolio Explorer ───────────────────────────────────────── */}
      {open.has("portfolio") && (
        <Win95Window title="📁 Portfolio — Windows Explorer" onClose={() => closeWin("portfolio")} onMinimize={() => minWin("portfolio")}
          isMinimized={minimized.has("portfolio")} zIndex={zOrders.portfolio} onFocus={() => focus("portfolio")}
          initialPos={INITIAL_POSITIONS.portfolio} width={500} contentHeight={300}>
          <div style={{ display: "flex", height: "100%", gap: 2 }}>
            {/* Tree pane */}
            <div style={{ width: 130, ...sunken, backgroundColor: C.white, padding: 6, overflow: "auto", flexShrink: 0, fontSize: 11 }}>
              <div style={{ fontWeight: "bold", color: "#000080", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                <span>📁</span> Portfolio
              </div>
              {[{ icon: "💼", label: "Experience" }, { icon: "🎓", label: "Education" }, { icon: "🏛️", label: "Initiatives" }].map(f => (
                <div key={f.label} style={{ paddingLeft: 12, fontSize: 10, color: "#444", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span>{f.icon}</span>{f.label}
                </div>
              ))}
            </div>
            {/* Content pane */}
            <div style={{ flex: 1, ...sunken, backgroundColor: C.white, padding: 8, overflow: "auto" }}>
              <div style={{ fontSize: 10, color: "#666", borderBottom: "1px solid #ddd", paddingBottom: 3, marginBottom: 8, fontFamily: MONO_FONT }}>
                C:\Portfolio\Experience\
              </div>
              {resume?.map(r => (
                <div key={r.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #eee", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>💼</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 11, color: C.black }}>{r.role}</div>
                    <div style={{ fontSize: 10, color: "#000080", marginTop: 1 }}>{r.organization}</div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 1 }}>{r.period}</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 3, lineHeight: 1.45 }}>{r.description}</div>
                  </div>
                </div>
              ))}
              {(!resume || resume.length === 0) && <div style={{ color: "#888", padding: 8 }}>No entries found.</div>}
            </div>
          </div>
        </Win95Window>
      )}

      {/* ── Start Menu ───────────────────────────────────────────────── */}
      {startOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", bottom: 28, left: 0, width: 200, backgroundColor: C.gray, ...raised, zIndex: 9999, display: "flex" }}
        >
          {/* Vertical banner */}
          <div style={{ width: 22, background: "linear-gradient(to top, #808080 0%, #c0c0c0 100%)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: C.white, writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: "bold", letterSpacing: 1 }}>Windows 95</span>
          </div>
          {/* Items */}
          <div style={{ flex: 1 }}>
            {WIN_DEFS.map(w => (
              <div key={w.id} onClick={() => openWin(w.id)}
                style={menuItem}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = "#000080"; e.currentTarget.style.color = C.white; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "inherit"; }}
              >
                {w.icon} {w.short}
              </div>
            ))}
            <div style={{ borderTop: "1px solid #888", borderBottom: "1px solid #fff", margin: "2px 0" }} />
            <div onClick={copyEmail} style={menuItem}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = "#000080"; e.currentTarget.style.color = C.white; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "inherit"; }}
            >
              ✉️ {copied ? "Copied!" : "Email Me"}
            </div>
            <div onClick={() => window.open("https://www.linkedin.com/in/oscardamato", "_blank")} style={menuItem}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = "#000080"; e.currentTarget.style.color = C.white; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "inherit"; }}
            >
              🔗 LinkedIn
            </div>
            <div style={{ borderTop: "1px solid #888", borderBottom: "1px solid #fff", margin: "2px 0" }} />
            <a href="#/admin" style={{ display: "block", textDecoration: "none", color: "inherit", ...menuItem }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = "#000080"; e.currentTarget.style.color = C.white; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "inherit"; }}
            >
              ⚙️ Admin Panel
            </a>
          </div>
        </div>
      )}

      {/* ── Taskbar ──────────────────────────────────────────────────── */}
      <div
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 28, backgroundColor: C.gray, borderTop: `2px solid ${C.light}`, display: "flex", alignItems: "center", gap: 3, padding: "0 3px", zIndex: 9998 }}
      >
        {/* Start button */}
        <button
          onClick={e => { e.stopPropagation(); setStartOpen(s => !s); }}
          style={{ height: 22, padding: "0 8px", backgroundColor: C.gray, fontFamily: WIN_FONT, fontWeight: "bold", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, ...(startOpen ? sunken : raised) }}
        >
          <span style={{ fontSize: 14 }}>⊞</span> Start
        </button>

        <div style={{ width: 1, height: 20, backgroundColor: C.shadow, margin: "0 2px" }} />
        <div style={{ width: 1, height: 20, backgroundColor: C.light, margin: "0 0" }} />

        {/* Open window buttons */}
        {WIN_DEFS.filter(w => open.has(w.id)).map(w => (
          <TaskbarBtn key={w.id} label={`${w.icon} ${w.short}`} active={!minimized.has(w.id)} onClick={() => toggleWin(w.id)} />
        ))}

        <div style={{ flex: 1 }} />

        {/* System tray */}
        <div style={{ ...sunken, padding: "0 8px", height: 22, display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: WIN_FONT, flexShrink: 0 }}>
          <span>🔊</span>
          <span>🌐</span>
          <span style={{ minWidth: 42 }}>{timeStr}</span>
        </div>
      </div>
    </div>
  );
}
