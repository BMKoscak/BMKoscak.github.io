// Minimax with and without alpha-beta pruning on the classic textbook tree:
// a MAX root, three MIN replies, nine leaf scores. Step through the search and
// watch which leaves never need to be looked at.
import { sound } from '../audio';

const LEAVES = [3, 12, 8, 2, 4, 6, 14, 5, 2];
type Ev = { kind: 'leaf' | 'min' | 'max' | 'prune'; i: number; v?: number };

function search(prune: boolean): { events: Ev[]; best: number } {
	const events: Ev[] = [];
	let alpha = -Infinity;
	let best = -Infinity;
	for (let m = 0; m < 3; m++) {
		let v = Infinity;
		for (let k = 0; k < 3; k++) {
			const i = m * 3 + k;
			if (prune && v <= alpha) {
				events.push({ kind: 'prune', i });
				continue;
			}
			events.push({ kind: 'leaf', i, v: LEAVES[i] });
			v = Math.min(v, LEAVES[i]);
		}
		events.push({ kind: 'min', i: m, v });
		best = Math.max(best, v);
		alpha = Math.max(alpha, v);
	}
	events.push({ kind: 'max', i: 0, v: best });
	return { events, best };
}

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
	const e = document.createElementNS(NS, tag);
	for (const k in attrs) e.setAttribute(k, String(attrs[k]));
	parent?.appendChild(e);
	return e;
};

export default function mount(root: HTMLElement) {
	const host = root.querySelector<HTMLElement>('[data-tree]')!;
	const toggle = root.querySelector<HTMLButtonElement>('[data-prune]')!;
	const stepBtn = root.querySelector<HTMLButtonElement>('[data-step-ab]')!;
	const runBtn = root.querySelector<HTMLButtonElement>('[data-run-ab]')!;
	const out = root.querySelector<HTMLElement>('[data-ab-out]')!;

	const W = 720,
		H = 300;
	const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Search tree with nine leaf scores' });
	host.replaceChildren(svg);
	const rootPos = { x: W / 2, y: 40 };
	const minPos = [0, 1, 2].map((m) => ({ x: 130 + m * 230, y: 140 }));
	const leafPos = LEAVES.map((_, i) => ({ x: minPos[Math.floor(i / 3)].x + ((i % 3) - 1) * 66, y: 250 }));
	const edges: SVGElement[] = [];
	minPos.forEach((p) => edges.push(el('line', { x1: rootPos.x, y1: rootPos.y, x2: p.x, y2: p.y, class: 'edge' }, svg)));
	leafPos.forEach((p, i) => {
		const m = minPos[Math.floor(i / 3)];
		edges.push(el('line', { x1: m.x, y1: m.y, x2: p.x, y2: p.y, class: 'edge leaf-edge' }, svg));
	});
	const node = (p: { x: number; y: number }, shape: 'up' | 'down' | 'box', label: string) => {
		const g = el('g', { class: 'node', transform: `translate(${p.x} ${p.y})` }, svg);
		if (shape === 'box') el('rect', { x: -20, y: -16, width: 40, height: 32 }, g);
		else el('path', { d: shape === 'up' ? 'M0 -22 L26 18 L-26 18 Z' : 'M0 22 L26 -18 L-26 -18 Z' }, g);
		const t = el('text', { 'text-anchor': 'middle', y: shape === 'box' ? 6 : shape === 'up' ? 12 : 2 }, g);
		t.textContent = label;
		return g;
	};
	const rootN = node(rootPos, 'up', '?');
	const minN = minPos.map((p) => node(p, 'down', '?'));
	const leafN = leafPos.map((p, i) => node(p, 'box', String(LEAVES[i])));

	let prune = true;
	let events = search(prune).events;
	let cursor = 0;
	let timer = 0;

	const reset = () => {
		clearTimeout(timer);
		timer = 0;
		runBtn.textContent = 'Run search';
		cursor = 0;
		events = search(prune).events;
		[rootN, ...minN, ...leafN].forEach((n) => n.classList.remove('seen', 'cut', 'done'));
		edges.forEach((e) => e.classList.remove('cut'));
		rootN.querySelector('text')!.textContent = '?';
		minN.forEach((n) => (n.querySelector('text')!.textContent = '?'));
		out.textContent = `Leaves looked at: 0 of 9. ${prune ? 'Pruning on.' : 'Pruning off.'}`;
	};
	const apply = (e: Ev) => {
		if (e.kind === 'leaf') {
			leafN[e.i].classList.add('seen');
			sound.blip(e.i % 4);
		} else if (e.kind === 'prune') {
			leafN[e.i].classList.add('cut');
			edges[3 + e.i].classList.add('cut');
		} else if (e.kind === 'min') {
			minN[e.i].classList.add('done');
			minN[e.i].querySelector('text')!.textContent = String(e.v);
		} else {
			rootN.classList.add('done');
			rootN.querySelector('text')!.textContent = String(e.v);
		}
		const seen = events.slice(0, cursor).filter((x) => x.kind === 'leaf').length;
		const done = cursor >= events.length;
		out.textContent = done
			? `Best move scores ${search(prune).best}. Leaves looked at: ${seen} of 9.`
			: `Leaves looked at: ${seen} of 9. ${prune ? 'Pruning on.' : 'Pruning off.'}`;
	};
	const step = () => {
		if (cursor >= events.length) reset();
		const e = events[cursor++];
		apply(e);
	};
	const run = () => {
		if (timer) {
			clearTimeout(timer);
			timer = 0;
			runBtn.textContent = 'Run search';
			return;
		}
		if (cursor >= events.length) reset();
		runBtn.textContent = 'Pause';
		const go = () => {
			step();
			if (cursor < events.length) timer = window.setTimeout(go, 420);
			else {
				timer = 0;
				runBtn.textContent = 'Run again';
			}
		};
		go();
	};
	const onToggle = () => {
		prune = !prune;
		toggle.setAttribute('aria-pressed', String(prune));
		toggle.textContent = prune ? 'Pruning: on' : 'Pruning: off';
		reset();
	};
	toggle.addEventListener('click', onToggle);
	stepBtn.addEventListener('click', step);
	runBtn.addEventListener('click', run);
	reset();
	return () => {
		clearTimeout(timer);
		toggle.removeEventListener('click', onToggle);
		stepBtn.removeEventListener('click', step);
		runBtn.removeEventListener('click', run);
	};
}
