import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { Figure } from "./character/Figure";
import { BackgroundArt } from "./world/Backgrounds";
import { FOREGROUND_PIECES, SetPieceArt } from "./world/SetPieces";
import { bgKey, FPS, normalizeEpisode, skinKey, type CastT, type SceneCharT, type Timeline, type TimedScene } from "./schema";

const FLOOR_Y = 960;
const FIGURE_SCALE = 1.75;
const sceneX = (x: number) => 200 + x * 1520;

const DEFAULT_LOOK: CastT = normalizeEpisode({ cast: [{}] }).cast[0];

// Seat surface height of set pieces a character can sit on (figure units, floor = 0),
// and where a seated character's hips are before lifting.
const SEATED_HIP = -38;
const SEAT_TOP: Partial<Record<TimedScene["set"][number]["kind"], number>> = { bench: -56, couch: -90, throne: -130, bed: -96, chest: -100, crates: -110 };

// SVG <image> isn't awaited by the renderer, so hold the first frame until every prop
// image this episode uses has loaded.
function usePreloadProps(t: Timeline) {
  const urls = useMemo(() => {
    const ids = new Set<string>();
    for (const s of t.scenes) {
      s.set.forEach((p) => ids.add(`set:${p.kind}`));
      s.chars.forEach((c) => c.holds !== "none" && ids.add(`held:${c.holds}`));
    }
    const castKeys = new Set(t.cast.map((c) => skinKey(c.name)));
    const skinUrls = Object.entries(t.skins ?? {}).filter(([k]) => castKeys.has(k)).flatMap(([, s]) => [s.torso?.url, s.topper?.url, s.head?.url]);
    return [...[...ids].map((id) => t.props?.[id]?.url), ...skinUrls].filter((u): u is string => Boolean(u)).map((u) => t.mediaBase + u);
  }, [t]);
  const [handle] = useState(() => (urls.length ? delayRender("Loading prop images") : null));
  useEffect(() => {
    if (handle === null) return;
    Promise.all(urls.map((u) => new Promise((done) => {
      const img = new Image();
      img.onload = img.onerror = () => done(null);
      img.src = u;
    }))).then(() => continueRender(handle));
  }, [handle, urls]);
}

export const Episode: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  usePreloadProps(timeline);
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {timeline.scenes.map((scene, i) => {
        const frames = Math.max(1, Math.round(scene.durationSec * FPS));
        const start = from;
        from += frames;
        const prev = timeline.scenes[i - 1];
        return (
          <Sequence key={i} from={start} durationInFrames={frames}>
            {scene.audio ? (
              <AudioLevel src={timeline.mediaBase + scene.audio}>
                {(level) => <SceneView t={timeline} scene={scene} prev={prev} frames={frames} level={level} />}
              </AudioLevel>
            ) : (
              <SceneView t={timeline} scene={scene} prev={prev} frames={frames} level={null} />
            )}
            {scene.audio && <Audio src={timeline.mediaBase + scene.audio} />}
          </Sequence>
        );
      })}
      {timeline.music && <Audio src={timeline.mediaBase + timeline.music} volume={0.12} loop />}
    </AbsoluteFill>
  );
};

