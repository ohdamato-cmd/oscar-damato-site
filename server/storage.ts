import {
  type User, type InsertUser, users,
  type SiteSettings, type InsertSiteSettings, siteSettings,
  type Project, type InsertProject, projects,
  type Writing, type InsertWriting, writings,
  type ResumeEntry, type InsertResumeEntry, resumeEntries,
  type StockPick, type InsertStockPick, stockPicks,
  type UploadedFile, type InsertUploadedFile, uploadedFiles,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, asc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByUsername(username: string): User | undefined;
  createUser(user: InsertUser): User;
  // Site settings
  getSettings(): SiteSettings;
  updateSettings(data: Partial<InsertSiteSettings>): SiteSettings;
  // Projects
  getProjects(): Project[];
  getProject(id: number): Project | undefined;
  createProject(data: InsertProject): Project;
  updateProject(id: number, data: Partial<InsertProject>): Project | undefined;
  deleteProject(id: number): void;
  // Writings
  getWritings(): Writing[];
  getWriting(id: number): Writing | undefined;
  createWriting(data: InsertWriting): Writing;
  updateWriting(id: number, data: Partial<InsertWriting>): Writing | undefined;
  deleteWriting(id: number): void;
  // Resume
  getResumeEntries(): ResumeEntry[];
  getResumeEntry(id: number): ResumeEntry | undefined;
  createResumeEntry(data: InsertResumeEntry): ResumeEntry;
  updateResumeEntry(id: number, data: Partial<InsertResumeEntry>): ResumeEntry | undefined;
  deleteResumeEntry(id: number): void;
  // Stock Picks
  getStockPicks(): StockPick[];
  getStockPick(id: number): StockPick | undefined;
  createStockPick(data: InsertStockPick): StockPick;
  updateStockPick(id: number, data: Partial<InsertStockPick>): StockPick | undefined;
  deleteStockPick(id: number): void;
  // Files
  getFiles(): UploadedFile[];
  createFile(data: InsertUploadedFile): UploadedFile;
  deleteFile(id: number): UploadedFile | undefined;
}

export class DatabaseStorage implements IStorage {
  // Users
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  createUser(insertUser: InsertUser): User {
    return db.insert(users).values(insertUser).returning().get();
  }

  // Site settings
  getSettings(): SiteSettings {
    let s = db.select().from(siteSettings).get();
    if (!s) {
      s = db.insert(siteSettings).values({
        greeting: "Hello, I'm Oscar",
        title: "",
        subtitle: "I'm a current student at FSU pursuing a marketing degree alongside an MBA, with a growing focus on operations, finance, and supply chain. I started in marketing and found myself increasingly drawn to the systems and strategy behind it. I've enjoyed building my finance knowledge whether through my personal portfolio, exploring alternative finance, or finding ways to apply it directly to the work in front of me.",
        ctaText: "View my work",
      }).returning().get();
    }
    return s;
  }
  updateSettings(data: Partial<InsertSiteSettings>): SiteSettings {
    const current = this.getSettings();
    return db.update(siteSettings).set(data).where(eq(siteSettings.id, current.id)).returning().get();
  }

  // Projects
  getProjects(): Project[] {
    return db.select().from(projects).orderBy(asc(projects.sortOrder)).all();
  }
  getProject(id: number): Project | undefined {
    return db.select().from(projects).where(eq(projects.id, id)).get();
  }
  createProject(data: InsertProject): Project {
    return db.insert(projects).values(data).returning().get();
  }
  updateProject(id: number, data: Partial<InsertProject>): Project | undefined {
    return db.update(projects).set(data).where(eq(projects.id, id)).returning().get();
  }
  deleteProject(id: number): void {
    db.delete(projects).where(eq(projects.id, id)).run();
  }

  // Writings
  getWritings(): Writing[] {
    return db.select().from(writings).orderBy(asc(writings.sortOrder)).all();
  }
  getWriting(id: number): Writing | undefined {
    return db.select().from(writings).where(eq(writings.id, id)).get();
  }
  createWriting(data: InsertWriting): Writing {
    return db.insert(writings).values(data).returning().get();
  }
  updateWriting(id: number, data: Partial<InsertWriting>): Writing | undefined {
    return db.update(writings).set(data).where(eq(writings.id, id)).returning().get();
  }
  deleteWriting(id: number): void {
    db.delete(writings).where(eq(writings.id, id)).run();
  }

