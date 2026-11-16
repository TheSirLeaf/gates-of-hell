import type { RefObject } from 'react';
import { BANDS } from './logic';

const C = 120;
const R = 98;

function polar(angle: number, r = R): [number, number] {
  const a = ((angle - 90) * Math.PI) / 180; // 0° = topo, sentido horário
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function arc(a0: number, a1: number, r = R): string {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

interface Props {
  needleRef: RefObject<SVGGElement>;
  trailRef: RefObject<HTMLDivElement>;
  center: number;
  zone: number;
  live: boolean;
  hitAngle: number | null;
  tone: string;
}

/** Roda de precisão. O ponteiro e o rastro são movidos direto pelo ref (sem re-render por frame). */
export function Dial({ needleRef, trailRef, center, zone, live, hitAngle, tone }: Props) {
  const z = zone;
  const bands = [
    { cls: 'zone zone--good', a0: -z, a1: -z * BANDS.better },
    { cls: 'zone zone--good', a0: z * BANDS.better, a1: z },
    { cls: 'zone zone--better', a0: -z * BANDS.better, a1: -z * BANDS.perfect },
    { cls: 'zone zone--better', a0: z * BANDS.perfect, a1: z * BANDS.better },
    { cls: 'zone zone--perfect', a0: -z * BANDS.perfect, a1: z * BANDS.perfect },
  ];

  return (
    <div className={`dial ${live ? 'dial--live' : 'dial--idle'} dial--${tone}`} aria-hidden="true">
      <div className="dial__trail" ref={trailRef} />
      <svg viewBox="0 0 240 240" className="dial__svg">
        <defs>
          <radialGradient id="dialFace" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#2a1e1b" />
            <stop offset="100%" stopColor="#120c0b" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r="116" fill="url(#dialFace)" stroke="rgba(255,190,120,.18)" />
        <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="16" />
        {/* ticks */}
        {Array.from({ length: 36 }, (_, i) => {
          const [x0, y0] = polar(i * 10, 108);
          const [x1, y1] = polar(i * 10, i % 3 === 0 ? 114 : 111);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(255,255,255,.18)" />;
        })}
        {/* zonas, centradas em `center` */}
        <g style={{ transform: `rotate(${center}deg)`, transformOrigin: `${C}px ${C}px` }}>
          {bands.map((b, i) => (
            <path key={i} d={arc(b.a0, b.a1)} className={b.cls} />
          ))}
        </g>
        {hitAngle !== null && (
          <g>
            {(() => {
              const [x0, y0] = polar(hitAngle, 82);
              const [x1, y1] = polar(hitAngle, 112);
              return <line x1={x0} y1={y0} x2={x1} y2={y1} className="hit-mark" />;
            })()}
          </g>
        )}
        <g ref={needleRef} style={{ transformOrigin: `${C}px ${C}px` }}>
          <polygon points={`${C},${C - 104} ${C - 5},${C - 14} ${C + 5},${C - 14}`} className="needle" />
        </g>
        <circle cx={C} cy={C} r="11" className="hub" />
        <circle cx={C} cy={C} r="4" fill="#2a120a" />
      </svg>
    </div>
  );
}