// Loudness of the narration at the current frame (0..1), used for lip sync.
const AudioLevel: React.FC<{ src: string; children: (level: number | null) => React.ReactNode }> = ({ src, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = useAudioData(src);
  if (!data) return <>{children(null)}</>;
  const bands = visualizeAudio({ fps, frame, audioData: data, numberOfSamples: 16 });
  const level = Math.min(1, (bands.slice(0, 6).reduce((a, b) => a + b, 0) / 6) * 6);
  return <>{children(level)}</>;
};

const SceneView: React.FC<{ t: Timeline; scene: TimedScene; prev?: TimedScene; frames: number; level: number | null }> = ({ t, scene, prev, frames, level }) => {
  const frame = useCurrentFrame();
  const sec = frame / FPS;
  const vertical = t.format === "vertical";

  // Without audio data, fake mouth movement while a word is being spoken.
  const speaking = scene.words.some((w) => sec >= w.start && sec <= w.end);
  const mouth = level ?? (speaking ? (Math.sin(frame / 2.4) + 1) / 2 : 0);

  const stage = <Stage t={t} scene={scene} prev={prev} frames={frames} mouth={mouth} vertical={vertical} />;
  const enter = enterTransform(scene.transition, frame);

  return (
    <AbsoluteFill style={{ transform: enter.transform, clipPath: enter.clip }}>
      {vertical ? (
        <AbsoluteFill style={{ background: "linear-gradient(#0d0d14, #1c1c2b)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1440, overflow: "hidden" }}>{stage}</div>
          <div style={{ position: "absolute", top: 1440, left: 0, right: 0, height: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Captions words={scene.words} sec={sec} size={84} perLine={3} />
          </div>
        </AbsoluteFill>
      ) : (
        <>
          {stage}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 36, display: "flex", justifyContent: "center" }}>
            <Captions words={scene.words} sec={sec} size={54} perLine={5} />
          </div>
        </>
      )}
      {scene.label && <NamePlate text={scene.label} vertical={vertical} />}
      {scene.hud && <Hud text={scene.hud} />}
      <TransitionOverlay kind={scene.transition} frame={frame} />
      {scene.effect === "flash" && <AbsoluteFill style={{ background: "#fff", opacity: interpolate(frame, [0, 10], [0.9, 0], { extrapolateRight: "clamp" }) }} />}
    </AbsoluteFill>
  );
};

// The sticker look: white cut-out outline plus a soft drop shadow.
const StickerFilter: React.FC = () => (
  <defs>
    <filter id="sticker" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="5" result="grown" />
      <feFlood floodColor="#ffffff" result="white" />
      <feComposite in="white" in2="grown" operator="in" result="outline" />
      {/* Hard, flat offset shadow (no blur) like a printed die-cut sticker. */}
      <feOffset in="grown" dx="3" dy="5" result="offset" />
      <feFlood floodColor="#1a1030" floodOpacity="0.22" result="dark" />
      <feComposite in="dark" in2="offset" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="outline" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <radialGradient id="contact">
      <stop offset="0" stopColor="rgba(20,10,40,0.38)" />
      <stop offset="1" stopColor="rgba(20,10,40,0)" />
    </radialGradient>
  </defs>
);

const TIME_TINT: Record<TimedScene["time"], string | null> = { day: null, sunset: "#ffd2b0", night: "#8f98d8" };

type Cam = { s: number; tx: number; rot: number };

const Stage: React.FC<{ t: Timeline; scene: TimedScene; prev?: TimedScene; frames: number; mouth: number; vertical: boolean }> = ({ t, scene, prev, frames, mouth, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = frames > 1 ? frame / (frames - 1) : 0;
  const ease = p * p * (3 - 2 * p);

  const focusChar = scene.chars.find((c) => c.talking) ?? scene.chars[0];
  const focusX = focusChar ? sceneX(focusChar.x) / 1920 : 0.5;
  const cam = camera(scene.camera, ease, p);
  let jolt = "";
  if (scene.effect === "shake") jolt = ` translate(${Math.sin(frame * 1.9) * 9}px, ${Math.cos(frame * 2.3) * 7}px)`;
  const glitching = scene.effect === "glitch" && frame % 24 < 3;
  if (glitching) jolt += ` translateX(${(frame % 2 ? 1 : -1) * 18}px)`;
  const origin = scene.camera === "closeUp" || scene.camera === "pushIn" ? `${focusX * 100}% 45%` : "50% 60%";
  const fg = `translateX(${cam.tx}px) scale(${cam.s}) rotate(${cam.rot}deg)${jolt}`;
  // Background moves less than the foreground (parallax) and is slightly enlarged to hide blurred edges.
  const bg = `translateX(${cam.tx * 0.5}px) scale(${1.03 + (cam.s - 1) * 0.6}) rotate(${cam.rot * 0.5}deg)${jolt}`;

  // Vertical: crop a 3:4 window around the characters. When they stand too far apart,
  // widen the window and let it sit at the bottom (dark band above) instead of cutting them off.
  let viewBox = "0 0 1920 1080";
  let fit = "xMidYMid slice";
  if (vertical) {
    const xs = scene.chars.map((c) => sceneX(c.x));
    const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 960;
    const span = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const w = Math.min(1920, Math.max(810, span + 440));
    const left = Math.max(0, Math.min(1920 - w, cx - w / 2));
    viewBox = `${left} 0 ${w} 1080`;
    if (w > 810) fit = "xMidYMax meet";
  }

  const looks = new Map(t.cast.map((c) => [c.name, c]));
  const prevNames = new Set(prev?.chars.map((c) => c.name) ?? []);
  const prevPieces = new Set(prev && prev.bg === scene.bg ? prev.set.map((s) => s.kind) : []);
  const propImg = (kind: string, use: "set" | "held") => t.props?.[`${use}:${kind}`];
  const isFront = (kind: string) => propImg(kind, "set")?.front ?? FOREGROUND_PIECES.has(kind);
  const back = scene.set.filter((s) => !isFront(s.kind));
  const front = scene.set.filter((s) => isFront(s.kind));
  const time = scene.time ?? "day";
  const tint = TIME_TINT[time];
  const bgImage = t.bgImages?.[bgKey(scene.bg, time)];

  // New stickers pop in one after another; ones already on screen in the previous scene don't.
  const popAt = (delay: number, isNew: boolean) => (isNew ? spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 170, mass: 0.7 } }) : 1);

  const piece = (s: (typeof scene.set)[number], i: number, key: string) => (
    <SetPieceArt key={key} kind={s.kind} px={sceneX(s.x)} floorY={FLOOR_Y} frame={frame} pop={popAt(2 + i * 3, !prevPieces.has(s.kind))} image={propImg(s.kind, "set")} base={t.mediaBase} />
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: bg, transformOrigin: origin, filter: `blur(${bgImage ? 1.6 : 1.1}px) saturate(0.92)${glitching ? " hue-rotate(90deg)" : ""}` }}>
        {bgImage && <Img src={t.mediaBase + bgImage} style={{ position: "absolute", objectFit: "cover", ...placeLikeSvg(viewBox, fit, vertical ? 1080 : 1920, vertical ? 1440 : 1080) }} />}
        <svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio={fit} style={{ position: "absolute", inset: 0 }}>
          {!bgImage && <BackgroundArt kind={scene.bg} time={time} />}
          <Ambience time={time} frame={frame} />
        </svg>
      </AbsoluteFill>
      <Grain />
      <AbsoluteFill style={{ transform: fg, transformOrigin: origin, filter: glitching ? "hue-rotate(90deg) saturate(2)" : undefined }}>
        <svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio={fit}>
          <StickerFilter />
          {back.map((s, i) => piece(s, i, `b${i}`))}
          {scene.chars.map((c, i) => {
            const look = { ...DEFAULT_LOOK, ...looks.get(c.name) };
            const { px, walkPhase } = walkPosition(c, frame, frames);
            const motion = actionMotion(c, frame);
            const pop = c.action === "walkIn" ? 1 : popAt(4 + i * 4, !prevNames.has(c.name));
            // Seated characters sit on a nearby bench/couch/etc. at its height, else on their own stump.
            const seat = c.pose === "sit" ? scene.set.find((s) => s.kind in SEAT_TOP && Math.abs(s.x - c.x) < 0.1) : undefined;
            const seatLift = seat ? SEATED_HIP - SEAT_TOP[seat.kind]! : 0;
            return (
              <g key={c.name + i} transform={`translate(${px} ${FLOOR_Y}) scale(${FIGURE_SCALE})`}>
                <ellipse cx={0} cy={2} rx={62 * look.scale * (1 - Math.min(motion.lift, 120) / 300)} ry={12} fill="url(#contact)" />
                <Figure look={look} c={{ ...c, emote: c.emote ?? "none" }} seed={i} m={{ frame, walkPhase, mouth: c.talking ? mouth : 0, pop, ...motion, lift: motion.lift + seatLift, stump: !seat }} held={c.holds !== "none" ? propImg(c.holds, "held") : undefined} base={t.mediaBase} skin={t.skins?.[skinKey(c.name)]} />
              </g>
            );
          })}
          {front.map((s, i) => piece(s, i + back.length, `f${i}`))}
          <Particles kind={scene.effect} frame={frame} />
        </svg>
      </AbsoluteFill>
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "multiply" }} />}
      {time === "night" && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 70%, rgba(255,220,160,0.12), transparent 60%)" }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(10,5,25,0.42))" }} />
    </AbsoluteFill>
  );
};

