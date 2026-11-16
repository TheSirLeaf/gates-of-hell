import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useGame } from '../lib/game';
import type { ForgeOutcome, ForgeResultRow } from '../lib/types';
import { useTable } from '../lib/useTable';
import { Icon } from '../components/Icon';
import { Dial } from './Dial';
import { ForgeCard, rarityKey, Timeline } from './ForgeCard';
import { ParticleField, playCue, playFinish, playStrike, vibrate } from './fx';
import {
  angularDistance,
  classify,
  clampComponents,
  itemName,
  MAX_COMPONENTS,
  METALS,
  outcomeTone,
  RARITIES,
  SMITH_LEVELS,
  summarize,
  testParams,
  totalTests,
  WEAPON_TYPES,
  type ForgeConfig,
  type ForgeSummary,
} from './logic';
import { saveToInventory, submitForge } from './submit';

type Phase = 'setup' | 'play' | 'done';
type Sub = 'waiting' | 'tell' | 'live' | 'resolving';
type Tone = 'perfect' | 'better' | 'good' | 'miss' | 'crit';

const POPUP: Record<ForgeOutcome, string> = {
  Perfeito: 'PERFEITO!',
  Melhor: 'MELHOR!',
  Bom: 'BOM',
  Falha: 'FALHOU',
  'Falha crítica': 'FALHA CRÍTICA!',
};

const FLASH: Record<Tone, string> = {
  perfect: 'radial-gradient(circle at 50% 55%, rgba(255,236,170,.9), rgba(255,170,60,.35) 45%, transparent 70%)',
  better: 'radial-gradient(circle at 50% 55%, rgba(255,205,140,.7), rgba(255,140,50,.25) 45%, transparent 70%)',
  good: 'radial-gradient(circle at 50% 55%, rgba(255,170,100,.45), transparent 65%)',
  miss: 'radial-gradient(circle at 50% 55%, rgba(120,110,130,.4), transparent 65%)',
  crit: 'radial-gradient(circle at 50% 55%, rgba(255,60,50,.7), rgba(120,0,0,.35) 50%, transparent 75%)',
};

const SHAKE: Record<Tone, number> = { perfect: 11, better: 6, good: 4, miss: 3, crit: 13 };
const HEAT: Record<Tone, number> = { perfect: 0.12, better: 0.08, good: 0.04, miss: -0.04, crit: -0.2 };

const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function Forge() {
  const [tab, setTab] = useState<'forge' | 'history'>('forge');
  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Ofício &amp; criação</div>
          <h1 className="page-title">A Forja</h1>
        </div>
        <div className="seg">
          <button className={tab === 'forge' ? 'on' : ''} onClick={() => setTab('forge')}>
            Forjar
          </button>
          <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
            Histórico
          </button>
        </div>
      </div>
      {tab === 'forge' ? <Workshop /> : <History />}
    </section>
  );
}

