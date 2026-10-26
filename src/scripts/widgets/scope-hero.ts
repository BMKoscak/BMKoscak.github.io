// Hero scope: press and hold to hear the figure. With sound on, the trace
// switches from maths to the real stereo signal (left = x, right = y).
import { sound } from '../audio';

export default function mount(box: HTMLElement) {
	const target = box.querySelector<HTMLElement>('[data-scope]') || box;
	const hint = box.querySelector<HTMLElement>('[data-scope-hint]');
	const ratio = () => (target.dataset.scope || '3:2').split(':').map(Number);
	let holding = false;

	const down = async (e: PointerEvent) => {
		if (e.button !== 0) return;
		if (!sound.on) {
			await sound.set(true);
		}
		holding = true;
		const [a, b] = ratio();
		sound.scopeStart(a, b, 110, 0.12);
		if (hint) hint.textContent = 'Listening. That figure is the sound.';
	};
	const move = (e: PointerEvent) => {
		const r = box.getBoundingClientRect();
		const nx = (e.clientX - r.left) / r.width;
		target.dataset.phase = (0.1 + nx * 0.5).toFixed(3);
		if (holding) sound.scopeDetune((nx - 0.5) * 8);
	};
	const up = () => {
		if (!holding) return;
		holding = false;
		sound.scopeStop();
		if (hint) hint.textContent = 'Press and hold to hear it';
	};
	box.addEventListener('pointerdown', down);
	box.addEventListener('pointermove', move);
	addEventListener('pointerup', up);
	box.addEventListener('pointerleave', up);
	return () => {
		up();
		box.removeEventListener('pointerdown', down);
		box.removeEventListener('pointermove', move);
		removeEventListener('pointerup', up);
		box.removeEventListener('pointerleave', up);
	};
}
