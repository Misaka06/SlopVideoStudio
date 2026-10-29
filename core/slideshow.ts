// Image slideshow videos: the writing guide for the LLM, the copy-paste image prompts the
// app derives from a script, the images people bring back, and the render timeline.

import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { draftSlideTimeline, INTENSITIES, anchorNote, normalizeSlideshow, PRESETS, presetKeys, promptFor, SLIDE_CAMERAS, SLIDE_TRANSITIONS, type SlideshowT, type SlideTimeline } from "../src/slides";
import { anchorReady } from "./presets";
import { projectDir, ROOT, type Project, type Settings } from "./store";
import { VOICES } from "./voice";

const MUSIC_DIR = join(ROOT, "assets", "music");

export const musicFiles = () => (existsSync(MUSIC_DIR) ? readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f)) : []);

const EXAMPLE = `{
  "title": "What did people REALLY do all day in the Middle Ages?",
  "preset": "stickman",
  "style": "",
  "subjects": [
    { "name": "Stickman", "look": "wearing a worn olive tunic with a rope belt and a straw hat" },
    { "name": "Cow", "look": "a stocky red-brown cow with a white muzzle, small horns and a patient face" }
  ],
  "settings": { "format": "landscape", "language": "en-us", "voice": "bm_george", "speed": 1.0, "music": null, "captions": "bold" },
  "scenes": [
    { "narration": "Imagine waking up in 1300 inside a freezing barn, sharing the room with your cow. That was the luxury version.",
      "prompt": "Stickman lying on a bed of straw under a patched brown blanket, shivering with a worried face, breath fogging, a dying campfire ring of stones glowing beside him, a cow watching from a wooden pen in the dark stone barn",
      "subjects": ["Stickman", "Cow"], "camera": "zoomIn", "intensity": "subtle", "focus": [0.2, 0.7], "transition": "crossfade", "label": "England, 1300" },
    { "narration": "Before sunrise your whole family is already up, because daylight is the only light you can afford.",
      "prompt": "Wide shot of a misty medieval village at dawn, thatched cottages with chimney smoke, tiny stickman villagers walking toward golden fields",
      "subjects": ["Stickman"], "camera": "panRight", "intensity": "normal", "focus": null, "transition": "cut", "label": "" }
  ]
}`;

