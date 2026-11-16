import { useState } from 'react';
import { NumInput } from '../components/NumInput';
import { useGame } from '../lib/game';
import { supabase } from '../lib/supabase';
import type { Ability, GameClass } from '../lib/types';
import { skillName, SKILLS } from '../rules';

type Draft = Omit<GameClass, 'id'> & { id?: string };

const EMPTY: Draft = {
  name: '',
  summary: '',
  bonus_fisico: 0,
  bonus_mental: 0,
  bonus_espiritual: 0,
  vida: 10,
  stamina: 10,
  skills: [],
  benefits: '',
  abilities: [],
};

export function Classes() {
  const { classes, loading } = useGame();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(d: Draft) {
    setError(null);
    const { id, ...fields } = d;
    const q = id
      ? supabase.from('classes').update(fields).eq('id', id)
      : supabase.from('classes').insert(fields);
    const { error: err } = await q;
    if (err) setError(err.code === '23505' ? 'Já existe uma classe com esse nome.' : err.message);
    else setEditing(null);
  }

  async function remove(c: GameClass) {
    if (!confirm(`Excluir a classe "${c.name}"? Fichas que a usam ficarão sem classe.`)) return;
    const { error: err } = await supabase.from('classes').delete().eq('id', c.id);
    if (err) setError(err.message);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Mestre</div>
          <h1 className="page-title">Classes</h1>
        </div>
        <button className="btn" onClick={() => setEditing({ ...EMPTY })}>
          + Nova classe
        </button>
      </div>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}

      {editing && <ClassForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}

      <div className="grid-cards">
        {classes.map((c) => (
          <article key={c.id} className="panel">
            <h3 className="section-title">{c.name}</h3>
            <p className="muted">{c.summary}</p>
            <p>
              Físico +{c.bonus_fisico} · Mental +{c.bonus_mental} · Espiritual +{c.bonus_espiritual}
              <br />
              Vida {c.vida} · Stamina {c.stamina}
            </p>
            <p>Perícias: {c.skills.map(skillName).join(', ') || '—'}</p>
            <p className="muted">{c.benefits}</p>
            <ul>
              {c.abilities.map((a) => (
                <li key={a.name}>{a.name}</li>
              ))}
            </ul>
            <div className="row gap-sm">
              <button className="btn btn--sm" onClick={() => setEditing({ ...c })}>
                Editar
              </button>
              <button className="btn btn--danger btn--sm" onClick={() => void remove(c)}>
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ClassForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  function toggleSkill(key: string) {
    if (d.skills.includes(key)) set({ skills: d.skills.filter((k) => k !== key) });
    else if (d.skills.length < 3) set({ skills: [...d.skills, key] });
  }
  function setAbility(i: number, p: Partial<Ability>) {
    set({ abilities: d.abilities.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  }

  return (
    <form
      className="panel form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!d.name.trim()) return;
        onSave({ ...d, name: d.name.trim() });
      }}
    >
      <h2 className="section-title">{d.id ? 'Editar classe' : 'Nova classe'}</h2>
      <div className="form-grid">
        <label className="field">
          <span>Nome</span>
          <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} required maxLength={60} />
        </label>
        <label className="field field--wide">
          <span>Resumo</span>
          <input className="input" value={d.summary} onChange={(e) => set({ summary: e.target.value })} />
        </label>
      </div>
      <div className="form-grid">
        <label className="field"><span>Bônus Físico</span><NumInput label="Bônus Físico" value={d.bonus_fisico} min={-9} max={9} onChange={(n) => set({ bonus_fisico: n })} /></label>
        <label className="field"><span>Bônus Mental</span><NumInput label="Bônus Mental" value={d.bonus_mental} min={-9} max={9} onChange={(n) => set({ bonus_mental: n })} /></label>
        <label className="field"><span>Bônus Espiritual</span><NumInput label="Bônus Espiritual" value={d.bonus_espiritual} min={-9} max={9} onChange={(n) => set({ bonus_espiritual: n })} /></label>
        <label className="field"><span>Vida (da classe)</span><NumInput label="Vida" value={d.vida} onChange={(n) => set({ vida: n })} /></label>
        <label className="field"><span>Stamina (da classe)</span><NumInput label="Stamina" value={d.stamina} onChange={(n) => set({ stamina: n })} /></label>
      </div>

      <div className="field">
        <span>Perícias da classe (3) — {d.skills.length}/3</span>
        <div className="chips">
          {SKILLS.map((s) => (
            <button
              type="button"
              key={s.key}
              className={`chip chip--button ${d.skills.includes(s.key) ? 'chip--ok' : ''}`}
              onClick={() => toggleSkill(s.key)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Benefícios</span>
        <textarea className="input textarea" rows={2} value={d.benefits} onChange={(e) => set({ benefits: e.target.value })} />
      </label>

      <div className="field">
        <span>Habilidades iniciais</span>
        {d.abilities.map((a, i) => (
          <div key={i} className="ability-edit">
            <div className="row gap-sm">
              <input className="input" placeholder="Nome" value={a.name} onChange={(e) => setAbility(i, { name: e.target.value })} />
              <NumInput label="Custo de stamina" value={a.cost} className="input--tiny" onChange={(n) => setAbility(i, { cost: n })} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ abilities: d.abilities.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
            <textarea className="input textarea" rows={3} placeholder="Descrição" value={a.description} onChange={(e) => setAbility(i, { description: e.target.value })} />
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ abilities: [...d.abilities, { name: '', cost: 5, description: '' }] })}>
          + Habilidade
        </button>
      </div>

      <div className="row gap-sm">
        <button className="btn">Salvar</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
