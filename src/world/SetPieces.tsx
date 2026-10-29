import React from "react";
import type { PropImage, SetPiece } from "../schema";
import type { z } from "zod";

type Kind = z.infer<typeof SetPiece>["kind"];
const INK = "#16151d";
const s = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// Pieces that stand in front of characters (they hide the lower body, like a podium).
export const FOREGROUND_PIECES = new Set<Kind>(["podium", "desk", "table", "computer", "cage", "crates", "fire", "moneyPile", "chest"]);
// Light sources and glows look wrong with a white cut-out outline.
const NO_STICKER = new Set<Kind>(["fire", "portal", "lamp", "streetlamp", "cage"]);

// Drawn in local units with the floor at y=0, then scaled to match the characters.
// Props are stickers too: white outline + drop shadow, and they pop in like the characters.
// A library image (if any) replaces the drawing; custom ids without an image draw nothing.
export const SetPieceArt: React.FC<{ kind: Kind; px: number; floorY: number; frame: number; pop: number; image?: PropImage; base?: string }> = ({ kind, px, floorY, frame, pop, image, base = "" }) => {
  const w = image ? image.height * image.aspect : 0;
  return (
    <g transform={`translate(${px} ${floorY}) scale(1.75)`}>
      <ellipse cx={0} cy={2} rx={image ? w * 0.45 : kind === "car" ? 190 : kind === "clock" ? 0 : 110} ry={12} fill="url(#contact)" />
      <g transform={`rotate(${(1 - pop) * 8}) scale(${0.5 + 0.5 * pop})`} filter={!image && NO_STICKER.has(kind) ? undefined : "url(#sticker)"}>
        {image ? (
          <image href={base + image.url} x={-w * image.anchor[0]} y={-image.height * image.anchor[1]} width={w} height={image.height} />
        ) : (
          <Piece kind={kind} frame={frame} />
        )}
      </g>
    </g>
  );
};

