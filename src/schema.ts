import { z } from "zod";

// The episode format the script step writes and the renderer reads.
// Every enum value must have a drawing in the renderer. Field names are short on
// purpose: the cheap script model pays for every output token.

export const BACKGROUNDS = [
  "bedroom", "classroom", "office", "capitol", "stage", "lake", "street", "void",
  "hospital", "space", "cityNight", "forest", "courtroom", "lab", "beach", "kitchen",
  "desert", "castle", "prison", "shop", "gym", "plane", "underwater", "mountains",
  "hallway", "restaurant", "park", "spaceship", "ruins", "jungle", "livingRoom", "bank",
] as const;
export const TIMES = ["day", "sunset", "night"] as const;

export const POSES = ["idle", "wave", "point", "shrug", "armsUp", "facepalm", "think", "cross", "handsHips", "pray", "flex", "celebrate", "sit"] as const;
export const EXPRESSIONS = ["neutral", "happy", "shocked", "smug", "sad", "angry", "scared", "love", "sleepy", "crying", "determined", "confused"] as const;
export const EMOTES = ["none", "exclaim", "question", "heart", "anger", "sweat", "idea", "zzz", "music", "money"] as const;
export const ACTIONS = ["none", "walkIn", "walkOut", "jump", "bounce", "tremble", "spin", "float"] as const;
export const HELD = [
  "none", "phone", "money", "sign", "book", "sword", "cup", "fishingRod", "briefcase", "mic",
  "pizza", "laptop", "umbrella", "flashlight", "trophy", "flag", "newspaper", "guitar", "wand", "map", "key", "moneyBag", "balloon", "magnifier",
] as const;

export const HATS = ["none", "cowboy", "cap", "tophat", "crown", "hardhat", "chef", "wizard", "beanie", "party", "police", "pirate", "halo", "horns"] as const;
export const HAIR = ["none", "short", "spiky", "long", "ponytail", "bun", "curly", "mohawk", "afro", "pigtails"] as const;
export const OUTFITS = ["jacket", "suit", "hoodie", "tshirt", "dress", "labcoat", "uniform", "armor", "sweater", "overalls"] as const;
export const BODIES = ["slim", "normal", "broad", "round"] as const;
export const ACCESSORIES = ["none", "glasses", "sunglasses", "monocle", "mustache", "beard", "eyepatch", "headphones", "scarf", "cape", "mask", "bowtie"] as const;

export const SET_PIECES = [
  "podium", "desk", "bed", "tree", "car", "table", "trophy", "clock", "door", "computer",
  "couch", "fridge", "plant", "lamp", "bookshelf", "tv", "bench", "streetlamp", "rocket", "portal",
  "chest", "throne", "cage", "crates", "vending", "fire", "sign", "moneyPile",
] as const;
export const CAMERAS = ["static", "zoomIn", "zoomOut", "panLeft", "panRight", "closeUp", "dutch", "pushIn"] as const;
export const TRANSITIONS = ["cut", "fade", "wipe", "zoom", "slide", "iris", "flash"] as const;
export const EFFECTS = ["none", "shake", "flash", "rain", "confetti", "glitch", "snow", "sparkles", "hearts", "moneyRain", "speedLines", "fog", "embers"] as const;

export const CastMember = z.object({
  name: z.string(),
  color: z.string().describe("Main outfit hex color, e.g. #d9472b"),
  accent: z.string().describe("Second hex color: eyes, scarf, details"),
  outfit: z.enum(OUTFITS),
  body: z.enum(BODIES),
  hair: z.enum(HAIR),
  hairColor: z.string().describe("Hex, e.g. #4a2e1a"),
  hat: z.enum(HATS),
  accessory: z.enum(ACCESSORIES),
  tie: z.boolean(),
  scale: z.number().describe("1 adult, 0.6 child"),
});

