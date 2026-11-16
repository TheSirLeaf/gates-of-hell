import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { describeActivity } from '../lib/activity';
import { useAuth } from '../lib/auth';
import type { AdminActivity, Profile } from '../lib/types';
import { useTable } from '../lib/useTable';
import { Icon } from './Icon';

/**
 * Para o MESTRE: avisa quando um admin está em modo suporte e mostra, em tempo real, o que ele abre ou altera.
 * Tom proposital: tranquilo — o admin está ali para ajudar.
 */
export function AdminWatch() {
  const { isMaster } = useAuth();
  const profiles = useTable<Profile>('profiles', { columns: 'id, display_name, role, admin_mode', enabled: isMaster });
  const activity = useTable<AdminActivity>('admin_activity', {
    enabled: isMaster,
    sort: (a, b) => a.id - b.id,
    latest: { column: 'id', count: 30 },
  });
  const [toasts, setToasts] = useState<AdminActivity[]>([]);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (!isMaster || activity.loading) return;
    const max = activity.rows.reduce((m, r) => Math.max(m, r.id), 0);
    if (seen.current === null) {
      seen.current = max; // histórico antigo não vira toast
      return;
    }
    const fresh = activity.rows.filter((r) => r.id > (seen.current ?? 0));
    if (fresh.length === 0) return;
    seen.current = max;
    setToasts((t) => [...t, ...fresh].slice(-4));
    const ids = fresh.map((f) => f.id);
    const timer = window.setTimeout(() => setToasts((t) => t.filter((x) => !ids.includes(x.id))), 7000);
    return () => window.clearTimeout(timer);
  }, [activity.rows, activity.loading, isMaster]);

  if (!isMaster) return null;
  const active = profiles.rows.filter((p) => p.role === 'admin' && p.admin_mode);

  return (
    <>
      {active.length > 0 && (
        <div className="watch" role="status">
          <Icon name="support" />
          <div>
            <b>{active.map((a) => a.display_name).join(', ')}</b> (admin) está em <b>modo suporte</b> para ajudar você.
            <span className="muted"> Ele pode ver suas fichas, o bestiário e as rolagens secretas — tudo o que abrir ou alterar aparece em </span>
            <Link to="/atividade">Atividade</Link>.
          </div>
        </div>
      )}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <Icon name="bell" />
            <span>
              <b>{t.admin_name}</b> {describeActivity(t)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
