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

// What a recurring subject is. In a preset, people are built by the app on the hero's own figure (the writer
// only supplies their outfit and props); creatures and things are described fully in the look's materials.
export const SUBJECT_KINDS = ["person", "creature", "thing"] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];
export type SlideSubject = { name: string; look: string; kind?: SubjectKind };

const CREATURE = /\b(dragon|cow|bull|ox|oxen|horse|pony|donkey|dog|puppy|cat|kitten|bird|owl|eagle|fish|shark|whale|wolf|bear|fox|rabbit|mouse|rat|sheep|goat|pig|chicken|duck|turtle|snake|lizard|frog|spider|bat|lion|tiger|elephant|monkey|dinosaur|unicorn|ghost|monster|beast|creature|animal|alien|robot)s?\b/i;
const THING = /\b(machine|car|truck|ship|boat|rocket|building|house|castle|tower|object|prop|tool|sword|device|vehicle|tree|chest|book|clock|ring|crown)s?\b/i;
// Fallback for scripts that don't state a kind: the name, then the look, decide.
export const inferKind = (s: Pick<SlideSubject, "name" | "look">): SubjectKind => (CREATURE.test(s.name) ? "creature" : THING.test(s.name) ? "thing" : CREATURE.test(s.look.slice(0, 60)) ? "creature" : "person");
export const kindOf = (s: SlideSubject): SubjectKind => s.kind ?? inferKind(s);

// Built-in looks. A preset supplies the art direction (characters AND scenery), a fixed hero and a
// character-sheet prompt, so every image of a series matches without the writer re-describing them.
// The user generates the hero's character sheet once (the "style anchor") and attaches it to every
// image request that features the hero.
type PresetDef = {
  label: string;
  blurb: string; // what it looks like and what it suits, one or two sentences
  hero: string; // the fixed main character's name (list it in a scene's subjects)
  style: string; // art direction for the whole picture: characters, scenery, light, palette
  look: string; // the hero's fixed description
  sheetBg: string; // background of the character sheet
  sheetStyle: string; // how the sheet is rendered (characters only)
  copy: string; // what an image generator must copy from the anchor image
  blend: string; // how the hero is rendered inside the scenery so both read as one piece of art
};

