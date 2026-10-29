// Quick visual check: renders one still per scene (no voice, estimated timing).
// Usage: npx tsx scripts/stills.ts [episode.json] [outDir] [landscape|vertical]

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { draftTimeline, FPS, normalizeEpisode } from "../src/schema";

const [file = "examples/time-loop.json", outDir = "stills", format = "landscape"] = process.argv.slice(2);
const timeline = draftTimeline(normalizeEpisode(JSON.parse(readFileSync(file, "utf8"))), format as "landscape" | "vertical");
const inputProps = { timeline };

const serveUrl = await bundle({ entryPoint: resolve(import.meta.dirname, "..", "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "Episode", inputProps });
mkdirSync(outDir, { recursive: true });

let start = 0;
for (const [i, s] of timeline.scenes.entries()) {
  const frames = Math.round(s.durationSec * FPS);
  const output = join(outDir, `scene-${String(i + 1).padStart(2, "0")}.png`);
  // A moment after the transition, while things are moving.
  await renderStill({ composition, serveUrl, inputProps, frame: start + Math.min(frames - 1, 40), output });
  console.log(output);
  start += frames;
}
