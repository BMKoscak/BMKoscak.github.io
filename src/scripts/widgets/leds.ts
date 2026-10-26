// A tiny ARM assembly stepper for the STM32F4 Discovery board's four user LEDs
// (PD12 green, PD13 orange, PD14 red, PD15 blue). It understands just enough
// of the instruction set to run the two programs on the page.
import { sound } from '../audio';

const ODR = 0x40020c14; // GPIOD output data register

type Ins = { op: string; args: string[]; line: number; label?: string };

function parse(src: string): { prog: Ins[]; labels: Record<string, number> } {
	const prog: Ins[] = [];
	const labels: Record<string, number> = {};
	src.split('\n').forEach((raw, line) => {
		let s = raw.replace(/@.*$/, '').trim();
		if (!s) return;
		const m = s.match(/^([a-z_]\w*):\s*(.*)$/i);
		if (m) {
			labels[m[1]] = prog.length;
			s = m[2].trim();
			if (!s) return;
		}
		const [op, ...rest] = s.split(/\s+/);
		const args = rest
			.join(' ')
			.split(/,(?![^\[]*\])/)
			.map((a) => a.trim())
			.filter(Boolean);
		prog.push({ op: op.toUpperCase(), args, line });
	});
	return { prog, labels };
}

const num = (s: string) => {
	const v = s.replace(/^[#=]/, '');
	return v.toLowerCase().startsWith('0x') ? parseInt(v, 16) : parseInt(v, 10);
};

export default function mount(root: HTMLElement) {
	const codeEls = [...root.querySelectorAll<HTMLElement>('[data-program]')];
	const progBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-pick]')];
	const leds = [...root.querySelectorAll<HTMLElement>('[data-led]')];
	const regEls = [...root.querySelectorAll<HTMLElement>('[data-reg]')];
	const stepBtn = root.querySelector<HTMLButtonElement>('[data-stepbtn]')!;
	const runBtn = root.querySelector<HTMLButtonElement>('[data-run]')!;
	const resetBtn = root.querySelector<HTMLButtonElement>('[data-reset]')!;
	const speed = root.querySelector<HTMLInputElement>('[name="speed"]')!;
	const status = root.querySelector<HTMLElement>('[data-status]')!;

	let which = 0;
	let { prog, labels } = parse(codeEls[0].textContent || '');
	let pc = 0;
	let r = new Uint32Array(8);
	let z = false;
	let odr = 0;
	let timer = 0;
	let waiting = 0;
	let cycles = 0;

	const hex = (v: number) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(8, '0');
	const paint = () => {
		leds.forEach((l) => l.classList.toggle('on', !!(odr & (1 << Number(l.dataset.led)))));
		regEls.forEach((el) => {
			const k = el.dataset.reg!;
			el.textContent = k === 'odr' ? hex(odr) : k === 'z' ? (z ? '1' : '0') : k === 'pc' ? String(pc) : hex(r[Number(k)]);
		});
		const lines = codeEls[which].querySelectorAll<HTMLElement>('.ln');
		lines.forEach((l) => l.classList.remove('cur'));
		const ins = prog[pc];
		if (ins) lines[ins.line]?.classList.add('cur');
		status.textContent = `${cycles} instructions run`;
	};

	const reg = (s: string) => Number(s.replace(/[^\d]/g, ''));
	const exec = () => {
		const ins = prog[pc];
		if (!ins) return;
		let next = pc + 1;
		const [a, b, c] = ins.args;
		const cond = ins.op.endsWith('EQ') ? z : ins.op.endsWith('NE') ? !z : true;
		const op = ins.op.replace(/(EQ|NE)$/, '');
		if (cond) {
			switch (op) {
				case 'LDR':
					if (b.startsWith('=')) r[reg(a)] = num(b);
					else r[reg(a)] = r[reg(b.replace(/[\[\]]/g, ''))] === ODR ? odr : 0;
					break;
				case 'MOV':
					r[reg(a)] = num(b);
					break;
				case 'STR':
					if (r[reg(b.replace(/[\[\]]/g, ''))] === ODR) {
						const before = odr;
						odr = r[reg(a)] & 0xffff;
						if (odr !== before) sound.blip((odr >> 12) & 3);
					}
					break;
				case 'EOR':
					r[reg(a)] = r[reg(b)] ^ num(c);
					break;
				case 'LSL':
					r[reg(a)] = r[reg(b)] << num(c);
					break;
				case 'CMP':
					z = r[reg(a)] === num(b) >>> 0;
					break;
				case 'B':
					next = labels[a] ?? next;
					break;
				case 'BL':
					waiting = 1; // the delay subroutine: we just wait one tick
					break;
			}
		}
		pc = next >= prog.length ? 0 : next;
		cycles++;
		paint();
	};

	const tick = () => {
		if (waiting) {
			waiting = 0;
		} else exec();
		const ms = 900 - Number(speed.value) * 8.5;
		timer = window.setTimeout(tick, ms);
	};
	const stop = () => {
		clearTimeout(timer);
		timer = 0;
		runBtn.setAttribute('aria-pressed', 'false');
		runBtn.textContent = 'Run';
	};
	const reset = () => {
		stop();
		pc = 0;
		r = new Uint32Array(8);
		z = false;
		odr = 0;
		cycles = 0;
		paint();
	};
	const onRun = () => {
		if (timer) return stop();
		runBtn.setAttribute('aria-pressed', 'true');
		runBtn.textContent = 'Pause';
		tick();
	};
	const onStep = () => {
		stop();
		exec();
	};
	const onPick = (e: Event) => {
		which = Number((e.currentTarget as HTMLButtonElement).dataset.pick);
		progBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === which)));
		codeEls.forEach((c, i) => (c.hidden = i !== which));
		({ prog, labels } = parse(codeEls[which].textContent || ''));
		reset();
	};

	runBtn.addEventListener('click', onRun);
	stepBtn.addEventListener('click', onStep);
	resetBtn.addEventListener('click', reset);
	progBtns.forEach((b) => b.addEventListener('click', onPick));
	reset();
	return () => {
		stop();
		runBtn.removeEventListener('click', onRun);
		stepBtn.removeEventListener('click', onStep);
		resetBtn.removeEventListener('click', reset);
		progBtns.forEach((b) => b.removeEventListener('click', onPick));
	};
}
