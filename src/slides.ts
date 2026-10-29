import { estimateWords, FPS, type Word } from "./schema";

// The "image slideshow" video type: one still image per scene with a slow camera move, a
// transition into the scene, and a voice-over. The script (this file's types) is written by
// the LLM; the user generates the images from the prompts the app derives from it.

export const SLIDE_CAMERAS = ["still", "zoomIn", "zoomOut", "panLeft", "panRight", "panUp", "panDown", "pushIn"] as const;
export const INTENSITIES = ["subtle", "normal", "strong"] as const;
export const SLIDE_TRANSITIONS = ["cut", "crossfade", "dip", "slideLeft", "slideRight", "wipe", "zoom", "flash", "blur"] as const;
export const CAPTION_STYLES = ["bold", "subtle", "none"] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number];

// How long the incoming scene takes to take over from the previous one (frames).
export const TRANSITION_FRAMES = 15;
export const leadFrames = (kind: SlideSceneT["transition"]) => (kind === "cut" || kind === "flash" ? 0 : TRANSITION_FRAMES);

export type SlideSubject = { name: string; look: string };

// Built-in looks. A preset supplies the art direction and a fixed main character, so every image
// of a series matches without the writer having to re-describe them.
export const PRESETS = {
  stickman: {
    label: "White stickman comic",
    style:
      "Hand-drawn 2D comic illustration in the style of a dark-humor explainer web-comic: thick, slightly uneven black ink outlines on everything, flat cel shading with painterly grain and rough brush texture, rich moody lighting (warm firelight glows, cool moonlight shafts, drifting smoke and dust), richly detailed environments full of period props and surface cracks, muted earthy palette with one strong warm accent color per image, slightly exaggerated cartoon proportions, cinematic framing",
    subjects: [
      {
        name: "Stickman",
        look: "the series' everyman hero, drawn in the same thick-outline cartoon style as the scene: a large perfectly round plain white head with a thick black outline, no hair and no ears, two small solid black oval eyes with expressive eyebrows, a small simple mouth that clearly shows the emotion, and a thin black stick-like neck, torso, arms and legs with small round hands; he stays a simple stickman (never a realistic human) and wears or holds only what the scene says, drawn as simple shapes",
      },
    ] as SlideSubject[],
  },
} as const;
export type SlidePreset = keyof typeof PRESETS | "";

export const effectiveStyle = (show: Pick<SlideshowT, "preset" | "style">) => [show.preset ? PRESETS[show.preset].style : "", show.style].filter(Boolean).join(". ");
// The preset's characters plus the script's own; the script wins when a name appears in both.
export const effectiveSubjects = (show: Pick<SlideshowT, "preset" | "subjects">): SlideSubject[] => {
  const own = new Set(show.subjects.map((s) => s.name.toLowerCase()));
  return [...(show.preset ? PRESETS[show.preset].subjects.filter((s) => !own.has(s.name.toLowerCase())) : []), ...show.subjects];
};

export type SlideSceneT = {
  narration: string;
  prompt: string; // what the image shows (the art style is added by the app)
  subjects: string[]; // names from the show's subjects that appear in this image
  camera: (typeof SLIDE_CAMERAS)[number];
  intensity: (typeof INTENSITIES)[number];
  focus: [number, number] | null; // 0..1 point that zoom moves aim at; null = center
  transition: (typeof SLIDE_TRANSITIONS)[number]; // how this scene arrives
  label: string; // lower-third text such as a place or date, or ""
  voice: string; // optional voice override for this scene, or ""
};

// Choices the writer may make for the whole video; explicit settings from the user win.
export type SlideshowSettings = {
  format?: "landscape" | "vertical";
  lang?: "en-us" | "en-gb" | "es";
  voice?: string;
  speed?: number;
  music?: string | null;
  musicVolume?: number;
  captions?: CaptionStyle;
};

export type SlideshowT = {
  title: string;
  preset: SlidePreset; // built-in look ("stickman") or "" for a free style
  style: string; // art direction appended to every image prompt (extra tweaks when a preset is set)
  subjects: SlideSubject[]; // recurring people/objects with a fixed visual description
  settings: SlideshowSettings;
  scenes: SlideSceneT[];
};

const pick = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  (list as readonly string[]).includes(v as string) ? (v as T[number]) : fallback;
const num = (v: unknown, lo: number, hi: number): number | undefined => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);

