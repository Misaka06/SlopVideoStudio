// MCP server: lets any MCP client (Claude Code, Claude Desktop...) mass-produce videos.
// It talks to the running app over HTTP, so start the app first (npm run app).
// The calling LLM writes the scripts; the app voices and renders them.
// Replies are deliberately terse: the calling model pays for every token it reads.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join } from "node:path";
import { z } from "zod";
import * as S from "../src/schema";
import * as SS from "../src/slides";

const BASE = process.env.ANIMATOR_URL ?? "http://localhost:4000";
const PROJECTS = join(import.meta.dirname, "..", "projects");
const PRESET_DIR = join(import.meta.dirname, "..", "assets", "presets");
// Prompts of a look with a style anchor start with a STYLE ANCHOR line (or a NOTE when the anchor image is missing);
// point the model to the file to hand over, or to what to generate first.
const anchorLine = (t: string) => {
  const file = /^STYLE ANCHOR: attach (\S+\.jpg)/.exec(t)?.[1];
  if (file) return `${t.split("\n\n")[0]}\nAnchor image file on this computer: ${join(PRESET_DIR, file)}\n\n`;
  return t.startsWith("NOTE: this look has no style anchor") ? `${t.split("\n\n")[0]}\nCall style_presets to get its character-sheet prompt.\n\n` : "";
};
const withoutAnchorLine = (t: string) => t.replace(/^(STYLE ANCHOR|NOTE: this look)[^\n]*\n\n/, "");

type Summary = { id: string; title: string | null; topic: string; status: string; next: string | null; message: string; progress: number; error: string | null; video: string | null; seconds: number };

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Animator app is not running at ${BASE}. Start it with: npm run app`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true });

const line = (p: Summary) => {
  const pct = p.status === "running" ? ` ${Math.round(p.progress * 100)}%` : "";
  const file = p.video ? ` | ${join(PROJECTS, p.id, "video.mp4")}` : "";
  const err = p.error ? ` | ${p.error}` : "";
  return `${p.id} | ${p.status}${pct} | ${p.message}${file}${err}`;
};

const settingsShape = {
  format: z.enum(["landscape", "vertical"]).optional().describe("landscape=16:9 YouTube, vertical=9:16 Shorts"),
  language: z.enum(["en-us", "en-gb", "es"]).optional(),
  voice: z.string().optional().describe("Kokoro voice id, e.g. am_michael, af_heart, bm_george, em_alex, ef_dora"),
};
const toSettings = (a: { format?: string; language?: string; voice?: string }) => {
  const s: Record<string, unknown> = {};
  if (a.format) s.format = a.format;
  if (a.language) {
    s.lang = a.language;
    if (!a.voice) s.voice = { "en-us": "am_michael", "en-gb": "bm_george", es: "em_alex" }[a.language];
  }
  if (a.voice) s.voice = a.voice;
  return s;
};

const server = new McpServer({ name: "youtube-animator", version: "1.0.0" });

server.registerTool(
  "script_guide",
  {
    description: "Call this first when writing an episode. Returns the house rules for good scripts (cast, scenes, poses, camera) and the custom props and characters currently in the library.",
    inputSchema: {},
  },
  async () => {
    try {
      return text((await api<{ guide: string }>("GET", "/api/script-guide")).guide);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "produce_from_script",
  {
    description: `Voice and render an episode you wrote (call script_guide first for the rules) (you write the script; the app only voices and renders it).
