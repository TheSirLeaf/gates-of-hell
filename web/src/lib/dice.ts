/**
 * Motor de dados compatível com a sintaxe V1 do Rollem (rollem.rocks/docs/syntax).
 * Port do DiceRoller.cs do projeto antigo.
 *
 * Suporta XdY, dF, explosões (! / !N), keep/drop (k, kh, kl, d, dl, dh), ns,
 * crítico (cN), repetição (N#), matemática (+ - * / e parênteses), modificador
 * por dado (++ / --), contagem (<< / >>), comparação (< <= > >= =) e rolagens
 * inline com rótulo ([d20+5 ataque]).
 */

export class DiceRollError extends Error {}

export interface DieFace {
  value: number;
  dropped: boolean;
  crit: boolean;
  fate: boolean;
}

export interface RollResult {
  label: string;
  expression: string;
  total: number;
  dice: DieFace[];
  success: boolean | null;
}

const MAX_DICE = 100;
const MAX_SIDES = 1000;
const MAX_REPEATS = 20;
const MAX_RESULTS = 50;
const MAX_INPUT = 600;

export type Rng = (maxExclusive: number) => number;

/** Inteiro uniforme em [0, max) usando crypto, com rejeição para evitar viés. */
export const cryptoRng: Rng = (max) => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
};

interface Evaluation {
  value: number;
  dice: DieFace[];
  expression: string;
  success?: boolean;
}

type KeepMode = 'none' | 'kh' | 'kl' | 'dh' | 'dl';

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';
const isSpace = (c: string | undefined): boolean => c !== undefined && /\s/.test(c);

export function formatNumber(v: number): string {
  if (Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v));
  return String(Math.round(v * 100) / 100);
}

export function rollCommand(input: string, rng: Rng = cryptoRng): RollResult[] {
  if (!input || !input.trim()) {
    throw new DiceRollError('Digite uma rolagem, por exemplo: 2d6+3 dano.');
  }
  const text = input.trim();
  if (text.length > MAX_INPUT) {
    throw new DiceRollError(`A rolagem é longa demais (máximo de ${MAX_INPUT} caracteres).`);
  }

  const segments = extractSegments(text);
  const results: RollResult[] = [];

  if (segments.length > 0) {
    if (segments.length > MAX_RESULTS) {
      throw new DiceRollError(`Muitas rolagens inline (máximo de ${MAX_RESULTS}).`);
    }
    for (const s of segments) results.push(...parseCommand(s, rng));
  } else {
    results.push(...parseCommand(text, rng));
  }

  if (results.length === 0) throw new DiceRollError('Nenhuma rolagem foi encontrada.');
  if (results.length > MAX_RESULTS) {
    throw new DiceRollError(`Muitas rolagens de uma vez (máximo de ${MAX_RESULTS}).`);
  }
  return results;
}

function extractSegments(text: string): string[] {
  const out: string[] = [];
  if (text.indexOf('[') < 0) {
    if (text.includes(']')) throw new DiceRollError('Há um colchete de fechamento sem abertura.');
    return out;
  }
  let pos = 0;
  while (pos < text.length) {
    const open = text.indexOf('[', pos);
    if (open < 0) break;
    const close = text.indexOf(']', open + 1);
    if (close < 0) throw new DiceRollError('Colchete de rolagem inline não fechado.');
    const content = text.slice(open + 1, close).trim();
    if (content.length === 0) throw new DiceRollError('Há um colchete de rolagem vazio.');
    out.push(content);
    pos = close + 1;
  }
  return out;
}

function parseCommand(segment: string, rng: Rng): RollResult[] {
  const text = segment.trim();
  if (text.length === 0) throw new DiceRollError('Rolagem vazia.');

  // Repetição no início: 6#4d6kh3
  const m = /^(\d+)\s*#/.exec(text);
  if (m) {
    const times = parseInt(m[1], 10);
    if (times < 1 || times > MAX_REPEATS) {
      throw new DiceRollError(`Repita a rolagem entre 1 e ${MAX_REPEATS} vezes.`);
    }
    const rest = text.slice(m[0].length).trim();
    if (rest.length === 0) throw new DiceRollError('Faltou a rolagem depois do #.');
    const list: RollResult[] = [];
    for (let i = 0; i < times; i++) list.push(...parseSingle(rest, rng));
    return list;
  }
  return parseSingle(text, rng);
}

