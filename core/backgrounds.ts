// Image background library: style-matched prompts for an image generator, and the
// images people bring back. One image per background + time of day, shared by all videos.

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { BACKGROUNDS, bgKey, TIMES, type EpisodeT, type SceneT, type Timeline } from "../src/schema";
import { forTimeline as characterSkins } from "./characters";
import { forTimeline as propImages } from "./props";
import { ROOT, type Settings } from "./store";

export const LIB_DIR = join(ROOT, "assets", "backgrounds");
mkdirSync(LIB_DIR, { recursive: true });
const EXTS = [".png", ".jpg", ".jpeg", ".webp"];

// Shared art direction. Carefully structured for proper depth hierarchy:
// Environmental outlines are thin and softly tinted so bold-outlined sticker characters pop,
// and the floor plane is strictly horizontal at the bottom 20% so characters stand firmly on it.
const STYLE = [
  "Flat 2D vector environment backdrop for a modern cartoon explainer video (Kurzgesagt / Ifverse style).",
  "Art style & hierarchy: clean simplified geometric shapes, soft pastel color palette with warm atmospheric accents, gentle gradients, subtle paper texture.",
  "Outline thickness & depth: environmental linework is delicate, thin, and softly tinted to match local surface tones (strictly NO heavy black ink outlines, NO thick cartoon borders on background objects), creating clear atmospheric separation so foreground characters pop forward naturally.",
  "Camera & perspective: strict 90-degree eye-level side view (flat 2D orthographic side-scroller perspective, zero camera pitch, NO downward high angle, NO upward low angle, NO 3-point perspective, NO fisheye). Wide 16:9 landscape composition.",
  "Floor plane: the bottom 18-20% of the canvas must be a completely flat, horizontal, uncluttered floor or ground running the entire width from left to right, meeting the back wall/horizon at a straight horizontal line. Keep this floor strip completely open and clear of tall furniture, rugs, or clutter so characters can stand and walk on it naturally.",
  "Composition: keep the center 50% open for character staging; place major background details (windows, shelves, pillars, lamps, trees) along the left and right thirds.",
  "No people, no characters, no animals, no text, no letters, no logos, no watermark, no frame or border.",
].join(" ");

const LIGHT: Record<SceneT["time"], string> = {
  day: "Atmospheric lighting: bright, soft diffused daylight with clean sky tones and gentle downward ambient shadows, harmonizing with vector cartoon characters.",
  sunset: "Atmospheric lighting: rich golden-hour glow, warm amber and coral horizon gradients, soft directional rim illumination from the side, long warm atmospheric shadows.",
  night: "Atmospheric lighting: deep midnight navy and indigo palette, soft pale moonlight, warm cozy glows from lamps, windows, or neon signs with high-contrast ambient separation.",
};

const PLACES: Record<SceneT["bg"], string> = {
  bedroom: "A cozy child's bedroom: a window with curtains, two posters, a small wall shelf with books, a wooden dresser, wooden floor with a round rug.",
  classroom: "An elementary school classroom: a large green chalkboard with simple doodles, windows on both sides, a wall clock, colorful cubbies, wooden floor.",
  office: "A modern open office: large windows, a framed chart poster, a filing cabinet, potted plant, ceiling lights, tiled floor.",
  capitol: "A grand white government capitol building with a dome and columns behind wide stone steps, a flag on a pole, green lawn in front.",
  stage: "A theater stage with heavy red curtains on both sides, a warm spotlight pool in the center, string lights above, wooden stage floor.",
  lake: "A calm lake with pine-covered hills behind, a wooden dock along the left shore, a small rowboat, grassy shore in front.",
  street: "A colorful small-town street with shopfront buildings, a sidewalk, a street lamp and a quiet road in front.",
  void: "An abstract empty space with a soft radial gradient and faint floating particles, minimal and dreamy.",
  hospital: "A clean hospital room: mint walls, a window, a red cross sign, a heart monitor on a stand, an IV pole, light tiled floor.",
  space: "A rocky grey moon surface with small craters, a ringed orange planet and stars in a deep purple space sky.",
  cityNight: "A city skyline of tall buildings with lit windows, a sidewalk with street lamps, a dark road in front.",
  forest: "A sunny forest clearing with rounded trees and pines, soft light rays, small red mushrooms, a grassy floor.",
  courtroom: "A wooden courtroom: tall columns, a large judge's bench in the center back with a round emblem above, wooden floor.",
  lab: "A science laboratory: counters with colorful bubbling flasks, a big monitor with graphs, a glass chamber, tiled floor.",
  beach: "A tropical beach: turquoise sea, a palm tree, a striped beach umbrella, soft sand across the front.",
  kitchen: "A home kitchen: wooden cabinets, tiled backsplash, a window with curtains, a stove with a pot, a fridge, tiled floor.",
  desert: "A sunny desert with layered sand dunes, a distant pyramid, saguaro cacti, flat sand ground in front.",
  castle: "A medieval castle throne hall: stone brick walls, a tall arched window, red banners with gold emblems, wall torches, a red carpet.",
  prison: "A prison cell block: grey brick walls, a small barred window high up, a metal bench, concrete floor.",
  shop: "A colorful store interior: a striped awning, shelves of colorful products, a big shop window with a sale sign, a checkout counter.",
  gym: "A gym: mirrors, dumbbell racks, a squat rack, motivational banner without words, rubber floor.",
  plane: "An airplane cabin interior: rows of rounded windows showing the sky, blue seats, overhead bins, carpet aisle.",
  underwater: "An underwater ocean floor: light rays from above, colorful coral, swaying seaweed, small fish, bubbles, sandy floor.",
  mountains: "A mountain valley: snow-capped peaks, rolling green hills with pine trees, a flat grassy meadow in front.",
  hallway: "A school hallway lined with colorful lockers, a window at the end, ceiling lights, glossy tiled floor.",
  restaurant: "A cozy restaurant: warm hanging lamps, a window with curtains, framed picture, round tables with candles, dark tiled floor.",
  park: "A city park: big round trees, bushes, a winding path, a small pond, flowers, a grassy lawn in front.",
  spaceship: "A spaceship bridge: a large viewport showing stars and a blue planet, glowing control panels, metallic walls and floor.",
  ruins: "Post-apocalyptic city ruins: broken buildings with empty windows, rubble, rising smoke, a cracked ground in front.",
  jungle: "A dense jungle: big leafy plants, hanging vines, palm trees, soft light rays, a mossy ground in front.",
  livingRoom: "A cozy living room: a window with curtains, a TV on a low cabinet, bookshelves, a potted plant, wooden floor with a rug.",
  bank: "A grand bank lobby: marble columns, a huge round steel vault door in the center back, polished stone floor.",
};

