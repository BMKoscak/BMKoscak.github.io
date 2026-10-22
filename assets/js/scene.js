// The particle stage. One cloud of points that morphs through the signal chain:
// 0 orb (hero) → 1 lens → 2 sound ridges → 3 LED wall → 4 </> → 5 warp field
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const SHAPES = 6;
const rand = Math.random;

function shapeOrb(N) {
	const a = new Float32Array(N * 3);
	const shell = Math.floor(N * 0.86);
	const g = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < N; i++) {
		let x, y, z;
		if (i < shell) {
			y = 1 - (i / (shell - 1)) * 2;
			const r = Math.sqrt(1 - y * y), phi = i * g;
			x = Math.cos(phi) * r; z = Math.sin(phi) * r;
			const R = 1.55; x *= R; y *= R; z *= R;
		} else {
			const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = 1.2 * Math.cbrt(rand());
			const s = Math.sqrt(1 - u * u);
			x = s * Math.cos(th) * r; y = u * r; z = s * Math.sin(th) * r;
		}
		a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
	}
	return a;
}

function shapeLens(N) {
	const a = new Float32Array(N * 3);
	const ry = -0.5, rx = 0.18, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
	for (let i = 0; i < N; i++) {
		const k = rand(), ang = rand() * Math.PI * 2;
		let r, z;
		if (k < 0.46) { // barrel rings, every other one knurled
			const ring = Math.floor(rand() * 10);
			r = 1.02 + ring * 0.07 + (ring % 2 ? Math.max(0, Math.sin(ang * 120)) * 0.025 : 0);
			z = 0.25 - ring * 0.13;
		} else if (k < 0.74) { // front element, slightly domed
			const rr = Math.sqrt(rand()) * 0.97;
			r = rr; z = 0.3 + 0.28 * (1 - (rr / 0.97) ** 2);
		} else { // hexagonal iris
			const seg = Math.PI / 3;
			const hex = 0.4 / Math.cos(((ang % seg) + seg) % seg - seg / 2);
			r = hex + Math.pow(rand(), 1.6) * (0.97 - hex); z = 0.08;
		}
		let x = Math.cos(ang) * r, y = Math.sin(ang) * r;
		// bake a 3/4 view
		let x2 = x * cy + z * sy, z2 = -x * sy + z * cy;
		let y2 = y * cx - z2 * sx, z3 = y * sx + z2 * cx;
		a[i * 3] = x2 * 1.2; a[i * 3 + 1] = y2 * 1.2; a[i * 3 + 2] = z3 * 1.2;
	}
	return a;
}

function shapeRidges(N, wave) {
	const a = new Float32Array(N * 3);
	const rows = 44, per = Math.floor(N / rows);
	for (let i = 0; i < N; i++) {
		const row = Math.min(rows - 1, Math.floor(i / per));
		const j = i - row * per;
		const x = -2.4 + 4.8 * (j % per) / (per - 1);
		const z = -1.9 + 3.8 * row / (rows - 1);
		a[i * 3] = x; a[i * 3 + 1] = -0.35; a[i * 3 + 2] = z;
		wave[i * 2] = x; wave[i * 2 + 1] = row;
	}
	return a;
}

const SMPTE_TOP = [0xc0c0c0, 0xc0c000, 0x00c0c0, 0x00c000, 0xc000c0, 0xc00000, 0x0000c0];
const SMPTE_MID = [0x0000c0, 0x131313, 0xc000c0, 0x131313, 0x00c0c0, 0x131313, 0xc0c0c0];
function shapeWall(N, bars) {
	const a = new Float32Array(N * 3);
	const C = 96, R = 54, cells = C * R, W = 4.4, H = W * 9 / 16;
	const col = new THREE.Color();
	for (let i = 0; i < N; i++) {
		const cell = i % cells, cx = cell % C, cy = Math.floor(cell / C);
		const u = (cx + 0.5) / C, v = (cy + 0.5) / R;
		const x = (u - 0.5) * W + (rand() - 0.5) * 0.012;
		const y = (0.5 - v) * H + (rand() - 0.5) * 0.012;
		const z = -0.4 * (x / (W / 2)) ** 2;
		a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
		let hex;
		if (v < 0.67) hex = SMPTE_TOP[Math.floor(u * 7)];
		else if (v < 0.75) hex = SMPTE_MID[Math.floor(u * 7)];
		else hex = u < 5 / 28 ? 0x00214c : u < 10 / 28 ? 0xffffff : u < 15 / 28 ? 0x32006a : 0x131313;
		col.setHex(hex);
		bars[i * 3] = col.r; bars[i * 3 + 1] = col.g; bars[i * 3 + 2] = col.b;
	}
	return a;
}