function parseSingle(text: string, rng: Rng): RollResult[] {
  const parser = new Parser(text, rng);
  const ev = parser.parseExpression();
  const rest = text.slice(parser.pos).trim();
  if (rest.length > 0 && '+-*/<>=#!'.includes(rest[0])) {
    throw new DiceRollError(
      `Não entendi a parte "${rest}". Confira a expressão ou escreva um rótulo depois de um espaço.`,
    );
  }
  return [
    {
      label: rest.length > 100 ? rest.slice(0, 100) : rest,
      expression: ev.expression,
      total: Math.round(ev.value * 100) / 100,
      dice: ev.dice,
      success: ev.success ?? null,
    },
  ];
}

class Parser {
  pos = 0;
  constructor(
    private readonly text: string,
    private readonly rng: Rng,
  ) {}

  parseExpression(): Evaluation {
    return this.parseComparison();
  }

  private parseComparison(): Evaluation {
    const left = this.parseCount();
    this.skipSpaces();

    let op: string | null = null;
    if (this.match('<=')) op = '<=';
    else if (this.match('>=')) op = '>=';
    else if (this.match('==')) op = '=';
    else if (this.match('<')) op = '<';
    else if (this.match('>')) op = '>';
    else if (this.match('=')) op = '=';
    if (op === null) return left;

    const right = this.parseCount();
    const l = left.value;
    const r = right.value;
    const success =
      op === '<' ? l < r : op === '<=' ? l <= r : op === '>' ? l > r : op === '>=' ? l >= r : Math.abs(l - r) < 1e-6;

    return {
      value: l,
      dice: [...left.dice, ...right.dice],
      expression: `${left.expression} ${op} ${right.expression}`,
      success,
    };
  }

  private parseCount(): Evaluation {
    const left = this.parseAdditive();
    this.skipSpaces();

    let geq: boolean | null = null;
    if (this.match('>>')) geq = true;
    else if (this.match('<<')) geq = false;
    if (geq === null) return left;

    if (left.dice.length === 0) {
      throw new DiceRollError('A contagem (<< ou >>) precisa de uma rolagem de dados à esquerda.');
    }
    const right = this.parseAdditive();
    const limit = right.value;
    const count = left.dice.filter((d) => !d.dropped && (geq ? d.value >= limit : d.value <= limit)).length;
    return {
      value: count,
      dice: left.dice,
      expression: `${left.expression} ${geq ? '>>' : '<<'} ${right.expression}`,
    };
  }

  private parseAdditive(): Evaluation {
    let left = this.parseMultiplicative();
    for (;;) {
      this.skipSpaces();
      if (this.match('++')) left = applyPerDie(left, this.parseMultiplicative(), 1);
      else if (this.match('--')) left = applyPerDie(left, this.parseMultiplicative(), -1);
      else if (this.match('+')) left = combine(left, this.parseMultiplicative(), '+');
      else if (this.match('-')) left = combine(left, this.parseMultiplicative(), '-');
      else return left;
    }
  }

  private parseMultiplicative(): Evaluation {
    let left = this.parseUnary();
    for (;;) {
      this.skipSpaces();
      if (this.match('*')) left = combine(left, this.parseUnary(), '*');
      else if (this.match('/')) {
        const right = this.parseUnary();
        if (Math.abs(right.value) < 1e-6) throw new DiceRollError('Divisão por zero.');
        left = combine(left, right, '/');
      } else return left;
    }
  }

