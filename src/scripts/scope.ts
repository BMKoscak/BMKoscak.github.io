// The scope: one persistent WebGL2 canvas that draws a Lissajous trace into
// whichever element on the current page carries [data-scope]. When the page
// changes, the trace glides from the old box to the new one and re-locks to the
// new frequency ratio, like a scope finding a new signal.
//
// It draws additive, glowing line segments with a brightness falloff along the
// beam, which reads as phosphor persistence without needing a feedback buffer.

import { sound } from './audio';

const VERT = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 seg;
layout(location=2) in float bright;
uniform vec4 uRect;   // x, y (bottom-left, px), w, h
uniform vec2 uRes;
uniform float uWidth;
uniform vec2 uScale;
out float vSide;
out float vBright;
void main() {
	vec2 c = uRect.xy + uRect.zw * 0.5;
	vec2 p0 = c + seg.xy * uScale;
	vec2 p1 = c + seg.zw * uScale;
	vec2 d = p1 - p0;
	float len = max(length(d), 0.0001);
	vec2 dir = d / len;
	vec2 n = vec2(-dir.y, dir.x);
	vec2 pos = mix(p0, p1, corner.x) + n * corner.y * uWidth + dir * (corner.x * 2.0 - 1.0) * uWidth * 0.5;
	vSide = corner.y;
	vBright = bright;
	gl_Position = vec4(pos / uRes * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
in float vSide;
in float vBright;
uniform vec3 uColor;
uniform float uCore;
uniform float uGain;
out vec4 o;
void main() {
	float d = abs(vSide);
	float a = exp(-d * d * uCore) * vBright * uGain;
	o = vec4(uColor * a, a);
}`;

type Params = { a: number; b: number; phase: number; drift: number; speed: number };

const SEGMENTS = matchMedia('(max-width: 760px)').matches ? 800 : 1400;

function parse(el: HTMLElement): Params {
	const [a, b, phase] = (el.dataset.scope || '1:1').split(':').map(Number);
	return {
		a: Number(el.dataset.a ?? a) || 1,
		b: Number(el.dataset.b ?? b) || 1,
		phase: Number(el.dataset.phase ?? phase ?? 0.25) || 0,
		drift: Number(el.dataset.drift ?? 0.06),
		speed: Number(el.dataset.speed ?? 0.35),
	};
}

export function startScope() {
	const canvas = document.getElementById('scope-gl') as HTMLCanvasElement | null;
	if (!canvas || (canvas as any).__scope) return;
	(canvas as any).__scope = true;

	const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
	if (!gl) {
		document.documentElement.classList.add('no-gl');
		return;
	}
	// Machines without a real GPU render WebGL in software on the CPU, which
	// costs far more than the effect is worth. They get the static SVG trace.
	const dbg = gl.getExtension('WEBGL_debug_renderer_info');
	const renderer = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
	if (/swiftshader|llvmpipe|softpipe|software/i.test(renderer) && !location.search.includes('gl=force')) {
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		canvas.style.display = 'none';
		document.documentElement.classList.add('no-gl');
		return;
	}

	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const compile = (type: number, src: string) => {
		const s = gl.createShader(type)!;
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
		return s;
	};
	const prog = gl.createProgram()!;
	try {
		gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
		gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
	} catch (e) {
		document.documentElement.classList.add('no-gl');
		return;
	}
	gl.useProgram(prog);
	const U = (n: string) => gl.getUniformLocation(prog, n);
	const uRect = U('uRect'),
		uRes = U('uRes'),
		uWidth = U('uWidth'),
		uScale = U('uScale'),
		uColor = U('uColor'),
		uCore = U('uCore'),
		uGain = U('uGain');

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);
	const quad = new Float32Array([0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1]);
	const qb = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, qb);
	gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const inst = new Float32Array(SEGMENTS * 5);
	const ib = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, ib);
	gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0);
	gl.vertexAttribDivisor(1, 1);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
	gl.vertexAttribDivisor(2, 1);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE);
	gl.uniform3f(uColor, 0.94, 0.77, 0.23);

	let dpr = 1;
	const resize = () => {
		dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		// size the canvas to the layout viewport exactly; 100vh is taller than
		// innerHeight on phones and would stretch the drawing out of its box
		canvas.style.width = innerWidth + 'px';
		canvas.style.height = innerHeight + 'px';
		canvas.width = Math.round(innerWidth * dpr);
		canvas.height = Math.round(innerHeight * dpr);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform2f(uRes, canvas.width, canvas.height);
		dirty = true;
	};
	let dirty = true;
	addEventListener('resize', resize);
	resize();

	// state
	const cur: Params = { a: 1, b: 1, phase: 0.25, drift: 0.06, speed: 0.35 };
	let target: HTMLElement | null = null;
	let rect = { x: 0, y: 0, w: 0, h: 0 };
	let from = { x: 0, y: 0, w: 0, h: 0 };
	let tween = 1;
	let energy = 0;
	let t = 0;
	let phaseOff = 0;
	let last = performance.now();
	let raf = 0;
	let cleared = false;
	const bufL = new Float32Array(2048);
	const bufR = new Float32Array(2048);

	const header = () => (document.querySelector('.site-header') as HTMLElement | null)?.offsetHeight ?? 0;

	function draw(now: number) {
		raf = requestAnimationFrame(draw);
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;

		const el = document.querySelector<HTMLElement>('[data-scope]');
		if (el !== target) {
			if (target && rect.w > 0) {
				from = { ...rect };
				tween = 0;
			} else tween = 1;
			target = el;
		}
		if (!target) {
			energy = Math.max(0, energy - dt * 3);
		}

		let live = false;
		if (target) {
			const r = target.getBoundingClientRect();
			const want = { x: r.left, y: r.top, w: r.width, h: r.height };
			tween = Math.min(1, tween + dt / 0.7);
			const e = reduced ? 1 : 1 - Math.pow(1 - tween, 3);
			rect = {
				x: from.x + (want.x - from.x) * e,
				y: from.y + (want.y - from.y) * e,
				w: from.w + (want.w - from.w) * e,
				h: from.h + (want.h - from.h) * e,
			};
			const onScreen = r.bottom > 0 && r.top < innerHeight && r.width > 0;
			energy = onScreen ? Math.min(1, energy + dt * 2.5) : Math.max(0, energy - dt * 4);
			const p = parse(target);
			const k = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
			cur.a += (p.a - cur.a) * k;
			cur.b += (p.b - cur.b) * k;
			cur.phase += (p.phase - cur.phase) * k;
			cur.drift = p.drift;
			cur.speed = p.speed;
			live = sound.scopeLive && target.dataset.scopeAudio !== 'off';
		}

		if (energy <= 0.001) {
			if (!cleared) {
				gl!.disable(gl!.SCISSOR_TEST);
				gl!.clearColor(0, 0, 0, 0);
				gl!.clear(gl!.COLOR_BUFFER_BIT);
				cleared = true;
			}
			return;
		}
		cleared = false;
		if (reduced && !dirty && !live && tween >= 1) return;
		dirty = false;

		if (!reduced) {
			t += dt * cur.speed;
			phaseOff += dt * cur.drift;
		}

		// fill the segment buffer
		const n = SEGMENTS;
		let px = 0,
			py = 0;
		if (live) {
			sound.analyserL.getFloatTimeDomainData(bufL);
			sound.analyserR.getFloatTimeDomainData(bufR);
			const step = bufL.length / (n + 1);
			for (let i = 0; i <= n; i++) {
				const j = Math.floor(i * step);
				const x = bufL[j] * 6;
				const y = bufR[j] * 6;
				if (i > 0) {
					const o = (i - 1) * 5;
					inst[o] = px;
					inst[o + 1] = py;
					inst[o + 2] = x;
					inst[o + 3] = y;
					inst[o + 4] = Math.pow(i / n, 1.3);
				}
				px = x;
				py = y;
			}
		} else {
			// enough of the curve to close the figure, with the oldest part fading out
			const span = 1.15;
			const head = t;
			for (let i = 0; i <= n; i++) {
				const u = head - span * (1 - i / n);
				const ang = u * Math.PI * 2;
				const x = Math.sin(cur.a * ang + (cur.phase + phaseOff) * Math.PI * 2);
				const y = Math.sin(cur.b * ang);
				if (i > 0) {
					const o = (i - 1) * 5;
					inst[o] = px;
					inst[o + 1] = py;
					inst[o + 2] = x;
					inst[o + 3] = y;
					inst[o + 4] = reduced ? 0.8 : 0.18 + 0.82 * Math.pow(i / n, 1.6);
				}
				px = x;
				py = y;
			}
		}
		gl!.bindBuffer(gl!.ARRAY_BUFFER, ib);
		gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, inst);

		// visible part of the box, below the sticky header
		const top = header();
		const vx0 = Math.max(rect.x, 0);
		const vy0 = Math.max(rect.y, top);
		const vx1 = Math.min(rect.x + rect.w, innerWidth);
		const vy1 = Math.min(rect.y + rect.h, innerHeight);
		gl!.disable(gl!.SCISSOR_TEST);
		gl!.clearColor(0, 0, 0, 0);
		gl!.clear(gl!.COLOR_BUFFER_BIT);
		if (vx1 <= vx0 || vy1 <= vy0) return;
		gl!.enable(gl!.SCISSOR_TEST);
		gl!.scissor(
			Math.floor(vx0 * dpr),
			Math.floor((innerHeight - vy1) * dpr),
			Math.ceil((vx1 - vx0) * dpr),
			Math.ceil((vy1 - vy0) * dpr),
		);

		const bx = rect.x * dpr;
		const by = (innerHeight - rect.y - rect.h) * dpr;
		const bw = rect.w * dpr;
		const bh = rect.h * dpr;
		gl!.uniform4f(uRect, bx, by, bw, bh);
		gl!.uniform2f(uScale, bw * 0.4, bh * 0.4);

		// wide, faint glow then a thin bright core
		gl!.uniform1f(uWidth, 9 * dpr);
		gl!.uniform1f(uCore, 3.2);
		gl!.uniform1f(uGain, 0.05 * energy);
		gl!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, n);
		gl!.uniform1f(uWidth, 1.6 * dpr);
		gl!.uniform1f(uCore, 2.2);
		gl!.uniform1f(uGain, 0.42 * energy);
		gl!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, n);
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) cancelAnimationFrame(raf);
		else {
			last = performance.now();
			raf = requestAnimationFrame(draw);
		}
	});
	addEventListener('scroll', () => (dirty = true), { passive: true });
	raf = requestAnimationFrame(draw);
}
