import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Profile, Role } from '../lib/types';
import { useTable } from '../lib/useTable';
import { ActivityFeed } from './Activity';

const ROLE_LABEL: Record<Role, string> = { player: 'Jogador', master: 'Mestre', admin: 'Admin' };

export function AdminPanel() {
  const { profile, adminMode } = useAuth();
  const { rows, loading } = useTable<Profile>('profiles', {
    columns: 'id, display_name, role, admin_mode',
    sort: (a, b) => a.display_name.localeCompare(b.display_name, 'pt-BR'),
  });
  const [error, setError] = useState<string | null>(null);

  async function setRole(p: Profile, role: 'player' | 'master') {
    setError(null);
    if (role === 'master' && !confirm(`Tornar ${p.display_name} mestre? Ele passa a ver todas as fichas.`)) return;
    const { error: err } = await supabase.rpc('admin_set_role', { p_user: p.id, p_role: role });
    if (err) setError(err.message);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Administração</div>
          <h1 className="page-title">Painel do admin</h1>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Como funciona</h2>
        <p>
          Como admin você <b>não é mestre</b>: fica sem acesso às fichas dos outros, ao bestiário e às rolagens secretas, e usa o site como jogador.
          Ligue o <b>Modo suporte</b> (barra lateral) quando precisar ajudar. O mestre é avisado ao ligar e acompanha o que você abre ou altera.
        </p>
        <p className="muted">
          Estado agora: <b>{adminMode ? 'modo suporte LIGADO' : 'modo suporte desligado'}</b>.
        </p>
      </div>

      <div className="panel">
        <h2 className="panel__title">Pessoas na mesa</h2>
        {error && <p className="alert">{error}</p>}
        {loading && <p className="muted">Carregando…</p>}
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Papel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.display_name} {p.id === profile?.id && <span className="badge">você</span>}
                </td>
                <td>
                  {p.role === 'admin' ? (
                    <span className="chip">{ROLE_LABEL.admin}</span>
                  ) : (
                    <select className="input input--sm" value={p.role} onChange={(e) => void setRole(p, e.target.value as 'player' | 'master')}>
                      <option value="player">Jogador</option>
                      <option value="master">Mestre</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 className="panel__title">Seu registro de atividade</h2>
        <ActivityFeed limit={50} />
      </div>
    </section>
  );
}
