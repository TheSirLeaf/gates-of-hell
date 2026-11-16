import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Inventory } from '../components/Inventory';
import { NumInput } from '../components/NumInput';
import { useAuth } from '../lib/auth';
import { attrTotal, characterResistance, classBonus, skillLimit, skillsWithPoints } from '../lib/character';
import { useGame } from '../lib/game';
import { postRoll } from '../lib/roll';
import { supabase } from '../lib/supabase';
import type { Character } from '../lib/types';
import { useDraft } from '../lib/useDraft';
import {
  ARMORS,
  armorByKey,
  armorLabel,
  ATTRS,
  materialsOf,
  skillExpression,
  SKILLS,
  STARTING_ROLLS,
  testExpression,
  type AttrKey,
} from '../rules';

export function CharacterSheet() {
  const { id } = useParams();
  const { characters, loading } = useGame();
  const source = characters.find((c) => c.id === id);

  if (loading && !source) return <p className="muted">Carregando…</p>;
  if (!source) {
    return (
      <div>
        <p>Ficha não encontrada (ou você não tem acesso a ela).</p>
        <Link to="/fichas">← Voltar</Link>
      </div>
    );
  }
  // key = id: remonta o editor ao trocar de ficha, garantindo que o rascunho pendente seja salvo.
  return <Sheet key={source.id} source={source} />;
}

