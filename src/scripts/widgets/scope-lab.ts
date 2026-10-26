import { sound } from '../audio';

export default function mount(root: HTMLElement) {
	const target = root.querySelector<HTMLElement>('[data-scope]')!;
	const a = root.querySelector<HTMLInputElement>('[name="ratio-a"]')!;
	const b = root.querySelector<HTMLInputElement>('[name="ratio-b"]')!;
	const ph = root.querySelector<HTMLInputElement>('[name="phase"]')!;
	const dr = root.querySelector<HTMLInputElement>('[name="drift"]')!;
	const listen = root.querySelector<HTMLButtonElement>('[data-listen]')!;
	const out = root.querySelectorAll<HTMLElement>('[data-out]');
	let on = false;

	const base = 110;
	const update = () => {
		target.dataset.a = a.value;
		target.dataset.b = b.value;
		target.dataset.phase = (Number(ph.value) / 360).toFixed(4);
		target.dataset.drift = (Number(dr.value) / 100).toFixed(3);
		const vals: Record<string, string> = {
			a: a.value,
			b: b.value,
			phase: `${ph.value}°`,
			drift: `${dr.value}`,
			fx: `${Math.round(base * Number(a.value))} Hz`,
			fy: `${Math.round(base * Number(b.value))} Hz`,
		};
		out.forEach((o) => (o.textContent = vals[o.dataset.out!] ?? ''));
		if (on) sound.scopeStart(Number(a.value), Number(b.value), base, 0.11);
	};
	const setListen = async (v: boolean) => {
		if (v && !sound.on) await sound.set(true);
		on = v && sound.on;
		listen.setAttribute('aria-pressed', String(on));
		listen.textContent = on ? 'Stop listening' : 'Listen to it';
		if (on) sound.scopeStart(Number(a.value), Number(b.value), base, 0.11);
		else sound.scopeStop();
	};
	const presets = root.querySelectorAll<HTMLButtonElement>('[data-preset]');
	const onPreset = (e: Event) => {
		const [pa, pb, pp] = (e.currentTarget as HTMLButtonElement).dataset.preset!.split(':');
		a.value = pa;
		b.value = pb;
		ph.value = pp;
		update();
	};
	[a, b, ph, dr].forEach((i) => i.addEventListener('input', update));
	presets.forEach((p) => p.addEventListener('click', onPreset));
	const onListen = () => setListen(!on);
	listen.addEventListener('click', onListen);
	update();
	return () => {
		sound.scopeStop();
		[a, b, ph, dr].forEach((i) => i.removeEventListener('input', update));
		presets.forEach((p) => p.removeEventListener('click', onPreset));
		listen.removeEventListener('click', onListen);
	};
}
