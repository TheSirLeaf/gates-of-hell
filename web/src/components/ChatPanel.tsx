import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ForgeCard } from '../forge/ForgeCard';
import { useAuth } from '../lib/auth';
import { postChat, postRoll } from '../lib/roll';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/time';
import type { Character, Message } from '../lib/types';
import { useTable } from '../lib/useTable';
import { Icon } from './Icon';
import { RollCard } from './RollCard';

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

const HELP = [
  ['/r 3d20kh1+2 Luta', 'rola dados (sintaxe Rollem)'],
  ['/s d20', 'rolagem secreta: só você e o mestre veem'],
  ['[d20+5 ataque] [2d6+3 dano]', 'várias rolagens de uma vez'],
  ['Texto sem barra', 'vira conversa'],
] as const;

/** Mensagens do mesmo autor, em até 5 min, ficam agrupadas. */
function sameGroup(a: Message | undefined, b: Message): boolean {
  if (!a || a.author_id !== b.author_id) return false;
  if (dayLabel(a.created_at) !== dayLabel(b.created_at)) return false;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < 5 * 60_000;
}

export function ChatPanel({ characters, onClose }: { characters: Character[]; onClose?: () => void }) {
  const { profile, masterAccess } = useAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [charId, setCharId] = useState<string>('');
  const [secret, setSecret] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const mountedAt = useRef(Date.now());
  const lastCount = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Só as últimas 200 mensagens ficam na tela.
  const { rows, loading } = useTable<Message>('messages', {
    sort: (a, b) => a.id - b.id,
    latest: { column: 'id', count: 200 },
  });
  const messages = useMemo(() => rows.slice(-200), [rows]);

  const mine = useMemo(() => characters.filter((c) => c.owner_id === profile?.id), [characters, profile]);
  useEffect(() => {
    if (!charId && mine.length > 0) setCharId(mine[0].id);
  }, [mine, charId]);

  const scrollToEnd = (smooth = false) => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setUnseen(0);
  };

  // Mantém no fim quando o usuário já estava lá; senão mostra "N novas".
  useLayoutEffect(() => {
    const added = messages.length - lastCount.current;
    lastCount.current = messages.length;
    if (added <= 0) return;
    if (stickRef.current) scrollToEnd();
    else setUnseen((n) => n + added);
  }, [messages.length]);

  if (!profile) return null;

  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    if (stickRef.current) setUnseen(0);
  };

  async function send(text: string, forceRoll = false) {
    const t = text.trim();
    if (!t || !profile) return;
    setError(null);
    const ctx = { profile, characterId: charId || null };

    let err: string | null;
    const m = /^\/(r|roll|s|secret)\s+(.+)$/i.exec(t);
    if (m) {
      err = (await postRoll(m[2], { ...ctx, secret: secret || /^s/i.test(m[1]) })).error;
    } else if (forceRoll || t.startsWith('[') || /^\d+#?\s*\d*d\d+/i.test(t) || /^d\d+/i.test(t)) {
      err = (await postRoll(t, { ...ctx, secret })).error;
    } else if (t.startsWith('/')) {
      err = 'Comando desconhecido. Use /r para rolar ou /s para rolar em segredo.';
    } else {
      err = await postChat(t, profile, charId || null);
    }
    if (err) setError(err);
    else {
      setInput('');
      stickRef.current = true;
      requestAnimationFrame(() => scrollToEnd(true));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  async function clearChat() {
    if (!confirm('Apagar TODO o histórico do chat para todos?')) return;
    const { error: err } = await supabase.from('messages').delete().gte('id', 0);
    if (err) setError(err.message);
  }

  const rows2: ({ kind: 'day'; label: string; key: string } | { kind: 'msg'; m: Message; head: boolean })[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    if (!prev || dayLabel(prev.created_at) !== dayLabel(m.created_at)) {
      rows2.push({ kind: 'day', label: dayLabel(m.created_at), key: `d${m.id}` });
    }
    rows2.push({ kind: 'msg', m, head: !sameGroup(prev, m) });
  });

  return (
    <aside className="chat">
      <header className="chat__head">
        <div className="chat__titlebox">
          <span className="chat__dot" aria-hidden />
          <div>
            <h2 className="chat__title">Mesa</h2>
            <div className="chat__sub">chat e rolagens ao vivo</div>
          </div>
        </div>
        <div className="row gap-sm">
          <button type="button" className="icon-btn" onClick={() => setShowHelp((v) => !v)} aria-label="Ajuda" title="Como rolar" aria-pressed={showHelp}>
            ?
          </button>
          {masterAccess && (
            <button type="button" className="icon-btn" onClick={clearChat} title="Limpar histórico" aria-label="Limpar histórico">
              <Icon name="trash" size={16} />
            </button>
          )}
          {onClose && (
            <button type="button" className="icon-btn chat__close" onClick={onClose} aria-label="Fechar chat">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </header>

      {showHelp && (
        <dl className="chat__help">
          {HELP.map(([c, d]) => (
            <div key={c}>
              <dt>
                <code>{c}</code>
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="chat__feedwrap">
      <div className="chat__feed" ref={feedRef} onScroll={onScroll}>
        {loading && <p className="muted chat__empty">Carregando…</p>}
        {!loading && messages.length === 0 && (
          <div className="chat__empty">
            <Icon name="dice" size={34} />
            <p>Nada por aqui ainda.</p>
            <small>Toque em um dado abaixo para a primeira rolagem.</small>
          </div>
        )}
        {rows2.map((r) =>
          r.kind === 'day' ? (
            <div key={r.key} className="daysep">
              <span>{r.label}</span>
            </div>
          ) : (
            <MessageView key={r.m.id} m={r.m} head={r.head} own={r.m.author_id === profile.id} fresh={new Date(r.m.created_at).getTime() > mountedAt.current - 1500} />
          ),
        )}
      </div>
      {unseen > 0 && (
        <button className="chat__new" onClick={() => scrollToEnd(true)}>
          ↓ {unseen} {unseen === 1 ? 'nova' : 'novas'}
        </button>
      )}
      </div>

      <form className="composer" onSubmit={submit}>
        <div className="composer__dice" role="group" aria-label="Rolar um dado">
          {QUICK_DICE.map((n) => (
            <button key={n} type="button" className={`dieb dieb--${n}`} onClick={() => void send(`d${n}`, true)} title={`Rolar d${n}${secret ? ' (secreto)' : ''}`}>
              d{n}
            </button>
          ))}
        </div>

        <div className="composer__opts">
          {mine.length > 0 && (
            <label className="composer__char" title="Personagem que fala e rola">
              <Icon name="sheet" size={14} />
              <select value={charId} onChange={(e) => setCharId(e.target.value)} aria-label="Personagem">
                {mine.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="">(sem personagem)</option>
              </select>
            </label>
          )}
          <button type="button" className={`togglepill ${secret ? 'on' : ''}`} onClick={() => setSecret((v) => !v)} aria-pressed={secret} title="Rolagens secretas: só você e o mestre veem">
            <Icon name="lock" size={13} /> Secreta
          </button>
        </div>

        {error && <p className="text-danger chat__error" role="alert">{error}</p>}

        <div className="composer__row">
          <textarea
            ref={inputRef}
            className="composer__input"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(110, e.target.scrollHeight)}px`;
            }}
            onKeyDown={onKey}
            placeholder={secret ? 'Rolagem secreta… ex.: 3d20kh1+2' : 'Mensagem ou rolagem… ex.: /r 3d20kh1+2 Luta'}
            maxLength={600}
            aria-label="Mensagem ou rolagem"
          />
          <button className="composer__send" type="submit" aria-label="Enviar" disabled={!input.trim()}>
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
}

function MessageView({ m, head, own, fresh }: { m: Message; head: boolean; own: boolean; fresh: boolean }) {
  const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const wide = m.kind !== 'chat';
  return (
    <article className={`bubble ${own ? 'bubble--own' : ''} ${head ? 'bubble--head' : ''} ${m.secret ? 'bubble--secret' : ''} ${fresh ? 'bubble--fresh' : ''}`}>
      {!own && head && <span className="bubble__avatar">{m.author_name.charAt(0).toUpperCase()}</span>}
      {!own && !head && <span className="bubble__avatar bubble__avatar--ghost" />}
      <div className={`bubble__col ${wide ? 'bubble__col--wide' : ''}`}>
        {head && (
          <header className="bubble__meta">
            {!own && <b>{m.author_name}</b>}
            {m.secret && (
              <span className="badge badge--secret">
                <Icon name="lock" size={10} /> secreta
              </span>
            )}
            <time>{time}</time>
          </header>
        )}
        {m.kind === 'chat' ? (
          <p className="bubble__text">{m.body}</p>
        ) : m.kind === 'forge' && m.payload ? (
          <ForgeCard p={m.payload} />
        ) : (
          <div className="bubble__rolls">
            {(m.rolls ?? []).map((r, i) => (
              <RollCard key={i} r={r} fresh={fresh} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
