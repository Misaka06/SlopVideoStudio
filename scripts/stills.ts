// Quick visual check: renders one still per scene (no voice, estimated timing).
// Usage: npx tsx scripts/stills.ts [episode.json] [outDir] [landscape|vertical] [imagesDir]
// A slideshow script (scenes with an image "prompt") also renders a frame in the middle of
// each transition; imagesDir may hold slide-01.jpg, slide-02.jpg ... (else placeholders show).

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { draftTimeline, FPS, normalizeEpisode } from "../src/schema";
import { draftSlideTimeline, leadFrames, normalizeSlideshow, slideFrames } from "../src/slides";

const [file = "examples/time-loop.json", outDir = "stills", format = "landscape", imagesDir] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(file, "utf8"));
const slideshow = Array.isArray(raw.scenes) && raw.scenes.some((s: { prompt?: string }) => s.prompt);
const fmt = format as "landscape" | "vertical";

const show = slideshow ? normalizeSlideshow(raw) : null;
const timeline = show
  ? draftSlideTimeline(show, {
      format: fmt,
      music: null,
      musicVolume: 0.12,
      captions: show.settings.captions ?? "bold",
      images: show.scenes.map((_, i) => {
        const f = imagesDir && join(resolve(imagesDir), `slide-${String(i + 1).padStart(2, "0")}.jpg`);
        return f && existsSync(f) ? `data:image/jpeg;base64,${readFileSync(f).toString("base64")}` : null;
      }),
    })
  : draftTimeline(normalizeEpisode(raw), fmt);
const inputProps = { timeline };

const serveUrl = await bundle({ entryPoint: resolve(import.meta.dirname, "..", "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: slideshow ? "Slideshow" : "Episode", inputProps });
mkdirSync(outDir, { recursive: true });

let start = 0;
for (const [i, s] of timeline.scenes.entries()) {
  const frames = slideshow ? slideFrames(s) : Math.round(s.durationSec * FPS);
  const name = `scene-${String(i + 1).padStart(2, "0")}`;
  // A moment after the transition, while things are moving.
  await renderStill({ composition, serveUrl, inputProps, frame: start + Math.min(frames - 1, 40), output: join(outDir, `${name}.png`) });
  console.log(join(outDir, `${name}.png`));
  if (slideshow && i > 0) {
    const lead = leadFrames((s as (typeof timeline.scenes)[number] & { transition: Parameters<typeof leadFrames>[0] }).transition);
    await renderStill({ composition, serveUrl, inputProps, frame: Math.max(0, start - Math.ceil(lead / 2) + (lead ? 0 : 3)), output: join(outDir, `${name}-transition.png`) });
  }
  start += frames;
}