function shapeGlyph(N) {
	const a = new Float32Array(N * 3);
	const cw = 900, ch = 380;
	const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
	const g = cv.getContext('2d', { willReadFrequently: true });
	g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
	g.font = '800 330px "Big Shoulders", "Arial Narrow", sans-serif';
	g.fillText('</>', cw / 2, ch / 2 + 10);
	const data = g.getImageData(0, 0, cw, ch).data;
	const pts = [];
	for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) if (data[(y * cw + x) * 4 + 3] > 128) pts.push(x, y);
	const n = pts.length / 2;
	for (let i = 0; i < N; i++) {
		if (!n) { a[i * 3] = (rand() - 0.5) * 4; a[i * 3 + 1] = (rand() - 0.5) * 2; continue; }
		const p = Math.floor(rand() * n);
		const x = pts[p * 2] + rand() * 2, y = pts[p * 2 + 1] + rand() * 2;
		a[i * 3] = (x / cw - 0.5) * 4.8;
		a[i * 3 + 1] = -(y / ch - 0.5) * 2.03;
		a[i * 3 + 2] = (rand() - 0.5) * 0.45;
	}
	return a;
}

function shapeWarp(N) {
	const a = new Float32Array(N * 3);
	for (let i = 0; i < N; i++) {
		a[i * 3] = (rand() - 0.5) * 16;
		a[i * 3 + 1] = (rand() - 0.5) * 10;
		a[i * 3 + 2] = -11 + rand() * 14;
	}
	return a;
}