episode = {title, cast:[{name,color:"#hex",accent:"#hex",outfit,body,hair,hairColor:"#hex",hat,accessory,tie:bool,scale:1|0.6}], scenes:[{narration, bg, time, camera, transition, effect, label:"", hud:"", set:[{kind,x}], chars:[{name,x:0..1,pose,face,facing:"left"|"right",action,holds,emote,talking:bool}]}]}
Omitted fields get defaults.
bg: ${S.BACKGROUNDS.join(",")} | time: ${S.TIMES.join(",")}
outfit: ${S.OUTFITS.join(",")} | body: ${S.BODIES.join(",")} | hair: ${S.HAIR.join(",")}
hat: ${S.HATS.join(",")} | accessory: ${S.ACCESSORIES.join(",")}
pose: ${S.POSES.join(",")} | face: ${S.EXPRESSIONS.join(",")} | emote: ${S.EMOTES.join(",")}
action: ${S.ACTIONS.join(",")} | holds: ${S.HELD.join(",")} | set kind: ${S.SET_PIECES.join(",")}
camera: ${S.CAMERAS.join(",")} | transition: ${S.TRANSITIONS.join(",")} | effect: ${S.EFFECTS.join(",")}`,
    inputSchema: { episode: z.record(z.string(), z.unknown()).describe("Episode object as described"), ...settingsShape },
  },
  async (a) => {
    try {
      const out = await api<Summary[]>("POST", "/api/projects", { episode: a.episode, settings: toSettings(a), until: "render" });
      return text(`Queued: ${out[0].id}`);
    } catch (e) {
      return fail(e);
    }
  },
);

// ---- image slideshows: you write the script (structure, camera moves, transitions, voice,
// music); the app derives one copy-paste image prompt per scene for the user to generate.

const slideshowSettings = (a: { format?: string; language?: string; voice?: string }) => {
  const s: Record<string, unknown> = {};
  if (a.format) s.format = a.format;
  if (a.language) s.lang = a.language;
  if (a.voice) s.voice = a.voice;
  return s;
};

server.registerTool(
  "slideshow_guide",
  {
    description: "Call this first when making an image slideshow video (images + camera moves + transitions + narration). Returns the writing rules, the JSON shape, and the voices and music files available.",
    inputSchema: {},
  },
  async () => {
    try {
      return text((await api<{ guide: string }>("GET", "/api/slideshow-guide")).guide);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "produce_slideshow",
  {
    description: `Create an image slideshow video from a script you wrote (call slideshow_guide first for the rules and JSON shape). The app records the narration now and returns one image prompt per scene; give those prompts to the user to generate (any image tool, 16:9 or 9:16 to match the format), then import_slide_images, then render_video.
