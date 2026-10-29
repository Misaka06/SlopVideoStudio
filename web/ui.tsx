import React from "react";
import type { Config, Settings, Summary } from "./api";

// Small widgets shared by the episode and slideshow screens.

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export const StatusPill: React.FC<{ p: Pick<Summary, "status" | "message" | "next"> & Partial<Pick<Summary, "kind" | "imagesMissing">> }> = ({ p }) => {
  const idle = p.kind === "slideshow" ? (p.next === "render" ? (p.imagesMissing ? `${p.imagesMissing} images needed` : "Ready to render") : "Script ready") : p.next === "voice" ? "Script ready" : "Idle";
  const label = p.status === "running" ? p.message : p.status === "queued" ? "Queued" : p.status === "done" ? "Ready" : p.status === "error" ? "Error" : idle;
  return <span className={`pill ${p.status}`}>{label}</span>;
};

export const Progress: React.FC<{ value: number }> = ({ value }) => (
  <div className="progress">
    <div style={{ width: `${Math.round(value * 100)}%` }} />
  </div>
);

export const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <div className={`field ${wide ? "wide" : ""}`}>
    <label className="lbl">{label}</label>
    {children}
  </div>
);

export const Sel: React.FC<{ value: string; options: readonly string[]; onChange: (v: string) => void; title?: string }> = ({ value, options, onChange, title }) => (
  <select value={value} title={title} onChange={(e) => onChange(e.target.value)}>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

export const SettingsForm: React.FC<{ config: Config; s: Settings; setS: (s: Settings) => void; slideshow?: boolean }> = ({ config, s, setS, slideshow }) => {
  const voices = config.voices[s.lang];
  return (
    <div className="grid settings">
      <Field label="Format">
        <div className="seg">
          <button className={s.format === "landscape" ? "on" : ""} onClick={() => setS({ ...s, format: "landscape" })}>16:9 YouTube</button>
          <button className={s.format === "vertical" ? "on" : ""} onClick={() => setS({ ...s, format: "vertical" })}>9:16 Shorts</button>
        </div>
      </Field>
      <Field label="Language">
        <select value={s.lang} onChange={(e) => { const lang = e.target.value as Settings["lang"]; setS({ ...s, lang, voice: config.voices[lang][0].id }); }}>
          <option value="en-us">English (US)</option>
          <option value="en-gb">English (UK)</option>
          <option value="es">Spanish</option>
        </select>
      </Field>
      <Field label="Voice">
        <select value={s.voice} onChange={(e) => setS({ ...s, voice: e.target.value })}>
          {voices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </Field>
      <Field label={`Speed ${s.speed.toFixed(2)}×`}>
        <input type="range" min={0.8} max={1.3} step={0.05} value={s.speed} onChange={(e) => setS({ ...s, speed: Number(e.target.value) })} />
      </Field>
      <Field label="Music">
        <select value={s.music ?? ""} onChange={(e) => setS({ ...s, music: e.target.value || null })}>
          <option value="">None</option>
          {config.music.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      {slideshow ? (
        <>
          <Field label={`Music volume ${Math.round(s.musicVolume * 100)}%`}>
            <input type="range" min={0.02} max={0.4} step={0.01} value={s.musicVolume} onChange={(e) => setS({ ...s, musicVolume: Number(e.target.value) })} />
          </Field>
          <Field label="Captions">
            <Sel value={s.captions} options={config.options.captions} onChange={(v) => setS({ ...s, captions: v as Settings["captions"] })} />
          </Field>
        </>
      ) : (
        <Field label="Backgrounds">
          <label className="check">
            <input type="checkbox" checked={s.imageBackgrounds !== false} onChange={(e) => setS({ ...s, imageBackgrounds: e.target.checked })} /> use library images when available
          </label>
        </Field>
      )}
    </div>
  );
};