const vert = /* glsl */`
attribute vec3 pA; attribute vec3 pB; attribute vec3 pC; attribute vec3 pD; attribute vec3 pE; attribute vec3 pF;
attribute vec3 bars; attribute vec2 wave; attribute float rnd;
uniform float uTime, uProgress, uSize, uPR, uAudio, uMouseK, uBurst, uBarsMix, uWall, uWarp, uSwirl;
uniform vec3 uMouse;
uniform vec3 uColA[6]; uniform vec3 uColB[6];
uniform mat3 uRotC;
varying vec3 vColor; varying float vAlpha;

float tent(float t, float k) { float w = clamp(1.0 - abs(t - k), 0.0, 1.0); return w * w * (3.0 - 2.0 * w); }
vec3 swirl(vec3 p, float t) {
	return vec3(sin(p.y * 2.1 + t) + sin(p.z * 1.7 - t * 0.7),
	            sin(p.z * 2.3 + t * 0.9) + sin(p.x * 1.9 + t * 0.5),
	            sin(p.x * 2.0 - t * 0.8) + sin(p.y * 1.6 + t * 0.6));
}

void main() {
	float t = clamp(uProgress + (rnd - 0.5) * 0.5, 0.0, 5.0);
	float w0 = tent(t, 0.0), w1 = tent(t, 1.0), w2 = tent(t, 2.0), w3 = tent(t, 3.0), w4 = tent(t, 4.0), w5 = tent(t, 5.0);
	float sum = w0 + w1 + w2 + w3 + w4 + w5 + 1e-5;
	w0 /= sum; w1 /= sum; w2 /= sum; w3 /= sum; w4 /= sum; w5 /= sum;

	vec3 a = pA * (1.0 + 0.07 * sin(uTime * 0.8 + pA.y * 3.0 + rnd * 6.28) + uAudio * 0.25);

	float x = wave.x, row = wave.y;
	float env = exp(-x * x * 0.5);
	float wv = sin(x * 3.1 + uTime * 1.3 + row * 0.37) * 0.5 + sin(x * 7.3 - uTime * 2.1 + row * 1.7) * 0.25 + sin(x * 1.3 + row * 0.9 + uTime * 0.6) * 0.35;
	vec3 c = uRotC * (pC + vec3(0.0, (wv * 0.5 + 0.5) * env * (0.55 + uAudio * 6.0), 0.0));

	vec3 d = pD + vec3(0.0, 0.0, sin(pD.x * 2.0 + uTime) * 0.04);
	vec3 e = pE + vec3(0.0, sin(uTime * 1.4 + pE.x * 1.5) * 0.04, sin(uTime * 1.1 + pE.x * 2.0) * 0.08);
	vec3 f = pF; f.z = mod(pF.z + 11.0 + uTime * uWarp, 14.0) - 11.0;

	vec3 p = a * w0 + pB * w1 + c * w2 + d * w3 + e * w4 + f * w5;
	float settled = max(max(max(w0, w1), max(w2, w3)), max(w4, w5));
	p += swirl(p * 1.1 + rnd * 3.0, uTime * 0.6) * (1.0 - settled) * uSwirl;
	p += normalize(p + 1e-4) * uBurst * (0.4 + rnd * 2.2);
	p += vec3(sin(uTime * 0.7 + rnd * 40.0), cos(uTime * 0.6 + rnd * 31.0), sin(uTime * 0.5 + rnd * 17.0)) * 0.012;

	vec4 world = modelMatrix * vec4(p, 1.0);
	vec3 dm = world.xyz - uMouse; float dl = length(dm);
	world.xyz += (dm / (dl + 1e-4)) * smoothstep(1.2, 0.0, dl) * 0.6 * uMouseK;
	vec4 mv = viewMatrix * world;
	gl_Position = projectionMatrix * mv;

	vec3 ripple = mix(uColA[3], uColB[3], 0.5 + 0.5 * sin(pD.x * 3.0 - uTime * 2.2 + pD.y * 2.0));
	vec3 wallCol = mix(bars, ripple, uBarsMix) * uWall;
	vColor = mix(uColA[0], uColB[0], rnd) * w0
	       + mix(uColA[1], uColB[1], rnd) * w1
	       + mix(uColA[2], uColB[2], clamp((row / 43.0) + (rnd - 0.5) * 0.3, 0.0, 1.0)) * w2
	       + wallCol * w3
	       + mix(uColA[4], uColB[4], rnd) * w4
	       + mix(uColA[5], uColB[5], rnd) * w5;
	vColor *= 1.0 + uAudio * 2.5 + uBurst * 1.5;

	float sz = uSize * (0.55 + rnd * 0.9) * (1.0 + uAudio * 1.8);
	sz *= mix(1.0, 0.8, w3);
	gl_PointSize = sz * uPR * (7.0 / max(0.5, -mv.z));
	vAlpha = mix(1.0, 0.75 * smoothstep(0.4, 2.5, -mv.z) * smoothstep(-20.0, -9.0, mv.z), w5);
}`;

const frag = /* glsl */`
uniform float uOpacity;
varying vec3 vColor; varying float vAlpha;
void main() {
	float d = length(gl_PointCoord - 0.5);
	if (d > 0.5) discard;
	float a = pow(smoothstep(0.5, 0.0, d), 1.5);
	gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
}`;

