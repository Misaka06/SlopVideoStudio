// Production queue. Each project moves voice -> render; each stage has its own
// concurrency limit. Scripts are written by the LLM driving the MCP server, not here.

import { draftTimeline, type EpisodeT } from "../src/schema";
import { fixEpisode } from "./script";
import { withLibrary } from "./backgrounds";
import { renderVideo } from "./render";
import * as store from "./store";
import { draftSlideTimeline, type SlideshowT } from "../src/slides";
import { fixSlideshow, missingImages, timelineFor } from "./slideshow";
import { VOICES, voiceEpisode, voiceSlideshow } from "./voice";
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

const clean = <T extends object>(o: T | undefined) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined)) as Partial<T>;

// Slideshows voice first (so lengths are known) and wait for the user's images before rendering.
// Settings: defaults < the writer's own choices in the script < explicit settings from the caller.
export function createSlideshow(opts: { slideshow: SlideshowT; settings?: Partial<Settings> }) {
  const show = fixSlideshow(opts.slideshow);
  if (!show.scenes.length) throw new Error("The slideshow has no scenes with narration");
  const w = show.settings;
  const settings: Settings = { ...store.DEFAULT_SETTINGS, ...clean({ format: w.format, lang: w.lang, voice: w.voice, speed: w.speed, music: w.music, musicVolume: w.musicVolume, captions: w.captions }), ...clean(opts.settings) };
  // A voice must belong to the chosen language.
  if (!VOICES[settings.lang].some((v) => v.id === settings.voice)) settings.voice = VOICES[settings.lang][0].id;
  const p: Project = {
    id: store.newId(show.title),
    topic: show.title,
    settings,
    status: "queued",
    next: "voice",
    until: "voice",
    message: "Waiting in queue",
    progress: 0,
    error: null,
    episode: null,
    timeline: null,
    slideshow: show,
    slides: null,
    video: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  p.slides = draftSlideTimeline(show, { format: settings.format, music: null, musicVolume: settings.musicVolume, captions: settings.captions });
  store.save(p);
  pump();
  return p;
}

export function updateSlideshow(id: string, raw: unknown, settings?: Partial<Settings>) {
  const p = store.get(id);
  if (!p?.slideshow) throw new Error(`No slideshow ${id}`);
  if (p.status === "running") throw new Error("Project is busy; wait until the current stage finishes");
  const show = fixSlideshow(raw);
  if (!show.scenes.length) throw new Error("The slideshow has no scenes with narration");
  const s = { ...p.settings, ...settings };
  // Same narration and voice per scene: keep the recording and only render again.
  const old = p.slides;
  const voiced = Boolean(old) && old!.scenes.length === show.scenes.length && old!.scenes.every((t, i) => t.audio && t.narration === show.scenes[i].narration && t.voice === show.scenes[i].voice);
  const voiceSame = !settings || (["voice", "lang", "speed"] as const).every((k) => settings[k] === undefined || settings[k] === p.settings[k]);
  if (voiced && voiceSame && old) {
    const slides = { ...old, scenes: old.scenes.map((t, i) => ({ ...t, ...show.scenes[i] })) };
    return store.save({ ...p, settings: s, slideshow: show, slides, status: "idle", next: "render", message: "Edited — render again to update the video" });
  }
  const slides = draftSlideTimeline(show, { format: s.format, music: null, musicVolume: s.musicVolume, captions: s.captions });
  return store.save({ ...p, settings: s, slideshow: show, slides, video: null, status: "idle", next: "voice", message: "Edited — voice and render again to update the video" });
}

// Re-queue a project from a given stage (e.g. after editing the script).
export function runFrom(id: string, from: StageName, until: StageName = "render", opts: { allowMissing?: boolean } = {}) {
  const p = store.get(id);
  if (!p) throw new Error(`No project ${id}`);
  if (p.status === "running") throw new Error("Project is busy; wait until the current stage finishes");
  if (!p.episode && !p.slideshow) throw new Error("This project has no script yet");
  if (p.slideshow && until === "render" && !opts.allowMissing) {
    const missing = missingImages(p);
    if (missing.length) throw new Error(`Add the images first: scene${missing.length > 1 ? "s" : ""} ${missing.join(", ")} still ${missing.length > 1 ? "have" : "has"} no image (or render with placeholders on purpose)`);
  }
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
    const cur = store.get(p.id)!;
    if (stage === "voice") {
      if (cur.slideshow) set({ slides: await voiceSlideshow(p.id, cur.slideshow, cur.settings, (progress) => set({ progress })) });
      else set({ timeline: await voiceEpisode(p.id, cur.episode!, cur.settings, (progress) => set({ progress })) });
    } else if (cur.slideshow) {
      set({ video: await renderVideo(p.id, timelineFor(cur), port, (progress) => set({ progress }), "Slideshow") });
    } else {
      set({ video: await renderVideo(p.id, withLibrary(cur.timeline!, cur.settings), port, (progress) => set({ progress })) });
    }
    const after = store.get(p.id)!;
    const i = ORDER.indexOf(stage);
    const done = stage === after.until;
    set({
      status: done ? (stage === "render" ? "done" : "idle") : "queued",
      next: i + 1 < ORDER.length ? ORDER[i + 1] : null,
      progress: 1,
      message: done ? (stage === "render" ? "Video ready" : after.slideshow ? "Narration ready — add the images, then render" : "Narration ready") : "Waiting in queue",
    });
  } catch (e) {
    set({ status: "error", error: e instanceof Error ? e.message : String(e), message: `Failed while ${stage === "voice" ? "recording narration" : "rendering"}` });
  }
}
