import React from "react";
import type { CastT, CharacterSkin, PropImage, SceneCharT } from "../schema";
import { gripFor, Held, HeldImage, RAISABLE } from "./Held";

// Character rig: a chibi sticker seen in a consistent 3/4 view, facing +x.
// - Far arm and far leg sit behind the body in a darker shade; the near arm (front,
//   drawn last) gestures and holds props.
// - Clothes are flat color shapes with one ink outline, one soft shadow tone and one
//   highlight. Head, hands and shoes are ink.
// - The white cut-out border and drop shadow come from the "sticker" filter (Episode.tsx).
// Local units: feet at y=0. The head is drawn in 44-unit space and scaled up.

export const INK = "#16151d";
export const OUTLINE = 5;
const HEAD_SCALE = 1.3;
// Chibi proportions: short sturdy legs, arms that reach the hips.
const LEN = { upper: 38, fore: 34, thigh: 31, shin: 29 };
const SLEEVE = 16; // sleeve thickness (color), outline added around it
const PANTS = 21; // pant leg thickness
const WRIST = 12;

// Eyes and mouth in head space, kept well inside the head circle (r=44).
const EYE_NEAR = { x: 8, y: -4 };
const EYE_FAR = { x: 29, y: -4 };
const MOUTH_X = 19;

// Arm angles in degrees: [upperArm, forearm]; 0 = hanging, positive = toward the facing side.
// "near" is the arm closer to the viewer (left shoulder in the drawing), "far" is behind the body.
export const POSES: Record<SceneCharT["pose"], { near: [number, number]; far: [number, number] }> = {
  idle: { near: [-4, 8], far: [6, 4] },
  wave: { near: [150, 30], far: [6, 4] },
  point: { near: [86, 0], far: [6, 4] },
  shrug: { near: [-55, -95], far: [55, 95] },
  armsUp: { near: [-155, -10], far: [155, 10] },
  facepalm: { near: [40, 150], far: [6, 4] },
  think: { near: [25, 152], far: [30, 100] },
  cross: { near: [36, 112], far: [30, 100] },
  handsHips: { near: [-45, 110], far: [45, -110] },
  pray: { near: [35, 70], far: [5, 85] },
  flex: { near: [-90, -90], far: [90, 90] },
  celebrate: { near: [160, 0], far: [40, 30] },
  sit: { near: [22, 45], far: [16, 50] },
};

const BODY_W: Record<CastT["body"], number> = { slim: 46, normal: 54, broad: 66, round: 60 };

export type FigureMotion = {
  frame: number;
  walkPhase: number | null; // radians while walking, null when standing
  mouth: number; // 0 closed .. 1 wide open
  lift: number; // units off the ground (jump/float)
  squash: number; // 1 = normal, <1 squashed, >1 stretched
  tremble: number;
  spin: number; // 1 = normal, -1 = mirrored; values between squash during a turn
  pop: number; // 0..1 sticker "slap" entrance
  stump: boolean; // when sitting with nothing to sit on, draw a small stump under the hips
};

export const shade = (hexColor: string, amt: number) => {
  const h = hexColor.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * (1 + amt))));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

