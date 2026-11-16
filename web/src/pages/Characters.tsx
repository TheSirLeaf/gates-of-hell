import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { useGame } from '../lib/game';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { useTable } from '../lib/useTable';

export function Characters() {
  const { profile, masterAccess } = useAuth();
  const { characters, classById, loading } = useGame();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const profiles = useTable<Profile>('profiles', { columns: 'id, display_name, role, admin_mode', enabled: masterAccess });
  const ownerName = (id: string) => profiles.rows.find((p) => p.id === id)?.display_name ?? '';

  async function create() {
    if (!profile) return;
    setError(null);
    const { data, error: err } = await supabase.from('characters').insert({ owner_id: profile.id }).select('id').single();
    if (err) setError(err.message);
    else navigate(`/fichas/${data.id}`);
  }

  const mine = characters.filter((c) => c.owner_id === profile?.id);
  const others = characters.filter((c) => c.owner_id !== profile?.id);

  const card = (c: (typeof characters)[number]) => {
    const cls = classById(c.class_id);
    return (
      <Link key={c.id} to={`/fichas/${c.id}`} className="char-card">
        <span className="char-card__avatar">{(c.name || '?').charAt(0).toUpperCase()}</span>
        <div className="char-card__info">
          <div className="char-card__name">{c.name}</div>
          <div className="muted">{[cls?.name ?? 'Sem classe', c.race].filter(Boolean).join(' · ')}</div>
          {c.owner_id !== profile?.id && ownerName(c.owner_id) && <span className="chip">de {ownerName(c.owner_id)}</span>}
        </div>
        <div className="mini-bars">
          <MiniBar tone="vida" cur={c.vida} max={c.vida_max} label="Vida" />
          <MiniBar tone="postura" cur={c.postura} max={c.postura_max} label="Postura" />
          <MiniBar tone="stamina" cur={c.stamina} max={c.stamina_max} label="Stamina" />
        </div>
      </Link>
    );
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">{masterAccess ? 'Mesa' : 'Seus personagens'}</div>
          <h1 className="page-title">Fichas</h1>
        </div>
        <button className="btn" onClick={create}>
          <Icon name="plus" /> Nova ficha
        </button>
      </div>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}
      {!loading && characters.length === 0 && (
        <div className="empty">
          <Icon name="sheet" size={32} />
          <p>Nenhuma ficha ainda. Crie a primeira e comece a aventura.</p>
        </div>
      )}

      {mine.length > 0 && (
        <>
          {masterAccess && <h2 className="group-title">Suas</h2>}
          <div className="grid-cards">{mine.map(card)}</div>
        </>
      )}
      {others.length > 0 && (
        <>
          <h2 className="group-title">Da mesa</h2>
          <div className="grid-cards">{others.map(card)}</div>
        </>
      )}
    </section>
  );
}

function MiniBar({ label, cur, max, tone }: { label: string; cur: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return (
    <div className="mini" title={`${label}: ${cur}/${max}`}>
      <span className="mini__label">{label}</span>
      <span className="mini__track">
        <span className={`mini__fill mini__fill--${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="mini__value">
        {cur}/{max}
      </span>
    </div>
  );
}
