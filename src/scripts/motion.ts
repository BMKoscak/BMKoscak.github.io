// One Lenis instance for the whole visit, driven by GSAP's ticker so smooth
// scroll and ScrollTrigger share a single frame loop. Page-level tweens live in
// a gsap.context() that is reverted before the router swaps the DOM and rebuilt
// after it, so nothing leaks or double-binds between pages.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let lenis: Lenis | null = null;
let ctx: gsap.Context | null = null;

export function getLenis() {
	return lenis;
}

export function initSmoothScroll() {
	if (reduced.matches || lenis) return;
	lenis = new Lenis({ autoRaf: false, syncTouch: false, lerp: 0.1, anchors: { offset: -72 } });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis?.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);
}

export function initPageMotion() {
	ctx?.revert();
	if (reduced.matches) return;
	ctx = gsap.context(() => {
		// marker scribbles draw themselves once
		gsap.utils.toArray<SVGPathElement>('.scribble path').forEach((p) => {
			const len = p.getTotalLength();
			gsap.fromTo(
				p,
				{ strokeDasharray: len, strokeDashoffset: len },
				{
					strokeDashoffset: 0,
					duration: 0.9,
					ease: 'power2.inOut',
					scrollTrigger: { trigger: p.closest('.scribble') || p, start: 'top 88%', once: true },
				},
			);
		});

		// the hero wordmark narrows as it leaves: width axis tied to scroll
		const mark = document.querySelector<HTMLElement>('[data-wordmark]');
		if (mark) {
			const set = gsap.quickSetter(mark, '--wd') as (v: number) => void;
			ScrollTrigger.create({
				trigger: mark,
				start: 'top top+=60',
				end: 'bottom top',
				scrub: true,
				onUpdate: (self) => set(125 - self.progress * 55),
			});
		}

		// parallax on elements that ask for it
		gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((node) => {
			const speed = parseFloat(node.dataset.parallax || '0.5');
			const setY = gsap.quickSetter(node, 'y', 'px') as (v: number) => void;
			ScrollTrigger.create({
				trigger: node,
				start: 'top bottom',
				end: 'bottom top',
				scrub: true,
				onUpdate: (self) => setY((self.progress - 0.5) * 120 * speed),
			});
		});
	});
	requestAnimationFrame(() => ScrollTrigger.refresh());
	document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

export function beforeSwap() {
	lenis?.stop();
	ctx?.revert();
	ctx = null;
}

export function afterSwap() {
	if (lenis) {
		document.documentElement.classList.add('lenis', 'lenis-smooth');
		lenis.scrollTo(window.scrollY, { immediate: true, force: true });
		lenis.resize();
		lenis.start();
	}
}
