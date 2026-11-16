import type { RefObject } from 'react';

interface Props {
  heat: number; // 0..1
  progress: number; // 0..1 — a peça vai ganhando forma
  tell: boolean; // o metal "acende" antes do teste
  swing: number; // muda a cada golpe (reinicia a animação do martelo)
  anchorRef: RefObject<SVGGElement>;
}

const BLADE_X0 = 150;
const BLADE_W = 142;

/** Oficina ilustrada: fornalha, bigorna, martelo articulado e uma peça que vai se transformando em lâmina. */
export function Scene({ heat, progress, tell, swing, anchorRef }: Props) {
  const reveal = BLADE_W * Math.max(0, Math.min(1, progress));
  return (
    <svg viewBox="0 -30 400 262" className={`scene2 ${tell ? 'scene2--tell' : ''}`} style={{ ['--heat' as string]: heat }} aria-hidden="true">
      <defs>
        <linearGradient id="sc-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b8794" />
          <stop offset="0.5" stopColor="#4c4854" />
          <stop offset="1" stopColor="#262329" />
        </linearGradient>
        <linearGradient id="sc-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5232" />
          <stop offset="1" stopColor="#40281a" />
        </linearGradient>
        <linearGradient id="sc-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1213" />
          <stop offset="1" stopColor="#0b0809" />
        </linearGradient>
        <radialGradient id="sc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff8a3d" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.45" stopColor="#ff7a28" />
          <stop offset="1" stopColor="#a8200f" />
        </linearGradient>
        <linearGradient id="sc-blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
        <clipPath id="sc-reveal">
          <rect className="sc-reveal" x={BLADE_X0 - 24} y="120" width={reveal + 24} height="60" />
        </clipPath>
      </defs>

      {/* parede e fornalha */}
      <rect x="0" y="-30" width="400" height="238" fill="#120b0c" />
      <path d="M14 208 V108 Q14 58 68 58 Q122 58 122 108 V208 Z" fill="#21171a" stroke="#3a2a2c" strokeWidth="2" />
      <path d="M32 208 V114 Q32 80 68 80 Q104 80 104 114 V208 Z" fill="url(#sc-fire)" className="sc-furnace" opacity={0.3 + heat * 0.7} />
      <path d="M50 208 q-6 -34 8 -54 q4 18 14 -4 q14 22 6 58 z" fill="#ffe7a8" opacity={0.25 + heat * 0.5} className="sc-flame" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${14 + i * 27} 70 v138`} stroke="#000" strokeOpacity="0.25" />
      ))}

      {/* chão */}
      <rect x="0" y="208" width="400" height="24" fill="url(#sc-floor)" />
      <ellipse cx="200" cy="208" rx="150" ry="9" fill="#000" opacity="0.5" />

      {/* brilho do metal quente */}
      <ellipse cx="205" cy="150" rx={90 + heat * 70} ry={36 + heat * 26} fill="url(#sc-glow)" opacity={0.15 + heat * 0.85} className="sc-heat" />

      {/* bigorna */}
      <path
        d="M70 152 Q92 147 120 150 H284 L298 161 H278 Q268 173 264 190 H294 V208 H106 V190 H138 Q134 173 124 161 H104 Q84 161 70 152 Z"
        fill="url(#sc-steel)"
        stroke="#b5afc0"
        strokeOpacity="0.55"
        strokeWidth="1.3"
      />
      <path d="M120 150 H284" stroke="#e6e1ee" strokeOpacity="0.5" strokeWidth="2" />

      {/* a peça: barra bruta + lâmina que vai surgindo */}
      <g ref={anchorRef} transform="translate(0 0)">
        <rect x="132" y="141" width="160" height="9" rx="2" fill="#3a3340" />
        <rect x="132" y="141" width="160" height="9" rx="2" fill="url(#sc-fire)" opacity={heat} className="sc-bar" />
        <g clipPath="url(#sc-reveal)" className="sc-blade">
          <rect x="128" y="143" width="24" height="8" rx="2" fill="#5a3b25" />
          <rect x="150" y="134" width="7" height="26" rx="2" fill="currentColor" />
          <path d="M156 145 L268 139 Q296 147 268 155 L156 151 Z" fill="url(#sc-blade)" stroke="#fff" strokeOpacity="0.35" />
          <path d="M160 147.2 H270" stroke="#000" strokeOpacity="0.28" strokeWidth="1.4" />
          <path d="M156 145 L268 139 Q296 147 268 155 L156 151 Z" fill="url(#sc-fire)" opacity={heat * 0.55} />
        </g>
      </g>

      {/* martelo articulado (pivô no cabo) */}
      <g transform="translate(350 90)">
        <g key={swing} className={swing > 0 ? 'hm hm--swing' : 'hm'}>
          <rect x="-152" y="-5" width="152" height="10" rx="4" fill="url(#sc-wood)" />
          <rect x="-46" y="-6" width="46" height="12" rx="5" fill="#2b1a10" />
          <rect x="-178" y="-25" width="38" height="50" rx="6" fill="url(#sc-steel)" stroke="#c9c3d4" strokeOpacity="0.7" strokeWidth="1.4" />
          <rect x="-178" y="-25" width="9" height="50" rx="4" fill="#fff" opacity="0.12" />
          <circle cx="0" cy="0" r="6" fill="#26181a" stroke="#6a5a52" />
        </g>
      </g>
    </svg>
  );
}
