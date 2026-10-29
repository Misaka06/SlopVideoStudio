// Character library ("hybrid skins"): an image generator draws a character's torso and
// hair/hat on a green screen; the app keys, splits and stores them per character name.
// Every video whose cast uses that name gets the illustrated pieces; the rig keeps
// drawing the head, face and limbs, so expressions and motion still work.

import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { skinKey, type CharacterSkin } from "../src/schema";
import { keyAndTrim, splitSheet } from "./props";
import { ROOT } from "./store";

export const CHAR_DIR = join(ROOT, "assets", "characters");
mkdirSync(CHAR_DIR, { recursive: true });

type Meta = {
  name: string;
  torsoAspect: number | null;
  topperAspect: number | null;
  headAspect?: number | null;
  sleeve: string | null;
  updatedAt: number;
};

const slug = (name: string) => skinKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character";
const dirOf = (name: string) => join(CHAR_DIR, slug(name));
const metaOf = (name: string): Meta | null => {
  const f = join(dirOf(name), "skin.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
};

const STYLE = [
  "All in the same cohesive art style: flat 2D vector animation asset for a cartoon character rig (Kurzgesagt / Ifverse style).",
  "Line art & contours: uniform solid dark charcoal-black ink outline (#16151d) with consistent medium-thick monoline stroke weight (strictly uniform line thickness, closed vector contours, no tapering, no thick-thin brush variation, matching 4-5px cartoon outline).",
  "Color & shading: flat solid color fills with subtle 2-tone cel shading (soft shadow tone on the right side from top-left light), clean minimal fabric seams/details drawn with the same dark ink line weight.",
  "Crucial rules: strictly NO white sticker border, NO die-cut cut-out edge, NO drop shadows, NO cast shadows, NO 3D bevel or glossy reflections.",
  "Background: one solid, flat, pure chroma-key green (#00FF00) across the whole image, perfectly uniform, no borders, no shadows, no floor, no gradient, no texture, with razor-sharp anti-aliased edge and zero green color spill.",
  "Do not use bright green (#00FF00) anywhere on the objects. No text, no letters, no logos, no people, no faces, no hands, no skin.",
].join(" ");

// Prompt for one character: the torso costume, plus a hair or hat piece unless bald.
export function promptFor(input: { outfit: string; hair?: string; body?: "slim" | "normal" | "broad" | "round" }) {
  const ratio = input.body === "slim" ? 1.8 : input.body === "broad" || input.body === "round" ? 1.4 : 1.6;
  const torso = `a cartoon torso costume only: ${input.outfit}, shown as a soft rounded-rectangle body shape about ${ratio} times taller than it is wide, in a 3/4 view turned slightly to the right; sleeveless cut cleanly at the armholes (arms are attached separately in animation); clean curved collar/neckline at the top edge leaving the neck area open; flat horizontal bottom edge at the hips; strictly no head, no neck, no arms, no sleeves, no hands, no legs, no skin`;
  if (!input.hair) {
    return `A single object, centered, with wide empty green space around it and nothing touching the image edges: ${torso}. ${STYLE.replace("All in the same cohesive art style:", "Style:")}`;
  }
  const hair = `a hair or hat topper only: ${input.hair}, shaped as a curved dome cap that sits cleanly over the top of a round spherical cartoon ball head, covering only the top 40% of the head, wider than tall, with a clean smooth curved bottom edge trimmed above the brow line; strictly no face, no head shape below it, no ears, no skin`;
  return `A character costume sheet with 2 separate objects side by side on one green background, evenly spaced, each centered in its own half with wide empty green space around it; neither object touches the other or the image edges. Left: ${torso}. Right: ${hair}. ${STYLE}`;
}

// Average color of the opaque, non-outline pixels: used for the sleeves.
async function fabricColor(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < info.width * info.height * 4; i += 4) {
    if (data[i + 3] < 200) continue;
    const luma = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    if (luma < 50) continue; // skip the dark outline and shading lines
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (!n) return null;
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

// Import a character image: a 2-object sheet (torso left, hair/hat right) or a torso alone.
export async function importSheet(name: string, data: Buffer, parts: "auto" | "torso" | "both" = "auto") {
  if (!name.trim()) throw new Error("Give the character's name exactly as in the cast, e.g. Max");
  let pieces: { png: Buffer; aspect: number }[];
  if (parts === "torso") pieces = [await keyAndTrim(data)];
  else if (parts === "both") pieces = await splitSheet(data, 2);
  else {
    try {
      pieces = await splitSheet(data, 2);
    } catch {
      pieces = [await keyAndTrim(data)];
    }
  }
  const dir = dirOf(name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "torso.png"), pieces[0].png);
  if (pieces[1]) writeFileSync(join(dir, "topper.png"), pieces[1].png);
  else rmSync(join(dir, "topper.png"), { force: true });
  const meta: Meta = {
    name: name.trim(),
    torsoAspect: pieces[0].aspect,
    topperAspect: pieces[1]?.aspect ?? null,
    sleeve: await fabricColor(pieces[0].png),
    updatedAt: Date.now(),
  };
  writeFileSync(join(dir, "skin.json"), JSON.stringify(meta, null, 2));
  return view(meta);
}

export function remove(name: string) {
  rmSync(dirOf(name), { recursive: true, force: true });
}

const url = (name: string, part: string) => {
  const f = join(dirOf(name), `${part}.png`);
  return existsSync(f) ? `/assets/characters/${slug(name)}/${part}.png?v=${Math.round(statSync(f).mtimeMs)}` : null;
};

function view(m: Meta) {
  return { name: m.name, torso: url(m.name, "torso"), topper: url(m.name, "topper"), sleeve: m.sleeve, updatedAt: m.updatedAt };
}

export function list() {
  return readdirSync(CHAR_DIR)
    .map((d) => {
      const f = join(CHAR_DIR, d, "skin.json");
      return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Meta) : null;
    })
    .filter((m): m is Meta => Boolean(m))
    .map(view);
}

// Render map keyed by lowercase cast name.
export function forTimeline(): Record<string, CharacterSkin> {
  const out: Record<string, CharacterSkin> = {};
  for (const d of readdirSync(CHAR_DIR)) {
    const f = join(CHAR_DIR, d, "skin.json");
    if (!existsSync(f)) continue;
    const m = JSON.parse(readFileSync(f, "utf8")) as Meta;
    const torso = url(m.name, "torso");
    const topper = url(m.name, "topper");
    const head = url(m.name, "head");
    out[skinKey(m.name)] = {
      torso: torso && m.torsoAspect ? { url: torso, aspect: m.torsoAspect } : null,
      topper: topper && m.topperAspect ? { url: topper, aspect: m.topperAspect } : null,
      sleeve: m.sleeve,
      head: head && m.headAspect ? { url: head, aspect: m.headAspect } : null,
    };
  }
  return out;
}

export const names = () => list().map((c) => c.name);
export const exists = (name: string) => Boolean(metaOf(name));