const GUIDE = `You write narrated image-slideshow videos for YouTube and Shorts (documentary / explainer style, for example "What did people REALLY do all day in the Middle Ages?").
The finished video is only: one still image per scene + a slow camera move + a transition into the scene + a voice-over (+ music and captions). Nothing is animated, so your script carries everything.
The app voices the narration, derives one copy-paste image prompt per scene from your script, and the user generates those images in any image tool and drops them in. Then the app renders the video.
Reply with ONE JSON object (shape below), nothing else.

STRUCTURE
- Scene 1 is a hook: a bold claim or a question that makes people stay, in the first 5 seconds.
- About 10-16 scenes for a 2-minute video (Shorts: 4-8 scenes). One idea per scene. Build: hook, setup, escalation, surprise, payoff or call to action.
- Narration per scene: 1-3 spoken sentences, 15-35 words (5-12 seconds). Plain spoken text only: no stage directions, markdown, emojis or parentheses; spell out symbols and abbreviations ("percent", "and"). Write for the ear: short sentences, concrete details, second person ("you") when it fits.
- Narration is in the video's language (settings.language). Image prompts are ALWAYS written in English.

IMAGE PROMPTS (the part the user copies into an image generator)
- style (free style only, see PRESETS): write ONE art-direction paragraph once (medium, palette, lighting, texture, lens or camera feel). The app appends it to every prompt so all images match. Make it specific and consistent with the topic.
- subjects: every person, creature or object that recurs gets a name and a precise fixed visual description (age, clothes, colors, hair, build). List the names in a scene's subjects and the app repeats the description in that prompt, so the character looks the same in every image.
- prompt (per scene): describe ONLY what the picture shows: who or what, what they are doing, where, light, shot type. Concrete and visual, never abstract ("a farmer bent over a field at dawn", not "the hardship of labor"). One clear focal point. Do not repeat the style words and do not ask for text, captions or logos in the image.
- Vary the shot: wide establishing, medium, close-up, overhead, detail of hands or objects. Do not make 5 similar images in a row.
- Compose for the camera move: pans need an extra-wide scene with interest spread across the frame, zooms need a clear subject (aim with focus), pushIn needs a reveal at the focal point.

CAMERA (every scene gets one move; the image is always slowly moving unless "still")
- zoomIn: default, draws attention to a subject (aim it with focus [x, y], 0..1 from the top-left; e.g. a face at [0.5, 0.35]). zoomOut: reveals context or scale.
- panLeft / panRight: camera travels toward the left / right side of a wide scene, crowds, timelines. panUp: towers, sky, growth. panDown: reveal the ground or a consequence.
- pushIn: a fast dramatic push for a reveal or shock. still: rare, for text-heavy or stunned beats.
- intensity: subtle (calm, long scenes), normal, strong (drama). Never use the same camera 3 scenes in a row.

TRANSITIONS (how this scene ARRIVES; scene 1's is ignored)
- crossfade: smooth default for continuous flow. cut: quick lists and fast beats. dip: dip to black for a time jump or chapter change. slideLeft / slideRight: next-vs-previous, comparisons. wipe: contrast. zoom: going deeper or inside. flash: a shock or punchline. blur: dreams, memories, flashbacks.
- Mostly 2 types, with a different one as an occasional accent.

{{PRESETS}}

OTHER FIELDS
- label: short lower-third text for a place, date or name on key scenes (e.g. "London, 1348"), else "".
- settings (optional, you choose what suits the topic): format landscape (16:9) or vertical (9:16 Shorts); language en-us, en-gb or es; voice (ids below); speed 0.9-1.15; music (a filename from the list below, or null); musicVolume 0.08-0.2; captions bold, subtle or none.
- A scene may have its own "voice" id (rare: a quotation or a second speaker). Otherwise leave it out.

JSON SHAPE (title, preset, style, subjects [name, look, kind], settings, scenes; scene = narration, prompt, subjects, camera, intensity, focus, transition, label, voice)
${EXAMPLE}`;

// The presets section of the guide is generated from the preset definitions, so new looks show up by themselves.
function presetGuide() {
  const list = presetKeys.map((k) => `- "${k}": ${PRESETS[k].label}. ${PRESETS[k].blurb} Hero: ${PRESETS[k].hero}.`).join("\n");
  return `PRESETS (top-level "preset"; omit it for a free style)
Choose the preset that fits the topic and tone. The app then supplies the art direction for the WHOLE picture (characters, scenery, light, palette) and a fixed hero, so you do NOT write a style (leave "style" empty, or use it only for small topic tweaks such as palette, era or location) and you do NOT describe the hero's body.
${list}
With a preset:
- List the hero's name in a scene's subjects for every scene where he appears; skip it for pure scenery or object shots. In prompt say what he is doing and his expression ("shivering with a worried face", "grinning at a pile of gold"). He is the viewer's stand-in, so narrate in second person ("you").
- Optionally give him a signature outfit for the whole video: add a subject with the hero's name whose look is only the clothes, e.g. { "name": "<hero>", "look": "wearing a worn olive tunic with a rope belt and a straw hat" } (the app adds it to his fixed look; without it he keeps his default body). Keep that outfit the same in every scene unless the story changes it.
- Give every subject a "kind": "person", "creature" or "thing". Every person other than the hero (named side characters, crowds, extras) is automatically built on the hero's own figure, so define each recurring person by OUTFIT AND PROPS ONLY (e.g. "wearing crumpled silver foil armor and a helmet with a small plume"), never by face, skin, hair or anatomy (words like those are flagged as warnings). Creatures and things (kind "creature" / "thing", e.g. a dragon, a cow, a machine) are the exception: describe them fully, in the preset's materials and style. Environments and props follow the preset's art direction, so write them as plain objects and places.
- Preset heroes are drawn from a reference image, so keep each scene to one clear pose and expression per hero.`;
}