export function promptFor(bg: SceneT["bg"], time: SceneT["time"]) {
  return `${PLACES[bg]} ${LIGHT[time]} ${STYLE}`;
}

function fileFor(key: string): string | null {
  for (const ext of EXTS) {
    const f = join(LIB_DIR, key + ext);
    if (existsSync(f)) return f;
  }
  return null;
}

// URL map for the renderer; the ?v= stamp makes replaced images show up immediately.
export function library(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(LIB_DIR)) {
    const ext = extname(name).toLowerCase();
    if (!EXTS.includes(ext)) continue;
    const key = name.slice(0, -ext.length);
    out[key] = `/assets/backgrounds/${name}?v=${Math.round(statSync(join(LIB_DIR, name)).mtimeMs)}`;
  }
  return out;
}

export type BackgroundEntry = { key: string; bg: SceneT["bg"]; time: SceneT["time"]; prompt: string; url: string | null; scenes: number[] };

export function catalog(): BackgroundEntry[] {
  const lib = library();
  return BACKGROUNDS.flatMap((bg) => TIMES.map((time) => ({ key: bgKey(bg, time), bg, time, prompt: promptFor(bg, time), url: lib[bgKey(bg, time)] ?? null, scenes: [] })));
}

// The backgrounds one episode needs, with the scenes (1-based) that use each.
export function neededFor(ep: EpisodeT): BackgroundEntry[] {
  const lib = library();
  const map = new Map<string, BackgroundEntry>();
  ep.scenes.forEach((s, i) => {
    const key = bgKey(s.bg, s.time);
    const e = map.get(key) ?? { key, bg: s.bg, time: s.time, prompt: promptFor(s.bg, s.time), url: lib[key] ?? null, scenes: [] };
    e.scenes.push(i + 1);
    map.set(key, e);
  });
  return [...map.values()];
}

const KEY_RE = new RegExp(`^(${BACKGROUNDS.join("|")})-(${TIMES.join("|")})$`);
export const isKey = (key: string) => KEY_RE.test(key);

export function saveImage(key: string, data: Buffer, ext: string) {
  if (!isKey(key)) throw new Error(`Unknown background "${key}"`);
  const e = ext.toLowerCase().startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  if (!EXTS.includes(e)) throw new Error(`Use a PNG, JPG or WEBP image (got ${ext})`);
  removeImage(key);
  writeFileSync(join(LIB_DIR, key + e), data);
}

export function removeImage(key: string) {
  const f = fileFor(key);
  if (f) rmSync(f);
}

// Adds the shared libraries to a timeline: background images (unless the project uses
// drawn backgrounds only), prop images and character skins, used whenever they exist.
export function withLibrary<T extends Timeline | null>(timeline: T, s: Settings): T {
  if (!timeline) return timeline;
  return { ...timeline, bgImages: s.imageBackgrounds === false ? {} : library(), props: propImages(), skins: characterSkins() };
}
