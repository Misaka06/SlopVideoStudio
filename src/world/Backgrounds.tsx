import React from "react";
import type { SceneT } from "../schema";
import {
  Building, Bush, Celestial, Cloud, Grad, Ground, HangingLamp, Hills, INK, Planks, Plant, Poster, Rays, Shelf, Sky, Stars, Tiles, Tree, Wall, Win, type Time,
} from "./parts";

// 1920x1080 scenes. Characters stand at y=960, in front of the floor that starts at y=880.

type BG = React.FC<{ t: Time }>;

const Bedroom: BG = ({ t }) => (
  <g>
    <Wall id="w-bed" top="#4a5590" bottom="#6d72aa" />
    <rect y={0} width={1920} height={640} fill="url(#w-bed)" />
    {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={80 + i * 160} cy={120 + (i % 2) * 120} r={6} fill="rgba(255,255,255,0.15)" />)}
    <Win x={1250} y={170} w={360} h={300} t={t} curtains="#d96a8a" />
    <Poster x={260} y={170} w={150} h={200} color="#3fb7ff" tilt={-4} art="star" />
    <Poster x={460} y={210} w={120} h={150} color="#ff8a3d" tilt={5} art="mountain" />
    <Shelf x={700} y={330} w={300} />
    <rect x={160} y={620} width={300} height={200} rx={8} fill="#c9a26a" stroke={INK} strokeWidth={4} />
    <line x1={160} y1={720} x2={460} y2={720} stroke={INK} strokeWidth={4} />
    <circle cx={310} cy={670} r={7} fill={INK} />
    <circle cx={310} cy={770} r={7} fill={INK} />
    <path d="M 220 620 L 260 560 L 300 620 Z" fill="#ffe27a" stroke={INK} strokeWidth={3} />
    <Planks color="#5a4566" />
    <ellipse cx={960} cy={980} rx={420} ry={50} fill="#8a6aa8" opacity={0.6} />
  </g>
);

const Classroom: BG = ({ t }) => (
  <g>
    <Wall id="w-class" top="#efe0bb" bottom="#dcc89c" />
    <rect x={430} y={140} width={1060} height={440} rx={10} fill="#2f5d46" stroke="#7a5432" strokeWidth={22} />
    <text x={520} y={280} fill="rgba(255,255,255,0.8)" fontSize={70} fontFamily="Comic Sans MS, cursive">A B C  1+1=2</text>
    <path d="M 520 360 Q 700 300 860 380 T 1200 360" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={6} />
    <circle cx={1300} cy={450} r={60} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={6} />
    <rect x={430} y={580} width={1060} height={16} fill="#7a5432" />
    <rect x={600} y={572} width={60} height={10} fill="#fff" />
    <Win x={80} y={170} w={260} h={300} t={t} frame="#e8e2d0" />
    <Win x={1580} y={170} w={260} h={300} t={t} frame="#e8e2d0" />
    <circle cx={960} cy={70} r={46} fill="#fff" stroke={INK} strokeWidth={6} />
    <path d="M 960 70 L 960 40 M 960 70 L 982 80" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    {[[100, "#e33"], [180, "#3a7"], [260, "#37e"], [340, "#eb3"]].map(([x, c]) => <rect key={x as number} x={1560 + (x as number)} y={540} width={50} height={60} fill={c as string} stroke={INK} strokeWidth={3} />)}
    <Planks color="#a07a4f" />
  </g>
);

const Office: BG = ({ t }) => (
  <g>
    <Wall id="w-office" top="#d4dde8" bottom="#a9b8cb" />
    <rect y={0} width={1920} height={110} fill="#c3ccd8" />
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={120 + i * 380} y={30} width={240} height={40} rx={6} fill="#f6fbff" opacity={0.85} />)}
    <Win x={180} y={200} w={420} h={340} t={t} frame="#55657a" />
    <Win x={700} y={200} w={420} h={340} t={t} frame="#55657a" />
    <Poster x={1260} y={220} w={240} h={170} color="#2e6bc2" art="chart" />
    <rect x={1560} y={260} width={180} height={300} rx={6} fill="#c9d3dd" stroke={INK} strokeWidth={4} />
    {[0, 1, 2].map((i) => <rect key={i} x={1580} y={280 + i * 95} width={140} height={80} fill="#b5c0cc" stroke={INK} strokeWidth={2} />)}
    <Plant x={1820} y={880} s={1.1} />
    <Tiles a="#7a8799" b="#6d7a8c" />
  </g>
);

const Capitol: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#8fb7e8", "#e8f0fb"]} />
    <Celestial t={t} x={1600} y={180} />
    <Cloud x={300} y={160} t={t} />
    <Cloud x={1300} y={110} s={0.7} t={t} />
    <ellipse cx={960} cy={310} rx={180} ry={160} fill="#f4f1ea" stroke={INK} strokeWidth={4} />
    <rect x={930} y={100} width={60} height={70} fill="#f4f1ea" stroke={INK} strokeWidth={4} />
    <path d="M 940 100 L 960 60 L 980 100 Z" fill="#f4f1ea" stroke={INK} strokeWidth={4} />
    {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={830 + i * 30} y={230} width={10} height={70} fill="#d8d2c4" />)}
    <rect x={520} y={370} width={880} height={70} fill="#e9e4d8" stroke={INK} strokeWidth={4} />
    <path d="M 520 370 L 960 300 L 1400 370 Z" fill="#efebe2" stroke={INK} strokeWidth={4} />
    {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={560 + i * 84} y={440} width={36} height={300} fill="#f7f4ee" stroke={INK} strokeWidth={3} />)}
    {[0, 1, 2, 3].map((i) => <rect key={i} x={480 - i * 20} y={740 + i * 34} width={960 + i * 40} height={34} fill={i % 2 ? "#d6d0c2" : "#e2dccf"} stroke={INK} strokeWidth={2} />)}
    <rect x={240} y={420} width={10} height={460} fill="#666" />
    <rect x={250} y={420} width={120} height={70} fill="#c43" />
    <rect x={250} y={420} width={50} height={36} fill="#2e4a9a" />
    <Ground color="#7d9a63" />
  </g>
);

