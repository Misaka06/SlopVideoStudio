# Animator Studio

Mass-produces narrated 2D stick-figure "What if…?" videos for YouTube and Shorts.

```
your LLM ──▶ script (JSON) ──Kokoro (local, free)──▶ narration ──Remotion renderer──▶ MP4
(via MCP)                                                              16:9 or 9:16
```

> Working as an AI agent? Read [AGENTS.md](AGENTS.md) first.

## Dependencies

| Dependency | Needed for | Notes |
|---|---|---|
| Node.js 20+ and npm | Everything | `npm install` pulls the rest |
| Python 3.10+ | Narration | Runs the local Kokoro voice model |
| `kokoro-onnx`, `soundfile` (pip) | Narration | `pip install kokoro-onnx soundfile` |
| Kokoro model files (~350 MB) | Narration | Put `kokoro-v1.0.onnx` and `voices-v1.0.bin` in `models/` (from the [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases)). Git-ignored. |
| Chromium + ffmpeg | Rendering | Remotion downloads these itself on the first render |
| An LLM session | Writing scripts | Claude Code, Claude Desktop or any MCP client, or any chat model you paste scripts from. No API key is used by this project. |

Main npm packages: [Remotion](https://www.remotion.dev) (video rendering), React + Vite (web app), Express (API),
`@modelcontextprotocol/sdk` (MCP server), `sharp` (image cut-outs), `zod` (script schema).

## Install and start

```bash
npm install
pip install kokoro-onnx soundfile
npm run app
```

Open http://localhost:4000. Videos are written to `projects/<id>/video.mp4`.

## Using it with an LLM

The app has no built-in language model and needs no API key. **Your LLM session writes the scripts**; the app voices and renders them.

**1. MCP (recommended).** Start the app, then connect any MCP client:

- *Claude Code*: run it inside this folder. It picks up `.mcp.json` automatically.
- *Claude Desktop*: add the server below to its config (Settings → Developer → Edit config), then restart it.
- *Other clients*: run `npx tsx mcp/server.ts` over stdio. If the app is not on port 4000, set `ANIMATOR_URL`.

```json
{
  "mcpServers": {
    "youtube-animator": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/youtube-animator/mcp/server.ts"]
    }
  }
}
```

Then ask: *"Make a 60-second video about what if the moon disappeared."* The model calls `script_guide` for the writing
rules and the current library, writes the episode JSON, and sends it with `produce_from_script`. Then it polls
`video_status` until the MP4 is ready. For 100 videos it repeats this per topic; replies are one line each, so it stays cheap.

**2. Paste a script from any chat LLM.** Ask ChatGPT, Gemini, Claude or a local model to write an episode in the JSON format
in `src/schema.ts` (see `examples/time-loop.json`), then paste it in the app under **New video**.
Unknown values are replaced with safe defaults, so imperfect output still renders.

Tools: `script_guide`, `produce_from_script`, `video_status`, `get_script`, `edit_scene`, `render_video`,
`background_prompts`, `import_background`, `create_prop`, `prop_prompts`, `import_prop`, `prop_sheet_prompt`,
`import_prop_sheet`, `place_prop`, `character_prompt`, `import_character`, `list_characters`, `list_props`.
Models that can generate images can also build the background, prop and character libraries themselves
(prompt tool → generate → import tool). Full agent workflow: [AGENTS.md](AGENTS.md).

## Image slideshow videos

A second video type: a narrated documentary-style video made only of **images, slow camera moves, transitions,
captions and music** (like "What did people REALLY do all day in the Middle Ages?"). The model decides the scene
structure, camera move, transition, voice and music per video; **you generate the images** from copy-paste prompts.

1. **Script.** Ask your MCP assistant for a slideshow (`slideshow_guide` → `produce_slideshow`), or open **New videos →
   Image slideshow**, press *Copy brief for my AI chat*, paste the reply's JSON back and press *Create slideshow*
   (sample: `examples/medieval-day.json`). The narration is recorded straight away. Pick a **Look**: *White stickman comic*
   (a built-in art direction plus a fixed round-headed stickman hero, so every image matches: thick ink outlines, dark
   detailed scenes) or a free style the AI invents. In JSON: `"preset": "stickman"`.
2. **Images.** The project page lists one prompt per scene (the shared art style and the recurring characters' looks
   are woven in, with the aspect ratio and a composition hint for the camera move). *Copy prompt* / *Copy all prompts*,
   generate in any image tool, then **paste with Ctrl+V** (copy the image, press Ctrl+V on the page: it fills the highlighted
   scene, then moves to the next empty one; several copied files at once work too), or drop the pictures on the cards, or all at once (files named `1.png`, `slide-02.jpg`
   go to that scene, others fill the scenes in file-name order). Through MCP: `slide_prompts`, `import_slide_images`.
3. **Render.** Once every scene has an image (`render_video` / *Render video*). Scenes get a Ken Burns move (zoom, pan,
   push-in, aimable with `focus`), a transition (crossfade, dip, slide, wipe, zoom, flash, blur), optional lower-third
   label, and bold or subtle word-synced captions. Voice, speed, music, volume and captions can be changed afterwards.

Scripts, prompts and settings stay editable in the app; changing only visuals re-renders without re-recording the voice.

## The app

- **New video**: paste a script, then choose 16:9 or 9:16, language (English/Spanish), voice, speed and music.
- **Project page**: live preview player; edit every scene (narration, background, camera, transition, effect,
  characters, poses, faces, actions, props, name plate, counter) and the cast. Save, then Voice + render.
- **Queue**: narration and rendering run one at a time. The sidebar shows progress.

Background music: drop .mp3 files in `assets/music/` and pick them in the form.

## The look

Characters and props are **stickers**: chibi proportions, one consistent ink outline, a white cut-out border
and a soft drop shadow, big glossy eyes in each character's accent color. They pop in like stickers being
slapped down, on top of a slightly soft, grainy backdrop. Props are held with a natural grip for each item
and stay upright (bags hang, books sit at the chest, a fishing rod points out over the water).

What you can set:

- **Cast** (once per episode): outfit (jacket, suit, hoodie, tshirt, dress, labcoat, uniform, armor, sweater,
  overalls), body (slim, normal, broad, round), hair style and color, hat (14), accessory (glasses, sunglasses,
  monocle, mustache, beard, eyepatch, headphones, scarf, cape, mask, bowtie), main and accent colors, size.
- **Per scene**: 32 backgrounds, time of day (day/sunset/night), camera (incl. closeUp, pushIn, dutch),
  transition (cut, fade, wipe, zoom, slide, iris, flash), effect (rain, snow, confetti, sparkles, hearts,
  moneyRain, speedLines, fog, embers, shake, flash, glitch), 28 set pieces, name plate, counter.
- **Per character in a scene**: 12 poses, 12 faces, 10 emote bubbles, 8 actions (walk in/out, jump, bounce,
  tremble, spin, float), 24 held props, talking.

Quick check without voice or a full render: `npm run stills -- my-episode.json stills/` writes one PNG per scene.

## Image backgrounds (optional, higher quality)

Every background + time of day (e.g. `lake-sunset`) can use an illustrated image instead of the drawn one.
The app writes the prompt for you, always with the same art direction (flat, rounded, soft pastel, paper grain,
empty floor strip at the bottom, no people or text), so images from any generator match the sticker characters.

1. Open a video → **Image backgrounds**, or the **Background library** page for all 96.
2. **Copy prompt** → generate it at 16:9 (1920×1080 or larger) in any image tool.
3. Drop the image on its card. It's stored in `assets/backgrounds/` and reused by every video.
4. **Re-render**. Backgrounds without an image keep the drawn version; untick "use images" to turn it off per video.

Images get a light blur and grain in the video so the sticker characters pop in front of them.
With MCP, an agent that can generate images can do this itself: `background_prompts` → generate → `import_background`.

## Settings (environment variables)

| Variable | Default | |
|---|---|---|
| `PORT` | `4000` | App port |
| `PYTHON` | `python` | Python with `kokoro-onnx` and `soundfile` installed |

## Code map

- `src/`: the video itself (schema, character rig, backgrounds, layout). Shared by the renderer and the app's preview.
- `core/`: storage, job queue, script guide, voice, renderer.
- `server/`: REST API + serves the app. `web/`: the app UI. `mcp/`: the MCP server.
- `voice/kokoro_tts.py` + `models/`: the local voice model (downloaded, ~350 MB).

To add a pose, background, prop or effect: add it to the list in `src/schema.ts` and draw it in
`src/StickFigure.tsx`, `src/Backgrounds.tsx` or `src/Episode.tsx`. Scripts can only use what the schema lists.
