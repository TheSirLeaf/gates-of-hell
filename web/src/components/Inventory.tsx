import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { attrTotal } from '../lib/character';
import { postRoll } from '../lib/roll';
import { supabase } from '../lib/supabase';
import type { Character, GameClass, InventoryItem } from '../lib/types';
import { useTable } from '../lib/useTable';
import { attrName, meetsRequirement, WEAPONS, weaponByKey, weaponDamageExpression, weaponDamageLabel } from '../rules';
import { NumInput } from './NumInput';

export function Inventory({ character, cls }: { character: Character; cls: GameClass | undefined }) {
  const { profile } = useAuth();
  const { rows } = useTable<InventoryItem>('inventory_items', {
    filter: { column: 'character_id', value: character.id },
    sort: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  });
  const [weaponKey, setWeaponKey] = useState(WEAPONS[0].key);
  const [itemName, setItemName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function add(row: Partial<InventoryItem>) {
    setMessage(null);
    const { error } = await supabase.from('inventory_items').insert({ character_id: character.id, ...row });
    if (error) setMessage(error.message);
  }

  async function update(id: string, changes: Partial<InventoryItem>) {
    const { error } = await supabase.from('inventory_items').update(changes).eq('id', id);
    if (error) setMessage(error.message);
  }

  async function remove(id: string) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) setMessage(error.message);
  }

  async function rollDamage(item: InventoryItem) {
    const w = weaponByKey(item.weapon_key);
    if (!w || !profile) return;
    const expr = weaponDamageExpression(w, attrTotal(character, cls, w.attr));
    const res = await postRoll(expr, { profile, characterId: character.id }, `${item.name} (dano)`);
    if (res.error) setMessage(res.error);
  }

  return (
    <section className="card">
      <div className="section-head">
        <div>
          <div className="eyebrow">Inventário</div>
          <h2 className="section-title">Armas e itens</h2>
        </div>
      </div>

      {message && <p className="text-danger">{message}</p>}
      {rows.length === 0 && <p className="muted">Nada no inventário.</p>}

      <ul className="list">
        {rows.map((it) => {
          const w = weaponByKey(it.weapon_key);
          const ok = w ? meetsRequirement(w, attrTotal(character, cls, w.attr)) : true;
          return (
            <li key={it.id} className="list__row">
              <div className="list__main">
                <strong>{it.name}</strong>
                {w && (
                  <span className="muted">
                    {' '}
                    {weaponDamageLabel(w)} · req. {w.req} {attrName(w.attr)}
                  </span>
                )}
                {w && !ok && <span className="badge badge--warn">requisito não atendido</span>}
                {it.description && <div className="muted">{it.description}</div>}
              </div>
              <label className="check">
                <input type="checkbox" checked={it.equipped} onChange={(e) => void update(it.id, { equipped: e.target.checked })} />
                equipado
              </label>
              <NumInput label={`Quantidade de ${it.name}`} value={it.quantity} min={0} max={999} className="input--tiny" onChange={(n) => void update(it.id, { quantity: n })} />
              {w && (
                <button className="btn btn--sm" onClick={() => void rollDamage(it)}>
                  Dano
                </button>
              )}
              <button className="btn btn--ghost btn--sm" onClick={() => void remove(it.id)} aria-label={`Remover ${it.name}`}>
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <div className="add-row">
        <select className="input" value={weaponKey} onChange={(e) => setWeaponKey(e.target.value)} aria-label="Arma">
          {WEAPONS.map((w) => (
            <option key={w.key} value={w.key}>
              {w.name} — {weaponDamageLabel(w)}
            </option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => {
            const w = weaponByKey(weaponKey)!;
            void add({ kind: 'arma', name: w.name, weapon_key: w.key });
          }}
        >
          + Arma
        </button>
      </div>
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!itemName.trim()) return;
          void add({ kind: 'item', name: itemName.trim() });
          setItemName('');
        }}
      >
        <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Outro item (poção, corda…)" maxLength={80} />
        <button className="btn">+ Item</button>
      </form>
    </section>
  );
}