export const PRESETS = {
  stickman: {
    label: "White stickman comic",
    blurb: "Dark, richly detailed comic-ink scenes with a plain white stickman. Best for what-if stories, history and dark humor.",
    hero: "Stickman",
    style:
      "Hand-drawn 2D comic illustration in the style of a dark-humor explainer web-comic: thick, slightly uneven black ink outlines on everything, flat cel shading with painterly grain and rough brush texture, rich moody lighting (warm firelight glows, cool moonlight shafts, drifting smoke and dust), richly detailed environments full of period props and surface cracks, muted earthy palette with one strong warm accent color per image, slightly exaggerated cartoon proportions, cinematic framing",
    look: "the series' everyman hero, drawn in the series' thick-outline cartoon style: a large perfectly round plain white head with a thick black outline, no hair and no ears, two small solid black oval eyes with expressive eyebrows, a small simple mouth that clearly shows the emotion, small cartoon extras like sweat drops, shiver lines or a flushed cheek when the mood calls for it, a very short neck, a compact rounded capsule-shaped white torso about half as wide as the head with a thick black outline (the same body volume any clothes sit on), thin black stick arms ending in small round white hands, and long thin black stick legs ending in tiny feet; by default he wears no clothes at all, and he wears or holds only what the video's outfit or the scene says, drawn as flat-shaded shapes with the same thick ink outlines; he always stays a simple stickman (never a realistic human)",
    sheetBg: "a plain flat light-grey background",
    sheetStyle: "Hand-drawn 2D comic illustration: thick, slightly uneven black ink outlines, flat cel shading with subtle painterly grain and rough brush texture.",
    copy: "same round white head, compact capsule body, thin black limbs, small round hands, line weight and flat cel-shaded look",
    blend: "draw him with the same thick black ink outlines, cel shading and light as the environment, so he and the scene look like one drawing",
  },
  sticker: {
    label: "Sticker stickmen",
    blurb: "Clean flat-vector explainer look: chunky die-cut sticker characters with white outlines over soft pastel backdrops. Best for friendly explainers, science, money and daily life.",
    hero: "Sticky",
    style:
      "Flat 2D vector explainer illustration in a die-cut sticker look: every character and key prop has a thick clean white sticker outline and a hard flat offset drop shadow, as if stuck onto the scene; bold simplified shapes, saturated friendly colors with soft gradients, subtle paper grain. Backdrops are calm, simplified pastel vector environments with soft gradients and delicate thin tinted linework (no heavy black outlines, no clutter), a strict eye-level side view with an open flat floor strip across the bottom fifth and the center left open, so the stickers pop forward; bright, optimistic, evenly diffused lighting with warm accents",
    look: "the series' chibi sticker stickman: a large perfectly round solid black head with two big glossy white oval eyes with black pupils, thin white arc brows and a small white line mouth that clearly show the emotion, a very short neck, a short rounded pear-shaped body in flat coral red with a soft glossy lighter belly highlight, thin black stick arms ending in small round black hands and thin black stick legs ending in small rounded black shoes, all wrapped in a thick clean white sticker outline with a flat offset shadow; by default he wears nothing more than that red body, and he wears or holds only what the video's outfit or the scene says, in flat bold colors; he always stays a simple stickman (never a realistic human)",
    sheetBg: "a plain flat soft off-white background",
    sheetStyle: "Flat 2D vector sticker illustration: bold simple shapes, flat saturated colors with soft gradients, every drawing wrapped in a thick clean white die-cut sticker outline with a flat offset shadow.",
    copy: "same big round black head with large white eyes and white arc brows, pear-shaped coral-red body with a glossy belly highlight, thin black limbs, small black shoes, white sticker outline and flat offset shadow",
    blend: "keep his white sticker outline and flat offset shadow, and keep the backdrop simple, pastel and free of heavy outlines so he pops forward like a sticker stuck on the scene",
  },
  clay3d: {
    label: "3D clay stickmen",
    blurb: "Soft 3D clay-and-vinyl toy characters in handmade miniature dioramas with tilt-shift lighting. Best for cozy explainers, family content and product-style stories.",
    hero: "Stan",
    style:
      "Stylized 3D render in a premium clay-and-vinyl animation look: soft rounded forms, matte clay and glossy vinyl materials with subtle hand-made imperfections and fingerprints, warm studio three-point lighting with soft global illumination and gentle contact shadows, shallow depth of field with a tilt-shift miniature feel; environments are handcrafted miniature dioramas built from clay, felt, cardboard and wood with small detailed props, a cohesive saturated pastel palette with one warm accent, wide cinematic 16:9 framing",
    look: "the series' 3D toy stickman, sculpted like a vinyl figure: a large perfectly round glossy white sphere head, two tiny solid black bead eyes, thin dark clay-line brows and a thin dark curved mouth line that clearly show the emotion, a short matte white clay rounded-rectangle torso, thin round black wire-like arms and legs, small white clay mitten hands and glossy black shoe blobs, with a glossy head, a matte body and a faint clay texture; by default he wears no clothes, and he wears or holds only what the video's outfit or the scene says, built from clay or felt in the same handmade way; he always stays a simple stickman toy (never a realistic human)",
    sheetBg: "a seamless soft neutral light-grey studio backdrop with a soft contact shadow under each figure",
    sheetStyle: "Stylized 3D render with clay and glossy vinyl materials, soft three-point studio lighting, subtle hand-made imperfections and shallow depth of field.",
    copy: "same glossy white sphere head with tiny bead eyes, matte white clay rounded-rectangle torso, thin black wire limbs, white mitten hands, black shoe blobs, clay texture and soft studio lighting",
    blend: "he is a clay toy standing inside the miniature diorama, lit by the same soft studio lighting with the same contact shadows, materials and shallow depth of field as the set",
  },
  papercut: {
    label: "Paper cut-out world",
    blurb: "Layered handmade paper-craft dioramas with a white paper puppet. Best for storybook, history, cozy and curious explainers.",
    hero: "Paperling",
    style:
      "Handmade layered paper-craft diorama photographed straight on: every element is cut from textured cardstock and construction paper in a warm limited palette, stacked in four to five depth layers with soft drop shadows between layers, visible paper fibers, tiny cut edges, fold and crease lines, small glue and brass-fastener details; gradient paper skies, rolling paper hills and simple paper buildings in the back layers; warm soft studio light from the upper left, shallow depth of field, a cozy craft-room feel, cinematic 16:9 composition",
    look: "the series' paper puppet, made of white cardstock: a large round white paper head cut cleanly with a faint paper grain, two small black dot eyes, thin pencil-drawn brows and a thin pencil-drawn mouth that clearly show the emotion, a boxy folded white paper torso with visible fold edges, thin strips of black paper for arms and legs joined with tiny brass brad fasteners at shoulders, elbows, hips and knees, small white paper mitten-shaped hands and small white paper shoe-shaped feet, with a soft paper shadow beneath him; by default he wears no clothes, and he wears or holds only what the video's outfit or the scene says, made of cut paper in the same way; he always stays a simple paper stickman (never a realistic human)",
    sheetBg: "a plain warm cream paper background",
    sheetStyle: "Handmade paper-craft: cut cardstock layers with visible paper fibers and soft drop shadows, brass brad joints and soft studio light from the upper left.",
    copy: "same round white paper head with dot eyes and pencil brows, boxy folded paper torso, black paper strip limbs with brass brad joints, white paper mitten hands and shoes, paper grain and soft drop shadow",
    blend: "he is cut paper standing on one of the paper layers of the scene, with the same paper texture, soft drop shadows and warm light as the set",
  },
  screenprint: {
    label: "Retro screen-print poster",
    blurb: "Mid-century screen-print poster scenes in four inks with halftone texture and a minimalist geometric hero. Best for history, science, travel and design-minded stories.",
    hero: "Dot",
    style:
      "Mid-century screen-print poster illustration: flat shapes in a strictly limited four-ink palette (deep navy, warm cream paper, vermilion red, mustard yellow) plus black linework, slight ink misregistration and overprint where colors overlap into a darker tone, coarse halftone dot shading, visible paper and ink grain with subtle vintage wear; bold geometric simplified architecture and landscapes, strong diagonal or centered poster compositions with dramatic scale contrast and generous negative space, cinematic 16:9 framing",
    look: "the series' minimalist poster figure built from geometry: a perfectly round cream-white circle head with a thick black outline, two small black ink-dot eyes, a single thin line for the mouth and thin line brows that clearly show the emotion, a short flat navy rounded-rectangle torso, thin black line arms and legs ending in small solid black circles for hands and small black shoe shapes for feet, printed with a vermilion and mustard misregistered offset behind the black outlines and halftone dot shading along the lower edge of the head; by default he wears no clothes, and he wears or holds only what the video's outfit or the scene says, as flat shapes in the same four inks; he always stays a simple geometric figure (never a realistic human)",
    sheetBg: "plain warm cream paper with a faint grain",
    sheetStyle: "Mid-century screen-print: flat shapes in four inks (navy, cream, vermilion, mustard) plus black linework, slight misregistration and halftone dot shading.",
    copy: "same cream circle head with black outline, ink-dot eyes and line brows, flat navy rounded-rectangle torso, thin black line limbs, vermilion and mustard misregistration and halftone shading",
    blend: "he is printed with the same four inks, halftone texture and misregistration as the poster scene, never in extra colors",
  },
} as const satisfies Record<string, PresetDef>;
export type PresetKey = keyof typeof PRESETS;
export type SlidePreset = PresetKey | "";
export const presetKeys = Object.keys(PRESETS) as PresetKey[];

