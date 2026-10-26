import { sound } from './audio';
import { startScope } from './scope';
// GSAP, ScrollTrigger and Lenis load after the page is idle, so they never
// compete with the first paint or the first interaction.
type Motion = typeof import('./motion');
let M: Motion | null = null;
const getLenis = () => M?.getLenis() ?? null;
const idle = (fn: () => void, timeout = 1500) =>
	'requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200);
import { mountWidgets, unmountWidgets } from './widgets';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function markJs() {
	root.classList.add('js');
	if (!reduced) root.classList.add('js-motion');
}

/* ---------------- sound toggle (persists across pages) ---------------- */
function reflectSound(on: boolean) {
	document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => {
		b.setAttribute('aria-pressed', String(on));
		const l = b.querySelector('[data-sound-label]');
		if (l) l.textContent = on ? 'Sound on' : 'Sound off';
	});
}
sound.onChange(reflectSound);

document.addEventListener('click', async (e) => {
	const t = e.target as HTMLElement;
	if (t.closest('[data-sound-toggle]')) {
		await sound.set(!sound.on);
		sound.click();
		announce(sound.on ? 'Sound on' : 'Sound off');
		return;
	}
	if (t.closest('a, button, [role="button"], input[type="range"], summary')) sound.click();
});
document.addEventListener('pointerover', (e) => {
	const t = (e.target as HTMLElement).closest?.('a, button');
	if (t && !t.contains(e.relatedTarget as Node)) sound.hover();
});

function announce(msg: string) {
	const a = document.querySelector('[data-announcer]');
	if (a) {
		a.textContent = '';
		requestAnimationFrame(() => (a.textContent = msg));
	}
}

/* ---------------- Ljubljana clock ---------------- */
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Ljubljana' });
function tickClock() {
	const s = fmt.format(new Date());
	document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = s));
}
setInterval(tickClock, 15000);

/* ---------------- mobile menu ---------------- */
document.addEventListener('click', (e) => {
	const btn = (e.target as HTMLElement).closest('[data-menu]');
	const nav = document.getElementById('site-nav');
	if (!nav) return;
	if (btn) {
		const open = !nav.classList.contains('open');
		nav.classList.toggle('open', open);
		btn.setAttribute('aria-expanded', String(open));
		btn.textContent = open ? 'Close' : 'Menu';
		open ? getLenis()?.stop() : getLenis()?.start();
	}
});
function closeMenu() {
	document.getElementById('site-nav')?.classList.remove('open');
	const b = document.querySelector('[data-menu]');
	if (b) {
		b.setAttribute('aria-expanded', 'false');
		b.textContent = 'Menu';
	}
}