  private parseUnary(): Evaluation {
    this.skipSpaces();
    if (this.match('+')) return this.parseUnary();
    if (this.match('-')) {
      const v = this.parseUnary();
      return {
        value: -v.value,
        dice: v.dice.map((d) => ({ ...d, value: -d.value })),
        expression: `-${v.expression}`,
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Evaluation {
    this.skipSpaces();
    if (this.pos >= this.text.length) throw new DiceRollError('A expressão terminou antes da hora.');
    const cur = this.text[this.pos];

    if (cur === '(') {
      this.pos++;
      const inner = this.parseExpression();
      this.skipSpaces();
      if (!this.match(')')) throw new DiceRollError('Faltou fechar um parêntese.');
      return { value: inner.value, dice: inner.dice, expression: `(${inner.expression})`, success: inner.success };
    }

    if (isDigit(cur)) {
      const start = this.pos;
      while (isDigit(this.text[this.pos])) this.pos++;
      const n = parseInt(this.text.slice(start, this.pos), 10);
      if (!Number.isSafeInteger(n)) throw new DiceRollError('Número inválido.');
      // Só é dado se o d vem imediatamente depois (XdY). "4 d6" conta como número + rótulo.
      const next = this.text[this.pos];
      if (next === 'd' || next === 'D') return this.parseDice(n);
      return { value: n, dice: [], expression: String(n) };
    }

    if (cur === 'd' || cur === 'D') return this.parseDice(1);

    throw new DiceRollError(`Não entendi o trecho "${this.text.slice(this.pos)}".`);
  }

  private parseDice(quantity: number): Evaluation {
    if (quantity < 1) throw new DiceRollError('A quantidade de dados precisa ser pelo menos 1.');
    if (quantity > MAX_DICE) throw new DiceRollError(`No máximo ${MAX_DICE} dados por rolagem.`);

    this.pos++; // d
    let fate = false;
    let sides = 0;

    if (this.text[this.pos] === 'f' || this.text[this.pos] === 'F') {
      fate = true;
      this.pos++;
    } else {
      const start = this.pos;
      while (isDigit(this.text[this.pos])) this.pos++;
      if (start === this.pos) throw new DiceRollError('Faltou o tamanho do dado (por exemplo, d20).');
      sides = parseInt(this.text.slice(start, this.pos), 10);
      if (sides < 2) throw new DiceRollError('Dados de um lado só não existem.');
      if (sides > MAX_SIDES) throw new DiceRollError(`O dado pode ter no máximo ${MAX_SIDES} lados.`);
    }

    let explode = false;
    let explodeAt = 0;
    let mode: KeepMode = 'none';
    let keepCount = 0;
    let unsorted = false;
    let critAt: number | null = null;

    // Sufixos são contíguos (sem espaço), como no Rollem: 10d6!kh5ns.
    if (!fate && !this.atSpace() && this.match('!')) {
      explode = true;
      explodeAt = sides;
      if (isDigit(this.text[this.pos])) {
        const start = this.pos;
        while (isDigit(this.text[this.pos])) this.pos++;
        explodeAt = parseInt(this.text.slice(start, this.pos), 10);
        if (explodeAt < 2 || explodeAt > sides) {
          throw new DiceRollError(`A explosão deve acontecer entre 2 e ${sides}.`);
        }
      }
    }

    if (!fate) {
      if (!this.atSpace()) {
        const kd = this.tryKeepDrop();
        if (kd) {
          mode = kd.mode;
          keepCount = Math.min(Math.max(kd.count, 0), quantity);
        }
      }
      while (!this.atSpace()) {
        if (this.match('ns')) {
          unsorted = true;
          continue;
        }
        const c = this.text[this.pos];
        if ((c === 'c' || c === 'C') && isDigit(this.text[this.pos + 1])) {
          this.pos++;
          const start = this.pos;
          while (isDigit(this.text[this.pos])) this.pos++;
          critAt = parseInt(this.text.slice(start, this.pos), 10);
          continue;
        }
        break;
      }
    }

    let dice: DieFace[] = [];
    const queue: DieFace[] = [];
    for (let i = 0; i < quantity; i++) queue.push(this.rollDie(fate, sides));

    while (queue.length > 0 && dice.length < MAX_DICE) {
      const die = queue.shift()!;
      dice.push(die);
      if (explode && !fate && die.value >= explodeAt && dice.length < MAX_DICE) {
        queue.push(this.rollDie(false, sides));
      }
    }

    applyKeepDrop(dice, mode, keepCount);

    for (const die of dice) {
      if (die.dropped) continue;
      die.crit = critAt !== null ? die.value >= critAt : !fate && die.value >= sides;
    }

    if (!unsorted) {
      dice = dice
        .map((die, index) => ({ die, index }))
        .sort((a, b) => a.die.value - b.die.value || a.index - b.index)
        .map((p) => p.die);
    }

    const value = dice.filter((d) => !d.dropped).reduce((s, d) => s + d.value, 0);
    let expression = `${quantity}${fate ? 'dF' : `d${sides}`}`;
    if (explode) expression += '!' + (explodeAt !== sides ? explodeAt : '');
    if (mode !== 'none') expression += `${mode}${keepCount}`;
    if (unsorted) expression += 'ns';
    if (critAt !== null) expression += `c${critAt}`;

    return { value, dice, expression };
  }

  private tryKeepDrop(): { mode: KeepMode; count: number } | null {
    const c = this.text[this.pos]?.toLowerCase();
    if (c !== 'k' && c !== 'd') return null;

    let p = this.pos + 1;
    const mod = this.text[p]?.toLowerCase();
    let hl: string | null = null;
    if (mod === 'h' || mod === 'l') {
      hl = mod;
      p++;
    }
    if (!isDigit(this.text[p])) return null;
    const start = p;
    while (isDigit(this.text[p])) p++;
    const count = parseInt(this.text.slice(start, p), 10);
    this.pos = p;

    if (c === 'k') return { mode: hl === 'l' ? 'kl' : 'kh', count };
    return { mode: hl === 'h' ? 'dh' : 'dl', count };
  }

  private rollDie(fate: boolean, sides: number): DieFace {
    if (fate) return { value: this.rng(3) - 1, dropped: false, crit: false, fate: true };
    return { value: this.rng(sides) + 1, dropped: false, crit: false, fate: false };
  }

  private skipSpaces(): void {
    while (isSpace(this.text[this.pos])) this.pos++;
  }

  private match(token: string): boolean {
    if (this.text.startsWith(token, this.pos)) {
      this.pos += token.length;
      return true;
    }
    return false;
  }

  private atSpace(): boolean {
    return isSpace(this.text[this.pos]);
  }
}

function applyKeepDrop(dice: DieFace[], mode: KeepMode, count: number): void {
  if (mode === 'none' || dice.length === 0) return;
  const idx = dice.map((_, i) => i);
  const desc = [...idx].sort((a, b) => dice[b].value - dice[a].value || a - b);
  const asc = [...idx].sort((a, b) => dice[a].value - dice[b].value || a - b);

  if (mode === 'kh' || mode === 'kl') {
    const keep = new Set((mode === 'kh' ? desc : asc).slice(0, count));
    dice.forEach((d, i) => (d.dropped = !keep.has(i)));
  } else {
    const drop = new Set((mode === 'dh' ? desc : asc).slice(0, count));
    dice.forEach((d, i) => (d.dropped = drop.has(i)));
  }
}

function combine(a: Evaluation, b: Evaluation, op: '+' | '-' | '*' | '/'): Evaluation {
  const value = op === '+' ? a.value + b.value : op === '-' ? a.value - b.value : op === '*' ? a.value * b.value : a.value / b.value;
  return { value, dice: [...a.dice, ...b.dice], expression: `${a.expression} ${op} ${b.expression}` };
}

function applyPerDie(a: Evaluation, b: Evaluation, sign: 1 | -1): Evaluation {
  if (b.dice.length > 0) throw new DiceRollError('O modificador ++/-- precisa ser um número.');
  const delta = sign * b.value;
  const dice = a.dice.map((d) => ({ ...d, value: d.value + delta }));
  const kept = dice.filter((d) => !d.dropped).length;
  return {
    value: a.value + (kept > 0 ? delta * kept : delta),
    dice,
    expression: `${a.expression}${sign < 0 ? '--' : '++'}${formatNumber(b.value)}`,
  };
}
