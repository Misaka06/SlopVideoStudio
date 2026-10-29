import sharp from "sharp";
import { importImage, forTimeline } from "./props";
import { get, save } from "./store";

const INK = "#16151d";
const GREEN = "#00FF00";

// 1200x1200 canvas with #00FF00 background
const wrapSvg = (content: string, w = 1200, h = 1200) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${GREEN}" />
  <g id="prop">
    ${content}
  </g>
</svg>
`;

// ==========================================
// 1. SET PIECES (Flat bottom at floor)
// ==========================================

// 1. set-clock: Ornate grandfather clockwork clock
const svgClock = wrapSvg(`
  <!-- Base Pedestal (flat bottom at y=1050) -->
  <rect x="420" y="960" width="360" height="90" rx="8" fill="#4a2e1b" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <rect x="450" y="920" width="300" height="50" rx="6" fill="#633d24" stroke="${INK}" stroke-width="10"/>
  <rect x="470" y="980" width="260" height="20" rx="4" fill="#361f10"/>

  <!-- Main Trunk / Glass Chamber -->
  <rect x="460" y="440" width="280" height="490" fill="#633d24" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <!-- Glass Window Inner Chamber -->
  <rect x="490" y="470" width="220" height="430" rx="10" fill="#203345" stroke="${INK}" stroke-width="10"/>
  <!-- Brass Weights & Chains -->
  <line x1="535" y1="480" x2="535" y2="700" stroke="#f6c945" stroke-width="6"/>
  <rect x="522" y="660" width="26" height="80" rx="6" fill="#e5b42d" stroke="${INK}" stroke-width="6"/>
  <line x1="665" y1="480" x2="665" y2="720" stroke="#f6c945" stroke-width="6"/>
  <rect x="652" y="680" width="26" height="80" rx="6" fill="#e5b42d" stroke="${INK}" stroke-width="6"/>
  <!-- Brass Pendulum with Arm and Bob -->
  <line x1="600" y1="480" x2="600" y2="810" stroke="#ffd966" stroke-width="8"/>
  <circle cx="600" cy="820" r="50" fill="#f6c945" stroke="${INK}" stroke-width="10"/>
  <circle cx="600" cy="820" r="34" fill="#ffd966"/>
  <!-- Glass reflection highlight -->
  <path d="M 505 485 L 560 485 L 515 885 L 495 885 Z" fill="rgba(255,255,255,0.15)"/>

  <!-- Dial Case (Upper Bonnet) -->
  <rect x="420" y="190" width="360" height="260" rx="14" fill="#784a2d" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <!-- Arched Pediment Crown & Finials -->
  <path d="M 420 200 C 420 100, 600 80, 600 80 C 600 80, 780 100, 780 200 Z" fill="#633d24" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <circle cx="600" cy="80" r="24" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
  <circle cx="430" cy="180" r="16" fill="#f6c945" stroke="${INK}" stroke-width="6"/>
  <circle cx="770" cy="180" r="16" fill="#f6c945" stroke="${INK}" stroke-width="6"/>

  <!-- Clock Face / Dial -->
  <circle cx="600" cy="320" r="110" fill="#fcf6e8" stroke="${INK}" stroke-width="12"/>
  <circle cx="600" cy="320" r="95" fill="none" stroke="#e5c890" stroke-width="6"/>
  <!-- Roman Numeral Ticks -->
  <circle cx="600" cy="225" r="7" fill="${INK}"/>
  <circle cx="695" cy="320" r="7" fill="${INK}"/>
  <circle cx="600" cy="415" r="7" fill="${INK}"/>
  <circle cx="505" cy="320" r="7" fill="${INK}"/>
  <!-- Ornate Filigree Hands pointing to 10:10 -->
  <line x1="600" y1="320" x2="545" y2="265" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
  <line x1="600" y1="320" x2="655" y2="255" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="600" cy="320" r="14" fill="#f6c945" stroke="${INK}" stroke-width="6"/>
