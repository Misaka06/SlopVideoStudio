// Production queue. Each project moves voice -> render; each stage has its own
// concurrency limit. Scripts are written by the LLM driving the MCP server, not here.

import { draftTimeline, type EpisodeT } from "../src/schema";
import { fixEpisode } from "./script";
import { withLibrary } from "./backgrounds";
import { renderVideo } from "./render";
import * as store from "./store";
import { voiceEpisode } from "./voice";
import type { Project, Settings, StageName } from "./store";

const ORDER: StageName[] = ["voice", "render"];
const LIMITS: Record<StageName, number> = { voice: 1, render: 1 };
const running: Record<StageName, number> = { voice: 0, render: 0 };
let port = 4000;

export function start(serverPort: number) {
  port = serverPort;
  store.recover();
  pump();
}

export function create(opts: { episode: EpisodeT; settings?: Partial<Settings>; until?: StageName }) {
  const settings = { ...store.DEFAULT_SETTINGS, ...opts.settings };
  const episode = fixEpisode(opts.episode);
  const topic = episode.title || "Untitled";
  const p: Project = {
    id: store.newId(topic),
    topic,
    settings,
    status: "queued",
    next: "voice",
    until: opts.until ?? "render",
    message: "Waiting in queue",
    progress: 0,
    error: null,
    episode,
    timeline: draftTimeline(episode, settings.format),
    video: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.save(p);
  pump();
  return p;
}

// Re-queue a project from a given stage (e.g. after editing the script).
export function runFrom(id: string, from: StageName, until: StageName = "render") {
  const p = store.get(id);
  if (!p) throw new Error(`No project ${id}`);
  if (p.status === "running") throw new Error("Project is busy; wait until the current stage finishes");
  if (!p.episode) throw new Error("This project has no script yet");
  store.save({ ...p, status: "queued", next: from, until, error: null, message: "Waiting in queue", progress: 0 });
  pump();
}

export function updateEpisode(id: string, episode: EpisodeT, settings?: Partial<Settings>) {
  const p = store.get(id);
  if (!p) throw new Error(`No project ${id}`);
  if (p.status === "running") throw new Error("Project is busy; wait until the current stage finishes");
  const s = { ...p.settings, ...settings };
  const ep = fixEpisode(episode);
  // If the narration is unchanged and already recorded, keep the audio and only re-render.
  const voiced = p.timeline?.scenes.length === ep.scenes.length && p.timeline.scenes.every((t, i) => t.audio && t.narration === ep.scenes[i].narration);
  if (voiced && p.timeline) {
    const timeline = { ...p.timeline, cast: ep.cast, scenes: p.timeline.scenes.map((t, i) => ({ ...t, ...ep.scenes[i] })) };
    return store.save({ ...p, settings: s, episode: ep, timeline, status: "idle", next: "render", message: "Edited — render again to update the video" });
  }
  // Narration edits invalidate the voice and video; keep a draft timeline for the preview.
  return store.save({ ...p, settings: s, episode: ep, timeline: draftTimeline(ep, s.format), video: null, status: "idle", next: "voice", message: "Edited — voice and render again to update the video" });
}

function pump() {
  for (const stage of ORDER) {
    while (running[stage] < LIMITS[stage]) {
      const p = store.list().filter((x) => x.status === "queued" && x.next === stage).sort((a, b) => a.updatedAt - b.updatedAt)[0];
      if (!p) break;
      running[stage]++;
      void runStage(p, stage).finally(() => {
        running[stage]--;
        pump();
      });
    }
  }
}

async function runStage(p: Project, stage: StageName) {
  const set = (patch: Partial<Project>) => store.save({ ...store.get(p.id)!, ...patch });
  set({ status: "running", message: { voice: "Recording narration", render: "Rendering video" }[stage], progress: 0 });
  try {
    if (stage === "voice") {
      const cur = store.get(p.id)!;
      const timeline = await voiceEpisode(p.id, cur.episode!, cur.settings, (progress) => set({ progress }));
      set({ timeline });
    } else {
      const cur = store.get(p.id)!;
      const video = await renderVideo(p.id, withLibrary(cur.timeline!, cur.settings), port, (progress) => set({ progress }));
      set({ video });
    }
    const cur = store.get(p.id)!;
    const i = ORDER.indexOf(stage);
    const done = stage === cur.until;
    set({
      status: done ? (stage === "render" ? "done" : "idle") : "queued",
      next: i + 1 < ORDER.length ? ORDER[i + 1] : null,
      progress: 1,
      message: done ? (stage === "render" ? "Video ready" : "Narration ready") : "Waiting in queue",
    });
  } catch (e) {
    set({ status: "error", error: e instanceof Error ? e.message : String(e), message: `Failed while ${stage === "voice" ? "recording narration" : "rendering"}` });
  }
}