// Jump/bounce/float with squash and stretch; tremble and spin.
function actionMotion(c: SceneCharT, frame: number) {
  let lift = 0;
  let squash = 1;
  if (c.action === "jump") {
    const ph = Math.sin(frame / 6);
    lift = Math.max(0, ph) * 70;
    squash = ph > 0 ? 1 + ph * 0.06 : 1 + ph * 0.1; // stretch in the air, squash on landing
  } else if (c.action === "bounce") {
    const ph = Math.abs(Math.sin(frame / 5));
    lift = ph * 18;
    squash = 1 - (1 - ph) * 0.06;
  } else if (c.action === "float") {
    lift = 50 + Math.sin(frame / 12) * 14;
  }
  return { lift, squash, tremble: c.action === "tremble" ? 2.5 : 0, spin: c.action === "spin" ? Math.cos(frame / 5) : 1 };
}

function walkPosition(c: SceneCharT, frame: number, frames: number) {
  const target = sceneX(c.x);
  const walkFrames = Math.min(54, Math.round(frames * 0.45));
  const easeOut = (k: number) => 1 - Math.pow(1 - k, 2);
  if (c.action === "walkIn" && frame < walkFrames) {
    const from = c.facing === "right" ? -220 : 2140;
    const k = frame / walkFrames;
    return { px: from + (target - from) * easeOut(k), walkPhase: (frame / 3.4) * (1 - k * 0.3) };
  }
  if (c.action === "walkOut") {
    const startAt = frames - walkFrames;
    if (frame >= startAt) {
      const to = c.facing === "right" ? 2140 : -220;
      const k = (frame - startAt) / walkFrames;
      return { px: target + (to - target) * k * k, walkPhase: frame / 3.4 };
    }
  }
  return { px: target, walkPhase: null };
}