slideshow = {title, preset:"${SS.presetKeys.join('"|"')}"|"", style, subjects:[{name,look}], settings:{format,language,voice,speed,music,musicVolume,captions}, scenes:[{narration, prompt, subjects:[names], camera, intensity, focus:[x,y]|null, transition, label, voice}]}
camera: ${SS.SLIDE_CAMERAS.join(",")} | intensity: ${SS.INTENSITIES.join(",")} | transition: ${SS.SLIDE_TRANSITIONS.join(",")} | captions: ${SS.CAPTION_STYLES.join(",")}
Choices in slideshow.settings are used unless you also pass format/language/voice here.`,
    inputSchema: {
      slideshow: z.record(z.string(), z.unknown()).describe("Slideshow object as described"),
      preset: z.enum(SS.presetKeys as [SS.PresetKey, ...SS.PresetKey[]]).optional().describe(`Built-in look with a fixed hero and matching scenery (overrides slideshow.preset): ${SS.presetKeys.map((k) => `${k} = ${SS.PRESETS[k].label} (hero ${SS.PRESETS[k].hero})`).join("; ")}`),
      ...settingsShape,
    },
  },
  async (a) => {
    try {
      const out = await api<(Summary & { warnings?: string[] })[]>("POST", "/api/slideshows", { slideshow: a.preset ? { ...a.slideshow, preset: a.preset } : a.slideshow, settings: slideshowSettings(a) });
      const r = await api<{ prompts: unknown[]; text: string }>("GET", `/api/projects/${out[0].id}/slide-prompts`);
      return text(`Created slideshow ${out[0].id} with ${r.prompts.length} scenes; narration is being recorded.${out[0].warnings?.length ? `\nSCRIPT WARNINGS (fix with edit_slideshow, then re-send the prompts):\n${out[0].warnings.map((w) => `- ${w}`).join("\n")}\n` : ""}\nGive the user the prompts below (one image each, saved as slide-01.png, slide-02.png ...). When the images exist, call import_slide_images, then render_video.\n\n${anchorLine(r.text)}${withoutAnchorLine(r.text)}`);
    } catch (e) {
      return fail(e);
    }
  },
);

type PresetRow = { key: string; label: string; blurb: string; hero: string; anchorFile: string; anchorUrl: string | null; anchorPrompt: string };

server.registerTool(
  "style_presets",
  {
    description: "The built-in looks for slideshows (preset values) with their hero and whether the style-anchor image (the hero's character sheet) exists. With prompts=true, also the character-sheet prompt for each look whose anchor is missing: give it to the user to generate once, then call import_style_anchor.",
    inputSchema: { prompts: z.boolean().optional(), include_ready: z.boolean().optional().describe("With prompts, also print prompts of looks that already have an anchor") },
  },
  async (a) => {
    try {
      const rows = await api<PresetRow[]>("GET", "/api/presets");
      return text(
        rows
          .map((p) => `${p.key} | ${p.label} | hero ${p.hero} | anchor ${p.anchorUrl ? `ready (${join(PRESET_DIR, p.anchorFile)})` : "missing"}\n${p.blurb}${a.prompts && (!p.anchorUrl || a.include_ready) ? `\nCHARACTER SHEET PROMPT:\n${p.anchorPrompt}` : ""}`)
          .join("\n\n"),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "import_style_anchor",
  {
    description: "Save a generated character sheet (from the style_presets prompt) as the style anchor of a look. Every slideshow prompt featuring that look's hero then tells the image generator to use it as reference.",
    inputSchema: { preset: z.enum(SS.presetKeys as [SS.PresetKey, ...SS.PresetKey[]]), file_path: z.string().describe("Absolute path to a PNG, JPG or WEBP") },
  },
  async (a) => {
    try {
      await api("POST", `/api/presets/${a.preset}/anchor/import`, { path: a.file_path });
      return text(`Saved the ${a.preset} anchor.`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "edit_slideshow",
  {
    description: "Change whole-slideshow fields of a slideshow: title, preset, style, subjects (full replacement list of {name, look, kind}), then re-derive its image prompts. Narration is untouched, so no re-voicing. People are described by OUTFIT AND PROPS only (their body comes from the look's hero); creatures and things get kind creature or thing and a full description.",
    inputSchema: { id: z.string(), changes: z.record(z.string(), z.unknown()).describe("Fields to replace, e.g. {subjects:[...]} or {preset:'papercut'}") },
  },
  async (a) => {
    try {
      const p = await api<{ slideshow: SS.SlideshowT | null }>("GET", `/api/projects/${a.id}`);
      if (!p.slideshow) throw new Error("Not a slideshow");
      const next = { ...p.slideshow, ...a.changes };
      await api("PUT", `/api/projects/${a.id}/slideshow`, { slideshow: next });
      const warnings = SS.lintSlideshow(SS.normalizeSlideshow(next));
      return text(`Saved.${warnings.length ? `\nSCRIPT WARNINGS:\n${warnings.map((w) => `- ${w}`).join("\n")}` : ""}\nCall slide_prompts for the updated prompts.`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "slide_prompts",
  {
    description: "Copy-paste image prompts of a slideshow, one per scene, with the file name each image should have. Marks scenes that already have an image.",
    inputSchema: { id: z.string(), only_missing: z.boolean().optional() },
  },
  async (a) => {
    try {
      const r = await api<{ text: string; prompts: { n: number; file: string; prompt: string; image: string | null }[] }>("GET", `/api/projects/${a.id}/slide-prompts`);
      const rows = r.prompts.filter((x) => !a.only_missing || !x.image);
      if (!rows.length) return text("Every scene already has an image.");
      return text(anchorLine(r.text) + rows.map((x) => `SCENE ${x.n} (save as ${x.file}.png)${x.image ? " [has image]" : ""}\n${x.prompt}`).join("\n\n"));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "import_slide_images",
  {
    description: "Add generated images from this computer to a slideshow. Give file_paths in scene order (they fill scenes start, start+1, ...). Replaces existing images. Then call render_video.",
    inputSchema: {
      id: z.string(),
      file_paths: z.array(z.string()).min(1).describe("Absolute paths to PNG, JPG or WEBP files, in scene order"),
      start: z.number().int().min(1).optional().describe("First scene to fill (default 1)"),
    },
  },
  async (a) => {
    try {
      await api("POST", `/api/projects/${a.id}/slides/${a.start ?? 1}/import`, { paths: a.file_paths });
      return text(`Imported ${a.file_paths.length} image(s) from scene ${a.start ?? 1}.`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "video_status",
  {
    description: "Status of videos (all recent ones if no ids). One line each: id | status | message | file path when done.",
    inputSchema: { ids: z.array(z.string()).optional(), limit: z.number().int().optional().describe("Max rows when no ids (default 20)") },
  },
  async (a) => {
    try {
      const all = await api<Summary[]>("GET", "/api/projects");
      const rows = a.ids?.length ? all.filter((p) => a.ids!.includes(p.id)) : all.slice(0, a.limit ?? 20);
      const counts = all.reduce<Record<string, number>>((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {});
      return text(`${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}\n${rows.map(line).join("\n")}`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "get_script",
  { description: "Compact script of one video: title, cast, then one line per scene.", inputSchema: { id: z.string() } },
  async ({ id }) => {
    try {
      const p = await api<{ episode: S.EpisodeT | null; slideshow?: SS.SlideshowT | null }>("GET", `/api/projects/${id}`);
      if (p.slideshow) {
        const sh = p.slideshow;
        return text(`${sh.title}\n${sh.preset ? `preset: ${sh.preset}\n` : ""}style: ${sh.style}\n${sh.scenes.map((s, i) => `${i + 1}. [${s.camera}/${s.transition}${s.label ? `; ${s.label}` : ""}] ${s.narration} | image: ${s.prompt}`).join("\n")}`);
      }
      if (!p.episode) return text("No script yet.");
      const ep = p.episode;
      const scenes = ep.scenes.map((s, i) => `${i + 1}. [${s.bg}; ${s.chars.map((c) => `${c.name}:${c.pose}/${c.face}`).join(", ")}] ${s.narration}`);
      return text(`${ep.title}\ncast: ${ep.cast.map((c) => c.name).join(", ")}\n${scenes.join("\n")}`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "edit_scene",
  {
    description: "Change fields of one scene (1-based), e.g. {narration:'...', bg:'lab'} or a full chars array, then re-voice and re-render.",
    inputSchema: {
      id: z.string(),
      scene: z.number().int().min(1),
      changes: z.record(z.string(), z.unknown()).describe("Scene fields to replace"),
      render: z.boolean().optional().describe("Re-voice and render after editing (default true)"),
    },
  },
  async (a) => {
    try {
      const p = await api<{ episode: S.EpisodeT | null; slideshow?: SS.SlideshowT | null }>("GET", `/api/projects/${a.id}`);
      if (p.slideshow) {
        const scenes = [...p.slideshow.scenes];
        if (!scenes[a.scene - 1]) throw new Error(`Scene ${a.scene} does not exist (there are ${scenes.length})`);
        scenes[a.scene - 1] = { ...scenes[a.scene - 1], ...a.changes } as SS.SlideSceneT;
        const saved = await api<{ next: string }>("PUT", `/api/projects/${a.id}/slideshow`, { slideshow: { ...p.slideshow, scenes } });
        if (a.render === false) return text("Saved.");
        try {
          await api("POST", `/api/projects/${a.id}/run`, { from: saved.next === "render" ? "render" : "voice", until: saved.next === "render" ? "render" : "voice" });
          return text(saved.next === "render" ? "Saved; re-rendering." : "Saved; re-recording the narration (call render_video when it is ready).");
        } catch (e) {
          return text(`Saved. Not rendered: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (!p.episode) throw new Error("No script yet");
      const scenes = [...p.episode.scenes];
      if (!scenes[a.scene - 1]) throw new Error(`Scene ${a.scene} does not exist (there are ${scenes.length})`);
      scenes[a.scene - 1] = { ...scenes[a.scene - 1], ...a.changes } as S.SceneT;
      // Unchanged narration keeps its recording, so only a render is needed.
      const saved = await api<{ next: string }>("PUT", `/api/projects/${a.id}/episode`, { episode: { ...p.episode, scenes } });
      if (a.render !== false) await api("POST", `/api/projects/${a.id}/run`, { from: saved.next === "render" ? "render" : "voice", until: "render" });
      return text(a.render !== false ? "Saved; re-rendering." : "Saved.");
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "render_video",
  {
    description: "Voice (if needed) and render a video, e.g. after review_first, place_prop or import_slide_images. A slideshow needs an image in every scene first.",
    inputSchema: { id: z.string(), with_placeholders: z.boolean().optional().describe("Slideshow only: render even if some scenes have no image yet (placeholder cards)") },
  },
  async ({ id, with_placeholders }) => {
    try {
      const cur = await api<Summary>("GET", `/api/projects/${id}`);
      const p = await api<Summary>("POST", `/api/projects/${id}/run`, { from: cur.next === "render" ? "render" : "voice", until: "render", allowMissing: with_placeholders });
      return text(line(p));
    } catch (e) {
      return fail(e);
    }
  },
);

