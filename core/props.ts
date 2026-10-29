// Props library: style-matched prompts for an image generator (on a green screen), the
// keying that turns the result into a clean cut-out, and the reusable library on disk.
// Built-in props (podium, moneyBag...) get an image version; custom props are new ids.

import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HELD, isPropId, SET_PIECES, type EpisodeT, type GripClass, type PropImage } from "../src/schema";
import { ROOT } from "./store";

export const PROPS_DIR = join(ROOT, "assets", "props");
mkdirSync(PROPS_DIR, { recursive: true });
const INDEX = join(PROPS_DIR, "library.json");

export type Size = "small" | "medium" | "large" | "huge";
export type PropEntry = {
  id: string;
  name: string;
  description: string;
  kind: "set" | "held";
  size: Size;
  grip: GripClass;
  front: boolean;
  builtin: boolean;
  aspect: number | null; // set once an image is imported
  updatedAt: number;
};

const HEIGHT: Record<"set" | "held", Record<Size, number>> = {
  set: { small: 70, medium: 140, large: 260, huge: 420 },
  held: { small: 45, medium: 80, large: 140, huge: 210 },
};
// Where the image meets the hand, per grip (fractions of the trimmed image).
const HELD_ANCHOR: Record<GripClass, [number, number]> = {
  side: [0.5, 0.04],
  chest: [0.42, 0.78],
  forward: [0.08, 0.55],
  lowFront: [0.5, 0.97],
  mouth: [0.5, 0.97],
};
const GRIP_WORDS: Record<GripClass, string> = {
  side: "hanging from a handle at its top, as if carried at someone's side",
  chest: "upright and facing forward, as if held at chest height",
  forward: "pointing to the right, with the handle on the left end",
  lowFront: "on a long vertical pole or handle; the bottom end of the handle is where it is held",
  mouth: "upright, with the handle at the bottom",
};

// Built-ins whose drawing has moving parts (flames, beams, a fishing line) keep the drawing.
export const ANIMATED = new Set(["fishingRod", "flashlight", "balloon", "fire", "portal", "clock", "tv", "computer"]);

const BUILTIN_HELD: Record<string, { grip: GripClass; size: Size; name: string }> = {
  phone: { grip: "chest", size: "small", name: "smartphone" },
  money: { grip: "chest", size: "small", name: "fan of three banknotes" },
  sign: { grip: "lowFront", size: "huge", name: "protest sign on a wooden stick" },
  book: { grip: "chest", size: "medium", name: "closed hardcover book" },
  sword: { grip: "lowFront", size: "large", name: "knight's sword, blade up" },
  cup: { grip: "chest", size: "small", name: "coffee cup" },
  briefcase: { grip: "side", size: "medium", name: "leather briefcase" },
  mic: { grip: "mouth", size: "small", name: "handheld microphone" },
  pizza: { grip: "chest", size: "small", name: "slice of pizza" },
  laptop: { grip: "chest", size: "medium", name: "open laptop" },
  umbrella: { grip: "lowFront", size: "huge", name: "open umbrella" },
  trophy: { grip: "chest", size: "medium", name: "gold trophy cup" },
  flag: { grip: "lowFront", size: "huge", name: "flag on a pole" },
  newspaper: { grip: "chest", size: "medium", name: "folded newspaper" },
  guitar: { grip: "chest", size: "large", name: "acoustic guitar" },
  wand: { grip: "forward", size: "medium", name: "magic wand with a star tip" },
  map: { grip: "chest", size: "medium", name: "treasure map" },
  key: { grip: "forward", size: "small", name: "old golden key" },
  moneyBag: { grip: "side", size: "medium", name: "money sack with a dollar sign" },
  magnifier: { grip: "forward", size: "medium", name: "magnifying glass" },
  balloon: { grip: "side", size: "huge", name: "floating colorful party balloon with ribbon string" },
};
const BUILTIN_SET: Record<string, { size: Size; name: string; front?: boolean }> = {
  podium: { size: "medium", name: "speaker's podium", front: true },
  desk: { size: "medium", name: "office desk", front: true },
  bed: { size: "medium", name: "single bed" },
  tree: { size: "huge", name: "round leafy tree" },
  car: { size: "medium", name: "small red car" },
  table: { size: "medium", name: "round wooden table", front: true },
  trophy: { size: "medium", name: "large gold trophy" },
  door: { size: "large", name: "wooden door" },
  couch: { size: "medium", name: "three-seat couch" },
  fridge: { size: "large", name: "kitchen fridge" },
  plant: { size: "medium", name: "potted plant" },
  lamp: { size: "large", name: "floor lamp" },
  bookshelf: { size: "large", name: "bookshelf full of books" },
  bench: { size: "small", name: "park bench" },
  streetlamp: { size: "huge", name: "street lamp" },
  rocket: { size: "huge", name: "cartoon rocket" },
  chest: { size: "small", name: "treasure chest", front: true },
  throne: { size: "huge", name: "royal throne" },
  cage: { size: "large", name: "metal cage", front: true },
  crates: { size: "medium", name: "stack of wooden crates", front: true },
  vending: { size: "large", name: "vending machine" },
  sign: { size: "large", name: "wooden signpost" },
  moneyPile: { size: "small", name: "pile of cash and coins", front: true },
  clock: { size: "large", name: "antique wooden clockwork grandfather clock with pendulum", front: false },
  fire: { size: "medium", name: "campfire with burning wood logs and glowing embers", front: true },
};

