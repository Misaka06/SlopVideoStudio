import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Episode } from "../src/Episode";
import { draftTimeline, FPS, totalFrames, type CastT, type SceneCharT, type SceneT, type Timeline } from "../src/schema";
import example from "../examples/time-loop.json";
import { CharactersPage } from "./Characters";
import { PropsPage, PropsPanel } from "./Props";
import { fmtTime, Progress, SettingsForm, Sel, StatusPill } from "./ui";
import { SlideshowNewPanel, SlideshowView } from "./Slideshow";
import { StylesPage } from "./Styles";
import { api, type BackgroundEntry, type Config, type EpisodeT, type ProjectView as ProjectData, type Settings, type Summary } from "./api";

export const App: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [projects, setProjects] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.config().then(setConfig).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => api.list().then((p) => alive && setProjects(p)).catch(() => {});
    tick();
    const t = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const active = projects.filter((p) => p.status === "running" || p.status === "queued").length;
  // Show a new project at once (the list only refreshes every 1.5 s), so the right screen opens.
  const created = (s: Summary) => {
    setProjects((all) => [s, ...all.filter((p) => p.id !== s.id)]);
    setSelected(s.id);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">●</span> Animator Studio
        </div>
        <div className="topstats">
          <span className="chip">{active} in queue</span>
        </div>
      </header>
      <aside className="sidebar">
        <button className={`newbtn ${selected === null ? "on" : ""}`} onClick={() => setSelected(null)}>
          + New videos
        </button>
        <button className={`libbtn ${selected === LIBRARY ? "on" : ""}`} onClick={() => setSelected(LIBRARY)}>
          Background library
        </button>
        <button className={`libbtn ${selected === PROPS ? "on" : ""}`} onClick={() => setSelected(PROPS)}>
          Props library
        </button>
        <button className={`libbtn ${selected === CHARACTERS ? "on" : ""}`} onClick={() => setSelected(CHARACTERS)}>
          Character library
        </button>
        <button className={`libbtn ${selected === STYLES ? "on" : ""}`} onClick={() => setSelected(STYLES)}>
          Style anchors
        </button>
        <div className="plist">
          {projects.length === 0 && <p className="muted small">No videos yet.</p>}
          {projects.map((p) => (
            <button key={p.id} className={`pitem ${selected === p.id ? "on" : ""}`} onClick={() => setSelected(p.id)}>
              <div className="ptitle">{p.kind === "slideshow" ? "🖼 " : ""}{p.title ?? p.topic}</div>
              <div className="pmeta">
                <StatusPill p={p} />
                <span className="muted small">
                  {p.format === "vertical" ? "9:16" : "16:9"}
                  {p.seconds ? ` · ${fmtTime(p.seconds)}` : ""}
                </span>
              </div>
              {(p.status === "running" || p.status === "queued") && <Progress value={p.status === "queued" ? 0 : p.progress} />}
            </button>
          ))}
        </div>
      </aside>
      <main className="main">
        {error && <div className="banner error">{error}</div>}
        {!config ? (
          <p className="muted">Loading…</p>
        ) : selected === null ? (
          <NewPanel config={config} onCreated={created} />
        ) : selected === LIBRARY ? (
          <LibraryPage />
        ) : selected === PROPS ? (
          <PropsPage config={config} />
        ) : selected === CHARACTERS ? (
          <CharactersPage />
        ) : selected === STYLES ? (
          <StylesPage />
        ) : projects.find((p) => p.id === selected)?.kind === "slideshow" ? (
          <SlideshowView key={selected} id={selected} config={config} summary={projects.find((p) => p.id === selected)} onDeleted={() => setSelected(null)} />
        ) : (
          <ProjectView key={selected} id={selected} config={config} summary={projects.find((p) => p.id === selected)} onDeleted={() => setSelected(null)} />
        )}
      </main>
    </div>
  );
};

const LIBRARY = "__library";
const PROPS = "__props";
const CHARACTERS = "__characters";
const STYLES = "__styles";

// ---------------------------------------------------------------- New videos

const NewPanel: React.FC<{ config: Config; onCreated: (s: Summary) => void }> = ({ config, onCreated }) => {
  const [mode, setMode] = useState<"episode" | "slideshow">("episode");
  return (
    <>
      <div className="panel narrow modebar">
        <div className="seg">
          <button className={mode === "episode" ? "on" : ""} onClick={() => setMode("episode")}>Stick-figure episode</button>
          <button className={mode === "slideshow" ? "on" : ""} onClick={() => setMode("slideshow")}>Image slideshow</button>
        </div>
      </div>
      {mode === "episode" ? <EpisodePanel config={config} onCreated={onCreated} /> : <SlideshowNewPanel config={config} onCreated={onCreated} />}
    </>
  );
};

