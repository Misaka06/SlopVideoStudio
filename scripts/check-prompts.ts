// Guard for the slideshow looks: secondary characters must never drift from the series' figure.
// Builds sample scripts for every preset and checks the image prompts they produce.
// Usage: npm run check   (also runs the typecheck)

import { inferKind, kindOf, lintSlideshow, normalizeSlideshow, presetKeys, PRESETS, promptFor, testPrompts, effectiveSubjects, type PresetKey, type SlideshowT } from "../src/slides";

let failures = 0;
const check = (ok: boolean, what: string) => {
  if (!ok) {
    failures++;
    console.error(`FAIL  ${what}`);
  }
};

const script = (preset: PresetKey): SlideshowT =>
  normalizeSlideshow({
    title: "check",
    preset,
    subjects: [
      { name: "Guards", look: "wearing crumpled silver foil armor and a helmet with a small plume" },
      { name: "Hound", look: "a shaggy grey dog with floppy ears and a stub tail" },
      { name: "Mara", look: "wearing a long red scarf", kind: "person" },
    ],
    scenes: [
      { narration: "a", prompt: `${PRESETS[preset].hero} walking down a road at dawn`, subjects: [PRESETS[preset].hero] },
      { narration: "b", prompt: "Guards running away from a cloud of dust", subjects: ["Guards"] },
      { narration: "c", prompt: "A crowd of villagers cheering in a square", subjects: [] },
      { narration: "d", prompt: "Hound sleeping by a fire", subjects: ["Hound"] },
      { narration: "e", prompt: "A wide empty valley at dusk, no people", subjects: [] },
      { narration: "f", prompt: "Mara waving from a window", subjects: ["Mara"] },
    ],
  });

for (const k of presetKeys) {
  const p = PRESETS[k];
  const show = script(k);
  const at = (i: number, anchor = true) => promptFor(show, i, "landscape", anchor);
  const tag = (s: string) => `[${k}] ${s}`;

  // hero scene: reference, integration, figure rule
  check(at(0).startsWith("Use the attached reference image as the exact character model"), tag("hero scene starts with the reference line"));
  check(at(0).includes(`Integrate ${p.hero}`), tag("hero scene integrates the hero into the scenery"));
  check(at(0).includes("People rule"), tag("hero scene carries the figure rule for other humans"));

  // named side characters are built on the hero's figure
  const guards = effectiveSubjects(show).find((s) => s.name === "Guards")!;
  check(guards.look.includes(`built exactly like ${p.hero}`) && guards.look.includes(p.copy), tag("named person subject is built on the hero's figure"));
  check(at(1).startsWith("Use the attached reference image as the exact model for how every person"), tag("side-character scene attaches the anchor"));
  check(at(1).includes("never realistic anatomy"), tag("side-character scene forbids realistic anatomy"));
  check(effectiveSubjects(show).find((s) => s.name === "Mara")!.look.includes(`built exactly like ${p.hero}`), tag("explicit person kind is built on the figure"));

  // crowds with no named subject
  check(at(2).startsWith("Use the attached reference image") && at(2).includes("People rule"), tag("unnamed crowd gets the anchor and the figure rule"));

  // creatures are not turned into figures and do not pull the anchor in
  check(kindOf(show.subjects.find((s) => s.name === "Hound")!) === "creature", tag("a dog is inferred as a creature"));
  check(!effectiveSubjects(show).find((s) => s.name === "Hound")!.look.includes("built exactly like"), tag("creature description is left as written"));
  check(!at(3).startsWith("Use the attached reference image"), tag("creature-only scene does not attach the anchor"));

  // explicit "no people" scenery
  check(!at(4).includes("People rule") && !at(4).startsWith("Use the attached"), tag("scenery marked no-people has no figure rule or anchor"));

  // anchor not generated yet: no reference line, but the figure rule still holds
  check(!at(1, false).includes("attached reference") && at(1, false).includes("People rule") && at(1, false).includes("built exactly like"), tag("without an anchor image the text rules still apply"));

  // built-in test prompts follow the same rules
  const [hero, scenery] = testPrompts(k, true);
  check(hero.prompt.includes("Integrate") && !scenery.prompt.includes("Integrate"), tag("test prompts: hero scene integrates, scenery does not"));
}

// kinds
check(inferKind({ name: "Dragon", look: "x" }) === "creature", "Dragon is a creature");
check(inferKind({ name: "Knights", look: "wearing armor" }) === "person", "Knights are people");
check(inferKind({ name: "Time machine", look: "x" }) === "thing", "a machine is a thing");

// lint: anatomy words on a person, unknown subject names
const bad = normalizeSlideshow({
  title: "x",
  preset: "papercut",
  subjects: [{ name: "Knight", look: "a tall man with pale skin, a big nose and a gray beard in armor", kind: "person" }],
  scenes: [{ narration: "a", prompt: "p", subjects: ["Knight", "Ghostly Figure"] }],
});
const warnings = lintSlideshow(bad);
check(warnings.some((w) => w.includes("Knight") && w.includes("outfit and props only")), "lint flags anatomy words on a person subject");
check(warnings.some((w) => w.includes("Ghostly Figure")), "lint flags a scene subject that is not defined");
const good = normalizeSlideshow({ title: "x", preset: "papercut", subjects: [{ name: "Knight", look: "wearing foil armor and a plumed helmet" }], scenes: [{ narration: "a", prompt: "p", subjects: ["Knight", "Paperling"] }] });
check(lintSlideshow(good).length === 0, "lint is quiet for a well-formed script");

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log(`prompt checks passed for ${presetKeys.length} looks`);
