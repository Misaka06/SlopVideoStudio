import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Captions } from "./Episode";
import { FPS } from "./schema";
import { leadFrames, slideFrames, slideTotalFrames, type SlideTimed, type SlideTimeline } from "./slides";

// Image slideshow: a still per scene with a slow camera move, a transition into the scene
// (the incoming scene starts early and plays over the end of the previous one), and the
// narration. Music fades in and out under everything.
export const Slideshow: React.FC<{ timeline: SlideTimeline }> = ({ timeline: t }) => {
  const vertical = t.format === "vertical";
  const total = slideTotalFrames(t);
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {t.scenes.map((scene, i) => {
        const frames = slideFrames(scene);
        const start = from;
        from += frames;
        const lead = i === 0 ? 0 : Math.min(leadFrames(scene.transition), slideFrames(t.scenes[i - 1]));
        return (
          <React.Fragment key={i}>
            <Sequence from={start - lead} durationInFrames={frames + lead}>
              <SlideView t={t} scene={scene} index={i} lead={lead} frames={frames} vertical={vertical} />
            </Sequence>
            {scene.audio && (
              <Sequence from={start} durationInFrames={frames}>
                <Audio src={t.mediaBase + scene.audio} />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}
      {t.music && (
        <Audio
          src={t.mediaBase + t.music}
          loop
          volume={(f) => interpolate(f, [0, FPS, Math.max(total - 2 * FPS, FPS + 1), Math.max(total, FPS + 2)], [0, t.musicVolume, t.musicVolume, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      )}
    </AbsoluteFill>
  );
};

const SlideView: React.FC<{ t: SlideTimeline; scene: SlideTimed; index: number; lead: number; frames: number; vertical: boolean }> = ({ t, scene, index, lead, frames, vertical }) => {
  const f = useCurrentFrame();
  const p = lead + frames > 1 ? f / (lead + frames - 1) : 0;
  const cam = camera(scene, p);
  const sec = (f - lead) / FPS; // seconds since this scene's narration started
  const look = transitionLook(scene.transition, lead > 0 ? Math.min(1, f / lead) : 1, f);

  return (
    <AbsoluteFill style={look.wrap}>
      {look.under}
      <AbsoluteFill style={{ opacity: look.contentOpacity }}>
        <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0b0b12" }}>
          {scene.image ? (
            <Img
              src={t.mediaBase + scene.image}
              style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: cam.origin, transform: `translate(${cam.x}%, ${cam.y}%) scale(${cam.s})` }}
            />
          ) : (
            <Placeholder n={index + 1} prompt={scene.prompt} />
          )}
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 62%, rgba(0,0,0,0.38))" }} />
        {t.captions !== "none" && (
          <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent 28%)" }} />
        )}
        {scene.label && sec >= 0 && <Label text={scene.label} sec={sec} vertical={vertical} />}
        {t.captions !== "none" && sec >= 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: vertical ? 300 : 40, display: "flex", justifyContent: "center" }}>
            {t.captions === "bold" ? (
              <Captions words={scene.words} sec={sec} size={vertical ? 84 : 54} perLine={vertical ? 3 : 5} />
            ) : (
              <SubtleCaptions words={scene.words} sec={sec} size={vertical ? 58 : 40} perLine={vertical ? 4 : 8} />
            )}
          </div>
        )}
      </AbsoluteFill>
      {look.over}
    </AbsoluteFill>
  );
};

type Cam = { s: number; x: number; y: number; origin: string };
const AMOUNT = { subtle: 0.55, normal: 1, strong: 1.6 };

// Zoom amount and pan distance scale with intensity. Pans zoom in just enough that the
// image edges never show; x and y are percentages of the frame.
function camera(scene: SlideTimed, p: number): Cam {
  const k = AMOUNT[scene.intensity] ?? 1;
  const e = p * p * (3 - 2 * p);
  const zoom = 0.16 * k;
  const pan = 0.06 * k;
  const aim = scene.focus ? `${scene.focus[0] * 100}% ${scene.focus[1] * 100}%` : "50% 50%";
  const panScale = 1 + 2 * pan + 0.02;
  switch (scene.camera) {
    case "zoomIn":
      return { s: 1 + zoom * e, x: 0, y: 0, origin: aim };
    case "zoomOut":
      return { s: 1 + zoom - zoom * e, x: 0, y: 0, origin: aim };
    // Pan names say where the camera travels: panLeft ends on the left side of the image.
    case "panLeft":
      return { s: panScale, x: (-pan + 2 * pan * e) * 100, y: 0, origin: "50% 50%" };
    case "panRight":
      return { s: panScale, x: (pan - 2 * pan * e) * 100, y: 0, origin: "50% 50%" };
    case "panUp":
      return { s: panScale, x: 0, y: (-pan + 2 * pan * e) * 100, origin: "50% 50%" };
    case "panDown":
      return { s: panScale, x: 0, y: (pan - 2 * pan * e) * 100, origin: "50% 50%" };
    case "pushIn": {
      const q = Math.min(1, p * 2.5);
      return { s: 1 + 0.3 * k * (1 - Math.pow(1 - q, 3)), x: 0, y: 0, origin: aim };
    }
    default:
      return { s: 1, x: 0, y: 0, origin: "50% 50%" };
  }
}

