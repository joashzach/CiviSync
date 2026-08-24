export default function AppBackgroundBlobs() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* ── Top-left Sage/Teal Organic Blob ──────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          top: -110,
          left: -90,
          width: 580,
          height: 580,
          opacity: 0.62,
        }}
        viewBox="0 0 500 500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M420,290Q390,380,300,410Q210,440,130,380Q50,320,70,210Q90,100,190,70Q290,40,370,90Q450,140,420,290Z"
          fill="#74A39D"
        />
      </svg>

      {/* ── Top-Right Warm Terracotta Blob ───────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          top: -130,
          right: -110,
          width: 620,
          height: 620,
          opacity: 0.52,
        }}
        viewBox="0 0 500 500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M440,320Q400,440,290,430Q180,420,110,340Q40,260,70,160Q100,60,200,60Q300,60,390,110Q480,160,440,320Z"
          fill="#DE7D60"
        />
      </svg>

      {/* ── Bottom-Right Terracotta Fluid Wave ────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          bottom: -150,
          right: -120,
          width: 700,
          height: 700,
          opacity: 0.44,
        }}
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M520,380Q460,510,340,510Q220,510,130,420Q40,330,80,210Q120,90,240,80Q360,70,450,150Q540,230,520,380Z"
          fill="#E5846B"
        />
      </svg>

      {/* ── Full-Canvas Cartographic Street Map Overlay ────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.28,
        }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1600 1000"
      >
        <defs>
          {/* Subtle grid pattern for residential blocks */}
          <pattern id="street-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <line x1="0" y1="25" x2="100" y2="25" stroke="#3A5C52" strokeWidth="0.8" opacity="0.4" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#3A5C52" strokeWidth="1.2" opacity="0.6" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#3A5C52" strokeWidth="0.8" opacity="0.4" />
            <line x1="25" y1="0" x2="25" y2="100" stroke="#3A5C52" strokeWidth="0.8" opacity="0.4" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#3A5C52" strokeWidth="1.2" opacity="0.6" />
            <line x1="75" y1="0" x2="75" y2="100" stroke="#3A5C52" strokeWidth="0.8" opacity="0.4" />
          </pattern>
        </defs>

        {/* Dense background street grid texture in selected sectors */}
        <rect x="750" y="80" width="800" height="850" fill="url(#street-grid)" opacity="0.35" />
        <rect x="50" y="300" width="600" height="650" fill="url(#street-grid)" opacity="0.2" />

        {/* ── Urban Parks & Green Spaces ─────────────────────────────────── */}
        <path
          d="M950,140 C1020,120 1100,160 1130,220 C1160,280 1110,340 1040,360 C970,380 910,320 890,260 C870,200 900,150 950,140 Z"
          fill="#6F9C94"
          opacity="0.35"
          stroke="#4D7A72"
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />
        <path
          d="M1320,480 C1380,450 1480,470 1520,530 C1560,590 1510,680 1440,700 C1370,720 1310,650 1290,580 C1270,510 1300,490 1320,480 Z"
          fill="#6F9C94"
          opacity="0.3"
          stroke="#4D7A72"
          strokeWidth="1.5"
        />
        <path
          d="M200,620 C260,600 340,630 360,690 C380,750 330,820 270,840 C210,860 150,810 140,750 C130,690 160,630 200,620 Z"
          fill="#6F9C94"
          opacity="0.25"
        />

        {/* ── Natural Waterway / River & Canals ───────────────────────────── */}
        <path
          d="M800,-20 C830,120 780,240 850,380 C920,520 1040,610 1120,720 C1200,830 1180,950 1220,1020"
          stroke="#5B8E87"
          strokeWidth="32"
          fill="none"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M850,380 C940,360 1080,410 1200,370 C1320,330 1440,390 1620,360"
          stroke="#5B8E87"
          strokeWidth="16"
          fill="none"
          opacity="0.4"
        />
        {/* River outline borders */}
        <path
          d="M800,-20 C830,120 780,240 850,380 C920,520 1040,610 1120,720 C1200,830 1180,950 1220,1020"
          stroke="#365C53"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />

        {/* ── Primary Highways & Arterial Expressways (Bold Dual Lines) ──── */}
        {/* Ring Expressway 1 */}
        <path
          d="M-50,220 C280,180 520,310 820,260 C1120,210 1350,320 1650,280"
          stroke="#2A4B42"
          strokeWidth="6"
          fill="none"
        />
        <path
          d="M-50,220 C280,180 520,310 820,260 C1120,210 1350,320 1650,280"
          stroke="#F4F8F7"
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />

        {/* Diagonal Arterial Highway 2 */}
        <path
          d="M200,-50 C380,220 590,440 920,680 C1250,920 1450,980 1650,1050"
          stroke="#2A4B42"
          strokeWidth="5"
          fill="none"
        />
        <path
          d="M200,-50 C380,220 590,440 920,680 C1250,920 1450,980 1650,1050"
          stroke="#F4F8F7"
          strokeWidth="1.5"
          fill="none"
          opacity="0.8"
        />

        {/* Southern Cross Avenue 3 */}
        <path
          d="M-20,740 C340,710 680,780 1020,710 C1360,640 1490,750 1650,720"
          stroke="#2A4B42"
          strokeWidth="4.5"
          fill="none"
        />

        {/* Northern Parkway 4 */}
        <path
          d="M600,-30 C720,180 940,320 1280,480 T1650,580"
          stroke="#2A4B42"
          strokeWidth="4"
          fill="none"
        />

        {/* ── Metro / Railway Transit Lines (Cross-tied track) ────────────── */}
        <path
          d="M100,1050 C320,780 560,540 890,320 C1220,100 1440,-20 1550,-50"
          stroke="#C8674E"
          strokeWidth="3.5"
          strokeDasharray="8,6"
          fill="none"
          opacity="0.8"
        />

        {/* ── Secondary Connector Streets & Boulevard Grids ──────────────── */}
        <g stroke="#3A5C52" strokeWidth="2.2" fill="none">
          <line x1="880" y1="40" x2="1080" y2="980" />
          <line x1="1020" y1="20" x2="1240" y2="990" />
          <line x1="1180" y1="60" x2="1400" y2="960" />
          <line x1="1340" y1="30" x2="1550" y2="940" />

          <line x1="150" y1="80" x2="320" y2="920" />
          <line x1="300" y1="50" x2="480" y2="950" />
          <line x1="450" y1="60" x2="620" y2="930" />

          {/* Cross Latitudes */}
          <line x1="680" y1="180" x2="1580" y2="160" />
          <line x1="720" y1="340" x2="1600" y2="320" />
          <line x1="650" y1="490" x2="1580" y2="510" />
          <line x1="780" y1="640" x2="1620" y2="620" />
          <line x1="820" y1="820" x2="1590" y2="800" />
          <line x1="60" y1="440" x2="680" y2="430" />
          <line x1="80" y1="580" x2="720" y2="600" />
        </g>

        {/* ── Roundabouts & Civic Plazas ─────────────────────────────────── */}
        <g stroke="#2A4B42" strokeWidth="3" fill="#F4F8F7">
          <circle cx="820" cy="260" r="14" />
          <circle cx="920" cy="680" r="16" />
          <circle cx="520" cy="310" r="12" />
          <circle cx="1280" cy="480" r="15" />
          <circle cx="1040" cy="710" r="13" />
        </g>

        {/* ── Bridge Crossing Marks over the River ───────────────────────── */}
        <g stroke="#1D3831" strokeWidth="4">
          <line x1="835" y1="250" x2="865" y2="270" />
          <line x1="910" y1="510" x2="940" y2="530" />
          <line x1="1105" y1="710" x2="1135" y2="730" />
        </g>

        {/* ── Cartographic Labels & Coordinates ──────────────────────────── */}
        <g fill="#2D4D44" fontSize="10" fontFamily="'Poppins', sans-serif" fontWeight="700" opacity="0.6" letterSpacing="2px">
          <text x="860" y="240" transform="rotate(-10 860 240)">CENTRAL PKWY</text>
          <text x="1310" y="460" transform="rotate(15 1310 460)">EAST BLVD</text>
          <text x="320" y="700" transform="rotate(-5 320 700)">WEST AVE</text>
          <text x="960" y="395">METRO TRANSIT LINE</text>
          <text x="1420" y="120">SECTOR 04</text>
          <text x="120" y="160">DISTRICT 01</text>
        </g>

        {/* Coordinate Crosshairs */}
        <g stroke="#2D4D44" strokeWidth="1" opacity="0.5">
          <path d="M700,50 L720,50 M710,40 L710,60" />
          <path d="M1400,200 L1420,200 M1410,190 L1410,210" />
          <path d="M1100,850 L1120,850 M1110,840 L1110,860" />
          <path d="M250,400 L270,400 M260,390 L260,410" />
        </g>
      </svg>
    </div>
  );
}