const Stage: BG = () => (
  <g>
    <Grad id="g-stage" top="#1b1335" bottom="#3e2a6e" />
    <defs>
      <radialGradient id="spot" cx="0.5" cy="0.6" r="0.5">
        <stop offset="0" stopColor="rgba(255,240,200,0.55)" />
        <stop offset="1" stopColor="rgba(255,240,200,0)" />
      </radialGradient>
    </defs>
    {Array.from({ length: 30 }).map((_, i) => <circle key={i} cx={(i * 131) % 1920} cy={60 + (i % 4) * 30} r={6} fill={["#ff5a7a", "#ffd34d", "#5ad1ff"][i % 3]} opacity={0.7} />)}
    <path d="M 0 0 L 300 0 Q 240 400 280 1080 L 0 1080 Z" fill="#7a1735" />
    <path d="M 1920 0 L 1620 0 Q 1680 400 1640 1080 L 1920 1080 Z" fill="#7a1735" />
    {[60, 140, 220].map((x) => <path key={x} d={`M ${x} 0 Q ${x - 20} 500 ${x + 10} 1080`} stroke="#5a0f26" strokeWidth={8} fill="none" />)}
    {[1700, 1780, 1860].map((x) => <path key={x} d={`M ${x} 0 Q ${x + 20} 500 ${x - 10} 1080`} stroke="#5a0f26" strokeWidth={8} fill="none" />)}
    <path d="M 0 0 Q 960 120 1920 0 L 1920 60 Q 960 180 0 60 Z" fill="#8a1c40" />
    <ellipse cx={960} cy={700} rx={700} ry={420} fill="url(#spot)" />
    <rect y={860} width={1920} height={24} fill="#5a3a24" />
    <Planks color="#3a2550" />
  </g>
);

const Lake: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#86c5f0", "#f3e2c8"]} h={640} />
    <Celestial t={t} x={1400} y={300} />
    <Cloud x={400} y={140} t={t} s={0.8} />
    <Hills y={560} amp={140} color={t === "night" ? "#1f2340" : "#5a6a9a"} seed={1} />
    <Tree x={160} y={620} s={0.6} kind="pine" color="#2f6a46" />
    <Tree x={280} y={630} s={0.5} kind="pine" />
    <Tree x={1780} y={620} s={0.55} kind="pine" />
    <rect y={620} width={1920} height={260} fill={t === "night" ? "#1a2a52" : t === "sunset" ? "#a77fb0" : "#4f9fd0"} />
    {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={(i * 337) % 1800} y={660 + (i % 5) * 40} width={80 + (i % 3) * 40} height={4} rx={2} fill="rgba(255,255,255,0.35)" />)}
    <rect x={0} y={850} width={900} height={36} fill="#7a5232" stroke={INK} strokeWidth={3} />
    {[60, 300, 540, 780].map((x) => <rect key={x} x={x} y={850} width={20} height={120} fill="#5a3a20" />)}
    <path d="M 1500 860 Q 1600 830 1700 860 L 1680 880 L 1520 880 Z" fill="#a0522d" stroke={INK} strokeWidth={3} />
    <Ground color="#4d6b3a" />
  </g>
);

const Street: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#f7c27a", "#f4e2c0"]} />
    <Celestial t={t} x={1650} y={150} />
    {[[40, 520, "#c96e4b"], [360, 380, "#8d6aa8"], [660, 620, "#5f8fa6"], [1000, 440, "#b45c6e"], [1300, 560, "#6d8f5e"], [1600, 400, "#c99a4b"]].map(([x, h, c], i) => (
      <Building key={i} x={x as number} w={290} h={h as number} color={c as string} lit={t === "night"} />
    ))}
    <rect x={0} y={840} width={1920} height={40} fill="#9a9aa4" />
    <rect y={880} width={1920} height={200} fill="#4a4a54" />
    {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={i * 260 + 40} y={990} width={140} height={12} fill="#e8e8e8" />)}
    <rect x={300} y={600} width={10} height={240} fill="#333" />
    <circle cx={305} cy={600} r={18} fill={t === "night" ? "#ffe9a0" : "#ddd"} stroke={INK} strokeWidth={3} />
  </g>
);

const Void: BG = ({ t }) => (
  <g>
    <defs>
      <radialGradient id="void" cx="0.5" cy="0.45" r="0.7">
        <stop offset="0" stopColor={t === "night" ? "#3a2f5a" : "#5a5a66"} />
        <stop offset="1" stopColor="#0d0d12" />
      </radialGradient>
    </defs>
    <rect width={1920} height={1080} fill="url(#void)" />
    {Array.from({ length: 24 }).map((_, i) => <circle key={i} cx={(i * 311) % 1920} cy={(i * 173) % 1080} r={2 + (i % 3)} fill="#fff" opacity={0.15} />)}
    <ellipse cx={960} cy={962} rx={520} ry={40} fill="rgba(255,255,255,0.06)" />
  </g>
);

