// Everything you hear on the site is synthesized here. No audio files.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// One chord per link in the chain: hero, lens, sound, broadcast, code, outro
const CHORDS = [
	[45, 52, 59, 60], // Am(add9)
	[41, 48, 52, 57], // Fmaj7
	[38, 45, 53, 64], // Dm9
	[43, 52, 59, 62], // G6/9-ish
	[40, 47, 55, 66], // Em9
	[45, 52, 60, 71], // Am(add9) up top
];
const PAD_NOTES = [57, 60, 62, 64, 67, 69, 72, 74]; // A minor pentatonic

export class Sound {
	constructor() {
		this.ctx = null;
		this.on = false;
		this.chord = 0;
		this._last = {};
		this._levelBuf = null;
	}

	_init() {
		if (this.ctx) return;
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		const ctx = (this.ctx = new AC());

		this.master = ctx.createGain();
		this.master.gain.value = 0;
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
		this.master.connect(comp);
		comp.connect(ctx.destination);

		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 512;
		comp.connect(this.analyser);
		this._levelBuf = new Float32Array(this.analyser.fftSize);

		// Shared feedback delay for plucks
		this.delay = ctx.createDelay(1);
		this.delay.delayTime.value = 0.375;
		const fb = ctx.createGain(); fb.gain.value = 0.32;
		const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2400;
		this.delaySend = ctx.createGain(); this.delaySend.gain.value = 0.28;
		this.delaySend.connect(this.delay); this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay);
		dl.connect(this.master);

		// Noise buffer (2 s white noise) reused by every noisy sound
		const len = ctx.sampleRate * 2;
		this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = this.noise.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