const rad = (d: number) => (d * Math.PI) / 180;
// Two-bone chain from (x,y): mid joint (elbow/knee) and end (hand/ankle).
export function chain(x: number, y: number, a0: number, a1: number, l0: number, l1: number) {
  const r1 = rad(-a0);
  const r2 = r1 + rad(-a1);
  const mx = x - Math.sin(r1) * l0;
  const my = y + Math.cos(r1) * l0;
  return { mx, my, ex: mx - Math.sin(r2) * l1, ey: my + Math.cos(r2) * l1 };
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// A limb segment as a clean capsule: ink outline first, then the color inside.
export const Capsule: React.FC<{ pts: [number, number][]; color: string | null; width: number }> = ({ pts, color, width }) => {
  const points = pts.map((p) => p.join(",")).join(" ");
  return (
    <>
      <polyline points={points} fill="none" stroke={INK} strokeWidth={color ? width + OUTLINE * 2 : width} strokeLinecap="round" strokeLinejoin="round" />
      {color && <polyline points={points} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />}
    </>
  );
};

// ---------------------------------------------------------------- hand & footwear rig

export const Hand: React.FC<{
  pose: SceneCharT["pose"];
  holds: string;
  isNear: boolean;
  angle: number;
  mirror: boolean;
  accent: string;
}> = ({ pose, holds, isNear, angle, mirror, accent }) => {
  // Near hand holding a prop: fingers wrap around the handle/object
  if (isNear && holds !== "none") {
    return (
      <g transform={`rotate(${angle})`}>
        {/* Palm base */}
        <ellipse cx={2} cy={0} rx={8.5} ry={7.5} fill={INK} />
        {/* Curled front fingers wrapping around item */}
        <rect x={1} y={-7} width={9} height={14} rx={4.5} fill={INK} />
        {/* Thumb curled over */}
        <path d="M 0 -5 Q 6 -7 7 -1 Q 5 2 0 1" fill={INK} />
        {/* Subtle finger definition creases */}
        <path d="M 3 -3 L 8 -3 M 3 1 L 8 1" stroke="rgba(255,255,255,0.25)" strokeWidth={1.2} strokeLinecap="round" />
      </g>
    );
  }

  // Pointing gesture
  if (isNear && pose === "point") {
    return (
      <g transform={`rotate(${angle})`}>
        {/* Palm */}
        <ellipse cx={1} cy={1} rx={7} ry={6} fill={INK} />
        {/* Extended pointing index finger */}
        <path d="M 1 -4 L 15 -3 C 17 -3 17 0.5 15 0.5 L 1 0.5 Z" fill={INK} />
        {/* Curled fingers */}
        <rect x={0} y={1} width={8} height={7} rx={3.5} fill={INK} />
        {/* Tucked thumb */}
        <path d="M -1 -2 Q 3 -5 5 -2" stroke={INK} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        {/* Index crease highlight */}
        <line x1={3} y1={-1.5} x2={12} y2={-1.5} stroke="rgba(255,255,255,0.28)" strokeWidth={1.2} strokeLinecap="round" />
      </g>
    );
  }

  // Open / Fanned hand
  if (isNear && (pose === "wave" || pose === "armsUp" || pose === "celebrate" || pose === "shrug")) {
    return (
      <g transform={`rotate(${angle})`}>
        <ellipse cx={3} cy={0} rx={8} ry={7.5} fill={INK} />
        {/* Chibi fanned fingers */}
        <circle cx={9} cy={-5} r={3} fill={INK} />
        <circle cx={11} cy={-1} r={3.2} fill={INK} />
        <circle cx={10} cy={3.5} r={3} fill={INK} />
        <circle cx={7} cy={7} r={2.8} fill={INK} />
        {/* Thumb */}
        <path d="M 0 -4 C 2 -8 7 -8 7 -3 Z" fill={INK} />
      </g>
    );
  }

  // Clenched fist (flex)
  if (isNear && pose === "flex") {
    return (
      <g transform={`rotate(${angle})`}>
        <circle cx={3} cy={0} r={8.5} fill={INK} />
        <path d="M -1 -4 Q 5 -5 6 0 Q 5 4 -1 4" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.4} strokeLinecap="round" />
      </g>
    );
  }

  // Natural relaxed hand: rounded chibi palm with distinct thumb
  return (
    <g transform={`rotate(${angle})`}>
      <ellipse cx={3} cy={0} rx={8.5} ry={7.5} fill={INK} />
      {/* Defined thumb */}
      <path d="M 1 -3 C 3 -8 8 -8 9 -3 C 9 0 6 1 1 -1 Z" fill={INK} />
      {/* Palm crease highlight */}
      <path d="M 2 -2 Q 5 -1 6 3" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
};

export const Shoe: React.FC<{
  rot: number;
  accent: string;
}> = ({ rot, accent }) => {
  return (
    <g transform={`rotate(${rot})`}>
      {/* Shoe upper body */}
      <path d="M -10 3 C -10 -5 -4 -8 4 -8 C 12 -8 18 -3 19 2 C 19 5 17 6 14 6 L -9 6 Z" fill={INK} />
      {/* Clean contrasting rubber sole */}
      <path d="M -10 3 L 17 3 C 19 3 20 6 19 7 L -9 7 C -10 7 -11 5 -10 3 Z" fill="#f0f2f5" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      {/* Sneaker toe bumper / accent trim */}
      <path d="M 13 -2 Q 17 0 17 4 L 12 4 Z" fill={accent} opacity={0.85} />
      {/* Clean sneaker lace tick */}
      <line x1={0} y1={-4} x2={5} y2={-4} stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" opacity={0.75} />
    </g>
  );
};

export const Figure: React.FC<{ look: CastT; c: SceneCharT; m: FigureMotion; seed: number; held?: PropImage; base?: string; skin?: CharacterSkin }> = ({ look, c, m, seed, held, base = "", skin }) => {
  const frame = m.frame + seed * 17;
  const sitting = c.pose === "sit";
  const pose = POSES[c.pose] ?? POSES.idle;
  const walking = m.walkPhase !== null && !sitting;
  const w = BODY_W[look.body] ?? 54;
  const hw = w / 2;
  const mirror = (c.facing === "left" ? -1 : 1) * m.spin < 0;
  const uid = `f${seed}`;

  // Secondary motion.
  const breathe = Math.sin(frame / 16) * 1.5;
  const sway = walking ? 0 : Math.sin(frame / 24) * 2;
  const phase = m.walkPhase ?? 0;
  const swing = walking ? Math.sin(phase) * 24 : 0;
  const bob = walking ? -Math.abs(Math.cos(phase)) * 5 : 0;
  const lean = walking ? 4 : sitting ? -3 : 0;
  const jitter = m.tremble ? Math.sin(frame * 2.7) * m.tremble : 0;
  const headTilt = m.mouth * 3 * Math.sin(frame / 5) + (c.face === "confused" ? 8 : 0) + (c.face === "sad" ? 5 : 0) + (sitting ? 2 : 0);
  const wind = Math.sin(frame / 8 + seed);

  // Arms. Walking swings them opposite to the legs; holding something uses that item's grip.
  let near: [number, number] = walking && c.pose === "idle" ? [swing, 14] : pose.near;
  const far: [number, number] = walking && c.pose === "idle" ? [-swing, 14] : pose.far;
  const raising = (c.pose === "armsUp" || c.pose === "celebrate") && RAISABLE.has(c.holds);
  if (c.holds !== "none" && !raising) near = gripFor(c.holds, held);
  if (c.pose === "wave") near = [near[0] + Math.sin(frame / 4) * 14, near[1]];

  // Legs: [thigh, shin]. Knees bend backward as each leg passes behind.
  let legNear: [number, number] = [4, -2];
  let legFar: [number, number] = [-6, 3];
  if (walking) {
    // The leg that is behind bends at the knee so its foot lifts backward.
    legNear = [-swing, -Math.max(0, swing) * 1.2];
    legFar = [swing, -Math.max(0, -swing) * 1.2];
  }
  // Seated: thighs straight forward at seat height, shins straight down, feet flat.
  if (sitting) {
    legNear = [90, -90];
    legFar = [86, -88];
  }

  // Hips at seat height = shin length + half a shoe above the ground.
  const drop = sitting ? 22 : 0;
  const hipShift = sitting ? 8 : 0; // move the hips forward so the thighs read past the body
  const hipY = -60 + drop;
  const top = hipY - 86 + breathe * 0.5;
  const shoulderY = top + 12 + breathe * 0.5;
  const headY = top - 46 + breathe;

  const isDress = look.outfit === "dress";
  const pantsColor = look.outfit === "suit" ? shade(look.color, -0.4) : look.outfit === "overalls" ? look.color : look.outfit === "uniform" ? shade(look.color, -0.3) : "#34364a";
  const sleeveColor = skin?.sleeve ?? (look.outfit === "labcoat" ? "#f2f4f7" : look.outfit === "overalls" ? look.accent : look.outfit === "armor" ? "#b5bdca" : look.color);
  const shortSleeve = look.outfit === "tshirt" || isDress;

  // Flat sticker look: front and back limbs share one color; depth comes from draw order only.
  const arm = (sx: number, sy: number, a: [number, number], isNear: boolean) => {
    const k = chain(sx, sy, a[0] + sway, a[1], LEN.upper, LEN.fore);
    const col = sleeveColor;
    const cuff: [number, number] = shortSleeve ? [lerp(sx, k.mx, 0.5), lerp(sy, k.my, 0.5)] : [lerp(k.mx, k.ex, 0.4), lerp(k.my, k.ey, 0.4)];
    const sleevePts: [number, number][] = shortSleeve ? [[sx, sy], cuff] : [[sx, sy], [k.mx, k.my], cuff];
    const handAngle = (Math.atan2(k.ey - k.my, k.ex - k.mx) * 180) / Math.PI;
    return {
      k,
      el: (
        <g>
          <Capsule pts={[[sx, sy], [k.mx, k.my], [k.ex, k.ey]]} color={null} width={WRIST} />
          <Capsule pts={sleevePts} color={col} width={SLEEVE} />
          {/* Subtle sleeve cuff seam */}
          <circle cx={cuff[0]} cy={cuff[1]} r={SLEEVE / 2} fill={shade(col, -0.15)} opacity={0.5} />
          {/* Articulated Hand */}
          <g transform={`translate(${k.ex} ${k.ey})`}>
            <Hand pose={c.pose} holds={c.holds} isNear={isNear} angle={handAngle} mirror={mirror} accent={look.accent} />
          </g>
        </g>
      ),
    };
  };

  const leg = (hx: number, a: [number, number], isFarLeg: boolean) => {
    const k = chain(hx, hipY, a[0], a[1], sitting ? 40 : LEN.thigh, LEN.shin);
    const hem: [number, number] = [lerp(k.mx, k.ex, 0.78), lerp(k.my, k.ey, 0.78)];
    // Dynamic foot rotation based on walk cycle, jump or sitting
    let footRot = 0;
    if (sitting) {
      footRot = 16;
    } else if (walking) {
      const s = isFarLeg ? swing : -swing;
      footRot = s > 0 ? -s * 0.45 : -s * 0.65;
    } else if (m.lift > 20) {
      footRot = 24;
    }
    return (
      <g>
        <Capsule pts={[[hx, hipY], [k.mx, k.my], [k.ex, k.ey]]} color={null} width={WRIST} />
        {!isDress && <Capsule pts={[[hx, hipY], [k.mx, k.my], hem]} color={pantsColor} width={PANTS} />}
        {/* Pant cuff line */}
        {!isDress && (
          <line
            x1={hem[0] - 5}
            y1={hem[1]}
            x2={hem[0] + 5}
            y2={hem[1]}
            stroke={shade(pantsColor, -0.25)}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {/* Stylized sneaker */}
        <g transform={`translate(${k.ex + 4} ${k.ey})`}>
          <Shoe rot={footRot} accent={look.accent} />
        </g>
      </g>
    );
  };

  const farArm = arm(hw - 10, shoulderY - 2, far, false);
  const nearArm = arm(-hw + 9, shoulderY, near, true);
  const hand = nearArm.k;
  const drawnHair = HairParts({ hair: look.hair, color: look.hairColor, frame, wind });
  const hair = skin?.topper ? { back: null, front: <SkinTopper img={skin.topper} base={base} uid={uid} /> } : drawnHair;

  // Pop-in: scale up from the feet with a slight rotation, like a sticker being slapped down.
  const popScale = 0.55 + 0.45 * m.pop;
  const popRot = (1 - m.pop) * -10;
  const sx = 1 + (1 - m.squash) * 0.6;

  return (
    <g transform={`translate(${jitter} ${-m.lift}) rotate(${popRot}) scale(${popScale})`}>
      {c.emote !== "none" && <Emote kind={c.emote} frame={m.frame} y={(-312 + drop) * look.scale} />}
      <g transform={`scale(${(mirror ? -1 : 1) * look.scale * sx * Math.abs(m.spin)} ${look.scale * m.squash})`}>
        <g filter="url(#sticker)">
          <g transform={`rotate(${lean} 0 ${hipY}) translate(0 ${bob})`}>
            {look.accessory === "cape" && <Cape color={look.accent} wind={wind} walking={walking} top={top} />}
            {farArm.el}
            {sitting && m.stump && <Stump top={hipY + 6} />}
            {leg(8 + hipShift, legFar, true)}
            {leg(-7 + hipShift, legNear, false)}
            {skin?.torso ? <SkinTorso img={skin.torso} base={base} w={w} top={top} /> : <Torso look={look} w={w} top={top} uid={uid} />}
            {look.accessory === "scarf" && <Scarf color={look.accent} wind={wind} top={top} />}
            {look.accessory === "bowtie" && (
              <path d={`M -9 ${top + 4} L 6 ${top + 10} L 21 ${top + 4} L 21 ${top + 20} L 6 ${top + 14} L -9 ${top + 20} Z`} fill={look.accent} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            )}
            <g transform={`translate(0 ${headY}) rotate(${headTilt}) scale(${HEAD_SCALE})`}>
              {skin?.head ? (
                <>
                  <SkinHead img={skin.head} base={base} />
                  <Face face={c.face} frame={frame} mouth={m.mouth} accent={look.accent} uid={uid} seed={seed} />
                </>
              ) : (
                <>
                  {hair.back}
                  <circle cx={0} cy={0} r={44} fill={INK} />
                  <Face face={c.face} frame={frame} mouth={m.mouth} accent={look.accent} uid={uid} seed={seed} />
                  <Accessory kind={look.accessory} look={look} />
                  {hair.front}
                  <Hat hat={look.hat} frame={frame} accent={look.accent} />
                </>
              )}
            </g>
            {c.holds !== "none" && (
              <g transform={`translate(${hand.ex} ${hand.ey})`}>
                {held ? <HeldImage img={held} base={base} frame={frame} /> : <Held kind={c.holds} part="solid" frame={frame} accent={look.accent} mirror={mirror} />}
              </g>
            )}
            {nearArm.el}
          </g>
        </g>
        {/* Thin details (fishing line, light beams, sparkles) stay outside the sticker border. */}
        {c.holds !== "none" && !held && (
          <g transform={`rotate(${lean} 0 ${hipY}) translate(${hand.ex} ${hand.ey + bob})`}>
            <Held kind={c.holds} part="fx" frame={frame} accent={look.accent} mirror={mirror} />
          </g>
        )}
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- torso & outfits

// 3/4 torso: straight back edge, chest bulging toward the facing side; front details sit
// on a center line shifted toward the facing side (cx).
const Torso: React.FC<{ look: CastT; w: number; top: number; uid: string }> = ({ look, w, top, uid }) => {
  const hw = w / 2;
  const h = 90;
  const b = top + h;
  const cx = 6;
  const belly = look.body === "round" ? 16 : 3;
  const dark = shade(look.color, -0.28);
  const outline = { stroke: INK, strokeWidth: OUTLINE, strokeLinejoin: "round" as const };
  const isDress = look.outfit === "dress";
  // Simple rounded silhouettes: a soft rectangle (a belly bump for "round"), a flared dress.
  const r = 18;
  const d = isDress
    ? `M ${-hw + r} ${top} L ${hw - r} ${top} Q ${hw} ${top} ${hw + 1} ${top + r} L ${hw + 18} ${b + 4} Q ${hw + 18} ${b + 12} ${hw + 8} ${b + 12} L ${-hw - 8} ${b + 12} Q ${-hw - 18} ${b + 12} ${-hw - 18} ${b + 4} L ${-hw - 1} ${top + r} Q ${-hw} ${top} ${-hw + r} ${top} Z`
    : `M ${-hw + r} ${top} L ${hw - r} ${top} Q ${hw} ${top} ${hw} ${top + r} Q ${hw + belly} ${top + h / 2 + 6} ${hw} ${b - r} Q ${hw} ${b} ${hw - r} ${b} L ${-hw + r} ${b} Q ${-hw} ${b} ${-hw} ${b - r} L ${-hw} ${top + r} Q ${-hw} ${top} ${-hw + r} ${top} Z`;
  const base = look.outfit === "labcoat" ? "#f2f4f7" : look.outfit === "armor" ? "#b5bdca" : look.outfit === "overalls" ? look.accent : look.color;

  let details: React.ReactNode = null;
  switch (look.outfit) {
    case "suit":
      details = (
        <>
          {/* White collared shirt */}
          <path d={`M ${cx - 14} ${top} L ${cx} ${top + 34} L ${cx + 14} ${top} Z`} fill="#f8f9fa" />
          {/* Lapels */}
          <path d={`M ${cx - 16} ${top} L ${cx - 6} ${top + 42} L ${cx - 18} ${top + 50} Z`} fill={shade(base, -0.15)} />
          <path d={`M ${cx + 16} ${top} L ${cx + 6} ${top + 42} L ${cx + 18} ${top + 50} Z`} fill={shade(base, -0.15)} />
          {/* Necktie with knot and angled tip */}
          <path d={`M ${cx - 4} ${top + 4} L ${cx + 4} ${top + 4} L ${cx + 6} ${top + 44} L ${cx} ${top + 52} L ${cx - 6} ${top + 44} Z`} fill={look.accent} />
          {/* Gold tie clip */}
          <line x1={cx - 2} y1={top + 28} x2={cx + 5} y2={top + 28} stroke="#e5c158" strokeWidth={2.5} strokeLinecap="round" />
          {/* Pocket square */}
          <path d={`M ${cx - 22} ${top + 46} L ${cx - 14} ${top + 46} L ${cx - 18} ${top + 40} Z`} fill={look.accent} />
        </>
      );
      break;
    case "hoodie":
      details = (
        <>
          {/* Kangaroo pocket with curved top opening */}
          <path d={`M ${cx - 22} ${top + 54} Q ${cx} ${top + 48} ${cx + 22} ${top + 54} L ${cx + 20} ${top + 74} L ${cx - 20} ${top + 74} Z`} fill={dark} />
          {/* Hanging drawstrings */}
          <path d={`M ${cx - 6} ${top + 10} Q ${cx - 8} ${top + 28} ${cx - 5} ${top + 40}`} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
          <circle cx={cx - 5} cy={top + 41} r={2.2} fill={look.accent} />
          <path d={`M ${cx + 6} ${top + 10} Q ${cx + 8} ${top + 26} ${cx + 5} ${top + 38}`} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
          <circle cx={cx + 5} cy={top + 39} r={2.2} fill={look.accent} />
        </>
      );
      break;
    case "tshirt":
      details = (
        <>
          {/* Crewneck ribbing ring */}
          <path d={`M ${cx - 14} ${top} Q ${cx} ${top + 16} ${cx + 14} ${top}`} fill="none" stroke={shade(base, -0.2)} strokeWidth={4} strokeLinecap="round" />
          {/* Graphic chest print / badge in accent */}
          <circle cx={cx + 2} cy={top + 40} r={13} fill={look.accent} />
          <circle cx={cx + 2} cy={top + 40} r={8} fill={base} />
          <circle cx={cx + 2} cy={top + 40} r={4} fill={look.accent} />
        </>
      );
      break;
    case "dress":
      details = (
        <>
          {/* Fitted neckline */}
          <path d={`M ${cx - 12} ${top} Q ${cx} ${top + 18} ${cx + 12} ${top}`} fill="none" stroke={shade(base, -0.2)} strokeWidth={3} />
          {/* Cinched waistband belt */}
          <rect x={-hw - 20} y={top + 34} width={w + 40} height={9} fill={look.accent} />
          {/* Small gold buckle */}
          <rect x={cx - 4} y={top + 33} width={8} height={11} rx={2} fill="#e5c158" stroke={INK} strokeWidth={1.5} />
          {/* Subtle vertical pleats */}
          {[-12, 0, 12].map((ox) => (
            <line key={ox} x1={cx + ox} y1={top + 44} x2={cx + ox * 1.5} y2={b + 8} stroke={shade(base, -0.15)} strokeWidth={2.5} />
          ))}
        </>
      );
      break;
    case "labcoat":
      details = (
        <>
          {/* Colored shirt beneath open coat */}
          <path d={`M ${cx - 10} ${top} L ${cx} ${top + 32} L ${cx + 10} ${top} Z`} fill={look.color} />
          {/* Breast pocket */}
          <rect x={cx - 20} y={top + 38} width={15} height={18} rx={2} fill="#e4e8ee" stroke={INK} strokeWidth={2} />
          {/* Two pens in pocket */}
          <rect x={cx - 18} y={top + 32} width={3} height={9} rx={1} fill="#e03e3e" />
          <rect x={cx - 13} y={top + 30} width={3} height={11} rx={1} fill="#2e6be6" />
        </>
      );
      break;
    case "uniform":
      details = (
        <>
          {/* Shoulder epaulets */}
          <rect x={-hw} y={top} width={12} height={6} rx={2} fill="#e5c158" stroke={INK} strokeWidth={1.5} />
          <rect x={hw - 12} y={top} width={12} height={6} rx={2} fill="#e5c158" stroke={INK} strokeWidth={1.5} />
          {/* Double-breasted buttons */}
          {[-8, 8].map((ox) =>
            [top + 26, top + 42].map((oy, bi) => (
              <circle key={`${ox}-${bi}`} cx={cx + ox} cy={oy} r={3.2} fill="#e5c158" stroke={INK} strokeWidth={1.2} />
            ))
          )}
          {/* Duty belt */}
          <rect x={-hw - 4} y={top + 62} width={w + 8} height={10} fill={INK} />
          <rect x={cx - 5} y={top + 60} width={10} height={14} rx={2} fill="#e5c158" />
        </>
      );
      break;
    case "armor":
      details = (
        <>
          {/* Curved chestplate */}
          <path d={`M ${cx - 18} ${top + 16} Q ${cx} ${top + 28} ${cx + 18} ${top + 16} L ${cx + 14} ${top + 46} L ${cx} ${top + 54} L ${cx - 14} ${top + 46} Z`} fill={look.color} stroke={INK} strokeWidth={2.5} />
          {/* Highlight line on metal */}
          <path d={`M ${cx - 12} ${top + 20} Q ${cx} ${top + 28} ${cx + 8} ${top + 20}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          {/* Rivets */}
          {[-12, 12].map((ox, i) => (
            <circle key={i} cx={cx + ox} cy={top + 40} r={2} fill="#fff" opacity={0.6} />
          ))}
        </>
      );
      break;
    case "sweater":
      details = (
        <>
          {/* Ribbed neckband */}
          <path d={`M ${cx - 14} ${top} Q ${cx} ${top + 14} ${cx + 14} ${top}`} fill="none" stroke={look.accent} strokeWidth={5} />
          {/* Horizontal chest stripe */}
          <rect x={-hw - 4} y={top + 34} width={w + 8} height={12} fill={look.accent} />
          <line x1={-hw} y1={top + 40} x2={hw} y2={top + 40} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
        </>
      );
      break;
    case "overalls":
      details = (
        <>
          {/* Base bib */}
          <rect x={-hw + 6} y={top + 28} width={w - 12} height={h - 28} rx={6} fill={look.color} />
          {/* Suspender straps */}
          <rect x={cx - 18} y={top} width={7} height={32} fill={dark} />
          <rect x={cx + 11} y={top} width={7} height={32} fill={dark} />
          {/* Metal buckle latches */}
          <rect x={cx - 19} y={top + 28} width={9} height={6} rx={1.5} fill="#d4d8e0" stroke={INK} strokeWidth={1.2} />
          <rect x={cx + 10} y={top + 28} width={9} height={6} rx={1.5} fill="#d4d8e0" stroke={INK} strokeWidth={1.2} />
          {/* Big front bib pocket */}
          <rect x={cx - 10} y={top + 40} width={20} height={18} rx={3} fill={shade(look.color, -0.15)} stroke={INK} strokeWidth={2} />
        </>
      );
      break;
    default: // jacket
      details = (
        <>
          {/* Center zipper / placket */}
          <line x1={cx} y1={top + 12} x2={cx} y2={b} stroke={INK} strokeWidth={3} />
          {/* Silver zipper pull */}
          <circle cx={cx} cy={top + 16} r={3} fill="#e0e4ec" stroke={INK} strokeWidth={1.2} />
          {/* Folded collar wings */}
          <path d={`M ${cx - 14} ${top} L ${cx - 3} ${top + 14} L ${cx - 12} ${top + 16} Z`} fill={shade(base, -0.2)} />
          <path d={`M ${cx + 14} ${top} L ${cx + 3} ${top + 14} L ${cx + 12} ${top + 16} Z`} fill={shade(base, -0.2)} />
          {look.tie && <path d={`M ${cx - 4} ${top + 3} L ${cx + 4} ${top + 3} L ${cx + 5} ${top + 42} L ${cx} ${top + 50} L ${cx - 5} ${top + 42} Z`} fill={look.accent} />}
        </>
      );
  }

  return (
    <g>
      <defs>
        <clipPath id={`torso-${uid}`}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={base} />
      <g clipPath={`url(#torso-${uid})`}>
        {/* Curved 2-tone body volume shadow */}
        <path
          d={`M ${hw - 12} ${top} C ${hw + 10} ${top + 30} ${hw + 10} ${b - 20} ${hw - 4} ${b} L ${hw + 30} ${b} L ${hw + 30} ${top} Z`}
          fill={shade(base, -0.18)}
        />
        {/* Chin / neck contact shadow */}
        <ellipse cx={cx - 3} cy={top + 4} rx={16} ry={5} fill="rgba(22,21,29,0.28)" />
        {details}
      </g>
      <path d={d} fill="none" {...outline} />
    </g>
  );
};

// ---------------------------------------------------------------- image skins (character library)

// Illustrated torso: a bit wider than the drawn body (fabric volume), hips on the drawn
// hip line; anything above the neckline (a hood) sits behind the head.
const SkinTorso: React.FC<{ img: { url: string; aspect: number }; base: string; w: number; top: number }> = ({ img, base, w, top }) => {
  const width = w * 1.3;
  const height = width / img.aspect;
  return <image href={base + img.url} x={-width / 2 + 2} y={top + 96 - height} width={width} height={height} />;
};

// Illustrated hair or hat in head space (head radius 44). Whatever the generator drew
// below the brow line is trimmed off, so a full-head hair image still leaves the face clear.
const SkinTopper: React.FC<{ img: { url: string; aspect: number }; base: string; uid: string }> = ({ img, base, uid }) => {
  const width = 104;
  const height = width / img.aspect;
  const id = `topper-${uid}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d="M -80 -220 L 80 -220 L 80 -24 Q 30 -32 -10 -28 Q -48 -24 -80 -2 Z" />
        </clipPath>
      </defs>
      <image href={base + img.url} x={-width / 2 + 2} y={-56} width={width} height={height} clipPath={`url(#${id})`} />
    </g>
  );
};

// Full illustrated chibi head/face in head space
const SkinHead: React.FC<{ img: { url: string; aspect: number }; base: string }> = ({ img, base }) => {
  const width = 96;
  const height = width / img.aspect;
  return <image href={base + img.url} x={-width / 2} y={-height / 2 - 4} width={width} height={height} />;
};

// A small tree stump to sit on, so a seated character never floats.
export const Stump: React.FC<{ top: number }> = ({ top }) => (
  <g strokeLinejoin="round">
    <rect x={-26} y={top} width={48} height={-top} rx={6} fill="#9a6a3e" stroke={INK} strokeWidth={OUTLINE} />
    <ellipse cx={-2} cy={top} rx={24} ry={7} fill="#d9a868" stroke={INK} strokeWidth={4} />
    <ellipse cx={-2} cy={top} rx={11} ry={3} fill="none" stroke="#a87a48" strokeWidth={2.5} />
  </g>
);

export const Scarf: React.FC<{ color: string; wind: number; top: number }> = ({ color, wind, top }) => (
  <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
    <path d={`M -14 ${top + 8} C -32 ${top + 14 + wind * 3} -42 ${top + 28 + wind * 5} -38 ${top + 46 + wind * 4} L -24 ${top + 44 + wind * 3} C -26 ${top + 30} -18 ${top + 20} -6 ${top + 12} Z`} fill={shade(color, -0.15)} />
    <rect x={-22} y={top - 7} width={50} height={18} rx={9} fill={color} />
  </g>
);

export const Cape: React.FC<{ color: string; wind: number; walking: boolean; top: number }> = ({ color, wind, walking, top }) => {
  const t = walking ? 24 : 8;
  return (
    <path
      d={`M -20 ${top + 4} L 20 ${top + 4} C 6 ${top + 60} ${-22 - t} ${top + 120} ${-38 - t + wind * 6} ${top + 150} Q ${-62 - t} ${top + 150} ${-72 - t + wind * 8} ${top + 132} C ${-58 - t} ${top + 90} -40 ${top + 40} -20 ${top + 4} Z`}
      fill={shade(color, -0.15)} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round"
    />
  );
};

// ---------------------------------------------------------------- face (44-unit head space)

export type Lid = [number, number]; // how far the upper lid comes down at the [inner, outer] corner, 0..1
export const LIDS: Partial<Record<SceneCharT["face"], Lid>> = {
  sleepy: [0.5, 0.5],
  smug: [0.38, 0.32],
  angry: [0.45, 0.08],
  determined: [0.32, 0.12],
  sad: [0.05, 0.28],
  crying: [0.05, 0.28],
};

// Brows as [inner y, outer y, arch] in head space (inner = toward the nose).
export const BROWS: Partial<Record<SceneCharT["face"], [number, number, number]>> = {
  neutral: [-20, -20, -3],
  happy: [-21, -21, -6],
  sad: [-25, -19, 0],
  crying: [-25, -19, 0],
  angry: [-15, -25, 0],
  determined: [-17, -23, 0],
  shocked: [-27, -27, -5],
  scared: [-27, -21, 0],
  smug: [-19, -19, 0],
  sleepy: [-19, -18, 0],
  confused: [-27, -27, -5],
};

const Face: React.FC<{ face: SceneCharT["face"]; frame: number; mouth: number; accent: string; uid: string; seed?: number }> = ({ face, frame, mouth, accent, uid, seed = 0 }) => {
  // Desynchronized organic blink: upper lid sweeps down over 3 frames and back up, every ~3.5s per character
  const blinkOffset = (seed * 31) % 75;
  const t = (frame + blinkOffset) % 110;
  const blink = t < 6 ? 1 - Math.abs(t - 3) / 3 : 0;
  const big = face === "shocked" || face === "scared";
  const lid = LIDS[face] ?? [0, 0];
  const saccade = Math.sin((frame + seed * 13) / 26) * 0.7;
  const look = face === "scared" ? Math.sin(frame / 3) * 1.5 : face === "confused" ? Math.sin(frame / 14) * 1.2 : 0.8 + saccade;

  const eye = (cx: number, cy: number, isFar: boolean, i: number) => {
    // Big glossy eyes with colored iris and specular reflections
    const rx = (big ? 11.5 : 10) * (isFar ? 0.78 : 1);
    const ry = big ? 13.5 : 12.5;
    // Inner corner faces the nose: right side of near eye, left side of far eye
    const [inner, outer] = lid.map((v) => Math.max(v, blink)) as Lid;
    const yL = cy - ry + 2 * ry * (isFar ? inner : outer);
    const yR = cy - ry + 2 * ry * (isFar ? outer : inner);
    const id = `lid-${uid}-${i}`;
    return (
      <g key={i}>
        <defs>
          <clipPath id={id}>
            <polygon points={`${cx - rx - 3},${yL} ${cx + rx + 3},${yR} ${cx + rx + 3},${cy + ry + 3} ${cx - rx - 3},${cy + ry + 3}`} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" />
          <ellipse cx={cx + 2 + look} cy={cy + 1.5} rx={(big ? 5 : 7) * (isFar ? 0.8 : 1)} ry={big ? 5.4 : 8} fill={accent} />
          <ellipse cx={cx + 2 + look} cy={cy + 1.5} rx={(big ? 2.4 : 3.6) * (isFar ? 0.8 : 1)} ry={big ? 2.6 : 4.3} fill={INK} />
          <circle cx={cx - 1 + look} cy={cy - 3.2} r={2.8} fill="#fff" />
          <circle cx={cx + 4.2 + look} cy={cy + 4.6} r={1.3} fill="#fff" />
        </g>
      </g>
    );
  };

  const brow = (cx: number, isFar: boolean, i: number) => {
    const b = BROWS[face] ?? BROWS.neutral!;
    let [inner, outer, arch] = b;
    if (face === "confused" && isFar) [inner, outer, arch] = [-19, -19, 0];
    if (face === "smug" && isFar) [inner, outer, arch] = [-24, -21, -3];
    // Sit just above the larger eyes
    inner -= 3;
    outer -= 3;
    const half = isFar ? 6 : 8;
    const [x1, y1, x2, y2] = isFar ? [cx - half, inner, cx + half, outer] : [cx - half, outer, cx + half, inner];
    return <path key={i} d={`M ${x1} ${y1} Q ${cx} ${(y1 + y2) / 2 + arch} ${x2} ${y2}`} stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />;
  };

  let eyes: React.ReactNode;
  if (face === "love") {
    eyes = [EYE_NEAR, EYE_FAR].map((e, i) => (
      <path key={i} transform={`translate(${e.x} ${e.y}) scale(${(i ? 0.8 : 1) * (1 + Math.sin(frame / 5) * 0.08)} ${1 + Math.sin(frame / 5) * 0.08})`} d="M 0 7 C -15 -3 -9 -15 0 -7 C 9 -15 15 -3 0 7 Z" fill="#ff4d7a" stroke="#fff" strokeWidth={2} />
    ));
  } else if (face === "happy") {
    eyes = [EYE_NEAR, EYE_FAR].map((e, i) => {
      const r = i ? 6.5 : 8;
      return <path key={i} d={`M ${e.x - r} ${e.y + 3} Q ${e.x} ${e.y - 8} ${e.x + r} ${e.y + 3}`} stroke="#fff" strokeWidth={4.5} fill="none" strokeLinecap="round" />;
    });
  } else {
    eyes = [eye(EYE_NEAR.x, EYE_NEAR.y, false, 0), eye(EYE_FAR.x, EYE_FAR.y, true, 1)];
  }

  const mx = MOUTH_X;
  let mouthArt: React.ReactNode;
  const isHappyTalk = face === "happy" || face === "love";

  if (mouth > 0.08) {
    if (isHappyTalk) {
      // Happy speech: upturned smile opening with visible top teeth and tongue
      mouthArt = (
        <g>
          <path d={`M ${mx - 8 - mouth * 2.5} ${14 - mouth * 1.5} Q ${mx} ${24 + mouth * 8} ${mx + 8 + mouth * 2.5} ${14 - mouth * 1.5} Z`} fill="#5a0d16" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
          <path d={`M ${mx - 6 - mouth * 1.5} ${15 - mouth} Q ${mx} 18 ${mx + 6 + mouth * 1.5} ${15 - mouth} L ${mx + 5 + mouth * 1.5} 18 L ${mx - 5 - mouth * 1.5} 18 Z`} fill="#fff" />
          <ellipse cx={mx} cy={20 + mouth * 4} rx={4.5 + mouth * 1.8} ry={2.4 + mouth * 1.8} fill="#ff7b8f" />
        </g>
      );
    } else if (face === "angry") {
      // Angled shouting grimace with clenched teeth bar
      mouthArt = (
        <g>
          <path d={`M ${mx - 9} 18 L ${mx + 9} 16 L ${mx + 7} ${24 + mouth * 5} L ${mx - 7} ${26 + mouth * 5} Z`} fill="#5a0d16" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
          <line x1={mx - 6} y1={20} x2={mx + 6} y2={19} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
        </g>
      );
    } else if (big) {
      // Shocked/scared open gasp
      mouthArt = (
        <g>
          <ellipse cx={mx} cy={20} rx={6 + mouth * 2} ry={8 + mouth * 3.5} fill="#5a0d16" stroke="#fff" strokeWidth={2.5} />
          <ellipse cx={mx} cy={24 + mouth * 2} rx={3.8} ry={2.2} fill="#ff7b8f" />
        </g>
      );
    } else {
      // Standard speech mouth: upper teeth bar + mouth cavity + rounded pink tongue
      mouthArt = (
        <g>
          <ellipse cx={mx} cy={19} rx={6 + mouth * 2.5} ry={3 + mouth * 7} fill="#5a0d16" stroke="#fff" strokeWidth={2.5} />
          <path d={`M ${mx - 4 - mouth} ${17 - mouth * 3} L ${mx + 4 + mouth} ${17 - mouth * 3} L ${mx + 3 + mouth} ${19 - mouth * 1.5} L ${mx - 3 - mouth} ${19 - mouth * 1.5} Z`} fill="#fff" />
          {mouth > 0.35 && <ellipse cx={mx} cy={21 + mouth * 3.5} rx={4.2} ry={2.2} fill="#ff7b8f" />}
        </g>
      );
    }
  } else if (big) {
    mouthArt = <ellipse cx={mx} cy={20} rx={6.5} ry={8.5} fill="#5a0d16" stroke="#fff" strokeWidth={2.5} />;
  } else if (face === "happy" || face === "love") {
    // Smiling closed mouth with white teeth strip
    mouthArt = (
      <g>
        <path d={`M ${mx - 10} 13 Q ${mx} 26 ${mx + 10} 13 Z`} fill="#5a0d16" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={`M ${mx - 7} 14 Q ${mx} 17 ${mx + 7} 14 L ${mx + 6} 16.5 L ${mx - 6} 16.5 Z`} fill="#fff" />
        <ellipse cx={mx} cy={20} rx={4} ry={2} fill="#ff7b8f" />
      </g>
    );
  } else if (face === "smug") {
    mouthArt = (
      <g>
        <path d={`M ${mx - 9} 19 Q ${mx + 3} 23 ${mx + 11} 13`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        <circle cx={mx + 11.5} cy={12.5} r={1.5} fill="#fff" />
      </g>
    );
  } else if (face === "sad" || face === "crying" || face === "angry") {
    mouthArt = <path d={`M ${mx - 8} 22 Q ${mx} 14 ${mx + 8} 22`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />;
  } else if (face === "confused") {
    mouthArt = <path d={`M ${mx - 9} 19 q 4.5 -4 9 0 t 9 0`} fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />;
  } else if (face === "sleepy") {
    mouthArt = <ellipse cx={mx + 1} cy={19} rx={3.2} ry={4} fill="none" stroke="#fff" strokeWidth={3} />;
  } else if (face === "determined") {
    mouthArt = <path d={`M ${mx - 8} 19 L ${mx + 8} 17`} stroke="#fff" strokeWidth={4} strokeLinecap="round" />;
  } else {
    // Neutral smile with cute subtle corner dimple
    mouthArt = (
      <g>
        <path d={`M ${mx - 7} 17 Q ${mx} 21 ${mx + 7} 17`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        <circle cx={mx + 7.5} cy={16.5} r={1.4} fill="#fff" />
      </g>
    );
  }

  const hasBlush = face === "happy" || face === "love" || face === "smug" || face === "confused";

  return (
    <>
      {/* Rosy blush cheeks on expressive faces */}
      {hasBlush && (
        <g opacity={face === "love" ? 0.75 : 0.5}>
          <ellipse cx={EYE_NEAR.x - 2} cy={EYE_NEAR.y + 16} rx={7} ry={3.5} fill="#ff4d7a" />
          <ellipse cx={EYE_FAR.x - 1} cy={EYE_FAR.y + 15} rx={5.5} ry={3} fill="#ff4d7a" />
        </g>
      )}
      {eyes}
      {face !== "love" && [brow(EYE_NEAR.x, false, 0), brow(EYE_FAR.x, true, 1)]}
      {mouthArt}
      {face === "scared" && <path d="M -30 -20 q 5 11 0 18 q -5 -7 0 -18" fill="#8fd3ff" stroke="#fff" strokeWidth={1.5} />}
      {face === "crying" &&
        [EYE_NEAR.x, EYE_FAR.x].map((x, i) => {
          const k = ((frame + i * 9) % 24) / 24;
          return <path key={i} d={`M ${x} ${8 + k * 24} q 4 6 0 9 q -4 -3 0 -9`} fill="#8fd3ff" opacity={1 - k} />;
        })}
    </>
  );
};

// ---------------------------------------------------------------- hair, hats, accessories

// Multi-part shapes are drawn twice (ink pass, then color pass) so overlaps don't leave inner lines.
export const Twice: React.FC<{ color: string; children: (fill: string, stroke: number) => React.ReactNode }> = ({ color, children }) => (
  <>
    <g fill={INK}>{children(INK, 9)}</g>
    <g fill={color}>{children(color, 0)}</g>
  </>
);

function HairParts({ hair, color, frame, wind }: { hair: CastT["hair"]; color: string; frame: number; wind: number }) {
  const sw = OUTLINE / HEAD_SCALE;
  const st = { fill: color, stroke: INK, strokeWidth: sw, strokeLinejoin: "round" as const };
  const sway = Math.sin(frame / 10) * 5 + wind * 2;
  // Hair hugs the top of the head, swept toward the face, with a subtle vector gloss sheen arc
  const cap = (
    <g>
      <path d="M -46 0 C -49 -36 -26 -52 0 -52 C 28 -52 48 -38 46 -12 C 38 -28 20 -34 2 -34 C -20 -34 -38 -22 -46 0 Z" {...st} />
      <path d="M -26 -38 C -12 -46 10 -46 26 -32" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2.8} strokeLinecap="round" />
    </g>
  );
  switch (hair) {
    case "short":
      return { back: null, front: cap };
    case "spiky":
      return {
        back: null,
        front: (
          <g>
            <path d="M -46 0 C -52 -16 -47 -29 -39 -35 C -40 -48 -28 -54 -18 -49 C -12 -61 8 -61 13 -50 C 25 -56 38 -47 36 -36 C 47 -30 49 -20 46 -12 C 38 -28 20 -34 2 -34 C -20 -34 -38 -20 -46 0 Z" {...st} />
          </g>
        ),
      };
    case "long":
      return { back: <path d="M -44 -12 C -60 30 -52 72 -32 80 L -8 80 C -20 52 -22 20 -16 -12 Z" {...st} />, front: cap };
    case "ponytail":
      return { back: <ellipse cx={-50 + sway * 0.3} cy={8} rx={13} ry={28} transform={`rotate(${20 + sway} -42 -20)`} {...st} />, front: cap };
    case "bun":
      return { back: <circle cx={-26} cy={-46} r={17} {...st} />, front: cap };
    case "curly":
      return {
        back: null,
        front: (
          <Twice color={color}>
            {(_f, extra) => [[-38, -18], [-27, -35], [-8, -43], [12, -42], [29, -33], [40, -20]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={13 + extra / 2} />)}
          </Twice>
        ),
      };
    case "mohawk":
      return { back: null, front: <path d="M -14 -40 C -20 -72 -4 -92 10 -88 C 6 -72 14 -56 14 -40 Z" {...st} /> };
    case "afro":
      // Bumpy cloud that frames the top and back of the head, not a disc around the face.
      return {
        back: (
          <Twice color={color}>
            {(_f, e) =>
              [[-44, -4], [-46, -28], [-32, -48], [-10, -60], [14, -58], [34, -46], [44, -26], [-30, 14]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={22 + e / 2} />)
            }
          </Twice>
        ),
        front: null,
      };
    case "pigtails":
      return {
        back: (
          <g>
            <ellipse cx={-50} cy={14} rx={12} ry={24} transform={`rotate(${15 + sway} -50 -10)`} {...st} />
            <ellipse cx={46} cy={14} rx={10} ry={22} transform={`rotate(${-15 + sway} 46 -10)`} fill={shade(color, -0.2)} stroke={INK} strokeWidth={sw} />
          </g>
        ),
        front: cap,
      };
    default:
      return { back: null, front: null };
  }
}

export const Hat: React.FC<{ hat: CastT["hat"]; frame: number; accent: string }> = ({ hat, frame, accent }) => {
  const s = { stroke: INK, strokeWidth: OUTLINE / HEAD_SCALE, strokeLinejoin: "round" as const };
  switch (hat) {
    case "cowboy":
      return (
        <g>
          <path d="M -36 -36 Q -34 -84 0 -80 Q 34 -84 36 -36 Z" fill="#8a5a34" {...s} />
          <ellipse cx={0} cy={-34} rx={70} ry={12} fill="#7a4e2c" {...s} />
          <rect x={-35} y={-48} width={70} height={9} fill="#4a2c16" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M 28 -24 L 78 -16 Q 72 -6 36 -10 Z" fill={shade(accent, -0.15)} {...s} />
          <path d="M -44 -16 Q -44 -60 0 -60 Q 44 -60 44 -16 Z" fill={accent} {...s} />
        </g>
      );
    case "tophat":
      return (
        <g>
          <rect x={-32} y={-112} width={64} height={70} rx={6} fill="#25242c" {...s} />
          <rect x={-32} y={-58} width={64} height={11} fill={accent} />
          <rect x={-50} y={-46} width={100} height={11} rx={5.5} fill="#25242c" {...s} />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M -34 -34 L -36 -76 L -18 -56 L 0 -84 L 18 -56 L 36 -76 L 34 -34 Z" fill="#f5c400" {...s} />
          <circle cx={0} cy={-46} r={5} fill="#e23c5a" />
        </g>
      );
    case "hardhat":
      return (
        <g>
          <path d="M -42 -20 Q -42 -68 0 -68 Q 42 -68 42 -20 Z" fill="#f7b500" {...s} />
          <rect x={-52} y={-26} width={104} height={11} rx={5.5} fill="#e09c00" {...s} />
        </g>
      );
    case "chef":
      return (
        <g>
          <Twice color="#fff">{(_f, e) => <><circle cx={-18} cy={-72} r={20 + e / 2} /><circle cx={6} cy={-84} r={23 + e / 2} /><circle cx={24} cy={-70} r={18 + e / 2} /><rect x={-30 - e / 2} y={-66 - e / 2} width={60 + e} height={32 + e} rx={4} /></>}</Twice>
        </g>
      );
    case "wizard":
      return (
        <g>
          <path d={`M -38 -38 Q ${10 + Math.sin(frame / 12) * 4} -100 ${18 + Math.sin(frame / 12) * 6} -148 Q 30 -90 38 -38 Z`} fill="#4a35a8" {...s} />
          <ellipse cx={0} cy={-36} rx={62} ry={12} fill="#3b2a8a" {...s} />
          <circle cx={6} cy={-80} r={6} fill="#ffe14d" />
        </g>
      );
    case "beanie":
      return (
        <g>
          <path d="M -44 -16 Q -46 -66 0 -66 Q 46 -66 44 -16 Z" fill={accent} {...s} />
          <rect x={-46} y={-26} width={92} height={15} rx={7.5} fill={shade(accent, -0.15)} {...s} />
          <circle cx={0} cy={-70} r={10} fill="#fff" {...s} />
        </g>
      );
    case "party":
      return (
        <g transform="rotate(12)">
          <path d="M -24 -38 L 0 -108 L 24 -38 Z" fill="#ff4d8a" {...s} />
          <path d="M -15 -62 L 15 -62 M -8 -84 L 8 -84" stroke="#ffe14d" strokeWidth={5} strokeLinecap="round" />
          <circle cx={0} cy={-110} r={8} fill="#ffe14d" {...s} />
        </g>
      );
    case "police":
      return (
        <g>
          <path d="M -36 -24 L 52 -20 Q 44 -10 -36 -16 Z" fill="#111" {...s} />
          <path d="M -46 -26 L -40 -62 L 40 -62 L 46 -26 Z" fill="#1f2d5a" {...s} />
          <path d="M 0 -56 l 6 8 l -6 8 l -6 -8 Z" fill="#e9c348" />
        </g>
      );
    case "pirate":
      return (
        <g>
          <path d="M -68 -30 Q 0 -108 68 -30 Q 0 -48 -68 -30 Z" fill="#1d1d24" {...s} />
          <circle cx={0} cy={-56} r={8} fill="#fff" />
        </g>
      );
    case "halo":
      return <ellipse cx={0} cy={-72 + Math.sin(frame / 8) * 4} rx={36} ry={9} fill="none" stroke="#ffe680" strokeWidth={7} />;
    case "horns":
      return (
        <g>
          <path d="M -30 -32 Q -46 -60 -30 -76 Q -30 -56 -16 -40 Z" fill="#e0443c" {...s} />
          <path d="M 30 -32 Q 46 -60 30 -76 Q 30 -56 16 -40 Z" fill="#e0443c" {...s} />
        </g>
      );
    default:
      return null;
  }
};

// Face accessories, placed on the 3/4 eye positions (near eye at x=8, far eye at x=29).
export const Accessory: React.FC<{ kind: CastT["accessory"]; look: CastT; line?: string }> = ({ kind, look, line = "#f2f2f2" }) => {
  switch (kind) {
    case "glasses":
      return (
        <g fill="rgba(255,255,255,0.08)" stroke={line} strokeWidth={3.2}>
          <path d="M -4 -8 L -40 -14" fill="none" />
          <circle cx={EYE_NEAR.x} cy={EYE_NEAR.y} r={12.5} />
          <ellipse cx={EYE_FAR.x} cy={EYE_FAR.y} rx={9.5} ry={12} />
          <line x1={EYE_NEAR.x - 7} y1={EYE_NEAR.y - 7} x2={EYE_NEAR.x + 1} y2={EYE_NEAR.y + 6} stroke="rgba(255,255,255,0.4)" strokeWidth={1.8} strokeLinecap="round" />
        </g>
      );
    case "sunglasses":
      return (
        <g strokeLinejoin="round">
          <path d="M -5 -11 L -40 -15" stroke={line} strokeWidth={2.5} />
          <path d="M -5 -13 L 20 -13 L 18 3 Q 8 8 -3 1 Z" fill="#2b2f3d" stroke={line} strokeWidth={2.5} />
          <path d="M 22 -13 L 37 -13 L 36 2 Q 29 7 23 1 Z" fill="#2b2f3d" stroke={line} strokeWidth={2.5} />
          <path d="M 1 -8 L 8 -8 M 26 -8 L 31 -8" stroke="#9fd3ff" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "monocle":
      return (
        <g fill="none" stroke="#e9c348" strokeWidth={3}>
          <ellipse cx={EYE_FAR.x} cy={EYE_FAR.y} rx={10} ry={12.5} />
          <path d={`M ${EYE_FAR.x} ${EYE_FAR.y + 12} Q 24 34 8 52`} />
        </g>
      );
    case "mustache":
      return <path d={`M ${MOUTH_X} 10 Q ${MOUTH_X - 10} 3 ${MOUTH_X - 18} 13 Q ${MOUTH_X - 10} 11 ${MOUTH_X} 15 Q ${MOUTH_X + 10} 11 ${MOUTH_X + 16} 13 Q ${MOUTH_X + 9} 3 ${MOUTH_X} 10 Z`} fill={look.hairColor} stroke={line} strokeWidth={1.5} />;
    case "beard":
      return <path d={`M -30 12 Q -26 50 10 53 Q 40 50 40 14 Q 32 28 ${MOUTH_X} 28 Q 8 28 2 22 Q -12 30 -30 12 Z`} fill={look.hairColor} stroke={line} strokeWidth={1.5} />;
    case "eyepatch":
      return (
        <g>
          <path d="M -42 -26 L 44 -12" stroke="#3a3a3a" strokeWidth={3} />
          <ellipse cx={EYE_FAR.x} cy={EYE_FAR.y} rx={10} ry={11} fill="#2b2b2b" stroke={line} strokeWidth={2} />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M -36 -10 Q -40 -62 2 -62 Q 40 -60 38 -14" fill="none" stroke="#2b2b33" strokeWidth={7} strokeLinecap="round" />
          <rect x={-46} y={-18} width={18} height={30} rx={8} fill={look.accent} stroke={INK} strokeWidth={3} />
        </g>
      );
    case "mask":
      return (
        <g>
          <path d="M -10 -15 Q 15 -22 40 -15 L 38 4 Q 15 -2 -8 4 Z" fill={look.accent} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={EYE_NEAR.x} cy={EYE_NEAR.y - 1} rx={6} ry={4.5} fill="#fff" />
          <ellipse cx={EYE_FAR.x} cy={EYE_FAR.y - 1} rx={4.5} ry={4.5} fill="#fff" />
        </g>
      );
    default:
      return null;
  }
};

// ---------------------------------------------------------------- emote bubble

export const Emote: React.FC<{ kind: SceneCharT["emote"]; frame: number; y: number }> = ({ kind, frame, y }) => {
  const k = Math.min(1, frame / 10);
  const pop = 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2); // ease-out-back
  const bob = Math.sin(frame / 7) * 4;
  const icon: Record<string, React.ReactNode> = {
    exclaim: <text x={0} y={14} textAnchor="middle" fontSize={44} fontWeight={900} fill="#ff3b3b" fontFamily="Arial Black, Arial">!</text>,
    question: <text x={0} y={14} textAnchor="middle" fontSize={40} fontWeight={900} fill="#2e6bff" fontFamily="Arial Black, Arial">?</text>,
    heart: <path d="M 0 14 C -26 -4 -14 -22 0 -10 C 14 -22 26 -4 0 14 Z" fill="#ff4d7a" />,
    anger: <path d="M -12 -12 q 8 6 0 12 M 12 -12 q -8 6 0 12 M -12 12 q 8 -6 12 0 M 12 12 q -8 -6 -12 0" stroke="#e8262a" strokeWidth={5} fill="none" strokeLinecap="round" />,
    sweat: <path d="M 0 -18 Q 16 4 0 16 Q -16 4 0 -18 Z" fill="#59b8ff" />,
    idea: (
      <g>
        <circle cx={0} cy={-4} r={13} fill="#ffd93b" stroke="#c99a00" strokeWidth={2} />
        <rect x={-6} y={8} width={12} height={8} rx={2} fill="#999" />
      </g>
    ),
    zzz: <text x={0} y={12} textAnchor="middle" fontSize={26} fontWeight={900} fill="#6a6aff" fontFamily="Arial Black, Arial">Zz</text>,
    music: <path d="M -6 12 a 6 5 0 1 1 0 -1 L -1 -16 L 14 -12 L 14 6 a 6 5 0 1 1 0 -1 L 14 -6 L -1 -10" fill="#222" stroke="#222" strokeWidth={2} />,
    money: <text x={0} y={13} textAnchor="middle" fontSize={38} fontWeight={900} fill="#2f9a3a" fontFamily="Arial Black, Arial">$</text>,
  };
  return (
    <g transform={`translate(40 ${y + bob}) scale(${Math.max(0, pop)})`} filter="url(#sticker)">
      <path d="M -30 -26 Q -30 -36 -20 -36 L 20 -36 Q 30 -36 30 -26 L 30 18 Q 30 28 20 28 L 2 28 L -12 42 L -8 28 L -20 28 Q -30 28 -30 18 Z" fill="#fff" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <g transform="translate(0 -4)">{icon[kind]}</g>
    </g>
  );
};