const Hospital: BG = ({ t }) => (
  <g>
    <Wall id="w-hosp" top="#e4f6f3" bottom="#bfe0dc" />
    <rect y={540} width={1920} height={340} fill="#a9d4cf" />
    <rect y={530} width={1920} height={14} fill="#7fb8b1" />
    <Win x={260} y={160} w={320} h={260} t={t} frame="#ffffff" />
    <rect x={1260} y={150} width={150} height={150} rx={18} fill="#fff" stroke={INK} strokeWidth={4} />
    <rect x={1317} y={170} width={36} height={110} fill="#e23c3c" />
    <rect x={1280} y={207} width={110} height={36} fill="#e23c3c" />
    <rect x={1520} y={250} width={200} height={130} rx={8} fill="#1d2a38" stroke={INK} strokeWidth={4} />
    <polyline points="1530,320 1580,320 1600,280 1620,350 1640,300 1660,320 1710,320" fill="none" stroke="#3ef08a" strokeWidth={5} />
    <rect x={1700} y={420} width={10} height={460} fill="#999" />
    <path d="M 1660 420 L 1750 420" stroke="#999" strokeWidth={8} />
    <rect x={1730} y={430} width={40} height={60} rx={10} fill="rgba(200,230,255,0.8)" stroke={INK} strokeWidth={2} />
    <Tiles a="#d8e6e4" b="#cbdcda" />
  </g>
);

const Space: BG = () => (
  <g>
    <Grad id="g-space" top="#03031a" bottom="#1d1240" />
    <Stars n={120} maxY={860} />
    <ellipse cx={600} cy={300} rx={500} ry={120} fill="#5a2a8a" opacity={0.18} transform="rotate(-15 600 300)" />
    <circle cx={1500} cy={260} r={150} fill="#d9824a" stroke={INK} strokeWidth={4} />
    <path d="M 1380 220 Q 1500 260 1630 230" stroke="#b8633a" strokeWidth={14} fill="none" />
    <ellipse cx={1500} cy={260} rx={260} ry={44} fill="none" stroke="#f1c27d" strokeWidth={12} />
    <circle cx={300} cy={200} r={40} fill="#9ad0ff" stroke={INK} strokeWidth={3} />
    <Ground color="#8a8a96" edge="#a0a0ac" />
    {[200, 700, 1300, 1700].map((x, i) => <ellipse key={x} cx={x} cy={935 + (i % 2) * 40} rx={90 - i * 10} ry={20} fill="#6e6e7a" stroke={INK} strokeWidth={2} />)}
    <rect x={1600} y={760} width={6} height={120} fill="#ddd" />
    <path d="M 1606 760 L 1690 780 L 1606 800 Z" fill="#c43" />
  </g>
);

const CityNight: BG = () => (
  <g>
    <Sky t="night" />
    <Celestial t="night" x={1650} y={170} />
    {[[60, 330], [340, 450], [640, 260], [900, 520], [1220, 380], [1520, 470]].map(([x, h], i) => <Building key={i} x={x} w={250} h={h} color="#1b1d3a" lit base={880} />)}
    <rect y={840} width={1920} height={40} fill="#3a3a50" />
    <rect y={880} width={1920} height={200} fill="#22222f" />
    {[200, 900, 1600].map((x) => (
      <g key={x}>
        <rect x={x} y={600} width={10} height={280} fill="#444" />
        <path d={`M ${x - 30} 600 L ${x + 40} 600`} stroke="#444" strokeWidth={8} />
        <path d={`M ${x - 40} 610 L ${x - 160} 880 L ${x + 80} 880 L ${x - 20} 610 Z`} fill="rgba(255,220,140,0.12)" />
        <circle cx={x - 30} cy={606} r={10} fill="#ffe9a0" />
      </g>
    ))}
  </g>
);

const Forest: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#9fd3c7", "#e6f2d0"]} />
    <Rays x={800} color="#fff6c0" />
    <Hills y={640} amp={120} color={t === "night" ? "#18302a" : "#5b9a6a"} seed={2} />
    {[80, 330, 560, 1240, 1500, 1760].map((x, i) => <Tree key={x} x={x} s={0.9 + (i % 3) * 0.15} kind={i % 2 ? "pine" : "round"} color={i % 2 ? "#2f7a40" : "#3f8f4f"} />)}
    <Bush x={760} s={0.8} />
    <Bush x={1100} s={0.7} color="#2f7a40" />
    {[[700, 900], [1300, 930], [400, 950]].map(([x, y], i) => (
      <g key={i}>
        <rect x={x - 4} y={y - 30} width={8} height={30} fill="#f2e6d0" />
        <ellipse cx={x} cy={y - 32} rx={22} ry={14} fill="#d23c3c" stroke={INK} strokeWidth={2} />
        <circle cx={x - 7} cy={y - 35} r={3} fill="#fff" />
      </g>
    ))}
    <Ground color="#4f7d3a" />
  </g>
);

const Courtroom: BG = () => (
  <g>
    <Wall id="w-court" top="#7a5236" bottom="#a77650" />
    {[260, 660, 1180, 1580].map((x) => (
      <g key={x}>
        <rect x={x} y={140} width={90} height={740} fill="#c7a27a" stroke={INK} strokeWidth={3} />
        <rect x={x - 12} y={128} width={114} height={22} fill="#b08a62" stroke={INK} strokeWidth={3} />
      </g>
    ))}
    <circle cx={960} cy={260} r={100} fill="#e8d18e" stroke="#8a6a2a" strokeWidth={10} />
    <path d="M 960 200 L 960 320 M 910 240 L 1010 240 M 910 240 L 890 290 L 930 290 Z M 1010 240 L 990 290 L 1030 290 Z" stroke="#8a6a2a" strokeWidth={5} fill="#8a6a2a" />
    <rect x={740} y={520} width={440} height={360} fill="#5b3a22" stroke={INK} strokeWidth={4} />
    <rect x={720} y={500} width={480} height={30} fill="#6e4a2c" stroke={INK} strokeWidth={4} />
    <rect x={900} y={460} width={60} height={14} rx={4} fill="#3d2614" />
    <rect x={950} y={440} width={14} height={40} rx={4} fill="#3d2614" transform="rotate(30 957 460)" />
    <Planks color="#5a3c28" />
  </g>
);

