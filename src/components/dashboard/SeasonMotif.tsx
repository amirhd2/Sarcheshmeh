/* =========================================================================
   ثمر — SeasonMotif
   =========================================================================
   PRD §5 season cards: each season has a faint linear SVG motif rendered
   in the corner of its card. The motif is a single-color stroke drawing
   on a 80×80 viewBox, drawn with currentColor so it inherits the season's
   accent color (at low opacity).

   Motifs:
   - Spring: almond blossom branch  (شکوفه‌ی بادام)
   - Summer: sun + wavy horizon      (خورشید و افق موجی)
   - Autumn: fallen leaves            (برگ‌های افتاده)
   - Winter: snowflakes + mist        (دانه‌برف و مه)
   ========================================================================= */

import type { Season } from '@lib/jalali';

interface SeasonMotifProps {
  season: Season;
  className?: string;
}

export function SeasonMotif({ season, className = '' }: SeasonMotifProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {season === 'spring' && <SpringMotif />}
      {season === 'summer' && <SummerMotif />}
      {season === 'autumn' && <AutumnMotif />}
      {season === 'winter' && <WinterMotif />}
    </svg>
  );
}

/* --- Spring: almond blossom branch --- */
function SpringMotif() {
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      {/* Main branch */}
      <path d="M8 70 Q 22 50, 38 36 T 68 16" />
      {/* Small side branches */}
      <path d="M22 52 Q 28 46, 32 44" />
      <path d="M40 32 Q 44 26, 48 22" />
      <path d="M30 42 Q 36 36, 40 32" />
      {/* Blossoms — 5-petal flowers */}
      <Blossom cx={68} cy={16} r={5} />
      <Blossom cx={48} cy={22} r={4} />
      <Blossom cx={32} cy={44} r={3.5} />
      <Blossom cx={20} cy={54} r={3} />
      {/* Single petals floating */}
      <Petal cx={56} cy={30} r={2} />
      <Petal cx={40} cy={48} r={2} />
    </g>
  );
}

function Blossom({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // 5 petals arranged radially
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    petals.push(
      <circle key={i} cx={px} cy={py} r={r * 0.7} fill="currentColor" stroke="none" opacity={0.85} />,
    );
  }
  return <g>{petals}</g>;
}

function Petal({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" opacity={0.5} />;
}

/* --- Summer: sun + wavy horizon --- */
function SummerMotif() {
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      {/* Sun rays */}
      <g opacity={0.7}>
        <line x1="40" y1="8" x2="40" y2="14" />
        <line x1="40" y1="42" x2="40" y2="48" />
        <line x1="14" y1="28" x2="20" y2="28" />
        <line x1="60" y1="28" x2="66" y2="28" />
        <line x1="22" y1="10" x2="26" y2="14" />
        <line x1="54" y1="42" x2="58" y2="46" />
        <line x1="58" y1="10" x2="54" y2="14" />
        <line x1="26" y1="42" x2="22" y2="46" />
      </g>
      {/* Sun disc */}
      <circle cx="40" cy="28" r="9" fill="currentColor" stroke="none" opacity={0.85} />
      {/* Wavy horizon — 3 stacked waves */}
      <path d="M4 60 Q 14 56, 24 60 T 44 60 T 64 60 T 80 60" opacity={0.5} />
      <path d="M4 66 Q 14 62, 24 66 T 44 66 T 64 66 T 80 66" opacity={0.35} />
      <path d="M4 72 Q 14 68, 24 72 T 44 72 T 64 72 T 80 72" opacity={0.25} />
    </g>
  );
}

/* --- Autumn: fallen leaves --- */
function AutumnMotif() {
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      {/* Large leaf */}
      <g transform="translate(20, 20) rotate(-25)">
        <Leaf w={18} h={22} opacity={0.85} />
      </g>
      {/* Medium leaf */}
      <g transform="translate(48, 28) rotate(35)">
        <Leaf w={14} h={18} opacity={0.7} />
      </g>
      {/* Small leaf */}
      <g transform="translate(38, 52) rotate(-15)">
        <Leaf w={10} h={13} opacity={0.55} />
      </g>
      {/* Tiny leaf */}
      <g transform="translate(58, 60) rotate(60)">
        <Leaf w={7} h={9} opacity={0.4} />
      </g>
      {/* Ground line — soft */}
      <path d="M2 74 Q 20 73, 40 74 T 78 74" opacity={0.3} />
    </g>
  );
}

function Leaf({ w, h, opacity }: { w: number; h: number; opacity: number }) {
  // Almond-shaped leaf with center vein
  return (
    <g fill="currentColor" stroke="currentColor" opacity={opacity}>
      <path d={`M 0 ${-h / 2} Q ${w / 2} ${-h / 4}, ${w / 2} 0 Q ${w / 2} ${h / 4}, 0 ${h / 2} Q ${-w / 2} ${h / 4}, ${-w / 2} 0 Q ${-w / 2} ${-h / 4}, 0 ${-h / 2} Z`} />
      <line x1="0" y1={-h / 2} x2="0" y2={h / 2} stroke="white" strokeWidth="0.8" opacity={0.5} />
    </g>
  );
}

/* --- Winter: snowflakes + mist --- */
function WinterMotif() {
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      {/* Large snowflake */}
      <g transform="translate(28, 24)" opacity={0.85}>
        <Snowflake r={10} />
      </g>
      {/* Medium snowflake */}
      <g transform="translate(56, 18) scale(0.7)" opacity={0.6}>
        <Snowflake r={10} />
      </g>
      {/* Small snowflake */}
      <g transform="translate(48, 52) scale(0.5)" opacity={0.4}>
        <Snowflake r={10} />
      </g>
      {/* Tiny dot snowflakes */}
      <circle cx="14" cy="50" r="1.5" fill="currentColor" opacity={0.4} />
      <circle cx="66" cy="40" r="1.5" fill="currentColor" opacity={0.5} />
      <circle cx="38" cy="68" r="1" fill="currentColor" opacity={0.3} />
      {/* Mist waves at bottom */}
      <path d="M2 76 Q 12 74, 22 76 T 42 76 T 62 76 T 80 76" opacity={0.3} />
    </g>
  );
}

function Snowflake({ r }: { r: number }) {
  // 6-fold radial snowflake — 3 lines through origin, plus small branch arrows
  const lines = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    const x1 = r * Math.cos(angle);
    const y1 = r * Math.sin(angle);
    const x2 = -x1;
    const y2 = -y1;
    lines.push(<line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />);
    // Branches at the tip — small V shapes
    const branchR = r * 0.4;
    const branchAngle = Math.PI / 6;
    for (const sign of [1, -1]) {
      const bx = x1 - branchR * Math.cos(angle + sign * branchAngle);
      const by = y1 - branchR * Math.sin(angle + sign * branchAngle);
      lines.push(
        <line
          key={`b${i}-${sign}`}
          x1={x1 * 0.7}
          y1={y1 * 0.7}
          x2={bx}
          y2={by}
        />,
      );
    }
  }
  return <g>{lines}</g>;
}