		this._buildDrone();
	}

	_buildDrone() {
		const ctx = this.ctx;
		this.droneBus = ctx.createGain();
		this.droneBus.gain.value = 0;
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.8;
		const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
		const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 380;
		lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency); lfo.start();
		this.droneFilter = lp;
		this.droneBus.connect(lp); lp.connect(this.master);

		this.voices = CHORDS[0].map((m, i) => {
			const g = ctx.createGain(); g.gain.value = i === 0 ? 0.32 : 0.22;
			const oscs = [-7, 7].map((cents) => {
				const o = ctx.createOscillator();
				o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = cents;
				o.connect(g); o.start();
				return o;
			});
			g.connect(this.droneBus);
			return oscs;
		});
		// sub
		this.sub = ctx.createOscillator(); this.sub.type = 'sine'; this.sub.frequency.value = mtof(CHORDS[0][0] - 12);
		const sg = ctx.createGain(); sg.gain.value = 0.5; this.sub.connect(sg); sg.connect(this.droneBus); this.sub.start();

		// tape hiss
		const hiss = ctx.createBufferSource(); hiss.buffer = this.noise; hiss.loop = true;
		const hbp = ctx.createBiquadFilter(); hbp.type = 'bandpass'; hbp.frequency.value = 7000; hbp.Q.value = 0.6;
		const hg = ctx.createGain(); hg.gain.value = 0.012;
		hiss.connect(hbp); hbp.connect(hg); hg.connect(this.droneBus); hiss.start();
	}

	async enable(on) {
		if (on) this._init();
		if (!this.ctx) { this.on = false; return false; }
		this.on = on;
		const t = this.ctx.currentTime;
		if (on) {
			if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) { /* ignore */ } }
			this.master.gain.cancelScheduledValues(t);
			this.master.gain.setTargetAtTime(0.9, t, 0.05);
			this.droneBus.gain.setTargetAtTime(0.075, t, 1.2);
		} else {
			this.master.gain.cancelScheduledValues(t);
			this.master.gain.setTargetAtTime(0, t, 0.08);
		}
		return this.on;
	}

	get ready() { return this.on && this.ctx && this.ctx.state === 'running'; }

	_throttle(key, ms) {
		const now = performance.now();
		if (this._last[key] && now - this._last[key] < ms) return true;
		this._last[key] = now; return false;
	}

	level() {
		if (!this.ready) return 0;
		this.analyser.getFloatTimeDomainData(this._levelBuf);
		let s = 0;
		for (let i = 0; i < this._levelBuf.length; i++) s += this._levelBuf[i] * this._levelBuf[i];
		return Math.sqrt(s / this._levelBuf.length);
	}

	setChord(i) {
		if (!this.ctx) return;
		i = Math.max(0, Math.min(CHORDS.length - 1, i));
		if (i === this.chord) return;
		this.chord = i;
		const t = this.ctx.currentTime;
		CHORDS[i].forEach((m, v) => this.voices[v].forEach((o) => o.frequency.setTargetAtTime(mtof(m), t, 0.35)));
		this.sub.frequency.setTargetAtTime(mtof(CHORDS[i][0] - 12), t, 0.35);
		this.droneFilter.frequency.setTargetAtTime(500 + i * 90, t, 0.8);
	}

	_noise(dur, type, freq, q, gain, when = 0, dest = this.master) {
		const ctx = this.ctx, t = ctx.currentTime + when;
		const src = ctx.createBufferSource(); src.buffer = this.noise;
		const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
		const g = ctx.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(f); f.connect(g); g.connect(dest);
		src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
		return { src, f, g, t };
	}

	_tone(type, freq, dur, gain, when = 0, dest = this.master, attack = 0.004) {
		const ctx = this.ctx, t = ctx.currentTime + when;
		const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(gain, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
		return { o, g, t };
	}

	// ---- UI sounds ----
	tick() {
		if (!this.ready || this._throttle('tick', 35)) return;
		this._noise(0.018, 'highpass', 4200, 0.7, 0.09);
	}
	blip(pitch = 0) {
		if (!this.ready || this._throttle('blip', 45)) return;
		this._tone('sine', 1300 + pitch * 220, 0.07, 0.035);
	}
	beep() { // the classic "2-pop" on a film leader
		if (!this.ready) return;
		this._tone('sine', 1000, 0.09, 0.2, 0, this.master, 0.002);
	}
	whoosh(intensity = 1) {
		if (!this.ready || this._throttle('whoosh', 500)) return;
		const ctx = this.ctx;
		const n = this._noise(1.0, 'bandpass', 300, 1.2, 0.0001);
		const { f, g, t } = n;
		g.gain.cancelScheduledValues(t);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.13 * intensity, t + 0.35);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
		f.frequency.setValueAtTime(250, t);
		f.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
		f.frequency.exponentialRampToValueAtTime(500, t + 1.0);
		const { o } = this._tone('sine', 90, 0.7, 0.16 * intensity, 0.25);
		o.frequency.setValueAtTime(90, ctx.currentTime + 0.25);
		o.frequency.exponentialRampToValueAtTime(34, ctx.currentTime + 0.9);
	}
	shutter() {
		if (!this.ready) return;
		this._noise(0.012, 'bandpass', 3200, 1.5, 0.45);
		this._tone('square', 140, 0.04, 0.06, 0.004);
		this._noise(0.02, 'bandpass', 2400, 1.2, 0.35, 0.075);
		this._tone('sine', 90, 0.06, 0.12, 0.075);
	}
	take() {
		if (!this.ready) return;
		this._noise(0.25, 'lowpass', 900, 0.8, 0.35);
		this._tone('sine', 55, 0.5, 0.35);
		this._tone('triangle', mtof(81), 0.6, 0.06, 0.02);
		this._tone('triangle', mtof(88), 0.7, 0.05, 0.06);
	}
	arp() {
		if (!this.ready) return;
		const notes = [69, 72, 76, 79, 81, 84, 88];
		notes.forEach((m, i) => this._pluck(m, i * 0.07, 0.6));
	}

	// ---- Instruments ----
	_pluck(midi, when = 0, vel = 1) {
		const ctx = this.ctx, t = ctx.currentTime + when;
		const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
		lp.frequency.setValueAtTime(5200, t);
		lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.2 * vel, t + 0.005);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
		[['sawtooth', 0], ['square', 7]].forEach(([type, det]) => {
			const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(midi); o.detune.value = det;
			o.connect(lp); o.start(t); o.stop(t + 1);
		});
		lp.connect(g); g.connect(this.master); g.connect(this.delaySend);
	}
	note(i) {
		if (!this.ready) return;
		this._pluck(PAD_NOTES[i % PAD_NOTES.length]);
	}
	drum(kind) {
		if (!this.ready) return;
		const ctx = this.ctx, t = ctx.currentTime;
		if (kind === 'kick') {
			const o = ctx.createOscillator(); o.type = 'sine';
			o.frequency.setValueAtTime(160, t);
			o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
			const sh = ctx.createWaveShaper();
			const curve = new Float32Array(1024);
			for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.4); }
			sh.curve = curve;
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.9, t + 0.005);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
			o.connect(sh); sh.connect(g); g.connect(this.master);
			o.start(t); o.stop(t + 1.4);
		} else if (kind === 'snare') {
			this._noise(0.2, 'bandpass', 1900, 0.8, 0.5);
			this._tone('triangle', 190, 0.12, 0.25);
		} else {
			this._noise(0.05, 'highpass', 8500, 0.8, 0.28);
		}
	}
}
