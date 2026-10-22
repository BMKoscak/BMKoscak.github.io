import { Sound } from './audio.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = innerWidth < 760 || !finePointer;

const sound = new Sound();
let stage = null;
const STAGES = ['Standby', 'Lens', 'Sound', 'Broadcast', 'Code', 'Wrap'];
const TONES = ['var(--paper)', 'var(--lens)', 'var(--sound)', 'var(--broadcast)', 'var(--code)', 'var(--paper)'];

$('#year').textContent = new Date().getFullYear();

/* ---------- Stage (3D) ---------- */
const stageReady = (async () => {
	try {
		const test = document.createElement('canvas');
		if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
		const { createStage } = await import('./scene.js');
		stage = await createStage($('#stage'), { reducedMotion, mobile });
	} catch (err) {
		console.warn('3D stage unavailable:', err);
		document.documentElement.classList.add('no-webgl');
	}
})();

/* ---------- Sound toggle ---------- */
const toggle = $('#soundToggle');
function reflectSound() {
	document.documentElement.classList.toggle('sound-on', sound.on);
	toggle.setAttribute('aria-pressed', String(sound.on));
	$('.sound-label', toggle).textContent = sound.on ? 'Sound on' : 'Sound off';
}
toggle.addEventListener('click', async () => {
	await sound.enable(!sound.on);
	sound.setChord(currentStage);
	reflectSound();
	sound.blip(2);
});

/* ---------- Gate: film leader ---------- */
const gate = $('#gate');
let started = false;
async function enter(withSound) {
	if (started) return;
	started = true;
	await sound.enable(withSound);
	reflectSound();
	const num = $('#leaderNum');
	const sweepTo = (deg) => gate.style.setProperty('--sweep', deg + 'deg');

	if (!reducedMotion) {
		gate.classList.add('is-counting');
		for (const n of [3, 2]) {
			num.textContent = n;
			if (n === 2) sound.beep(); else sound.tick();
			const t0 = performance.now();
			await new Promise((res) => {
				const step = (now) => {
					const p = Math.min(1, (now - t0) / 520);
					sweepTo(p * 360);
					p < 1 ? requestAnimationFrame(step) : res();
				};
				requestAnimationFrame(step);
			});
		}
	}
	$('#flash').classList.add('go');
	sound.whoosh(1.2);
	gate.classList.add('is-gone');
	document.body.classList.add('is-live');
	startClock();
	await stageReady;
	stage?.burst(1.2);
	stage?.glitch(0.8);
	setTimeout(() => gate.remove(), 700);
}
$('#enterSound').addEventListener('click', () => enter(true));
$('#enterSilent').addEventListener('click', () => enter(false));
$('#enterSound').focus({ preventScroll: true });
document.body.classList.add('gate-open');

/* ---------- Timecode (25 fps, PAL, naturally) ---------- */
let clockStart = 0;
function startClock() { clockStart = performance.now(); }
const tcEls = [$('#timecode'), $('#vfTc')];
const pad = (n) => String(n).padStart(2, '0');
function timecode(ms) {
	const frames = Math.floor(ms / 40);
	return `${pad(Math.floor(frames / 90000))}:${pad(Math.floor(frames / 1500) % 60)}:${pad(Math.floor(frames / 25) % 60)}:${pad(frames % 25)}`;
}

/* ---------- Scroll → which link of the chain we're on ---------- */
const anchors = $$('[data-shape]').map((el) => ({ el, k: +el.dataset.shape }));
let currentStage = 0;
let lastY = scrollY, scrollVel = 0;
const rail = $('.rail');
const railItems = $$('.rail li');

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Each section holds its shape while it fills the screen and morphs into the next one
// over the last stretch of the section (or across the gap between two sections).
function measure() {
	const mid = innerHeight * 0.55;
	const rects = anchors.map(({ el, k }) => { const r = el.getBoundingClientRect(); return { k, top: r.top, bottom: r.bottom }; });
	let i = -1;
	for (let j = 0; j < rects.length; j++) if (rects[j].top <= mid) i = j;
	if (i < 0) return rects[0].k;
	const a = rects[i], b = rects[i + 1];
	if (!b) return a.k;
	// morph window ends where the next section starts and is at least 40% of a screen tall
	const start = Math.max(a.top, Math.min(a.bottom, b.top - innerHeight * 0.4));
	return a.k + (b.k - a.k) * smooth(start, b.top, mid);
}

function onStageChange(i) {
	currentStage = i;
	document.documentElement.style.setProperty('--tone', TONES[i]);
	$('#stageName').textContent = STAGES[i];
	sound.setChord(i);
	if (started) { sound.whoosh(0.7); stage?.glitch(0.35); }
	railItems.forEach((li) => {
		const n = +li.dataset.node;
		li.classList.toggle('is-active', n === i);
		li.classList.toggle('is-done', n < i);
	});
}