// How the scene arrives; t runs 0..1 over the lead frames.
function transitionLook(kind: SlideTimed["transition"], t: number, f: number) {
  const e = t * t * (3 - 2 * t);
  const out: { wrap: React.CSSProperties; contentOpacity: number; under: React.ReactNode; over: React.ReactNode } = { wrap: {}, contentOpacity: 1, under: null, over: null };
  if (t >= 1 && kind !== "flash") return out;
  switch (kind) {
    case "crossfade":
      out.wrap = { opacity: e };
      break;
    case "dip":
      out.under = <AbsoluteFill style={{ background: "#000", opacity: Math.min(1, t * 2) }} />;
      out.contentOpacity = Math.max(0, (t - 0.5) * 2);
      break;
    case "slideLeft":
      out.wrap = { transform: `translateX(${(1 - e) * 100}%)` };
      break;
    case "slideRight":
      out.wrap = { transform: `translateX(${-(1 - e) * 100}%)` };
      break;
    case "wipe":
      out.wrap = { clipPath: `inset(0 ${(1 - e) * 100}% 0 0)` };
      break;
    case "zoom":
      out.wrap = { opacity: e, transform: `scale(${1 + (1 - e) * 0.5})` };
      break;
    case "blur":
      out.wrap = { opacity: e, filter: `blur(${(1 - e) * 24}px)` };
      break;
    case "flash":
      if (f < 10) out.over = <AbsoluteFill style={{ background: "#fff", opacity: interpolate(f, [0, 10], [1, 0]) }} />;
      break;
  }
  return out;
}

// Stand-in until the real image is added, so the preview and a draft render still read.
const Placeholder: React.FC<{ n: number; prompt: string }> = ({ n, prompt }) => (
  <AbsoluteFill style={{ background: "linear-gradient(135deg, #1b2036, #2d2547)", alignItems: "center", justifyContent: "center", padding: 120, color: "#b7bdd6", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
    <div style={{ fontSize: 120, fontWeight: 800, opacity: 0.5 }}>Image {n}</div>
    <div style={{ fontSize: 34, marginTop: 24, maxWidth: 1200, opacity: 0.6, lineHeight: 1.35 }}>{prompt.slice(0, 220)}</div>
  </AbsoluteFill>
);

const Label: React.FC<{ text: string; sec: number; vertical: boolean }> = ({ text, sec, vertical }) => {
  const opacity = interpolate(sec, [0.2, 0.7, 4.6, 5.2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slide = interpolate(sec, [0.2, 0.8], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: vertical ? 56 : 90,
        top: vertical ? 120 : 80,
        opacity,
        transform: `translateX(${slide}px)`,
        borderLeft: "8px solid #ffd23f",
        background: "rgba(10,10,18,0.62)",
        color: "#fff",
        padding: "10px 28px",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: vertical ? 54 : 48,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
};

// Plain white lines at the bottom; the word being spoken is brighter.
const SubtleCaptions: React.FC<{ words: SlideTimed["words"]; sec: number; size: number; perLine: number }> = ({ words, sec, size, perLine }) => {
  if (!words.length) return null;
  let idx = words.findIndex((w) => sec < w.end);
  if (idx === -1) idx = words.length - 1;
  const groupStart = Math.floor(idx / perLine) * perLine;
  return (
    <div style={{ textAlign: "center", fontFamily: "Arial, sans-serif", fontWeight: 600, fontSize: size, lineHeight: 1.25, maxWidth: "82%", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
      {words.slice(groupStart, groupStart + perLine).map((w, i) => (
        <span key={i} style={{ margin: "0 0.22em", color: "#fff", opacity: groupStart + i === idx ? 1 : 0.78 }}>
          {w.w}
        </span>
      ))}
    </div>
  );
};
