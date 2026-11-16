import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { SupportToggle } from '../components/SupportToggle';
import { adminCall, listAccounts, tempPassword, type AccountRow } from '../lib/admin';
import { useAuth } from '../lib/auth';
import { relativeTime } from '../lib/time';
import type { Profile } from '../lib/types';
import { useTable } from '../lib/useTable';
import { ActivityFeed } from './Activity';

type Filter = 'all' | 'player' | 'master' | 'admin' | 'banned';

const ROLE_LABEL = { player: 'Jogador', master: 'Mestre', admin: 'Admin' } as const;

export function AdminPanel() {
  const { profile, adminMode } = useAuth();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await listAccounts();
    setRows(res.rows);
    setError(res.error);
    setLoading(false);
  }, []);

  // recarrega sempre que alguém entra/muda de papel (Realtime em profiles)
  const live = useTable<Profile>('profiles', { columns: 'id, display_name, role, admin_mode' });
  const liveKey = live.rows.map((p) => `${p.id}${p.role}${p.display_name}`).join('|');
  useEffect(() => {
    void reload();
  }, [reload, liveKey]);

  const stats = useMemo(
    () => ({
      people: rows.length,
      masters: rows.filter((r) => r.role === 'master').length,
      banned: rows.filter((r) => r.banned).length,
      sheets: rows.reduce((n, r) => n + Number(r.characters), 0),
    }),
    [rows],
  );

  const shown = rows.filter((r) => {
    if (filter === 'banned' ? !r.banned : filter !== 'all' && r.role !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || r.display_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });
  const current = rows.find((r) => r.id === selected) ?? null;

  const filters: [Filter, string][] = [
    ['all', 'Todos'],
    ['player', 'Jogadores'],
    ['master', 'Mestres'],
    ['admin', 'Admins'],
    ['banned', 'Bloqueados'],
  ];

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Administração</div>
          <h1 className="page-title">Painel do admin</h1>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => void reload()}>
          Atualizar
        </button>
      </div>

      <div className="tiles">
        <Tile icon="users" label="Pessoas" value={stats.people} />
        <Tile icon="swords" label="Mestres" value={stats.masters} />
        <Tile icon="sheet" label="Fichas" value={stats.sheets} />
        <Tile icon="lock" label="Bloqueadas" value={stats.banned} tone={stats.banned ? 'warn' : undefined} />
      </div>

      <div className={`support-card ${adminMode ? 'support-card--on' : ''}`}>
        <span className="support-card__icon">
          <Icon name="support" size={24} />
        </span>
        <div className="support-card__text">
          <b>Modo suporte {adminMode ? 'ligado' : 'desligado'}</b>
          <p className="muted">
            {adminMode
              ? 'Você tem acesso de mestre. O mestre foi avisado e acompanha o que você abre ou altera.'
              : 'Você usa o site como jogador. Ligue só quando precisar ajudar — o mestre é avisado.'}
          </p>
        </div>
        <SupportToggle />
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Contas</h2>
          <span className="muted small">{shown.length} de {rows.length}</span>
        </div>
        <div className="toolbar">
          <input className="input" type="search" placeholder="Buscar por nome ou e-mail…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar contas" />
          <div className="chips">
            {filters.map(([k, label]) => (
              <button key={k} className={`chip chip--button ${filter === k ? 'chip--on' : ''}`} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="alert">
            {error.includes('admin_list_users')
              ? 'A migração 004_admin_accounts.sql ainda não foi rodada no Supabase.'
              : error}
          </p>
        )}
        {loading && <p className="muted">Carregando…</p>}
        <ul className="accts">
          {shown.map((r) => (
            <li key={r.id}>
              <button className={`acct ${r.banned ? 'acct--banned' : ''}`} onClick={() => setSelected(r.id)}>
                <span className={`avatar avatar--${r.role}`}>{r.display_name.charAt(0).toUpperCase()}</span>
                <span className="acct__main">
                  <b>
                    {r.display_name} {r.id === profile?.id && <span className="badge">você</span>}
                  </b>
                  <small className="muted">{r.email}</small>
                </span>
                <span className="acct__meta">
                  <span className={`pill pill--${r.role}`}>{ROLE_LABEL[r.role]}</span>
                  {r.banned && <span className="pill pill--banned">bloqueado</span>}
                  <small className="muted">
                    {r.characters} {Number(r.characters) === 1 ? 'ficha' : 'fichas'} · {relativeTime(r.last_sign_in_at)}
                  </small>
                </span>
                <Icon name="back" size={16} />
              </button>
            </li>
          ))}
          {!loading && shown.length === 0 && <li className="muted">Nenhuma conta encontrada.</li>}
        </ul>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Seu registro de atividade</h2>
        </div>
        <ActivityFeed limit={40} />
      </div>

      {current && (
        <AccountDrawer
          account={current}
          isSelf={current.id === profile?.id}
          onClose={() => setSelected(null)}
          onChanged={reload}
          onDeleted={() => {
            setSelected(null);
            void reload();
          }}
        />
      )}
    </section>
  );
}

function Tile({ icon, label, value, tone }: { icon: 'users' | 'swords' | 'sheet' | 'lock'; label: string; value: number; tone?: 'warn' }) {
  return (
    <div className={`tile ${tone ? `tile--${tone}` : ''}`}>
      <Icon name={icon} size={20} />
      <b>{value}</b>
      <small>{label}</small>
    </div>
  );
}

