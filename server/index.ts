// App server: REST API for the web app and the MCP server, plus media and the built UI.

import express from "express";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import * as bgs from "../core/backgrounds";
import * as chars from "../core/characters";
import * as props from "../core/props";
import * as jobs from "../core/jobs";
import { scriptGuide } from "../core/script";
import * as store from "../core/store";
import { VOICES } from "../core/voice";
import * as S from "../src/schema";

const PORT = Number(process.env.PORT ?? 4000);
const MUSIC_DIR = join(store.ROOT, "assets", "music");
mkdirSync(MUSIC_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "5mb" }));

// Summary rows keep list responses small (the MCP server relays them to a model).
const summary = (p: store.Project) => ({
  id: p.id,
  topic: p.topic,
  title: p.episode?.title ?? null,
  status: p.status,
  next: p.next,
  message: p.message,
  progress: p.progress,
  error: p.error,
  video: p.video,
  scenes: p.episode?.scenes.length ?? 0,
  seconds: p.timeline ? Math.round(p.timeline.scenes.reduce((n, s) => n + s.durationSec, 0)) : 0,
  format: p.settings.format,
  createdAt: p.createdAt,
});

const wrap =
  (fn: (req: express.Request, res: express.Response) => unknown) =>
  async (req: express.Request, res: express.Response) => {
    try {
      const out = await fn(req, res);
      if (!res.headersSent) res.json(out);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  };

app.get("/api/config", wrap(() => ({
  voices: VOICES,
  music: readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f)),
  defaults: store.DEFAULT_SETTINGS,
  options: {
    bg: S.BACKGROUNDS, time: S.TIMES, pose: S.POSES, face: S.EXPRESSIONS, emote: S.EMOTES, hat: S.HATS, hair: S.HAIR,
    outfit: S.OUTFITS, body: S.BODIES, accessory: S.ACCESSORIES, action: S.ACTIONS,
    // Custom props from the library are offered alongside the built-ins.
    holds: [...S.HELD, ...props.customProps().filter((p) => p.kind === "held").map((p) => p.id)],
    set: [...S.SET_PIECES, ...props.customProps().filter((p) => p.kind === "set").map((p) => p.id)],
    grip: S.GRIP_CLASSES, camera: S.CAMERAS, transition: S.TRANSITIONS, effect: S.EFFECTS,
  },
})));

app.get("/api/projects", wrap(() => store.list().map(summary)));

app.get("/api/projects/:id", wrap((req) => {
  const p = store.get(String(req.params.id));
  if (!p) throw new Error("Not found");
  // The preview uses the same library images the render will use.
  return { ...p, timeline: bgs.withLibrary(p.timeline, p.settings), backgrounds: p.episode ? bgs.neededFor(p.episode) : [], props: p.episode ? props.neededFor(p.episode) : [] };
}));

app.patch("/api/projects/:id/settings", wrap((req) => {
  const p = store.get(String(req.params.id));
  if (!p) throw new Error("Not found");
  if (p.status === "running") throw new Error("Project is busy");
  const s = { ...p.settings, ...req.body };
  return summary(store.save({ ...p, settings: s, timeline: p.timeline ? { ...p.timeline, format: s.format } : null }));
}));

// ---- props library (green-screen images, keyed and reused by every video)

app.get("/api/props", wrap(() => props.catalog()));

// Sheets: several props in one image. Keys are listed in reading order (rows, left to right).
const sheetKeys = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split(",")).map((k) => String(k).trim()).filter(Boolean);
app.post("/api/props/sheet-prompt", wrap((req) => ({ prompt: props.sheetPrompt(sheetKeys(req.body?.keys)) })));
app.put("/api/props/sheet", express.raw({ type: "image/*", limit: "40mb" }), wrap(async (req) => {
  if (!Buffer.isBuffer(req.body)) throw new Error("Send a PNG, JPG or WEBP image");
  return props.importSheet(sheetKeys(req.query.keys), req.body);
}));
app.post("/api/props/sheet/import", wrap(async (req) => {
  const path = String(req.body?.path ?? "");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  return props.importSheet(sheetKeys(req.body?.keys), readFileSync(path));
}));

// Define a custom prop; returns it with the style-matched, green-screen prompt to generate.
app.post("/api/props", wrap((req) => {
  const { id, name, description, kind, size, grip, front } = req.body ?? {};
  if (!name || (kind !== "set" && kind !== "held")) throw new Error("Give a name and kind (\"set\" or \"held\")");
  return props.define({ id, name: String(name), description: description ? String(description) : undefined, kind, size, grip, front });
}));

app.put("/api/props/:key", express.raw({ type: "image/*", limit: "40mb" }), wrap(async (req) => {
  if (!Buffer.isBuffer(req.body)) throw new Error("Send a PNG, JPG or WEBP image");
  return props.importImage(String(req.params.key), req.body);
}));

// Import an image already on this computer (used by the MCP server).
app.post("/api/props/:key/import", wrap(async (req) => {
  const path = String(req.body?.path ?? "");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  return props.importImage(String(req.params.key), readFileSync(path));
}));

app.delete("/api/props/:key", wrap((req) => {
  props.remove(String(req.params.key));
  return { ok: true };
}));

