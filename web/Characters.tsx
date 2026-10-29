import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, type CharacterEntry } from "./api";

// Character library: illustrated torso + hair/hat per character name. The app writes the
// prompt; the generated image is keyed, split and fitted on upload. The rig still draws the
// head, face and limbs, so expressions, lip sync and poses keep working.

export const CharactersPage: React.FC = () => {
  const [list, setList] = useState<CharacterEntry[]>([]);
  const [form, setForm] = useState({ name: "", outfit: "", hair: "", body: "normal" });
  const [prompt, setPrompt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const reload = useCallback(() => {
    api.characters().then(setList).catch(() => {});
  }, []);
  useEffect(reload, [reload]);

  const makePrompt = async () => {
    setMsg(null);
    try {
      const r = await api.characterPrompt({ outfit: form.outfit, hair: form.hair || undefined, body: form.body });
      setPrompt(r.prompt);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (!form.name.trim()) {
      setMsg("Type the character's name first (exactly as in the cast, e.g. Max), then drop the image again.");
      return;
    }
    setMsg("Removing the green and fitting the pieces…");
    try {
      await api.uploadCharacter(form.name.trim(), file);
      setMsg(`Imported ${form.name.trim()}. Re-render videos to see the new art.`);
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="panel">
      <h1>Character library</h1>
      <p className="muted">
        Give a recurring character an illustrated outfit and hair. Every video whose cast uses the same name shows the art; the face, expressions and poses stay
        animated by the app. Hair is trimmed above the brows automatically so the face stays visible.
      </p>

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
        <h2>Add or update a character</h2>
        <div className="grid settings">
          <div className="field">
            <label className="lbl">Name (as in the cast)</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Max" />
          </div>
          <div className="field">
            <label className="lbl">Body</label>
            <select value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}>
              {["slim", "normal", "broad", "round"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="field wide">
            <label className="lbl">Outfit (with colors)</label>
            <input value={form.outfit} onChange={(e) => setForm({ ...form, outfit: e.target.value })} placeholder="a red hoodie (#d9472b) with a blue (#3fb7ff) drawstring and a front kangaroo pocket" />
          </div>
          <div className="field wide">
            <label className="lbl">Hair or hat (leave empty for a bald classic head)</label>
            <input value={form.hair} onChange={(e) => setForm({ ...form, hair: e.target.value })} placeholder="short spiky dark brown (#5a3a1e) hair" />
          </div>
        </div>
        {prompt && <p className="bgprompt">{prompt}</p>}
        <div className="actions">
          <button className="small" disabled={!form.outfit.trim()} onClick={makePrompt}>
            Write prompt
          </button>
          {prompt && (
            <button className="small" onClick={() => navigator.clipboard.writeText(prompt).then(() => setMsg("Prompt copied"))}>
              Copy prompt
            </button>
          )}
          <button className="small primary" onClick={() => input.current?.click()}>
            Upload image
          </button>
          {msg && <span className="muted small">{msg}</span>}
        </div>
        <p className="muted small">Or drop the generated image anywhere on this box. Torso on the left, hair or hat on the right; a torso alone also works.</p>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(ev) => upload(ev.target.files?.[0])} />
      </div>

      <div className="bggrid">
        {list.length === 0 && <p className="muted">No characters yet.</p>}
        {list.map((c) => (
          <div className="bgcard" key={c.name}>
            <div className="propthumb charthumb">
              {c.torso && <img src={c.torso} alt={`${c.name} torso`} />}
              {c.topper && <img src={c.topper} alt={`${c.name} hair`} />}
            </div>
            <div className="bgmeta">
              <strong>{c.name}</strong>
              {c.sleeve && <span className="swatch" style={{ background: c.sleeve }} title={`Sleeve color ${c.sleeve}`} />}
              <span className="muted small">{c.topper ? "torso + hair/hat" : "torso"}</span>
            </div>
            <div className="row">
              <button className="small" onClick={() => setForm({ ...form, name: c.name })}>
                Replace
              </button>
              <button
                className="ghost small"
                onClick={async () => {
                  if (!confirm(`Remove ${c.name}'s art? Videos go back to the drawn outfit.`)) return;
                  await api.removeCharacter(c.name);
                  reload();
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