function AccountDrawer(props: {
  account: AccountRow;
  isSelf: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onDeleted: () => void;
}) {
  const { account: a, isSelf, onClose, onChanged, onDeleted } = props;
  const locked = a.role === 'admin'; // admins não são alterados por aqui
  const [name, setName] = useState(a.display_name);
  const [pass, setPass] = useState('');
  const [issued, setIssued] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: Parameters<typeof adminCall>[0], args: Record<string, unknown>, okText: string, after?: () => void) {
    setBusy(true);
    setMsg(null);
    const err = await adminCall(fn, { p_user: a.id, ...args });
    setBusy(false);
    if (err) {
      setMsg({ ok: false, text: err });
      return;
    }
    setMsg({ ok: true, text: okText });
    after?.();
    await onChanged();
  }

  const generate = () => setPass(tempPassword());

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={`Conta de ${a.display_name}`} onClick={onClose}>
      <aside className="drawer__box" onClick={(e) => e.stopPropagation()}>
        <header className="drawer__head">
          <span className={`avatar avatar--lg avatar--${a.role}`}>{a.display_name.charAt(0).toUpperCase()}</span>
          <div>
            <h2>{a.display_name}</h2>
            <div className="muted small">{a.email}</div>
            <div className="muted small">
              Criada em {new Date(a.created_at).toLocaleDateString('pt-BR')} · último acesso {relativeTime(a.last_sign_in_at)}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={16} />
          </button>
        </header>

        {msg && (
          <p className={msg.ok ? 'callout' : 'alert'} role="status">
            {msg.text}
          </p>
        )}
        {locked && <p className="callout callout--soft">Contas de admin não podem ser alteradas por este painel.</p>}

        <section className="drawer__sec">
          <h3>Papel</h3>
          <div className="seg">
            {(['player', 'master'] as const).map((r) => (
              <button
                key={r}
                className={a.role === r ? 'on' : ''}
                disabled={locked || busy}
                onClick={() => {
                  if (a.role === r) return;
                  if (r === 'master' && !confirm(`Tornar ${a.display_name} mestre? Ele passa a ver todas as fichas.`)) return;
                  void run('admin_set_role', { p_role: r }, `${a.display_name} agora é ${ROLE_LABEL[r].toLowerCase()}.`);
                }}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </section>

        <section className="drawer__sec">
          <h3>Nome de exibição</h3>
          <div className="row gap-sm">
            <input className="input" value={name} maxLength={60} disabled={locked} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn--sm" disabled={locked || busy || !name.trim() || name.trim() === a.display_name} onClick={() => void run('admin_rename_user', { p_name: name }, 'Nome atualizado.')}>
              Salvar
            </button>
          </div>
        </section>

        <section className="drawer__sec">
          <h3>Senha temporária</h3>
          <p className="hint">Para quem esqueceu a senha. Defina uma, envie à pessoa e peça para ela escolher outra depois.</p>
          <div className="row gap-sm">
            <input className="input mono" value={pass} placeholder="mínimo 6 caracteres" disabled={locked} onChange={(e) => setPass(e.target.value)} />
            <button className="btn btn--ghost btn--sm" disabled={locked} onClick={generate}>
              Gerar
            </button>
            <button
              className="btn btn--sm"
              disabled={locked || busy || pass.length < 6}
              onClick={() => void run('admin_set_password', { p_password: pass }, 'Senha redefinida. Envie à pessoa.', () => setIssued(pass))}
            >
              Definir
            </button>
          </div>
          {issued && (
            <div className="issued">
              <span>
                Nova senha de <b>{a.display_name}</b>: <code>{issued}</code>
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => void navigator.clipboard?.writeText(issued)}>
                Copiar
              </button>
            </div>
          )}
        </section>

        <section className="drawer__sec">
          <h3>Acesso</h3>
          <p className="hint">{a.banned ? 'Esta conta está bloqueada: não consegue entrar.' : 'Bloquear impede o login e derruba sessões abertas, sem apagar nada.'}</p>
          <button
            className={`btn btn--sm ${a.banned ? '' : 'btn--danger'}`}
            disabled={locked || busy || isSelf}
            onClick={() => void run('admin_set_banned', { p_banned: !a.banned }, a.banned ? 'Conta desbloqueada.' : 'Conta bloqueada.')}
          >
            {a.banned ? 'Desbloquear conta' : 'Bloquear conta'}
          </button>
        </section>

        <section className="drawer__sec drawer__sec--danger">
          <h3>Zona de perigo</h3>
          <p className="hint">
            Excluir apaga a conta e <b>tudo</b> dela: {a.characters} {Number(a.characters) === 1 ? 'ficha' : 'fichas'}, inventário, mensagens e forjas. Não dá para desfazer.
          </p>
          <div className="row gap-sm">
            <input className="input" value={confirmName} placeholder={`Digite “${a.display_name}” para confirmar`} disabled={locked || isSelf} onChange={(e) => setConfirmName(e.target.value)} />
            <button
              className="btn btn--danger btn--sm"
              disabled={locked || busy || isSelf || confirmName.trim() !== a.display_name}
              onClick={() => void run('admin_delete_user', {}, 'Conta excluída.', onDeleted)}
            >
              Excluir
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
