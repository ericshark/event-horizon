/**
 * Optional synchronized sound. `audioTargets` is a pure function of the authoritative
 * flight snapshot; `AudioEngine` only smooths those targets onto Web Audio nodes. It
 * owns no clock, never starts itself without a stored preference, and treats every
 * browser refusal as "stay silent".
 */
import type { TimedFrame } from './controller';
import { LEG_DURATIONS } from './journey';
import { clamp } from './science';

export interface AudioTargets {
  /** Overall level: 0 when off, hidden or paused. */
  master: number;
  bed: number;
  drive: number;
  /** Centre frequency of the travel noise band (Hz). */
  driveHz: number;
  arrival: number;
}
export const SETTLE_SECONDS = (duration: number) =>
  Math.min(1.2, 0.12 * duration);
const ease = (x: number) => clamp(x) ** 2 * (3 - 2 * clamp(x));

export function audioTargets(
  frame: Pick<
    TimedFrame,
    'playback' | 'thrust' | 'flightPhase' | 'elapsed' | 'leg'
  > & { reducedMotion?: boolean; flightDuration?: number },
  enabled: boolean,
  visible = true,
): AudioTargets {
  const duration = frame.flightDuration ?? LEG_DURATIONS[frame.leg] ?? 6,
    settle = SETTLE_SECONDS(duration);
  const settling =
    frame.flightPhase === 'settling'
      ? clamp((frame.elapsed - (duration - settle)) / settle)
      : 0;
  const thrust = ease(frame.thrust);
  const reduced = Boolean(frame.reducedMotion);
  return {
    master: enabled && visible && frame.playback !== 'paused' ? 1 : 0,
    bed: 0.5 + (reduced ? 0.1 : 0.2) * thrust,
    drive: (reduced ? 0.5 : 1) * thrust ** 1.4,
    driveHz: 90 + (reduced ? 110 : 220) * thrust,
    arrival: Math.sin(Math.PI * settling) ** 2,
  };
}

/** Maximum gains, deliberately low: a subtle spacecraft cabin hum and drive swell. */
const LEVEL = { master: 0.5, bed: 0.065, drive: 0.14, arrival: 0.045 };
/** Smoothing time constant (s); every change goes through it, so there are no steps. */
const TAU = 0.22;
export type SoundStatus = 'off' | 'on' | 'blocked';
const KEY = 'journey-through-space.sound';
const LEGACY_KEY = 'event-horizon.sound';

function readPreference() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'on' || saved === 'off') return saved === 'on';
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'on' || legacy === 'off') {
      // Failed persistence must not discard an explicit preference we already read.
      try {
        localStorage.setItem(KEY, legacy);
      } catch {
        /* read-only storage */
      }
      return legacy === 'on';
    }
    return false;
  } catch {
    return false;
  }
}
function writePreference(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: the preference simply does not persist */
  }
}

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  bed: GainNode;
  drive: GainNode;
  arrival: GainNode;
  band: BiquadFilterNode;
  sources: AudioScheduledSourceNode[];
}

export class AudioEngine {
  private graph?: Graph;
  private wanted = readPreference();
  private hidden = false;
  private waiting = false;
  private disposed = false;
  onchange: () => void = () => {};
  /** Last targets applied, for diagnostics. */
  last: AudioTargets = {
    master: 0,
    bed: 0,
    drive: 0,
    driveHz: 90,
    arrival: 0,
  };
  constructor(private supported = typeof AudioContext !== 'undefined') {
    // A stored "on" is honoured only if the browser lets the context run unprompted.
    if (this.wanted && supported) void this.start();
  }
  get preference() {
    return this.wanted;
  }
  get available() {
    return this.supported;
  }
  get status(): SoundStatus {
    if (!this.wanted) return 'off';
    return this.graph?.ctx.state === 'running' ? 'on' : 'blocked';
  }
  /** Explicit user toggle. Always a user gesture, so it may create and resume the context. */
  async set(on: boolean) {
    this.wanted = on;
    writePreference(on);
    if (on) await this.start();
    else this.stopSoon();
    this.onchange();
  }
  private async start() {
    if (!this.supported || this.disposed) return;
    try {
      this.graph ??= this.build();
      const { ctx } = this.graph;
      ctx.onstatechange = () => this.onchange();
      if (ctx.state === 'suspended' && !this.hidden) {
        // Chrome leaves resume() pending when autoplay is denied; never await it.
        void ctx.resume().catch(() => {});
        this.armGesture();
      }
    } catch {
      this.supported = false;
      this.wanted = false;
    }
    this.onchange();
  }
  /** One-shot recovery when the browser required a gesture again on this load. */
  private armGesture() {
    if (this.waiting) return;
    this.waiting = true;
    const resume = () => {
      this.waiting = false;
      for (const type of ['pointerdown', 'keydown'])
        removeEventListener(type, resume, true);
      if (this.wanted && !this.hidden)
        void this.graph?.ctx.resume().then(this.onchange, () => {});
    };
    for (const type of ['pointerdown', 'keydown'])
      addEventListener(type, resume, { capture: true });
  }
  private build(): Graph {
    const ctx = new AudioContext();
    const gain = (value = 0) => {
      const g = ctx.createGain();
      g.gain.value = value;
      return g;
    };
    const master = gain(),
      bed = gain(),
      drive = gain(),
      arrival = gain();
    master.connect(ctx.destination);
    bed.connect(master);
    drive.connect(master);
    arrival.connect(master);
    const sources: AudioScheduledSourceNode[] = [];
    // Seamless 4-second warm brown noise via deterministic PRNG + loop crossfade.
    const length = ctx.sampleRate * 4,
      fade = Math.min(
        Math.floor(ctx.sampleRate * 0.15),
        Math.floor(length / 4),
      ),
      raw = new Float32Array(length + fade);
    let seed = 0x13579bdf,
      last = 0;
    for (let i = 0; i < raw.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const white = (seed / 0xffffffff) * 2 - 1;
      last = (last + 0.035 * white) / 1.02;
      raw[i] = Math.max(-1, Math.min(1, last * 2.8));
    }
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = raw[i];
    for (let i = 0; i < fade; i++) {
      const w = i / fade;
      data[i] = raw[i] * w + raw[length + i] * (1 - w);
    }

    // Spacecraft cabin / hull resonance: deep sub-bass hum and faint deck airflow.
    const hullFilter = ctx.createBiquadFilter();
    hullFilter.type = 'lowpass';
    hullFilter.frequency.value = 105;
    hullFilter.Q.value = 0.7;
    hullFilter.connect(bed);
    for (const [freq, level] of [
      [38, 0.75],
      [76, 0.22],
    ] as const) {
      const osc = ctx.createOscillator(),
        g = gain(level);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g).connect(hullFilter);
      osc.start();
      sources.push(osc);
    }
    const lfo = ctx.createOscillator(),
      depth = gain(16);
    lfo.frequency.value = 0.07;
    lfo.connect(depth).connect(hullFilter.frequency);
    lfo.start();
    sources.push(lfo);

