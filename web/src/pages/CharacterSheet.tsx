import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { Inventory } from '../components/Inventory';
import { Stepper } from '../components/Stepper';
import { useAuditView } from '../lib/activity';
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
} from '../rules';

export function CharacterSheet() {
  const { id } = useParams();
  const { characters, loading } = useGame();
  const { profile } = useAuth();
  const source = characters.find((c) => c.id === id);

  // Admin em modo suporte abrindo ficha de outra pessoa → o mestre é avisado.
  useAuditView('character', source?.id ?? '', source?.name ?? '', Boolean(source && source.owner_id !== profile?.id));

  if (loading && !source) return <p className="muted">Carregando…</p>;
  if (!source) {
    return (
      <div className="empty">
        <p>Ficha não encontrada (ou você não tem acesso a ela).</p>
        <Link to="/fichas">← Voltar às fichas</Link>
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

  const setSkill = (key: string, value: number) => patch({ skills: { ...c.skills, [key]: value } });

  const resource = (name: string, tone: 'vida' | 'postura' | 'stamina', cur: number, max: number, kCur: keyof Character, kMax: keyof Character) => (
    <Gauge cur={cur} max={max} tone={tone} label={name}>
      <Stepper label={`${name} atual`} value={cur} max={9999} onChange={(n) => patch({ [kCur]: n } as Partial<Character>)} size="sm" />
      <label className="gauge__max">
        máx
        <Stepper label={`${name} máximo`} value={max} max={9999} onChange={(n) => patch({ [kMax]: n } as Partial<Character>)} size="sm" />
      </label>
    </Gauge>
  );

  return (
    <div className="sheet">
      <Link to="/fichas" className="backlink">
        <Icon name="back" size={16} /> Fichas
      </Link>

      {/* Faixa fixa de vitais (celular): ajuste rápido durante o jogo, sem rolar a ficha */}
      <div className="vstrip" role="group" aria-label="Vitais rápidas">
        {(
          [
            ['Vida', 'vida', c.vida, c.vida_max, 'vida'],
            ['Postura', 'postura', c.postura, c.postura_max, 'postura'],
            ['Stamina', 'stamina', c.stamina, c.stamina_max, 'stamina'],
          ] as const
        ).map(([label, tone, cur, max, key]) => (
          <div key={key} className={`vstrip__item vstrip__item--${tone}`}>
            <span className="vstrip__label">{label}</span>
            <div className="vstrip__ctl">
              <button type="button" onClick={() => patch({ [key]: Math.max(0, cur - 1) } as Partial<Character>)} aria-label={`Diminuir ${label}`}>
                −
              </button>
              <b>
                {cur}
                <small>/{max}</small>
              </b>
              <button type="button" onClick={() => patch({ [key]: Math.min(9999, cur + 1) } as Partial<Character>)} aria-label={`Aumentar ${label}`}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* HERÓI */}
      <header className="hero">
        <span className="hero__avatar">{(c.name || '?').charAt(0).toUpperCase()}</span>
        <div className="hero__main">
          <input className="hero__name" value={c.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} aria-label="Nome do personagem" placeholder="Nome do personagem" />
          <div className="hero__fields">
            <label>
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
            <label>
              <span>Raça</span>
              <input className="input" value={c.race} maxLength={60} onChange={(e) => patch({ race: e.target.value })} placeholder="Ex.: Humano" />
            </label>
          </div>
        </div>
        <div className="hero__side">
          <span className={`save save--${status}`}>
            {status === 'saving' ? 'Salvando…' : status === 'saved' ? '✓ Salvo' : status === 'error' ? 'Erro ao salvar' : ''}
          </span>
          <button className="btn btn--danger btn--sm" onClick={() => void remove()}>
            <Icon name="trash" size={14} /> Excluir
          </button>
        </div>
      </header>
      {(error || msg) && <p className="alert">{error ?? msg}</p>}

      {cls && (
        <section className="panel class-box">
          <p>{cls.summary}</p>
          <p className="muted">{cls.benefits}</p>
          {cls.abilities.length > 0 && (
            <>
              <div className="chips">
                {cls.abilities.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    className={`chip chip--button ${c.chosen_ability === a.name ? 'chip--on' : ''}`}
                    onClick={() => patch({ chosen_ability: c.chosen_ability === a.name ? '' : a.name })}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
              <p className="hint">Escolha uma habilidade inicial.</p>
            </>
          )}
          {cls.abilities
            .filter((a) => a.name === c.chosen_ability)
            .map((a) => (
              <div key={a.name} className="ability">
                <b>{a.name}</b> <span className="badge">−{a.cost} Stamina</span>
                <p className="pre">{a.description}</p>
              </div>
            ))}
        </section>
      )}

      {/* RECURSOS */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Vitalidade</h2>
          <button className="btn btn--sm btn--ghost" onClick={() => void rollStarting()} title="Vida = Físico + classe · Postura = Físico · Stamina = Espiritual + classe">
            <Icon name="dice" size={15} /> Rolar iniciais
          </button>
        </div>
        <div className="vitals">
          {resource('Vida', 'vida', c.vida, c.vida_max, 'vida', 'vida_max')}
          {resource('Postura', 'postura', c.postura, c.postura_max, 'postura', 'postura_max')}
          {resource('Stamina', 'stamina', c.stamina, c.stamina_max, 'stamina', 'stamina_max')}
          <div className="armor-card">
            <Icon name="shield" size={26} />
            <div className="armor-card__num">{resistencia}</div>
            <div className="gauge__label">Resistência</div>
            <small className="muted">{armorLabel(c.armor_kind, c.armor_material)}</small>
            <div className="armor-card__sel">
              <select
                className="input input--sm"
                aria-label="Armadura"
                value={c.armor_kind ?? ''}
                onChange={(e) => {
                  const kind = armorByKey(e.target.value);
                  patch({ armor_kind: kind?.key ?? null, armor_material: kind ? materialsOf(kind)[0] : null });
                }}
              >
                <option value="">Sem armadura</option>
                {ARMORS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name} +{a.bonus}
                  </option>
                ))}
              </select>
              <select className="input input--sm" aria-label="Material" disabled={!armor} value={c.armor_material ?? ''} onChange={(e) => patch({ armor_material: e.target.value || null })}>
                {armor ? (
                  materialsOf(armor).map((m) => (
                    <option key={m} value={m}>
                      {m} ({armor.defense[m]})
                    </option>
                  ))
                ) : (
                  <option value="">—</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ATRIBUTOS */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Atributos</h2>
          <span className="hint">
            Teste = <code>Nd20kh1</code> · total soma o bônus da classe
          </span>
        </div>
        <div className="runes">
          {ATTRS.map((a) => {
            const total = attrTotal(c, cls, a.key);
            const bonus = classBonus(cls, a.key);
            return (
              <div key={a.key} className="rune">
                <div className="rune__name">{a.name}</div>
                <div className="rune__total">{total}</div>
                <small className="muted">
                  {bonus !== 0 ? `base ${c[a.key]} ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} classe` : a.hint}
                </small>
                <Stepper label={a.name} value={c[a.key]} max={99} onChange={(n) => patch({ [a.key]: n } as Partial<Character>)} />
                <button className="btn btn--sm" onClick={() => void roll(testExpression(total), a.name)}>
                  <Icon name="dice" size={15} /> {testExpression(total)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* PERÍCIAS */}
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Perícias</h2>
          <span className={`chip ${used > budget ? 'chip--danger' : 'chip--ok'}`}>
            {used} de {budget} slots
          </span>
        </div>
        <p className="hint">Um slot por ponto de Mental (com bônus) mais 3 da classe. A perícia soma o valor dela ao teste do atributo do grupo.</p>
        <div className="skill-grid">
          {ATTRS.map((a) => (
            <div key={a.key} className="skill-group">
              <h3 className="skill-group__title">{a.key === 'fisico' ? 'Físicas' : a.key === 'mental' ? 'Mentais' : 'Espirituais'}</h3>
              {SKILLS.filter((s) => s.attr === a.key).map((s) => {
                const value = c.skills?.[s.key] ?? 0;
                const expr = skillExpression(attrTotal(c, cls, s.attr), value);
                const isClass = cls?.skills.includes(s.key) ?? false;
                return (
                  <div key={s.key} className={`skill ${isClass ? 'skill--class' : ''} ${value > 0 ? 'skill--on' : ''}`}>
                    <div className="skill__name">
                      <span>
                        {s.name} {isClass && <span className="badge">classe</span>}
                      </span>
                      <small>{expr}</small>
                    </div>
                    <Stepper label={s.name} value={value} max={99} size="sm" onChange={(n) => setSkill(s.key, n)} />
                    <button className="icon-btn icon-btn--accent" aria-label={`Rolar ${s.name}`} title={`Rolar ${s.name}`} onClick={() => void roll(expr, s.name)}>
                      <Icon name="dice" size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <Inventory character={c} cls={cls} />

      <section className="panel">
        <h2 className="panel__title">Anotações</h2>
        <textarea className="input textarea" rows={5} value={c.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="História, objetivos, lembretes…" />
      </section>
    </div>
  );
}