const Lab: BG = () => (
  <g>
    <Wall id="w-lab" top="#d2ecf6" bottom="#a8c9d8" />
    <rect x={120} y={560} width={1000} height={34} fill="#e8eef2" stroke={INK} strokeWidth={3} />
    <rect x={140} y={594} width={960} height={286} fill="#c3d0d8" stroke={INK} strokeWidth={3} />
    {[260, 460, 660, 860].map((x, i) => (
      <g key={x}>
        <path d={`M ${x - 12} 420 L ${x - 12} 480 L ${x - 55} 556 L ${x + 55} 556 L ${x + 12} 480 L ${x + 12} 420`} fill="rgba(255,255,255,0.5)" stroke={INK} strokeWidth={4} />
        <path d={`M ${x - 40} 530 L ${x + 40} 530 L ${x + 55} 556 L ${x - 55} 556 Z`} fill={["#7cf28a", "#f27cd8", "#7cc5f2", "#ffd34d"][i]} />
        <circle cx={x} cy={400 - (i % 2) * 20} r={6} fill={["#7cf28a", "#f27cd8", "#7cc5f2", "#ffd34d"][i]} opacity={0.7} />
      </g>
    ))}
    <rect x={1250} y={200} width={480} height={300} rx={10} fill="#1d2a38" stroke={INK} strokeWidth={5} />
    <polyline points="1280,450 1350,380 1420,420 1490,300 1560,340 1640,260 1700,290" fill="none" stroke="#6cf" strokeWidth={6} />
    <text x={1280} y={250} fill="#6cf" fontSize={28} fontFamily="Consolas, monospace">E = mc²</text>
    <path d="M 1300 880 L 1300 620 Q 1300 560 1360 560 L 1700 560 Q 1760 560 1760 620 L 1760 880" fill="#9fb4c2" stroke={INK} strokeWidth={4} />
    <circle cx={1530} cy={720} r={80} fill="#7cf28a" opacity={0.3} stroke={INK} strokeWidth={4} />
    <Tiles a="#8aa0ad" b="#7d95a3" />
  </g>
);

const Beach: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#62b6ef", "#cdeeff"]} />
    <Celestial t={t} x={300} y={180} />
    <Cloud x={900} y={150} t={t} />
    <Cloud x={1500} y={220} s={0.7} t={t} />
    <rect y={560} width={1920} height={220} fill={t === "night" ? "#1a2a52" : "#2e8bc9"} />
    {Array.from({ length: 10 }).map((_, i) => <path key={i} d={`M ${(i * 211) % 1900} ${600 + (i % 4) * 40} q 20 -10 40 0 t 40 0`} stroke="rgba(255,255,255,0.5)" strokeWidth={4} fill="none" />)}
    <path d="M 0 780 Q 480 740 960 770 T 1920 760 L 1920 880 L 0 880 Z" fill="#f6e2a8" />
    <Tree x={1700} kind="palm" s={1.1} />
    <path d="M 300 880 L 380 700 L 460 880" fill="none" stroke="#8a5a36" strokeWidth={8} />
    <path d="M 220 720 Q 380 620 540 720 Z" fill="#ff6b5a" stroke={INK} strokeWidth={3} />
    <Ground color="#ecd08c" />
    {[[500, 960], [1200, 1000]].map(([x, y], i) => <path key={i} d={`M ${x} ${y} l 10 -16 l 10 16 l -10 -4 Z`} fill="#f29a6a" />)}
  </g>
);

const Kitchen: BG = ({ t }) => (
  <g>
    <Wall id="w-kitchen" top="#fff1d6" bottom="#f5dcae" />
    {Array.from({ length: 6 }).map((_, r) => Array.from({ length: 16 }).map((_, c) => <rect key={`${r}-${c}`} x={c * 120} y={300 + r * 40} width={118} height={38} fill={(r + c) % 2 ? "#f7eedc" : "#efe2c8"} />))}
    <rect x={0} y={540} width={1920} height={30} fill="#7a5a3c" />
    <rect x={0} y={570} width={1920} height={310} fill="#c98f5a" stroke={INK} strokeWidth={3} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={20 + i * 270} y={600} width={250} height={250} rx={6} fill="#d6a06a" stroke={INK} strokeWidth={3} />)}
    {[200, 480, 760].map((x) => <rect key={x} x={x} y={100} width={250} height={180} fill="#e9b97f" stroke={INK} strokeWidth={4} />)}
    <Win x={1100} y={110} w={300} h={220} t={t} frame="#fff" curtains="#e86a5a" />
    <rect x={1500} y={460} width={260} height={80} fill="#bbb" stroke={INK} strokeWidth={3} />
    {[1550, 1640].map((x) => <path key={x} d={`M ${x} 440 q 10 -20 0 -40 q -10 -20 0 -40`} stroke="#fff" strokeWidth={4} fill="none" opacity={0.6} />)}
    <Tiles a="#b6b0a6" b="#a9a397" />
  </g>
);