function camera(kind: TimedScene["camera"], e: number, p: number): Cam {
  switch (kind) {
    case "zoomIn":
      return { s: 1 + 0.16 * e, tx: 0, rot: 0 };
    case "zoomOut":
      return { s: 1.16 - 0.16 * e, tx: 0, rot: 0 };
    case "panLeft":
      return { s: 1.1, tx: 70 - 140 * e, rot: 0 };
    case "panRight":
      return { s: 1.1, tx: -70 + 140 * e, rot: 0 };
    case "closeUp":
      return { s: 1.5 + 0.05 * e, tx: 0, rot: 0 };
    case "dutch":
      return { s: 1.14 + 0.05 * e, tx: 0, rot: -4 + e };
    case "pushIn": {
      const k = Math.min(1, p * 2.5);
      return { s: 1 + 0.38 * (1 - Math.pow(1 - k, 3)), tx: 0, rot: 0 };
    }
    default:
      return { s: 1, tx: 0, rot: 0 };
  }
}

// Fine paper grain over the background so stickers read as cut-outs on a printed backdrop.
const Grain: React.FC = () => (
  <AbsoluteFill style={{ opacity: 0.08, mixBlendMode: "overlay", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

// Gentle floating light in the background: dust by day, warm bokeh at sunset, fireflies at night.
const Ambience: React.FC<{ time: TimedScene["time"]; frame: number }> = ({ time, frame }) => {
  const color = time === "night" ? "#fff3a0" : time === "sunset" ? "#ffd2a0" : "#ffffff";
  const n = time === "night" ? 22 : 16;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const x = ((i * 263 + frame * (0.4 + (i % 3) * 0.2)) % 2000) - 40;
        const y = 120 + ((i * 157) % 700) + Math.sin(frame / 30 + i) * 20;
        const tw = time === "night" ? 0.3 + 0.7 * Math.max(0, Math.sin(frame / 10 + i * 1.7)) : 0.5;
        const r = time === "sunset" ? 10 + (i % 4) * 6 : 3 + (i % 3) * 2;
        return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={(time === "sunset" ? 0.15 : 0.35) * tw} />;
      })}
    </g>
  );
};

// Scene entrances that move or clip the whole scene.
function enterTransform(kind: TimedScene["transition"], frame: number): { transform?: string; clip?: string } {
  if (kind === "slide" && frame < 14) {
    const k = interpolate(frame, [0, 12], [1, 0], { extrapolateRight: "clamp" });
    return { transform: `translateX(${k * k * 100}%)` };
  }
  if (kind === "iris" && frame < 16) {
    const r = interpolate(frame, [0, 15], [0, 75], { extrapolateRight: "clamp" });
    return { clip: `circle(${r}% at 50% 50%)` };
  }
  return {};
}