function onScroll() {
	const p = measure();
	stage?.setTarget(p);
	const i = Math.round(p);
	if (i !== currentStage) onStageChange(i);
	if (rail) rail.style.setProperty('--rail', Math.max(0, Math.min(1, (p - 1) / 3)).toFixed(3));
	creditsRoll();
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

/* ---------- Main loop: HUD, velocity, audio → particles, hero weight ---------- */
const heroWords = $$('.ht-word');
let audioAvg = 0;
function loop(now) {
	requestAnimationFrame(loop);
	if (clockStart) { const tc = timecode(now - clockStart); tcEls.forEach((el) => el && (el.textContent = tc)); }
	const dy = scrollY - lastY; lastY = scrollY;
	scrollVel += (dy - scrollVel) * 0.2;
	stage?.setVelocity(scrollVel);
	// only transients (pads, drums, clicks) push the particles, not the steady drone
	const lvl = sound.level();
	audioAvg += (lvl - audioAvg) * 0.03;
	stage?.setAudio(Math.max(0, lvl - audioAvg * 1.2) * 3);
	// The hero lettering thins out as you scroll away from it
	const hp = Math.min(1, scrollY / (innerHeight * 0.8));
	const w = Math.round(900 - hp * 750);
	heroWords.forEach((el) => el.style.setProperty('--wght', w));
	moveCursor();
}
requestAnimationFrame(loop);

/* ---------- Pointer → particles + custom cursor ---------- */
const cursor = $('#cursor');
const cursorLabel = $('.cursor-label', cursor);
const cur = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
const LABELS = { shoot: 'Shoot', play: 'Play', drag: 'Drag' };
if (finePointer) document.documentElement.classList.add('has-cursor');
addEventListener('pointermove', (e) => {
	cur.tx = e.clientX; cur.ty = e.clientY;
	stage?.setPointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, e.pointerType === 'mouse' ? 1 : 0.6);
	const target = e.target.closest?.('[data-cursor], a, button');
	const mode = target ? (target.dataset.cursor || 'link') : '';
	if (cursor.dataset.mode !== mode) {
		cursor.dataset.mode = mode;
		cursorLabel.textContent = LABELS[mode] || '';
	}
}, { passive: true });
document.addEventListener('pointerleave', () => { cursor.classList.add('is-hidden'); stage?.setPointer(0, 0, 0); });
document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
function moveCursor() {
	if (!finePointer) return;
	cur.x += (cur.tx - cur.x) * 0.25; cur.y += (cur.ty - cur.y) * 0.25;
	cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
}

// Hover sounds on anything interactive
document.addEventListener('pointerover', (e) => {
	const t = e.target.closest('a, button, .edl-row, [role="button"]');
	if (!t || t.contains(e.relatedTarget)) return;
	if (t.classList.contains('edl-row')) sound.tick();
	else sound.blip((t.getBoundingClientRect().left / innerWidth) * 3);
});

/* ---------- Hero: role scramble ---------- */
const roles = ['music producer', 'filmmaker', 'photographer'];
const scrambleEl = $('#scramble');
const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
let roleIdx = 0;
function scrambleTo(text) {
	const from = scrambleEl.textContent, len = Math.max(from.length, text.length);
	const q = Array.from({ length: len }, (_, i) => ({ from: from[i] || '', to: text[i] || '', start: Math.random() * 12, end: 12 + Math.random() * 18 }));
	let f = 0;
	const tick = () => {
		let out = '', done = 0;
		for (const c of q) {
			if (f >= c.end) { done++; out += c.to; }
			else if (f >= c.start) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
			else out += c.from;
		}
		scrambleEl.textContent = out;
		if (done < q.length) { f++; requestAnimationFrame(tick); }
	};
	tick();
}
if (!reducedMotion) setInterval(() => { if (document.hidden) return; roleIdx = (roleIdx + 1) % roles.length; scrambleTo(roles[roleIdx]); }, 3200);

/* ---------- Chapter 1: viewfinder ---------- */
const vf = $('#viewfinder');
const focus = $('#vfFocus');
let shots = 0;
vf.addEventListener('pointermove', (e) => {
	const r = vf.getBoundingClientRect();
	const x = Math.min(Math.max(e.clientX - r.left, 50), r.width - 50);
	const y = Math.min(Math.max(e.clientY - r.top, 40), r.height - 70);
	focus.style.left = x + 'px'; focus.style.top = y + 'px';
});
function shoot() {
	sound.shutter();
	vf.classList.remove('snap'); void vf.offsetWidth; vf.classList.add('snap');
	const fl = $('#flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
	shots++; $('#vfShots').textContent = `${shots} shot${shots === 1 ? '' : 's'}`;
	stage?.burst(0.5);
}
vf.addEventListener('click', shoot);
vf.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shoot(); } });