const Desert: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#f4b860", "#fde7b4"]} />
    <Celestial t={t} x={1450} y={200} />
    <Hills y={700} amp={160} color={t === "night" ? "#4a3050" : "#e0a35a"} seed={3} />
    <Hills y={800} amp={100} color={t === "night" ? "#5a3a50" : "#eab66a"} seed={5} />
    <path d="M 300 700 L 420 460 L 540 700 Z" fill="#d8a34f" stroke={INK} strokeWidth={4} />
    <path d="M 420 460 L 540 700 L 480 700 Z" fill="#b8843a" />
    {[[1500, 880, 1], [200, 880, 0.7]].map(([x, y, s], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill="#3f9a52" stroke={INK} strokeWidth={4}>
        <rect x={-22} y={-220} width={44} height={220} rx={22} />
        <path d="M -22 -120 L -60 -120 L -60 -170" fill="none" strokeWidth={30} stroke="#3f9a52" strokeLinecap="round" />
        <path d="M 22 -90 L 60 -90 L 60 -150" fill="none" strokeWidth={30} stroke="#3f9a52" strokeLinecap="round" />
      </g>
    ))}
    <Ground color="#e8b86c" />
    <path d="M 700 960 q 30 -14 60 0 M 1100 1020 q 30 -14 60 0" stroke="#c9944a" strokeWidth={5} fill="none" />
  </g>
);

const Castle: BG = ({ t }) => (
  <g>
    <Wall id="w-castle" top="#5a5a6e" bottom="#7a7a8e" />
    {Array.from({ length: 12 }).map((_, r) => Array.from({ length: 13 }).map((_, c) => <rect key={`${r}-${c}`} x={c * 160 - (r % 2) * 80} y={r * 75} width={154} height={70} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={4} />))}
    <path d="M 860 140 L 860 520 L 1060 520 L 1060 140 Q 960 40 860 140 Z" fill="#000" opacity={0.3} />
    <Win x={880} y={150} w={160} h={360} t={t} frame="#4a4a5a" />
    {[300, 1620].map((x) => (
      <g key={x}>
        <rect x={x - 6} y={380} width={12} height={60} fill="#5a3a20" />
        <path d={`M ${x} 330 q 24 30 0 56 q -24 -26 0 -56`} fill="#ffb13d" />
        <circle cx={x} cy={360} r={80} fill="rgba(255,170,60,0.15)" />
      </g>
    ))}
    {[520, 1300].map((x) => (
      <g key={x}>
        <rect x={x} y={160} width={120} height={300} fill="#9a1c2c" stroke={INK} strokeWidth={3} />
        <path d={`M ${x} 460 L ${x + 60} 420 L ${x + 120} 460`} fill="#9a1c2c" stroke={INK} strokeWidth={3} />
        <path d={`M ${x + 60} 240 l 20 30 l -20 30 l -20 -30 Z`} fill="#e9c348" />
      </g>
    ))}
    <rect x={560} y={880} width={800} height={200} fill="#9a1c2c" />
    <Tiles a="#4a4a58" b="#424250" />
    <rect x={660} y={880} width={600} height={200} fill="#a4243a" opacity={0.9} />
  </g>
);

const Prison: BG = () => (
  <g>
    <Wall id="w-prison" top="#6e727c" bottom="#8a8e98" />
    {Array.from({ length: 12 }).map((_, r) => Array.from({ length: 13 }).map((_, c) => <rect key={`${r}-${c}`} x={c * 150 - (r % 2) * 75} y={r * 72} width={146} height={68} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={3} />))}
    <rect x={820} y={160} width={280} height={180} fill="#9ad0ff" stroke={INK} strokeWidth={6} />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={850 + i * 66} y={160} width={12} height={180} fill="#444" />)}
    {Array.from({ length: 30 }).map((_, i) => <line key={i} x1={200 + (i % 6) * 20} y1={520 + Math.floor(i / 6) * 30} x2={210 + (i % 6) * 20} y2={540 + Math.floor(i / 6) * 30} stroke="#333" strokeWidth={4} />)}
    <rect x={1500} y={640} width={300} height={90} fill="#8a8a96" stroke={INK} strokeWidth={4} />
    <rect x={1520} y={620} width={110} height={30} rx={10} fill="#e8e8e8" stroke={INK} strokeWidth={3} />
    <Ground color="#55575f" />
    {/* bars in front of everything are drawn by the "cage" set piece if needed */}
  </g>
);

const Shop: BG = ({ t }) => (
  <g>
    <Wall id="w-shop" top="#fbe9f0" bottom="#f0d0de" />
    <rect x={0} y={0} width={1920} height={90} fill="#e85a7a" />
    {Array.from({ length: 16 }).map((_, i) => <path key={i} d={`M ${i * 120} 90 Q ${i * 120 + 60} 150 ${i * 120 + 120} 90 Z`} fill={i % 2 ? "#fff" : "#e85a7a"} />)}
    {[0, 1, 2].map((row) => (
      <g key={row}>
        <rect x={140} y={300 + row * 170} width={780} height={14} fill="#8a5a36" stroke={INK} strokeWidth={2} />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={160 + i * 62} y={300 + row * 170 - 70 + (i % 3) * 10} width={48} height={70 - (i % 3) * 10} rx={6} fill={["#ff8a3d", "#3fb7ff", "#7cdf6a", "#ffd34d", "#b96aff"][(i + row) % 5]} stroke={INK} strokeWidth={2} />
        ))}
      </g>
    ))}
    <Win x={1100} y={200} w={420} h={340} t={t} frame="#fff" />
    <text x={1310} y={180} textAnchor="middle" fontSize={44} fontWeight={900} fill="#e85a7a" fontFamily="Arial Black, Arial">SALE 50%</text>
    <rect x={1560} y={600} width={300} height={280} fill="#d0d6e0" stroke={INK} strokeWidth={4} />
    <rect x={1600} y={540} width={140} height={70} rx={6} fill="#333" stroke={INK} strokeWidth={3} />
    <rect x={1612} y={552} width={116} height={30} fill="#5fd36a" />
    <Tiles a="#efe6ea" b="#e2d6dc" />
  </g>
);

