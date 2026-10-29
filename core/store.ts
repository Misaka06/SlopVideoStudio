// File-based project storage: projects/<id>/project.json plus audio/ and video.mp4.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { normalizeEpisode, type EpisodeT, type Timeline } from "../src/schema";

export const ROOT = resolve(import.meta.dirname, "..");
export const PROJECTS_DIR = join(ROOT, "projects");
mkdirSync(PROJECTS_DIR, { recursive: true });

export type StageName = "voice" | "render";

export type Settings = {
  format: "landscape" | "vertical";
  lang: "en-us" | "en-gb" | "es";
  voice: string;
  speed: number;
  music: string | null;
  imageBackgrounds: boolean; // use images from the background library when they exist
};

export const DEFAULT_SETTINGS: Settings = {
  format: "landscape",
  lang: "en-us",
  voice: "am_michael",
  speed: 1.05,
  music: null,
  imageBackgrounds: true,
};

export type Project = {
  id: string;
  topic: string;
  settings: Settings;
  status: "idle" | "queued" | "running" | "done" | "error";
  next: StageName | null; // next stage to run
  until: StageName; // last stage to run automatically
  message: string;
  progress: number; // 0..1 within the current stage
  error: string | null;
  episode: EpisodeT | null;
  timeline: Timeline | null;
  video: string | null; // URL path of the MP4
  createdAt: number;
  updatedAt: number;
};

const cache = new Map<string, Project>();

export function projectDir(id: string) {
  return join(PROJECTS_DIR, id);
}

export function newId(topic: string) {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "episode";
  return `${slug}-${randomBytes(3).toString("hex")}`;
}

export function save(p: Project) {
  p.updatedAt = Date.now();
  cache.set(p.id, p);
  mkdirSync(projectDir(p.id), { recursive: true });
  writeFileSync(join(projectDir(p.id), "project.json"), JSON.stringify(p, null, 2));
  return p;
}

export function get(id: string): Project | null {
  if (cache.has(id)) return cache.get(id)!;
  const f = join(projectDir(id), "project.json");
  if (!existsSync(f)) return null;
  const p = JSON.parse(readFileSync(f, "utf8")) as Project;
  // Projects saved before a schema change get the new fields filled in.
  if (p.episode) p.episode = normalizeEpisode(p.episode);
  cache.set(id, p);
  return p;
}

export function list(): Project[] {
  for (const id of readdirSync(PROJECTS_DIR)) if (!cache.has(id)) get(id);
  return [...cache.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function remove(id: string) {
  cache.delete(id);
  rmSync(projectDir(id), { recursive: true, force: true });
}

// Anything left "running" by a crash goes back in the queue on startup.
export function recover() {
  for (const p of list()) {
    if (p.status === "running" && p.episode) save({ ...p, status: "queued", message: "Resumed after restart", progress: 0 });
    // Projects from the old topic-only flow never got a script; they can't continue.
    else if (!p.episode && p.status !== "error") save({ ...p, status: "error", next: null, error: "No script. Send one with produce_from_script.", message: "No script" });
  }
}