const EpisodePanel: React.FC<{ config: Config; onCreated: (s: Summary) => void }> = ({ config, onCreated }) => {
  const [scriptText, setScriptText] = useState("");
  const [s, setS] = useState<Settings>(config.defaults);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const created = await api.create({ episode: JSON.parse(scriptText), settings: s, until: "render" });
      if (created.length) onCreated(created[0]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel narrow">
      <h1>New video</h1>
      <p className="muted small">Scripts are written by your LLM (through the MCP server, or paste one from any chat model). The app voices and renders them.</p>
      <label className="lbl">
        Paste an episode script (JSON). <button className="link" onClick={() => setScriptText(JSON.stringify(example, null, 2))}>Load the example</button>
      </label>
      <textarea className="big mono" rows={12} value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder='{"title": "...", "cast": [...], "scenes": [...]}' />

      <SettingsForm config={config} s={s} setS={setS} />

      {err && <div className="banner error">{err}</div>}
      <div className="actions">
        <button className="primary" disabled={busy || !scriptText.trim()} onClick={submit}>
          Voice + render
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- Project page

const ProjectView: React.FC<{ id: string; config: Config; summary?: Summary; onDeleted: () => void }> = ({ id, config, summary, onDeleted }) => {
  const [p, setP] = useState<ProjectData | null>(null);
  const [draft, setDraft] = useState<EpisodeT | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const player = useRef<PlayerRef>(null);

  // Reload the full project whenever the server-side copy changes.
  const stamp = summary ? `${summary.status}|${summary.next}|${summary.video}|${summary.scenes}|${summary.message}` : "";
  useEffect(() => {
    api.get(id).then((proj) => {
      setP(proj);
      setDraft((d) => (d && dirtyRef.current ? d : proj.episode));
    }).catch((e) => setErr(String(e)));
  }, [id, stamp]);

  const dirty = Boolean(p?.episode && draft && JSON.stringify(p.episode) !== JSON.stringify(draft));
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const timeline: Timeline | null = useMemo(() => {
    if (!p || !draft) return null;
    if (!dirty && p.timeline) return p.timeline;
    return { ...draftTimeline(draft, p.settings.format), bgImages: p.timeline?.bgImages };
  }, [p, draft, dirty]);

  const starts = useMemo(() => {
    const out: number[] = [];
    let f = 0;
    for (const s of timeline?.scenes ?? []) {
      out.push(f);
      f += Math.max(1, Math.round(s.durationSec * FPS));
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
      setP(await api.get(id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  if (!p) return <p className="muted">Loading…</p>;
  const busy = p.status === "running" || p.status === "queued";
  const vertical = p.settings.format === "vertical";

  const save = () => act(async () => {
    const saved = await api.saveEpisode(id, draft!);
    setDraft(saved.episode);
  });

  const updateScene = (i: number, patch: Partial<SceneT>) => setDraft((d) => d && { ...d, scenes: d.scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const seek = (i: number) => {
    setCurrent(i);
    player.current?.seekTo(starts[i] ?? 0);
  };

  return (
    <div className="panel">
      <div className="phead">
        <div>
          <h1>{draft?.title ?? p.topic}</h1>
          <div className="pmeta">
            <StatusPill p={p} />
            <span className="muted small">{p.message}</span>
          </div>
          {busy && <Progress value={p.status === "queued" ? 0 : p.progress} />}
        </div>
        <div className="actions">
          {dirty && <button className="primary" onClick={save}>Save changes</button>}
          {!dirty && p.episode && !busy && (
            <button className={p.video ? "" : "primary"} onClick={() => act(() => api.run(id, p.next === "render" ? "render" : "voice"))}>
              {p.next === "render" ? "Render" : p.video ? "Re-voice + render" : "Voice + render"}
            </button>
          )}
          {p.video && !dirty && !busy && <a className="btn primary" href={p.video} download={`${p.id}.mp4`}>Download MP4</a>}
          {!busy && <button className="danger" onClick={() => confirm("Delete this video and its files?") && act(async () => { await api.remove(id); onDeleted(); })}>Delete</button>}
        </div>
      </div>

      {err && <div className="banner error">{err}</div>}
      {p.error && <div className="banner error">{p.error}</div>}
      {dirty && <div className="banner warn">Preview shows your edits with estimated timing and no audio. Save, then Voice + render to update the video.</div>}

      {p.episode && (
        <BackgroundsPanel
          entries={p.backgrounds}
          enabled={p.settings.imageBackgrounds !== false}
          canRerender={Boolean(p.video) && !busy && !dirty}
          onToggle={(on) => act(() => api.setSettings(id, { imageBackgrounds: on }))}
          onChanged={() => act(async () => {})}
          onRerender={() => act(() => api.run(id, "render"))}
        />
      )}

      {p.episode && p.props.length > 0 && (
        <PropsPanel entries={p.props} canRerender={Boolean(p.video) && !busy && !dirty} onChanged={() => act(async () => {})} onRerender={() => act(() => api.run(id, "render"))} />
      )}

      {!draft || !timeline ? (
        <div className="empty">{busy ? "Writing the script…" : "No script yet."}</div>
      ) : (
        <div className={`workspace ${vertical ? "vertical" : ""}`}>
          <div className="preview">
            <Player
              ref={player}
              component={Episode}
              inputProps={{ timeline }}
              durationInFrames={Math.max(1, totalFrames(timeline))}
              fps={FPS}
              compositionWidth={vertical ? 1080 : 1920}
              compositionHeight={vertical ? 1920 : 1080}
              controls
              acknowledgeRemotionLicense
              style={{ width: "100%", borderRadius: 10, overflow: "hidden" }}
            />
            <CastEditor cast={draft.cast} config={config} onChange={(cast) => setDraft({ ...draft, cast })} />
          </div>
          <div className="scenes">
            <div className="scenes-head">
              <h2>Scenes</h2>
              <input className="title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            {draft.scenes.map((s, i) => (
              <SceneCard
                key={i}
                i={i}
                s={s}
                cast={draft.cast}
                config={config}
                active={i === current}
                seconds={timeline.scenes[i]?.durationSec ?? 0}
                onSeek={() => seek(i)}
                onChange={(patch) => updateScene(i, patch)}
                onRemove={() => setDraft({ ...draft, scenes: draft.scenes.filter((_, j) => j !== i) })}
                onDuplicate={() => setDraft({ ...draft, scenes: [...draft.scenes.slice(0, i + 1), structuredClone(s), ...draft.scenes.slice(i + 1)] })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SceneCard: React.FC<{
  i: number;
  s: SceneT;
  cast: CastT[];
  config: Config;
  active: boolean;
  seconds: number;
  onSeek: () => void;
  onChange: (patch: Partial<SceneT>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}> = ({ i, s, cast, config, active, seconds, onSeek, onChange, onRemove, onDuplicate }) => {
  const o = config.options;
  const setChar = (j: number, patch: Partial<SceneCharT>) => onChange({ chars: s.chars.map((c, k) => (k === j ? { ...c, ...patch } : c)) });
  const addChar = () =>
    cast[0] && onChange({ chars: [...s.chars, { name: cast[0].name, x: 0.5, pose: "idle", face: "neutral", facing: "right", action: "none", holds: "none", emote: "none", talking: false }] });

  return (
    <div className={`scene ${active ? "active" : ""}`} onClick={onSeek}>
      <div className="scene-top">
        <span className="num">{i + 1}</span>
        <span className="muted small">{seconds.toFixed(1)}s</span>
        <div className="spacer" />
        <button className="ghost small" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>Duplicate</button>
        <button className="ghost small" onClick={(e) => { e.stopPropagation(); onRemove(); }}>Remove</button>
      </div>
      <textarea rows={2} value={s.narration} onChange={(e) => onChange({ narration: e.target.value })} />
      <div className="row">
        <Sel title="Background" value={s.bg} options={o.bg} onChange={(v) => onChange({ bg: v as SceneT["bg"] })} />
        <Sel title="Time of day" value={s.time} options={o.time} onChange={(v) => onChange({ time: v as SceneT["time"] })} />
        <Sel title="Camera" value={s.camera} options={o.camera} onChange={(v) => onChange({ camera: v as SceneT["camera"] })} />
        <Sel title="Transition in" value={s.transition} options={o.transition} onChange={(v) => onChange({ transition: v as SceneT["transition"] })} />
        <Sel title="Effect" value={s.effect} options={o.effect} onChange={(v) => onChange({ effect: v as SceneT["effect"] })} />
        <input title="Name plate" placeholder="Name plate" value={s.label} onChange={(e) => onChange({ label: e.target.value })} />
        <input title="Corner counter" placeholder="Counter (LIVES: 3)" value={s.hud} onChange={(e) => onChange({ hud: e.target.value })} />
      </div>
      {s.chars.map((c, j) => (
        <div className="row char" key={j}>
          <Sel title="Character" value={c.name} options={cast.map((m) => m.name)} onChange={(v) => setChar(j, { name: v })} />
          <input title="Position" type="range" min={0.05} max={0.95} step={0.01} value={c.x} onChange={(e) => setChar(j, { x: Number(e.target.value) })} />
          <Sel title="Pose" value={c.pose} options={o.pose} onChange={(v) => setChar(j, { pose: v as SceneCharT["pose"] })} />
          <Sel title="Face" value={c.face} options={o.face} onChange={(v) => setChar(j, { face: v as SceneCharT["face"] })} />
          <Sel title="Facing" value={c.facing} options={["left", "right"]} onChange={(v) => setChar(j, { facing: v as SceneCharT["facing"] })} />
          <Sel title="Action" value={c.action} options={o.action} onChange={(v) => setChar(j, { action: v as SceneCharT["action"] })} />
          <Sel title="Holds" value={c.holds} options={o.holds} onChange={(v) => setChar(j, { holds: v as SceneCharT["holds"] })} />
          <Sel title="Emote bubble" value={c.emote} options={o.emote} onChange={(v) => setChar(j, { emote: v as SceneCharT["emote"] })} />
          <label className="check" title="Mouth moves with the narration">
            <input type="checkbox" checked={c.talking} onChange={(e) => setChar(j, { talking: e.target.checked })} /> talks
          </label>
          <button className="ghost small" onClick={() => onChange({ chars: s.chars.filter((_, k) => k !== j) })}>✕</button>
        </div>
      ))}
      <div className="row">
        <button className="ghost small" onClick={addChar}>+ Character</button>
        {s.set.map((piece, j) => (
          <span className="piece" key={j}>
            <Sel value={piece.kind} options={o.set} onChange={(v) => onChange({ set: s.set.map((q, k) => (k === j ? { ...q, kind: v as typeof q.kind } : q)) })} />
            <input type="range" min={0.05} max={0.95} step={0.01} value={piece.x} onChange={(e) => onChange({ set: s.set.map((q, k) => (k === j ? { ...q, x: Number(e.target.value) } : q)) })} />
            <button className="ghost small" onClick={() => onChange({ set: s.set.filter((_, k) => k !== j) })}>✕</button>
          </span>
        ))}
        <button className="ghost small" onClick={() => onChange({ set: [...s.set, { kind: "podium", x: 0.5 }] })}>+ Prop</button>
      </div>
    </div>
  );
};

const CastEditor: React.FC<{ cast: CastT[]; config: Config; onChange: (c: CastT[]) => void }> = ({ cast, config, onChange }) => {
  const set = (i: number, patch: Partial<CastT>) => onChange(cast.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="cast">
      <h2>Cast</h2>
      {cast.map((c, i) => (
        <div className="castcard" key={i}>
          <div className="row">
            <input type="color" title="Outfit color" value={c.color} onChange={(e) => set(i, { color: e.target.value })} />
            <input type="color" title="Accent color (eyes, details)" value={c.accent} onChange={(e) => set(i, { accent: e.target.value })} />
            <input className="name" value={c.name} onChange={(e) => set(i, { name: e.target.value })} />
            <label className="check" title="Size">
              size <input type="range" min={0.5} max={1.2} step={0.05} value={c.scale} onChange={(e) => set(i, { scale: Number(e.target.value) })} />
            </label>
            <button className="ghost small" title="Remove" onClick={() => onChange(cast.filter((_, j) => j !== i))}>✕</button>
          </div>
          <div className="row">
            <Sel title="Outfit" value={c.outfit} options={config.options.outfit} onChange={(v) => set(i, { outfit: v as CastT["outfit"] })} />
            <Sel title="Body" value={c.body} options={config.options.body} onChange={(v) => set(i, { body: v as CastT["body"] })} />
            <Sel title="Hair" value={c.hair} options={config.options.hair} onChange={(v) => set(i, { hair: v as CastT["hair"] })} />
            <input type="color" title="Hair color" value={c.hairColor} onChange={(e) => set(i, { hairColor: e.target.value })} />
            <Sel title="Hat" value={c.hat} options={config.options.hat} onChange={(v) => set(i, { hat: v as CastT["hat"] })} />
            <Sel title="Accessory" value={c.accessory} options={config.options.accessory} onChange={(v) => set(i, { accessory: v as CastT["accessory"] })} />
            <label className="check"><input type="checkbox" checked={c.tie} onChange={(e) => set(i, { tie: e.target.checked })} /> tie</label>
          </div>
        </div>
      ))}
      <button
        className="ghost small"
        onClick={() =>
          onChange([
            ...cast,
            { name: `Person ${cast.length + 1}`, color: "#5a7bd9", accent: "#ffb14d", outfit: "jacket", body: "normal", hair: "short", hairColor: "#3b2618", hat: "none", accessory: "none", tie: false, scale: 1 },
          ])
        }
      >
        + Cast member
      </button>
    </div>
  );
};

// ---------------------------------------------------------------- Image backgrounds

const BackgroundsPanel: React.FC<{
  entries: BackgroundEntry[];
  enabled: boolean;
  canRerender: boolean;
  onToggle: (on: boolean) => void;
  onChanged: () => void;
  onRerender: () => void;
}> = ({ entries, enabled, canRerender, onToggle, onChanged, onRerender }) => {
  const [open, setOpen] = useState(false);
  const ready = entries.filter((e) => e.url).length;
  return (
    <div className="bgpanel">
      <div className="bgpanel-head" onClick={() => setOpen(!open)}>
        <span className="caret">{open ? "▾" : "▸"}</span>
        <strong>Image backgrounds</strong>
        <span className={`pill ${ready === entries.length ? "done" : ""}`}>{ready}/{entries.length} ready</span>
        <span className="muted small">Generate each prompt in any image tool (16:9), then drop the image here. Missing ones use the drawn backgrounds.</span>
        <div className="spacer" />
        <label className="check" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} /> use images
        </label>
        {canRerender && (
          <button className="small" onClick={(e) => { e.stopPropagation(); onRerender(); }}>Re-render</button>
        )}
      </div>
      {open && (
        <div className="bggrid">
          {entries.map((e) => <BackgroundCard key={e.key} e={e} onChanged={onChanged} />)}
        </div>
      )}
    </div>
  );
};

const BackgroundCard: React.FC<{ e: BackgroundEntry; onChanged: () => void }> = ({ e, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.uploadBackground(e.key, file);
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(e.prompt);
    setMsg("Prompt copied");
    setTimeout(() => setMsg(null), 1500);
  };

  return (
    <div
      className={`bgcard ${over ? "over" : ""}`}
      onDragOver={(ev) => { ev.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(ev) => { ev.preventDefault(); setOver(false); upload(ev.dataTransfer.files[0]); }}
    >
      <div className="bgthumb" onClick={() => input.current?.click()}>
        {e.url ? <img src={e.url} alt={e.key} /> : <span>{busy ? "Uploading…" : "Drop image or click"}</span>}
      </div>
      <div className="bgmeta">
        <strong>{e.bg}</strong> <span className={`pill ${e.time === "night" ? "queued" : e.time === "sunset" ? "running" : ""}`}>{e.time}</span>
        {e.scenes.length > 0 && <span className="muted small"> · scenes {e.scenes.join(", ")}</span>}
      </div>
      <p className="bgprompt">{e.prompt}</p>
      <div className="row">
        <button className="small" onClick={copy}>Copy prompt</button>
        <button className="small" onClick={() => input.current?.click()}>{e.url ? "Replace" : "Upload"}</button>
        {e.url && <button className="ghost small" onClick={async () => { await api.removeBackground(e.key); onChanged(); }}>Remove</button>}
        {msg && <span className="muted small">{msg}</span>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(ev) => upload(ev.target.files?.[0])} />
    </div>
  );
};

const LibraryPage: React.FC = () => {
  const [entries, setEntries] = useState<BackgroundEntry[]>([]);
  const [filter, setFilter] = useState<"missing" | "ready" | "all">("all");
  const reload = useCallback(() => { api.backgrounds().then(setEntries).catch(() => {}); }, []);
  useEffect(reload, [reload]);
  const shown = entries.filter((e) => filter === "all" || (filter === "ready" ? e.url : !e.url));
  const ready = entries.filter((e) => e.url).length;
  return (
    <div className="panel">
      <h1>Background library</h1>
      <p className="muted">
        One image per background and time of day, shared by every video. {ready} of {entries.length} ready. Prompts all use the same art direction so
        images match the sticker characters.
      </p>
      <div className="tabs">
        {(["all", "missing", "ready"] as const).map((f) => (
          <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="bggrid">{shown.map((e) => <BackgroundCard key={e.key} e={e} onChanged={reload} />)}</div>
    </div>
  );
};