`);

// 2. set-bookshelf: Wizard library arched oak bookshelf full of magical books
const svgBookshelf = wrapSvg(`
  <!-- Outer Wooden Frame with Arch (sits on floor at y=1050) -->
  <path d="M 280 1050 L 280 320 C 280 120, 920 120, 920 320 L 920 1050 Z" fill="#4a301f" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
  <path d="M 310 1040 L 310 330 C 310 160, 890 160, 890 330 L 890 1040 Z" fill="#321e12" stroke="${INK}" stroke-width="10"/>

  <!-- Top Decorative Arch Carving -->
  <circle cx="600" cy="220" r="40" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
  <path d="M 580 220 L 620 220 M 600 200 L 600 240" stroke="${INK}" stroke-width="6"/>

  <!-- Shelf 1 (y=440) - Potions & Grimoires -->
  <rect x="300" y="440" width="600" height="28" fill="#633d24" stroke="${INK}" stroke-width="8"/>
  <!-- Potion Bottles -->
  <path d="M 360 440 L 360 380 Q 360 360 375 350 L 375 330 L 395 330 L 395 350 Q 410 360 410 380 L 410 440 Z" fill="#3bc9db" stroke="${INK}" stroke-width="7"/>
  <rect x="370" y="320" width="30" height="14" rx="3" fill="#c29d62" stroke="${INK}" stroke-width="5"/>
  <path d="M 440 440 L 440 390 Q 440 370 455 360 L 455 340 L 475 340 L 475 360 Q 490 370 490 390 L 490 440 Z" fill="#e64980" stroke="${INK}" stroke-width="7"/>
  <rect x="450" y="330" width="30" height="14" rx="3" fill="#c29d62" stroke="${INK}" stroke-width="5"/>
  <!-- Books on Shelf 1 -->
  <rect x="520" y="300" width="50" height="140" rx="4" fill="#7950f2" stroke="${INK}" stroke-width="8"/>
  <rect x="575" y="320" width="45" height="120" rx="4" fill="#fab005" stroke="${INK}" stroke-width="8"/>
  <rect x="625" y="310" width="60" height="130" rx="4" fill="#40c057" stroke="${INK}" stroke-width="8"/>
  <!-- Crystal Ball on Brass Pedestal -->
  <circle cx="780" cy="370" r="42" fill="#74c0fc" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="765" cy="355" rx="14" ry="10" fill="#ffffff" opacity="0.7"/>
  <path d="M 750 440 L 810 440 L 795 405 L 765 405 Z" fill="#fcc419" stroke="${INK}" stroke-width="7"/>

  <!-- Shelf 2 (y=650) - Ancient Tomes & Scrolls -->
  <rect x="300" y="650" width="600" height="28" fill="#633d24" stroke="${INK}" stroke-width="8"/>
  <rect x="330" y="500" width="55" height="150" rx="4" fill="#d6336c" stroke="${INK}" stroke-width="8"/>
  <line x1="335" y1="530" x2="380" y2="530" stroke="#ffd43b" stroke-width="6"/>
  <rect x="390" y="520" width="50" height="130" rx="4" fill="#15aabf" stroke="${INK}" stroke-width="8"/>
  <rect x="445" y="490" width="60" height="160" rx="4" fill="#fd7e14" stroke="${INK}" stroke-width="8"/>
  <line x1="450" y1="530" x2="500" y2="530" stroke="#ffd43b" stroke-width="6"/>
  <!-- Leaning books -->
  <g transform="rotate(18 570 650)">
    <rect x="540" y="520" width="45" height="130" rx="4" fill="#845ef7" stroke="${INK}" stroke-width="8"/>
  </g>
  <g transform="rotate(18 630 650)">
    <rect x="590" y="530" width="45" height="120" rx="4" fill="#20c997" stroke="${INK}" stroke-width="8"/>
  </g>
  <!-- Rolled scrolls stack -->
  <circle cx="750" cy="625" r="22" fill="#f8f0d8" stroke="${INK}" stroke-width="7"/>
  <circle cx="790" cy="625" r="22" fill="#f8f0d8" stroke="${INK}" stroke-width="7"/>
  <circle cx="770" cy="590" r="22" fill="#f8f0d8" stroke="${INK}" stroke-width="7"/>

  <!-- Shelf 3 (y=860) - Heavy Volumes -->
  <rect x="300" y="860" width="600" height="28" fill="#633d24" stroke="${INK}" stroke-width="8"/>
  <rect x="330" y="700" width="65" height="160" rx="4" fill="#495057" stroke="${INK}" stroke-width="8"/>
  <rect x="400" y="720" width="55" height="140" rx="4" fill="#2b8a3e" stroke="${INK}" stroke-width="8"/>
  <rect x="460" y="710" width="60" height="150" rx="4" fill="#e03131" stroke="${INK}" stroke-width="8"/>
  <rect x="525" y="730" width="50" height="130" rx="4" fill="#1971c2" stroke="${INK}" stroke-width="8"/>
  <rect x="580" y="705" width="70" height="155" rx="4" fill="#f59f00" stroke="${INK}" stroke-width="8"/>
  <rect x="655" y="725" width="55" height="135" rx="4" fill="#9c36b5" stroke="${INK}" stroke-width="8"/>
  <rect x="715" y="715" width="65" height="145" rx="4" fill="#0ca678" stroke="${INK}" stroke-width="8"/>
  <rect x="785" y="740" width="55" height="120" rx="4" fill="#d9480f" stroke="${INK}" stroke-width="8"/>

  <!-- Bottom Plinth Base (flat bottom at y=1050) -->
  <rect x="250" y="1030" width="700" height="40" rx="6" fill="#321e12" stroke="${INK}" stroke-width="12"/>
