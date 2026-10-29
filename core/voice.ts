// Stage 2: narration -> one WAV per scene with Kokoro, then a render-ready timeline.

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { estimateWords, FPS, type EpisodeT, type Timeline } from "../src/schema";
import { ROOT, projectDir, type Settings } from "./store";

const PAUSE_AFTER_SEC = 0.45;
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

export async function voiceEpisode(id: string, ep: EpisodeT, s: Settings, onProgress: (p: number) => void): Promise<Timeline> {
  const audioDir = join(projectDir(id), "audio");
  rmSync(audioDir, { recursive: true, force: true });
  mkdirSync(audioDir, { recursive: true });

  const items = ep.scenes.map((sc, i) => ({ text: sc.narration, out: join(audioDir, `scene-${String(i + 1).padStart(2, "0")}.wav`) }));
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

  return {
    title: ep.title,
    fps: FPS,
    format: s.format,
    mediaBase: "",
    music: s.music ? `/assets/music/${s.music}` : null,
    cast: ep.cast,
    scenes: ep.scenes.map((sc, i) => {
      const speech = durations.get(items[i].out) ?? 3;
      return {
        ...sc,
        audio: `/media/${id}/audio/scene-${String(i + 1).padStart(2, "0")}.wav`,
        durationSec: speech + PAUSE_AFTER_SEC,
        words: estimateWords(sc.narration, speech),
      };
    }),
  };
}
