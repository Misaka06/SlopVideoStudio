// Style presets for image slideshows: which anchor images (hero character sheets) exist, and
// saving the ones people generate. Everything about a look itself lives in src/slides.ts.

import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { anchorFile, anchorPrompt, anchorUrl, PRESETS, presetKeys, testPrompts, type PresetKey } from "../src/slides";
import { ROOT } from "./store";

export const PRESET_DIR = join(ROOT, "assets", "presets");
mkdirSync(PRESET_DIR, { recursive: true });

export const isPreset = (k: string): k is PresetKey => Object.hasOwn(PRESETS, k);
const fileFor = (k: PresetKey) => join(PRESET_DIR, anchorFile(k));
export const anchorReady = (k: PresetKey | "" | undefined) => Boolean(k) && existsSync(fileFor(k as PresetKey));

export type PresetEntry = {
  key: PresetKey;
  label: string;
  blurb: string;
  hero: string;
  style: string;
  look: string;
  anchorPrompt: string; // the character-sheet prompt to generate the anchor
  anchorFile: string;
  anchorUrl: string | null; // null until the anchor image exists
  tests: { label: string; prompt: string }[]; // sample scene prompts to judge the look
};

export function list(): PresetEntry[] {
  return presetKeys.map((key) => {
    const ready = anchorReady(key);
    return {
      key,
      label: PRESETS[key].label,
      blurb: PRESETS[key].blurb,
      hero: PRESETS[key].hero,
      style: PRESETS[key].style,
      look: PRESETS[key].look,
      anchorPrompt: anchorPrompt(key),
      anchorFile: anchorFile(key),
      // The ?v= stamp makes a replaced image show up immediately.
      anchorUrl: ready ? `${anchorUrl(key)}?v=${Math.round(statSync(fileFor(key)).mtimeMs)}` : null,
      tests: testPrompts(key, ready),
    };
  });
}

export async function saveAnchor(key: string, data: Buffer): Promise<PresetEntry> {
  if (!isPreset(key)) throw new Error(`Unknown look "${key}" (use ${presetKeys.join(", ")})`);
  try {
    await sharp(data).rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toFile(fileFor(key));
  } catch {
    throw new Error("That file is not a readable image (use PNG, JPG or WEBP)");
  }
  return list().find((p) => p.key === key)!;
}
