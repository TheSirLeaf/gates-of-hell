/** Efeitos da Forja: som sintetizado (WebAudio), vibração e partículas em canvas. Sem arquivos externos. */

type Tone = 'perfect' | 'better' | 'good' | 'miss' | 'crit';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  return buf;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

/** Martelada: estalo de ruído + corpo metálico; o resultado muda o timbre. */
export function playStrike(t: Tone, muted: boolean): void {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const now = c.currentTime;

  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, 0.12);
  const hp = c.createBiquadFilter();
  hp.type = t === 'miss' || t === 'crit' ? 'lowpass' : 'highpass';
  hp.frequency.value = t === 'miss' || t === 'crit' ? 500 : 1800;
  const ng = c.createGain();
  ng.gain.setValueAtTime(t === 'crit' ? 0.6 : 0.5, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  noise.connect(hp).connect(ng).connect(c.destination);
  noise.start(now);

  if (t === 'miss') {
    tone(c, 110, now, 0.22, 0.35, 'triangle');
  } else if (t === 'crit') {
    tone(c, 70, now, 0.45, 0.5, 'sawtooth');
    tone(c, 55, now + 0.03, 0.5, 0.4, 'square');
  } else {
    const base = t === 'perfect' ? 880 : t === 'better' ? 740 : 620;
    tone(c, base, now, 0.55, 0.28, 'triangle');
    tone(c, base * 2.76, now, 0.35, 0.14, 'sine'); // parcial inarmônica = som de metal
    tone(c, base * 5.4, now, 0.18, 0.06, 'sine');
    if (t === 'perfect') {
      tone(c, 1320, now + 0.08, 0.6, 0.16, 'sine');
      tone(c, 1760, now + 0.16, 0.7, 0.12, 'sine');
    }
  }
}

/** Sinal sonoro leve quando o teste aparece. */
export function playCue(muted: boolean): void {
  if (muted) return;
  const c = audio();
  if (!c) return;
  tone(c, 520, c.currentTime, 0.12, 0.08, 'sine');
}

export function playFinish(good: boolean, muted: boolean): void {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  const notes = good ? [523, 659, 784, 1047] : [392, 349, 294];
  notes.forEach((f, i) => tone(c, f, now + i * 0.11, 0.5, 0.18, 'triangle'));
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignora */
  }
}

// ---------- Partículas ----------------------------------------------

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; gravity: number;
}

const PALETTES: Record<Tone, string[]> = {
  perfect: ['#fff6d6', '#ffd978', '#ffb347', '#ff8a3d'],
  better: ['#ffe0b0', '#ffb36b', '#ff8a3d'],
  good: ['#ffc58a', '#ff8a3d', '#d6561f'],
  miss: ['#8a8190', '#5d5662', '#443f49'],
  crit: ['#ff5a4f', '#c9221b', '#7a0f0f'],
};

const COUNTS: Record<Tone, number> = { perfect: 90, better: 50, good: 28, miss: 14, crit: 55 };

export class ParticleField {
  private ps: Particle[] = [];
  private raf = 0;
  private ctx: CanvasRenderingContext2D | null;
  private last = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(r.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(r.height * dpr));
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  burst(x: number, y: number, t: Tone, reduced = false): void {
    const colors = PALETTES[t];
    const n = Math.round(COUNTS[t] * (reduced ? 0.3 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (t === 'perfect' ? 140 : 90) + Math.random() * (t === 'perfect' ? 420 : 260);
      this.ps.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 90,
        life: 0,
        max: 0.45 + Math.random() * 0.8,
        size: 1.5 + Math.random() * (t === 'perfect' ? 3.2 : 2.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: t === 'miss' || t === 'crit' ? 520 : 380,
      });
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    const c = this.ctx;
    if (!c) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const r = this.canvas.getBoundingClientRect();
    c.clearRect(0, 0, r.width, r.height);
    c.globalCompositeOperation = 'lighter';

    this.ps = this.ps.filter((p) => p.life < p.max);
    for (const p of this.ps) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      const k = 1 - p.life / p.max;
      c.globalAlpha = Math.max(0, k);
      c.fillStyle = p.color;
      // rastro curto na direção do movimento
      c.beginPath();
      c.ellipse(p.x, p.y, p.size * (0.6 + k), p.size * 0.6 * k + 0.4, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';

    this.raf = this.ps.length > 0 ? requestAnimationFrame(this.frame) : 0;
  };

  destroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ps = [];
  }
}