function Workshop() {
  const { profile } = useAuth();
  const { characters } = useGame();
  const mine = useMemo(() => characters.filter((c) => c.owner_id === profile?.id), [characters, profile]);

  // ---- configuração ----
  const [weapon, setWeapon] = useState<string>(WEAPON_TYPES[1]);
  const [rarityKeyV, setRarityKey] = useState('comum');
  const [metalKey, setMetalKey] = useState('ferro');
  const [components, setComponents] = useState(0);
  const [smithLevel, setSmithLevel] = useState(1);
  const [charId, setCharId] = useState('');
  useEffect(() => {
    if (!charId && mine.length > 0) setCharId(mine[0].id);
  }, [mine, charId]);

  const config: ForgeConfig = useMemo(
    () => ({
      weapon,
      rarity: RARITIES.find((r) => r.key === rarityKeyV)!,
      metal: METALS.find((m) => m.key === metalKey)!,
      components: clampComponents(components),
      smithLevel,
    }),
    [weapon, rarityKeyV, metalKey, components, smithLevel],
  );
  const total = totalTests(config);
  const character = mine.find((c) => c.id === charId) ?? null;

  // ---- estado de jogo ----
  const [phase, setPhase] = useState<Phase>('setup');
  const [sub, setSub] = useState<Sub>('waiting');
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ForgeOutcome[]>([]);
  const [center, setCenter] = useState(0);
  const [zone, setZone] = useState(20);
  const [hitAngle, setHitAngle] = useState<number | null>(null);
  const [pop, setPop] = useState<{ text: string; tone: Tone; key: number } | null>(null);
  const [lastTone, setLastTone] = useState<string>('none');
  const [heat, setHeat] = useState(0.15);
  const [streak, setStreak] = useState(0);
  const [swing, setSwing] = useState(0);
  const [muted, setMuted] = useState(() => localStorage.getItem('forge-muted') === '1');
  const [summary, setSummary] = useState<ForgeSummary | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [inventoryMsg, setInventoryMsg] = useState<string | null>(null);

  // ---- refs do motor ----
  const eng = useRef({
    angle: 0,
    speed: 100,
    last: 0,
    raf: 0,
    running: false,
    sub: 'waiting' as Sub,
    index: 0,
    results: [] as ForgeOutcome[],
    center: 0,
    zone: 20,
    timers: [] as number[],
    total: 0,
    streak: 0,
    heat: 0.15,
    config,
    muted,
  });
  eng.current.config = config;
  eng.current.muted = muted;

  const stageRef = useRef<HTMLDivElement>(null);
  const ingotRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = new ParticleField(canvas);
    fieldRef.current = field;
    const onResize = () => field.resize();
    field.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      field.destroy();
      fieldRef.current = null;
    };
  }, []);

  const clearTimers = () => {
    eng.current.timers.forEach((t) => window.clearTimeout(t));
    eng.current.timers = [];
  };
  const later = (fn: () => void, ms: number) => {
    eng.current.timers.push(window.setTimeout(fn, ms));
  };
  const stopLoop = () => {
    eng.current.running = false;
    if (eng.current.raf) cancelAnimationFrame(eng.current.raf);
    eng.current.raf = 0;
  };
  useEffect(
    () => () => {
      clearTimers();
      stopLoop();
    },
    [],
  );

  const paint = () => {
    const a = eng.current.angle;
    if (needleRef.current) needleRef.current.style.transform = `rotate(${a}deg)`;
    if (trailRef.current) trailRef.current.style.transform = `rotate(${a}deg)`;
  };

  const tick = (ts: number) => {
    const e = eng.current;
    if (!e.running) return;
    if (!e.last) e.last = ts;
    const dt = Math.min(40, ts - e.last);
    e.last = ts;
    e.angle = (e.angle + (e.speed * dt) / 1000) % 360;
    paint();
    e.raf = requestAnimationFrame(tick);
  };

  const setSubBoth = (s: Sub) => {
    eng.current.sub = s;
    setSub(s);
  };

  const beginTest = (i: number) => {
    const e = eng.current;
    if (i >= e.total) {
      finish();
      return;
    }
    e.index = i;
    setIndex(i);
    const p = testParams(e.total, i / e.total);
    e.speed = p.speed;
    e.zone = p.zone;
    setZone(p.zone);
    const c = Math.random() * 360;
    e.center = c;
    setCenter(c);
    // o ponteiro nasce longe da zona, para o jogador ter tempo de ler a roda
    e.angle = (c + 70 + Math.random() * 220) % 360;
    setHitAngle(null);
    setLastTone('none');
    paint();
    setSubBoth('waiting');

    const delay = p.minDelay + Math.random() * (p.maxDelay - p.minDelay);
    later(() => {
      if (eng.current.sub === 'waiting') setSubBoth('tell'); // o metal "acende" um instante antes
    }, Math.max(0, delay - 260));
    later(() => {
      if (eng.current.sub !== 'waiting' && eng.current.sub !== 'tell') return;
      setSubBoth('live');
      playCue(eng.current.muted);
      e.last = 0;
      e.running = true;
      e.raf = requestAnimationFrame(tick);
    }, delay);
  };

  const impact = (outcome: ForgeOutcome) => {
    const t = outcomeTone(outcome) as Tone;
    const e = eng.current;
    playStrike(t, e.muted);
    vibrate(t === 'perfect' ? [16, 28, 36] : t === 'crit' ? [70, 40, 90] : t === 'better' ? 24 : t === 'good' ? 14 : 10);
    setSwing((s) => s + 1);
    setPop({ text: POPUP[outcome], tone: t, key: Date.now() });
    setLastTone(t);

    const stage = stageRef.current;
    const ingot = ingotRef.current;
    if (stage && ingot && fieldRef.current) {
      const sr = stage.getBoundingClientRect();
      const ir = ingot.getBoundingClientRect();
      fieldRef.current.burst(ir.left - sr.left + ir.width / 2, ir.top - sr.top + ir.height / 2, t, reducedMotion());
    }
    if (!reducedMotion()) {
      const amp = SHAKE[t];
      stage?.animate(
        [
          { transform: 'translate(0,0)' },
          { transform: `translate(${-amp}px, ${amp * 0.4}px)` },
          { transform: `translate(${amp * 0.8}px, ${-amp * 0.5}px)` },
          { transform: `translate(${-amp * 0.5}px, ${amp * 0.3}px)` },
          { transform: `translate(${amp * 0.3}px, 0)` },
          { transform: 'translate(0,0)' },
        ],
        { duration: t === 'perfect' || t === 'crit' ? 420 : 280, easing: 'ease-out' },
      );
    }
    const flash = flashRef.current;
    if (flash) {
      flash.style.background = FLASH[t];
      flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t === 'perfect' ? 650 : 420, easing: 'ease-out' });
    }

    // aquecimento e sequência (combo)
    e.heat = Math.max(0.05, Math.min(1, e.heat + HEAT[t]));
    setHeat(e.heat);
    e.streak = t === 'perfect' ? e.streak + 1 : 0;
    setStreak(e.streak);
  };

  const resolve = (outcome: ForgeOutcome, angle: number | null) => {
    const e = eng.current;
    stopLoop();
    clearTimers();
    setSubBoth('resolving');
    setHitAngle(angle);
    e.results = [...e.results, outcome];
    setResults(e.results);
    impact(outcome);
    const t = outcomeTone(outcome);
    // pequena pausa (hit-stop) mais longa nos golpes que importam
    later(() => beginTest(e.index + 1), t === 'perfect' || t === 'crit' ? 1050 : 800);
  };

  const strike = () => {
    const e = eng.current;
    if (phase !== 'play') return;
    if (e.sub === 'resolving') return;
    if (e.sub === 'live') {
      const d = angularDistance(e.angle, e.center);
      resolve(classify(d, e.zone), e.angle);
    } else {
      resolve('Falha crítica', null); // golpe antecipado
    }
  };
  const strikeRef = useRef(strike);
  strikeRef.current = strike;

  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.code === 'Space' || ev.code === 'Enter') && !ev.repeat) {
        ev.preventDefault();
        strikeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const start = () => {
    clearTimers();
    stopLoop();
    const e = eng.current;
    e.total = total;
    e.results = [];
    e.streak = 0;
    e.heat = 0.15;
    setResults([]);
    setStreak(0);
    setHeat(0.15);
    setSummary(null);
    setSendState('idle');
    setSendError(null);
    setInventoryMsg(null);
    setPhase('play');
    (document.activeElement as HTMLElement | null)?.blur?.();
    beginTest(0);
  };

  const abort = () => {
    clearTimers();
    stopLoop();
    setPhase('setup');
  };

  const send = useCallback(
    async (s: ForgeSummary) => {
      if (!profile) return;
      setSendState('sending');
      const err = await submitForge(profile, character, eng.current.config, s);
      setSendError(err);
      setSendState(err ? 'error' : 'sent');
    },
    [profile, character],
  );

  const finish = () => {
    stopLoop();
    clearTimers();
    const e = eng.current;
    const s = summarize(e.config, e.results);
    setSummary(s);
    setPhase('done');
    playFinish(s.perfects >= s.tests / 2 && s.criticals === 0, e.muted);
    void send(s);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    localStorage.setItem('forge-muted', m ? '1' : '0');
  };

  const rk = config.rarity.key;
  const live = sub === 'live';
  const heatStyle = { ['--heat' as string]: heat } as React.CSSProperties;

  return (
    <div className={`forge forge--${phase}`}>
      {/* ---------- Preparação ---------- */}
      <div className={`panel forge__setup ${phase === 'play' ? 'is-locked' : ''}`}>
        <h2 className="panel__title">Preparar fabricação</h2>
        <p className="muted">Monte a receita antes de acender a fornalha.</p>

        <div className="fgrid">
          <label className="field">
            <span>Tipo de arma</span>
            <select className="input" value={weapon} onChange={(e) => setWeapon(e.target.value)}>
              {WEAPON_TYPES.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Raridade</span>
            <select className="input" value={rarityKeyV} onChange={(e) => setRarityKey(e.target.value)}>
              {RARITIES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name} · {r.tests}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Metal</span>
            <select className="input" value={metalKey} onChange={(e) => setMetalKey(e.target.value)}>
              {METALS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name} · dificuldade +{m.difficulty}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Perícia Ferreiro</span>
            <select className="input" value={smithLevel} onChange={(e) => setSmithLevel(+e.target.value)}>
              {SMITH_LEVELS.map((l) => (
                <option key={l} value={l}>
                  Nível {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Componentes (+1 dificuldade cada)</span>
            <div className="stepper">
              <button type="button" onClick={() => setComponents((c) => clampComponents(c - 1))} aria-label="Menos">
                −
              </button>
              <output>{components}</output>
              <button type="button" onClick={() => setComponents((c) => clampComponents(c + 1))} aria-label="Mais">
                +
              </button>
              <small className="muted">máx. {MAX_COMPONENTS}</small>
            </div>
          </label>
          <label className="field">
            <span>Forjar para</span>
            <select className="input" value={charId} onChange={(e) => setCharId(e.target.value)}>
              {mine.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="">(sem personagem)</option>
            </select>
          </label>
        </div>

        <div className="calc">
          <div>
            <small>Raridade</small>
            <b>{config.rarity.tests}</b>
          </div>
          <div>
            <small>Metal</small>
            <b>+{config.metal.difficulty}</b>
          </div>
          <div>
            <small>Componentes</small>
            <b>+{config.components}</b>
          </div>
          <div className="calc__total">
            <small>Golpes</small>
            <b>{total}</b>
          </div>
        </div>
        {config.rarity.note && <p className="callout">Divina: {config.rarity.note}.</p>}

        <div className="row gap">
          {phase === 'play' ? (
            <button className="btn btn--ghost" onClick={abort}>
              Abandonar
            </button>
          ) : (
            <button className="btn btn--forge" onClick={start}>
              <Icon name="flame" /> Acender a forja
            </button>
          )}
        </div>
        <p className="callout callout--soft">
          Regras provisórias: limites de raridade/metal por nível de Ferreiro e o tamanho das áreas ainda serão definidos pelo mestre.
          O resultado de cada fabricação é enviado automaticamente ao mestre.
        </p>
      </div>

      {/* ---------- Palco ---------- */}
      <div className={`panel stage rarity-${rk} tone-${lastTone}`} ref={stageRef}>
        <canvas className="stage__fx" ref={canvasRef} />
        <div className="stage__flash" ref={flashRef} />

        <div className="stage__hud">
          <div>
            <div className="eyebrow">{phase === 'play' ? `Golpe ${Math.min(index + 1, total)} de ${total}` : 'Forja'}</div>
            <div className="stage__title">{itemName({ weapon, rarity: config.rarity.name, metal: config.metal.name })}</div>
          </div>
          <div className="row gap-sm">
            {phase === 'play' && streak >= 2 && (
              <span className="combo" key={streak}>
                ×{streak} perfeitos
              </span>
            )}
            <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'} title={muted ? 'Ativar som' : 'Silenciar'}>
              <Icon name={muted ? 'mute' : 'sound'} />
            </button>
          </div>
        </div>

        {(phase === 'play' || phase === 'done') && <Timeline items={results} current={phase === 'play' ? index : undefined} />}

        <div className="scene" style={heatStyle}>
          <div className="scene__glow" />
          <svg viewBox="0 0 320 150" className="scene__svg" aria-hidden>
            <defs>
              <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7d7a86" />
                <stop offset="1" stopColor="#25232c" />
              </linearGradient>
              <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#5a3b25" />
                <stop offset="1" stopColor="#3a2517" />
              </linearGradient>
            </defs>
            <path d="M88 112 H232 L248 94 H72 Z M110 112 L122 138 H198 L210 112 Z" fill="url(#steel)" stroke="#a8a2b2" strokeWidth="1.5" />
            <path d="M58 94 Q40 92 36 78 L72 82 Z" fill="url(#steel)" />
            <g key={swing} className={swing > 0 ? 'hammer hammer--swing' : 'hammer'}>
              <rect x="206" y="12" width="9" height="78" rx="3" fill="url(#wood)" transform="rotate(28 210 52)" />
              <rect x="174" y="10" width="58" height="28" rx="5" fill="url(#steel)" stroke="#bdb7c8" strokeWidth="1.5" transform="rotate(28 210 52)" />
            </g>
          </svg>
          <div className={`ingot ${sub === 'tell' ? 'ingot--tell' : ''}`} ref={ingotRef}>
            <i />
          </div>
        </div>

        <div className="stage__body">
          {phase === 'setup' && (
            <p className="stage__hint">
              Escolha os moldes e acenda a forja. Quando o metal brilhar, a roda aparece: golpeie quando o ponteiro cruzar a área colorida.
              Golpear cedo demais é <b>falha crítica</b>.
            </p>
          )}

          {phase === 'play' && (
            <>
              <div className="dial-wrap">
                <Dial needleRef={needleRef} trailRef={trailRef} center={center} zone={zone} live={live} hitAngle={hitAngle} tone={lastTone} />
                {pop && (
                  <div key={pop.key} className={`pop pop--${pop.tone}`}>
                    {pop.text}
                  </div>
                )}
                {!live && sub !== 'resolving' && <div className="dial-wait">{sub === 'tell' ? 'Agora…' : 'Aguarde o metal brilhar'}</div>}
              </div>
              <div className="legend">
                <span><i className="d-good" />Bom</span>
                <span><i className="d-better" />Melhor</span>
                <span><i className="d-perfect" />Perfeito</span>
              </div>
              <button className="btn btn--strike" tabIndex={-1} onPointerDown={(e) => { e.preventDefault(); strike(); }}>
                GOLPEAR <small>(espaço)</small>
              </button>
            </>
          )}

          {phase === 'done' && summary && (
            <Result
              s={summary}
              sendState={sendState}
              sendError={sendError}
              retry={() => void send(summary)}
              character={character}
              inventoryMsg={inventoryMsg}
              onInventory={async () => {
                if (!character) return;
                const err = await saveToInventory(character, summary);
                setInventoryMsg(err ? `Erro: ${err}` : `Guardado no inventário de ${character.name}.`);
              }}
              onAgain={start}
              onSetup={() => setPhase('setup')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Result(props: {
  s: ForgeSummary;
  sendState: 'idle' | 'sending' | 'sent' | 'error';
  sendError: string | null;
  retry: () => void;
  character: { name: string } | null;
  inventoryMsg: string | null;
  onInventory: () => void;
  onAgain: () => void;
  onSetup: () => void;
}) {
  const { s, sendState, sendError, retry, character, inventoryMsg, onInventory, onAgain, onSetup } = props;
  const rk = rarityKey(s.rarity);
  const failedDivine = s.divineOk === false;
  return (
    <div className={`result rarity-${rk}`}>
      <div className="result__banner">
        <div className="eyebrow">{failedDivine ? 'Forja divina falhou' : 'Peça concluída'}</div>
        <div className="result__name">{itemName(s).replace(/^./, (c) => c.toUpperCase())}</div>
        {s.divineOk && <div className="result__divine">✦ Todos os golpes perfeitos ✦</div>}
      </div>
      <div className="result__grid">
        <Stat label="Perfeitos" value={s.perfects} tone="perfect" />
        <Stat label="Melhores" value={s.betters} tone="better" />
        <Stat label="Falhas críticas" value={s.criticals} tone="crit" />
        <Stat label="Bônus de dano" value={`+${s.damageBonus}`} big />
        <Stat label="Durabilidade" value={s.durability} big />
      </div>
      <div className={`sent sent--${sendState}`}>
        {sendState === 'sending' && 'Enviando o resultado ao mestre…'}
        {sendState === 'sent' && '✓ Resultado enviado ao mestre'}
        {sendState === 'error' && (
          <>
            {sendError} <button className="link" onClick={retry}>Tentar de novo</button>
          </>
        )}
      </div>
      <div className="row gap wrap">
        <button className="btn btn--forge" onClick={onAgain}>
          Nova fabricação
        </button>
        <button className="btn btn--ghost" onClick={onSetup}>
          Mudar moldes
        </button>
        {character && (
          <button className="btn btn--ghost" onClick={onInventory} disabled={inventoryMsg?.startsWith('Guardado')}>
            Guardar no inventário
          </button>
        )}
      </div>
      {inventoryMsg && <p className="muted">{inventoryMsg}</p>}
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: number | string; tone?: string; big?: boolean }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''} ${big ? 'stat--big' : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

function History() {
  const { masterAccess } = useAuth();
  const { rows, loading, error } = useTable<ForgeResultRow>('forge_results', {
    sort: (a, b) => b.created_at.localeCompare(a.created_at),
    latest: { column: 'created_at', count: 60 },
  });
  return (
    <div>
      <p className="muted">{masterAccess ? 'Todas as fabricações da mesa, em tempo real.' : 'Suas fabricações.'}</p>
      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Carregando…</p>}
      {!loading && rows.length === 0 && <p className="muted">Nenhuma fabricação ainda.</p>}
      <div className="grid-cards">
        {rows.map((r) => (
          <ForgeCard
            key={r.id}
            who={`${r.author_name}${r.character_name ? ` (${r.character_name})` : ''} · ${new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
            p={{
              weapon: r.weapon,
              rarity: r.rarity,
              metal: r.metal,
              tests: r.tests,
              perfects: r.perfects,
              betters: r.betters,
              goods: r.goods,
              misses: r.misses,
              criticals: r.criticals,
              damageBonus: r.damage_bonus,
              durability: r.durability,
              divineOk: r.divine_ok,
              timeline: r.timeline,
            }}
          />
        ))}
      </div>
    </div>
  );
}
