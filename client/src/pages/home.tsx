import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SiteSettings, Project, Writing, ResumeEntry, StockPick } from "@shared/schema";
import { ArrowRight, ArrowUpRight, Mail, Linkedin, Moon, Sun, TrendingUp, TrendingDown, Minus, Check, Settings } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function Home() {
  const [dark, setDark] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("ohdamato@gmail.com").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/settings"); return r.json(); },
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/projects"); return r.json(); },
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

  // Fetch live quotes — refetch every 5 min, and re-key on tickers so changing a ticker triggers a fresh fetch
  const tickerKey = stockPicks?.map(p => p.ticker).join(",") || "";
  const { data: quotes } = useQuery<Record<string, { price: number; change: number; changePercent: number; marketState: string }>>({
    queryKey: ["/api/quotes", tickerKey],
    queryFn: async () => { const r = await apiRequest("GET", "/api/quotes"); return r.json(); },
    enabled: !!stockPicks && stockPicks.length > 0,
    refetchInterval: 5 * 60 * 1000,
  });



  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2 no-underline text-foreground"
             onClick={(e) => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-primary">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9.5 18.5V9.5h9c2.5 0 4 1.8 4 4.5s-1.5 4.5-4 4.5h-9z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="9.5" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1"/>
            </svg>
            <span className="text-sm font-semibold tracking-wider uppercase">Oscar D'Amato</span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            {["work", "stock-picks", "resume", "contact"].map((s) => (
              <button key={s} className="text-sm text-muted-foreground hover:text-foreground font-medium capitalize transition-colors"
                onClick={() => document.getElementById(s)?.scrollIntoView({ behavior: 'smooth' })}
                data-testid={`nav-${s}`}>{s === "stock-picks" ? "Stock Picks" : s}</button>
            ))}
            <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-testid="theme-toggle" aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="min-h-[60vh] flex items-center py-24 md:py-32">
        <div className="max-w-[960px] mx-auto px-6">
          <p className="text-sm font-medium text-primary tracking-widest uppercase mb-4">{settings?.greeting || "Hello, I'm Oscar"}</p>
          {settings?.title && (
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl italic text-foreground mb-6 leading-[1.1]">{settings.title}</h1>
          )}
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed">{settings?.subtitle || ""}</p>
          <button className="inline-flex items-center gap-2 text-sm font-medium text-primary border-b border-primary pb-1 hover:text-primary/80 transition-colors"
            onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}
            data-testid="cta-work">
            {settings?.ctaText || "View my work"} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Work — Combined Projects & Writing */}
      <section id="work" className="py-16 md:py-24 bg-card">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">Selected Work</p>
          <h2 className="font-serif text-2xl md:text-3xl italic mb-2">Projects & Writing</h2>
          <div className="w-10 h-[2px] bg-primary mb-10" />

          {/* Projects grid */}
          {projects && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
              {projects.map((p) => (
                <article key={p.id} className="bg-background border border-border/60 rounded-lg overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5" data-testid={`project-card-${p.id}`}>
                  {p.imageUrl && (
                    <div className="aspect-[16/10] bg-muted overflow-hidden">
                      <img src={`${API_BASE}/api/uploads/${p.imageUrl}`} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">{p.tag}</span>
                    <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                    {p.link && (
                      <a href={p.link.startsWith("/static/") ? `${API_BASE}${p.link}` : p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-4 hover:text-primary/80 transition-colors">
                        View project <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Writing list */}
          {writings && writings.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-6">Opinions & Analysis</h3>
              <div className="flex flex-col">
                {writings.map((w) => (
                  <a key={w.id} href={w.link || "#"} target={w.link ? "_blank" : undefined} rel="noopener noreferrer"
                    className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-5 border-b border-border/40 first:border-t no-underline text-foreground" data-testid={`writing-item-${w.id}`}>
                    <div>
                      <h4 className="text-base font-medium group-hover:text-primary transition-colors">{w.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{w.excerpt}</p>
                    </div>
                    <span className="text-xs text-muted-foreground/60 whitespace-nowrap">{w.date}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stock Picks */}
      {stockPicks && stockPicks.length > 0 && (
        <section id="stock-picks" className="py-16 md:py-24">
          <div className="max-w-[960px] mx-auto px-6">
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">Quarterly Favorites</p>
            <h2 className="font-serif text-2xl md:text-3xl italic mb-2">Stock Picks</h2>
            <div className="w-10 h-[2px] bg-primary mb-10" />
            <div className="grid gap-4">
              {stockPicks.map((pick, i) => {
                const q = quotes?.[pick.ticker.toUpperCase()];
                const isPositive = q && q.change > 0;
                const isNegative = q && q.change < 0;
                return (
                  <div key={pick.id} className="group flex items-start gap-5 p-5 rounded-lg border border-border/40 bg-card hover:shadow-sm transition-all" data-testid={`stock-pick-${pick.id}`}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-sm font-bold tracking-wider text-primary">{pick.ticker}</span>
                        <span className="text-sm text-muted-foreground">{pick.company}</span>
                        {q && (
                          <span className="flex items-center gap-1.5 ml-auto">
                            <span className="text-sm font-semibold tabular-nums">${q.price.toFixed(2)}</span>
                            <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums px-1.5 py-0.5 rounded ${
                              isPositive ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40" :
                              isNegative ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40" :
                              "text-muted-foreground bg-muted"
                            }`}>
                              {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
                              {isPositive ? "+" : ""}{q.change.toFixed(2)} ({isPositive ? "+" : ""}{q.changePercent.toFixed(2)}%)
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{pick.thesis}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {quotes && Object.keys(quotes).length > 0 && (
              <p className="text-[10px] text-muted-foreground/40 mt-4">Quotes via Yahoo Finance. Delayed up to 15 min. Not financial advice.</p>
            )}
          </div>
        </section>
      )}

      {/* Resume */}
      <section id="resume" className="py-16 md:py-24 bg-card">
        <div className="max-w-[960px] mx-auto px-6">
          <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">Experience</p>
          <h2 className="font-serif text-2xl md:text-3xl italic mb-2">Resume</h2>
          <div className="w-10 h-[2px] bg-primary mb-10" />
          <div className="relative pl-8">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-border/60" />
            {resume?.map((r) => (
              <div key={r.id} className="relative pb-10 last:pb-0" data-testid={`resume-entry-${r.id}`}>
                <div className="absolute -left-8 top-2 w-2 h-2 rounded-full bg-primary" style={{ transform: "translateX(-50%)" }} />
                <p className="text-xs font-medium text-muted-foreground/60 tracking-wider uppercase mb-2">{r.period}</p>
                <h3 className="text-base font-semibold mb-1">{r.role}</h3>
                <p className="text-sm text-muted-foreground mb-3">{r.organization}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 border-t border-border/40">
        <div className="max-w-[960px] mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground/60">&copy; 2026 Oscar D'Amato</p>
            <Link href="/admin" className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" data-testid="link-admin">
              <Settings size={14} />
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={copyEmail} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-email">
              {copied ? <Check size={18} className="text-emerald-500" /> : <Mail size={18} />}
              {copied ? "Copied!" : "Email"}
            </button>
            <a href="https://www.linkedin.com/in/oscardamato" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground no-underline transition-colors" data-testid="link-linkedin">
              <Linkedin size={18} /> LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