`);

// 3. set-door: Arched medieval castle oak door with wrought-iron hinges and brass knocker
const svgDoor = wrapSvg(`
  <!-- Outer Heavy Stone Arch / Door Frame (sits on floor at y=1050) -->
  <path d="M 280 1050 L 280 440 C 280 140, 920 140, 920 440 L 920 1050 Z" fill="#6c757d" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <!-- Arch Stone Keystone & Joints -->
  <path d="M 570 145 L 630 145 L 640 230 L 560 230 Z" fill="#868e96" stroke="${INK}" stroke-width="8"/>
  <line x1="390" y1="210" x2="430" y2="280" stroke="${INK}" stroke-width="8"/>
  <line x1="810" y1="210" x2="770" y2="280" stroke="${INK}" stroke-width="8"/>
  <line x1="280" y1="520" x2="350" y2="520" stroke="${INK}" stroke-width="8"/>
  <line x1="850" y1="520" x2="920" y2="520" stroke="${INK}" stroke-width="8"/>

  <!-- Inner Arched Door Opening -->
  <path d="M 350 1050 L 350 450 C 350 220, 850 220, 850 450 L 850 1050 Z" fill="#8b572a" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <!-- Vertical Wood Planks -->
  <line x1="450" y1="270" x2="450" y2="1050" stroke="#5a381a" stroke-width="10"/>
  <line x1="550" y1="235" x2="550" y2="1050" stroke="#5a381a" stroke-width="10"/>
  <line x1="650" y1="235" x2="650" y2="1050" stroke="#5a381a" stroke-width="10"/>
  <line x1="750" y1="270" x2="750" y2="1050" stroke="#5a381a" stroke-width="10"/>

  <!-- Heavy Wrought-Iron Hinge Top -->
  <path d="M 330 420 L 640 420 C 670 420, 690 400, 710 435 C 690 470, 670 450, 640 450 L 330 450 Z" fill="#2b2d42" stroke="${INK}" stroke-width="8"/>
  <circle cx="370" cy="435" r="10" fill="#adb5bd"/>
  <circle cx="450" cy="435" r="10" fill="#adb5bd"/>
  <circle cx="550" cy="435" r="10" fill="#adb5bd"/>
  <circle cx="640" cy="435" r="10" fill="#adb5bd"/>

  <!-- Heavy Wrought-Iron Hinge Bottom -->
  <path d="M 330 840 L 640 840 C 670 840, 690 820, 710 855 C 690 890, 670 870, 640 870 L 330 870 Z" fill="#2b2d42" stroke="${INK}" stroke-width="8"/>
  <circle cx="370" cy="855" r="10" fill="#adb5bd"/>
  <circle cx="450" cy="855" r="10" fill="#adb5bd"/>
  <circle cx="550" cy="855" r="10" fill="#adb5bd"/>
  <circle cx="640" cy="855" r="10" fill="#adb5bd"/>

  <!-- Ornate Brass Ring Handle & Escutcheon Plate -->
  <rect x="730" y="600" width="55" height="120" rx="8" fill="#e5b42d" stroke="${INK}" stroke-width="8"/>
  <!-- Keyhole -->
  <circle cx="757" cy="690" r="8" fill="${INK}"/>
  <polygon points="752,690 762,690 765,708 749,708" fill="${INK}"/>
  <!-- Brass Ring Knocker -->
  <circle cx="757" cy="635" r="28" fill="none" stroke="#f6c945" stroke-width="12"/>
  <circle cx="757" cy="635" r="14" fill="#e5b42d" stroke="${INK}" stroke-width="6"/>

  <!-- Studded Iron Threshold Plate (flat bottom at y=1050) -->
  <rect x="260" y="1030" width="680" height="30" rx="4" fill="#2b2d42" stroke="${INK}" stroke-width="10"/>
`);

// 4. set-tree: Storybook fairytale lush oak tree with twisting bark and multi-tone canopy
const svgTree = wrapSvg(`
  <!-- Tree Trunk & Roots (sits flat on floor at y=1050) -->
  <path d="M 520 550 Q 510 750, 420 1020 L 400 1050 L 800 1050 L 780 1020 Q 690 750, 680 550 Z" fill="#6d4c41" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <!-- Bark shading & hollow knot -->
  <path d="M 600 680 Q 560 780, 520 1050" stroke="#4e342e" stroke-width="14" stroke-linecap="round"/>
  <path d="M 640 720 Q 660 840, 710 1050" stroke="#4e342e" stroke-width="14" stroke-linecap="round"/>
  <ellipse cx="585" cy="820" rx="28" ry="42" fill="#3e2723" stroke="${INK}" stroke-width="8"/>

  <!-- Deep Forest Canopy Layer (Shadow) -->
  <circle cx="420" cy="460" r="160" fill="#1b4d3e" stroke="${INK}" stroke-width="16"/>
  <circle cx="780" cy="460" r="160" fill="#1b4d3e" stroke="${INK}" stroke-width="16"/>
  <circle cx="600" cy="320" r="220" fill="#1b4d3e" stroke="${INK}" stroke-width="16"/>

  <!-- Midtone Emerald Foliage Clouds -->
  <circle cx="390" cy="430" r="150" fill="#2d6a4f" stroke="${INK}" stroke-width="14"/>
  <circle cx="810" cy="430" r="150" fill="#2d6a4f" stroke="${INK}" stroke-width="14"/>
  <circle cx="480" cy="270" r="160" fill="#2d6a4f" stroke="${INK}" stroke-width="14"/>
  <circle cx="720" cy="270" r="160" fill="#2d6a4f" stroke="${INK}" stroke-width="14"/>
  <circle cx="600" cy="380" r="170" fill="#2d6a4f" stroke="${INK}" stroke-width="14"/>
  <circle cx="600" cy="200" r="150" fill="#2d6a4f" stroke="${INK}" stroke-width="14"/>

  <!-- Sunlit Vibrant Green Highlights -->
  <circle cx="450" cy="230" r="110" fill="#52b788"/>
  <circle cx="680" cy="230" r="110" fill="#52b788"/>
  <circle cx="580" cy="160" r="100" fill="#74c69d"/>
  <circle cx="360" cy="390" r="90" fill="#52b788"/>
  <circle cx="820" cy="390" r="90" fill="#52b788"/>

  <!-- Apples / Red Magic Berries -->
  <circle cx="380" cy="460" r="18" fill="#e63946" stroke="${INK}" stroke-width="6"/>
  <circle cx="490" cy="350" r="20" fill="#e63946" stroke="${INK}" stroke-width="6"/>
  <circle cx="720" cy="370" r="20" fill="#e63946" stroke="${INK}" stroke-width="6"/>
  <circle cx="820" cy="460" r="18" fill="#e63946" stroke="${INK}" stroke-width="6"/>
  <circle cx="600" cy="260" r="22" fill="#e63946" stroke="${INK}" stroke-width="6"/>