// The shared art direction. Matches the character rig's vector ink line weight and clean cel-shading.
// Pure green screen allows automatic keying.
const STYLE = [
  "Flat 2D vector animation prop asset for a modern cartoon explainer video (Kurzgesagt / Ifverse style).",
  "Line art & contours: uniform solid dark charcoal-black ink outline (#16151d) with consistent medium-thick monoline stroke weight (strictly uniform line thickness, closed vector contours, no tapering, no thick-thin brush variation, no sketchy lines, matching 4-5px cartoon outline).",
  "Color & shading: flat solid fills with subtle 2-tone cel shading (soft shadow tone on the bottom-right from a top-left key light), cohesive muted pastel palette with vibrant warm accents.",
  "Crucial rules: strictly NO white sticker border, NO die-cut cut-out edge, NO drop shadows, NO cast ground shadows, NO 3D bevel or glossy plastic reflections.",
  "Background: solid, flat, pure chroma-key green (#00FF00) across the entire image with razor-sharp anti-aliased edges and zero green light spill on the outline.",
  "Do not use bright green (#00FF00) anywhere on the object itself. No text, no letters, no logos, no people, no hands.",
].join(" ");

export function promptFor(e: Pick<PropEntry, "name" | "description" | "kind" | "grip">) {
  const view =
    e.kind === "set"
      ? "Orthographic side view at eye level (0-degree pitch, perfectly flat horizontal bottom edge that sits flush on the floor, no perspective tilt, no cast shadow)."
      : `Side profile view oriented for being held: ${GRIP_WORDS[e.grip]}, isolated with no hands or arms.`;
  const what = e.description && e.description !== e.name ? `${e.name}: ${e.description}.` : `${e.name}.`;
  return `A single object, centered, fully visible with wide empty green space around it: ${what} ${view} ${STYLE}`;
}

// ---- index on disk

function readIndex(): Record<string, PropEntry> {
  return existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
}
function writeIndex(idx: Record<string, PropEntry>) {
  writeFileSync(INDEX, JSON.stringify(idx, null, 2));
}
const fileFor = (id: string) => join(PROPS_DIR, `${id}.png`);

function builtinEntry(id: string, kind: "set" | "held"): PropEntry | null {
  if (kind === "held" && BUILTIN_HELD[id]) {
    const b = BUILTIN_HELD[id];
    return { id, name: b.name, description: "", kind, size: b.size, grip: b.grip, front: false, builtin: true, aspect: null, updatedAt: 0 };
  }
  if (kind === "set" && BUILTIN_SET[id]) {
    const b = BUILTIN_SET[id];
    return { id, name: b.name, description: "", kind, size: b.size, grip: "chest", front: Boolean(b.front), builtin: true, aspect: null, updatedAt: 0 };
  }
  return null;
}