function Sheet({ source }: { source: Character }) {
  const { profile } = useAuth();
  const { classes, classById } = useGame();
  const navigate = useNavigate();
  const { draft, patch, status, error } = useDraft<Character>('characters', source);
  const [msg, setMsg] = useState<string | null>(null);

  if (!draft || !profile) return null;
  const c = draft;
  const cls = classById(c.class_id);
  const resistencia = characterResistance(c);
  const budget = skillLimit(c, cls);
  const used = skillsWithPoints(c);
  const armor = armorByKey(c.armor_kind);

  async function roll(expr: string, label: string) {
    setMsg(null);
    const res = await postRoll(expr, { profile: profile!, characterId: c.id }, label);
    if (res.error) setMsg(res.error);
    return res;
  }

  async function rollStarting() {
    if (!cls) {
      setMsg('Escolha uma classe antes: Vida e Stamina somam o valor dela.');
      return;
    }
    if (!confirm('Rolar Vida, Postura e Stamina iniciais? Isso substitui os valores atuais e máximos.')) return;
    const fis = attrTotal(c, cls, 'fisico');
    const esp = attrTotal(c, cls, 'espiritual');
    const v = await roll(STARTING_ROLLS.vida(fis, cls.vida), '');
    const p = await roll(STARTING_ROLLS.postura(fis), '');
    const s = await roll(STARTING_ROLLS.stamina(esp, cls.stamina), '');
    if (v.error || p.error || s.error) return;
    const vt = v.results[0].total;
    const pt = p.results[0].total;
    const st = s.results[0].total;
    patch({ vida: vt, vida_max: vt, postura: pt, postura_max: pt, stamina: st, stamina_max: st });
  }

  async function remove() {
    if (!confirm(`Excluir a ficha "${c.name}"? Isso não pode ser desfeito.`)) return;
    const { error: err } = await supabase.from('characters').delete().eq('id', c.id);
    if (err) setMsg(err.message);
    else navigate('/fichas');
  }

  function selectClass(classId: string) {
    const next = classes.find((k) => k.id === classId);
    const keepAbility = next?.abilities.some((a) => a.name === c.chosen_ability);
    patch({ class_id: classId || null, chosen_ability: keepAbility ? c.chosen_ability : '' });
  }

  function setSkill(key: string, value: number) {
    patch({ skills: { ...c.skills, [key]: value } });
  }

  return (
    <div className="sheet">
      <div className="section-head">
        <div>
          <Link to="/fichas" className="muted">
            ← Fichas
          </Link>
          <h1 className="page-title">{c.name || 'Sem nome'}</h1>
        </div>
        <div className="row gap-sm">
          <span className={`save save--${status}`}>
            {status === 'saving' ? 'Salvando…' : status === 'saved' ? 'Salvo' : status === 'error' ? 'Erro ao salvar' : ''}
          </span>
          <button className="btn btn--danger btn--sm" onClick={() => void remove()}>
            Excluir
          </button>
        </div>
      </div>
      {(error || msg) && <p className="alert">{error ?? msg}</p>}

      {/* PERFIL */}
      <section className="card">
        <div className="eyebrow">Perfil</div>
        <div className="form-grid">
          <label className="field field--wide">
            <span>Nome</span>
            <input className="input" value={c.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <label className="field">
            <span>Raça</span>
            <input className="input" value={c.race} maxLength={60} onChange={(e) => patch({ race: e.target.value })} placeholder="Ex.: Humano" />
          </label>
          <label className="field">
            <span>Classe</span>
            <select className="input" value={c.class_id ?? ''} onChange={(e) => selectClass(e.target.value)}>
              <option value="">Sem classe</option>
              {classes.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {cls && (
          <div className="class-box">
            <p>{cls.summary}</p>
            <p className="muted">{cls.benefits}</p>
            {cls.abilities.length > 0 && (
              <label className="field">
                <span>Habilidade inicial (escolha uma)</span>
                <select className="input" value={c.chosen_ability} onChange={(e) => patch({ chosen_ability: e.target.value })}>
                  <option value="">—</option>
                  {cls.abilities.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {cls.abilities
              .filter((a) => a.name === c.chosen_ability)
              .map((a) => (
                <div key={a.name} className="ability">
                  <strong>{a.name}</strong> <span className="badge">-{a.cost} Stamina</span>
                  <p className="pre">{a.description}</p>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* STATUS */}
      <section className="card">
        <div className="section-head">
          <div>
            <div className="eyebrow">Status</div>
            <h2 className="section-title">Recursos</h2>
          </div>
          <button className="btn btn--sm" onClick={() => void rollStarting()} title="Vida = Físico + classe · Postura = Físico · Stamina = Espiritual + classe">
            Rolar iniciais
          </button>
        </div>
        <div className="status-grid">
          <Resource name="Vida" cls="vida" cur={c.vida} max={c.vida_max} onCur={(n) => patch({ vida: n })} onMax={(n) => patch({ vida_max: n })} />
          <Resource name="Postura" cls="postura" cur={c.postura} max={c.postura_max} onCur={(n) => patch({ postura: n })} onMax={(n) => patch({ postura_max: n })} />
          <Resource name="Stamina" cls="stamina" cur={c.stamina} max={c.stamina_max} onCur={(n) => patch({ stamina: n })} onMax={(n) => patch({ stamina_max: n })} />
          <div className="status-card status-card--res">
            <div className="eyebrow">Resistência</div>
            <div className="status-card__big">{resistencia}</div>
            <div className="muted">{armorLabel(c.armor_kind, c.armor_material)}</div>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Armadura</span>
            <select
              className="input"
              value={c.armor_kind ?? ''}
              onChange={(e) => {
                const kind = armorByKey(e.target.value);
                const first = kind ? materialsOf(kind)[0] : null;
                patch({ armor_kind: kind?.key ?? null, armor_material: first ?? null });
              }}
            >
              <option value="">Sem armadura</option>
              {ARMORS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.name} +{a.bonus} ({a.rank})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Material</span>
            <select className="input" disabled={!armor} value={c.armor_material ?? ''} onChange={(e) => patch({ armor_material: e.target.value || null })}>
              {armor ? (
                materialsOf(armor).map((m) => (
                  <option key={m} value={m}>
                    {m} (defesa {armor.defense[m]})
                  </option>
                ))
              ) : (
                <option value="">—</option>
              )}
            </select>
          </label>
        </div>
      </section>

      {/* ATRIBUTOS */}
      <section className="card">
        <div className="eyebrow">Atributos</div>
        <p className="hint">
          Teste de atributo = <code>Nd20kh1</code> (N = valor total, mínimo 1). O total soma o bônus da classe.
        </p>
        <div className="attr-grid">
          {ATTRS.map((a) => {
            const total = attrTotal(c, cls, a.key);
            const bonus = classBonus(cls, a.key);
            return (
              <div key={a.key} className="attr-card">
                <div className="attr-card__name">{a.name}</div>
                <NumInput label={a.name} value={c[a.key]} min={0} max={99} onChange={(n) => patch({ [a.key]: n } as Partial<Character>)} className="input--big" />
                <div className="muted">
                  total {total}
                  {bonus !== 0 && ` (base ${c[a.key]} ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} classe)`}
                </div>
                <button className="btn btn--sm" onClick={() => void roll(testExpression(total), a.name)}>
                  Rolar {testExpression(total)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* PERÍCIAS */}
      <section className="card">
        <div className="section-head">
          <div>
            <div className="eyebrow">Perícias</div>
            <h2 className="section-title">Treinamento</h2>
          </div>
          <span className={`chip ${used > budget ? 'chip--danger' : 'chip--ok'}`}>
            {used} de {budget} slots
          </span>
        </div>
        <p className="hint">
          Um slot por ponto de Mental (com bônus de classe) mais 3 da classe. A perícia soma o valor dela ao teste do atributo do grupo.
        </p>
        <div className="skill-grid">
          {ATTRS.map((a) => (
            <div key={a.key} className="skill-group">
              <h3 className="skill-group__title">
                {a.key === 'fisico' ? 'Físicas' : a.key === 'mental' ? 'Mentais' : 'Espirituais'}
              </h3>
              {SKILLS.filter((s) => s.attr === a.key).map((s) => {
                const value = c.skills?.[s.key] ?? 0;
                const expr = skillExpression(attrTotal(c, cls, s.attr as AttrKey), value);
                const isClass = cls?.skills.includes(s.key) ?? false;
                return (
                  <div key={s.key} className={`skill-row ${isClass ? 'skill-row--class' : ''}`}>
                    <span className="skill-row__name">
                      {s.name} {isClass && <span className="badge">classe</span>}
                    </span>
                    <span className="skill-row__formula">{expr}</span>
                    <NumInput label={s.name} value={value} min={0} max={99} className="input--tiny" onChange={(n) => setSkill(s.key, n)} />
                    <button className="btn btn--sm btn--icon" aria-label={`Rolar ${s.name}`} title={`Rolar ${s.name}`} onClick={() => void roll(expr, s.name)}>
                      🎲
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <Inventory character={c} cls={cls} />

      <section className="card">
        <div className="eyebrow">Anotações</div>
        <textarea className="input textarea" rows={5} value={c.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="História, objetivos, lembretes…" />
      </section>
    </div>
  );
}

function Resource(props: {
  name: string;
  cls: string;
  cur: number;
  max: number;
  onCur: (n: number) => void;
  onMax: (n: number) => void;
}) {
  const { name, cls, cur, max, onCur, onMax } = props;
  return (
    <div className={`status-card status-card--${cls}`}>
      <div className="eyebrow">{name}</div>
      <div className="status-card__inputs">
        <button className="btn btn--ghost btn--sm" onClick={() => onCur(Math.max(0, cur - 1))} aria-label={`Diminuir ${name}`}>
          −
        </button>
        <NumInput label={`${name} atual`} value={cur} min={0} max={9999} className="input--big" onChange={onCur} />
        <button className="btn btn--ghost btn--sm" onClick={() => onCur(Math.min(9999, cur + 1))} aria-label={`Aumentar ${name}`}>
          +
        </button>
      </div>
      <div className="row gap-sm muted">
        <span>máx</span>
        <NumInput label={`${name} máximo`} value={max} min={0} max={9999} className="input--tiny" onChange={onMax} />
      </div>
    </div>
  );
}