const Piece: React.FC<{ kind: Kind; frame: number }> = ({ kind, frame }) => {
  switch (kind) {
    case "podium":
      return (
        <g>
          <path d="M -75 0 L -66 -105 L 66 -105 L 75 0 Z" fill="#2b3f66" {...s} />
          <path d="M -60 -96 L -52 -8" stroke="rgba(255,255,255,0.15)" strokeWidth={8} />
          <rect x={-88} y={-122} width={176} height={22} rx={4} fill="#1d2b44" {...s} />
          <circle cx={0} cy={-58} r={26} fill="#e8c95a" {...s} />
          <path d="M 0 -72 l 5 10 l 11 1 l -8 7 l 3 11 l -11 -6 l -11 6 l 3 -11 l -8 -7 l 11 -1 Z" fill="#1d2b44" />
          <path d="M 30 -122 Q 40 -150 20 -170" fill="none" stroke="#333" strokeWidth={3} />
          <ellipse cx={18} cy={-172} rx={6} ry={8} fill="#555" />
        </g>
      );
    case "desk":
      return (
        <g>
          <rect x={-140} y={-114} width={280} height={18} fill="#7a5232" {...s} />
          <rect x={-130} y={-96} width={100} height={96} fill="#6b4428" {...s} />
          {[0, 1, 2].map((i) => <rect key={i} x={-120} y={-88 + i * 30} width={80} height={24} fill="#7a5232" {...s} />)}
          <rect x={116} y={-96} width={14} height={96} fill="#6b4428" {...s} />
          <rect x={40} y={-136} width={50} height={22} fill="#f2efe6" {...s} />
          <path d="M -40 -114 L -30 -150 L -10 -150 L -20 -114" fill="#e33" {...s} />
        </g>
      );
    case "table":
      return (
        <g>
          <ellipse cx={0} cy={-100} rx={130} ry={20} fill="#8a5a36" {...s} />
          <path d="M -8 -96 L -12 -6 L -40 0 L 40 0 L 12 -6 L 8 -96 Z" fill="#6b4428" {...s} />
          <path d="M -40 -112 L -36 -132 L -16 -132 L -12 -112 Z" fill="#fff" {...s} />
          <circle cx={40} cy={-112} r={14} fill="#f2c25a" {...s} />
        </g>
      );
    case "computer":
      return (
        <g>
          <rect x={-120} y={-92} width={240} height={16} fill="#6b4a2e" {...s} />
          <rect x={-114} y={-76} width={14} height={76} fill="#5b3e26" />
          <rect x={100} y={-76} width={14} height={76} fill="#5b3e26" />
          <rect x={-66} y={-184} width={132} height={86} rx={6} fill="#22252e" {...s} />
          <rect x={-58} y={-176} width={116} height={68} fill="#4fb3ff" />
          {[0, 1, 2].map((i) => <rect key={i} x={-50} y={-168 + i * 18} width={(frame * 3 + i * 40) % 100} height={8} fill="#fff" opacity={0.8} />)}
          <rect x={-10} y={-98} width={20} height={8} fill="#333" />
          <rect x={-50} y={-100} width={70} height={8} rx={3} fill="#ccc" {...s} />
        </g>
      );
    case "bed":
      return (
        <g>
          <rect x={-160} y={-80} width={320} height={60} rx={10} fill="#8f5a9e" {...s} />
          <rect x={-160} y={-96} width={320} height={22} rx={8} fill="#f2e8ff" {...s} />
          <rect x={-170} y={-150} width={22} height={150} fill="#5a3a20" {...s} />
          <rect x={148} y={-110} width={22} height={110} fill="#5a3a20" {...s} />
          <rect x={-140} y={-122} width={80} height={32} rx={14} fill="#fff" {...s} />
          <path d="M -50 -96 Q 40 -110 150 -96 L 150 -40 L -50 -40 Z" fill="#b07ac2" {...s} />
        </g>
      );
    case "tree":
      return (
        <g>
          <path d="M -18 0 L -12 -260 L 12 -260 L 18 0 Z" fill="#7a5232" {...s} />
          <circle cx={0} cy={-310} r={110} fill="#3f8f4f" {...s} />
          <circle cx={-80} cy={-250} r={66} fill="#3f8f4f" {...s} />
          <circle cx={80} cy={-255} r={70} fill="#3f8f4f" {...s} />
          {[[-40, -320], [30, -280], [60, -340]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill="#e33" />)}
        </g>
      );
    case "car":
      return (
        <g>
          <path d="M -180 -40 L -170 -90 L -90 -96 L -56 -150 L 70 -150 L 116 -96 L 176 -86 L 184 -40 Z" fill="#d23c3c" {...s} />
          <path d="M -46 -140 L 0 -140 L 0 -100 L -76 -100 Z" fill="#bfe6ff" {...s} />
          <path d="M 12 -140 L 64 -140 L 98 -100 L 12 -100 Z" fill="#bfe6ff" {...s} />
          <rect x={-180} y={-60} width={364} height={10} fill="#a82a2a" />
          <rect x={160} y={-84} width={20} height={14} rx={4} fill="#ffe27a" {...s} />
          {[-110, 110].map((x) => (
            <g key={x} transform={`translate(${x} -34)`}>
              <circle r={34} fill="#222" {...s} />
              <circle r={14} fill="#bbb" />
            </g>
          ))}
        </g>
      );
    case "trophy":
      return (
        <g>
          <rect x={-46} y={-34} width={92} height={34} fill="#7a5a20" {...s} />
          <rect x={-10} y={-80} width={20} height={46} fill="#e3b500" {...s} />
          <path d="M -50 -170 L 50 -170 L 34 -80 L -34 -80 Z" fill="#f5c400" {...s} />
          <path d="M -50 -160 Q -82 -150 -40 -110 M 50 -160 Q 82 -150 40 -110" fill="none" stroke="#e3b500" strokeWidth={8} />
          <path d="M -24 -160 L -16 -100" stroke="#fff" strokeWidth={6} opacity={0.5} />
        </g>
      );
    case "clock":
      return (
        <g transform="translate(0 -400)">
          <circle r={70} fill="#fff" stroke={INK} strokeWidth={10} />
          {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={Math.cos((i * Math.PI) / 6) * 54} y1={Math.sin((i * Math.PI) / 6) * 54} x2={Math.cos((i * Math.PI) / 6) * 62} y2={Math.sin((i * Math.PI) / 6) * 62} stroke={INK} strokeWidth={4} />)}
          <line x1={0} y1={0} x2={Math.sin(frame / 40) * 40} y2={-Math.cos(frame / 40) * 40} stroke={INK} strokeWidth={8} strokeLinecap="round" />
          <line x1={0} y1={0} x2={Math.sin(frame / 4) * 52} y2={-Math.cos(frame / 4) * 52} stroke="#e33" strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    case "door":
      return (
        <g>
          <rect x={-80} y={-310} width={160} height={310} fill="#5a3a20" {...s} />
          <rect x={-70} y={-300} width={140} height={300} fill="#8a5a36" {...s} />
          <rect x={-54} y={-280} width={108} height={110} fill="#7a4e2e" {...s} />
          <rect x={-54} y={-150} width={108} height={130} fill="#7a4e2e" {...s} />
          <circle cx={50} cy={-150} r={9} fill="#e8c95a" {...s} />
        </g>
      );
    case "couch":
      return (
        <g>
          <rect x={-170} y={-150} width={340} height={80} rx={24} fill="#c45a3a" {...s} />
          <rect x={-180} y={-90} width={360} height={70} rx={16} fill="#d66a48" {...s} />
          <rect x={-200} y={-120} width={50} height={100} rx={20} fill="#b04a2e" {...s} />
          <rect x={150} y={-120} width={50} height={100} rx={20} fill="#b04a2e" {...s} />
          <line x1={0} y1={-88} x2={0} y2={-22} stroke={INK} strokeWidth={3} />
          <rect x={-170} y={-20} width={14} height={20} fill="#3d2614" />
          <rect x={156} y={-20} width={14} height={20} fill="#3d2614" />
          <rect x={-120} y={-140} width={60} height={50} rx={12} fill="#ffd34d" {...s} transform="rotate(-10 -90 -115)" />
        </g>
      );
    case "fridge":
      return (
        <g>
          <rect x={-70} y={-320} width={140} height={320} rx={14} fill="#e8eef2" {...s} />
          <line x1={-70} y1={-200} x2={70} y2={-200} stroke={INK} strokeWidth={3} />
          <rect x={46} y={-290} width={8} height={60} rx={4} fill="#999" />
          <rect x={46} y={-180} width={8} height={80} rx={4} fill="#999" />
          {[["#e33", -40, -260], ["#3a7", -20, -240], ["#37e", -46, -150]].map(([c, x, y], i) => <rect key={i} x={x as number} y={y as number} width={22} height={16} fill={c as string} {...s} />)}
        </g>
      );
    case "plant":
      return (
        <g>
          {[-50, -20, 10, 40, -35, 25].map((a, i) => (
            <path key={i} d={`M 0 -60 Q ${a} ${-120 - i * 6 + Math.sin(frame / 15 + i) * 4} ${a * 1.6} ${-160 - (i % 3) * 20} Q ${a * 0.6} ${-110} 0 -60`} fill={i % 2 ? "#3f9a52" : "#2f7f42"} {...s} />
          ))}
          <path d="M -40 -64 L 40 -64 L 30 0 L -30 0 Z" fill="#c8693a" {...s} />
          <rect x={-46} y={-72} width={92} height={14} rx={4} fill="#d97a48" {...s} />
        </g>
      );
    case "lamp":
      return (
        <g>
          <rect x={-40} y={-10} width={80} height={10} rx={4} fill="#333" />
          <rect x={-4} y={-240} width={8} height={230} fill="#444" />
          <path d="M -60 -240 L -34 -310 L 34 -310 L 60 -240 Z" fill="#f2d48a" {...s} />
          <path d="M -60 -240 L -150 0 L 150 0 L 60 -240 Z" fill="rgba(255,230,150,0.12)" />
        </g>
      );
    case "bookshelf":
      return (
        <g>
          <rect x={-110} y={-340} width={220} height={340} fill="#7a5232" {...s} />
          {[0, 1, 2, 3].map((r) => (
            <g key={r}>
              <rect x={-100} y={-330 + r * 82} width={200} height={72} fill="#5a3a20" />
              {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={-96 + i * 24} y={-322 + r * 82 + (i % 3) * 6} width={20} height={64 - (i % 3) * 6} fill={["#c2452d", "#2e6bc2", "#e8b73a", "#3a9a5b", "#8a4fb5"][(i + r) % 5]} stroke={INK} strokeWidth={1.5} />)}
            </g>
          ))}
        </g>
      );
    case "tv":
      return (
        <g>
          <rect x={-90} y={-60} width={180} height={60} fill="#6b4a2e" {...s} />
          <rect x={-130} y={-230} width={260} height={160} rx={10} fill="#22252e" {...s} />
          <rect x={-118} y={-218} width={236} height={136} fill={frame % 40 < 20 ? "#4fb3ff" : "#5fd3a0"} />
          <circle cx={0} cy={-150} r={30} fill="#fff" opacity={0.6} />
        </g>
      );
    case "bench":
      return (
        <g>
          {[0, 1].map((i) => <rect key={i} x={-150} y={-110 + i * 26} width={300} height={18} rx={4} fill="#8a5a36" {...s} />)}
          <rect x={-150} y={-56} width={300} height={16} rx={4} fill="#8a5a36" {...s} />
          {[-130, 120].map((x) => <path key={x} d={`M ${x} -110 L ${x} 0 M ${x - 10} 0 L ${x + 20} 0`} stroke="#333" strokeWidth={8} />)}
        </g>
      );
    case "streetlamp":
      return (
        <g>
          <rect x={-6} y={-460} width={12} height={460} fill="#333" />
          <path d="M 0 -460 Q 0 -500 60 -500" fill="none" stroke="#333" strokeWidth={10} />
          <path d="M 40 -500 L 80 -500 L 90 -470 L 30 -470 Z" fill="#555" {...s} />
          <ellipse cx={60} cy={-466} rx={24} ry={8} fill="#ffe9a0" />
          <path d="M 30 -466 L -60 0 L 180 0 L 90 -466 Z" fill="rgba(255,233,160,0.14)" />
        </g>
      );
    case "rocket":
      return (
        <g>
          <path d="M -50 -60 L -50 -300 Q 0 -420 50 -300 L 50 -60 Z" fill="#eef1f6" {...s} />
          <circle cx={0} cy={-260} r={26} fill="#4fb3ff" stroke={INK} strokeWidth={5} />
          <path d="M -50 -140 L -100 -40 L -50 -60 Z M 50 -140 L 100 -40 L 50 -60 Z" fill="#d23c3c" {...s} />
          <path d="M -30 -60 L 30 -60 L 20 -30 L -20 -30 Z" fill="#666" {...s} />
          <path d={`M -20 -30 Q 0 ${20 + Math.sin(frame) * 10} 20 -30 Z`} fill="#ffb13d" />
          <rect x={-50} y={-200} width={100} height={14} fill="#d23c3c" />
        </g>
      );
    case "portal": {
      const r = (frame * 3) % 360;
      return (
        <g transform="translate(0 -170)">
          <ellipse rx={110} ry={170} fill="#2a0a4a" />
          {[0, 1, 2].map((i) => <ellipse key={i} rx={110 - i * 28} ry={170 - i * 40} fill="none" stroke={["#b96aff", "#5ad1ff", "#ff6ad5"][i]} strokeWidth={10} strokeDasharray="40 20" transform={`rotate(${r * (i % 2 ? -1 : 1)})`} />)}
          <ellipse rx={40} ry={60} fill="#fff" opacity={0.25 + 0.15 * Math.sin(frame / 5)} />
        </g>
      );
    }
    case "chest":
      return (
        <g>
          <rect x={-90} y={-90} width={180} height={90} fill="#8a5a36" {...s} />
          <path d="M -90 -90 Q 0 -150 90 -90 Z" fill="#7a4e2e" {...s} />
          {[-70, 70].map((x) => <rect key={x} x={x - 8} y={-120} width={16} height={120} fill="#c9a23a" />)}
          <rect x={-14} y={-100} width={28} height={30} fill="#e8c95a" {...s} />
          {Array.from({ length: 5 }).map((_, i) => <circle key={i} cx={-50 + i * 25} cy={-104 - (i % 2) * 8} r={10} fill="#f5c400" {...s} />)}
        </g>
      );
    case "throne":
      return (
        <g>
          <path d="M -80 -360 L -60 -400 L -30 -370 L 0 -420 L 30 -370 L 60 -400 L 80 -360 L 80 -100 L -80 -100 Z" fill="#9a1c2c" {...s} />
          <rect x={-60} y={-340} width={120} height={230} rx={12} fill="#c42a40" />
          <rect x={-110} y={-130} width={220} height={60} rx={10} fill="#e8b73a" {...s} />
          <rect x={-100} y={-70} width={30} height={70} fill="#c99a2a" {...s} />
          <rect x={70} y={-70} width={30} height={70} fill="#c99a2a" {...s} />
          <circle cx={0} cy={-380} r={12} fill="#3fb7ff" />
        </g>
      );
    case "cage":
      return (
        <g>
          <rect x={-130} y={-380} width={260} height={20} fill="#555" {...s} />
          <rect x={-130} y={-20} width={260} height={20} fill="#555" {...s} />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-124 + i * 30} y={-360} width={10} height={340} fill="#666" stroke={INK} strokeWidth={2} />)}
        </g>
      );
    case "crates":
      return (
        <g>
          {[[-70, 0], [50, 0], [-10, -110]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect x={-55} y={-110} width={110} height={110} fill="#b07a42" {...s} />
              <path d="M -55 -110 L 55 0 M 55 -110 L -55 0" stroke="#8a5a2e" strokeWidth={8} />
              <rect x={-55} y={-110} width={110} height={110} fill="none" stroke="#7a4e22" strokeWidth={8} />
            </g>
          ))}
        </g>
      );
    case "vending":
      return (
        <g>
          <rect x={-90} y={-340} width={180} height={340} rx={10} fill="#d23c3c" {...s} />
          <rect x={-74} y={-320} width={110} height={220} fill="#cfe9ff" {...s} />
          {Array.from({ length: 12 }).map((_, i) => <rect key={i} x={-66 + (i % 3) * 34} y={-310 + Math.floor(i / 3) * 52} width={24} height={40} rx={4} fill={["#ffd34d", "#5ad1ff", "#7cdf6a"][i % 3]} stroke={INK} strokeWidth={2} />)}
          <rect x={46} y={-300} width={30} height={60} fill="#333" />
          <rect x={-74} y={-80} width={110} height={40} fill="#222" />
        </g>
      );
    case "fire":
      return (
        <g>
          {[-40, 0, 40].map((x, i) => <rect key={i} x={x - 30} y={-20 - (i % 2) * 6} width={60} height={16} rx={8} fill="#6b4428" {...s} transform={`rotate(${(i - 1) * 20} ${x} -12)`} />)}
          {[0, 1, 2].map((i) => {
            const h = 120 + Math.sin(frame / 3 + i * 2) * 20 - i * 30;
            return <path key={i} d={`M ${-50 + i * 15} -10 Q ${-40 + i * 12} ${-h * 0.6} ${Math.sin(frame / 4 + i) * 10} ${-h} Q ${40 - i * 12} ${-h * 0.6} ${50 - i * 15} -10 Z`} fill={["#ff5a1f", "#ffb13d", "#ffe680"][i]} />;
          })}
          <circle cx={0} cy={-60} r={140} fill="rgba(255,150,50,0.12)" />
        </g>
      );
    case "sign":
      return (
        <g>
          <rect x={-8} y={-260} width={16} height={260} fill="#6b4428" {...s} />
          <path d="M -110 -250 L 90 -250 L 120 -215 L 90 -180 L -110 -180 Z" fill="#f2c25a" {...s} />
          <path d="M -90 -215 L 60 -215" stroke="#6b4428" strokeWidth={10} strokeLinecap="round" />
        </g>
      );
    case "moneyPile":
      return (
        <g>
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={-110 + (i % 4) * 55 + Math.floor(i / 4) * 25} y={-30 - Math.floor(i / 4) * 30} width={60} height={30} rx={3} fill="#6ccf64" {...s} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => <circle key={i} cx={-90 + i * 36} cy={-8} r={12} fill="#f5c400" {...s} />)}
        </g>
      );
    default:
      return null;
  }
};