`);

// 5. set-fire: Campfire with river stones, charred split logs, glowing embers and stylized flames
const svgFire = wrapSvg(`
  <!-- River Stone Ring Pit (flat on floor at y=1050) -->
  <ellipse cx="600" cy="1000" rx="360" ry="60" fill="#495057" stroke="${INK}" stroke-width="14"/>
  <ellipse cx="280" cy="1010" rx="45" ry="32" fill="#6c757d" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="360" cy="1030" rx="55" ry="35" fill="#868e96" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="460" cy="1040" rx="60" ry="38" fill="#6c757d" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="570" cy="1045" rx="65" ry="40" fill="#868e96" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="680" cy="1045" rx="60" ry="38" fill="#6c757d" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="780" cy="1035" rx="55" ry="35" fill="#868e96" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="870" cy="1020" rx="50" ry="32" fill="#6c757d" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="920" cy="995" rx="42" ry="28" fill="#6c757d" stroke="${INK}" stroke-width="8"/>

  <!-- Glowing Charcoal / Ember Bed -->
  <ellipse cx="600" cy="980" rx="270" ry="38" fill="#d9480f"/>
  <ellipse cx="600" cy="980" rx="220" ry="26" fill="#f76707"/>
  <ellipse cx="600" cy="980" rx="140" ry="16" fill="#ffd43b"/>

  <!-- Crisscrossed Wooden Logs -->
  <!-- Log 1 (Left to Right) -->
  <g transform="rotate(-18 600 950)">
    <rect x="300" y="920" width="600" height="70" rx="18" fill="#5c3d2e" stroke="${INK}" stroke-width="12"/>
    <ellipse cx="300" cy="955" rx="20" ry="35" fill="#8b5a3c" stroke="${INK}" stroke-width="8"/>
    <line x1="370" y1="945" x2="520" y2="945" stroke="#362217" stroke-width="6"/>
  </g>
  <!-- Log 2 (Right to Left) -->
  <g transform="rotate(18 600 950)">
    <rect x="300" y="920" width="600" height="70" rx="18" fill="#4a2f22" stroke="${INK}" stroke-width="12"/>
    <ellipse cx="900" cy="955" rx="20" ry="35" fill="#7a4e33" stroke="${INK}" stroke-width="8"/>
    <line x1="680" y1="945" x2="830" y2="945" stroke="#2c1a11" stroke-width="6"/>
  </g>

  <!-- Stylized Flame Tongues (Layer 1 - Dark Orange / Red Base) -->
  <path d="M 380 950 Q 320 700 480 500 Q 520 680 550 640 Q 580 400 680 320 Q 670 560 760 620 Q 860 680 820 950 Z" fill="#e03131" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>

  <!-- Flame Layer 2 - Bright Fiery Orange -->
  <path d="M 420 950 Q 390 730 500 590 Q 540 700 580 620 Q 610 490 680 440 Q 690 620 750 670 Q 790 740 760 950 Z" fill="#f76707" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>

  <!-- Flame Layer 3 - Core Golden Yellow -->
  <path d="M 470 950 Q 460 790 530 690 Q 560 760 600 670 Q 630 570 670 550 Q 680 720 720 760 Q 730 830 700 950 Z" fill="#ffd43b" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>

  <!-- Bright White-Yellow Flame Heart -->
  <path d="M 530 950 Q 520 840 570 780 Q 600 830 630 760 Q 640 850 660 950 Z" fill="#fff9db"/>

  <!-- Rising Ember Sparks -->
  <circle cx="520" cy="440" r="14" fill="#ffd43b" stroke="${INK}" stroke-width="5"/>
  <circle cx="690" cy="270" r="12" fill="#ffd43b" stroke="${INK}" stroke-width="5"/>
  <circle cx="740" cy="380" r="10" fill="#f76707" stroke="${INK}" stroke-width="4"/>
  <circle cx="440" cy="360" r="10" fill="#f76707" stroke="${INK}" stroke-width="4"/>