// Put a prop into a video: as a set piece in a scene, or in a character's hand.
app.post("/api/projects/:id/place-prop", wrap((req) => {
  const p = store.get(String(req.params.id));
  if (!p?.episode) throw new Error("No script yet");
  const { prop, scene, x, character } = req.body ?? {};
  const ep = structuredClone(p.episode);
  const sc = ep.scenes[Number(scene) - 1];
  if (!sc) throw new Error(`Scene ${scene} does not exist (there are ${ep.scenes.length})`);
  if (character) {
    const c = sc.chars.find((ch) => ch.name === character);
    if (!c) throw new Error(`${character} is not in scene ${scene}`);
    c.holds = String(prop);
  } else {
    sc.set.push({ kind: String(prop), x: typeof x === "number" ? x : 0.75 });
  }
  return jobs.updateEpisode(p.id, ep);
}));

// ---- character library (illustrated torso + hair/hat per character name)

app.get("/api/characters", wrap(() => chars.list()));

app.post("/api/characters/prompt", wrap((req) => {
  const { outfit, hair, body } = req.body ?? {};
  if (!outfit) throw new Error("Describe the outfit, e.g. a red hoodie (#d9472b) with a blue drawstring and a kangaroo pocket");
  return { prompt: chars.promptFor({ outfit: String(outfit), hair: hair ? String(hair) : undefined, body }) };
}));

app.put("/api/characters/:name", express.raw({ type: "image/*", limit: "40mb" }), wrap(async (req) => {
  if (!Buffer.isBuffer(req.body)) throw new Error("Send a PNG, JPG or WEBP image");
  const parts = req.query.parts === "torso" || req.query.parts === "both" ? req.query.parts : "auto";
  return chars.importSheet(String(req.params.name), req.body, parts);
}));

// Import an image already on this computer (used by the MCP server).
app.post("/api/characters/:name/import", wrap(async (req) => {
  const path = String(req.body?.path ?? "");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  return chars.importSheet(String(req.params.name), readFileSync(path), req.body?.parts ?? "auto");
}));

app.delete("/api/characters/:name", wrap((req) => {
  chars.remove(String(req.params.name));
  return { ok: true };
}));

// ---- image background library

app.get("/api/backgrounds", wrap(() => bgs.catalog()));

app.put("/api/backgrounds/:key", express.raw({ type: "image/*", limit: "40mb" }), wrap((req) => {
  const type = String(req.headers["content-type"] ?? "");
  const ext = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" }[type];
  if (!ext || !Buffer.isBuffer(req.body)) throw new Error("Send a PNG, JPG or WEBP image");
  bgs.saveImage(String(req.params.key), req.body, ext);
  return { ok: true, url: bgs.library()[String(req.params.key)] };
}));

// Copy an image already on this computer (used by the MCP server).
app.post("/api/backgrounds/:key/import", wrap((req) => {
  const path = String(req.body?.path ?? "");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  bgs.saveImage(String(req.params.key), readFileSync(path), extname(path));
  return { ok: true, url: bgs.library()[String(req.params.key)] };
}));

app.delete("/api/backgrounds/:key", wrap((req) => {
  bgs.removeImage(String(req.params.key));
  return { ok: true };
}));

// How to write a script: house rules plus what the library offers right now.
app.get("/api/script-guide", wrap(() => ({ guide: scriptGuide() })));

// Body: { episode }, plus optional settings and until.
app.post("/api/projects", wrap((req) => {
  const { episode, settings, until } = req.body ?? {};
  if (!episode) throw new Error("Give an episode (the script JSON)");
  const ep = S.Episode.parse(S.normalizeEpisode(episode));
  return [summary(jobs.create({ episode: ep, settings, until }))];
}));

app.put("/api/projects/:id/episode", wrap((req) => {
  const ep = S.Episode.parse(S.normalizeEpisode(req.body.episode));
  return jobs.updateEpisode(String(req.params.id), ep, req.body.settings);
}));

app.post("/api/projects/:id/run", wrap((req) => {
  const { from = "voice", until = "render" } = req.body ?? {};
  jobs.runFrom(String(req.params.id), from, until);
  return summary(store.get(String(req.params.id))!);
}));

app.delete("/api/projects/:id", wrap((req) => {
  const p = store.get(String(req.params.id));
  if (p?.status === "running") throw new Error("Project is busy");
  store.remove(String(req.params.id));
  return { ok: true };
}));

// The renderer's headless browser runs on another port and reads audio for lip sync.
app.use(["/media", "/assets"], (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
app.use("/media", express.static(store.PROJECTS_DIR, { acceptRanges: true }));
app.use("/assets", express.static(join(store.ROOT, "assets")));

const WEB = join(store.ROOT, "dist", "web");
if (existsSync(WEB)) {
  // index.html is never cached so a rebuilt app shows up on the next load; hashed assets can be.
  app.use(express.static(WEB, { setHeaders: (res, path) => path.endsWith("index.html") && res.setHeader("Cache-Control", "no-store") }));
  app.get(/^\/(?!api|media|assets).*/, (_req, res) => res.setHeader("Cache-Control", "no-store").sendFile(join(WEB, "index.html")));
}

app.listen(PORT, () => {
  console.log(`YouTube Animator running at http://localhost:${PORT}`);
  jobs.start(PORT);
});
