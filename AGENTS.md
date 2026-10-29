# AGENTS.md: how to make videos with Animator Studio

You are an AI agent picking up this repo. Goal: produce narrated 2D sticker-style stick-figure videos
("What if…?" explainers) for YouTube (16:9) and Shorts (9:16). Read this file first; `README.md` has user-facing detail.

## 1. One-time setup

Requirements: Node 20+, Python 3.10+ with `kokoro-onnx` and `soundfile`, ffmpeg available to Remotion (it downloads its own on first render).

```bash
npm install
pip install kokoro-onnx soundfile
```

Voice model: Kokoro ONNX files go in `models/` (git-ignored, ~350 MB). Required files: `models/kokoro-v1.0.onnx` and `models/voices-v1.0.bin`
(download from the kokoro-onnx GitHub releases page before the first render).

Env vars (all optional). No API key is needed: you, the LLM, write the scripts.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | App port |
| `PYTHON` | `python` | Python binary with kokoro installed |
| `ANIMATOR_URL` | `http://localhost:4000` | Where the MCP server finds the app |


## 2. Run it

```bash
npm run app        # builds the UI, starts server on :4000 (REST API + web app + job queue)
npm run studio     # optional: Remotion Studio on :3000 for visual debugging of src/
npm run typecheck  # run after any code change
```

The MCP server (`mcp/server.ts`, registered in `.mcp.json`) is a thin client over the app's HTTP API.
**The app must be running** before MCP tools work.

## 3. Making a video: the workflow

You write the script; the app voices and renders it.

### A. Via MCP tools
1. `script_guide` returns the house rules for good scripts plus the custom props and characters in the library. Read it first.
2. Write an episode object (schema below) and call `produce_from_script { episode, format, language, voice }`. It returns an id.
3. `video_status` until `done` (it prints the MP4 path: `projects/<id>/video.mp4`).
4. Fix problems with `get_script` then `edit_scene` (re-renders automatically), or `render_video`.
For many videos, queue several episodes in a row and poll once; rendering is sequential.

### B. Without MCP (REST)
`POST http://localhost:4000/api/projects` with `{ "episode": {...}, "settings": {"format":"landscape","lang":"en-us","voice":"am_michael"} }`,
then `GET /api/projects` for status. `GET /api/script-guide` returns the writing rules.

