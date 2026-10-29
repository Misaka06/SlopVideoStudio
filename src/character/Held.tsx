import React from "react";
import type { GripClass, PropImage, SceneCharT } from "../schema";

// Held props. Each is drawn at the hand, upright in world space (not rotated with the
// forearm), facing +x. "solid" goes inside the sticker outline; "fx" holds thin details
// (lines, beams, sparkles) that would look messy with a white outline.

type Item = SceneCharT["holds"];
const INK = "#16151d";
const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// How the front arm holds each item: [upperArm, forearm] in degrees (positive = forward).
const SIDE: [number, number] = [6, 0];
const CHEST: [number, number] = [30, 100];
const FORWARD: [number, number] = [82, 2];
const LOW_FRONT: [number, number] = [25, 60];
const MOUTH: [number, number] = [60, 120];
export const GRIPS: Record<Item, [number, number]> = {
  none: [-6, -6], phone: CHEST, money: CHEST, sign: LOW_FRONT, book: CHEST, sword: LOW_FRONT, cup: CHEST,
  fishingRod: [48, 30], briefcase: SIDE, mic: MOUTH, pizza: CHEST, laptop: CHEST, umbrella: LOW_FRONT,
  flashlight: FORWARD, trophy: CHEST, flag: LOW_FRONT, newspaper: CHEST, guitar: [30, 95], wand: [70, 30],
  map: CHEST, key: FORWARD, moneyBag: SIDE, balloon: SIDE, magnifier: [65, 40],
};
// Arm angles for each grip class used by image props from the library.
export const GRIP_CLASS: Record<GripClass, [number, number]> = { side: SIDE, chest: CHEST, forward: FORWARD, lowFront: LOW_FRONT, mouth: MOUTH };

// Arm angles for whatever the character holds: an image prop's grip, a built-in's grip,
// or the chest grip for anything else.
export const gripFor = (kind: Item, image?: PropImage): [number, number] => (image ? GRIP_CLASS[image.grip] : GRIPS[kind] ?? CHEST);

// Items that look right raised overhead when the pose is armsUp/celebrate.
export const RAISABLE = new Set<Item>(["trophy", "flag", "sword", "wand", "moneyBag", "money", "sign", "balloon", "key", "pizza", "book"]);

// A held prop from the library: the image's grip point sits in the hand, upright.
export const HeldImage: React.FC<{ img: PropImage; base: string; frame: number }> = ({ img, base, frame }) => {
  const h = img.height;
  const w = h * img.aspect;
  const sway = img.grip === "side" || img.grip === "lowFront" ? Math.sin(frame / 12) * 3 : 0;
  return (
    <g transform={`rotate(${sway})`}>
      <image href={base + img.url} x={-w * img.anchor[0]} y={-h * img.anchor[1]} width={w} height={h} />
    </g>
  );
};

// Text inside props must not be mirrored when the character faces left.
const Unflip: React.FC<{ mirror: boolean; x: number; y: number; children: React.ReactNode }> = ({ mirror, x, y, children }) => (
  <g transform={mirror ? `translate(${x} ${y}) scale(-1 1) translate(${-x} ${-y})` : undefined}>{children}</g>
);