// Library key: built-ins are stored per use ("trophy" can be held or a set piece).
const keyOf = (id: string, kind: "set" | "held") => (builtinEntry(id, kind) ? `${kind}-${id}` : id);

export type PropView = PropEntry & { key: string; prompt: string; url: string | null; animated: boolean };

function view(e: PropEntry, key: string): PropView {
  const f = fileFor(key);
  return {
    ...e,
    key,
    prompt: promptFor(e),
    url: existsSync(f) ? `/assets/props/${key}.png?v=${Math.round(statSync(f).mtimeMs)}` : null,
    animated: e.builtin && ANIMATED.has(e.id),
  };
}

// Everything: built-ins (with or without an image) and custom props.
export function catalog(): PropView[] {
  const idx = readIndex();
  const out: PropView[] = [];
  for (const id of SET_PIECES) {
    const e = idx[`set-${id}`] ?? builtinEntry(id, "set");
    if (e) out.push(view(e, `set-${id}`));
  }
  for (const id of HELD) {
    const e = idx[`held-${id}`] ?? builtinEntry(id, "held");
    if (e) out.push(view(e, `held-${id}`));
  }
  for (const [key, e] of Object.entries(idx)) if (!e.builtin) out.push(view(e, key));
  return out;
}

export const customProps = () => Object.values(readIndex()).filter((e) => !e.builtin);

export function find(key: string): PropView | null {
  return catalog().find((p) => p.key === key) ?? null;
}

// The props one episode uses, with the scenes (1-based) that use each.
export function neededFor(ep: EpisodeT): (PropView & { scenes: number[] })[] {
  const all = catalog();
  const map = new Map<string, PropView & { scenes: number[] }>();
  const add = (id: string, kind: "set" | "held", i: number) => {
    const key = keyOf(id, kind);
    const p = all.find((x) => x.key === key);
    if (!p) return;
    const e = map.get(key) ?? { ...p, scenes: [] };
    if (!e.scenes.includes(i + 1)) e.scenes.push(i + 1);
    map.set(key, e);
  };
  ep.scenes.forEach((s, i) => {
    s.set.forEach((p) => add(p.kind, "set", i));
    s.chars.forEach((c) => c.holds !== "none" && add(c.holds, "held", i));
  });
  return [...map.values()];
}

// Define a new custom prop (or update one). Returns it with the generation prompt.
export function define(input: { id?: string; name: string; description?: string; kind: "set" | "held"; size?: Size; grip?: GripClass; front?: boolean }): PropView {
  const id = input.id ?? slug(input.name);
  if (!isPropId(id)) throw new Error(`Invalid prop id "${id}"`);
  if ((input.kind === "set" && (SET_PIECES as readonly string[]).includes(id)) || (input.kind === "held" && (HELD as readonly string[]).includes(id))) {
    throw new Error(`"${id}" is a built-in prop; import an image for "${input.kind}-${id}" instead of redefining it`);
  }
  const idx = readIndex();
  const prev = idx[id];
  const e: PropEntry = {
    id,
    name: input.name,
    description: input.description ?? prev?.description ?? "",
    kind: input.kind,
    size: input.size ?? prev?.size ?? "medium",
    grip: input.grip ?? prev?.grip ?? (input.kind === "held" ? "chest" : "chest"),
    front: input.front ?? prev?.front ?? false,
    builtin: false,
    aspect: prev?.aspect ?? null,
    updatedAt: Date.now(),
  };
  idx[id] = e;
  writeIndex(idx);
  return view(e, id);
}

function slug(name: string) {
  const words = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).slice(0, 4);
  const s = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("");
  return /^[a-z]/.test(s) ? s : `prop${s}`;
}

// ---- green screen keying