`);

// 6. set-throne: Queen Mizzabel's royal throne of clock hands and purple velvet
const svgThrone = wrapSvg(`
  <!-- Stepped Royal Dais Base (flat bottom at y=1050) -->
  <rect x="250" y="980" width="700" height="70" rx="8" fill="#d4af37" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
  <rect x="290" y="920" width="620" height="70" rx="6" fill="#b89326" stroke="${INK}" stroke-width="12"/>
  <rect x="330" y="990" width="540" height="15" rx="3" fill="#8a6e1a"/>

  <!-- Golden Throne Legs -->
  <rect x="340" y="780" width="70" height="150" rx="10" fill="#d4af37" stroke="${INK}" stroke-width="10"/>
  <rect x="790" y="780" width="70" height="150" rx="10" fill="#d4af37" stroke="${INK}" stroke-width="10"/>

  <!-- Ornate Golden Clock-Hand Fan / Halo Backrest -->
  <!-- Clock hands radiating outward -->
  <g stroke="${INK}" stroke-width="10" stroke-linecap="round">
    <line x1="600" y1="450" x2="350" y2="180" stroke="#f6c945" stroke-width="20"/>
    <line x1="600" y1="450" x2="440" y2="120" stroke="#ffd966" stroke-width="22"/>
    <line x1="600" y1="450" x2="600" y2="80" stroke="#f6c945" stroke-width="26"/>
    <line x1="600" y1="450" x2="760" y2="120" stroke="#ffd966" stroke-width="22"/>
    <line x1="600" y1="450" x2="850" y2="180" stroke="#f6c945" stroke-width="20"/>
  </g>
  <!-- Finial tips on the clock hands -->
  <polygon points="350,180 325,160 330,195 365,190" fill="#d4af37" stroke="${INK}" stroke-width="6"/>
  <polygon points="440,120 425,95 440,75 460,95" fill="#d4af37" stroke="${INK}" stroke-width="6"/>
  <polygon points="600,80 575,55 600,30 625,55" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
  <polygon points="760,120 740,95 760,75 775,95" fill="#d4af37" stroke="${INK}" stroke-width="6"/>
  <polygon points="850,180 835,190 870,195 875,160" fill="#d4af37" stroke="${INK}" stroke-width="6"/>

  <!-- Gothic Throne Backrest Frame -->
  <path d="M 370 780 L 370 380 Q 600 160 830 380 L 830 780 Z" fill="#d4af37" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
  <!-- Royal Purple Tufted Velvet Cushion -->
  <path d="M 405 780 L 405 400 Q 600 220 795 400 L 795 780 Z" fill="#4a154b" stroke="${INK}" stroke-width="10"/>
  <!-- Velvet Diamond Tufting with Golden Buttons -->
  <circle cx="500" cy="380" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="600" cy="340" r="12" fill="#f6c945" stroke="${INK}" stroke-width="5"/>
  <circle cx="700" cy="380" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="450" cy="480" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="550" cy="460" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="650" cy="460" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="750" cy="480" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="500" cy="560" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="600" cy="540" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>
  <circle cx="700" cy="560" r="10" fill="#f6c945" stroke="${INK}" stroke-width="4"/>

  <!-- Thick Purple Seat Cushion -->
  <rect x="330" y="740" width="540" height="90" rx="18" fill="#6a1b9a" stroke="${INK}" stroke-width="12"/>
  <rect x="340" y="750" width="520" height="30" rx="10" fill="#8e24aa"/>

  <!-- Carved Golden Armrests with Lion Heads -->
  <rect x="300" y="650" width="80" height="140" rx="12" fill="#d4af37" stroke="${INK}" stroke-width="10"/>
  <circle cx="340" cy="650" r="32" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
  <rect x="820" y="650" width="80" height="140" rx="12" fill="#d4af37" stroke="${INK}" stroke-width="10"/>
  <circle cx="860" cy="650" r="32" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
