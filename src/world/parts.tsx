import React from "react";
import type { SceneT } from "../schema";

// Reusable scenery pieces for backgrounds. Canvas is 1920x1080; floor line at y=880.

export type Time = SceneT["time"];
export const INK = "#1d1b26";

const SKIES: Record<Time, [string, string]> = {
  day: ["#7fb8ef", "#dcefff"],
  sunset: ["#4b3a7a", "#f59a6a"],
  night: ["#070b24", "#2a2350"],
};

export const Grad: React.FC<{ id: string; top: string; bottom: string; x?: number; y?: number; w?: number; h?: number }> = ({ id, top, bottom, x = 0, y = 0, w = 1920, h = 1080 }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
  </>
);

// Outdoor sky that follows the time of day; `day` overrides the default daytime colors.
export const Sky: React.FC<{ t: Time; day?: [string, string]; h?: number }> = ({ t, day, h = 1080 }) => {
  const [a, b] = t === "day" && day ? day : SKIES[t];
  return (
    <>
      <Grad id={`sky-${t}-${a.slice(1)}`} top={a} bottom={b} h={h} />
      {t === "night" && <Stars n={60} maxY={h * 0.7} />}
    </>
  );
};

export const Stars: React.FC<{ n: number; maxY: number }> = ({ n, maxY }) => (
  <g>
    {Array.from({ length: n }).map((_, i) => (
      <circle key={i} cx={(i * 397 + 53) % 1920} cy={(i * 211 + 17) % maxY} r={(i % 3) * 0.8 + 1} fill="#fff" opacity={0.35 + (i % 5) / 8} />
    ))}
  </g>
);

export const Celestial: React.FC<{ t: Time; x: number; y: number }> = ({ t, x, y }) =>
  t === "night" ? (
    <g>
      <circle cx={x} cy={y} r={90} fill="rgba(255,250,220,0.08)" />
      <circle cx={x} cy={y} r={58} fill="#f6f1d0" />
      <circle cx={x - 18} cy={y - 10} r={10} fill="#e2dcb5" />
      <circle cx={x + 16} cy={y + 18} r={7} fill="#e2dcb5" />
    </g>
  ) : (
    <g>
      <circle cx={x} cy={y + (t === "sunset" ? 260 : 0)} r={140} fill={t === "sunset" ? "rgba(255,170,90,0.25)" : "rgba(255,240,170,0.25)"} />
      <circle cx={x} cy={y + (t === "sunset" ? 260 : 0)} r={80} fill={t === "sunset" ? "#ffb36b" : "#ffe27a"} />
    </g>
  );

export const Cloud: React.FC<{ x: number; y: number; s?: number; t: Time }> = ({ x, y, s = 1, t }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={t === "night" ? "#3a3560" : t === "sunset" ? "#f7c4a8" : "#fff"} opacity={0.9}>
    <ellipse cx={0} cy={0} rx={90} ry={34} />
    <circle cx={-40} cy={-16} r={36} />
    <circle cx={20} cy={-30} r={48} />
    <circle cx={64} cy={-8} r={30} />
  </g>
);

export const Hills: React.FC<{ y: number; amp: number; color: string; seed?: number }> = ({ y, amp, color, seed = 0 }) => {
  const pts = Array.from({ length: 9 }).map((_, i) => `${i * 240} ${y - amp * (0.5 + 0.5 * Math.sin(i * 1.7 + seed))}`);
  return <path d={`M 0 1080 L 0 ${y} ${pts.map((p, i) => (i ? `Q ${i * 240 - 120} ${y - amp * 1.1} ${p}` : `L ${p}`)).join(" ")} L 1920 1080 Z`} fill={color} />;
};

export const Wall: React.FC<{ top: string; bottom: string; id: string }> = ({ top, bottom, id }) => (
  <>
    <Grad id={id} top={top} bottom={bottom} />
    <rect y={850} width={1920} height={30} fill="rgba(0,0,0,0.18)" />
  </>
);

export const Planks: React.FC<{ color: string }> = ({ color }) => (
  <g>
    <rect y={880} width={1920} height={200} fill={color} />
    {[912, 952, 1000, 1056].map((y) => <line key={y} x1={0} y1={y} x2={1920} y2={y} stroke="rgba(0,0,0,0.15)" strokeWidth={3} />)}
    {Array.from({ length: 14 }).map((_, i) => <line key={i} x1={(i * 263) % 1920} y1={912 + (i % 3) * 44} x2={(i * 263) % 1920} y2={952 + (i % 3) * 48} stroke="rgba(0,0,0,0.12)" strokeWidth={3} />)}
    <rect y={880} width={1920} height={8} fill="rgba(255,255,255,0.08)" />
  </g>
);