// Removes the background by flood-filling from the image edges through pixels close to the
// background color (sampled from the corners), so green parts inside the outlined object
// survive. Edge pixels get soft alpha and lose their green spill. Works in place on RGBA.
async function decodeAndKey(input: Buffer) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x: number, y: number) => (y * w + x) * 4;

  const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]].map(([x, y]) => px(x, y));
  const alreadyTransparent = corners.every((i) => data[i + 3] < 16);
  if (!alreadyTransparent) {
    const bg = [0, 1, 2].map((c) => corners.map((i) => data[i + c]).sort((a, b) => a - b)[1]);
    const dist = (i: number) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    const greenness = (i: number) => data[i + 1] - Math.max(data[i], data[i + 2]);
    const isBg = new Uint8Array(w * h);
    const queue: number[] = [];
    const tryPush = (x: number, y: number) => {
      const p = y * w + x;
      if (isBg[p]) return;
      const i = p * 4;
      if (dist(i) < 110 || greenness(i) > 90) {
        isBg[p] = 1;
        queue.push(p);
      }
    };
    for (let x = 0; x < w; x++) (tryPush(x, 0), tryPush(x, h - 1));
    for (let y = 0; y < h; y++) (tryPush(0, y), tryPush(w - 1, y));
    while (queue.length) {
      const p = queue.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) tryPush(x - 1, y);
      if (x < w - 1) tryPush(x + 1, y);
      if (y > 0) tryPush(x, y - 1);
      if (y < h - 1) tryPush(x, y + 1);
    }
    // Holes enclosed by the drawing (a handle, a rope loop) aren't connected to the edges;
    // remove them too when they are almost exactly the screen green. Object greens survive.
    for (let p = 0; p < w * h; p++) if (!isBg[p] && dist(p * 4) < 70) isBg[p] = 1;
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (isBg[p]) {
        data[i + 3] = 0;
        continue;
      }
      // Pixels touching the background: soften by how green they still are, and despill.
      const x = p % w;
      const y = (p - x) / w;
      const nearBg = (x > 0 && isBg[p - 1]) || (x < w - 1 && isBg[p + 1]) || (y > 0 && isBg[p - w]) || (y < h - 1 && isBg[p + w]);
      if (nearBg) {
        const g = greenness(i);
        if (g > 0) {
          data[i + 3] = Math.round(data[i + 3] * Math.max(0.25, 1 - g / 160));
          data[i + 1] = Math.max(data[i], data[i + 2]);
        }
      }
    }
  }
  return { data, w, h };
}

type Box = { x0: number; y0: number; x1: number; y1: number };

