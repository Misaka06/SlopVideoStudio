import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, type Config, type PropEntry } from "./api";

// Props library UI: a per-video panel and the full library page. Prompts come from the
// server in the house sticker style on a pure green background; uploads are keyed there.

export const PropsPanel: React.FC<{ entries: PropEntry[]; canRerender: boolean; onChanged: () => void; onRerender: () => void }> = ({ entries, canRerender, onChanged, onRerender }) => {
  const [open, setOpen] = useState(false);
  const usable = entries.filter((e) => !e.animated);
  const ready = usable.filter((e) => e.url).length;
  return (
    <div className="bgpanel">
      <div className="bgpanel-head" onClick={() => setOpen(!open)}>
        <span className="caret">{open ? "▾" : "▸"}</span>
        <strong>Image props</strong>
        <span className={`pill ${ready === usable.length ? "done" : ""}`}>
          {ready}/{usable.length} ready
        </span>
        <span className="muted small">Generate each prompt on its green background, then drop the image here. Props without an image use the drawn version.</span>
        <div className="spacer" />
        {canRerender && (
          <button
            className="small"
            onClick={(e) => {
              e.stopPropagation();
              onRerender();
            }}
          >
            Re-render
          </button>
        )}
      </div>
      {open && (
        <div className="bggrid">
          {entries.map((e) => (
            <PropCard key={e.key} e={e} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
};

const PropCard: React.FC<{ e: PropEntry; onChanged: () => void; pick?: number; onPick?: () => void }> = ({ e, onChanged, pick, onPick }) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file?: File) => {
    if (!file || e.animated) return;
    setBusy(true);
    setMsg("Removing the green background…");
    try {
      await api.uploadProp(e.key, file);
      setMsg(null);
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
  const remove = async () => {
    if (!e.builtin && !confirm(`Delete the custom prop "${e.name}"?`)) return;
    await api.removeProp(e.key);
    onChanged();
  };

  return (
    <div
      className={`bgcard ${over ? "over" : ""}`}
      onDragOver={(ev) => {
        ev.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setOver(false);
        upload(ev.dataTransfer.files[0]);
      }}
    >
      <div className="propthumb" onClick={() => !e.animated && input.current?.click()}>
        {e.url ? <img src={e.url} alt={e.name} /> : <span>{e.animated ? "Animated: keeps its drawing" : busy ? "Working…" : "Drop image or click"}</span>}
      </div>
      <div className="bgmeta">
        {onPick && !e.animated && (
          <label className="check" title="Add to a sheet">
            <input type="checkbox" checked={pick !== undefined} onChange={onPick} />
            {pick !== undefined ? `#${pick + 1}` : ""}
          </label>
        )}
        <strong>{e.builtin ? e.id : e.name}</strong>
        <span className={`pill ${e.kind === "held" ? "queued" : ""}`}>{e.kind === "held" ? "held" : "set piece"}</span>
        {!e.builtin && <span className="pill running">custom</span>}
        {e.scenes && <span className="muted small">· scenes {e.scenes.join(", ")}</span>}
      </div>
      <p className="bgprompt">{e.prompt}</p>
      <div className="row">
        <span className="muted small mono">{e.key}</span>
        <div className="spacer" />
        {!e.animated && (
          <button className="small" onClick={copy}>
            Copy prompt
          </button>
        )}
        {!e.animated && (
          <button className="small" onClick={() => input.current?.click()}>
            {e.url ? "Replace" : "Upload"}
          </button>
        )}
        {(e.url || !e.builtin) && (
          <button className="ghost small" onClick={remove}>
            {e.builtin ? "Remove image" : "Delete"}
          </button>
        )}
      </div>
      {msg && <p className="muted small">{msg}</p>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(ev) => upload(ev.target.files?.[0])} />
    </div>
  );
};

const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <div className={`field ${wide ? "wide" : ""}`}>
    <label className="lbl">{label}</label>
    {children}
  </div>
);

export const PropsPage: React.FC<{ config: Config }> = ({ config }) => {
  const [entries, setEntries] = useState<PropEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "custom" | "missing" | "ready">("all");
  const [form, setForm] = useState({ name: "", description: "", kind: "set" as "set" | "held", size: "medium", grip: "chest", front: false });
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key].slice(0, 9)));
  const reload = useCallback(() => {
    api.props().then(setEntries).catch(() => {});
  }, []);
  useEffect(reload, [reload]);

  const create = async () => {
    setErr(null);
    try {
      await api.createProp(form);
      setForm({ ...form, name: "", description: "" });
      setFilter("custom");
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const shown = entries.filter((e) => (filter === "all" ? true : filter === "custom" ? !e.builtin : filter === "ready" ? e.url : !e.url && !e.animated));
  const ready = entries.filter((e) => e.url).length;
  return (
    <div className="panel">
      <h1>Props library</h1>
      <p className="muted">
        Images replace the drawn props in every video, and custom props add new ones. Prompts use the house sticker style on a pure green background, which is
        removed automatically when you upload. {ready} of {entries.length} have an image.
      </p>

      <div className="newprop">
        <h2>New custom prop</h2>
        <div className="grid settings">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="time machine" />
          </Field>
          <Field label="Kind">
            <div className="seg">
              <button className={form.kind === "set" ? "on" : ""} onClick={() => setForm({ ...form, kind: "set" })}>
                Set piece
              </button>
              <button className={form.kind === "held" ? "on" : ""} onClick={() => setForm({ ...form, kind: "held" })}>
                Held
              </button>
            </div>
          </Field>
          <Field label="Size">
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
              {["small", "medium", "large", "huge"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What it looks like" wide>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="a brass phone booth with glowing blue dials and a clock on top" />
          </Field>
          {form.kind === "held" ? (
            <Field label="How it is held">
              <select value={form.grip} onChange={(e) => setForm({ ...form, grip: e.target.value })}>
                {(config.options.grip ?? []).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Layer">
              <label className="check">
                <input type="checkbox" checked={form.front} onChange={(e) => setForm({ ...form, front: e.target.checked })} /> in front of characters
              </label>
            </Field>
          )}
        </div>
        {err && <div className="banner error">{err}</div>}
        <div className="actions">
          <button className="primary" disabled={!form.name.trim()} onClick={create}>
            Create prop and get prompt
          </button>
        </div>
      </div>

      <SheetBox keys={picked} onClear={() => setPicked([])} onDone={() => { setPicked([]); reload(); }} />

      <div className="tabs">
        {(["all", "custom", "missing", "ready"] as const).map((f) => (
          <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="bggrid">
        {shown.map((e) => (
          <PropCard key={e.key} e={e} onChanged={reload} pick={picked.includes(e.key) ? picked.indexOf(e.key) : undefined} onPick={() => togglePick(e.key)} />
        ))}
      </div>
    </div>
  );
};

// Several props in one image: pick them on the cards, copy one prompt, drop the sheet.
const SheetBox: React.FC<{ keys: string[]; onClear: () => void; onDone: () => void }> = ({ keys, onClear, onDone }) => {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrompt(null);
    if (keys.length >= 2) api.sheetPrompt(keys).then((r) => setPrompt(r.prompt)).catch((e) => setMsg(String(e)));
  }, [keys]);

  // A sheet dropped before the props are ticked is kept until they are.
  const [pending, setPending] = useState<File | null>(null);
  const upload = async (file?: File) => {
    if (!file) return;
    if (keys.length < 2) {
      setPending(file);
      setMsg(`Got "${file.name}". Now tick the props on the cards below in reading order (top-left, top-right, then the next row), and click Import sheet.`);
      return;
    }
    setMsg("Splitting the sheet and removing the green…");
    try {
      const out = await api.uploadSheet(keys, file);
      setPending(null);
      setMsg(`Imported ${out.map((p) => p.key).join(", ")}`);
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div
      className={`newprop ${over ? "over" : ""}`}
      onDragOver={(ev) => {
        ev.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(ev) => {
        ev.preventDefault();
        setOver(false);
        upload(ev.dataTransfer.files[0]);
      }}
    >
      <h2>Prop sheet: several props in one image</h2>
      <p className="muted small">
        Tick 2 to 9 props on the cards below, in reading order (rows top to bottom, left to right). Copy the prompt, generate it at 1536px or larger if your
        tool allows, then drop the sheet here. Keep large props like trees or doors out of sheets.
      </p>
      {keys.length > 0 && <p className="mono small">{keys.map((k, i) => `${i + 1}. ${k}`).join("   ")}</p>}
      {prompt && <p className="bgprompt">{prompt}</p>}
      <div className="actions">
        <button className="small" disabled={!prompt} onClick={() => prompt && navigator.clipboard.writeText(prompt).then(() => setMsg("Prompt copied"))}>
          Copy sheet prompt
        </button>
        {pending ? (
          <button className="small primary" disabled={keys.length < 2} onClick={() => upload(pending)}>
            Import sheet ({keys.length} ticked)
          </button>
        ) : (
          <button className="small primary" onClick={() => input.current?.click()}>
            Upload sheet
          </button>
        )}
        {keys.length > 0 && (
          <button className="ghost small" onClick={onClear}>
            Clear
          </button>
        )}
        {msg && <span className="muted small">{msg}</span>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(ev) => upload(ev.target.files?.[0])} />
    </div>
  );
};