export const SceneCharacter = z.object({
  name: z.string().describe("Must match a cast name"),
  x: z.number().describe("0 left .. 1 right"),
  pose: z.enum(POSES),
  face: z.enum(EXPRESSIONS),
  facing: z.enum(["left", "right"]),
  action: z.enum(ACTIONS),
  holds: z.string().describe(`Held prop: none, one of ${HELD.slice(1).join(", ")}, or a custom prop id from the library`),
  emote: z.enum(EMOTES).describe("Small icon bubble above the head"),
  talking: z.boolean().describe("Mouth moves with the narration audio"),
});

// Props are ids: a built-in drawing (HELD, SET_PIECES) or a custom prop from the props library.
export const SetPiece = z.object({ kind: z.string().describe(`One of ${SET_PIECES.join(", ")}, or a custom prop id from the library`), x: z.number() });
export const isPropId = (v: unknown): v is string => typeof v === "string" && /^[a-z][a-zA-Z0-9-]{0,48}$/.test(v);

export const Scene = z.object({
  narration: z.string().describe("1-3 sentences, 5-12 seconds aloud"),
  bg: z.enum(BACKGROUNDS),
  time: z.enum(TIMES),
  camera: z.enum(CAMERAS),
  transition: z.enum(TRANSITIONS),
  effect: z.enum(EFFECTS),
  chars: z.array(SceneCharacter),
  set: z.array(SetPiece),
  label: z.string().describe("Name plate text or empty"),
  hud: z.string().describe("Corner counter like 'LIVES: 3' or empty"),
});

export const Episode = z.object({
  title: z.string(),
  cast: z.array(CastMember),
  scenes: z.array(Scene),
});

export type EpisodeT = z.infer<typeof Episode>;
export type SceneT = z.infer<typeof Scene>;
export type CastT = z.infer<typeof CastMember>;
export type SceneCharT = z.infer<typeof SceneCharacter>;

// Fill in fields that older episodes (or hand-written scripts) leave out, and
// replace unknown enum values with safe ones, so anything renders.
const pick = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  (list as readonly string[]).includes(v as string) ? (v as T[number]) : fallback;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeEpisode(raw: any): EpisodeT {
  const cast = (raw?.cast ?? []).map((c: any) => ({
    name: String(c?.name ?? "Someone"),
    color: hex(c?.color, "#d9472b"),
    accent: hex(c?.accent, "#3fb7ff"),
    outfit: pick(OUTFITS, c?.outfit, c?.tie ? "suit" : "jacket"),
    body: pick(BODIES, c?.body, "normal"),
    hair: pick(HAIR, c?.hair, "none"),
    hairColor: hex(c?.hairColor, "#3b2618"),
    hat: pick(HATS, c?.hat, "none"),
    accessory: pick(ACCESSORIES, c?.accessory, "none"),
    tie: Boolean(c?.tie),
    scale: Number.isFinite(c?.scale) ? Math.min(1.3, Math.max(0.4, c.scale)) : 1,
  }));
  const clamp = (x: unknown) => Math.min(0.95, Math.max(0.05, Number.isFinite(x) ? (x as number) : 0.5));
  const scenes = (raw?.scenes ?? []).map((s: any) => ({
    narration: String(s?.narration ?? ""),
    bg: pick(BACKGROUNDS, s?.bg ?? s?.background, "void"),
    time: pick(TIMES, s?.time, "day"),
    camera: pick(CAMERAS, s?.camera, "static"),
    transition: pick(TRANSITIONS, s?.transition, "cut"),
    effect: pick(EFFECTS, s?.effect, "none"),
    chars: (s?.chars ?? s?.characters ?? []).map((c: any) => ({
      name: String(c?.name ?? cast[0]?.name ?? "Someone"),
      x: clamp(c?.x),
      pose: pick(POSES, c?.pose, "idle"),
      face: pick(EXPRESSIONS, c?.face ?? c?.expression, "neutral"),
      facing: c?.facing === "left" ? "left" : "right",
      action: pick(ACTIONS, c?.action, "none"),
      holds: isPropId(c?.holds) ? c.holds : "none",
      emote: pick(EMOTES, c?.emote, "none"),
      talking: Boolean(c?.talking ?? c?.speaking),
    })),
    set: (s?.set ?? []).filter((p: any) => isPropId(p?.kind)).map((p: any) => ({ kind: p.kind as string, x: clamp(p?.x) })),
    label: String(s?.label ?? ""),
    hud: String(s?.hud ?? ""),
  }));
  return { title: String(raw?.title ?? "Untitled"), cast, scenes };
}