// Crops a box (plus padding) out of keyed RGBA into a PNG, keeping only pixels in `mask` if given.
async function cropPng(data: Buffer, w: number, h: number, box: Box, mask?: Uint8Array) {
  const pad = 6;
  const left = Math.max(0, box.x0 - pad);
  const top = Math.max(0, box.y0 - pad);
  const cw = Math.min(w, box.x1 + pad + 1) - left;
  const ch = Math.min(h, box.y1 + pad + 1) - top;
  let src = data;
  if (mask) {
    src = Buffer.from(data);
    for (let p = 0; p < w * h; p++) if (!mask[p]) src[p * 4 + 3] = 0;
  }
  const png = await sharp(src, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return { png, aspect: cw / ch };
}

export async function keyAndTrim(input: Buffer): Promise<{ png: Buffer; aspect: number }> {
  const { data, w, h } = await decodeAndKey(input);
  const box: Box = { x0: w, y0: h, x1: -1, y1: -1 };
  for (let p = 0; p < w * h; p++) {
    if (data[p * 4 + 3] <= 12) continue;
    const x = p % w;
    const y = (p - x) / w;
    box.x0 = Math.min(box.x0, x);
    box.x1 = Math.max(box.x1, x);
    box.y0 = Math.min(box.y0, y);
    box.y1 = Math.max(box.y1, y);
  }
  if (box.x1 < 0) throw new Error("The image is empty after removing the background. Use a solid green (#00FF00) background and a non-green object.");
  return cropPng(data, w, h, box);
}

// Splits a keyed sheet into its separate objects, in reading order (rows top to bottom,
// left to right). Small detached bits (sparkles, a loose rope end) join the nearest object.
export async function splitSheet(input: Buffer, count: number) {
  const { data, w, h } = await decodeAndKey(input);
  const label = new Int32Array(w * h).fill(-1);
  const comps: (Box & { area: number })[] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] <= 12) continue;
    const id = comps.length;
    const c = { x0: w, y0: h, x1: -1, y1: -1, area: 0 };
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      c.area++;
      c.x0 = Math.min(c.x0, x);
      c.x1 = Math.max(c.x1, x);
      c.y0 = Math.min(c.y0, y);
      c.y1 = Math.max(c.y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (label[q] === -1 && data[q * 4 + 3] > 12) {
            label[q] = id;
            stack.push(q);
          }
        }
      }
    }
    comps.push(c);
  }
  const biggest = Math.max(0, ...comps.map((c) => c.area));
  const main = comps.map((c, i) => ({ ...c, i })).filter((c) => c.area >= biggest * 0.08);
  if (main.length !== count) {
    throw new Error(`Found ${main.length} separate objects but expected ${count}. Make sure every object stands alone with green space around it, then try again (or upload them one by one).`);
  }
  // Attach each small bit to the main object whose box is closest.
  const owner = new Int32Array(comps.length).fill(-1);
  main.forEach((m, k) => (owner[m.i] = k));
  const gap = (a: Box, b: Box) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1) + Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  comps.forEach((c, i) => {
    if (owner[i] !== -1) return;
    let best = 0;
    main.forEach((m, k) => {
      if (gap(c, m) < gap(c, main[best])) best = k;
    });
    owner[i] = best;
    const m = main[best];
    m.x0 = Math.min(m.x0, c.x0);
    m.x1 = Math.max(m.x1, c.x1);
    m.y0 = Math.min(m.y0, c.y0);
    m.y1 = Math.max(m.y1, c.y1);
  });
  // Reading order: objects whose vertical spans overlap share a row; rows top to bottom, left to right.
  const sorted = main.map((m, k) => ({ ...m, k })).sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1));
  const rows: (typeof sorted)[] = [];
  for (const m of sorted) {
    const row = rows[rows.length - 1];
    const cy = (m.y0 + m.y1) / 2;
    if (row && row.some((r) => cy > r.y0 && cy < r.y1)) row.push(m);
    else rows.push([m]);
  }
  const ordered = rows.flatMap((r) => r.sort((a, b) => a.x0 - b.x0));
  return Promise.all(
    ordered.map((m) => {
      const mask = new Uint8Array(w * h);
      for (let p = 0; p < w * h; p++) if (label[p] !== -1 && owner[label[p]] === m.k) mask[p] = 1;
      return cropPng(data, w, h, m, mask);
    }),
  );
}

// Library entry for a key, creating the built-in entry on first use.
function entryFor(idx: Record<string, PropEntry>, key: string): PropEntry {
  let e = idx[key];
  if (!e) {
    const m = /^(set|held)-(.+)$/.exec(key);
    const b = m ? builtinEntry(m[2], m[1] as "set" | "held") : null;
    if (!b) throw new Error(`Unknown prop "${key}". Create it first with create_prop, or use a built-in key like held-moneyBag or set-podium.`);
    e = b;
  }
  return e;
}

// Import an image for a library key ("held-moneyBag", "set-podium" or a custom id).
export async function importImage(key: string, data: Buffer): Promise<PropView> {
  const idx = readIndex();
  const e = entryFor(idx, key);
  const { png, aspect } = await keyAndTrim(data);
  writeFileSync(fileFor(key), png);
  idx[key] = { ...e, aspect, updatedAt: Date.now() };
  writeIndex(idx);
  return view(idx[key], key);
}

