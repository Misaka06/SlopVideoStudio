import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Slideshow } from "../src/Slideshow";
import { FPS } from "../src/schema";
import { anchorNote, draftSlideTimeline, effectiveSubjects, kindOf, lintSlideshow, PRESETS, promptFor, SUBJECT_KINDS, slideFrames, slideTotalFrames, type SlidePreset, type SlideSceneT } from "../src/slides";
import example from "../examples/medieval-day.json";
import { AnchorCard, PresetPicker, usePresets } from "./Styles";
import { api, type Config, type PresetEntry, type Settings, type SlideshowT, type SlideshowView as ViewData, type Summary } from "./api";
import { Field, fmtTime, Progress, Sel, SettingsForm, StatusPill } from "./ui";

// ---------------------------------------------------------------- New slideshow

const LENGTHS = [
  { label: "YouTube Short (~45 s)", scenes: "4-6", format: "vertical" as const },
  { label: "Short video (~2 min)", scenes: "10-14", format: "landscape" as const },
  { label: "Medium video (~5 min)", scenes: "25-30", format: "landscape" as const },
  { label: "Long video (~10 min)", scenes: "50-60", format: "landscape" as const },
];

const copy = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

// The selected look's style anchor: copy it into the image generator, or add it first when missing.
const AnchorPanel: React.FC<{ preset: SlidePreset; presets: PresetEntry[] | null; reload: () => void }> = ({ preset, presets, reload }) => {
  const p = preset ? presets?.find((x) => x.key === preset) : null;
  return p ? <AnchorCard p={p} onChanged={reload} compact /> : null;
};

const PresetSelect: React.FC<{ value: SlidePreset; onChange: (p: SlidePreset) => void }> = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value as SlidePreset)}>
    {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    <option value="">Free style (the AI chooses)</option>
  </select>
);