    const cabinNoise = ctx.createBufferSource();
    cabinNoise.buffer = buffer;
    cabinNoise.loop = true;
    const cabinAir = ctx.createBiquadFilter();
    cabinAir.type = 'lowpass';
    cabinAir.frequency.value = 85;
    cabinNoise.connect(cabinAir).connect(gain(0.35)).connect(bed);
    cabinNoise.start();
    sources.push(cabinNoise);

    // Ion drive: smooth brown noise + subtle low turbine harmonic swept by thrust.
    const driveNoise = ctx.createBufferSource();
    driveNoise.buffer = buffer;
    driveNoise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'lowpass';
    band.frequency.value = 90;
    band.Q.value = 0.85;
    driveNoise.connect(band).connect(drive);
    driveNoise.start();
    sources.push(driveNoise);

    const turbine = ctx.createOscillator();
    turbine.type = 'sine';
    turbine.frequency.value = 52;
    turbine.connect(gain(0.25)).connect(band);
    turbine.start();
    sources.push(turbine);

    // Arrival: a soft, low-register orbital lock resonance while braking settles.
    const settleFilter = ctx.createBiquadFilter();
    settleFilter.type = 'lowpass';
    settleFilter.frequency.value = 220;
    settleFilter.connect(arrival);
    for (const freq of [98, 147]) {
      const osc = ctx.createOscillator(),
        g = gain(0.45);
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g).connect(settleFilter);
      osc.start();
      sources.push(osc);
    }
    return { ctx, master, bed, drive, arrival, band, sources };
  }
  /** Apply the snapshot. Safe to call every frame in any state. */
  update(frame: Parameters<typeof audioTargets>[0]) {
    const targets = audioTargets(frame, this.wanted, !this.hidden);
    this.last = targets;
    const g = this.graph;
    if (!g || g.ctx.state !== 'running') return;
    const now = g.ctx.currentTime;
    g.master.gain.setTargetAtTime(targets.master * LEVEL.master, now, TAU);
    g.bed.gain.setTargetAtTime(targets.bed * LEVEL.bed, now, TAU);
    g.drive.gain.setTargetAtTime(targets.drive * LEVEL.drive, now, TAU);
    g.arrival.gain.setTargetAtTime(targets.arrival * LEVEL.arrival, now, TAU);
    g.band.frequency.setTargetAtTime(targets.driveHz, now, TAU);
  }
  /** Fade out, then suspend so a muted page costs nothing. */
  private stopSoon() {
    const g = this.graph;
    if (!g) return;
    const now = g.ctx.currentTime;
    g.master.gain.setTargetAtTime(0, now, TAU);
    setTimeout(() => {
      if (!this.wanted && g.ctx.state === 'running') void g.ctx.suspend();
    }, 900);
  }
  /** Hidden tabs fade and suspend; visible again resumes only if sound is wanted. */
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) this.last = { ...this.last, master: 0 };
    const g = this.graph;
    if (!g) return;
    if (hidden) {
      g.master.gain.cancelScheduledValues(g.ctx.currentTime);
      g.master.gain.value = 0;
      if (g.ctx.state === 'running') void g.ctx.suspend();
    } else if (this.wanted) {
      void g.ctx.resume().catch(() => {});
      this.armGesture();
    }
  }
  dispose() {
    this.disposed = true;
    const g = this.graph;
    this.graph = undefined;
    if (!g) return;
    for (const source of g.sources)
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    void g.ctx.close().catch(() => {});
  }
  /** Observable state for acceptance checks. */
  diagnostics() {
    return {
      status: this.status,
      preference: this.wanted,
      context: this.graph?.ctx.state ?? 'none',
      hidden: this.hidden,
      targets: this.last,
      gains: this.graph
        ? {
            master: this.graph.master.gain.value,
            drive: this.graph.drive.gain.value,
            arrival: this.graph.arrival.gain.value,
          }
        : null,
    };
  }
}