const Gym: BG = ({ t }) => (
  <g>
    <Wall id="w-gym" top="#3a4a5e" bottom="#5a6a7e" />
    <rect x={100} y={150} width={700} height={420} fill="#9ab8d0" stroke="#ccc" strokeWidth={8} opacity={0.5} />
    <path d="M 160 180 L 360 540 M 300 180 L 500 540" stroke="rgba(255,255,255,0.4)" strokeWidth={10} />
    <Win x={1100} y={160} w={600} h={240} t={t} frame="#cfd6de" />
    {[300, 520, 740].map((x) => (
      <g key={x}>
        <rect x={x} y={760} width={120} height={14} fill="#555" />
        <rect x={x - 20} y={740} width={24} height={54} rx={4} fill="#222" />
        <rect x={x + 116} y={740} width={24} height={54} rx={4} fill="#222" />
      </g>
    ))}
    <rect x={1180} y={600} width={480} height={20} fill="#666" />
    <rect x={1200} y={620} width={20} height={260} fill="#666" />
    <rect x={1620} y={620} width={20} height={260} fill="#666" />
    <text x={1400} y={480} textAnchor="middle" fontSize={64} fontWeight={900} fill="#ffcc33" fontFamily="Arial Black, Arial">NO PAIN NO GAIN</text>
    <Ground color="#2d3a46" />
    <rect x={200} y={900} width={600} height={120} fill="#4a6aa8" opacity={0.6} />
  </g>
);

const Plane: BG = ({ t }) => (
  <g>
    <Wall id="w-plane" top="#e6e8ee" bottom="#cfd3dc" />
    <path d="M 0 0 L 1920 0 L 1920 120 Q 960 60 0 120 Z" fill="#bfc4ce" />
    {[200, 560, 920, 1280, 1640].map((x) => (
      <g key={x}>
        <rect x={x} y={230} width={130} height={190} rx={60} fill="#cfd3dc" stroke={INK} strokeWidth={4} />
        <rect x={x + 15} y={245} width={100} height={160} rx={48} fill={t === "night" ? "#0b1030" : t === "sunset" ? "#f59a6a" : "#8ccaf5"} />
        <ellipse cx={x + 55} cy={330} rx={30} ry={12} fill="#fff" opacity={t === "night" ? 0.1 : 0.8} />
      </g>
    ))}
    {[120, 480, 840, 1200, 1560].map((x) => (
      <g key={x}>
        <rect x={x} y={560} width={200} height={240} rx={30} fill="#2e4a8a" stroke={INK} strokeWidth={4} />
        <rect x={x + 20} y={540} width={160} height={50} rx={16} fill="#3a5aa0" stroke={INK} strokeWidth={3} />
      </g>
    ))}
    <Ground color="#6a6f7c" />
  </g>
);

const Underwater: BG = () => (
  <g>
    <Grad id="g-water" top="#0d5c8a" bottom="#05253f" />
    <Rays x={900} color="#bff0ff" />
    {Array.from({ length: 18 }).map((_, i) => <circle key={i} cx={(i * 211) % 1920} cy={(i * 137) % 800} r={4 + (i % 4) * 3} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />)}
    {[[300, "#ff7f50"], [1500, "#ffd34d"], [1100, "#b96aff"]].map(([x, c], i) => (
      <g key={i} transform={`translate(${x} ${260 + i * 90}) scale(${i % 2 ? -1 : 1} 1)`}>
        <ellipse cx={0} cy={0} rx={40} ry={22} fill={c as string} stroke={INK} strokeWidth={3} />
        <path d="M -36 0 L -64 -20 L -64 20 Z" fill={c as string} stroke={INK} strokeWidth={3} />
        <circle cx={20} cy={-5} r={5} fill="#fff" />
      </g>
    ))}
    {[150, 420, 1350, 1700].map((x, i) => (
      <path key={x} d={`M ${x} 880 Q ${x - 30} 760 ${x} 680 Q ${x + 30} 600 ${x} 520`} fill="none" stroke={i % 2 ? "#2f9a5a" : "#3fbf6a"} strokeWidth={18} strokeLinecap="round" />
    ))}
    {[700, 1000].map((x) => <path key={x} d={`M ${x} 880 L ${x - 30} 760 L ${x} 800 L ${x + 20} 720 L ${x + 30} 800 L ${x + 60} 760 L ${x + 40} 880 Z`} fill="#ff7f8a" stroke={INK} strokeWidth={3} />)}
    <Ground color="#c9b07a" />
  </g>
);

const Mountains: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#7fb8ef", "#e9f5ff"]} />
    <Celestial t={t} x={1500} y={160} />
    <path d="M 0 700 L 300 280 L 520 520 L 760 200 L 1100 600 L 1400 300 L 1700 560 L 1920 380 L 1920 900 L 0 900 Z" fill={t === "night" ? "#2a2f50" : "#6a7aa8"} stroke={INK} strokeWidth={4} />
    <path d="M 300 280 L 360 360 L 320 350 L 280 380 L 250 350 Z M 760 200 L 830 300 L 780 290 L 740 320 L 700 280 Z M 1400 300 L 1460 380 L 1410 370 L 1370 390 Z" fill="#fff" />
    <Hills y={780} amp={80} color={t === "night" ? "#1f3a2a" : "#5a9a5a"} seed={4} />
    {[200, 380, 1500, 1680].map((x) => <Tree key={x} x={x} y={880} s={0.7} kind="pine" />)}
    <Ground color="#6b8a4a" />
  </g>
);

