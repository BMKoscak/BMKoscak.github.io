// Every sound on the site is synthesized here with the Web Audio API.
// Nothing plays until the visitor turns sound on, and the AudioContext lives
// for the whole visit because the router never reloads the page.

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const STORE = 'thebenn:sound';

type Listener = (on: boolean) => void;

class Sound {
	ctx: AudioContext | null = null;
	on = false;
	master!: GainNode;
	delaySend!: GainNode;
	noise!: AudioBuffer;
	splitter!: ChannelSplitterNode;
	analyserL!: AnalyserNode;
	analyserR!: AnalyserNode;
	private listeners: Listener[] = [];
	private last: Record<string, number> = {};
	// scope oscillators (left = x, right = y)
	private scopeGain: GainNode | null = null;
	private oscL: OscillatorNode | null = null;
	private oscR: OscillatorNode | null = null;
	private scopeHold = 0;

	get wanted() {
		try {
			return localStorage.getItem(STORE) === '1';
		} catch {
			return false;
		}
	}

	private init() {
		if (this.ctx) return true;
		const AC = window.AudioContext || (window as any).webkitAudioContext;
		if (!AC) return false;
		const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
		this.master = ctx.createGain();
		this.master.gain.value = 0;
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -14;
		comp.ratio.value = 4;
		this.master.connect(comp).connect(ctx.destination);

		// stereo analysers for the XY scope
		this.splitter = ctx.createChannelSplitter(2);
		this.analyserL = ctx.createAnalyser();
		this.analyserR = ctx.createAnalyser();
		this.analyserL.fftSize = this.analyserR.fftSize = 2048;
		comp.connect(this.splitter);
		this.splitter.connect(this.analyserL, 0);
		this.splitter.connect(this.analyserR, 1);

		const delay = ctx.createDelay(1);
		delay.delayTime.value = 0.3;
		const fb = ctx.createGain();
		fb.gain.value = 0.28;
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 2600;
		this.delaySend = ctx.createGain();
		this.delaySend.gain.value = 0.22;
		this.delaySend.connect(delay).connect(lp).connect(fb).connect(delay);
		lp.connect(this.master);

		const len = ctx.sampleRate;
		this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = this.noise.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		return true;
	}

	onChange(fn: Listener) {
		this.listeners.push(fn);
	}

	async set(on: boolean) {
		if (on && !this.init()) on = false;
		this.on = on;
		try {
			localStorage.setItem(STORE, on ? '1' : '0');
		} catch {}
		if (this.ctx) {
			const t = this.ctx.currentTime;
			if (on && this.ctx.state !== 'running') {
				try {
					await this.ctx.resume();
				} catch {}
			}
			this.master.gain.cancelScheduledValues(t);
			this.master.gain.setTargetAtTime(on ? 0.85 : 0, t, 0.04);
			if (!on) this.scopeStop();
		}
		this.listeners.forEach((f) => f(on));
	}

	get ready() {
		return !!(this.on && this.ctx && this.ctx.state === 'running');
	}

	private throttle(key: string, ms: number) {
		const now = performance.now();
		if (this.last[key] && now - this.last[key] < ms) return true;
		this.last[key] = now;
		return false;
	}

	private burst(dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, when = 0) {
		const ctx = this.ctx!;
		const t = ctx.currentTime + when;
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const f = ctx.createBiquadFilter();
		f.type = type;
		f.frequency.value = freq;
		f.Q.value = q;
		const g = ctx.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(f).connect(g).connect(this.master);
		src.start(t, Math.random() * 0.8);
		src.stop(t + dur + 0.02);
	}