/* ---------- Chapter 2: pads ---------- */
const padsHint = $('#padsHint');
async function hitPad(btn) {
	if (!sound.on) {
		await sound.enable(true); reflectSound(); sound.setChord(currentStage);
		padsHint.textContent = 'Sound switched on. Keep playing.';
	}
	btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
	setTimeout(() => btn.classList.remove('hit'), 110);
	if (btn.dataset.drum) { sound.drum(btn.dataset.drum); if (btn.dataset.drum === 'kick') stage?.burst(0.35); }
	else sound.note(+btn.dataset.note);
}
$$('.pad').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); hitPad(b); }));
$$('.pad').forEach((b) => b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hitPad(b); } }));
const keyMap = Object.fromEntries($$('.pad').map((b) => [b.dataset.key, b]));
addEventListener('keydown', (e) => {
	if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
	if (e.target.closest('input, textarea, select, [contenteditable]')) return;
	if (!started) return;
	const b = keyMap[e.key.toLowerCase()];
	if (b) hitPad(b);
});

/* ---------- Chapter 3: switcher ---------- */
const tbar = $('#tbar'), pgm = $('#swPgm');
let onAir = false;
function setAir(v) {
	if (v === onAir) return;
	onAir = v; pgm.classList.toggle('on-air', v);
	if (v) { sound.take(); stage?.glitch(0.6); }
}
tbar.addEventListener('input', () => {
	const v = tbar.value / 100;
	pgm.style.setProperty('--mix', v);
	stage?.setWall(v);
	setAir(v > 0.5);
	sound.tick();
});
pgm.style.setProperty('--mix', 0);
let barsMode = 0;
$('#take').addEventListener('click', () => {
	barsMode = 1 - barsMode;
	stage?.setBarsMix(barsMode);
	stage?.glitch(1);
	tbar.value = 100; tbar.dispatchEvent(new Event('input'));
	sound.take();
	$('#swHint').textContent = barsMode ? 'Cut to the live feed. Hit Take again for bars.' : 'Back to bars. Every show starts here.';
});

/* ---------- Chapter 4: terminal ---------- */
const CODE = [
	['k', 'import'], ['', ' { lens, sound, broadcast } '], ['k', 'from'], ['s', " './past.js'"], ['', ';\n\n'],
	['k', 'const'], ['', ' ben = '], ['f', 'chain'], ['', '(lens, sound, broadcast)\n'],
	['', '  .'], ['f', 'into'], ['', '(code)\n'],
	['', '  .'], ['f', 'render'], ['', '({ fps: '], ['n', '25'], ['', ', format: '], ['s', "'PAL'"], ['', ' });\n\n'],
	['c', '// press Run'],
];
const codeEl = $('#termCode');
let typed = false;
function typeCode(instant) {
	if (typed) return; typed = true;
	const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	const full = CODE.reduce((n, [, t]) => n + t.length, 0);
	let shown = 0;
	const render = () => {
		let left = shown, html = '';
		for (const [cls, t] of CODE) {
			if (left <= 0) break;
			const part = esc(t.slice(0, left)); left -= t.length;
			html += cls ? `<span class="tk-${cls}">${part}</span>` : part;
		}
		codeEl.innerHTML = html + '<span class="caret"></span>';
	};
	if (instant) { shown = full; render(); return; }
	const step = () => {
		shown = Math.min(full, shown + 2); render();
		if (shown % 6 === 0) sound.tick();
		if (shown < full) setTimeout(step, 28);
	};
	step();
}
new IntersectionObserver((entries, obs) => {
	if (entries.some((e) => e.isIntersecting)) { typeCode(reducedMotion); obs.disconnect(); }
}, { threshold: 0.4 }).observe($('#terminal'));
let runs = 0;
$('#runCode').addEventListener('click', () => {
	typeCode(true);
	runs++;
	stage?.burst(1.4); stage?.glitch(0.5);
	sound.arp();
	const n = stage ? stage.count.toLocaleString('en-US') : 'zero';
	$('#termOut').textContent = runs === 1
		? `✓ rendered ${n} particles at 25 fps`
		: `✓ rendered again. Run #${runs}, still no dropped frames`;
});

/* ---------- Credits roll, driven by scroll ---------- */
const credits = $('#credits'), roll = $('#creditsRoll');
function creditsRoll() {
	if (!credits) return;
	const r = credits.getBoundingClientRect();
	const total = r.height - innerHeight;
	const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
	const distance = roll.offsetHeight + innerHeight * 0.75;
	roll.style.setProperty('--roll', (p * distance).toFixed(1));
}

/* ---------- Contact form (Formspree, no page reload) ---------- */
const form = $('#contactForm'), statusEl = $('#formStatus');
form.addEventListener('submit', async (e) => {
	e.preventDefault();
	if (form.dataset.preview) {
		statusEl.className = 'form-status';
		statusEl.textContent = 'This is a preview, so nothing was sent. The form sends for real on thebenn.me.';
		return;
	}
	statusEl.className = 'form-status';
	statusEl.textContent = 'Sending…';
	const btn = $('button[type="submit"]', form); btn.disabled = true;
	try {
		const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
		if (!res.ok) throw new Error(String(res.status));
		form.reset();
		statusEl.classList.add('ok');
		statusEl.textContent = 'Message sent. I’ll reply by email.';
		sound.arp(); stage?.burst(0.8);
	} catch (err) {
		statusEl.classList.add('err');
		statusEl.textContent = 'Message not sent. Check your connection, or email beni.koscak@gmail.com directly.';
	} finally { btn.disabled = false; }
});

onScroll();
