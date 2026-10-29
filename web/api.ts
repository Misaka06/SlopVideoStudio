import type { EpisodeT } from "../src/schema";
import type { Project, Settings, StageName } from "../core/store";

export type Summary = {
  id: string;
  topic: string;
  title: string | null;
  status: Project["status"];
  next: StageName | null;
  message: string;
  progress: number;
  error: string | null;
  video: string | null;
  scenes: number;
  seconds: number;
  format: Settings["format"];
  createdAt: number;
};

export type Config = {
  model: string;
  voices: Record<Settings["lang"], { id: string; label: string }[]>;
  music: string[];
  defaults: Settings;
  options: Record<string, readonly string[]>;
};

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

export type BackgroundEntry = { key: string; bg: string; time: string; prompt: string; url: string | null; scenes: number[] };
export type PropEntry = {
  key: string; id: string; name: string; description: string; kind: "set" | "held"; size: string; grip: string;
  front: boolean; builtin: boolean; prompt: string; url: string | null; animated: boolean; scenes?: number[];
};
export type ProjectView = Project & { backgrounds: BackgroundEntry[]; props: PropEntry[] };
export type CharacterEntry = { name: string; torso: string | null; topper: string | null; sleeve: string | null; updatedAt: number };
export type NewProp ={ name: string; description: string; kind: "set" | "held"; size: string; grip?: string; front?: boolean };

async function upload<T>(url: string, file: File): Promise<T> {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

export const api = {
  config: () => call<Config>("GET", "/api/config"),
  list: () => call<Summary[]>("GET", "/api/projects"),
  get: (id: string) => call<ProjectView>("GET", `/api/projects/${id}`),
  setSettings: (id: string, settings: Partial<Settings>) => call<Summary>("PATCH", `/api/projects/${id}/settings`, settings),
  backgrounds: () => call<BackgroundEntry[]>("GET", "/api/backgrounds"),
  uploadBackground: async (key: string, file: File) => {
    const res = await fetch(`/api/backgrounds/${key}`, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? res.statusText);
    return data as { ok: true; url: string };
  },
  removeBackground: (key: string) => call<{ ok: true }>("DELETE", `/api/backgrounds/${key}`),
  props: () => call<PropEntry[]>("GET", "/api/props"),
  createProp: (p: NewProp) => call<PropEntry>("POST", "/api/props", p),
  uploadProp: (key: string, file: File) => upload<PropEntry>(`/api/props/${key}`, file),
  characters: () => call<CharacterEntry[]>("GET", "/api/characters"),
  characterPrompt: (body: { outfit: string; hair?: string; body?: string }) => call<{ prompt: string }>("POST", "/api/characters/prompt", body),
  uploadCharacter: (name: string, file: File) => upload<CharacterEntry>(`/api/characters/${encodeURIComponent(name)}`, file),
  removeCharacter: (name: string) => call<{ ok: true }>("DELETE", `/api/characters/${encodeURIComponent(name)}`),
  sheetPrompt: (keys: string[]) => call<{ prompt: string }>("POST", "/api/props/sheet-prompt", { keys }),
  uploadSheet: (keys: string[], file: File) => upload<PropEntry[]>(`/api/props/sheet?keys=${encodeURIComponent(keys.join(","))}`, file),
  removeProp: (key: string) => call<{ ok: true }>("DELETE", `/api/props/${key}`),
  create: (body: { episode: EpisodeT; settings: Partial<Settings>; until: StageName }) => call<Summary[]>("POST", "/api/projects", body),
  saveEpisode: (id: string, episode: EpisodeT, settings?: Partial<Settings>) => call<Project>("PUT", `/api/projects/${id}/episode`, { episode, settings }),
  run: (id: string, from: StageName, until: StageName = "render") => call<Summary>("POST", `/api/projects/${id}/run`, { from, until }),
  remove: (id: string) => call<{ ok: true }>("DELETE", `/api/projects/${id}`),
};

export type { Project, Settings, StageName, EpisodeT };