	private tone(type: OscillatorType, freq: number, dur: number, gain: number, when = 0, out: AudioNode = this.master) {
		const ctx = this.ctx!;
		const t = ctx.currentTime + when;
		const o = ctx.createOscillator();
		o.type = type;
		o.frequency.value = freq;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g).connect(out);
		o.start(t);
		o.stop(t + dur + 0.03);
		return o;
	}

	// ---- interface sounds: mechanical, like the buttons on a camera or a desk ----
	hover() {
		if (!this.ready || this.throttle('hover', 60)) return;
		this.burst(0.012, 'highpass', 5200, 0.7, 0.05);
	}
	click() {
		if (!this.ready || this.throttle('click', 40)) return;
		this.burst(0.008, 'bandpass', 3400, 1.4, 0.35);
		this.tone('square', 120, 0.03, 0.05, 0.002);
		this.burst(0.018, 'bandpass', 1800, 1.2, 0.18, 0.045);
	}
	navigate() {
		if (!this.ready || this.throttle('nav', 250)) return;
		// tape transport engaging
		this.burst(0.05, 'lowpass', 900, 0.9, 0.3);
		const o = this.tone('sine', 70, 0.22, 0.2, 0.01);
		o.frequency.exponentialRampToValueAtTime(42, this.ctx!.currentTime + 0.22);
	}
	shutter() {
		if (!this.ready) return;
		this.burst(0.012, 'bandpass', 3200, 1.5, 0.45);
		this.tone('square', 140, 0.04, 0.06, 0.004);
		this.burst(0.02, 'bandpass', 2400, 1.2, 0.35, 0.075);
		this.tone('sine', 90, 0.06, 0.12, 0.075);
	}
	take() {
		if (!this.ready) return;
		this.burst(0.2, 'lowpass', 800, 0.8, 0.3);
		this.tone('sine', 55, 0.45, 0.3);
	}
	blip(i = 0) {
		if (!this.ready || this.throttle('blip', 30)) return;
		this.tone('sine', 880 + i * 110, 0.06, 0.05);
	}

	// ---- instruments for the lab ----
	pluck(midi: number, when = 0, vel = 1) {
		if (!this.ready) return;
		const ctx = this.ctx!;
		const t = ctx.currentTime + when;
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.Q.value = 5;
		lp.frequency.setValueAtTime(5000, t);
		lp.frequency.exponentialRampToValueAtTime(420, t + 0.35);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.18 * vel, t + 0.005);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
		(
			[
				['sawtooth', 0],
				['square', 8],
			] as const
		).forEach(([type, det]) => {
			const o = ctx.createOscillator();
			o.type = type;
			o.frequency.value = mtof(midi);
			o.detune.value = det;
			o.connect(lp);
			o.start(t);
			o.stop(t + 1);
		});
		lp.connect(g);
		g.connect(this.master);
		g.connect(this.delaySend);
	}
	drum(kind: 'kick' | 'snare' | 'hat' | 'clap', when = 0) {
		if (!this.ready) return;
		const ctx = this.ctx!;
		const t = ctx.currentTime + when;
		if (kind === 'kick') {
			const o = ctx.createOscillator();
			o.frequency.setValueAtTime(150, t);
			o.frequency.exponentialRampToValueAtTime(44, t + 0.1);
			const sh = ctx.createWaveShaper();
			const curve = new Float32Array(1024);
			for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 2.2);
			sh.curve = curve;
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
			o.connect(sh).connect(g).connect(this.master);
			o.start(t);
			o.stop(t + 1.2);
		} else if (kind === 'snare') {
			this.burst(0.18, 'bandpass', 1900, 0.8, 0.5, when);
			this.tone('triangle', 190, 0.1, 0.22, when);
		} else if (kind === 'clap') {
			[0, 0.012, 0.024].forEach((d) => this.burst(0.06, 'bandpass', 1400, 1.1, 0.35, when + d));
		} else {
			this.burst(0.045, 'highpass', 8400, 0.8, 0.26, when);
		}
	}

	// ---- XY scope: left channel draws x, right channel draws y ----
	scopeStart(a: number, b: number, base = 110, level = 0.1) {
		if (!this.ready) return;
		const ctx = this.ctx!;
		const t = ctx.currentTime;
		if (!this.scopeGain) {
			this.scopeGain = ctx.createGain();
			this.scopeGain.gain.value = 0;
			const merger = ctx.createChannelMerger(2);
			this.oscL = ctx.createOscillator();
			this.oscR = ctx.createOscillator();
			this.oscL.connect(merger, 0, 0);
			this.oscR.connect(merger, 0, 1);
			merger.connect(this.scopeGain).connect(this.master);
			this.oscL.start();
			this.oscR.start();
		}
		this.oscL!.frequency.setTargetAtTime(base * a, t, 0.02);
		this.oscR!.frequency.setTargetAtTime(base * b, t, 0.02);
		this.scopeGain.gain.setTargetAtTime(level, t, 0.05);
		this.scopeHold = performance.now();
	}
	scopeDetune(cents: number) {
		if (this.oscR && this.ctx) this.oscR.detune.setTargetAtTime(cents, this.ctx.currentTime, 0.05);
	}
	scopeStop() {
		if (this.scopeGain && this.ctx) this.scopeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
		this.scopeHold = 0;
	}
	get scopeLive() {
		return this.ready && this.scopeHold > 0;
	}
}

export const sound = new Sound();