export const presetSubjects = (k: PresetKey): SlideSubject[] => [{ name: PRESETS[k].hero, look: PRESETS[k].look }];
export const anchorFile = (k: PresetKey) => `${k}-anchor.jpg`;
export const anchorUrl = (k: PresetKey) => `/assets/presets/${anchorFile(k)}`;

// The prompt that makes the hero's character sheet (the style anchor), in the preset's own look.
export function anchorPrompt(k: PresetKey): string {
  const p = PRESETS[k];
  const body = p.look.split("; by default")[0];
  return [
    `Character reference sheet of "${p.hero}", the recurring hero of a series of short explainer videos, on ${p.sheetBg}.`,
    p.sheetStyle,
    `${p.hero} is ${body}; he wears no clothes at all.`,
    "Body proportions like a cartoon character: a big head, a short chunky torso and long thin legs.",
    "Layout: top row, three full-body poses on the same scale (front view standing, three-quarter view, side view walking). Bottom row, six head-and-shoulders close-ups with the same head shape and proportions: neutral, shocked, scared with shiver lines, tired and deadpan with a sweat drop, grinning happily, angry.",
    "Consistent proportions, materials, line quality and head size across every drawing. Clean even lighting, no scenery, no props. No text, letters, labels, logos, watermarks or borders.",
  ].join(" ");
}

