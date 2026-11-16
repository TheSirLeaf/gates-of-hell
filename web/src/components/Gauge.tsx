import type { ReactNode } from 'react';

interface Props {
  cur: number;
  max: number;
  tone: 'vida' | 'postura' | 'stamina';
  label: string;
  children?: ReactNode;
}

/** Anel de recurso (Vida / Postura / Stamina). */
export function Gauge({ cur, max, tone, label, children }: Props) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
  return (
    <div className={`gauge gauge--${tone}`}>
      <div className="gauge__ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={R} className="gauge__track" />
          <circle
            cx="50"
            cy="50"
            r={R}
            className="gauge__fill"
            strokeDasharray={`${C * pct} ${C}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="gauge__value">
          <b>{cur}</b>
          <small>/ {max}</small>
        </div>
      </div>
      <div className="gauge__label">{label}</div>
      {children}
    </div>
  );
}