const Hallway: BG = ({ t }) => (
  <g>
    <Wall id="w-hall" top="#e8eef6" bottom="#c9d4e2" />
    {[100, 520, 940, 1360].map((x, i) => (
      <g key={x}>
        {Array.from({ length: 4 }).map((_, j) => (
          <g key={j}>
            <rect x={x + j * 90} y={420} width={84} height={460} fill={["#3a6ac2", "#c23a4a", "#3aa26a", "#e0a03a"][(i + j) % 4]} stroke={INK} strokeWidth={3} />
            <rect x={x + j * 90 + 20} y={460} width={44} height={10} fill="rgba(0,0,0,0.3)" />
            <rect x={x + j * 90 + 20} y={480} width={44} height={10} fill="rgba(0,0,0,0.3)" />
            <rect x={x + j * 90 + 62} y={640} width={8} height={30} fill="#ddd" />
          </g>
        ))}
      </g>
    ))}
    <Win x={1800} y={200} w={100} h={160} t={t} />
    <rect x={0} y={120} width={1920} height={30} fill="#d0d8e4" />
    <Tiles a="#c9cfd9" b="#bcc3cf" />
  </g>
);

const Restaurant: BG = ({ t }) => (
  <g>
    <Wall id="w-rest" top="#5a2a2a" bottom="#8a3a34" />
    {Array.from({ length: 24 }).map((_, i) => <rect key={i} x={i * 80} y={0} width={40} height={860} fill="rgba(255,255,255,0.04)" />)}
    <HangingLamp x={500} />
    <HangingLamp x={1420} />
    <Win x={780} y={180} w={360} h={280} t={t} frame="#d9b98a" curtains="#c9a24a" />
    <rect x={200} y={300} width={180} height={140} fill="#2a1a10" stroke="#d9b98a" strokeWidth={8} />
    <path d="M 220 420 L 280 340 L 320 380 L 360 340 L 360 420 Z" fill="#7aa86a" />
    {[300, 1600].map((x) => (
      <g key={x}>
        <ellipse cx={x} cy={720} rx={160} ry={24} fill="#f6f1e6" stroke={INK} strokeWidth={3} />
        <rect x={x - 8} y={720} width={16} height={160} fill="#3d2614" />
        <rect x={x - 20} y={670} width={14} height={50} fill="#7a1c2c" stroke={INK} strokeWidth={2} />
        <path d={`M ${x - 13} 660 q 6 -14 0 -22`} stroke="#ffb13d" strokeWidth={6} />
      </g>
    ))}
    <Tiles a="#3a2420" b="#2e1c18" />
  </g>
);

const Park: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#86c8f5", "#e6f6ff"]} />
    <Celestial t={t} x={1600} y={160} />
    <Cloud x={420} y={160} t={t} />
    <Cloud x={1100} y={120} s={0.8} t={t} />
    <Hills y={700} amp={90} color={t === "night" ? "#1d3a28" : "#7cc46a"} seed={6} />
    <Tree x={200} s={1.1} />
    <Tree x={1700} s={1} color="#4a9a52" />
    <Bush x={600} s={0.7} />
    <Bush x={1300} s={0.6} />
    <path d="M 900 880 Q 960 700 1100 620" stroke="#d9c49a" strokeWidth={60} fill="none" opacity={0.6} />
    <circle cx={1450} cy={760} r={60} fill="#5ab0e6" opacity={0.6} />
    {[400, 760, 1500].map((x, i) => <circle key={x} cx={x} cy={900 + (i % 2) * 30} r={6} fill={["#ff6b8a", "#ffd34d", "#fff"][i]} />)}
    <Ground color="#6aae58" />
  </g>
);

const Spaceship: BG = () => (
  <g>
    <Grad id="g-ship" top="#2a3348" bottom="#3d4a66" />
    <path d="M 0 0 L 1920 0 L 1920 140 L 1700 200 L 220 200 L 0 140 Z" fill="#1d2433" />
    {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={260 + i * 180} y={170} width={120} height={10} rx={5} fill="#5ad1ff" opacity={0.7} />)}
    <rect x={560} y={240} width={800} height={340} rx={40} fill="#05051a" stroke="#8a96b0" strokeWidth={16} />
    <Stars n={50} maxY={1080} />
    <rect x={0} y={0} width={560} height={1080} fill="#2a3348" />
    <rect x={1360} y={0} width={560} height={1080} fill="#2a3348" />
    <circle cx={1100} cy={420} r={70} fill="#4a8ad9" />
    <rect x={560} y={240} width={800} height={340} rx={40} fill="none" stroke="#8a96b0" strokeWidth={16} />
    {[160, 1600].map((x) => (
      <g key={x}>
        <rect x={x} y={300} width={180} height={260} rx={10} fill="#1d2433" stroke={INK} strokeWidth={3} />
        {Array.from({ length: 9 }).map((_, i) => <circle key={i} cx={x + 40 + (i % 3) * 50} cy={350 + Math.floor(i / 3) * 60} r={12} fill={["#ff4d6a", "#3ef08a", "#ffd34d"][i % 3]} />)}
      </g>
    ))}
    <rect x={460} y={640} width={1000} height={240} rx={20} fill="#4a5672" stroke={INK} strokeWidth={4} />
    <rect x={500} y={660} width={920} height={40} rx={10} fill="#5ad1ff" opacity={0.4} />
    <Tiles a="#3a4258" b="#333a4e" />
  </g>
);

