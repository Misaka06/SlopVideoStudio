// Stage 2: narration -> one WAV per scene with Kokoro, then a render-ready timeline.

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { estimateWords, FPS, type EpisodeT, type Timeline } from "../src/schema";
import type { SlideshowT, SlideTimeline } from "../src/slides";
import { ROOT, projectDir, type Settings } from "./store";

const PAUSE_AFTER_SEC = 0.45;
const SLIDE_PAUSE_SEC = 0.55;
const PYTHON = process.env.PYTHON ?? "python";

export const VOICES: Record<Settings["lang"], { id: string; label: string }[]> = {
  "en-us": [
    { id: "am_michael", label: "Michael (male)" },
    { id: "am_adam", label: "Adam (male)" },
    { id: "am_fenrir", label: "Fenrir (male, deep)" },
    { id: "am_puck", label: "Puck (male, playful)" },
    { id: "af_heart", label: "Heart (female)" },
    { id: "af_bella", label: "Bella (female)" },
    { id: "af_nicole", label: "Nicole (female, soft)" },
  ],
  "en-gb": [
    { id: "bm_george", label: "George (male)" },
    { id: "bm_lewis", label: "Lewis (male)" },
    { id: "bf_emma", label: "Emma (female)" },
  ],
  es: [
    { id: "em_alex", label: "Alex (male)" },
    { id: "em_santa", label: "Santa (male)" },
    { id: "ef_dora", label: "Dora (female)" },
  ],
};

export const audioUrl = (id: string, i: number) => `/media/${id}/audio/scene-${String(i + 1).padStart(2, "0")}.wav`;

// One WAV per narration (optionally in another voice); returns each one's length in seconds.
async function recordNarration(id: string, lines: { text: string; voice?: string }[], s: Settings, onProgress: (p: number) => void): Promise<number[]> {
  const audioDir = join(projectDir(id), "audio");
  rmSync(audioDir, { recursive: true, force: true });
  mkdirSync(audioDir, { recursive: true });

  const items = lines.map((l, i) => ({ text: l.text, voice: l.voice || undefined, out: join(audioDir, `scene-${String(i + 1).padStart(2, "0")}.wav`) }));
  const jobFile = join(projectDir(id), "tts-job.json");
  writeFileSync(jobFile, JSON.stringify({ voice: s.voice, lang: s.lang, speed: s.speed, items }));

  const durations = new Map<string, number>();
  await new Promise<void>((done, fail) => {
    const py = spawn(PYTHON, [join(ROOT, "voice", "kokoro_tts.py"), jobFile], { cwd: ROOT });
    let err = "";
    let buf = "";
    py.stdout.on("data", (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("{")) continue;
        const r = JSON.parse(line) as { out: string; duration: number };
        durations.set(r.out, r.duration);
        onProgress(durations.size / items.length);
      }
    });
    py.stderr.on("data", (d) => (err += d.toString()));
    py.on("error", fail);
    py.on("close", (code) => (code === 0 ? done() : fail(new Error(`Voice failed: ${err.trim().split("\n").slice(-3).join(" ")}`))));
  });
  rmSync(jobFile, { force: true });
  return items.map((it) => durations.get(it.out) ?? 3);
}

export async function voiceEpisode(id: string, ep: EpisodeT, s: Settings, onProgress: (p: number) => void): Promise<Timeline> {
  const speech = await recordNarration(id, ep.scenes.map((sc) => ({ text: sc.narration })), s, onProgress);
  return {
    title: ep.title,
    fps: FPS,
    format: s.format,
    mediaBase: "",
    music: s.music ? `/assets/music/${s.music}` : null,
    cast: ep.cast,
    scenes: ep.scenes.map((sc, i) => ({
      ...sc,
      audio: audioUrl(id, i),
      durationSec: speech[i] + PAUSE_AFTER_SEC,
      words: estimateWords(sc.narration, speech[i]),
    })),
  };
}

// Slideshow narration: the timeline has audio and timings; images are added when rendering.
export async function voiceSlideshow(id: string, show: SlideshowT, s: Settings, onProgress: (p: number) => void): Promise<SlideTimeline> {
  const speech = await recordNarration(id, show.scenes.map((sc) => ({ text: sc.narration, voice: sc.voice })), s, onProgress);
  return {
    title: show.title,
    fps: FPS,
    format: s.format,
    mediaBase: "",
    music: s.music ? `/assets/music/${encodeURIComponent(s.music)}` : null,
    musicVolume: s.musicVolume,
    captions: s.captions,
    scenes: show.scenes.map((sc, i) => ({
      ...sc,
      image: null,
      audio: audioUrl(id, i),
      durationSec: speech[i] + SLIDE_PAUSE_SEC,
      words: estimateWords(sc.narration, speech[i]),
    })),
  };
}