export const Tiles: React.FC<{ a: string; b: string }> = ({ a, b }) => (
  <g>
    <rect y={880} width={1920} height={200} fill={a} />
    {Array.from({ length: 4 }).map((_, r) =>
      Array.from({ length: 16 }).map((_, c) => ((r + c) % 2 ? <rect key={`${r}-${c}`} x={c * 120} y={880 + r * 50} width={120} height={50} fill={b} /> : null)),
    )}
    <rect y={880} width={1920} height={6} fill="rgba(0,0,0,0.2)" />
  </g>
);

export const Ground: React.FC<{ color: string; edge?: string }> = ({ color, edge }) => (
  <g>
    <rect y={880} width={1920} height={200} fill={color} />
    <rect y={880} width={1920} height={10} fill={edge ?? "rgba(0,0,0,0.12)"} />
  </g>
);

// A window that shows the sky for the current time of day.
export const Win: React.FC<{ x: number; y: number; w: number; h: number; t: Time; frame?: string; curtains?: string }> = ({ x, y, w, h, t, frame = "#f2f2f2", curtains }) => {
  const [a, b] = SKIES[t];
  const id = `win-${x}-${y}-${t}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} stroke={frame} strokeWidth={14} />
      {t === "night" && <circle cx={x + w * 0.7} cy={y + h * 0.3} r={Math.min(w, h) * 0.1} fill="#f6f1d0" />}
      {t !== "night" && <ellipse cx={x + w * 0.35} cy={y + h * 0.35} rx={w * 0.18} ry={h * 0.06} fill="#fff" opacity={0.7} />}
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={frame} strokeWidth={8} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={frame} strokeWidth={8} />
      <path d={`M ${x + 10} ${y + h - 10} L ${x + w * 0.4} ${y + 10}`} stroke="rgba(255,255,255,0.35)" strokeWidth={6} />
      <rect x={x - 20} y={y + h} width={w + 40} height={16} fill={frame} />
      {curtains && (
        <>
          <path d={`M ${x - 40} ${y - 30} L ${x + 40} ${y - 30} Q ${x + 10} ${y + h * 0.6} ${x + 30} ${y + h + 20} L ${x - 40} ${y + h + 20} Z`} fill={curtains} />
          <path d={`M ${x + w + 40} ${y - 30} L ${x + w - 40} ${y - 30} Q ${x + w - 10} ${y + h * 0.6} ${x + w - 30} ${y + h + 20} L ${x + w + 40} ${y + h + 20} Z`} fill={curtains} />
          <rect x={x - 60} y={y - 40} width={w + 120} height={12} rx={6} fill="#6b4a2e" />
        </>
      )}
    </g>
  );
};

export const Shelf: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => {
  const colors = ["#c2452d", "#2e6bc2", "#e8b73a", "#3a9a5b", "#8a4fb5", "#e07b39"];
  const books = [];
  let bx = x + 10;
  for (let i = 0; bx < x + w - 30; i++) {
    const bw = 18 + ((i * 7) % 14);
    const bh = 50 + ((i * 13) % 26);
    books.push(<rect key={i} x={bx} y={y - bh} width={bw} height={bh} fill={colors[i % colors.length]} stroke={INK} strokeWidth={2} transform={i % 7 === 4 ? `rotate(-12 ${bx} ${y})` : undefined} />);
    bx += bw + 3;
  }
  return (
    <g>
      {books}
      <rect x={x} y={y} width={w} height={12} fill="#7a5432" stroke={INK} strokeWidth={2} />
    </g>
  );
};

export const Plant: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[-50, -20, 10, 40, -35, 25].map((a, i) => (
      <path key={i} d={`M 0 -50 Q ${a} ${-110 - i * 6} ${a * 1.6} ${-150 - (i % 3) * 20} Q ${a * 0.6} ${-100} 0 -50`} fill={i % 2 ? "#3f9a52" : "#2f7f42"} stroke={INK} strokeWidth={2} />
    ))}
    <path d="M -40 -60 L 40 -60 L 30 0 L -30 0 Z" fill="#c8693a" stroke={INK} strokeWidth={3} />
    <rect x={-44} y={-66} width={88} height={14} rx={4} fill="#d97a48" stroke={INK} strokeWidth={3} />
  </g>
);

export const HangingLamp: React.FC<{ x: number; color?: string }> = ({ x, color = "#ffd36b" }) => (
  <g>
    <line x1={x} y1={0} x2={x} y2={150} stroke="#333" strokeWidth={4} />
    <path d={`M ${x - 60} 210 L ${x - 30} 150 L ${x + 30} 150 L ${x + 60} 210 Z`} fill="#2d3142" stroke={INK} strokeWidth={3} />
    <ellipse cx={x} cy={214} rx={24} ry={10} fill={color} />
    <path d={`M ${x - 60} 214 L ${x - 260} 880 L ${x + 260} 880 L ${x + 60} 214 Z`} fill={color} opacity={0.08} />
  </g>
);

export const Poster: React.FC<{ x: number; y: number; w: number; h: number; color: string; tilt?: number; art?: "chart" | "star" | "face" | "mountain" }> = ({ x, y, w, h, color, tilt = 0, art = "star" }) => (
  <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
    <rect x={x} y={y} width={w} height={h} fill={color} stroke={INK} strokeWidth={4} />
    {art === "chart" && <polyline points={`${x + 15},${y + h - 20} ${x + w * 0.35},${y + h * 0.5} ${x + w * 0.6},${y + h * 0.65} ${x + w - 15},${y + 20}`} fill="none" stroke="#fff" strokeWidth={6} />}
    {art === "star" && <path transform={`translate(${x + w / 2} ${y + h / 2}) scale(${Math.min(w, h) / 80})`} d="M 0 -30 L 9 -9 L 30 -9 L 13 5 L 19 27 L 0 14 L -19 27 L -13 5 L -30 -9 L -9 -9 Z" fill="#fff" />}
    {art === "face" && <circle cx={x + w / 2} cy={y + h * 0.42} r={Math.min(w, h) * 0.22} fill={INK} />}
    {art === "mountain" && <path d={`M ${x + 10} ${y + h - 10} L ${x + w * 0.4} ${y + h * 0.3} L ${x + w * 0.6} ${y + h * 0.6} L ${x + w * 0.75} ${y + h * 0.45} L ${x + w - 10} ${y + h - 10} Z`} fill="#fff" opacity={0.85} />}
    <circle cx={x + w / 2} cy={y + 8} r={5} fill="#c33" />
  </g>
);

export const Building: React.FC<{ x: number; w: number; h: number; color: string; lit: boolean; base?: number }> = ({ x, w, h, color, lit, base = 880 }) => {
  const cols = Math.max(2, Math.floor((w - 30) / 60));
  const rows = Math.max(1, Math.floor((h - 40) / 70));
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} fill={color} stroke={INK} strokeWidth={3} />
      <rect x={x - 6} y={base - h - 10} width={w + 12} height={14} fill={color} stroke={INK} strokeWidth={3} />
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const on = lit ? (i * 7 + x) % 5 !== 0 : false;
        return <rect key={i} x={x + 20 + c * ((w - 30) / cols)} y={base - h + 30 + r * 70} width={(w - 30) / cols - 18} height={40} fill={on ? "#ffd36b" : "rgba(170,210,255,0.6)"} />;
      })}
    </g>
  );
};

export const Tree: React.FC<{ x: number; y?: number; s?: number; color?: string; kind?: "round" | "pine" | "palm" }> = ({ x, y = 880, s = 1, color = "#3f8f4f", kind = "round" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {kind === "palm" ? (
      <g>
        <path d="M -10 0 Q -20 -150 10 -300 L 26 -300 Q 4 -150 14 0 Z" fill="#8a5a36" stroke={INK} strokeWidth={3} />
        {[-60, -20, 20, 60, 100, -100].map((a, i) => (
          <path key={i} d={`M 18 -300 Q ${18 + a} ${-360 + Math.abs(a) * 0.3} ${18 + a * 1.8} ${-270 + Math.abs(a) * 0.4}`} fill="none" stroke="#2f8f4f" strokeWidth={18} strokeLinecap="round" />
        ))}
      </g>
    ) : kind === "pine" ? (
      <g>
        <rect x={-14} y={-60} width={28} height={60} fill="#6b4a2e" />
        {[0, 1, 2].map((i) => <path key={i} d={`M ${-110 + i * 22} ${-60 - i * 80} L 0 ${-200 - i * 80} L ${110 - i * 22} ${-60 - i * 80} Z`} fill={i % 2 ? "#2f7a46" : "#27693c"} stroke={INK} strokeWidth={3} />)}
      </g>
    ) : (
      <g>
        <path d="M -16 0 L -12 -180 L 12 -180 L 16 0 Z" fill="#7a5232" stroke={INK} strokeWidth={3} />
        <circle cx={0} cy={-250} r={110} fill={color} stroke={INK} strokeWidth={3} />
        <circle cx={-70} cy={-200} r={70} fill={color} stroke={INK} strokeWidth={3} />
        <circle cx={70} cy={-205} r={74} fill={color} stroke={INK} strokeWidth={3} />
        <circle cx={-30} cy={-290} r={30} fill="rgba(255,255,255,0.12)" />
      </g>
    )}
  </g>
);

export const Bush: React.FC<{ x: number; s?: number; color?: string }> = ({ x, s = 1, color = "#3a8a4a" }) => (
  <g transform={`translate(${x} 880) scale(${s})`} fill={color} stroke={INK} strokeWidth={3}>
    <circle cx={-40} cy={-30} r={40} />
    <circle cx={10} cy={-48} r={52} />
    <circle cx={56} cy={-26} r={38} />
  </g>
);

export const Rays: React.FC<{ x: number; color: string }> = ({ x, color }) => (
  <g opacity={0.18}>
    {[-1, 0, 1].map((i) => <path key={i} d={`M ${x + i * 40} 0 L ${x + i * 260 - 160} 880 L ${x + i * 260 + 60} 880 Z`} fill={color} />)}
  </g>
);
