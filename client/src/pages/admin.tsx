import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getToken, setToken, getAuthHeaders } from "@/lib/auth";
import type { SiteSettings, Project, Writing, ResumeEntry, StockPick, UploadedFile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Trash2, Save, Pencil, X, Home, ChevronUp, ChevronDown, Upload, FileText, Download, Copy, Check } from "lucide-react";
import { Link } from "wouter";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = async () => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      setToken(data.token);
      onLogin();
    } catch {
      setError("Invalid credentials");
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-xl font-semibold">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage your portfolio</p>
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} data-testid="input-username"
            onKeyDown={(e) => e.key === "Enter" && login()} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-password"
            onKeyDown={(e) => e.key === "Enter" && login()} />
          <Button className="w-full" onClick={login} data-testid="button-login">Sign In</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"bio" | "projects" | "writing" | "resume" | "stocks" | "files">("bio");

  const authFetch = async (method: string, url: string, data?: unknown) => {
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const logout = () => {
    fetch(`${API_BASE}/api/auth/logout`, { method: "POST", headers: getAuthHeaders() });
    setToken(null);
    window.location.reload();
  };

  // ============ REORDER HELPERS ============
  const reorderItems = <T extends { id: number; sortOrder: number }>(
    items: T[],
    index: number,
    direction: "up" | "down",
    endpoint: string,
    queryKey: string
  ) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const a = items[index];
    const b = items[swapIndex];
    // Swap sortOrder values
    Promise.all([
      authFetch("PUT", `${endpoint}/${a.id}`, { sortOrder: b.sortOrder }),
      authFetch("PUT", `${endpoint}/${b.id}`, { sortOrder: a.sortOrder }),
    ]).then(() => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });
  };

  // ============ SETTINGS ============
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/settings"); return r.json(); },
  });
  const [editSettings, setEditSettings] = useState<Partial<SiteSettings>>({});
  const saveSettings = useMutation({
    mutationFn: () => authFetch("PUT", "/api/admin/settings", { ...settings, ...editSettings }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Bio updated" }); setEditSettings({}); },
  });

  // ============ PROJECTS ============
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/projects"); return r.json(); },
  });
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const saveProject = useMutation({
    mutationFn: (p: Partial<Project>) => {
      if (p.id) return authFetch("PUT", `/api/admin/projects/${p.id}`, p);
      return authFetch("POST", "/api/admin/projects", p);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setEditingProject(null); toast({ title: "Project saved" }); },
  });
  const deleteProject = useMutation({
    mutationFn: (id: number) => authFetch("DELETE", `/api/admin/projects/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); toast({ title: "Project deleted" }); },
  });

  // ============ WRITINGS ============
  const { data: writings } = useQuery<Writing[]>({
    queryKey: ["/api/writings"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/writings"); return r.json(); },
  });
  const [editingWriting, setEditingWriting] = useState<Partial<Writing> | null>(null);
  const saveWriting = useMutation({
    mutationFn: (w: Partial<Writing>) => {
      if (w.id) return authFetch("PUT", `/api/admin/writings/${w.id}`, w);
      return authFetch("POST", "/api/admin/writings", w);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/writings"] }); setEditingWriting(null); toast({ title: "Writing saved" }); },
  });
  const deleteWriting = useMutation({
    mutationFn: (id: number) => authFetch("DELETE", `/api/admin/writings/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/writings"] }); toast({ title: "Writing deleted" }); },
  });

  // ============ RESUME ============
  const { data: resume } = useQuery<ResumeEntry[]>({
    queryKey: ["/api/resume"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/resume"); return r.json(); },
  });
  const [editingResume, setEditingResume] = useState<Partial<ResumeEntry> | null>(null);
  const saveResume = useMutation({
    mutationFn: (r: Partial<ResumeEntry>) => {
      if (r.id) return authFetch("PUT", `/api/admin/resume/${r.id}`, r);
      return authFetch("POST", "/api/admin/resume", r);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/resume"] }); setEditingResume(null); toast({ title: "Resume entry saved" }); },
  });
  const deleteResume = useMutation({
    mutationFn: (id: number) => authFetch("DELETE", `/api/admin/resume/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/resume"] }); toast({ title: "Resume entry deleted" }); },
  });

  // ============ STOCK PICKS ============
  const { data: stockPicks } = useQuery<StockPick[]>({
    queryKey: ["/api/stock-picks"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/stock-picks"); return r.json(); },
  });
  const [editingStock, setEditingStock] = useState<Partial<StockPick> | null>(null);
  const saveStock = useMutation({
    mutationFn: (s: Partial<StockPick>) => {
      if (s.id) return authFetch("PUT", `/api/admin/stock-picks/${s.id}`, s);
      return authFetch("POST", "/api/admin/stock-picks", s);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/stock-picks"] }); setEditingStock(null); toast({ title: "Stock pick saved" }); },
  });
  const deleteStock = useMutation({
    mutationFn: (id: number) => authFetch("DELETE", `/api/admin/stock-picks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/stock-picks"] }); toast({ title: "Stock pick deleted" }); },
  });

  // ============ FILES ============
  const { data: files, refetch: refetchFiles } = useQuery<UploadedFile[]>({
    queryKey: ["/api/files"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/files"); return r.json(); },
  });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedLink, setCopiedLink] = useState<number | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/admin/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      refetchFiles();
      toast({ title: "File uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = useMutation({
    mutationFn: (id: number) => authFetch("DELETE", `/api/admin/files/${id}`),
    onSuccess: () => { refetchFiles(); toast({ title: "File deleted" }); },
  });

  const copyFileLink = (file: UploadedFile) => {
    const link = `${window.location.origin}${API_BASE}/api/download/${file.storedName}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(file.id);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(uploadFile);
  };

  const tabs = [
    { key: "bio" as const, label: "Bio / Hero" },
    { key: "projects" as const, label: "Projects" },
    { key: "writing" as const, label: "Writing / Op-Eds" },
    { key: "resume" as const, label: "Resume" },
    { key: "stocks" as const, label: "Stock Picks" },
    { key: "files" as const, label: "Files" },
  ];

  // Reorder button component
  const ReorderButtons = ({ index, total, onMove }: { index: number; total: number; onMove: (dir: "up" | "down") => void }) => (
    <div className="flex flex-col gap-0.5 shrink-0">
      <button
        onClick={() => onMove("up")}
        disabled={index === 0}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        aria-label="Move up"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={() => onMove("down")}
        disabled={index === total - 1}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        aria-label="Move down"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Admin header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold">Admin Panel</h1>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Home size={12} /> View site
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
            <LogOut size={14} className="mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              data-testid={`tab-${t.key}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ============ BIO ============ */}
        {activeTab === "bio" && settings && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-sm font-medium mb-1 block">Greeting</label>
              <Input value={editSettings.greeting ?? settings.greeting} onChange={(e) => setEditSettings({ ...editSettings, greeting: e.target.value })} data-testid="input-greeting" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hero Title</label>
              <Textarea rows={3} value={editSettings.title ?? settings.title} onChange={(e) => setEditSettings({ ...editSettings, title: e.target.value })} data-testid="input-title" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subtitle / Bio</label>
              <Textarea rows={4} value={editSettings.subtitle ?? settings.subtitle} onChange={(e) => setEditSettings({ ...editSettings, subtitle: e.target.value })} data-testid="input-subtitle" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">CTA Button Text</label>
              <Input value={editSettings.ctaText ?? settings.ctaText} onChange={(e) => setEditSettings({ ...editSettings, ctaText: e.target.value })} data-testid="input-cta" />
            </div>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} data-testid="button-save-bio">
              <Save size={14} className="mr-1" /> Save Changes
            </Button>
          </div>
        )}

        {/* ============ PROJECTS ============ */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Projects</h2>
                <p className="text-sm text-muted-foreground">Shown as cards under "Selected Work". Use arrows to reorder.</p>
              </div>
              <Button onClick={() => setEditingProject({ title: "", description: "", tag: "", link: "", imageUrl: "", sortOrder: (projects?.length || 0) })} data-testid="button-add-project">
                <Plus size={14} className="mr-1" /> Add Project
              </Button>
            </div>
            {editingProject && (
              <Card className="border-primary/30 bg-primary/[0.02]">
                <CardContent className="pt-6 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">{editingProject.id ? "Edit Project" : "New Project"}</p>
                  <Input placeholder="Title" value={editingProject.title || ""} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} data-testid="input-project-title" />
                  <Textarea placeholder="Description" value={editingProject.description || ""} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} data-testid="input-project-desc" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Tag (e.g. Financial Analysis)" value={editingProject.tag || ""} onChange={(e) => setEditingProject({ ...editingProject, tag: e.target.value })} data-testid="input-project-tag" />
                    <Input placeholder="Link URL" value={editingProject.link || ""} onChange={(e) => setEditingProject({ ...editingProject, link: e.target.value })} data-testid="input-project-link" />
                  </div>
                  <Input placeholder="Image filename (optional, from uploaded files)" value={editingProject.imageUrl || ""} onChange={(e) => setEditingProject({ ...editingProject, imageUrl: e.target.value })} data-testid="input-project-image" />
                  <div className="flex gap-2">
                    <Button onClick={() => saveProject.mutate(editingProject)} disabled={saveProject.isPending} data-testid="button-save-project">
                      <Save size={14} className="mr-1" /> Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingProject(null)}><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {projects?.length === 0 && !editingProject && <p className="text-sm text-muted-foreground py-8 text-center">No projects yet. Click "Add Project" to get started.</p>}
            {projects?.map((p, i) => (
              <Card key={p.id}>
                <CardContent className="pt-5 flex items-center gap-3">
                  <ReorderButtons index={i} total={projects.length} onMove={(dir) => reorderItems(projects, i, dir, "/api/admin/projects", "/api/projects")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">{p.tag}</span>
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    </div>
                    <h3 className="text-sm font-semibold mt-1">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
                    {p.link && <p className="text-xs text-primary/60 mt-1 truncate">{p.link}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingProject(p)} data-testid={`edit-project-${p.id}`}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteProject.mutate(p.id)} data-testid={`delete-project-${p.id}`}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ============ WRITING / OP-EDS ============ */}
        {activeTab === "writing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Writing / Op-Eds</h2>
                <p className="text-sm text-muted-foreground">Listed under "Opinions & Analysis". Use arrows to reorder.</p>
              </div>
              <Button onClick={() => setEditingWriting({ title: "", excerpt: "", date: "", link: "", sortOrder: (writings?.length || 0) })} data-testid="button-add-writing">
                <Plus size={14} className="mr-1" /> Add Writing
              </Button>
            </div>
            {editingWriting && (
              <Card className="border-primary/30 bg-primary/[0.02]">
                <CardContent className="pt-6 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">{editingWriting.id ? "Edit Writing" : "New Writing"}</p>
                  <Input placeholder="Title" value={editingWriting.title || ""} onChange={(e) => setEditingWriting({ ...editingWriting, title: e.target.value })} data-testid="input-writing-title" />
                  <Textarea placeholder="Excerpt / Summary" rows={3} value={editingWriting.excerpt || ""} onChange={(e) => setEditingWriting({ ...editingWriting, excerpt: e.target.value })} data-testid="input-writing-excerpt" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Date (e.g. Apr 2026)" value={editingWriting.date || ""} onChange={(e) => setEditingWriting({ ...editingWriting, date: e.target.value })} data-testid="input-writing-date" />
                    <Input placeholder="Link URL (optional)" value={editingWriting.link || ""} onChange={(e) => setEditingWriting({ ...editingWriting, link: e.target.value })} data-testid="input-writing-link" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => saveWriting.mutate(editingWriting)} disabled={saveWriting.isPending} data-testid="button-save-writing"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="ghost" onClick={() => setEditingWriting(null)}><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {writings?.length === 0 && !editingWriting && <p className="text-sm text-muted-foreground py-8 text-center">No writings yet. Click "Add Writing" to get started.</p>}
            {writings?.map((w, i) => (
              <Card key={w.id}>
                <CardContent className="pt-5 flex items-center gap-3">
                  <ReorderButtons index={i} total={writings.length} onMove={(dir) => reorderItems(writings, i, dir, "/api/admin/writings", "/api/writings")} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{w.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{w.excerpt?.slice(0, 80)}{(w.excerpt?.length || 0) > 80 ? "..." : ""}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{w.date}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingWriting(w)} data-testid={`edit-writing-${w.id}`}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteWriting.mutate(w.id)} data-testid={`delete-writing-${w.id}`}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ============ RESUME ============ */}
        {activeTab === "resume" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Resume</h2>
                <p className="text-sm text-muted-foreground">Timeline entries under "Experience". Use arrows to reorder.</p>
              </div>
              <Button onClick={() => setEditingResume({ period: "", role: "", organization: "", description: "", sortOrder: (resume?.length || 0) })} data-testid="button-add-resume">
                <Plus size={14} className="mr-1" /> Add Entry
              </Button>
            </div>
            {editingResume && (
              <Card className="border-primary/30 bg-primary/[0.02]">
                <CardContent className="pt-6 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">{editingResume.id ? "Edit Entry" : "New Entry"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Period (e.g. 2024 — Present)" value={editingResume.period || ""} onChange={(e) => setEditingResume({ ...editingResume, period: e.target.value })} data-testid="input-resume-period" />
                    <Input placeholder="Role / Title" value={editingResume.role || ""} onChange={(e) => setEditingResume({ ...editingResume, role: e.target.value })} data-testid="input-resume-role" />
                  </div>
                  <Input placeholder="Organization" value={editingResume.organization || ""} onChange={(e) => setEditingResume({ ...editingResume, organization: e.target.value })} data-testid="input-resume-org" />
                  <Textarea placeholder="Description" rows={4} value={editingResume.description || ""} onChange={(e) => setEditingResume({ ...editingResume, description: e.target.value })} data-testid="input-resume-desc" />
                  <div className="flex gap-2">
                    <Button onClick={() => saveResume.mutate(editingResume)} disabled={saveResume.isPending} data-testid="button-save-resume"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="ghost" onClick={() => setEditingResume(null)}><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {resume?.length === 0 && !editingResume && <p className="text-sm text-muted-foreground py-8 text-center">No resume entries yet. Click "Add Entry" to get started.</p>}
            {resume?.map((r, i) => (
              <Card key={r.id}>
                <CardContent className="pt-5 flex items-center gap-3">
                  <ReorderButtons index={i} total={resume.length} onMove={(dir) => reorderItems(resume, i, dir, "/api/admin/resume", "/api/resume")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground/60">{r.period}</p>
                    <h3 className="text-sm font-semibold mt-0.5">{r.role}</h3>
                    <p className="text-xs text-muted-foreground">{r.organization}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingResume(r)} data-testid={`edit-resume-${r.id}`}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteResume.mutate(r.id)} data-testid={`delete-resume-${r.id}`}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ============ STOCK PICKS ============ */}
        {activeTab === "stocks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Stock Picks</h2>
                <p className="text-sm text-muted-foreground">Your quarterly favorites with live quotes. Use arrows to reorder.</p>
              </div>
              <Button onClick={() => setEditingStock({ ticker: "", company: "", thesis: "", sortOrder: (stockPicks?.length || 0) })} data-testid="button-add-stock">
                <Plus size={14} className="mr-1" /> Add Stock Pick
              </Button>
            </div>
            {editingStock && (
              <Card className="border-primary/30 bg-primary/[0.02]">
                <CardContent className="pt-6 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">{editingStock.id ? "Edit Stock Pick" : "New Stock Pick"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Ticker (e.g. AAPL)" value={editingStock.ticker || ""} onChange={(e) => setEditingStock({ ...editingStock, ticker: e.target.value.toUpperCase() })} data-testid="input-stock-ticker" />
                    <Input placeholder="Company Name" value={editingStock.company || ""} onChange={(e) => setEditingStock({ ...editingStock, company: e.target.value })} data-testid="input-stock-company" />
                  </div>
                  <Textarea placeholder="Your thesis — why you like this stock this quarter" rows={3} value={editingStock.thesis || ""} onChange={(e) => setEditingStock({ ...editingStock, thesis: e.target.value })} data-testid="input-stock-thesis" />
                  <div className="flex gap-2">
                    <Button onClick={() => saveStock.mutate(editingStock)} disabled={saveStock.isPending} data-testid="button-save-stock"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="ghost" onClick={() => setEditingStock(null)}><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {stockPicks?.length === 0 && !editingStock && <p className="text-sm text-muted-foreground py-8 text-center">No stock picks yet. Click "Add Stock Pick" to get started.</p>}
            {stockPicks?.map((s, i) => (
              <Card key={s.id}>
                <CardContent className="pt-5 flex items-center gap-3">
                  <ReorderButtons index={i} total={stockPicks.length} onMove={(dir) => reorderItems(stockPicks, i, dir, "/api/admin/stock-picks", "/api/stock-picks")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{s.ticker}</span>
                      <span className="text-xs text-muted-foreground">{s.company}</span>
                      <span className="text-xs text-muted-foreground/40">#{i + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.thesis}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingStock(s)} data-testid={`edit-stock-${s.id}`}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteStock.mutate(s.id)} data-testid={`delete-stock-${s.id}`}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ============ FILES ============ */}
        {activeTab === "files" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Files</h2>
              <p className="text-sm text-muted-foreground">Upload files here, then link them to projects or writings. Click the copy icon to grab a download link.</p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"
              }`}
            >
              <Upload size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium mb-1">
                {uploading ? "Uploading..." : "Drag & drop files here"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
              <input
                type="file"
                className="hidden"
                id="file-upload"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = "";
                }}
                data-testid="input-file-upload"
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading} data-testid="button-browse-files">
                Browse Files
              </Button>
            </div>

            {/* File list */}
            {files && files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Files ({files.length})</p>
                {files.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                      <FileText size={20} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.originalName}</p>
                        <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB &middot; {f.uploadedAt?.slice(0, 10)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => copyFileLink(f)} title="Copy download link" data-testid={`copy-file-${f.id}`}>
                          {copiedLink === f.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </Button>
                        <a href={`${API_BASE}/api/download/${f.storedName}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" title="Download" data-testid={`download-file-${f.id}`}><Download size={14} /></Button>
                        </a>
                        <Button variant="ghost" size="sm" onClick={() => deleteFile.mutate(f.id)} title="Delete" data-testid={`delete-file-${f.id}`}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {files?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No files uploaded yet.</p>
            )}

            {/* Tip */}
            <Card className="bg-muted/30 border-border/30">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold mb-1">How to link files to projects</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload a file here, then copy its download link. Go to the Projects tab, edit a project, and paste the link in the "Link URL" field. Visitors will see a "View project" link that downloads or opens the file.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getToken());
  if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />;
  return <AdminPanel />;
}
