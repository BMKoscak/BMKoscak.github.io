// Interactive pieces declare themselves with data-widget="name". Each one is
// loaded on demand, mounted after every page load and torn down before the
// router swaps the page, so timers and audio never outlive their page.

type Cleanup = void | (() => void);
type Mount = (el: HTMLElement) => Cleanup;

const loaders: Record<string, () => Promise<{ default: Mount }>> = {
	scope: () => import('./scope-lab'),
	'scope-hero': () => import('./scope-hero'),
	pads: () => import('./pads'),
	mixer: () => import('./mixer'),
	viewfinder: () => import('./viewfinder'),
	leds: () => import('./leds'),
	alphabeta: () => import('./alphabeta'),
	dialogue: () => import('./dialogue'),
	embed: () => import('./embed'),
};

let active: (() => void)[] = [];

export async function mountWidgets() {
	const els = document.querySelectorAll<HTMLElement>('[data-widget]');
	for (const el of els) {
		const load = loaders[el.dataset.widget || ''];
		if (!load || el.dataset.mounted) continue;
		el.dataset.mounted = '1';
		try {
			const mod = await load();
			const c = mod.default(el);
			if (typeof c === 'function') active.push(c);
		} catch (err) {
			console.error('widget failed', el.dataset.widget, err);
		}
	}
}

export function unmountWidgets() {
	active.forEach((c) => {
		try {
			c();
		} catch {}
	});
	active = [];
}
