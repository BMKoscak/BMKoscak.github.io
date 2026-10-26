// A visual novel scene in miniature: a script of nodes, a typewriter text box,
// choices that branch, and a notebook that remembers clues across branches.
import { sound } from '../audio';

type Node = { who: string; text: string; clue?: string; next?: string; choices?: { label: string; to: string }[] };

const SCENE: Record<string, Node> = {
	start: {
		who: 'Narrator',
		text: 'Midday on the island. The beach bar is empty except for the owner, who keeps polishing the same glass.',
		next: 'owner',
	},
	owner: {
		who: 'Owner',
		text: 'He left before the storm, I swear. Paid in cash, took his drink to the pier.',
		choices: [
			{ label: 'Ask about the cash', to: 'cash' },
			{ label: 'Walk to the pier', to: 'pier' },
		],
	},
	cash: {
		who: 'Owner',
		text: 'A fifty. Dry as a bone, which is funny, because it had been pouring for an hour.',
		clue: 'A dry banknote after an hour of rain',
		next: 'think',
	},
	pier: {
		who: 'Narrator',
		text: 'On the pier: one glass, still upright. Not a drop of rain in it.',
		clue: 'An empty glass on the pier, untouched by the storm',
		next: 'think',
	},
	think: {
		who: 'Detective',
		text: 'Whatever happened here, it happened after the rain stopped. Somebody is lying about the time.',
		choices: [{ label: 'Play the scene again', to: 'start' }],
	},
};

export default function mount(root: HTMLElement) {
	const who = root.querySelector<HTMLElement>('[data-who]')!;
	const text = root.querySelector<HTMLElement>('[data-text]')!;
	const choices = root.querySelector<HTMLElement>('[data-choices]')!;
	const notebook = root.querySelector<HTMLElement>('[data-notebook]')!;
	const box = root.querySelector<HTMLElement>('[data-box]')!;
	const clues = new Set<string>();
	let timer = 0;
	let full = '';
	let id = 'start';
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	const renderNotebook = () => {
		notebook.replaceChildren(
			...(clues.size
				? [...clues].map((c) => {
						const li = document.createElement('li');
						li.textContent = c;
						return li;
					})
				: [Object.assign(document.createElement('li'), { textContent: 'No clues yet.', className: 'empty' })]),
		);
	};
	const showChoices = () => {
		const n = SCENE[id];
		choices.replaceChildren();
		const opts = n.choices || [{ label: 'Continue', to: n.next! }];
		opts.forEach((o) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'btn';
			b.textContent = o.label;
			b.addEventListener('click', () => go(o.to));
			choices.appendChild(b);
		});
	};
	const finish = () => {
		clearInterval(timer);
		timer = 0;
		text.textContent = full;
		showChoices();
	};
	const go = (to: string) => {
		if (to === 'start' && id === 'think') clues.clear();
		id = to;
		const n = SCENE[id];
		if (n.clue) clues.add(n.clue);
		renderNotebook();
		who.textContent = n.who;
		full = n.text;
		choices.replaceChildren();
		if (reduced) return finish();
		let i = 0;
		text.textContent = '';
		clearInterval(timer);
		timer = window.setInterval(() => {
			i += 2;
			text.textContent = full.slice(0, i);
			if (i % 6 === 0) sound.hover();
			if (i >= full.length) finish();
		}, 24);
	};
	const skip = () => {
		if (timer) finish();
	};
	box.addEventListener('click', skip);
	go('start');
	return () => {
		clearInterval(timer);
		box.removeEventListener('click', skip);
	};
}