  // Resume
  getResumeEntries(): ResumeEntry[] {
    return db.select().from(resumeEntries).orderBy(asc(resumeEntries.sortOrder)).all();
  }
  getResumeEntry(id: number): ResumeEntry | undefined {
    return db.select().from(resumeEntries).where(eq(resumeEntries.id, id)).get();
  }
  createResumeEntry(data: InsertResumeEntry): ResumeEntry {
    return db.insert(resumeEntries).values(data).returning().get();
  }
  updateResumeEntry(id: number, data: Partial<InsertResumeEntry>): ResumeEntry | undefined {
    return db.update(resumeEntries).set(data).where(eq(resumeEntries.id, id)).returning().get();
  }
  deleteResumeEntry(id: number): void {
    db.delete(resumeEntries).where(eq(resumeEntries.id, id)).run();
  }

  // Stock Picks
  getStockPicks(): StockPick[] {
    return db.select().from(stockPicks).orderBy(asc(stockPicks.sortOrder)).all();
  }
  getStockPick(id: number): StockPick | undefined {
    return db.select().from(stockPicks).where(eq(stockPicks.id, id)).get();
  }
  createStockPick(data: InsertStockPick): StockPick {
    return db.insert(stockPicks).values(data).returning().get();
  }
  updateStockPick(id: number, data: Partial<InsertStockPick>): StockPick | undefined {
    return db.update(stockPicks).set(data).where(eq(stockPicks.id, id)).returning().get();
  }
  deleteStockPick(id: number): void {
    db.delete(stockPicks).where(eq(stockPicks.id, id)).run();
  }

  // Files
  getFiles(): UploadedFile[] {
    return db.select().from(uploadedFiles).all();
  }
  createFile(data: InsertUploadedFile): UploadedFile {
    return db.insert(uploadedFiles).values(data).returning().get();
  }
  deleteFile(id: number): UploadedFile | undefined {
    const file = db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).get();
    if (file) {
      db.delete(uploadedFiles).where(eq(uploadedFiles.id, id)).run();
    }
    return file;
  }
}

export const storage = new DatabaseStorage();