const FinalShader = {
	uniforms: {
		tDiffuse: { value: null },
		uShift: { value: 0 },
		uGlitch: { value: 0 },
		uTime: { value: 0 },
		uRes: { value: new THREE.Vector2(1, 1) },
	},
	vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse; uniform float uShift, uGlitch, uTime; uniform vec2 uRes; varying vec2 vUv;
		float h(float n) { return fract(sin(n) * 43758.5453); }
		void main() {
			vec2 uv = vUv;
			float band = floor(uv.y * 42.0) + floor(uTime * 24.0) * 7.0;
			float g = step(1.0 - uGlitch * 0.35, h(band));
			uv.x += (h(band + 1.7) - 0.5) * 0.12 * g * uGlitch;
			vec2 dir = uv - 0.5;
			vec2 off = dir * (uShift + uGlitch * 0.03) + vec2(uGlitch * 0.006, 0.0);
			vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
			float vig = smoothstep(1.0, 0.3, length(dir * vec2(1.0, 0.9)));
			col *= mix(0.62, 1.0, vig);
			float n = fract(sin(dot(floor(vUv * uRes) + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
			col += (n - 0.5) * 0.018;
			gl_FragColor = vec4(col, 1.0);
		}`,
};

const hexV = (hex) => { const c = new THREE.Color(hex); return new THREE.Vector3(c.r, c.g, c.b); };

export async function createStage(canvas, { reducedMotion = false, mobile = false } = {}) {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
	const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
	renderer.setPixelRatio(DPR);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color('#0b1426');
	const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
	camera.position.set(0, 0, 7);

	try { await document.fonts.load('800 100px "Big Shoulders"'); } catch (e) { /* fallback font is fine */ }

	const N = mobile ? 11000 : 26000;
	const wave = new Float32Array(N * 2), bars = new Float32Array(N * 3), rnd = new Float32Array(N);
	for (let i = 0; i < N; i++) rnd[i] = rand();
	const geo = new THREE.BufferGeometry();
	const pA = shapeOrb(N);
	geo.setAttribute('position', new THREE.BufferAttribute(pA, 3));
	geo.setAttribute('pA', new THREE.BufferAttribute(pA, 3));
	geo.setAttribute('pB', new THREE.BufferAttribute(shapeLens(N), 3));
	geo.setAttribute('pC', new THREE.BufferAttribute(shapeRidges(N, wave), 3));
	geo.setAttribute('pD', new THREE.BufferAttribute(shapeWall(N, bars), 3));
	geo.setAttribute('pE', new THREE.BufferAttribute(shapeGlyph(N), 3));
	geo.setAttribute('pF', new THREE.BufferAttribute(shapeWarp(N), 3));
	geo.setAttribute('bars', new THREE.BufferAttribute(bars, 3));
	geo.setAttribute('wave', new THREE.BufferAttribute(wave, 2));
	geo.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
	geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

	const rotC = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationX(0.62));
	const uniforms = {
		uTime: { value: 0 }, uProgress: { value: 0 }, uSize: { value: mobile ? 4.2 : 3.6 }, uPR: { value: DPR },
		uAudio: { value: 0 }, uMouse: { value: new THREE.Vector3(99, 99, 0) }, uMouseK: { value: 0 },
		uBurst: { value: 0 }, uBarsMix: { value: 0 }, uWall: { value: 0.85 }, uWarp: { value: reducedMotion ? 0.15 : 0.9 },
		uSwirl: { value: reducedMotion ? 0.2 : 0.9 }, uOpacity: { value: mobile ? 0.3 : 0.34 }, uRotC: { value: rotC },
		uColA: { value: ['#9a8aff', '#f4a259', '#e0479e', '#3cc6d3', '#9a8aff', '#6f7a98'].map(hexV) },
		uColB: { value: ['#3cc6d3', '#ffd8a8', '#9a8aff', '#9a8aff', '#3cc6d3', '#3a4766'].map(hexV) },
	};
	const mat = new THREE.ShaderMaterial({
		vertexShader: vert, fragmentShader: frag, uniforms,
		transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
	});
	const points = new THREE.Points(geo, mat);
	const group = new THREE.Group();
	group.add(points);
	scene.add(group);

	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 0.18);
	composer.addPass(bloom);
	const final = new ShaderPass(FinalShader);
	composer.addPass(final);
	composer.addPass(new OutputPass());

	// --- state, all eased toward targets each frame ---
	const s = {
		progress: 0, target: 0, pointer: new THREE.Vector2(), pointerT: new THREE.Vector2(), pointerActive: 0,
		velocity: 0, glitch: 0, burst: 0, audio: 0, audioT: 0, barsT: 0, wallT: 0.85, bloomBoost: 0,
		x: 0, y: 0, sc: 1, halfW: 4, halfH: 2.5,
	};

	function resize() {
		const w = window.innerWidth, h = window.innerHeight;
		renderer.setSize(w, h, false);
		composer.setSize(w, h);
		bloom.resolution.set(w / 2, h / 2);
		camera.aspect = w / h;
		camera.position.z = w / h < 0.8 ? 9.5 : 7;
		camera.updateProjectionMatrix();
		s.halfH = Math.tan(THREE.MathUtils.degToRad(20)) * camera.position.z;
		s.halfW = s.halfH * camera.aspect;
		final.uniforms.uRes.value.set(w * DPR, h * DPR);
	}
	resize();
	window.addEventListener('resize', resize);

	// Where each shape sits on screen: [x, y, scale]
	function layout(k) {
		const wide = camera.aspect > 1.1;
		if (!wide) return k === 0 ? [0, s.halfH * 0.32, 0.95] : k === 5 ? [0, 0, 1] : [0, s.halfH * 0.1, 0.85];
		if (k === 0) return [s.halfW * 0.42, s.halfH * 0.08, 1.0];
		if (k === 5) return [0, 0, 1];
		const narrow = s.halfW < 5 ? 0.8 : 0.95;
		if (k === 2) return [s.halfW * 0.5, -s.halfH * 0.12, 0.66 * narrow];
		if (k === 3) return [s.halfW * 0.5, 0, 0.82 * narrow];
		return [s.halfW * 0.5, 0, 0.9 * narrow];
	}

	const ndc = new THREE.Vector3(), dir = new THREE.Vector3(), mouseW = new THREE.Vector3();
	const clock = new THREE.Clock();
	let running = true, raf = 0;

	function frame() {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(clock.getDelta(), 0.05);
		const t = (uniforms.uTime.value += dt * (reducedMotion ? 0.35 : 1));
		const k = (a) => 1 - Math.exp(-a * dt);

		s.progress += (s.target - s.progress) * k(reducedMotion ? 6 : 2.6);
		uniforms.uProgress.value = s.progress;

		// layout follows progress
		const lo = Math.floor(s.progress), hi = Math.min(5, lo + 1), f = s.progress - lo;
		const A = layout(lo), B = layout(hi);
		const ease = f * f * (3 - 2 * f);
		const tx = A[0] + (B[0] - A[0]) * ease, ty = A[1] + (B[1] - A[1]) * ease, ts = A[2] + (B[2] - A[2]) * ease;
		group.position.set(tx, ty, 0);
		group.scale.setScalar(ts);

		s.pointer.lerp(s.pointerT, k(4));
		const wobble = reducedMotion ? 0 : 1;
		group.rotation.y = (Math.sin(t * 0.13) * 0.3) * wobble + s.pointer.x * 0.28;
		group.rotation.x = s.pointer.y * -0.14 + Math.sin(t * 0.09) * 0.06 * wobble;

		// mouse in world (z=0 plane)
		ndc.set(s.pointer.x, s.pointer.y, 0.5).unproject(camera);
		dir.copy(ndc).sub(camera.position).normalize();
		const dist = -camera.position.z / dir.z;
		mouseW.copy(camera.position).addScaledVector(dir, dist);
		uniforms.uMouse.value.copy(mouseW);
		uniforms.uMouseK.value += (s.pointerActive - uniforms.uMouseK.value) * k(3);

		s.audio += (s.audioT - s.audio) * k(s.audioT > s.audio ? 30 : 8);
		uniforms.uAudio.value = s.audio;
		s.burst *= Math.exp(-dt * 2.2); uniforms.uBurst.value = s.burst;
		s.glitch *= Math.exp(-dt * 5); final.uniforms.uGlitch.value = reducedMotion ? 0 : s.glitch;
		s.velocity *= Math.exp(-dt * 6);
		final.uniforms.uShift.value = reducedMotion ? 0 : Math.min(0.02, Math.abs(s.velocity) * 0.00045);
		final.uniforms.uTime.value = t;
		uniforms.uBarsMix.value += (s.barsT - uniforms.uBarsMix.value) * k(5);
		uniforms.uWall.value += (s.wallT - uniforms.uWall.value) * k(6);
		s.bloomBoost *= Math.exp(-dt * 3);
		bloom.strength = 0.6 + s.audio * 1.6 + s.bloomBoost;

		composer.render();
	}

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) { running = false; cancelAnimationFrame(raf); }
		else if (!running) { running = true; clock.getDelta(); frame(); }
	});

	frame();

	return {
		setTarget(p) { s.target = Math.max(0, Math.min(5, p)); },
		jumpTo(p) { s.target = s.progress = p; },
		setPointer(nx, ny, active = 1) { s.pointerT.set(nx, ny); s.pointerActive = active; },
		setVelocity(v) { s.velocity = v; },
		setAudio(l) { s.audioT = Math.min(0.6, l); },
		burst(a = 1) { s.burst = Math.max(s.burst, a); s.bloomBoost = 0.8 * a; },
		glitch(a = 1) { s.glitch = Math.max(s.glitch, a); },
		setWall(v) { s.wallT = 0.12 + v * 1.0; },
		setBarsMix(v) { s.barsT = v; },
		count: N,
	};
}