`);

// 7. set-table: Tea party banquet table with tablecloth, teapot, teacups and cake
const svgTable = wrapSvg(`
  <!-- Table Legs (Carved Walnut, flat on floor at y=1050) -->
  <rect x="240" y="760" width="60" height="290" rx="10" fill="#4e342e" stroke="${INK}" stroke-width="12"/>
  <rect x="900" y="760" width="60" height="290" rx="10" fill="#4e342e" stroke="${INK}" stroke-width="12"/>
  <rect x="220" y="1020" width="100" height="30" rx="6" fill="#3e2723" stroke="${INK}" stroke-width="8"/>
  <rect x="880" y="1020" width="100" height="30" rx="6" fill="#3e2723" stroke="${INK}" stroke-width="8"/>
  <!-- Cross Stretcher Beam -->
  <rect x="280" y="920" width="640" height="28" rx="6" fill="#3e2723" stroke="${INK}" stroke-width="8"/>

  <!-- Table Top Surface -->
  <rect x="140" y="680" width="920" height="50" rx="8" fill="#5d4037" stroke="${INK}" stroke-width="12"/>

  <!-- Draped Scalloped White Tablecloth with Gold Fringe -->
  <path d="M 160 700 L 1040 700 L 1040 790 Q 980 830 920 790 Q 860 830 800 790 Q 740 830 680 790 Q 620 830 560 790 Q 500 830 440 790 Q 380 830 320 790 Q 260 830 200 790 L 160 790 Z" fill="#f8f9fa" stroke="${INK}" stroke-width="10"/>
  <!-- Gold fringe trim -->
  <path d="M 160 790 Q 200 830 260 790 Q 320 830 380 790 Q 440 830 500 790 Q 560 830 620 790 Q 680 830 740 790 Q 800 830 860 790 Q 920 830 980 790 Q 1010 815 1040 790" fill="none" stroke="#f6c945" stroke-width="6"/>

  <!-- Party Cake on Glass Pedestal -->
  <path d="M 540 680 L 660 680 L 630 630 L 570 630 Z" fill="#e9ecef" stroke="${INK}" stroke-width="8"/>
  <!-- 2-Tier Cake -->
  <rect x="490" y="550" width="220" height="80" rx="8" fill="#ffc9c9" stroke="${INK}" stroke-width="10"/>
  <rect x="525" y="470" width="150" height="80" rx="8" fill="#ffdeeb" stroke="${INK}" stroke-width="10"/>
  <!-- White Frosting Drips & Candle -->
  <path d="M 490 560 Q 520 580 550 560 Q 580 580 610 560 Q 640 580 670 560 Q 700 580 710 560" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
  <path d="M 525 480 Q 555 500 585 480 Q 615 500 645 480 Q 665 495 675 480" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
  <rect x="593" y="420" width="14" height="50" rx="3" fill="#74c0fc" stroke="${INK}" stroke-width="5"/>
  <path d="M 600 420 Q 590 395 600 380 Q 610 395 600 420 Z" fill="#ffd43b" stroke="${INK}" stroke-width="4"/>

  <!-- Ornate Porcelain Teapot (Left) -->
  <ellipse cx="340" cy="620" rx="65" ry="55" fill="#f1f3f5" stroke="${INK}" stroke-width="10"/>
  <ellipse cx="340" cy="620" rx="40" ry="25" fill="#e599f7"/>
  <!-- Handle -->
  <path d="M 275 610 Q 230 610 250 650 Q 270 670 285 660" fill="none" stroke="#f6c945" stroke-width="10"/>
  <!-- Spout -->
  <path d="M 395 640 Q 430 640 440 600 Q 425 595 400 615 Z" fill="#f1f3f5" stroke="${INK}" stroke-width="8"/>
  <!-- Lid & Knob -->
  <path d="M 315 570 L 365 570 L 355 550 L 325 550 Z" fill="#f1f3f5" stroke="${INK}" stroke-width="7"/>
  <circle cx="340" cy="542" r="10" fill="#f6c945" stroke="${INK}" stroke-width="5"/>

  <!-- Teacups and Saucers (Right) -->
  <ellipse cx="800" cy="670" rx="55" ry="14" fill="#ced4da" stroke="${INK}" stroke-width="7"/>
  <path d="M 760 660 Q 760 620 800 620 Q 840 620 840 660 Z" fill="#ffffff" stroke="${INK}" stroke-width="8"/>
  <path d="M 840 635 Q 860 635 855 650 Q 845 655 838 650" fill="none" stroke="#f6c945" stroke-width="6"/>

  <!-- Tiered Scone Plate -->
  <ellipse cx="940" cy="670" rx="65" ry="16" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="920" cy="655" rx="22" ry="14" fill="#d97706" stroke="${INK}" stroke-width="6"/>
  <ellipse cx="955" cy="655" rx="20" ry="12" fill="#d97706" stroke="${INK}" stroke-width="6"/>
`);

// ==========================================
// 2. HELD PROPS
// ==========================================

// 8. held-wand: Apprentice magic wand with gold star tip (grip: forward, pointing right)
const svgWand = wrapSvg(`
  <!-- Wand Shaft (Carved Mahogany, handle at left x=160, pointing to right) -->
  <path d="M 160 580 L 160 620 L 760 608 L 760 592 Z" fill="#5c3826" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>
  <!-- Ergonomic Handle Grip & Pommel -->
  <rect x="150" y="570" width="180" height="60" rx="20" fill="#78472a" stroke="${INK}" stroke-width="10"/>
  <circle cx="150" cy="600" r="28" fill="#f6c945" stroke="${INK}" stroke-width="8"/>
  <!-- Gold filigree rings -->
  <rect x="330" y="575" width="20" height="50" rx="4" fill="#f6c945" stroke="${INK}" stroke-width="6"/>
  <rect x="740" y="585" width="26" height="30" rx="4" fill="#f6c945" stroke="${INK}" stroke-width="6"/>

  <!-- Luminous Star Tip Collar & 5-Pointed Star -->
  <g transform="translate(860 600)">
    <!-- Star Glow Backing -->
    <circle cx="0" cy="0" r="140" fill="rgba(255,217,102,0.2)"/>
    <!-- Large Golden Star -->
    <path d="M 0 -110 L 32 -32 L 114 -32 L 48 18 L 72 98 L 0 48 L -72 98 L -48 18 L -114 -32 L -32 -32 Z" fill="#ffd43b" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <!-- Inner Highlight Star -->
    <path d="M 0 -70 L 20 -20 L 72 -20 L 30 12 L 46 62 L 0 30 L -46 62 L -30 12 L -72 -20 L -20 -20 Z" fill="#fff9db"/>
    <!-- Magic Sparkle Diamonds -->
    <polygon points="120,-80 135,-60 120,-40 105,-60" fill="#fcc419" stroke="${INK}" stroke-width="5"/>
    <polygon points="-80,-100 -65,-80 -80,-60 -95,-80" fill="#fcc419" stroke="${INK}" stroke-width="5"/>
    <polygon points="110,60 122,75 110,90 98,75" fill="#fcc419" stroke="${INK}" stroke-width="4"/>
  </g>
