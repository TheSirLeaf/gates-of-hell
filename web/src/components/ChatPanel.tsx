import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ForgeCard } from '../forge/ForgeCard';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';
import { formatNumber, type RollResult } from '../lib/dice';
import { postChat, postRoll } from '../lib/roll';
import { supabase } from '../lib/supabase';
import type { Character, Message } from '../lib/types';
import { useTable } from '../lib/useTable';

const HELP = [
  '/r 2d6+3 dano — rola dados (sintaxe Rollem)',
  '/s d20 — rolagem secreta (só você e o mestre veem)',
  '[d20+5 ataque] [2d6+3 dano] — várias rolagens',
  'Sem barra, a mensagem vira conversa.',
];

export function ChatPanel({ characters, onClose }: { characters: Character[]; onClose?: () => void }) {
  const { profile, masterAccess } = useAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [charId, setCharId] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (!profile) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !profile) return;
    setError(null);

    let err: string | null;
    const ctx = { profile, characterId: charId || null };
    const rollMatch = /^\/(r|roll|s|secret)\s+(.+)$/i.exec(text);
    if (rollMatch) {
      err = (await postRoll(rollMatch[2], { ...ctx, secret: /^s/i.test(rollMatch[1]) })).error;
    } else if (text.startsWith('[') || /^\d+#?\s*\d*d\d+/i.test(text) || /^d\d+/i.test(text)) {
      err = (await postRoll(text, ctx)).error;
    } else if (text.startsWith('/')) {
      err = 'Comando desconhecido. Use /r para rolar ou /s para rolar em segredo.';
    } else {
      err = await postChat(text, profile, charId || null);
    }

    if (err) setError(err);
    else setInput('');
  }

  async function clearChat() {
    if (!confirm('Apagar TODO o histórico do chat para todos?')) return;
    const { error: err } = await supabase.from('messages').delete().gte('id', 0);
    if (err) setError(err.message);
  }

  return (
    <aside className="chat">
      <header className="chat__head">
        <div>
          <div className="eyebrow">Mesa</div>
          <h2 className="chat__title">Chat &amp; rolagens</h2>
        </div>
        <div className="row gap-sm">
          <button type="button" className="icon-btn" onClick={() => setShowHelp((v) => !v)} aria-label="Ajuda" title="Como rolar">
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
        <ul className="chat__help">
          {HELP.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}

      <div className="chat__feed">
        {loading && <p className="muted">Carregando…</p>}
        {!loading && messages.length === 0 && <p className="muted">Nada por aqui ainda. Role um dado!</p>}
        {messages.map((m) => (
          <MessageView key={m.id} m={m} own={m.author_id === profile.id} />
        ))}
        <div ref={endRef} />
      </div>

      <form className="chat__form" onSubmit={submit}>
        {mine.length > 0 && (
          <select className="input input--sm" value={charId} onChange={(e) => setCharId(e.target.value)} aria-label="Personagem">
            {mine.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="">(sem personagem)</option>
          </select>
        )}
        {error && <p className="text-danger chat__error">{error}</p>}
        <div className="row gap-sm">
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="/r 3d20kh1+2 Luta  ·  ou escreva uma mensagem"
            maxLength={600}
            aria-label="Mensagem ou rolagem"
          />
          <button className="btn" type="submit">
            Enviar
          </button>
        </div>
      </form>
    </aside>
  );
}

function MessageView({ m, own }: { m: Message; own: boolean }) {
  const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <article className={`msg ${own ? 'msg--own' : ''} ${m.secret ? 'msg--secret' : ''}`}>
      <header className="msg__head">
        <strong>{m.author_name}</strong>
        {m.secret && <span className="badge">secreta</span>}
        <time>{time}</time>
      </header>
      {m.kind === 'chat' ? (
        <p className="msg__body">{m.body}</p>
      ) : m.kind === 'forge' && m.payload ? (
        <ForgeCard p={m.payload} />
      ) : (
        <div className="msg__rolls">
          {(m.rolls ?? []).map((r, i) => (
            <RollView key={i} r={r} />
          ))}
        </div>
      )}
    </article>
  );
}

export function RollView({ r }: { r: RollResult }) {
  return (
    <div className={`roll ${r.success === true ? 'roll--ok' : r.success === false ? 'roll--fail' : ''}`}>
      <div className="roll__top">
        <span className="roll__label">{r.label || 'Rolagem'}</span>
        <span className="roll__total">{formatNumber(r.total)}</span>
      </div>
      <div className="roll__expr">
        {r.expression}
        {r.success !== null && <strong> — {r.success ? 'sucesso' : 'falha'}</strong>}
      </div>
      {r.dice.length > 0 && (
        <div className="roll__dice">
          {r.dice.map((d, i) => (
            <span key={i} className={`die ${d.dropped ? 'die--dropped' : ''} ${d.crit ? 'die--crit' : ''}`}>
              {d.fate ? (d.value > 0 ? '+' : d.value < 0 ? '−' : '0') : formatNumber(d.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
