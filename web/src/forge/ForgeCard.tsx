import type { ForgePayload } from '../lib/types';
import { itemName, outcomeTone, RARITIES } from './logic';

export const rarityKey = (name: string): string => RARITIES.find((r) => r.name === name)?.key ?? 'comum';

export function Timeline({ items, current }: { items: ForgePayload['timeline']; current?: number }) {
  return (
    <div className="timeline" aria-label="Resultado de cada golpe">
      {items.map((o, i) => (
        <span key={i} className={`tl tl--${outcomeTone(o)} ${current === i ? 'tl--now' : ''}`} title={`${i + 1}. ${o}`} />
      ))}
    </div>
  );
}

/** Cartão de resultado — usado no chat (o mestre vê em tempo real) e no histórico. */
export function ForgeCard({ p, who }: { p: ForgePayload; who?: string }) {
  const rk = rarityKey(p.rarity);
  const label = itemName(p).replace(/^./, (c) => c.toUpperCase());
  return (
    <div className={`forge-card rarity-${rk}`}>
      <div className="forge-card__head">
        <span className="forge-card__icon" aria-hidden>
          ⚒
        </span>
        <div>
          <div className="forge-card__title">{label}</div>
          <div className="muted">
            {who ? `${who} · ` : ''}
            {p.tests} golpes
          </div>
        </div>
      </div>
      <div className="forge-card__stats">
        <span>
          <b>{p.perfects}</b> perfeitos
        </span>
        <span>
          <b>{p.betters}</b> melhores
        </span>
        <span>
          <b>{p.criticals}</b> falhas críticas
        </span>
        <span className="forge-card__hl">
          dano <b>+{p.damageBonus}</b>
        </span>
        <span className="forge-card__hl">
          durab. <b>{p.durability}</b>
        </span>
      </div>
      <Timeline items={p.timeline} />
      {p.divineOk !== null && (
        <div className={p.divineOk ? 'forge-card__divine ok' : 'forge-card__divine fail'}>
          {p.divineOk ? '✦ Forja divina concluída' : 'Forja divina não concluída'}
        </div>
      )}
    </div>
  );
}
