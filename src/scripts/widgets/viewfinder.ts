// Camera viewfinder: framing guides, broadcast safe areas, zebra exposure
// warning, a focus box that follows the pointer, and a shutter.
import { sound } from '../audio';

export default function mount(root: HTMLElement) {
	const frame = root.querySelector<HTMLElement>('[data-frame]')!;
	const focus = root.querySelector<HTMLElement>('[data-focus]')!;
	const shots = root.querySelector<HTMLElement>('[data-shots]')!;
	const tc = root.querySelector<HTMLElement>('[data-tc]')!;
	const toggles = [...root.querySelectorAll<HTMLButtonElement>('[data-toggle]')];
	const shutterBtn = root.querySelector<HTMLButtonElement>('[data-shutter]')!;
	let count = 0;
	const t0 = performance.now();
	let raf = 0;

	const pad = (n: number) => String(n).padStart(2, '0');
	const loop = (now: number) => {
		const f = Math.floor((now - t0) / 40);
		tc.textContent = `${pad(Math.floor(f / 90000))}:${pad(Math.floor(f / 1500) % 60)}:${pad(Math.floor(f / 25) % 60)}:${pad(f % 25)}`;
		raf = requestAnimationFrame(loop);
	};
	raf = requestAnimationFrame(loop);

	const onMove = (e: PointerEvent) => {
		const r = frame.getBoundingClientRect();
		const x = Math.min(Math.max(e.clientX - r.left, 40), r.width - 40);
		const y = Math.min(Math.max(e.clientY - r.top, 30), r.height - 30);
		focus.style.left = '0';
		focus.style.top = '0';
		focus.style.transform = `translate(${x}px, ${y}px)`;
		focus.classList.remove('locked');
	};
	const shoot = () => {
		sound.shutter();
		frame.classList.remove('snap');
		void frame.offsetWidth;
		frame.classList.add('snap');
		focus.classList.add('locked');
		count++;
		shots.textContent = `${count} ${count === 1 ? 'shot' : 'shots'}`;
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			shoot();
		}
	};
	const onToggle = (e: Event) => {
		const b = e.currentTarget as HTMLButtonElement;
		const on = b.getAttribute('aria-pressed') !== 'true';
		b.setAttribute('aria-pressed', String(on));
		frame.classList.toggle(`show-${b.dataset.toggle}`, on);
	};
	toggles.forEach((b) => {
		if (b.getAttribute('aria-pressed') === 'true') frame.classList.add(`show-${b.dataset.toggle}`);
		b.addEventListener('click', onToggle);
	});
	frame.addEventListener('pointermove', onMove);
	frame.addEventListener('click', shoot);
	frame.addEventListener('keydown', onKey);
	shutterBtn.addEventListener('click', shoot);
	return () => {
		cancelAnimationFrame(raf);
		toggles.forEach((b) => b.removeEventListener('click', onToggle));
		frame.removeEventListener('pointermove', onMove);
		frame.removeEventListener('click', shoot);
		frame.removeEventListener('keydown', onKey);
		shutterBtn.removeEventListener('click', shoot);
	};
}
