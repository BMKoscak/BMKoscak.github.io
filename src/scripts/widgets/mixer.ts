// A two-source vision mixer: program and preview buses, CUT, AUTO (25 frames),
// a T-bar, and MIX or WIPE transitions. Tally follows whatever is on air.
import { sound } from '../audio';

export default function mount(root: HTMLElement) {
	const pgm = root.querySelector<HTMLElement>('[data-pgm]')!;
	const pvw = root.querySelector<HTMLElement>('[data-pvw]')!;
	const over = root.querySelector<HTMLElement>('[data-over]')!;
	const tbar = root.querySelector<HTMLInputElement>('[name="tbar"]')!;
	const cut = root.querySelector<HTMLButtonElement>('[data-cut]')!;
	const auto = root.querySelector<HTMLButtonElement>('[data-auto]')!;
	const types = [...root.querySelectorAll<HTMLButtonElement>('[data-type]')];
	const pvwBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-pvw-src]')];
	const pgmLabel = root.querySelector<HTMLElement>('[data-pgm-label]')!;
	const pvwLabel = root.querySelector<HTMLElement>('[data-pvw-label]')!;
	const log = root.querySelector<HTMLElement>('[data-log]')!;
	const sources = ['bars', 'cam1', 'cam2'];
	const names: Record<string, string> = { bars: 'Bars', cam1: 'Cam 1', cam2: 'Cam 2' };

	let onAir = 'bars';
	let next = 'cam1';
	let type: 'mix' | 'wipe' = 'mix';
	let raf = 0;

	const paint = () => {
		pgm.dataset.src = onAir;
		pvw.dataset.src = next;
		over.dataset.src = next;
		pgmLabel.textContent = names[onAir];
		pvwLabel.textContent = names[next];
		pvwBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pvwSrc === next)));
		root.querySelectorAll<HTMLElement>('[data-tally]').forEach((t) => t.classList.toggle('on', t.dataset.tally === onAir));
	};
	const setT = (v: number) => {
		const x = Math.max(0, Math.min(1, v));
		if (type === 'mix') {
			over.style.opacity = String(x);
			over.style.clipPath = 'none';
		} else {
			over.style.opacity = '1';
			over.style.clipPath = `inset(0 ${100 - x * 100}% 0 0)`;
		}
		// during a transition both sources are on air
		root.querySelectorAll<HTMLElement>('[data-tally]').forEach((t) =>
			t.classList.toggle('on', t.dataset.tally === onAir || (x > 0 && t.dataset.tally === next)),
		);
	};
	const complete = (how: string) => {
		const was = onAir;
		onAir = next;
		next = was;
		tbar.value = '0';
		setT(0);
		over.style.opacity = '0';
		paint();
		log.textContent = `${how}: ${names[onAir]} is on air.`;
		sound.take();
	};

	const onT = () => {
		const v = Number(tbar.value) / 100;
		setT(v);
		if (v >= 1) complete('T-bar');
	};
	const onCut = () => {
		cancelAnimationFrame(raf);
		complete('Cut');
	};
	const onAuto = () => {
		cancelAnimationFrame(raf);
		const frames = 25; // one second at 25 fps
		const start = performance.now();
		const from = Number(tbar.value) / 100;
		const tick = (now: number) => {
			const f = Math.min(1, from + (now - start) / 40 / frames);
			tbar.value = String(f * 100);
			setT(f);
			if (f < 1) raf = requestAnimationFrame(tick);
			else complete(`Auto, ${frames} frames`);
		};
		raf = requestAnimationFrame(tick);
	};
	const onType = (e: Event) => {
		type = (e.currentTarget as HTMLButtonElement).dataset.type as any;
		types.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
		setT(Number(tbar.value) / 100);
	};
	const onPvw = (e: Event) => {
		const s = (e.currentTarget as HTMLButtonElement).dataset.pvwSrc!;
		if (s === onAir) return;
		next = s;
		paint();
	};

	tbar.addEventListener('input', onT);
	cut.addEventListener('click', onCut);
	auto.addEventListener('click', onAuto);
	types.forEach((b) => b.addEventListener('click', onType));
	pvwBtns.forEach((b) => b.addEventListener('click', onPvw));
	paint();
	setT(0);
	void sources;
	return () => {
		cancelAnimationFrame(raf);
		tbar.removeEventListener('input', onT);
		cut.removeEventListener('click', onCut);
		auto.removeEventListener('click', onAuto);
		types.forEach((b) => b.removeEventListener('click', onType));
		pvwBtns.forEach((b) => b.removeEventListener('click', onPvw));
	};
}