### B2. Image slideshow videos (images + camera moves + transitions + narration)
Use when the user wants a documentary/explainer made from generated pictures instead of stick figures.
1. `slideshow_guide` returns the rules, JSON shape, voices and music files. You decide structure, camera, transitions, voice, music.
   Use `preset: "stickman"` (white stickman comic: app supplies the art style and the fixed hero "Stickman"; list him in a scene's `subjects`) for story/"what if" videos, or omit it and write your own `style`.
2. `produce_slideshow { slideshow, format?, language?, voice? }` records the narration and **returns one image prompt per scene**.
   Give those prompts to the user verbatim (they generate the images; file names `slide-01.png` ...).
3. When the images exist: `import_slide_images { id, file_paths }` (scene order), then `render_video { id }`.
   `render_video` refuses while any scene lacks an image (`with_placeholders: true` overrides). `slide_prompts` re-lists prompts (`only_missing`).
4. `get_script` / `edit_scene` also work on slideshows (changed `prompt` text changes the derived image prompt; changed narration re-voices).
REST: `POST /api/slideshows`, `GET /api/slideshow-guide`, `GET /api/projects/:id/slide-prompts`, `PUT /api/projects/:id/slides/:n/image`,
`POST /api/projects/:id/slides/:n/import`. Schema/types: `src/slides.ts`; composition: `src/Slideshow.tsx`; prompts, guide, images: `core/slideshow.ts`.
Check visuals with `npm run stills -- examples/medieval-day.json stills/ landscape [imagesDir]`.

### C. Upgrade the visuals (optional, reuses across all videos)
- Backgrounds: `background_prompts` returns image prompts; generate at 16:9, then `import_background { key, file_path }`.
- Props: `create_prop` (new) or `prop_prompts` (missing built-ins); generate on the **solid #00FF00 green** background;
  `import_prop`. For many props at once: `prop_sheet_prompt` then `import_prop_sheet` (keys in reading order).
  Then `place_prop` into a scene and `render_video`.
- Characters: `character_prompt` then `import_character { name, file_path }`. Reuse the same cast `name` in scripts
  (`list_characters` shows what exists). Art lives in `assets/characters/<name>/`.

## 4. Episode format (authoritative source: `src/schema.ts`)

```jsonc
{
  "title": "What if the moon disappeared?",
  "cast": [{ "name": "Max", "color": "#d9472b", "accent": "#3fb7ff", "outfit": "hoodie", "body": "normal",
             "hair": "spiky", "hairColor": "#3b2618", "hat": "none", "accessory": "none", "tie": false, "scale": 1 }],
  "scenes": [{
    "narration": "1-3 sentences, 5-12 seconds aloud.",
    "bg": "lake", "time": "night", "camera": "zoomIn", "transition": "fade", "effect": "sparkles",
    "label": "", "hud": "",
    "set": [{ "kind": "tree", "x": 0.8 }],
    "chars": [{ "name": "Max", "x": 0.4, "pose": "think", "face": "confused", "facing": "right",
                "action": "none", "holds": "none", "emote": "question", "talking": true }]
  }]
}
```

Every enum (backgrounds, poses, faces, props, cameras, transitions, effects) is listed in `src/schema.ts`; unknown values
are silently replaced by safe defaults, so check spelling. A working sample is `examples/time-loop.json`.

Script craft rules that make better videos:
- Hook in scene 1 (a bold claim or question). 8-12 scenes for ~90 s; 3-6 for Shorts.
- Vary `bg`, `camera`, `pose`, `face` between scenes; use `effect` and `emote` for punchlines.
- `x` is 0 (left) to 1 (right); keep two characters apart (e.g. 0.3 and 0.7). Set `talking: true` on the speaker only.
- Reuse cast names across a series so illustrated art in `assets/characters/` applies.
- Spanish: `language: "es"` (voice defaults to `em_alex`).

## 5. Repo map

| Path | What |
|---|---|
| `src/` | The video itself (Remotion): `schema.ts`, `Episode.tsx`, `character/` rig, `world/` backgrounds and set pieces; image slideshows: `slides.ts` (schema, prompt builder), `Slideshow.tsx` |
| `core/` | Storage, job queue (`jobs.ts`), script guide + normalizer, Kokoro voice, renderer, background/prop/character libraries |
| `server/index.ts` | REST API + serves the web UI |
| `web/` | App UI (React + Vite) |
| `mcp/server.ts` | MCP tools (the main agent interface) |
| `scripts/stills.ts` | `npm run stills -- ep.json stills/` writes one PNG per scene for quick checks |
| `core/generate_all_props.ts` | Generates the built-in prop images as SVG then PNG (sharp) |
| `assets/` | `backgrounds/`, `props/` (+`library.json`), `characters/`, `music/` (drop .mp3 here) |
| `projects/` | Generated output per video (git-ignored): script, audio, `video.mp4` |
| `models/` | Kokoro voice model (git-ignored) |

## 6. Extending the engine

To add a pose, background, prop or effect: add the name to the list in `src/schema.ts`, draw it in
`src/character/Figure.tsx`, `src/world/Backgrounds.tsx`, `src/world/SetPieces.tsx`, `src/character/Held.tsx` or `src/Episode.tsx`,
then run `npm run typecheck` and check with `npm run stills`. Scripts can only use what the schema lists.

## 7. Pitfalls

- MCP tool errors saying "app is not running": start `npm run app`.
- Narration and rendering are sequential and slow (minutes per video). Queue in batches and poll rather than blocking.
- `edit_scene` keeps existing voice-over if narration is unchanged, so visual edits re-render quickly.
- Generated images must be on pure `#00FF00` with no green in the art, or the cut-out will have holes.
- Keep assets original or properly licensed before publishing videos (music, generated images).
- Don't commit `projects/`, `models/`, `node_modules/`, `dist/`, or secrets.