export const SlideshowNewPanel: React.FC<{ config: Config; onCreated: (s: Summary) => void }> = ({ config, onCreated }) => {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState(1);
  const [lang, setLang] = useState<Settings["lang"]>("en-us");
  const [preset, setPreset] = useState<SlidePreset>("stickman");
  const { list: presets, reload: reloadPresets } = usePresets();
  const [scriptText, setScriptText] = useState("");
  const [override, setOverride] = useState(false);
  const [s, setS] = useState<Settings>(config.defaults);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(null), 2500);
  };

  // The brief for any chat model (or skip this when an MCP-connected assistant writes the script for you).
  const copyBrief = async () => {
    setErr(null);
    try {
      const { guide } = await api.slideshowGuide();
      const L = LENGTHS[length];
      const language = { "en-us": "English (US)", "en-gb": "English (UK)", es: "Spanish" }[lang];
      await copy(`${guide}\n\n---\nWrite the slideshow script now.\nTOPIC: ${topic.trim() || "(choose an interesting topic)"}\nNARRATION LANGUAGE: ${language} (settings.language "${lang}")\nFORMAT: ${L.format} | LENGTH: ${L.label}, about ${L.scenes} scenes\nLOOK: ${preset ? `preset "${preset}" (${PRESETS[preset].label}, hero ${PRESETS[preset].hero}); set "preset": "${preset}" in the JSON` : "free style (no preset); write your own style and subjects"}\nReply with only the JSON object.`);
      flash("Brief copied. Paste it into your AI chat, then paste its JSON reply below.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      // Fenced replies from a chat model (```json ... ```) are accepted as they are.
      const json = scriptText.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      const created = await api.createSlideshow({ slideshow: JSON.parse(json), settings: override ? s : {} });
      if (created.length) onCreated(created[0]);
    } catch (e) {
      setErr(e instanceof SyntaxError ? `That is not valid JSON: ${e.message}` : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel narrow">
      <h1>New image slideshow</h1>
      <p className="muted small">
        Narrated video made of images, slow camera moves and transitions. An AI writes the script (scenes, camera, transitions, voice, music); the app gives you one image prompt per scene to generate in any image tool,
        then voices and renders it. With the MCP server connected, just ask your assistant for a slideshow.
      </p>

      <h2 className="step">1 · Get a script</h2>
      <div className="grid settings">
        <Field label="Topic" wide>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What did people really do all day in the Middle Ages?" />
        </Field>
        <Field label="Length">
          <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
            {LENGTHS.map((l, i) => <option key={l.label} value={i}>{l.label}</option>)}
          </select>
        </Field>
        <Field label="Language">
          <select value={lang} onChange={(e) => setLang(e.target.value as Settings["lang"])}>
            <option value="en-us">English (US)</option>
            <option value="en-gb">English (UK)</option>
            <option value="es">Spanish</option>
          </select>
        </Field>
      </div>
      <label className="lbl">Look: pick the art style, hero and scenery</label>
      <PresetPicker value={preset} presets={presets} onChange={setPreset} />
      <AnchorPanel preset={preset} presets={presets} reload={reloadPresets} />
      <div className="actions">
        <button onClick={copyBrief}>Copy brief for my AI chat</button>
        {note && <span className="muted small">{note}</span>}
      </div>

      <h2 className="step">2 · Paste the script</h2>
      <label className="lbl">
        Slideshow script (JSON). <button className="link" onClick={() => setScriptText(JSON.stringify(example, null, 2))}>Load the example</button>
      </label>
      <textarea className="big mono" rows={12} value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder='{"title": "...", "style": "...", "subjects": [...], "settings": {...}, "scenes": [...]}' />

      <label className="check topgap">
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Override the voice, language, music and captions the script chose
      </label>
      {override && <SettingsForm config={config} s={s} setS={setS} slideshow />}

      {err && <div className="banner error">{err}</div>}
      <div className="actions">
        <button className="primary" disabled={busy || !scriptText.trim()} onClick={submit}>
          Create slideshow
        </button>
        <span className="muted small">The narration is recorded right away; you add the images next.</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Slideshow page

// Files dropped together: named like the scene (1.png, slide-02.jpg) go to that scene,
// otherwise they fill scenes in file-name order (from scene 1 when there is one per scene, else the first gaps).
function assignFiles(files: File[], count: number, have: (string | null)[]): { n: number; file: File }[] {
  const numbered = files.map((file) => ({ file, n: Number(/^(?:slide|scene|img|image)?[-_ ]?0*(\d{1,3})\.\w+$/i.exec(file.name)?.[1]) }));
  if (numbered.every((x) => x.n >= 1 && x.n <= count) && new Set(numbered.map((x) => x.n)).size === numbered.length) return numbered;
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (sorted.length >= count) return sorted.slice(0, count).map((file, i) => ({ n: i + 1, file }));
  const gaps = have.flatMap((x, i) => (x ? [] : [i + 1]));
  return sorted.map((file, i) => ({ n: gaps[i] ?? count, file })).slice(0, gaps.length || count);
}

export const SlideshowView: React.FC<{ id: string; config: Config; summary?: Summary; onDeleted: () => void }> = ({ id, config, summary, onDeleted }) => {
  const [p, setP] = useState<ViewData | null>(null);
  const [draft, setDraft] = useState<SlideshowT | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [target, setTarget] = useState<number | null>(null); // scene whose image slot receives a pasted picture
  const { list: presets, reload: reloadPresets } = usePresets();
  const player = useRef<PlayerRef>(null);

  const stamp = summary ? `${summary.status}|${summary.next}|${summary.video}|${summary.message}|${summary.imagesMissing}` : "";
  useEffect(() => {
    api.getSlideshow(id).then((proj) => {
      setP(proj);
      setSettings((cur) => cur ?? proj.settings);
      setDraft((d) => (d && dirtyRef.current ? d : proj.slideshow));
    }).catch((e) => setErr(String(e)));
  }, [id, stamp]);

  const dirty = Boolean(p && draft && JSON.stringify(p.slideshow) !== JSON.stringify(draft));
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const images = useMemo(() => p?.prompts.map((x) => x.image) ?? [], [p]);
  const timeline = useMemo(() => {
    if (!p || !draft) return null;
    if (!dirty) return p.slideTimeline;
    const t = p.slideTimeline;
    return draftSlideTimeline(draft, { format: p.settings.format, music: t.music, musicVolume: t.musicVolume, captions: t.captions, images });
  }, [p, draft, dirty, images]);

  const starts = useMemo(() => {
    const out: number[] = [];
    let f = 0;
    for (const s of timeline?.scenes ?? []) {
      out.push(f);
      f += slideFrames(s);
    }
    return out;
  }, [timeline]);

  useEffect(() => {
    const pl = player.current;
    if (!pl) return;
    const onFrame = (e: { detail: { frame: number } }) => {
      let i = 0;
      while (i + 1 < starts.length && starts[i + 1] <= e.detail.frame) i++;
      setCurrent(i);
    };
    pl.addEventListener("frameupdate", onFrame);
    return () => pl.removeEventListener("frameupdate", onFrame);
  }, [starts, timeline]);

  const act = useCallback(async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      setP(await api.getSlideshow(id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(null), 3000);
  };

  // Add pictures: to one scene, or (several at once) matched by file name / filled in order.
  const addImages = async (files: File[], to?: number) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    const total = p?.prompts.length ?? 0;
    if (!imgs.length || !total) return;
    const picks = to ? [{ n: to, file: imgs[0] }] : assignFiles(imgs, total, images);
    await act(async () => {
      for (const { n, file } of picks) await api.uploadSlideImage(id, n, file);
    });
    const filled = new Set(picks.map((x) => x.n));
    flash(`Added ${picks.length} image${picks.length > 1 ? "s" : ""} (scene${picks.length > 1 ? "s" : ""} ${picks.map((x) => x.n).sort((a, b) => a - b).join(", ")})`);
    // Keep pasting: move on to the next scene without an image.
    const next = images.findIndex((x, i) => !x && !filled.has(i + 1)) + 1;
    setTarget(next || null);
  };

  // Ctrl+V anywhere on the page: one picture goes to the selected scene (else the first one without an image),
  // several at once are matched like a drop. The listener always calls the latest addImages.
  const pasteRef = useRef<(files: File[]) => void>(() => {});
  pasteRef.current = (files) => {
    if (files.length > 1) return void addImages(files);
    const gap = images.findIndex((x) => !x) + 1;
    const to = target ?? (gap || undefined);
    if (!to) return flash("Every scene has an image. Click a scene card first, then paste to replace its image.");
    void addImages(files, to);
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return; // plain text pastes into fields as usual
      e.preventDefault();
      pasteRef.current(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  if (!p || !draft || !timeline || !settings) return <p className="muted">{err ?? "Loading…"}</p>;
  const busy = p.status === "running" || p.status === "queued";
  const vertical = p.settings.format === "vertical";
  const missing = p.prompts.filter((x) => !x.image).length;
  const total = p.prompts.length;
  const voiced = p.next === "render" || Boolean(p.video);

  // Prompts follow the draft, so edits to the style, subjects or a scene show up right away.
  // Without the look's anchor image the prompts do not ask for a reference image.
  const anchorReady = !draft.preset || !presets || Boolean(presets.find((x) => x.key === draft.preset)?.anchorUrl);
  const notes = lintSlideshow(draft);
  const livePrompts = draft.scenes.map((_, i) => promptFor(draft, i, p.settings.format, anchorReady));
  const save = () => act(async () => {
    const saved = await api.saveSlideshow(id, draft);
    if (saved.slideshow) setDraft(saved.slideshow);
  });
  const render = () => {
    if (missing && !confirm(`${missing} of ${total} scenes have no image yet. Render with placeholder cards?`)) return;
    act(() => api.run(id, voiced ? "render" : "voice", "render", missing > 0));
  };
  const voiceChanged = (["voice", "lang", "speed"] as const).some((k) => settings[k] !== p.settings[k]);
  const applySettings = () => act(async () => {
    await api.setSettings(id, settings);
    if (voiceChanged) await api.run(id, "voice", "voice");
    flash(voiceChanged ? "Saved; recording the narration again" : "Settings saved; render again to apply them");
  });

  const updateScene = (i: number, patch: Partial<SlideSceneT>) => setDraft({ ...draft, scenes: draft.scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const seek = (i: number) => {
    setCurrent(i);
    setTarget(i + 1);
    player.current?.seekTo(starts[i] ?? 0);
  };

  return (
    <div className="panel">
      <div className="phead">
        <div>
          <h1>{draft.title}</h1>
          <div className="pmeta">
            <StatusPill p={{ ...p, kind: "slideshow", imagesMissing: missing }} />
            <span className="muted small">{p.message}</span>
            <span className="muted small">{timeline.scenes.length} scenes · {fmtTime(slideTotalFrames(timeline) / FPS)}</span>
          </div>
          {busy && <Progress value={p.status === "queued" ? 0 : p.progress} />}
        </div>
        <div className="actions">
          {dirty && <button className="primary" onClick={save}>Save changes</button>}
          {!dirty && !busy && (
            <button className={p.video || missing ? "" : "primary"} onClick={render}>
              {voiced ? (p.video ? "Render again" : "Render video") : "Voice + render"}
            </button>
          )}
          {p.video && !dirty && !busy && <a className="btn primary" href={p.video} download={`${p.id}.mp4`}>Download MP4</a>}
          {!busy && <button className="danger" onClick={() => confirm("Delete this slideshow, its images and video?") && act(async () => { await api.remove(id); onDeleted(); })}>Delete</button>}
        </div>
      </div>

      {err && <div className="banner error">{err}</div>}
      {p.error && <div className="banner error">{p.error}</div>}
      {notes.length > 0 && (
        <div className="banner warn">
          <strong>Script notes</strong>
          <ul className="notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}
      {dirty && <div className="banner warn">Unsaved edits. The preview shows them with estimated timing and no audio. Save to update the image prompts, then render.</div>}
      {!dirty && missing > 0 && (
        <div className="banner warn">
          <strong>{total - missing} of {total} images added.</strong> Copy each prompt below into your image generator, then drop the pictures onto the cards (or drop them all at once). The video renders once every scene has an image.
        </div>
      )}

      <div className={`workspace ${vertical ? "vertical" : ""}`}>
        <div className="preview">
          <Player
            ref={player}
            component={Slideshow}
            inputProps={{ timeline }}
            durationInFrames={Math.max(1, slideTotalFrames(timeline))}
            fps={FPS}
            compositionWidth={vertical ? 1080 : 1920}
            compositionHeight={vertical ? 1920 : 1080}
            controls
            acknowledgeRemotionLicense
            style={{ width: "100%", borderRadius: 10, overflow: "hidden" }}
          />
          <details className="bgpanel gap">
            <summary>Voice, music and captions</summary>
            <div className="padded">
              <SettingsForm config={config} s={settings} setS={setSettings} slideshow />
              <div className="actions">
                <button disabled={busy || JSON.stringify(settings) === JSON.stringify(p.settings)} onClick={applySettings}>Apply</button>
                {voiceChanged && <span className="muted small">Changing the voice records the narration again.</span>}
              </div>
            </div>
          </details>
          <details className="bgpanel gap">
            <summary>Art direction and recurring subjects</summary>
            <div className="padded">
              <label className="lbl">Look</label>
              <PresetSelect value={draft.preset} onChange={(preset) => setDraft({ ...draft, preset })} />
              {draft.preset && <p className="muted small">{PRESETS[draft.preset].label} adds its own art direction (characters and scenery) and the fixed hero {PRESETS[draft.preset].hero} to the prompts.</p>}
              <label className="lbl">{draft.preset ? "Extra style notes added to every image prompt" : "Style added to every image prompt"}</label>
              <textarea rows={draft.preset ? 2 : 4} value={draft.style} onChange={(e) => setDraft({ ...draft, style: e.target.value })} />
              {draft.subjects.map((sub, i) => (
                <div className="subject" key={i}>
                  <input value={sub.name} onChange={(e) => setDraft({ ...draft, subjects: draft.subjects.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <textarea rows={2} value={sub.look} placeholder={kindOf(sub) === "person" && draft.preset ? "outfit and props only" : "full description"} onChange={(e) => setDraft({ ...draft, subjects: draft.subjects.map((x, j) => (j === i ? { ...x, look: e.target.value } : x)) })} />
                  <Sel title="What it is: people are built on the look's hero figure, so only describe their outfit" value={kindOf(sub)} options={SUBJECT_KINDS} onChange={(v) => setDraft({ ...draft, subjects: draft.subjects.map((x, j) => (j === i ? { ...x, kind: v as typeof x.kind } : x)) })} />
                  <button className="ghost small" title="Remove" onClick={() => setDraft({ ...draft, subjects: draft.subjects.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              <button className="ghost small" onClick={() => setDraft({ ...draft, subjects: [...draft.subjects, { name: "New subject", look: "wearing a plain brown cloak and a hood", kind: "person" as const }] })}>+ Subject</button>
            </div>
          </details>
        </div>

        <div className="scenes">
          <div className="scenes-head">
            <h2>Scenes</h2>
            <input className="title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          {draft.scenes.map((s, i) => (
            <SceneEditor
              key={i}
              i={i}
              s={s}
              config={config}
              subjects={effectiveSubjects(draft).map((x) => x.name)}
              active={i === current}
              seconds={timeline.scenes[i] ? slideFrames(timeline.scenes[i]) / FPS : 0}
              onSeek={() => seek(i)}
              onChange={(patch) => updateScene(i, patch)}
            />
          ))}
        </div>
      </div>

      <AnchorPanel preset={draft.preset} presets={presets} reload={reloadPresets} />
      <ImagesPanel
        prompts={livePrompts}
        entries={p.prompts}
        stale={dirty}
        note={note}
        onCopyAll={async () => {
          await copy(anchorNote(draft, anchorReady) + livePrompts.map((t, i) => `SCENE ${i + 1} (save as slide-${String(i + 1).padStart(2, "0")}.png)\n${t}`).join("\n\n"));
          flash("All prompts copied");
        }}
        target={target}
        onSelect={setTarget}
        onUpload={(n, f) => addImages([f], n)}
        onRemove={(n) => act(() => api.removeSlideImage(id, n))}
        onDropMany={(files) => addImages(files)}
        onNote={flash}
      />
    </div>
  );
};

const SceneEditor: React.FC<{
  i: number;
  s: SlideSceneT;
  config: Config;
  subjects: string[];
  active: boolean;
  seconds: number;
  onSeek: () => void;
  onChange: (patch: Partial<SlideSceneT>) => void;
}> = ({ i, s, config, subjects, active, seconds, onSeek, onChange }) => {
  const o = config.options;
  const aims = s.camera === "zoomIn" || s.camera === "zoomOut" || s.camera === "pushIn";
  const toggleSubject = (name: string) => onChange({ subjects: s.subjects.includes(name) ? s.subjects.filter((x) => x !== name) : [...s.subjects, name] });
  return (
    <div className={`scene ${active ? "active" : ""}`} onClick={onSeek}>
      <div className="scene-top">
        <span className="num">{i + 1}</span>
        <span className="muted small">{seconds.toFixed(1)}s</span>
      </div>
      <label className="lbl tight">Narration</label>
      <textarea rows={2} value={s.narration} onChange={(e) => onChange({ narration: e.target.value })} />
      <label className="lbl tight">Image (what the picture shows)</label>
      <textarea rows={2} value={s.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
      <div className="row">
        <Sel title="Camera move" value={s.camera} options={o.slideCamera} onChange={(v) => onChange({ camera: v as SlideSceneT["camera"] })} />
        <Sel title="Move intensity" value={s.intensity} options={o.intensity} onChange={(v) => onChange({ intensity: v as SlideSceneT["intensity"] })} />
        <Sel title="Transition into this scene" value={s.transition} options={o.slideTransition} onChange={(v) => onChange({ transition: v as SlideSceneT["transition"] })} />
        <input title="Lower-third text (place, date)" placeholder="Label" value={s.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      {aims && (
        <div className="row">
          <span className="muted small">Aim</span>
          <input title="Aim left to right" type="range" min={0} max={1} step={0.05} value={s.focus?.[0] ?? 0.5} onChange={(e) => onChange({ focus: [Number(e.target.value), s.focus?.[1] ?? 0.5] })} />
          <input title="Aim top to bottom" type="range" min={0} max={1} step={0.05} value={s.focus?.[1] ?? 0.5} onChange={(e) => onChange({ focus: [s.focus?.[0] ?? 0.5, Number(e.target.value)] })} />
          {s.focus && <button className="ghost small" onClick={() => onChange({ focus: null })}>Center</button>}
        </div>
      )}
      {subjects.length > 0 && (
        <div className="row">
          <span className="muted small">In the image</span>
          {subjects.map((n) => (
            <label className="check" key={n}>
              <input type="checkbox" checked={s.subjects.includes(n)} onChange={() => toggleSubject(n)} /> {n}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// Every scene's image prompt with its image slot: copy, generate elsewhere, drop the file back here.
const ImagesPanel: React.FC<{
  prompts: string[];
  entries: ViewData["prompts"];
  stale: boolean;
  note: string | null;
  target: number | null;
  onSelect: (n: number) => void;
  onCopyAll: () => void;
  onUpload: (n: number, file: File) => void;
  onRemove: (n: number) => void;
  onDropMany: (files: File[]) => void;
  onNote: (m: string) => void;
}> = ({ prompts, entries, stale, note, target, onSelect, onCopyAll, onUpload, onRemove, onDropMany, onNote }) => {
  const [over, setOver] = useState(false);
  const many = useRef<HTMLInputElement>(null);
  const have = entries.filter((e) => e.image).length;
  return (
    <div className="bgpanel gap" id="images">
      <div className="bgpanel-head static">
        <strong>Image prompts</strong>
        <span className={`pill ${have === entries.length ? "done" : ""}`}>{have}/{entries.length} images</span>
        <span className="muted small">{stale ? "Showing your unsaved edits. " : ""}One prompt per scene, ready to paste into any image generator.</span>
        <div className="spacer" />
        {note && <span className="muted small">{note}</span>}
        <button className="small" onClick={onCopyAll}>Copy all prompts</button>
        <button className="small" onClick={() => many.current?.click()}>Add several images…</button>
        <input ref={many} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { onDropMany([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      <div
        className={`dropzone ${over ? "over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onDropMany([...e.dataTransfer.files]); }}
      >
        <strong>Paste with Ctrl+V:</strong> copy a generated image and paste it here; it goes to the highlighted scene (click a card to choose), then the highlight moves to the next empty one.
        Or drop files: named 1, 2, 3… (or slide-01…) they go to that scene, otherwise they fill the scenes in file-name order.
      </div>
      <div className="bggrid">
        {entries.map((e, i) => (
          <SlideCard key={e.n} n={e.n} prompt={prompts[i] ?? e.prompt} narration={e.narration} image={e.image} selected={target === e.n} onSelect={onSelect} onUpload={onUpload} onRemove={onRemove} onNote={onNote} />
        ))}
      </div>
    </div>
  );
};

const SlideCard: React.FC<{
  n: number;
  prompt: string;
  narration: string;
  image: string | null;
  selected: boolean;
  onSelect: (n: number) => void;
  onUpload: (n: number, f: File) => void;
  onRemove: (n: number) => void;
  onNote: (m: string) => void;
}> = ({ n, prompt, narration, image, selected, onSelect, onUpload, onRemove, onNote }) => {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // The Paste button reads the clipboard directly; browsers that refuse still support Ctrl+V.
  const paste = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) return onUpload(n, new File([await item.getType(type)], "pasted", { type }));
      }
      onNote("There is no image on the clipboard");
    } catch {
      onNote("Press Ctrl+V instead (this browser blocks the button)");
    }
  };
  return (
    <div
      className={`bgcard ${over ? "over" : ""} ${selected ? "selected" : ""}`}
      onClick={() => onSelect(n)}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onUpload(n, f);
      }}
    >
      <div className="bgthumb" onClick={() => input.current?.click()}>
        {image ? <img src={image} alt={`Scene ${n}`} /> : <span>Drop image or click</span>}
      </div>
      <div className="bgmeta">
        <strong>Scene {n}</strong>
        {selected && <span className="pill running">Ctrl+V pastes here</span>}
        <span className="muted small">{narration.length > 70 ? `${narration.slice(0, 70)}…` : narration}</span>
      </div>
      <p className="bgprompt tall">{prompt}</p>
      <div className="row">
        <button className="small" onClick={async () => { await copy(prompt); onNote("Prompt copied"); }}>Copy prompt</button>
        <button className="small" onClick={paste}>Paste image</button>
        <button className="small" onClick={() => input.current?.click()}>{image ? "Replace" : "Upload"}</button>
        {image && <button className="ghost small" onClick={() => onRemove(n)}>Remove</button>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(n, f); e.target.value = ""; }} />
    </div>
  );
};