const Ruins: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#b8a08a", "#e8d2b8"]} />
    <Celestial t={t} x={1500} y={220} />
    {[[100, 420], [500, 300], [900, 520], [1300, 360], [1650, 460]].map(([x, h], i) => (
      <g key={i}>
        <path d={`M ${x} 880 L ${x} ${880 - h} L ${x + 60} ${880 - h + 40} L ${x + 120} ${880 - h - 20} L ${x + 200} ${880 - h + 60} L ${x + 260} 880 Z`} fill={t === "night" ? "#2a2a34" : "#6a6a70"} stroke={INK} strokeWidth={3} />
        {Array.from({ length: 5 }).map((_, j) => <rect key={j} x={x + 30 + (j % 2) * 120} y={880 - h + 80 + j * 60} width={50} height={36} fill={t === "night" && j % 2 ? "#ffb13d" : "#2a2a30"} />)}
      </g>
    ))}
    {[400, 1200].map((x) => (
      <g key={x}>
        <path d={`M ${x} 880 q 40 -60 0 -120 q -30 -40 10 -80`} stroke="rgba(80,80,80,0.5)" strokeWidth={40} fill="none" strokeLinecap="round" />
      </g>
    ))}
    <Ground color="#5a5048" />
    {[[300, 920], [800, 960], [1500, 940]].map(([x, y], i) => <path key={i} d={`M ${x} ${y} l 60 -30 l 50 20 l -20 30 Z`} fill="#7a7068" stroke={INK} strokeWidth={3} />)}
  </g>
);

const Jungle: BG = ({ t }) => (
  <g>
    <Sky t={t} day={["#6fc8a0", "#d8f5c8"]} />
    <Rays x={1000} color="#fffbc0" />
    {Array.from({ length: 9 }).map((_, i) => <Tree key={i} x={i * 240} s={0.9 + (i % 3) * 0.2} color={["#1f6a3a", "#2f8a4a", "#3a9a52"][i % 3]} kind={i % 4 === 1 ? "palm" : "round"} />)}
    {Array.from({ length: 7 }).map((_, i) => <path key={i} d={`M ${120 + i * 280} 0 Q ${150 + i * 280} 200 ${110 + i * 280} ${300 + (i % 3) * 80}`} stroke="#2f7a3a" strokeWidth={8} fill="none" />)}
    {[[400, 860], [1100, 860], [1700, 860]].map(([x, y], i) => (
      <g key={i}>
        {[-50, -10, 30].map((a) => <path key={a} d={`M ${x} ${y} Q ${x + a} ${y - 120} ${x + a * 2.2} ${y - 160}`} stroke="#3faa5a" strokeWidth={26} fill="none" strokeLinecap="round" />)}
      </g>
    ))}
    <Ground color="#3e6a2a" />
  </g>
);

const LivingRoom: BG = ({ t }) => (
  <g>
    <Wall id="w-living" top="#f2d9b8" bottom="#e0bf94" />
    {Array.from({ length: 20 }).map((_, i) => <rect key={i} x={i * 100} y={0} width={4} height={860} fill="rgba(0,0,0,0.05)" />)}
    <Win x={160} y={180} w={380} h={320} t={t} curtains="#4a7ac2" />
    <rect x={760} y={200} width={400} height={240} rx={8} fill="#22252e" stroke={INK} strokeWidth={6} />
    <rect x={776} y={216} width={368} height={208} fill={t === "night" ? "#4fb3ff" : "#2a3a50"} />
    <rect x={720} y={460} width={480} height={20} fill="#6b4a2e" />
    <Shelf x={1320} y={300} w={360} />
    <Shelf x={1320} y={450} w={360} />
    <Plant x={1780} y={880} />
    <Planks color="#9a6a42" />
    <ellipse cx={960} cy={990} rx={520} ry={56} fill="#b84a4a" opacity={0.55} />
  </g>
);

const Bank: BG = () => (
  <g>
    <Wall id="w-bank" top="#e8e2cf" bottom="#cfc6aa" />
    {[200, 560, 1360, 1720].map((x) => (
      <g key={x}>
        <rect x={x - 40} y={100} width={80} height={780} fill="#f2ecd8" stroke={INK} strokeWidth={3} />
        {[0, 1, 2].map((i) => <line key={i} x1={x - 20 + i * 20} y1={120} x2={x - 20 + i * 20} y2={860} stroke="rgba(0,0,0,0.1)" strokeWidth={4} />)}
      </g>
    ))}
    <circle cx={960} cy={420} r={220} fill="#9aa1ad" stroke={INK} strokeWidth={8} />
    <circle cx={960} cy={420} r={180} fill="#b5bcc8" stroke={INK} strokeWidth={4} />
    {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={960} y1={420} x2={960 + Math.cos((i * Math.PI) / 4) * 140} y2={420 + Math.sin((i * Math.PI) / 4) * 140} stroke="#6a717c" strokeWidth={10} strokeLinecap="round" />)}
    <circle cx={960} cy={420} r={40} fill="#d8b23a" stroke={INK} strokeWidth={4} />
    <text x={960} y={140} textAnchor="middle" fontSize={56} fontWeight={900} fill="#8a6a2a" fontFamily="Georgia, serif">BANK</text>
    <Tiles a="#d8d0b8" b="#c8bfa4" />
  </g>
);

const MAP: Record<SceneT["bg"], BG> = {
  bedroom: Bedroom, classroom: Classroom, office: Office, capitol: Capitol, stage: Stage, lake: Lake, street: Street, void: Void,
  hospital: Hospital, space: Space, cityNight: CityNight, forest: Forest, courtroom: Courtroom, lab: Lab, beach: Beach, kitchen: Kitchen,
  desert: Desert, castle: Castle, prison: Prison, shop: Shop, gym: Gym, plane: Plane, underwater: Underwater, mountains: Mountains,
  hallway: Hallway, restaurant: Restaurant, park: Park, spaceship: Spaceship, ruins: Ruins, jungle: Jungle, livingRoom: LivingRoom, bank: Bank,
};

export const BackgroundArt: React.FC<{ kind: SceneT["bg"]; time: Time }> = ({ kind, time }) => {
  const C = MAP[kind] ?? Void;
  return <C t={time} />;
};
