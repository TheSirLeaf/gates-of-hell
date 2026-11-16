import { describeActivity } from '../lib/activity';
import { useAuth } from '../lib/auth';
import type { AdminActivity } from '../lib/types';
import { useTable } from '../lib/useTable';

export function ActivityFeed({ limit = 100 }: { limit?: number }) {
  const { rows, loading, error } = useTable<AdminActivity>('admin_activity', {
    sort: (a, b) => b.id - a.id,
    latest: { column: 'id', count: limit },
  });
  return (
    <div>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}
      {!loading && rows.length === 0 && <p className="muted">Nenhuma atividade de admin registrada.</p>}
      <ul className="timeline-list">
        {rows.map((a) => (
          <li key={a.id} className={`act act--${a.action}`}>
            <time>
              {new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </time>
            <span>
              <b>{a.admin_name}</b> {describeActivity(a)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Activity() {
  const { isMaster } = useAuth();
  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">{isMaster ? 'Transparência' : 'Seu registro'}</div>
          <h1 className="page-title">Atividade do admin</h1>
        </div>
      </div>
      <p className="muted">
        {isMaster
          ? 'Sempre que o admin liga o modo suporte, você é avisado. Aqui fica o registro do que ele abriu ou alterou.'
          : 'Este é o registro que o mestre vê sobre o seu modo suporte.'}
      </p>
      <div className="panel">
        <ActivityFeed />
      </div>
    </section>
  );
}
