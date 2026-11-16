import { useState } from 'react';
import { NumInput } from '../components/NumInput';
import { useAuditView } from '../lib/activity';
import { useAuth } from '../lib/auth';
import { postRoll } from '../lib/roll';
import { supabase } from '../lib/supabase';
import type { Monster } from '../lib/types';
import { useTable } from '../lib/useTable';
import { testExpression } from '../rules';

type Draft = Omit<Monster, 'id'> & { id?: string };

const EMPTY: Draft = {
  name: '',
  vida: 10,
  vida_max: 10,
  postura: 10,
  stamina: 10,
  resistencia: 0,
  fisico: 1,
  mental: 1,
  espiritual: 1,
  attacks: '',
  notes: '',
};

export function Bestiary() {
  const { profile } = useAuth();
  useAuditView('bestiary', 'bestiary', 'Bestiário');
  const { rows, loading } = useTable<Monster>('monsters', { sort: (a, b) => a.name.localeCompare(b.name, 'pt-BR') });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(d: Draft) {
    setError(null);
    const { id, ...fields } = d;
    const { error: err } = id
      ? await supabase.from('monsters').update(fields).eq('id', id)
      : await supabase.from('monsters').insert(fields);
    if (err) setError(err.message);
    else setEditing(null);
  }

  async function patch(m: Monster, changes: Partial<Monster>) {
    const { error: err } = await supabase.from('monsters').update(changes).eq('id', m.id);
    if (err) setError(err.message);
  }

  async function remove(m: Monster) {
    if (!confirm(`Excluir "${m.name}"?`)) return;
    const { error: err } = await supabase.from('monsters').delete().eq('id', m.id);
    if (err) setError(err.message);
  }

  async function roll(m: Monster, attr: 'fisico' | 'mental' | 'espiritual', secret: boolean) {
    if (!profile) return;
    const res = await postRoll(testExpression(m[attr]), { profile, secret }, `${m.name} (${attr})`);
    if (res.error) setError(res.error);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mestre</div>
          <h1 className="page-title">Bestiário</h1>
        </div>
        <button className="btn" onClick={() => setEditing({ ...EMPTY })}>
          + Novo monstro
        </button>
      </div>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}
      {editing && <MonsterForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}

      <div className="grid-cards">
        {rows.map((m) => (
          <article key={m.id} className="panel">
            <h3 className="section-title">{m.name}</h3>
            <div className="status-mini">
              <label>Vida <NumInput label="Vida" value={m.vida} className="input--tiny" min={0} max={9999} onChange={(n) => void patch(m, { vida: n })} /> / {m.vida_max}</label>
              <label>Postura <NumInput label="Postura" value={m.postura} className="input--tiny" min={0} max={9999} onChange={(n) => void patch(m, { postura: n })} /></label>
              <label>Stamina <NumInput label="Stamina" value={m.stamina} className="input--tiny" min={0} max={9999} onChange={(n) => void patch(m, { stamina: n })} /></label>
            </div>
            <p>
              Resistência {m.resistencia} · Fís {m.fisico} · Men {m.mental} · Esp {m.espiritual}
            </p>
            {m.attacks && <p className="pre">{m.attacks}</p>}
            {m.notes && <p className="muted pre">{m.notes}</p>}
            <div className="row gap-sm wrap">
              {(['fisico', 'mental', 'espiritual'] as const).map((a) => (
                <button key={a} className="btn btn--sm" onClick={() => void roll(m, a, false)} title="Rolar aberto">
                  {a === 'fisico' ? 'Fís' : a === 'mental' ? 'Men' : 'Esp'}
                </button>
              ))}
              <button className="btn btn--ghost btn--sm" onClick={() => void roll(m, 'fisico', true)} title="Rolar Físico em segredo">
                Fís 🔒
              </button>
            </div>
            <div className="row gap-sm">
              <button className="btn btn--sm" onClick={() => setEditing({ ...m })}>
                Editar
              </button>
              <button className="btn btn--danger btn--sm" onClick={() => void remove(m)}>
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MonsterForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const num = (label: string, key: keyof Draft) => (
    <label className="field">
      <span>{label}</span>
      <NumInput label={label} value={d[key] as number} max={9999} onChange={(n) => set({ [key]: n } as Partial<Draft>)} />
    </label>
  );
  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        if (d.name.trim()) onSave({ ...d, name: d.name.trim() });
      }}
    >
      <h2 className="section-title">{d.id ? 'Editar monstro' : 'Novo monstro'}</h2>
      <label className="field">
        <span>Nome</span>
        <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} required maxLength={80} />
      </label>
      <div className="form-grid">
        {num('Vida atual', 'vida')}
        {num('Vida máxima', 'vida_max')}
        {num('Postura', 'postura')}
        {num('Stamina', 'stamina')}
        {num('Resistência', 'resistencia')}
        {num('Físico', 'fisico')}
        {num('Mental', 'mental')}
        {num('Espiritual', 'espiritual')}
      </div>
      <label className="field">
        <span>Ataques</span>
        <textarea className="input textarea" rows={3} value={d.attacks} onChange={(e) => set({ attacks: e.target.value })} placeholder="Garras: 1d10+3…" />
      </label>
      <label className="field">
        <span>Notas</span>
        <textarea className="input textarea" rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
      <div className="row gap-sm">
        <button className="btn">Salvar</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
