// Script guidance for the LLM that writes episodes (served to it by the MCP script_guide tool),
// plus the normalizer that makes any script renderable.

import { HELD, normalizeEpisode, SET_PIECES, type EpisodeT } from "../src/schema";
import { names as characterNames } from "./characters";
import { customProps } from "./props";

const GUIDE = `You write narrated "What if...?" stick-figure animation episodes for YouTube.
Narration: second person ("you wake up..."), punchy, dark-funny, escalating stakes, a twist at the end. Each scene's narration is 1-3 short sentences.
World: clean sticker-style chibi figures (round black head, big eyes, rounded body) on soft illustrated backgrounds. The look is simple and premium: less is more.
Cast (defined once, reused in every scene):
- Each character is recognizable by ONE strong idea: a main color plus at most one signature item (hair OR hat OR accessory). Accessory "none" for most. Protagonist first. Children use scale 0.6, same colors as their adult self.
- Pick a clear accent color per character (eyes and details) that contrasts with the main color.
Scenes:
- chars: 1-3. Names must match cast. x is 0..1; keep at least 0.3 apart. Characters on the left face right, on the right face left.
- Every prop must make sense in the narration and the place. holds is held in the hand automatically with a natural grip (bags hang at the side, books at the chest, a fishing rod points out over water). Use holds only when the narration involves the object; otherwise "none".
- Pair poses with intent: point at someone being talked about, shrug for "so what", facepalm for regret, sit for resting/fishing/waiting, armsUp or celebrate for wins (raises trophy/flag/moneyBag if held).
- set: 0-2 pieces that dress the place (podium on a stage or at the capitol, desk in an office, fire at a campsite). Don't repeat a piece the background already has.
- action: walkIn when someone arrives, walkOut when they leave, jump/bounce for joy, tremble for fear, float for magic, spin for confusion; "none" most of the time.
- emote: only on 2-3 key beats per episode (exclaim on surprises, question when confused, idea on plans).
- talking=true only for a character whose spoken line is in the narration.
- Reuse a small set of backgrounds (3-6 per episode) with fitting time of day; each new bg+time pair needs its own illustration.
- Camera: mostly static/zoomIn/pan; closeUp for emotional lines, pushIn for reveals, dutch for tension. Transitions mostly "cut" or "fade". Effects are rare accents.
- hud: a running counter if the story has one (e.g. "LIVES: 3"), else "". label: name plate for important people on their first appearance, else "".`;

export function scriptGuide() {
  return GUIDE + customPropList();
}

// Custom props from the library the script may use (only ones that have an image), and
// recurring characters that already have illustrated outfits.
function customPropList() {
  const ready = customProps().filter((p) => p.aspect);
  const props = ready.length
    ? `\nCustom props you may also use (only when the story calls for them):\n${ready.map((p) => `- ${p.id} (${p.kind === "set" ? "set piece" : "held"}): ${p.name}`).join("\n")}`
    : "";
  const cast = characterNames();
  const people = cast.length ? `\nRecurring characters with illustrated art (reuse these exact names when one fits the story, e.g. as the protagonist): ${cast.join(", ")}` : "";
  return props + people;
}

// Fill defaults, clamp positions, and drop characters missing from the cast and props
// that have neither a drawing nor a library entry, so a sloppy (or older) script renders.
export function fixEpisode(raw: unknown): EpisodeT {
  const ep = normalizeEpisode(raw);
  const names = new Set(ep.cast.map((c) => c.name));
  const custom = new Map(customProps().map((p) => [p.id, p.kind]));
  const okSet = (k: string) => (SET_PIECES as readonly string[]).includes(k) || custom.get(k) === "set";
  const okHeld = (k: string) => k === "none" || (HELD as readonly string[]).includes(k) || custom.get(k) === "held";
  return {
    ...ep,
    scenes: ep.scenes.map((s) => ({
      ...s,
      set: s.set.filter((p) => okSet(p.kind)),
      chars: s.chars.filter((c) => names.has(c.name)).map((c) => (okHeld(c.holds) ? c : { ...c, holds: "none" })),
    })),
  };
}