// Import a sheet of several props drawn in one image; keys are in reading order.
export async function importSheet(keys: string[], data: Buffer): Promise<PropView[]> {
  if (keys.length < 2 || keys.length > 9) throw new Error("A sheet holds 2 to 9 props");
  const idx = readIndex();
  const entries = keys.map((k) => entryFor(idx, k));
  let parts: { png: Buffer; aspect: number }[];
  try {
    parts = await splitSheet(data, keys.length);
  } catch (_err) {
    const cols = keys.length <= 4 ? 2 : 3;
    const rows = Math.ceil(keys.length / cols);
    const meta = await sharp(data).metadata();
    const w = meta.width || 1024;
    const h = meta.height || 1024;
    parts = await Promise.all(
      keys.map(async (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const cellLeft = Math.floor((c * w) / cols);
        const cellTop = Math.floor((r * h) / rows);
        const cellW = Math.floor(w / cols);
        const cellH = Math.floor(h / rows);
        const cellBuffer = await sharp(data)
          .extract({ left: cellLeft, top: cellTop, width: cellW, height: cellH })
          .png()
          .toBuffer();
        return keyAndTrim(cellBuffer);
      }),
    );
  }
  keys.forEach((k, i) => {
    writeFileSync(fileFor(k), parts[i].png);
    idx[k] = { ...entries[i], aspect: parts[i].aspect, updatedAt: Date.now() };
  });
  writeIndex(idx);
  return keys.map((k) => view(idx[k], k));
}

// One prompt for several props on a grid (2x2 for up to four, 3 columns beyond that).
export function sheetPrompt(keys: string[]) {
  const all = catalog();
  const items = keys.map((k) => {
    const p = all.find((x) => x.key === k);
    if (!p) throw new Error(`Unknown prop "${k}"`);
    return p;
  });
  const cols = items.length <= 4 ? 2 : 3;
  const rows = Math.ceil(items.length / cols);
  const place = (i: number) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const rn = rows === 1 ? "" : r === 0 ? "Top" : r === rows - 1 ? "Bottom" : "Middle";
    const cn = cols === 2 ? ["left", "right"][c] : ["left", "center", "right"][c];
    return rn ? `${rn}-${cn}` : cn[0].toUpperCase() + cn.slice(1);
  };
  const how = (p: PropView) =>
    p.kind === "set"
      ? "orthographic side view at eye level, flat bottom edge, no perspective tilt, no cast shadow"
      : `seen from the side, ${GRIP_WORDS[p.grip]}, isolated with no hands`;
  const what = (p: PropView) => (p.description ? `${p.name} (${p.description})` : p.name);
  const list = items.map((p, i) => `${place(i)}: ${what(p)}, ${how(p)}.`).join(" ");
  return [
    `A ${cols}x${rows} grid of ${items.length} separate objects, evenly spaced, each centered in its own cell with wide empty green space between them; no object touches another object or the image edges.`,
    list,
    "All in the same cohesive art style: flat 2D vector animation prop assets, uniform dark charcoal-black ink outline (#16151d) with consistent medium-thick monoline stroke weight across all items (no tapering, no thick-thin brush variation, matching 4-5px cartoon outline), clean flat color fills with subtle 2-tone cel shading.",
    "Crucial rules: strictly NO white sticker borders, NO die-cut edges, NO drop shadows or cast shadows, NO 3D bevels.",
    "Background: one solid, flat, pure chroma-key green (#00FF00) across the whole image, perfectly uniform, no grid lines, no borders, no shadows, no floor, no gradient, no texture.",
    "Do not use bright green (#00FF00) anywhere on the objects. No text, no letters, no logos, no people, no hands.",
  ].join(" ");
}

export function remove(key: string) {
  const idx = readIndex();
  rmSync(fileFor(key), { force: true });
  if (idx[key]?.builtin) idx[key] = { ...idx[key], aspect: null };
  else delete idx[key];
  writeIndex(idx);
}

// Render map: what each prop id in a scene draws as. Keys are the ids episodes use;
// built-ins are split by use ("held:trophy" vs "set:trophy").
export function forTimeline(): Record<string, PropImage> {
  const out: Record<string, PropImage> = {};
  for (const p of catalog()) {
    if (!p.url || !p.aspect) continue;
    const anchor: [number, number] = p.kind === "set" ? [0.5, 1] : HELD_ANCHOR[p.grip];
    out[`${p.kind}:${p.id}`] = { url: p.url, kind: p.kind, height: HEIGHT[p.kind][p.size], aspect: p.aspect, anchor, grip: p.grip, front: p.front };
  }
  return out;
}
