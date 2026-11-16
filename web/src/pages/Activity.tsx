import { Icon, type IconName } from '../components/Icon';
import { describeActivity } from '../lib/activity';
import { useAuth } from '../lib/auth';
import { dayLabel } from '../lib/time';
import type { AdminActivity } from '../lib/types';
import { useTable } from '../lib/useTable';

const ICON: Record<AdminActivity['action'], IconName> = {
  support_on: 'support',
  support_off: 'support',
  view: 'eye',
  create: 'plus',
  edit: 'sheet',
  delete: 'trash',
  role: 'users',
  account: 'lock',
};

export function ActivityFeed({ limit = 100 }: { limit?: number }) {
  const { rows, loading, error } = useTable<AdminActivity>('admin_activity', {
    sort: (a, b) => b.id - a.id,
    latest: { column: 'id', count: limit },
  });

  const groups: { day: string; items: AdminActivity[] }[] = [];
  for (const a of rows) {
    const day = dayLabel(a.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <div>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}
      {!loading && rows.length === 0 && <p className="muted">Nenhuma atividade de admin registrada.</p>}
      {groups.map((g) => (
        <div key={g.day} className="actgroup">
          <div className="actgroup__day">{g.day}</div>
          <ul className="timeline-list">
            {g.items.map((a) => (
              <li key={a.id} className={`act act--${a.action}`}>
                <span className="act__icon">
                  <Icon name={ICON[a.action] ?? 'activity'} size={14} />
                </span>
                <span className="act__text">
                  <b>{a.admin_name}</b> {describeActivity(a)}
                </span>
                <time>{new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
              </li>
            ))}
          </ul>
        </div>
      ))}
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
          ? 'Sempre que o admin liga o modo suporte, você é avisado. Aqui fica o registro do que ele abriu, alterou ou gerenciou.'
          : 'Este é o registro que o mestre vê sobre o seu modo suporte e a gestão de contas.'}
      </p>
      <div className="panel">
        <ActivityFeed />
      </div>
    </section>
  );
}