/* ---------------- command palette ---------------- */
let paletteBound: HTMLDialogElement | null = null;
function bindPalette() {
	const dlg = document.querySelector<HTMLDialogElement>('[data-palette]');
	if (!dlg || dlg === paletteBound) return;
	paletteBound = dlg;
	const input = dlg.querySelector('input')!;
	const opts = () => [...dlg.querySelectorAll<HTMLButtonElement>('li button')].filter((b) => !b.closest('li')!.hidden);
	let idx = 0;
	const select = (i: number) => {
		const list = opts();
		if (!list.length) return;
		idx = (i + list.length) % list.length;
		list.forEach((b, j) => b.setAttribute('aria-selected', String(j === idx)));
		list[idx].scrollIntoView({ block: 'nearest' });
	};
	const filter = () => {
		const q = input.value.trim().toLowerCase();
		dlg.querySelectorAll('li').forEach((li) => {
			li.hidden = !!q && !li.textContent!.toLowerCase().includes(q);
		});
		select(0);
	};
	const run = async (b: HTMLButtonElement) => {
		const href = b.dataset.href;
		const action = b.dataset.action;
		dlg.close();
		if (action === 'sound') {
			await sound.set(!sound.on);
			announce(sound.on ? 'Sound on' : 'Sound off');
		} else if (action === 'copy') {
			try {
				await navigator.clipboard.writeText(location.href);
				announce('Link copied');
			} catch {}
		} else if (href) {
			if (href.startsWith('http')) window.open(href, '_blank', 'noopener');
			else {
				const { navigate } = await import('astro:transitions/client');
				navigate(href);
			}
		}
	};
	input.addEventListener('input', filter);
	dlg.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			select(idx + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			select(idx - 1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const b = opts()[idx];
			if (b) run(b);
		}
	});
	dlg.addEventListener('click', (e) => {
		const b = (e.target as HTMLElement).closest<HTMLButtonElement>('li button');
		if (b) run(b);
		else if (e.target === dlg) dlg.close();
	});
	dlg.addEventListener('close', () => getLenis()?.start());
}
function openPalette() {
	const dlg = document.querySelector<HTMLDialogElement>('[data-palette]');
	if (!dlg || dlg.open) return;
	bindPalette();
	const input = dlg.querySelector('input')!;
	input.value = '';
	input.dispatchEvent(new Event('input'));
	getLenis()?.stop();
	dlg.showModal();
	input.focus();
}
document.addEventListener('click', (e) => {
	if ((e.target as HTMLElement).closest('[data-palette-open]')) openPalette();
});
document.addEventListener('keydown', (e) => {
	const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]');
	if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
		e.preventDefault();
		openPalette();
	}
});

/* ---------------- contact form (Formspree, no reload) ---------------- */
function bindForm() {
	const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
	if (!form || form.dataset.bound) return;
	form.dataset.bound = '1';
	const status = form.querySelector<HTMLElement>('[data-form-status]')!;
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		status.textContent = 'Sending…';
		btn.disabled = true;
		try {
			const res = await fetch(form.action, {
				method: 'POST',
				body: new FormData(form),
				headers: { Accept: 'application/json' },
			});
			if (!res.ok) throw new Error(String(res.status));
			form.reset();
			status.textContent = 'Message sent. I’ll reply to the email you gave.';
			status.dataset.state = 'ok';
			sound.blip(4);
		} catch {
			status.textContent = 'Message not sent. Check your connection and try again, or message me on Instagram or X.';
			status.dataset.state = 'err';
		} finally {
			btn.disabled = false;
		}
	});
}

/* ---------------- analytics (GoatCounter, cookieless, only if configured) ---------------- */
function countPage(tries = 0) {
	if (!document.querySelector('script[data-goatcounter]')) return;
	const gc = (window as any).goatcounter;
	if (gc?.count) gc.count({ path: location.pathname });
	else if (tries < 10) setTimeout(() => countPage(tries + 1), 500);
}

/* ---------------- lifecycle ---------------- */
function onPage() {
	markJs();
	tickClock();
	reflectSound(sound.on);
	closeMenu();
	bindPalette();
	bindForm();
	mountWidgets();
	M?.initPageMotion();
	countPage();
}

if (document.readyState === 'complete') boot();
else addEventListener('load', boot, { once: true });
function boot() {
	document.fonts.ready.then(() => idle(() => startScope(), 1200));
	idle(async () => {
		M = await import('./motion');
		M.initSmoothScroll();
		M.initPageMotion();
	}, 2500);
}

document.addEventListener('astro:before-swap', () => {
	M?.beforeSwap();
	unmountWidgets();
	sound.scopeStop();
});
document.addEventListener('astro:after-swap', () => {
	markJs();
	M?.afterSwap();
	sound.navigate();
});
document.addEventListener('astro:page-load', onPage);

// restore the visitor's sound choice; the browser only allows audio after a gesture
if (sound.wanted) {
	const resume = (e: Event) => {
		if ((e.target as HTMLElement)?.closest?.('[data-sound-toggle]')) return;
		sound.set(true);
		removeEventListener('pointerdown', resume);
		removeEventListener('keydown', resume);
	};
	addEventListener('pointerdown', resume);
	addEventListener('keydown', resume);
}
