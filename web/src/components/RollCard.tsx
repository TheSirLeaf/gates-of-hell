import { formatNumber, type RollResult } from '../lib/dice';

/** Detecta 20 natural / 1 natural em testes de um único d20 mantido (ex.: 1d20, 3d20kh1). */
function natural(r: RollResult): 'nat20' | 'nat1' | null {
  const kept = r.dice.filter((d) => !d.dropped);
  if (kept.length !== 1 || kept[0].sides !== 20 || kept[0].fate) return null;
  return kept[0].value === 20 ? 'nat20' : kept[0].value === 1 ? 'nat1' : null;
}

export function RollCard({ r, fresh }: { r: RollResult; fresh?: boolean }) {
  const nat = natural(r);
  const state = r.success === true ? 'ok' : r.success === false ? 'fail' : '';
  return (
    <div className={`rollcard ${state ? `rollcard--${state}` : ''} ${nat ? `rollcard--${nat}` : ''} ${fresh ? 'rollcard--fresh' : ''}`}>
      <div className="rollcard__top">
        <div className="rollcard__info">
          <span className="rollcard__label">{r.label || 'Rolagem'}</span>
          <span className="rollcard__expr">{r.expression}</span>
        </div>
        <div className="rollcard__total" aria-label={`Total ${formatNumber(r.total)}`}>
          {formatNumber(r.total)}
        </div>
      </div>
      {(nat || r.success !== null) && (
        <div className="rollcard__flag">
          {nat === 'nat20' && '✦ 20 natural'}
          {nat === 'nat1' && '☠ 1 natural'}
          {!nat && r.success === true && 'Sucesso'}
          {!nat && r.success === false && 'Falha'}
        </div>
      )}
      {r.dice.length > 0 && (
        <div className="rollcard__dice">
          {r.dice.map((d, i) => {
            const min = !d.fate && !d.dropped && d.value === 1 && (d.sides ?? 0) >= 4;
            return (
              <span
                key={i}
                className={`die ${d.dropped ? 'die--dropped' : ''} ${d.crit ? 'die--crit' : ''} ${min ? 'die--min' : ''}`}
                style={fresh ? { animationDelay: `${Math.min(i, 12) * 40}ms` } : undefined}
              >
                {d.fate ? (d.value > 0 ? '+' : d.value < 0 ? '−' : '0') : formatNumber(d.value)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