`);

// 9. held-sword: Toy wooden knight's sword painted silver (grip: lowFront, vertical blade up)
const svgSword = wrapSvg(`
  <!-- Blade (Vertical, pointing up, handle at bottom y=1050) -->
  <!-- Silver Painted Blade with Center Bevel Ridge -->
  <path d="M 520 800 L 520 280 L 600 150 L 680 280 L 680 800 Z" fill="#ced4da" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <!-- Bevel Shading (Left half darker) -->
  <path d="M 520 800 L 520 280 L 600 150 L 600 800 Z" fill="#adb5bd"/>
  <line x1="600" y1="150" x2="600" y2="800" stroke="${INK}" stroke-width="10"/>

  <!-- Crossguard with Round Rivets -->
  <rect x="400" y="800" width="400" height="60" rx="14" fill="#ffd43b" stroke="${INK}" stroke-width="14"/>
  <circle cx="430" cy="830" r="16" fill="#f08c00" stroke="${INK}" stroke-width="6"/>
  <circle cx="770" cy="830" r="16" fill="#f08c00" stroke="${INK}" stroke-width="6"/>

  <!-- Grip Handle Wrapped in Cobalt Blue Cord -->
  <rect x="560" y="860" width="80" height="190" rx="8" fill="#1c7ed6" stroke="${INK}" stroke-width="12"/>
  <!-- Cord wrapping crisscrosses -->
  <line x1="560" y1="890" x2="640" y2="920" stroke="#1864ab" stroke-width="8"/>
  <line x1="560" y1="940" x2="640" y2="970" stroke="#1864ab" stroke-width="8"/>
  <line x1="560" y1="990" x2="640" y2="1020" stroke="#1864ab" stroke-width="8"/>

  <!-- Round Gold Pommel Cap at Bottom -->
  <circle cx="600" cy="1070" r="45" fill="#ffd43b" stroke="${INK}" stroke-width="12"/>
  <circle cx="600" cy="1070" r="24" fill="#fcc419"/>
`);

// 10. held-cup: Fine porcelain teacup with gold rim and steam (grip: chest, upright)
const svgCup = wrapSvg(`
  <!-- Saucer Plate -->
  <ellipse cx="600" cy="850" rx="280" ry="60" fill="#f8f9fa" stroke="${INK}" stroke-width="16"/>
  <ellipse cx="600" cy="850" rx="220" ry="42" fill="#e9ecef" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="600" cy="850" rx="160" ry="28" fill="#ffd43b" stroke="${INK}" stroke-width="6"/>

  <!-- Teacup Body -->
  <path d="M 400 520 Q 400 800 600 800 Q 800 800 800 520 Z" fill="#ffffff" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <!-- Shadow on right of cup -->
  <path d="M 600 800 Q 800 800 800 520 L 730 520 Q 730 760 600 780 Z" fill="#e9ecef"/>

  <!-- Delicate Gold Rim -->
  <ellipse cx="600" cy="520" rx="200" ry="45" fill="#f8f9fa" stroke="${INK}" stroke-width="14"/>
  <ellipse cx="600" cy="520" rx="192" ry="40" fill="none" stroke="#ffd43b" stroke-width="10"/>

  <!-- Amber Tea Fluid Inside -->
  <ellipse cx="600" cy="535" rx="175" ry="32" fill="#d97706" stroke="${INK}" stroke-width="8"/>
  <ellipse cx="570" cy="530" rx="50" ry="12" fill="#f59f00"/>

  <!-- Fancy Teacup Handle (Right side) -->
  <path d="M 790 560 C 930 560, 930 740, 780 740" fill="none" stroke="${INK}" stroke-width="36" stroke-linecap="round"/>
  <path d="M 790 560 C 930 560, 930 740, 780 740" fill="none" stroke="#ffd43b" stroke-width="20" stroke-linecap="round"/>

  <!-- Curling Steam Wisps -->
  <path d="M 540 460 Q 510 380 550 320 Q 590 260 550 180" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="16" stroke-linecap="round"/>
  <path d="M 640 450 Q 680 370 640 300 Q 600 230 650 160" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="14" stroke-linecap="round"/>