// Render-ready episode: each scene gets its audio, length and word timings.
export type Word = { w: string; start: number; end: number };
export type TimedScene = SceneT & { audio: string | null; durationSec: number; words: Word[] };
export type Timeline = {
  title: string;
  fps: number;
  format: "landscape" | "vertical";
  mediaBase: string; // prefix for audio URLs ("" in the browser, http://localhost:PORT when rendering)
  music: string | null;
  cast: CastT[];
  scenes: TimedScene[];
  // Image backgrounds from the library, keyed by bgKey(); missing keys use the vector art.
  bgImages?: Record<string, string>;
  // Image props from the props library, keyed by prop id; built-ins without an image use the drawing.
  props?: Record<string, PropImage>;
  // Character skins from the character library, keyed by cast name (lowercase).
  skins?: Record<string, CharacterSkin>;
};

// How a held prop sits in the hand: hanging at the side, held at the chest, pointed
// forward, on a pole held low in front, or raised to the mouth.
export const GRIP_CLASSES = ["side", "chest", "forward", "lowFront", "mouth"] as const;
export type GripClass = (typeof GRIP_CLASSES)[number];
export type PropImage = {
  url: string;
  kind: "set" | "held";
  height: number; // in character units (a standing adult is about 270)
  aspect: number; // width / height of the trimmed image
  anchor: [number, number]; // point that touches the floor (set) or the hand (held), as 0..1 of the image
  grip: GripClass;
  front: boolean; // set pieces drawn in front of characters (counters, desks)
};

// Illustrated pieces for the parts of a character. Torsos, hair/hat toppers,
// or optional full illustrated heads. Limbs and secondary animation are drawn by the rig.
export type CharacterSkin = {
  torso: { url: string; aspect: number } | null;
  topper: { url: string; aspect: number } | null; // hair or hat, trimmed to above the brows
  sleeve: string | null; // main fabric color sampled from the torso image
  head?: { url: string; aspect: number } | null; // illustrated chibi head/face
};
export const skinKey = (name: string) => name.trim().toLowerCase();

export const bgKey = (bg: SceneT["bg"], time: SceneT["time"]) => `${bg}-${time}`;

export const FPS = 30;

export const totalFrames = (t: Pick<Timeline, "scenes">) =>
  t.scenes.reduce((n, s) => n + Math.max(1, Math.round(s.durationSec * FPS)), 0);

// Word timings estimated from word length; good enough for captions without a
// separate alignment model.
export function estimateWords(text: string, speechSec: number): Word[] {
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2 + (/[.,!?;:]$/.test(w) ? 4 : 0));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return words.map((w, i) => {
    const d = (weights[i] / total) * speechSec;
    const word = { w, start: t, end: t + d };
    t += d;
    return word;
  });
}

// Preview timeline for an episode that has no audio yet (about 2.7 words/second).
export function draftTimeline(ep: EpisodeT, format: Timeline["format"] = "landscape"): Timeline {
  return {
    title: ep.title,
    fps: FPS,
    format,
    mediaBase: "",
    music: null,
    cast: ep.cast,
    scenes: ep.scenes.map((s) => {
      const speech = Math.max(2, s.narration.split(/\s+/).length / 2.7);
      return { ...s, audio: null, durationSec: speech + 0.6, words: estimateWords(s.narration, speech) };
    }),
  };
}