// Seed default data if empty
function seedDefaults() {
  if (storage.getProjects().length === 0) {
    storage.createProject({ title: "Cheniere Energy: Short Thesis", description: "An investigative, WSJ-style analysis arguing that Cheniere's valuation is built on a future the world is moving away from. Deep dive into LNG supply, demand, and stranded-asset risk.", tag: "Financial Analysis", link: "/static/cheniere-short-thesis.html", imageUrl: "", sortOrder: 0 });
  }
  if (storage.getWritings().length === 0) {
    storage.createWriting({ title: "Green Salvation or Ecological Suicide? The Moral Dilemma of the Abyss", excerpt: "An op-ed exploring the tension between deep-sea mining as a clean energy enabler and its irreversible ecological consequences on the ocean floor.", date: "Mar 2026", link: "", sortOrder: 0 });
    storage.createWriting({ title: "Why LNG Is the Last Great Energy Trade — and Why It Won't Last", excerpt: "A look at the structural forces that made liquefied natural gas the decade's best trade, and the demand-side signals that suggest the window is closing.", date: "Apr 2026", link: "", sortOrder: 1 });
    storage.createWriting({ title: "From Marketing to Operations: A Career Pivot in Real Time", excerpt: "A candid reflection on leaving a marketing path to pursue operations and finance — what prompted the shift, and what I'm learning along the way.", date: "Apr 2026", link: "", sortOrder: 2 });
  }
  if (storage.getResumeEntries().length === 0) {
    storage.createResumeEntry({ period: "2023 — 2026 (Expected)", role: "Marketing and MBA Pathway", organization: "Florida State University", description: "Pursuing a Bachelor's of Marketing and Master of Business Administration concurrently through the Combined Pathways Program, where I've been learning about the aspects of the business world that go beyond the brand, into financials, legal, and even the ethics of operations. Graduating Summa Cum Laude with a 3.90 GPA, Dean's List, and President's List recognition.", sortOrder: 0 });
    storage.createResumeEntry({ period: "2025 — Present", role: "Prospect Analyst", organization: "Florida State University Foundation", description: "Spending the 2025–2026 school year on the Due Diligence Team at the FSU Foundation, researching and evaluating prospective donors (individuals, families, and corporations). I produce 20+ validated analytical profiles weekly, manage confidential financial data, and designed an AI-assisted workflow using Microsoft Copilot to standardize classification logic and reduce manual review time across large datasets.", sortOrder: 1 });
    storage.createResumeEntry({ period: "2025 — Present", role: "Graduate Assistant", organization: "Florida State University", description: "Being a Graduate Assistant at the Herbert Wertheim College of Business has been a lot more hands-on than I expected. On the front-end, I get to work directly with prospective and current students — answering their questions, pointing them toward resources, and helping them figure out what the college can actually do for them. On the back-end, I've been supporting departmental projects using Excel, Power BI, and Adobe Photoshop, which has given me a chance to bring a creative eye to work that's usually pretty data-heavy.", sortOrder: 2 });
    storage.createResumeEntry({ period: "April 2024 — Present", role: "Founder", organization: "William Dodd Society", description: "There wasn't really a space on campus for the kind of conversations I wanted to be having: unstructured and friendly debates on the ideas and events I had passion about. So I built one with others who felt the same. Starting the William Dodd Society from scratch meant figuring out everything myself: how to govern it, how to structure leadership, how to design meetings that people would actually show up for, all without any institutional backing or budget to lean on. What I'm most proud of isn't the founding, though. It's that it stuck. We grew a membership of students who came in with genuinely different viewpoints and left having actually engaged with each other. It was one of the more meaningful things I did at FSU.", sortOrder: 3 });
    storage.createResumeEntry({ period: "April — July 2025", role: "Marketing Intern", organization: "Aramark", description: "My summer at Aramark was about as direct as sales gets, where I was talking to students face-to-face at campus events and over the phone to sell dining programs. I ended up generating over $500,000 in revenue, which was an encouraging milestone for me. Beyond the numbers, I got comfortable working a CRM to track leads and keep the pipeline organized. It was a crash course in client engagement that sharpened skills I hadn't fully developed in classroom settings.", sortOrder: 4 });
    storage.createResumeEntry({ period: "April — August 2025", role: "Personal Assistant", organization: "JR Harding", description: "I interned under a disability consultant who focuses on ADA disputes, which gave me an unexpectedly specific window into how compliance and advocacy work in practice. Day-to-day, I managed his scheduling and kept financial records in order, reconciling payroll and expense reports in Excel and ADP. It required a level of precision and discretion I hadn't had to exercise before, and I came away with a much stronger handle on financial recordkeeping and the logistics of running a business.", sortOrder: 5 });
  }
  if (storage.getStockPicks().length === 0) {
    storage.createStockPick({ ticker: "AAPL", company: "Apple Inc.", thesis: "Add your thesis here.", sortOrder: 0 });
    storage.createStockPick({ ticker: "MSFT", company: "Microsoft Corp.", thesis: "Add your thesis here.", sortOrder: 1 });
    storage.createStockPick({ ticker: "GOOGL", company: "Alphabet Inc.", thesis: "Add your thesis here.", sortOrder: 2 });
    storage.createStockPick({ ticker: "AMZN", company: "Amazon.com Inc.", thesis: "Add your thesis here.", sortOrder: 3 });
    storage.createStockPick({ ticker: "NVDA", company: "NVIDIA Corp.", thesis: "Add your thesis here.", sortOrder: 4 });
  }
  // Create default admin if none exists
  if (!storage.getUserByUsername("ohdamato@gmail.com")) {
    storage.createUser({ username: "ohdamato@gmail.com", password: "Le13Os6Lo18!" });
  }
}

seedDefaults();