const TransitionOverlay: React.FC<{ kind: TimedScene["transition"]; frame: number }> = ({ kind, frame }) => {
  if (frame > 14) return null;
  if (kind === "fade") return <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [0, 12], [1, 0], { extrapolateRight: "clamp" }) }} />;
  if (kind === "wipe") {
    const x = interpolate(frame, [0, 12], [0, 105], { extrapolateRight: "clamp" });
    return <AbsoluteFill style={{ background: "#000", transform: `translateX(${x}%) skewX(-12deg)` }} />;
  }
  if (kind === "zoom") {
    const o = interpolate(frame, [0, 10], [0.8, 0], { extrapolateRight: "clamp" });
    return <AbsoluteFill style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9), rgba(0,0,0,0.9))", opacity: o }} />;
  }
  if (kind === "flash") return <AbsoluteFill style={{ background: "#fff", opacity: interpolate(frame, [0, 8], [1, 0], { extrapolateRight: "clamp" }) }} />;
  return null;
};

const Particles: React.FC<{ kind: TimedScene["effect"]; frame: number }> = ({ kind, frame }) => {
  switch (kind) {
    case "rain":
      return (
        <g stroke="rgba(190,210,255,0.6)" strokeWidth={3} strokeLinecap="round">
          {Array.from({ length: 90 }).map((_, i) => {
            const x = (i * 211 + frame * 6) % 2000;
            const y = ((i * 137 + frame * 38) % 1150) - 60;
            return <line key={i} x1={x} y1={y} x2={x - 10} y2={y + 40} />;
          })}
        </g>
      );
    case "snow":
      return (
        <g fill="rgba(255,255,255,0.9)">
          {Array.from({ length: 80 }).map((_, i) => <circle key={i} cx={(i * 241 + Math.sin((frame + i * 9) / 20) * 30) % 1920} cy={(i * 97 + frame * 3) % 1100} r={3 + (i % 4)} />)}
        </g>
      );
    case "confetti": {
      const colors = ["#ff4d6d", "#ffd23f", "#3bceac", "#5e60ce", "#ff9f1c"];
      return (
        <g>
          {Array.from({ length: 70 }).map((_, i) => {
            const x = (i * 173) % 1920;
            const y = ((i * 61 + frame * (6 + (i % 4))) % 1120) - 40;
            return <rect key={i} x={x} y={y} width={16} height={9} rx={3} fill={colors[i % 5]} transform={`rotate(${(frame * 8 + i * 40) % 360} ${x} ${y})`} />;
          })}
        </g>
      );
    }
    case "sparkles":
      return (
        <g fill="#fff6b0">
          {Array.from({ length: 26 }).map((_, i) => {
            const k = Math.max(0, Math.sin(frame / 6 + i * 1.3));
            return <path key={i} transform={`translate(${(i * 331) % 1900} ${120 + ((i * 197) % 760)}) scale(${k * 1.3})`} d="M 0 -18 Q 2 -2 18 0 Q 2 2 0 18 Q -2 2 -18 0 Q -2 -2 0 -18 Z" />;
          })}
        </g>
      );
    case "hearts":
      return (
        <g filter="url(#sticker)">
          {Array.from({ length: 18 }).map((_, i) => {
            const y = 1100 - ((i * 113 + frame * 4) % 1200);
            const x = ((i * 271) % 1920) + Math.sin(frame / 12 + i) * 20;
            return <path key={i} transform={`translate(${x} ${y}) scale(${0.9 + (i % 3) * 0.3})`} d="M 0 14 C -26 -4 -14 -22 0 -10 C 14 -22 26 -4 0 14 Z" fill={i % 2 ? "#ff4d7a" : "#ff8fb0"} />;
          })}
        </g>
      );
    case "moneyRain":
      return (
        <g filter="url(#sticker)">
          {Array.from({ length: 30 }).map((_, i) => {
            const x = ((i * 197) % 1920) + Math.sin(frame / 8 + i) * 30;
            const y = ((i * 89 + frame * (5 + (i % 3))) % 1150) - 60;
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${Math.sin(frame / 7 + i) * 40})`}>
                <rect x={-26} y={-13} width={52} height={26} rx={6} fill="#7fd86f" stroke="#16151d" strokeWidth={3.5} />
                <circle r={7} fill="#4aa83f" />
              </g>
            );
          })}
        </g>
      );
    case "speedLines":
      return (
        <g stroke="rgba(255,255,255,0.75)" strokeLinecap="round">
          {Array.from({ length: 40 }).map((_, i) => {
            const a = (i / 40) * Math.PI * 2 + (frame % 3) * 0.05;
            const r1 = 520 + ((i * 37 + frame * 13) % 120);
            return <line key={i} x1={960 + Math.cos(a) * r1} y1={540 + Math.sin(a) * r1 * 0.6} x2={960 + Math.cos(a) * 1300} y2={540 + Math.sin(a) * 800} strokeWidth={3 + (i % 3) * 2} />;
          })}
        </g>
      );
    case "fog":
      return (
        <g>
          {Array.from({ length: 6 }).map((_, i) => (
            <ellipse key={i} cx={((i * 400 + frame * (1 + (i % 2))) % 2400) - 240} cy={800 + (i % 3) * 60} rx={420} ry={80} fill="rgba(230,235,245,0.2)" />
          ))}
        </g>
      );
    case "embers":
      return (
        <g>
          {Array.from({ length: 40 }).map((_, i) => {
            const y = 1100 - ((i * 101 + frame * 3) % 1200);
            const x = ((i * 241) % 1920) + Math.sin(frame / 10 + i) * 30;
            return <circle key={i} cx={x} cy={y} r={2 + (i % 3)} fill={i % 2 ? "#ffb13d" : "#ff5a1f"} opacity={0.85} />;
          })}
        </g>
      );
    default:
      return null;
  }
};

const NamePlate: React.FC<{ text: string; vertical: boolean }> = ({ text, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <div
      style={{
        position: "absolute",
        left: vertical ? 60 : 80,
        top: vertical ? 120 : 70,
        transform: `scale(${0.6 + 0.4 * k}) rotate(${(1 - k) * -6 - 2}deg)`,
        transformOrigin: "left center",
        opacity: Math.min(1, k * 2),
        background: "#fff8e8",
        color: "#1d2b44",
        border: "5px solid #16151d",
        outline: "6px solid #fff",
        borderRadius: 18,
        padding: "8px 34px",
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: vertical ? 60 : 52,
        letterSpacing: 2,
        boxShadow: "6px 10px 14px rgba(26,16,48,0.35)",
      }}
    >
      {text}
    </div>
  );
};

const Hud: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      right: 44,
      top: 36,
      color: "#16151d",
      background: "#fff",
      border: "5px solid #16151d",
      borderRadius: 999,
      padding: "6px 22px",
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: 34,
      letterSpacing: 2,
      boxShadow: "4px 8px 12px rgba(26,16,48,0.35)",
    }}
  >
    {text}
  </div>
);

// A few words at a time; the word being spoken pops in yellow.
export const Captions: React.FC<{ words: TimedScene["words"]; sec: number; size: number; perLine: number }> = ({ words, sec, size, perLine }) => {
  if (!words.length) return null;
  let idx = words.findIndex((w) => sec < w.end);
  if (idx === -1) idx = words.length - 1;
  const groupStart = Math.floor(idx / perLine) * perLine;
  const group = words.slice(groupStart, groupStart + perLine);
  return (
    <div style={{ textAlign: "center", fontFamily: "Arial Black, Arial, sans-serif", fontSize: size, lineHeight: 1.15, maxWidth: "88%" }}>
      {group.map((w, i) => {
        const active = groupStart + i === idx && sec >= w.start;
        const pop = active ? interpolate(sec - w.start, [0, 0.08], [1.12, 1.04], { extrapolateRight: "clamp" }) : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 0.24em",
              color: active ? "#ffe14d" : "#fff",
              transform: `scale(${pop})`,
              WebkitTextStroke: `${Math.round(size / 9)}px #16151d`,
              paintOrder: "stroke fill",
              textShadow: "0 5px 0 #16151d",
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

// Places a 1920x1080 image the way an <svg viewBox preserveAspectRatio> would, so an
// image background lines up exactly with the vector layers above it.
function placeLikeSvg(viewBox: string, fit: string, W: number, H: number) {
  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
  const scale = fit.endsWith("slice") ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
  const ox = (W - vw * scale) / 2 - vx * scale;
  const oy = (fit.includes("YMax") ? H - vh * scale : (H - vh * scale) / 2) - vy * scale;
  return { left: ox, top: oy, width: 1920 * scale, height: 1080 * scale };
}
