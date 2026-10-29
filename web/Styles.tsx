import React, { useCallback, useEffect, useRef, useState } from "react";
import type { SlidePreset } from "../src/slides";
import { api, type PresetEntry } from "./api";

// Looks (presets) for image slideshows: each has a hero character; its character sheet (the
// "style anchor") is generated once from the prompt here, saved, and attached to every image
// request that features the hero so he looks identical in every scene.

export function usePresets() {
  const [list, setList] = useState<PresetEntry[] | null>(null);
  const reload = useCallback(() => {
    api.presets().then(setList).catch(() => {});
  }, []);
  useEffect(reload, [reload]);
  return { list, reload };
}

const copyText = (t: string) => navigator.clipboard.writeText(t);

// The clipboard only takes PNG, so the JPEG is redrawn on a canvas first.
async function copyImage(url: string) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob());
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  const png = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej()), "image/png"));
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

export const AnchorCard: React.FC<{ p: PresetEntry; selected?: boolean; onSelect?: () => void; onChanged: () => void; compact?: boolean }> = ({ p, selected, onSelect, onChanged, compact }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const note = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3500);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      await api.uploadAnchor(p.key, file);
      onChanged();
      note("Anchor saved");
    } catch (e) {
      note(e instanceof Error ? e.message : String(e));
    }
  };
  // The Paste button reads the clipboard directly; browsers that refuse still support Ctrl+V on the Style anchors page.
  const paste = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) return void upload(new File([await item.getType(type)], "pasted", { type }));
      }
      note("There is no image on the clipboard");
    } catch {
      note("This browser blocks the button: press Ctrl+V on the Style anchors page instead");
    }
  };
  const copyImg = async () => {
    try {
      await copyImage(p.anchorUrl!);
      note("Image copied. Paste it into your image generator with the prompt.");
    } catch {
      note("Could not copy automatically: right-click the image and choose Copy image");
    }
  };

  return (
    <div
      className={`bgcard anchorcard ${over ? "over" : ""} ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
    >
      <div className="bgmeta">
        <strong>{p.label}</strong>
        <span className={`pill ${p.anchorUrl ? "done" : "running"}`}>{p.anchorUrl ? "anchor ready" : "anchor missing"}</span>
        {selected && <span className="pill queued">Ctrl+V pastes here</span>}
      </div>
      <p className="muted small tightp">{p.blurb} Hero: <strong>{p.hero}</strong>.</p>
      <div className="bgthumb sheet" onClick={() => input.current?.click()}>
        {p.anchorUrl ? <img src={p.anchorUrl} alt={`${p.hero} character sheet`} /> : <span>Generate the character sheet with the prompt, then drop or paste it here</span>}
      </div>
      {!p.anchorUrl && <p className="bgprompt tall">{p.anchorPrompt}</p>}
      <div className="row">
        <button className={p.anchorUrl ? "small" : "small primary"} onClick={async () => { await copyText(p.anchorPrompt); note("Anchor prompt copied"); }}>Copy anchor prompt</button>
        {p.anchorUrl && <button className="small" onClick={copyImg}>Copy image</button>}
        {p.anchorUrl && <a className="btn small" href={p.anchorUrl} download={p.anchorFile}>Download</a>}
        <button className="small" onClick={paste}>Paste image</button>
        <button className="small" onClick={() => input.current?.click()}>{p.anchorUrl ? "Replace" : "Upload"}</button>
        {msg && <span className="muted small">{msg}</span>}
      </div>
      {!compact && (
        <details className="looknotes" onClick={(e) => e.stopPropagation()}>
          <summary>Look details and test prompts</summary>
          {p.anchorUrl && <p className="bgprompt tall"><strong>Anchor prompt:</strong> {p.anchorPrompt}</p>}
          <p className="bgprompt tall"><strong>Art direction (characters and scenery):</strong> {p.style}</p>
          <p className="bgprompt tall"><strong>{p.hero}:</strong> {p.look}</p>
          {p.tests.map((t) => (
            <div key={t.label}>
              <div className="row">
                <strong className="small">Test: {t.label}</strong>
                <button className="small" onClick={async () => { await copyText(t.prompt); note("Test prompt copied"); }}>Copy</button>
              </div>
              <p className="bgprompt tall">{t.prompt}</p>
            </div>
          ))}
        </details>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
};

// Pick the look of a new slideshow: the anchor image (when it exists) previews it.
export const PresetPicker: React.FC<{ value: SlidePreset; presets: PresetEntry[] | null; onChange: (p: SlidePreset) => void }> = ({ value, presets, onChange }) => (
  <div className="presetgrid">
    {(presets ?? []).map((p) => (
      <button key={p.key} className={`presetcard ${value === p.key ? "on" : ""}`} onClick={() => onChange(p.key)}>
        <div className="presetthumb">{p.anchorUrl ? <img src={p.anchorUrl} alt="" /> : <span>no anchor yet</span>}</div>
        <strong>{p.label}</strong>
        <span className="muted small">{p.blurb}</span>
      </button>
    ))}
    <button className={`presetcard ${value === "" ? "on" : ""}`} onClick={() => onChange("")}>
      <div className="presetthumb"><span>your own style</span></div>
      <strong>Free style</strong>
      <span className="muted small">The AI invents the art direction and characters for each video.</span>
    </button>
  </div>
);

export const StylesPage: React.FC = () => {
  const { list, reload } = usePresets();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Ctrl+V on this page saves a copied image as the anchor of the selected look (else the first one without).
  const pasteRef = useRef<(f: File) => void>(() => {});
  pasteRef.current = async (file) => {
    const key = selected ?? list?.find((p) => !p.anchorUrl)?.key;
    if (!key) return setNote("Click a look first, then paste");
    try {
      await api.uploadAnchor(key, file);
      reload();
      setNote(`Saved the anchor of ${list?.find((p) => p.key === key)?.label ?? key}`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (!file) return;
      e.preventDefault();
      pasteRef.current(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="panel">
      <h1>Style anchors</h1>
      <p className="muted">
        Each look for image slideshows has its own hero character and matching scenery. Generate the hero's character sheet once with its prompt, then drop or paste it here (click a card, then Ctrl+V).
        That image is the <strong>style anchor</strong>: attach it to every image request whose prompt starts with "Use the attached reference image", and the hero looks the same in every scene.
        The test prompts let you check how a look handles a scene and its scenery before you commit to it.
      </p>
      {note && <div className="banner warn">{note}</div>}
      <div className="bggrid">
        {(list ?? []).map((p) => (
          <AnchorCard key={p.key} p={p} selected={selected === p.key} onSelect={() => setSelected(p.key)} onChanged={reload} />
        ))}
      </div>
    </div>
  );
};