// Two sample scenes in the preset's look, to judge the style (and whether the anchor holds) before writing a video.
export function testPrompts(k: PresetKey, anchorReady = true): { label: string; prompt: string }[] {
  const p = PRESETS[k];
  const scene = (prompt: string, subjects: string[]): SlideSceneT => ({ narration: "x", prompt, subjects, camera: "zoomIn", intensity: "normal", focus: null, transition: "cut", label: "", voice: "" });
  const show: SlideshowT = {
    title: "test",
    preset: k,
    style: "",
    subjects: [],
    settings: {},
    scenes: [
      scene(`${p.hero} standing in a cozy kitchen at night, staring at a glowing open fridge with a surprised face`, [p.hero]),
      scene("A wide empty town street at dusk with shop fronts, a street lamp and a few parked bicycles, no people", []),
    ],
  };
  return [
    { label: `${p.hero} in a scene`, prompt: promptFor(show, 0, "landscape", anchorReady) },
    { label: "Scenery only", prompt: promptFor(show, 1, "landscape") },
  ];
}

export const effectiveStyle = (show: Pick<SlideshowT, "preset" | "style">) => [show.preset ? PRESETS[show.preset].style : "", show.style].filter(Boolean).join(". ");
// The preset's hero plus the script's own subjects. A script subject with the hero's name adds to him
// instead of replacing him (e.g. Stickman: "wearing a worn olive tunic and a straw hat").
export const effectiveSubjects = (show: Pick<SlideshowT, "preset" | "subjects">): SlideSubject[] => {
  const base = show.preset ? presetSubjects(show.preset) : [];
  const extra = new Map(show.subjects.map((s) => [s.name.toLowerCase(), s.look]));
  const merged = base.map((b) => (extra.has(b.name.toLowerCase()) ? { name: b.name, look: `${b.look.replace(/[.\s]+$/, "")}; in this video ${b.name} is ${extra.get(b.name.toLowerCase())}` } : b));
  const preset = show.preset ? PRESETS[show.preset] : null;
  const rest = show.subjects
    .filter((s) => !base.some((b) => b.name.toLowerCase() === s.name.toLowerCase()))
    // The writer gives a person's outfit and props; the body, face and rendering always come from the hero.
    .map((s) => (preset && kindOf(s) === "person" ? { ...s, look: `a person of this series built exactly like ${preset.hero} (${preset.copy}), differing only in clothes, headgear, props, size and age (never realistic anatomy, faces, skin tones or hair); outfit and props: ${s.look}` } : s));
  return [...merged, ...rest];
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
    .map((s: any) => {
      const base = { name: String(s?.name ?? "").trim(), look: String(s?.look ?? s?.description ?? "").trim() };
      return { ...base, kind: (SUBJECT_KINDS as readonly string[]).includes(s?.kind) ? (s.kind as SubjectKind) : inferKind(base) };
    })
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
// Words that signal humans in a scene (used to decide when the figure rule and the reference image apply).
const PEOPLE = /\b(people|person|persons|human|humans|villagers?|crowd|crowds|knights?|kings?|queens?|princess|prince|men|man|women|woman|boys?|girls?|child|children|kids?|farmers?|soldiers?|merchants?|guards?|monks?|peasants?|workers?|doctors?|teachers?|students?|friends?|family|couple|pirates?|wizards?|baker|bakers|fisherman|fishermen|pescador|customers?|audience|passengers?|scientists?|pilots?|sailors?|townsfolk|citizens?)\b/i;

export function promptFor(show: SlideshowT, i: number, format: "landscape" | "vertical", anchorReady = true): string {
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
  const preset = show.preset ? PRESETS[show.preset] : null;
  const heroIn = Boolean(preset) && subjects.some((s) => s.name.toLowerCase() === preset!.hero.toLowerCase());
  // Humans other than the hero (named side characters, crowds, extras) must be built on the hero's figure too,
  // otherwise image generators draw them as realistic people. Detected from the scene's own words.
  const noPeople = /\bno (people|characters|figures|humans)\b/i.test(sc.prompt);
  const personIn = subjects.some((s) => (!preset || s.name !== preset.hero) && kindOf(s) === "person");
  const peopleIn = Boolean(preset) && !noPeople && (personIn || PEOPLE.test(sc.prompt));
  const anchored = anchorReady && (heroIn || peopleIn);
  return [
    anchored && heroIn ? `Use the attached reference image as the exact character model for ${preset!.hero}: ${preset!.copy} (ignore its background and sheet layout). Keep his body proportions identical in this image and draw any clothes or props over that body.` : "",
    anchored && !heroIn ? `Use the attached reference image as the exact model for how every person in this image is built (${preset!.copy}); ignore its background and sheet layout.` : "",
    sc.prompt.replace(/[.\s]+$/, "") + ".",
    subjects.length ? `Recurring subjects, keep them identical in every image: ${subjects.map((s) => `${s.name} is ${s.look.replace(/[.\s]+$/, "")}`).join("; ")}.` : "",
    style ? `Art direction (the same in every image, applied to the characters and the scenery together): ${style.replace(/[.\s]+$/, "")}.` : "",
    heroIn ? `Integrate ${preset!.hero} into the scene: ${preset!.blend}. Every other character, animal and object in the image uses the same rendering style and palette.` : "",
    preset && !noPeople ? `People rule: if any other humans appear (named side characters, crowds, extras), each one is a simplified stickman figure of this series built exactly like ${preset.hero} (${preset.copy}), differing only in clothes, headgear, props, size and age; never realistic human faces, skin tones, noses, ears or hair (a hat or helmet may cover the head), and never a different art style from the hero.` : "",
    vertical ? "Vertical 9:16 portrait composition (1080x1920)." : "Wide 16:9 landscape composition (1920x1080).",
    move[sc.camera] ?? "",
    "No text, letters, captions, logos, watermarks or borders in the image.",
  ].filter(Boolean).join(" ");
}

// Reminder printed above copied prompts: which style-anchor image to attach to the scenes that name the hero.
export function anchorNote(show: SlideshowT | null | undefined, anchorReady = true): string {
  if (!show?.preset) return "";
  const k = show.preset;
  return anchorReady
    ? `STYLE ANCHOR: attach ${anchorFile(k)} (assets/presets/${anchorFile(k)}, also copyable from the app) to every prompt below that starts with "Use the attached reference image".\n\n`
    : `NOTE: this look has no style anchor image yet. Generate its character sheet first (Style anchors page in the app) so ${PRESETS[k].hero} looks the same in every scene.\n\n`;
}

// Mistakes in a script that make secondary characters drift from the series' figure (or silently vanish).
// Returned as plain sentences for the writer or the user; none of them blocks anything.
export function lintSlideshow(show: SlideshowT): string[] {
  const out: string[] = [];
  const names = new Set([...effectiveSubjects(show).map((s) => s.name.toLowerCase())]);
  const ANATOMY = /\b(face|faces|skin|nose|ears?|hair|haired|beard|bearded|mustache|eyes?|eyebrows?|lips?|realistic|human|handsome|beautiful|wrinkle\w*|muscular|freckle\w*|tan|pale|complexion)\b/i;
  for (const s of show.subjects) {
    if (show.preset && kindOf(s) === "person" && ANATOMY.test(s.look)) {
      out.push(`${s.name}: describe outfit and props only. Its body, face and rendering come from ${PRESETS[show.preset].hero}'s figure, so words like "${ANATOMY.exec(s.look)![0]}" pull the image toward a realistic human. (If ${s.name} is not a person, set its kind to "creature" or "thing".)`);
    }
  }
  show.scenes.forEach((sc, i) => {
    for (const n of sc.subjects) if (!names.has(n.toLowerCase())) out.push(`Scene ${i + 1} lists "${n}" but no subject with that name is defined, so it is ignored in the image prompt.`);
  });
  if (show.preset) {
    const hero = PRESETS[show.preset].hero.toLowerCase();
    show.scenes.forEach((sc, i) => {
      const humanSubject = sc.subjects.some((n) => n.toLowerCase() !== hero && kindOf(show.subjects.find((s) => s.name.toLowerCase() === n.toLowerCase()) ?? { name: n, look: "" }) === "person");
      if (!humanSubject && !sc.subjects.some((n) => n.toLowerCase() === hero) && /\b(a|the|three|two|four|five|many|several|some)\s+(\w+\s+)?(man|woman|boy|girl|king|queen|knight|knights|guard|guards|farmer|farmers|villagers?|soldiers?|crowd)\b/i.test(sc.prompt)) {
        out.push(`Scene ${i + 1} shows people without naming them in subjects. They will still follow the series' figure, but listing them (by outfit) keeps them identical across scenes.`);
      }
    });
  }
  return out;
}
