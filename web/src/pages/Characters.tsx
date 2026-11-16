import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useGame } from '../lib/game';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { useTable } from '../lib/useTable';

export function Characters() {
  const { profile, isMaster } = useAuth();
  const { characters, classById, loading } = useGame();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const profiles = useTable<Profile>('profiles', { columns: 'id, display_name, role', enabled: isMaster });
  const ownerName = (id: string) => profiles.rows.find((p) => p.id === id)?.display_name ?? '';

  async function create() {
    if (!profile) return;
    setError(null);
    const { data, error: err } = await supabase
      .from('characters')
      .insert({ owner_id: profile.id })
      .select('id')
      .single();
    if (err) setError(err.message);
    else navigate(`/fichas/${data.id}`);
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <div className="eyebrow">{isMaster ? 'Todas as fichas da mesa' : 'Suas fichas'}</div>
          <h1 className="page-title">Fichas</h1>
        </div>
        <button className="btn" onClick={create}>
          + Nova ficha
        </button>
      </div>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}
      {!loading && characters.length === 0 && <p className="muted">Nenhuma ficha ainda. Crie a primeira!</p>}

      <div className="grid-cards">
        {characters.map((c) => {
          const cls = classById(c.class_id);
          return (
            <Link key={c.id} to={`/fichas/${c.id}`} className="card char-card">
              <div className="char-card__name">{c.name}</div>
              <div className="muted">
                {[cls?.name ?? 'Sem classe', c.race].filter(Boolean).join(' · ')}
              </div>
              {isMaster && <div className="chip">{ownerName(c.owner_id) || 'jogador'}</div>}
              <div className="bars">
                <Bar label="Vida" cur={c.vida} max={c.vida_max} cls="vida" />
                <Bar label="Postura" cur={c.postura} max={c.postura_max} cls="postura" />
                <Bar label="Stamina" cur={c.stamina} max={c.stamina_max} cls="stamina" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function Bar({ label, cur, max, cls }: { label: string; cur: number; max: number; cls: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return (
    <div className="bar" title={`${label}: ${cur}/${max}`}>
      <span className="bar__label">{label}</span>
      <span className="bar__track">
        <span className={`bar__fill bar__fill--${cls}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="bar__value">
        {cur}/{max}
      </span>
    </div>
  );
}