// Fill defaults and replace unknown enum values so any script renders. Scenes without
// narration are dropped (nothing to voice).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSlideshow(raw: any): SlideshowT {
  const st = raw?.settings ?? {};
  const lang = ["en-us", "en-gb", "es"].includes(st.lang ?? st.language) ? (st.lang ?? st.language) : undefined;
  const settings: SlideshowSettings = {};
  if (st.format === "landscape" || st.format === "vertical") settings.format = st.format;
  if (lang) settings.lang = lang;
  if (typeof st.voice === "string" && st.voice) settings.voice = st.voice;
  if (num(st.speed, 0.8, 1.3) !== undefined) settings.speed = num(st.speed, 0.8, 1.3);
  if (typeof st.music === "string" || st.music === null) settings.music = st.music || null;
  if (num(st.musicVolume, 0, 0.5) !== undefined) settings.musicVolume = num(st.musicVolume, 0, 0.5);
  if ((CAPTION_STYLES as readonly string[]).includes(st.captions)) settings.captions = st.captions;

  const subjects: SlideSubject[] = (raw?.subjects ?? raw?.characters ?? [])
    .map((s: any) => ({ name: String(s?.name ?? "").trim(), look: String(s?.look ?? s?.description ?? "").trim() }))
    .filter((s: SlideSubject) => s.name && s.look);

  const scenes: SlideSceneT[] = (raw?.scenes ?? [])
    .map((s: any) => {
      const f = Array.isArray(s?.focus) ? s.focus : s?.focus && typeof s.focus === "object" ? [s.focus.x, s.focus.y] : null;
      const fx = f && num(f[0], 0, 1);
      const fy = f && num(f[1], 0, 1);
      return {
        narration: String(s?.narration ?? "").trim(),
        prompt: String(s?.prompt ?? s?.imagePrompt ?? s?.image ?? "").trim(),
        subjects: (Array.isArray(s?.subjects) ? s.subjects : []).map((n: unknown) => String(n).trim()).filter(Boolean),
        camera: pick(SLIDE_CAMERAS, s?.camera, "zoomIn"),
        intensity: pick(INTENSITIES, s?.intensity, "normal"),
        focus: fx !== undefined && fy !== undefined && f ? ([fx, fy] as [number, number]) : null,
        transition: pick(SLIDE_TRANSITIONS, s?.transition, "crossfade"),
        label: String(s?.label ?? "").trim(),
        voice: String(s?.voice ?? "").trim(),
      };
    })
    .filter((s: SlideSceneT) => s.narration);

  const preset = String(raw?.preset ?? "").trim().toLowerCase();
  return { title: String(raw?.title ?? "Untitled"), preset: preset in PRESETS ? (preset as SlidePreset) : "", style: String(raw?.style ?? "").trim(), subjects, settings, scenes };
}

// Render-ready slideshow: each scene gets its image, audio, length and word timings.
export type SlideTimed = SlideSceneT & { image: string | null; audio: string | null; durationSec: number; words: Word[] };
export type SlideTimeline = {
  title: string;
  fps: number;
  format: "landscape" | "vertical";
  mediaBase: string; // prefix for media URLs ("" in the browser, http://localhost:PORT when rendering)
  music: string | null;
  musicVolume: number;
  captions: CaptionStyle;
  scenes: SlideTimed[];
};

export const slideFrames = (s: { durationSec: number }) => Math.max(1, Math.round(s.durationSec * FPS));
export const slideTotalFrames = (t: Pick<SlideTimeline, "scenes">) => t.scenes.reduce((n, s) => n + slideFrames(s), 0);

// Preview timeline for a slideshow with no audio yet (about 2.7 words/second).
export function draftSlideTimeline(
  show: SlideshowT,
  o: { format: SlideTimeline["format"]; music: string | null; musicVolume: number; captions: CaptionStyle; images?: (string | null)[] },
): SlideTimeline {
  return {
    title: show.title,
    fps: FPS,
    format: o.format,
    mediaBase: "",
    music: o.music,
    musicVolume: o.musicVolume,
    captions: o.captions,
    scenes: show.scenes.map((s, i) => {
      const speech = Math.max(2, s.narration.split(/\s+/).length / 2.7);
      return { ...s, image: o.images?.[i] ?? null, audio: null, durationSec: speech + 0.6, words: estimateWords(s.narration, speech) };
    }),
  };
}

// The full prompt for one scene: its picture, the looks of the recurring subjects it
// contains, the shared art direction, the aspect ratio and composition notes for its camera move.
export function promptFor(show: SlideshowT, i: number, format: "landscape" | "vertical"): string {
  const sc = show.scenes[i];
  const known = new Map(effectiveSubjects(show).map((s) => [s.name.toLowerCase(), s]));
  const style = effectiveStyle(show);
  const subjects = sc.subjects.map((n) => known.get(n.toLowerCase())).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const vertical = format === "vertical";
  const at = sc.focus ? ` near ${sc.focus[0] < 0.4 ? "the left" : sc.focus[0] > 0.6 ? "the right" : "the center"}${sc.focus[1] < 0.4 ? " upper area" : sc.focus[1] > 0.6 ? " lower area" : ""}` : "";
  const move: Record<string, string> = {
    zoomIn: `The camera will slowly push in, so keep one clear, well-lit focal point${at}.`,
    pushIn: `The camera will push in fast on the focal point${at}, so put the reveal there.`,
    zoomOut: "The camera will slowly pull back, so keep the subject central with interesting surroundings at the edges.",
    panLeft: "The camera will glide sideways across the image, so spread interesting details across the full width.",
    panRight: "The camera will glide sideways across the image, so spread interesting details across the full width.",
    panUp: "The camera will glide upward across the image, so spread interesting details across the full height.",
    panDown: "The camera will glide downward across the image, so spread interesting details across the full height.",
    still: "",
  };
  return [
    sc.prompt.replace(/[.\s]+$/, "") + ".",
    subjects.length ? `Recurring subjects, keep them identical in every image: ${subjects.map((s) => `${s.name} is ${s.look.replace(/[.\s]+$/, "")}`).join("; ")}.` : "",
    style ? `Art direction (the same in every image): ${style.replace(/[.\s]+$/, "")}.` : "",
    vertical ? "Vertical 9:16 portrait composition (1080x1920)." : "Wide 16:9 landscape composition (1920x1080).",
    move[sc.camera] ?? "",
    "No text, letters, captions, logos, watermarks or borders in the image.",
  ].filter(Boolean).join(" ");
}
