// Stage 3: timeline -> MP4 with Remotion's renderer (no Remotion Studio involved).

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { join } from "node:path";
import type { Timeline } from "../src/schema";
import { ROOT, projectDir } from "./store";

let bundled: Promise<string> | null = null;

// The headless browser fetches audio from the app server, so it needs the full URL.
export async function renderVideo(id: string, timeline: Timeline, port: number, onProgress: (p: number) => void) {
  bundled ??= bundle({ entryPoint: join(ROOT, "src", "index.ts") });
  const serveUrl = await bundled;
  const inputProps = { timeline: { ...timeline, mediaBase: `http://localhost:${port}` } };
  const composition = await selectComposition({ serveUrl, id: "Episode", inputProps });
  const outputLocation = join(projectDir(id), "video.mp4");
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    onProgress: ({ progress }) => onProgress(progress),
  });
  return `/media/${id}/video.mp4`;
}
