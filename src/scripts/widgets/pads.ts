// Pads plus a 16-step sequencer. Notes are A minor pentatonic so nothing clashes.
import { sound } from '../audio';

const NOTES = [57, 60, 62, 64, 67, 69, 72, 74];
const ROWS = ['kick', 'snare', 'hat', 'clap'] as const;

export default function mount(root: HTMLElement) {
	const pads = [...root.querySelectorAll<HTMLButtonElement>('[data-note], [data-drum]')];
	const steps = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
	const play = root.querySelector<HTMLButtonElement>('[data-play]')!;
	const tempo = root.querySelector<HTMLInputElement>('[name="tempo"]')!;
	const tempoOut = root.querySelector<HTMLElement>('[data-tempo-out]')!;
	const clear = root.querySelector<HTMLButtonElement>('[data-clear]')!;
	const hint = root.querySelector<HTMLElement>('[data-hint]')!;
	const keyMap = new Map(pads.map((p) => [p.dataset.key!, p]));

	const flash = (el: HTMLElement) => {
		el.classList.remove('hit');
		void el.offsetWidth;
		el.classList.add('hit');
	};
	const ensure = async () => {
		if (!sound.on) {
			await sound.set(true);
			hint.textContent = 'Sound is on. Keep playing.';
		}
	};
	const hit = async (p: HTMLButtonElement) => {
		await ensure();
		flash(p);
		if (p.dataset.drum) sound.drum(p.dataset.drum as any);
		else sound.pluck(NOTES[Number(p.dataset.note)]);
	};

	const onPad = (e: PointerEvent) => {
		e.preventDefault();
		hit(e.currentTarget as HTMLButtonElement);
	};
	const onPadKey = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			hit(e.currentTarget as HTMLButtonElement);
		}
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
		if ((e.target as HTMLElement).closest('input, textarea, select, dialog')) return;
		const p = keyMap.get(e.key.toLowerCase());
		if (p) hit(p);
	};
	pads.forEach((p) => {
		p.addEventListener('pointerdown', onPad);
		p.addEventListener('keydown', onPadKey);
	});
	addEventListener('keydown', onKey);

	// sequencer
	const pattern = steps.map((s) => s.getAttribute('aria-pressed') === 'true');
	const onStep = (e: Event) => {
		const s = e.currentTarget as HTMLButtonElement;
		const i = steps.indexOf(s);
		pattern[i] = !pattern[i];
		s.setAttribute('aria-pressed', String(pattern[i]));
	};
	steps.forEach((s) => s.addEventListener('click', onStep));

	let timer = 0;
	let step = 0;
	let nextTime = 0;
	const spb = () => 60 / Number(tempo.value) / 4;
	const schedule = () => {
		const ctx = sound.ctx;
		if (!ctx) return;
		while (nextTime < ctx.currentTime + 0.12) {
			const when = nextTime - ctx.currentTime;
			ROWS.forEach((row, r) => {
				if (pattern[r * 16 + step]) sound.drum(row, Math.max(0, when));
			});
			const col = step;
			setTimeout(() => {
				steps.forEach((s, i) => s.classList.toggle('now', i % 16 === col));
			}, Math.max(0, when * 1000));
			step = (step + 1) % 16;
			nextTime += spb();
		}
		timer = window.setTimeout(schedule, 25);
	};
	const stop = () => {
		clearTimeout(timer);
		timer = 0;
		steps.forEach((s) => s.classList.remove('now'));
		play.setAttribute('aria-pressed', 'false');
		play.textContent = 'Play loop';
	};
	const onPlay = async () => {
		if (timer) return stop();
		await ensure();
		if (!sound.ctx) return;
		step = 0;
		nextTime = sound.ctx.currentTime + 0.05;
		play.setAttribute('aria-pressed', 'true');
		play.textContent = 'Stop loop';
		schedule();
	};
	const onTempo = () => (tempoOut.textContent = tempo.value);
	const onClear = () => {
		pattern.fill(false);
		steps.forEach((s) => s.setAttribute('aria-pressed', 'false'));
	};
	play.addEventListener('click', onPlay);
	tempo.addEventListener('input', onTempo);
	clear.addEventListener('click', onClear);

	return () => {
		stop();
		removeEventListener('keydown', onKey);
		pads.forEach((p) => {
			p.removeEventListener('pointerdown', onPad);
			p.removeEventListener('keydown', onPadKey);
		});
		steps.forEach((s) => s.removeEventListener('click', onStep));
		play.removeEventListener('click', onPlay);
		tempo.removeEventListener('input', onTempo);
		clear.removeEventListener('click', onClear);
	};
}