export const Held: React.FC<{ kind: Item; part: "solid" | "fx"; frame: number; accent: string; mirror: boolean }> = ({ kind, part, frame, accent, mirror }) => {
  const sway = Math.sin(frame / 12) * 3;
  const solid = part === "solid";
  switch (kind) {
    case "phone":
      return solid ? (
        <g transform="rotate(-12)">
          <rect x={-13} y={-40} width={26} height={44} rx={7} fill="#2a2a33" {...s} />
          <rect x={-8} y={-34} width={16} height={30} rx={3} fill="#58c4ff" />
          <circle cx={0} cy={-26} r={4} fill="#fff" opacity={0.85} />
        </g>
      ) : null;
    case "money":
      return solid ? (
        <g transform="translate(6 -14)">
          {[-14, 0, 14].map((r, i) => (
            <g key={i} transform={`rotate(${r - 20})`}>
              <rect x={-14} y={-38} width={28} height={50} rx={5} fill={i === 1 ? "#7fd86f" : "#6cc95e"} {...s} />
              <Unflip mirror={mirror} x={0} y={-13}><text x={0} y={-6} textAnchor="middle" fontSize={20} fontWeight={900} fill="#2f7a2c" fontFamily="Arial Black, Arial">$</text></Unflip>
            </g>
          ))}
        </g>
      ) : null;
    case "sign":
      return solid ? (
        <g transform={`rotate(${sway})`}>
          <rect x={-5} y={-170} width={10} height={180} rx={5} fill="#a0703f" {...s} />
          <rect x={-64} y={-236} width={128} height={78} rx={14} fill="#fff6dc" {...s} />
          <rect x={-44} y={-214} width={88} height={10} rx={5} fill="#e05a4a" />
          <rect x={-44} y={-192} width={60} height={10} rx={5} fill="#e05a4a" />
        </g>
      ) : null;
    case "book":
      return solid ? (
        <g transform="rotate(-8)">
          <rect x={-22} y={-50} width={44} height={56} rx={6} fill="#c8503a" {...s} />
          <rect x={-22} y={-50} width={10} height={56} rx={4} fill="#9a3626" />
          <rect x={-4} y={-38} width={20} height={8} rx={4} fill="#ffd56b" />
        </g>
      ) : null;
    case "sword":
      return solid ? (
        <g transform={`rotate(${12 + sway})`}>
          <path d="M -8 -16 L -8 -150 Q 0 -170 8 -150 L 8 -16 Z" fill="#e6ebf3" {...s} />
          <rect x={-26} y={-22} width={52} height={12} rx={6} fill="#d8aa3a" {...s} />
          <rect x={-6} y={-10} width={12} height={24} rx={5} fill="#7a4e2c" {...s} />
        </g>
      ) : null;
    case "cup":
      return solid ? (
        <g>
          <path d="M -16 -42 L 16 -42 L 13 2 Q 0 8 -13 2 Z" fill="#fff" {...s} />
          <rect x={-15} y={-30} width={30} height={12} fill={accent} />
          <path d="M 16 -34 Q 30 -28 16 -14" fill="none" {...s} />
        </g>
      ) : (
        <g stroke="rgba(255,255,255,0.75)" strokeWidth={4} strokeLinecap="round" fill="none">
          {[0, 1].map((i) => <path key={i} d={`M ${-5 + i * 10} -50 q 6 -8 0 -16 q -6 -8 0 -16`} opacity={0.4 + 0.4 * Math.sin(frame / 6 + i * 2)} />)}
        </g>
      );
    case "fishingRod": {
      // Rod points up and forward; the line drops straight down from the tip.
      const tipX = 150 + sway;
      const tipY = -120;
      return solid ? (
        <g>
          <path d={`M -8 6 Q 70 -60 ${tipX} ${tipY}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
          <path d={`M -8 6 Q 70 -60 ${tipX} ${tipY}`} fill="none" stroke="#8a5a34" strokeWidth={6} strokeLinecap="round" />
          <circle cx={4} cy={-4} r={10} fill="#9aa1ad" {...s} />
        </g>
      ) : (
        <g>
          <path d={`M ${tipX} ${tipY} Q ${tipX + 6} ${tipY + 90} ${tipX + 4 + Math.sin(frame / 15) * 4} ${tipY + 170}`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2.5} />
          <g transform={`translate(${tipX + 4 + Math.sin(frame / 15) * 4} ${tipY + 170 + Math.sin(frame / 9) * 3})`}>
            <circle r={9} fill="#ff4d4d" stroke={INK} strokeWidth={3} />
            <path d="M -9 0 A 9 9 0 0 0 9 0 Z" fill="#fff" stroke={INK} strokeWidth={3} />
          </g>
        </g>
      );
    }
    case "briefcase":
      return solid ? (
        <g transform={`rotate(${sway})`}>
          <path d="M -12 2 L -12 -6 Q -12 -10 -8 -10 L 8 -10 Q 12 -10 12 -6 L 12 2" fill="none" {...s} />
          <rect x={-34} y={2} width={68} height={48} rx={9} fill="#6b4426" {...s} />
          <rect x={-6} y={18} width={12} height={10} rx={3} fill="#e8c95a" />
        </g>
      ) : null;
    case "mic":
      return solid ? (
        <g transform="rotate(-20)">
          <rect x={-6} y={-30} width={12} height={40} rx={6} fill="#2b2b33" {...s} />
          <circle cx={0} cy={-40} r={14} fill="#9aa1ad" {...s} />
        </g>
      ) : null;
    case "pizza":
      return solid ? (
        <g transform="rotate(-30)">
          <path d="M -28 -10 L 28 -10 L 0 50 Z" fill="#f6c453" {...s} />
          <rect x={-31} y={-20} width={62} height={14} rx={7} fill="#c9852e" {...s} />
          {[[-9, 4], [8, 10], [0, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5.5} fill="#d84a3a" />)}
        </g>
      ) : null;
    case "laptop":
      return solid ? (
        <g transform="translate(-6 -10)">
          <rect x={-36} y={-46} width={72} height={46} rx={7} fill="#3a3d48" {...s} />
          <rect x={-29} y={-39} width={58} height={32} rx={3} fill="#5fd3ff" />
          <rect x={-44} y={0} width={88} height={10} rx={5} fill="#a9b0bc" {...s} />
        </g>
      ) : null;
    case "umbrella":
      return solid ? (
        <g transform={`rotate(${sway * 0.6})`}>
          <path d="M 0 10 L 0 -170" stroke={INK} strokeWidth={10} strokeLinecap="round" />
          <path d="M 0 10 L 0 -170" stroke="#555" strokeWidth={4} strokeLinecap="round" />
          <path d="M -96 -160 Q 0 -260 96 -160 Q 72 -176 48 -160 Q 24 -176 0 -160 Q -24 -176 -48 -160 Q -72 -176 -96 -160 Z" fill={accent} {...s} />
        </g>
      ) : null;
    case "flashlight":
      return solid ? (
        <g>
          <rect x={-10} y={-11} width={46} height={22} rx={8} fill="#454a56" {...s} />
          <path d="M 34 -16 L 50 -20 L 50 20 L 34 16 Z" fill="#6a707e" {...s} />
        </g>
      ) : (
        <path d="M 50 -18 L 420 -120 L 420 120 L 50 18 Z" fill="rgba(255,240,170,0.22)" />
      );
    case "trophy":
      return solid ? (
        <g transform="translate(0 -12)">
          <rect x={-20} y={-6} width={40} height={14} rx={4} fill="#7a5a20" {...s} />
          <rect x={-6} y={-26} width={12} height={22} fill="#e3b500" {...s} />
          <path d="M -30 -76 L 30 -76 Q 30 -26 0 -26 Q -30 -26 -30 -76 Z" fill="#f5c400" {...s} />
          <path d="M -30 -66 Q -46 -60 -32 -42 M 30 -66 Q 46 -60 32 -42" fill="none" stroke="#d8a800" strokeWidth={6} strokeLinecap="round" />
          <ellipse cx={-12} cy={-60} rx={5} ry={10} fill="#fff" opacity={0.5} />
        </g>
      ) : null;
    case "flag":
      return solid ? (
        <g>
          <rect x={-5} y={-190} width={10} height={200} rx={5} fill="#7a5232" {...s} />
          <path d={`M 4 -186 Q 44 ${-200 + Math.sin(frame / 5) * 8} 96 -184 L 96 -124 Q 44 ${-138 + Math.sin(frame / 5 + 1) * 8} 4 -126 Z`} fill={accent} {...s} />
          <circle cx={50} cy={-156} r={11} fill="#fff" />
        </g>
      ) : null;
    case "newspaper":
      return solid ? (
        <g transform="rotate(-6) translate(-4 -24)">
          <rect x={-34} y={-30} width={68} height={56} rx={4} fill="#f2efe6" {...s} />
          <rect x={-26} y={-22} width={52} height={10} rx={3} fill="#3a3a3a" />
          {[-4, 6, 16].map((y) => <rect key={y} x={-26} y={y} width={y === 16 ? 30 : 52} height={4} rx={2} fill="#a9a9a9" />)}
        </g>
      ) : null;
    case "guitar":
      return solid ? (
        <g transform="rotate(-55) translate(0 10)">
          <rect x={-6} y={-130} width={12} height={110} rx={4} fill="#5a3a20" {...s} />
          <rect x={-11} y={-150} width={22} height={24} rx={6} fill="#3d2614" {...s} />
          <path d="M 0 -26 C -40 -26 -42 18 -24 28 C -44 48 -30 82 0 82 C 30 82 44 48 24 28 C 42 18 40 -26 0 -26 Z" fill="#e0862e" {...s} />
          <circle cx={0} cy={26} r={10} fill="#3d2614" />
        </g>
      ) : null;
    case "wand":
      return solid ? (
        <g transform={`rotate(${20 + sway})`}>
          <rect x={-5} y={-90} width={10} height={96} rx={5} fill="#3d2614" {...s} />
          <path d="M 0 -122 l 8 15 l 16 2 l -12 11 l 4 16 l -16 -9 l -16 9 l 4 -16 l -12 -11 l 16 -2 Z" fill="#ffe14d" {...s} transform={`rotate(${Math.sin(frame / 8) * 15} 0 -104)`} />
        </g>
      ) : (
        <g fill="#fff6a0">
          {[0, 1, 2, 3].map((i) => {
            const t = ((frame * 2 + i * 15) % 60) / 60;
            return <circle key={i} cx={30 + Math.sin(i * 2 + frame / 6) * 30} cy={-120 - t * 70} r={4 * (1 - t)} />;
          })}
        </g>
      );
    case "map":
      return solid ? (
        <g transform="translate(-4 -24)">
          <path d="M -40 -26 L -14 -32 L 14 -26 L 40 -32 L 40 26 L 14 32 L -14 26 L -40 32 Z" fill="#f2e2b4" {...s} />
          <path d="M -28 12 q 18 -26 36 -6 t 18 -14" fill="none" stroke="#d24a3a" strokeWidth={4} strokeDasharray="6 6" strokeLinecap="round" />
          <path d="M 22 -18 l 10 10 m 0 -10 l -10 10" stroke="#d24a3a" strokeWidth={5} strokeLinecap="round" />
        </g>
      ) : null;
    case "key":
      return solid ? (
        <g transform="rotate(-80)">
          <circle cx={0} cy={-16} r={14} fill="none" stroke={INK} strokeWidth={13} />
          <circle cx={0} cy={-16} r={14} fill="none" stroke="#f0c548" strokeWidth={6} />
          <path d="M 0 0 L 0 46 M 0 36 L 12 36 M 0 26 L 10 26" stroke={INK} strokeWidth={13} strokeLinecap="round" />
          <path d="M 0 0 L 0 46 M 0 36 L 12 36 M 0 26 L 10 26" stroke="#f0c548" strokeWidth={6} strokeLinecap="round" />
        </g>
      ) : null;
    case "moneyBag":
      // Hangs below the hand, gathered at the top where the hand grips it.
      return solid ? (
        <g transform={`rotate(${sway})`}>
          <path d="M -10 6 C -50 26 -48 78 -30 86 Q 0 96 30 86 C 48 78 50 26 10 6 Z" fill="#cfae6c" {...s} />
          <path d="M -12 6 L -16 -6 L 16 -6 L 12 6 Z" fill="#b8955a" {...s} />
          <path d="M -14 10 Q 0 18 14 10" fill="none" stroke="#8a6a36" strokeWidth={4} strokeLinecap="round" />
          <Unflip mirror={mirror} x={0} y={56}><text x={0} y={70} textAnchor="middle" fontSize={34} fontWeight={900} fill="#2f7a2c" fontFamily="Arial Black, Arial">$</text></Unflip>
        </g>
      ) : null;
    case "balloon":
      return solid ? (
        <g transform={`translate(${sway * 2} 0)`}>
          <ellipse cx={20} cy={-190} rx={36} ry={44} fill={accent} {...s} />
          <ellipse cx={8} cy={-206} rx={8} ry={13} fill="#fff" opacity={0.5} />
          <path d="M 14 -146 L 26 -146 L 20 -138 Z" fill={accent} {...s} />
        </g>
      ) : (
        <path d={`M 0 0 Q ${16 + sway * 3} -70 ${20 + sway * 2} -138`} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />
      );
    case "magnifier":
      return solid ? (
        <g transform="rotate(30)">
          <rect x={-6} y={-6} width={12} height={34} rx={6} fill="#5a3a20" {...s} transform="rotate(180)" />
          <circle cx={0} cy={-34} r={26} fill="rgba(190,235,255,0.55)" stroke={INK} strokeWidth={9} />
          <circle cx={0} cy={-34} r={26} fill="none" stroke="#454a56" strokeWidth={4} />
          <path d="M -12 -44 Q -6 -52 4 -52" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      ) : null;
    default:
      return null;
  }
};