`);

// 11. held-pizza: Hot slice of gourmet pepperoni pizza (grip: chest, upright)
const svgPizza = wrapSvg(`
  <!-- Thick Golden Toasted Crust at top/back -->
  <path d="M 280 400 Q 600 240 920 400 Q 940 450 900 480 Q 600 340 300 480 Q 260 450 280 400 Z" fill="#d97706" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <!-- Crust volume highlight -->
  <path d="M 330 420 Q 600 280 870 420" stroke="#f59f00" stroke-width="14" stroke-linecap="round"/>

  <!-- Pizza Slice Triangle Body (pointing down to tip at x=600, y=980) -->
  <path d="M 300 460 Q 600 340 900 460 L 600 980 Z" fill="#ffd43b" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <!-- Rich Red Marinara Edge -->
  <path d="M 310 465 Q 600 350 890 465 L 870 500 Q 600 400 330 500 Z" fill="#e03131"/>

  <!-- Melted Bubbly Mozzarella Cheese -->
  <path d="M 330 490 Q 600 380 870 490 L 600 960 Z" fill="#ffe066"/>
  <!-- Cheese pulls & drips -->
  <path d="M 560 930 Q 600 1020 620 950" fill="#ffd43b" stroke="${INK}" stroke-width="8"/>

  <!-- Savory Pepperoni Slices -->
  <circle cx="500" cy="580" r="50" fill="#c92a2a" stroke="${INK}" stroke-width="10"/>
  <circle cx="500" cy="580" r="35" fill="#e03131"/>
  <circle cx="700" cy="580" r="52" fill="#c92a2a" stroke="${INK}" stroke-width="10"/>
  <circle cx="700" cy="580" r="38" fill="#e03131"/>
  <circle cx="600" cy="740" r="48" fill="#c92a2a" stroke="${INK}" stroke-width="10"/>
  <circle cx="600" cy="740" r="34" fill="#e03131"/>

  <!-- Fresh Basil Leaves -->
  <g transform="translate(430 680) rotate(25)">
    <path d="M 0 0 C 25 -35, 60 -15, 60 15 C 35 35, 10 20, 0 0 Z" fill="#2b8a3e" stroke="${INK}" stroke-width="6"/>
  </g>
  <g transform="translate(680 700) rotate(-40)">
    <path d="M 0 0 C 25 -35, 60 -15, 60 15 C 35 35, 10 20, 0 0 Z" fill="#2b8a3e" stroke="${INK}" stroke-width="6"/>
  </g>
`);

// 12. held-balloon: Glossy magenta party balloon on curled string (grip: side)
const svgBalloon = wrapSvg(`
  <!-- Balloon Bulb (Upper half) -->
  <ellipse cx="600" cy="380" rx="220" ry="260" fill="#f06595" stroke="${INK}" stroke-width="16"/>
  <!-- 2-Tone Spherical Volume Shadow on Bottom-Right -->
  <path d="M 600 640 C 720 640, 820 520, 820 380 C 820 280, 780 200, 720 160 C 800 240, 800 500, 600 640 Z" fill="#d6336c"/>
  <!-- Curved Glossy Reflection Highlight on Top-Left -->
  <path d="M 440 220 Q 420 320 460 400" fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
  <circle cx="490" cy="190" r="14" fill="#ffffff"/>

  <!-- Tied Neck Knot at Bottom of Balloon -->
  <polygon points="575,630 625,630 635,665 565,665" fill="#c2255c" stroke="${INK}" stroke-width="10"/>

  <!-- Curling White Silk Ribbon String (extends down to y=1050) -->
  <path d="M 600 665 Q 550 720 620 780 Q 690 840 560 900 Q 480 950 630 1000 Q 700 1030 600 1060" fill="none" stroke="#212529" stroke-width="20" stroke-linecap="round"/>
  <path d="M 600 665 Q 550 720 620 780 Q 690 840 560 900 Q 480 950 630 1000 Q 700 1030 600 1060" fill="none" stroke="#f8f9fa" stroke-width="10" stroke-linecap="round"/>
`);

// ==========================================
// Generator & Importer Engine
// ==========================================

const PROPS_TO_GENERATE = [
  { key: "set-clock", svg: svgClock },
  { key: "set-bookshelf", svg: svgBookshelf },
  { key: "set-door", svg: svgDoor },
  { key: "set-tree", svg: svgTree },
  { key: "set-fire", svg: svgFire },
  { key: "set-throne", svg: svgThrone },
  { key: "set-table", svg: svgTable },
  { key: "held-wand", svg: svgWand },
  { key: "held-sword", svg: svgSword },
  { key: "held-cup", svg: svgCup },
  { key: "held-pizza", svg: svgPizza },
  { key: "held-balloon", svg: svgBalloon },
];

export async function generateAndImportAll() {
  console.log("Generating 12 premium vector props for The Kingdom That Lost Its Tuesday...");

  for (const item of PROPS_TO_GENERATE) {
    console.log(`Rendering and keying ${item.key}...`);
    const rawPng = await sharp(Buffer.from(item.svg)).png().toBuffer();
    const imported = await importImage(item.key, rawPng);
    console.log(`✓ ${item.key} imported successfully: aspect = ${imported.aspect?.toFixed(3)}, url = ${imported.url}`);
  }

  // Update project timeline
  const proj = get("the-kingdom-that-lost-its-tuesday-315a36");
  if (proj && proj.timeline) {
    const timelineProps = forTimeline();
    proj.timeline.props = timelineProps;
    save(proj);
    console.log("\n✓ Updated episode project.json with all 12 imported props!");
  }

  console.log("\nAll 12 props successfully generated, keyed, and imported!");
}

generateAndImportAll().catch((err) => {
  console.error("Error generating props:", err);
  process.exit(1);
});