export function slideshowGuide() {
  const voices = Object.entries(VOICES).map(([lang, list]) => `${lang}: ${list.map((v) => `${v.id} (${v.label.replace(/^[^(]*\(|\)$/g, "")})`).join(", ")}`);
  const music = musicFiles();
  return `${GUIDE.replace("{{PRESETS}}", presetGuide())}

VOICES
${voices.join("\n")}

MUSIC FILES (settings.music)
${music.length ? music.join("\n") : "none available: use music: null"}

CAMERAS: ${SLIDE_CAMERAS.join(", ")} | INTENSITIES: ${INTENSITIES.join(", ")} | TRANSITIONS: ${SLIDE_TRANSITIONS.join(", ")}`;
}

// Normalize and drop choices the app can't honor (unknown voice or music file).
export function fixSlideshow(raw: unknown): SlideshowT {
  const show = normalizeSlideshow(raw);
  const voices = new Set(Object.values(VOICES).flatMap((l) => l.map((v) => v.id)));
  const settings = { ...show.settings };
  if (settings.voice && !voices.has(settings.voice)) delete settings.voice;
  if (settings.music && !musicFiles().includes(settings.music)) settings.music = null;
  return { ...show, settings, scenes: show.scenes.map((s) => (s.voice && !voices.has(s.voice) ? { ...s, voice: "" } : s)) };
}

// ---- image prompts

export type SlidePrompt = { n: number; file: string; narration: string; camera: string; prompt: string; image: string | null };

const slug = (i: number) => `slide-${String(i + 1).padStart(2, "0")}`;

export function promptList(p: Project): SlidePrompt[] {
  const show = p.slideshow;
  if (!show) return [];
  const images = slideImages(p.id, show.scenes.length);
  return show.scenes.map((sc, i) => ({ n: i + 1, file: slug(i), narration: sc.narration, camera: sc.camera, prompt: promptFor(show, i, p.settings.format, anchorReady(show.preset)), image: images[i] }));
}

// Every prompt in one copy-paste block, with the file name each image should have.
export function promptsText(p: Project): string {
  return anchorNote(p.slideshow, anchorReady(p.slideshow?.preset)) + promptList(p).map((x) => `SCENE ${x.n} (save as ${x.file}.png)\n${x.prompt}`).join("\n\n");
}

// ---- images (projects/<id>/images/slide-NN.jpg, converted on import)

const imagesDir = (id: string) => join(projectDir(id), "images");

export function slideImages(id: string, count: number): (string | null)[] {
  return Array.from({ length: count }, (_, i) => {
    const f = join(imagesDir(id), `${slug(i)}.jpg`);
    return existsSync(f) ? `/media/${id}/images/${slug(i)}.jpg?v=${Math.round(statSync(f).mtimeMs)}` : null;
  });
}

export async function saveImage(p: Project, n: number, data: Buffer) {
  const count = p.slideshow?.scenes.length ?? 0;
  if (!Number.isInteger(n) || n < 1 || n > count) throw new Error(`Scene ${n} does not exist (there are ${count})`);
  mkdirSync(imagesDir(p.id), { recursive: true });
  try {
    await sharp(data).rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toFile(join(imagesDir(p.id), `${slug(n - 1)}.jpg`));
  } catch {
    throw new Error("That file is not a readable image (use PNG, JPG or WEBP)");
  }
}

export function removeImage(p: Project, n: number) {
  rmSync(join(imagesDir(p.id), `${slug(n - 1)}.jpg`), { force: true });
}

export const missingImages = (p: Project) => slideImages(p.id, p.slideshow?.scenes.length ?? 0).flatMap((x, i) => (x ? [] : [i + 1]));

// ---- timeline

// The voiced timeline (or a draft with estimated timing) with current settings and images.
export function timelineFor(p: Project): SlideTimeline {
  const show = p.slideshow!;
  const s = p.settings;
  const images = slideImages(p.id, show.scenes.length);
  const opts = { format: s.format, music: s.music ? `/assets/music/${encodeURIComponent(s.music)}` : null, musicVolume: s.musicVolume, captions: s.captions };
  const voiced = p.slides && p.slides.scenes.length === show.scenes.length && p.slides.scenes.every((x) => x.audio);
  if (!voiced) return draftSlideTimeline(show, { ...opts, images });
  return { ...p.slides!, ...opts, scenes: p.slides!.scenes.map((x, i) => ({ ...x, image: images[i] })) };
}