type Bg = { key: string; prompt: string; url: string | null; scenes: number[] };

server.registerTool(
  "background_prompts",
  {
    description: "Image-generator prompts for backgrounds still missing from the library (one image per background+time, reused by every video). Generate each image at 16:9 (e.g. 1920x1080), then call import_background.",
    inputSchema: { id: z.string().optional().describe("Only what this video needs; omit for the whole library"), include_existing: z.boolean().optional() },
  },
  async (a) => {
    try {
      const list = a.id ? (await api<{ backgrounds: Bg[] }>("GET", `/api/projects/${a.id}`)).backgrounds : await api<Bg[]>("GET", "/api/backgrounds");
      const rows = list.filter((b) => a.include_existing || !b.url);
      if (!rows.length) return text("All needed backgrounds are in the library.");
      return text(rows.map((b) => `${b.key}${b.url ? " (have)" : ""}\n${b.prompt}`).join("\n\n"));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "import_background",
  {
    description: "Add a generated image file on this computer to the background library under a key like 'lake-sunset'. Re-render videos to use it.",
    inputSchema: { key: z.string(), file_path: z.string().describe("Absolute path to a PNG, JPG or WEBP") },
  },
  async (a) => {
    try {
      await api("POST", `/api/backgrounds/${a.key}/import`, { path: a.file_path });
      return text(`Imported ${a.key}.`);
    } catch (e) {
      return fail(e);
    }
  },
);

// ---- props library: the app writes the art direction, any image model draws on a green
// screen, the app keys the green out and keeps the cut-out for every future video.

type Prop = { key: string; id: string; name: string; kind: "set" | "held"; prompt: string; url: string | null; animated: boolean; builtin: boolean; scenes?: number[] };
const propLine = (p: Prop) => `${p.key} | ${p.kind}${p.url ? " | ready" : ""}${p.scenes ? ` | scenes ${p.scenes.join(",")}` : ""}`;
const GREEN_NOTE = "Generate on the solid green background as written (square, about 1024px), then call import_prop with the file.";

server.registerTool(
  "create_prop",
  {
    description: `Define a new prop (any object) for the props library and get a ready image prompt in the house sticker style on a green screen. ${GREEN_NOTE} Then place_prop puts it in a video.`,
    inputSchema: {
      name: z.string().describe("Short name, e.g. 'time machine'"),
      description: z.string().describe("What it looks like: shape, colors, materials, details"),
      kind: z.enum(["set", "held"]).describe("set = stands in the scene; held = carried in a hand"),
      size: z.enum(["small", "medium", "large", "huge"]).optional().describe("Relative to a person: set small=knee, medium=waist, large=person, huge=2x; held small=phone, medium=book, large=guitar, huge=sign on a pole"),
      grip: z.enum(S.GRIP_CLASSES).optional().describe("Held only: side (bag), chest (book), forward (flashlight), lowFront (pole/sword), mouth (mic)"),
      in_front: z.boolean().optional().describe("Set only: draw in front of characters (counters, desks)"),
    },
  },
  async (a) => {
    try {
      const p = await api<Prop>("POST", "/api/props", { name: a.name, description: a.description, kind: a.kind, size: a.size, grip: a.grip, front: a.in_front });
      return text(`id: ${p.key}\nprompt: ${p.prompt}`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "prop_prompts",
  {
    description: `Image prompts (green screen, house style) for props a video uses that have no image yet — or for the whole library. Built-in keys look like held-moneyBag / set-podium. ${GREEN_NOTE}`,
    inputSchema: { id: z.string().optional().describe("Video id; omit for the whole library"), include_ready: z.boolean().optional() },
  },
  async (a) => {
    try {
      const list = a.id ? (await api<{ props: Prop[] }>("GET", `/api/projects/${a.id}`)).props : await api<Prop[]>("GET", "/api/props");
      const rows = list.filter((p) => !p.animated && (a.include_ready || !p.url));
      if (!rows.length) return text("Every prop it needs already has an image (animated ones keep their drawing).");
      return text(rows.map((p) => `${propLine(p)}\n${p.prompt}`).join("\n\n"));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "import_prop",
  {
    description: "Add a generated image (on green, or already transparent) to the props library under its key. The green is removed and the image trimmed automatically; every video using this prop shows it from now on.",
    inputSchema: { key: z.string().describe("From create_prop or prop_prompts, e.g. held-moneyBag or timeMachine"), file_path: z.string().describe("Absolute path to a PNG, JPG or WEBP") },
  },
  async (a) => {
    try {
      const p = await api<Prop>("POST", `/api/props/${a.key}/import`, { path: a.file_path });
      return text(`Imported ${p.key}.`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "prop_sheet_prompt",
  {
    description: "One image prompt for 2-9 props at once (a grid on one green screen): cheaper and more consistent. Keep large/huge props out of sheets. Generate it at 1536px+ if possible, then call import_prop_sheet with the same keys in the same order.",
    inputSchema: { keys: z.array(z.string()).min(2).max(9).describe("Prop keys in reading order, e.g. held-moneyBag, held-trophy, held-briefcase, set-podium") },
  },
  async (a) => {
    try {
      const r = await api<{ prompt: string }>("POST", "/api/props/sheet-prompt", { keys: a.keys });
      return text(r.prompt);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "import_prop_sheet",
  {
    description: "Split a generated sheet (several props on one green background) into separate cut-outs and save each under its key. Keys in reading order: rows top to bottom, left to right.",
    inputSchema: { keys: z.array(z.string()).min(2).max(9), file_path: z.string().describe("Absolute path to the sheet image") },
  },
  async (a) => {
    try {
      const out = await api<Prop[]>("POST", "/api/props/sheet/import", { keys: a.keys, path: a.file_path });
      return text(`Imported ${out.map((p) => p.key).join(", ")}.`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "place_prop",
  {
    description: "Put a library prop into a video scene: as a set piece at position x, or in a character's hand (give character). The voice is kept; call render_video afterwards.",
    inputSchema: {
      id: z.string().describe("Video id"),
      prop: z.string().describe("Prop id (custom id, or a built-in name like moneyBag / podium)"),
      scene: z.number().int().min(1),
      x: z.number().min(0).max(1).optional().describe("Set piece position, 0 left .. 1 right"),
      character: z.string().optional().describe("Name of the character who holds it"),
    },
  },
  async (a) => {
    try {
      await api("POST", `/api/projects/${a.id}/place-prop`, { prop: a.prop, scene: a.scene, x: a.x, character: a.character });
      return text(`Placed ${a.prop} in scene ${a.scene}${a.character ? ` (held by ${a.character})` : ""}. Call render_video to update the video.`);
    } catch (e) {
      return fail(e);
    }
  },
);

// ---- character library: illustrated torso + hair/hat per character name. The head,
// face and limbs stay drawn by the app, so expressions and motion keep working.

server.registerTool(
  "character_prompt",
  {
    description: "Image prompt (green screen, house style) for a character's illustrated torso and hair/hat. Generate it wide (16:9, 1536px+), then call import_character with the character's cast name. Once imported, every video whose cast uses that name shows the art.",
    inputSchema: {
      outfit: z.string().describe("Torso outfit with colors, e.g. 'a red hoodie (#d9472b) with a blue (#3fb7ff) drawstring and a front kangaroo pocket'"),
      hair: z.string().optional().describe("Hair or hat with color, e.g. 'short spiky dark brown (#5a3a1e) hair'. Omit for a bald character (the classic look)."),
      body: z.enum(["slim", "normal", "broad", "round"]).optional(),
    },
  },
  async (a) => {
    try {
      const r = await api<{ prompt: string }>("POST", "/api/characters/prompt", a);
      return text(r.prompt);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "import_character",
  {
    description: "Add a generated character image (torso left + hair/hat right, or a torso alone) to the character library under the cast name. Green is removed, pieces split and fitted automatically.",
    inputSchema: { name: z.string().describe("Cast name exactly as used in scripts, e.g. Max"), file_path: z.string().describe("Absolute path to the image") },
  },
  async (a) => {
    try {
      await api("POST", `/api/characters/${encodeURIComponent(a.name)}/import`, { path: a.file_path });
      return text(`Imported ${a.name}. Re-render videos to use the art.`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "list_characters",
  { description: "Characters in the library that have illustrated art (reuse these names in scripts).", inputSchema: {} },
  async () => {
    try {
      const list = await api<{ name: string; topper: string | null }[]>("GET", "/api/characters");
      return text(list.length ? list.map((c) => `${c.name}${c.topper ? " (torso + hair/hat)" : " (torso)"}`).join("\n") : "No characters yet.");
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "list_props",
  { description: "Props in the library: key | set/held | ready (has an image).", inputSchema: { custom_only: z.boolean().optional() } },
  async (a) => {
    try {
      const list = await api<Prop[]>("GET", "/api/props");
      return text(list.filter((p) => !a.custom_only || !p.builtin).map(propLine).join("\n"));
    } catch (e) {
      return fail(e);
    }
  },
);

await server.connect(new StdioServerTransport());
