// Third-party players only load when the visitor asks for them, so they cost
// nothing on page load and set nothing in the browser until clicked.
export default function mount(root: HTMLElement) {
	const btn = root.querySelector('button');
	if (!btn) return;
	const load = () => {
		const f = document.createElement('iframe');
		f.src = root.dataset.src!;
		f.title = root.dataset.title || 'Embedded player';
		f.loading = 'lazy';
		f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
		root.replaceChildren(f);
	};
	btn.addEventListener('click', load, { once: true });
	return () => btn.removeEventListener('click', load);
}
