import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";

// Set up file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ============ YAHOO FINANCE QUOTE CACHE ============
interface QuoteData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
  fetchedAt: number;
}

const quoteCache = new Map<string, QuoteData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchYahooQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return {
      ticker: ticker.toUpperCase(),
      price,
      change,
      changePercent,
      marketState: meta.marketState || "CLOSED",
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

async function getQuotes(tickers: string[]): Promise<Record<string, QuoteData>> {
  const result: Record<string, QuoteData> = {};
  const toFetch: string[] = [];

  for (const t of tickers) {
    const cached = quoteCache.get(t.toUpperCase());
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      result[t.toUpperCase()] = cached;
    } else {
      toFetch.push(t);
    }
  }

  // Fetch missing quotes in parallel
  const fetched = await Promise.all(toFetch.map(fetchYahooQuote));
  for (const q of fetched) {
    if (q) {
      quoteCache.set(q.ticker, q);
      result[q.ticker] = q;
    }
  }

  return result;
}

// Simple auth middleware using a session token stored in memory
const sessions = new Map<string, string>(); // token -> username

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ============
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessions.set(token, username);
    res.json({ token, username });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ username: sessions.get(token) });
  });

  // ============ PUBLIC API ============
  app.get("/api/settings", (_req, res) => {
    res.json(storage.getSettings());
  });

  app.get("/api/projects", (_req, res) => {
    res.json(storage.getProjects());
  });

  app.get("/api/writings", (_req, res) => {
    res.json(storage.getWritings());
  });

  app.get("/api/resume", (_req, res) => {
    res.json(storage.getResumeEntries());
  });

  app.get("/api/stock-picks", (_req, res) => {
    res.json(storage.getStockPicks());
  });

  app.get("/api/quotes", async (_req, res) => {
    try {
      const picks = storage.getStockPicks();
      const tickers = picks.map(p => p.ticker).filter(Boolean);
      if (tickers.length === 0) return res.json({});
      const quotes = await getQuotes(tickers);
      res.json(quotes);
    } catch {
      res.json({});
    }
  });

  app.get("/api/files", (_req, res) => {
    res.json(storage.getFiles());
  });

  // Serve static content (thesis pages, etc.)
  app.get("/static/:filename", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "static", req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.sendFile(filePath);
  });

  // Serve uploaded files
  app.get("/api/uploads/:filename", (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.sendFile(filePath);
  });

  // Download uploaded files with proper headers
  app.get("/api/download/:filename", (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    // Look up original name from DB
    const files = storage.getFiles();
    const fileRecord = files.find(f => f.storedName === req.params.filename);
    const downloadName = fileRecord?.originalName || req.params.filename;
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.sendFile(filePath);
  });

  // ============ ADMIN API (auth required) ============

  // Settings
  app.put("/api/admin/settings", authMiddleware, (req, res) => {
    const updated = storage.updateSettings(req.body);
    res.json(updated);
  });

  // Projects CRUD
  app.post("/api/admin/projects", authMiddleware, (req, res) => {
    const project = storage.createProject(req.body);
    res.status(201).json(project);
  });

  app.put("/api/admin/projects/:id", authMiddleware, (req, res) => {
    const updated = storage.updateProject(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/projects/:id", authMiddleware, (req, res) => {
    storage.deleteProject(Number(req.params.id));
    res.json({ ok: true });
  });

  // Writings CRUD
  app.post("/api/admin/writings", authMiddleware, (req, res) => {
    const writing = storage.createWriting(req.body);
    res.status(201).json(writing);
  });

  app.put("/api/admin/writings/:id", authMiddleware, (req, res) => {
    const updated = storage.updateWriting(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/writings/:id", authMiddleware, (req, res) => {
    storage.deleteWriting(Number(req.params.id));
    res.json({ ok: true });
  });

  // Resume CRUD
  app.post("/api/admin/resume", authMiddleware, (req, res) => {
    const entry = storage.createResumeEntry(req.body);
    res.status(201).json(entry);
  });

  app.put("/api/admin/resume/:id", authMiddleware, (req, res) => {
    const updated = storage.updateResumeEntry(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/resume/:id", authMiddleware, (req, res) => {
    storage.deleteResumeEntry(Number(req.params.id));
    res.json({ ok: true });
  });

  // Stock Picks CRUD
  app.post("/api/admin/stock-picks", authMiddleware, (req, res) => {
    const pick = storage.createStockPick(req.body);
    res.status(201).json(pick);
  });

  app.put("/api/admin/stock-picks/:id", authMiddleware, (req, res) => {
    const updated = storage.updateStockPick(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/stock-picks/:id", authMiddleware, (req, res) => {
    storage.deleteStockPick(Number(req.params.id));
    res.json({ ok: true });
  });

  // File upload
  app.post("/api/admin/upload", authMiddleware, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileRecord = storage.createFile({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    });
    res.status(201).json(fileRecord);
  });

  app.delete("/api/admin/files/:id", authMiddleware, (req, res) => {
    const file = storage.deleteFile(Number(req.params.id));
    if (file) {
      const filePath = path.join(uploadDir, file.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ ok: true });
  });

  return httpServer;
}
