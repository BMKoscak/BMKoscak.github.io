(() => {
	document.documentElement.classList.add('has-js');
	const patterns = {
		kick:  [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
		snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
		hat:  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
		bass: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0]
	};
	const instruments = Object.keys(patterns);
	const patternStorageKey = 'the-benn-crypt16-pattern';
	const rows = new Map();
	let audioContext;
	let noiseBuffer;
	let isPlaying = false;
	let nextStep = 0;
	let nextNoteTime = 0;
	let timerId;
	let toastId;
	let moonTaps = 0;
	let typedKeys = '';
	let lastKeyTime = 0;

	const byId = (id) => document.getElementById(id);
	const hint = byId('seqHint');
	const playButton = byId('playPattern');
	const stepDuration = () => 60 / Number(byId('tempo').value) / 4;

	function showToast(message) {
		const toast = byId('toast');
		toast.textContent = message;
		toast.classList.add('visible');
		window.clearTimeout(toastId);
		toastId = window.setTimeout(() => toast.classList.remove('visible'), 2700);
	}

	function showSecret() {
		byId('secretModal').hidden = false;
		byId('secretClose').focus();
	}

	function closeSecret() {
		byId('secretModal').hidden = true;
		byId('moonCharm').focus();
	}

	function paintSteps() {
		for (const instrument of instruments) {
			const container = rows.get(instrument);
			[...container.children].forEach((button, index) => {
				const isOn = Boolean(patterns[instrument][index]);
				button.classList.toggle('active', isOn);
				button.setAttribute('aria-pressed', String(isOn));
			});
		}
	}

	function createSequencer() {
		for (const instrument of instruments) {
			const container = document.querySelector(`[data-instrument="${instrument}"] .steps`);
			rows.set(instrument, container);
			for (let index = 0; index < 16; index += 1) {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'step';
				button.setAttribute('aria-label', `${instrument}, step ${index + 1}`);
				button.setAttribute('aria-pressed', String(Boolean(patterns[instrument][index])));
				button.addEventListener('click', () => {
					patterns[instrument][index] = patterns[instrument][index] ? 0 : 1;
					paintSteps();
					preview(instrument);
				});
				container.append(button);
			}
		}
		try {
			const saved = JSON.parse(localStorage.getItem(patternStorageKey));
			if (saved && instruments.every((name) => Array.isArray(saved[name]) && saved[name].length === 16)) {
				for (const name of instruments) patterns[name] = saved[name].map((step) => step ? 1 : 0);
				hint.textContent = 'Your saved pattern is back from the dead.';
			}
		} catch {
			// A blocked or outdated local storage entry does not stop the drum machine.
		}
		paintSteps();
	}

	function getAudioContext() {
		if (!audioContext) {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
			audioContext = new AudioContextClass();
		}
		if (audioContext.state === 'suspended') audioContext.resume();
		return audioContext;
	}

	function getNoiseBuffer(context) {
		if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
		const length = context.sampleRate;
		noiseBuffer = context.createBuffer(1, length, context.sampleRate);
		const data = noiseBuffer.getChannelData(0);
		for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
		return noiseBuffer;
	}

	function playTone(instrument, when) {
		let context;
		try {
			context = getAudioContext();
		} catch (error) {
			hint.textContent = error.message;
			return;
		}
		const output = context.createGain();
		output.gain.setValueAtTime(.52, when);
		output.gain.exponentialRampToValueAtTime(.001, when + (instrument === 'bass' ? .48 : .25));
		output.connect(context.destination);

		if (instrument === 'kick' || instrument === 'bass') {
			const oscillator = context.createOscillator();
			const envelope = context.createGain();
			oscillator.type = instrument === 'kick' ? 'sine' : 'triangle';
			oscillator.frequency.setValueAtTime(instrument === 'kick' ? 150 : 63, when);
			oscillator.frequency.exponentialRampToValueAtTime(instrument === 'kick' ? 43 : 36, when + (instrument === 'kick' ? .16 : .43));
			envelope.gain.setValueAtTime(instrument === 'kick' ? .94 : .78, when);
			envelope.gain.exponentialRampToValueAtTime(.001, when + (instrument === 'kick' ? .2 : .5));
			oscillator.connect(envelope).connect(output);
			oscillator.start(when);
			oscillator.stop(when + .51);
			return;
		}

		const source = context.createBufferSource();
		source.buffer = getNoiseBuffer(context);
		const filter = context.createBiquadFilter();
		filter.type = 'highpass';
		filter.frequency.setValueAtTime(instrument === 'hat' ? 8500 : 1300, when);
		const envelope = context.createGain();
		envelope.gain.setValueAtTime(instrument === 'hat' ? .25 : .6, when);
		envelope.gain.exponentialRampToValueAtTime(.001, when + (instrument === 'hat' ? .045 : .2));
		source.connect(filter).connect(envelope).connect(output);
		source.start(when);
		source.stop(when + .22);
	}

	function preview(instrument) {
		try {
			playTone(instrument, getAudioContext().currentTime);
		} catch (error) {
			hint.textContent = error.message;
		}
	}

	function scheduleStep(step, when) {
		for (const instrument of instruments) {
			if (patterns[instrument][step]) playTone(instrument, when);
		}
		window.setTimeout(() => {
			for (const container of rows.values()) {
				[...container.children].forEach((button) => button.classList.remove('playing'));
			}
			for (const container of rows.values()) container.children[step].classList.add('playing');
		}, Math.max(0, (when - audioContext.currentTime) * 1000));
	}

	function advanceStep() {
		nextNoteTime += stepDuration();
		nextStep = (nextStep + 1) % 16;
	}

	function scheduler() {
		while (nextNoteTime < audioContext.currentTime + .12) {
			scheduleStep(nextStep, nextNoteTime);
			advanceStep();
		}
	}

	function stopLoop() {
		isPlaying = false;
		window.clearInterval(timerId);
		playButton.innerHTML = '<span aria-hidden="true">▶</span> PLAY LOOP';
		for (const container of rows.values()) {
			[...container.children].forEach((button) => button.classList.remove('playing'));
		}
	}

	async function togglePlayback() {
		if (isPlaying) {
			stopLoop();
			hint.textContent = 'Loop laid to rest. Change a step and wake it up.';
			return;
		}
		try {
			const context = getAudioContext();
			await context.resume();
		} catch (error) {
			hint.textContent = error.message;
			return;
		}
		isPlaying = true;
		nextStep = 0;
		nextNoteTime = audioContext.currentTime + .06;
		playButton.innerHTML = '<span aria-hidden="true">■</span> STOP LOOP';
		hint.textContent = 'Loop is alive. Keep an eye on step 13.';
		scheduler();
		timerId = window.setInterval(scheduler, 25);
	}

	function setPattern(pattern) {
		for (const instrument of instruments) patterns[instrument] = pattern[instrument].slice();
		paintSteps();
	}

	function randomizePattern() {
		const density = { kick: .38, snare: .2, hat: .66, bass: .24 };
		for (const instrument of instruments) {
			for (let index = 0; index < 16; index += 1) {
				patterns[instrument][index] = Math.random() < density[instrument] ? 1 : 0;
			}
		}
		patterns.snare[4] = 1;
		patterns.snare[12] = 1;
		paintSteps();
		hint.textContent = 'Freshly scrambled. Every séance is different.';
	}

	createSequencer();
	byId('year').textContent = new Date().getFullYear();
	byId('tempo').addEventListener('input', (event) => {
		byId('tempoValue').value = event.target.value;
		byId('tempoValue').textContent = event.target.value;
	});
	playButton.addEventListener('click', togglePlayback);
	byId('randomPattern').addEventListener('click', randomizePattern);
	byId('clearPattern').addEventListener('click', () => {
		for (const instrument of instruments) patterns[instrument].fill(0);
		paintSteps();
		hint.textContent = 'The crypt is quiet. Add some footsteps.';
	});
	byId('savePattern').addEventListener('click', () => {
		try {
			localStorage.setItem(patternStorageKey, JSON.stringify(patterns));
			hint.textContent = 'Pattern saved on this device. It’ll be here next time.';
			showToast('Your pattern has been tucked away safely.');
		} catch {
			hint.textContent = 'This browser would not let me save the pattern.';
		}
	});
	byId('hauntToggle').addEventListener('click', (event) => {
		const enabled = document.body.classList.toggle('haunt-mode');
		event.currentTarget.setAttribute('aria-pressed', String(enabled));
		showToast(enabled ? 'The moon just turned a little red.' : 'The shadows calm down. For now.');
	});
	byId('ghostSticker').addEventListener('click', () => {
		showToast(['Boo! The ghost likes your taste in websites.', 'A ghost just followed you. It has excellent timing.', '👻 You found the friendliest thing in the crypt.'][Math.floor(Math.random() * 3)]);
	});
	byId('moonCharm').addEventListener('click', () => {
		moonTaps += 1;
		if (moonTaps === 13) {
			moonTaps = 0;
			showSecret();
		} else if (moonTaps === 1 || moonTaps === 7) {
			showToast(moonTaps === 1 ? 'The moon noticed that.' : 'Seven knocks. Something stirs beneath the beat.');
		}
	});
	byId('secretClose').addEventListener('click', closeSecret);
	byId('secretOkay').addEventListener('click', closeSecret);
	byId('secretModal').addEventListener('click', (event) => {
		if (event.target === byId('secretModal')) closeSecret();
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !byId('secretModal').hidden) closeSecret();
		if (event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
		const now = Date.now();
		if (now - lastKeyTime > 2200) typedKeys = '';
		lastKeyTime = now;
		if (event.key.length === 1) {
			typedKeys = (typedKeys + event.key.toLowerCase()).slice(-3);
			if (typedKeys === 'boo') {
				typedKeys = '';
				showSecret();
			}
		}
	});
	byId('flashlightToggle').addEventListener('click', (event) => {
		const enabled = document.body.classList.toggle('flashlight-on');
		event.currentTarget.setAttribute('aria-pressed', String(enabled));
		showToast(enabled ? 'Flashlight on. Mind what you find.' : 'Flashlight off. The room is still haunted.');
	});
	document.addEventListener('pointermove', (event) => {
		document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
		document.documentElement.style.setProperty('--my', `${event.clientY}px`);
	}, { passive: true });
	document.addEventListener('visibilitychange', () => {
		if (document.hidden && isPlaying) stopLoop();
	});

	const revealItems = document.querySelectorAll('.reveal');
	if ('IntersectionObserver' in window) {
		const revealObserver = new IntersectionObserver((entries, observer) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					observer.unobserve(entry.target);
				}
			}
		}, { threshold: .12 });
		revealItems.forEach((item) => revealObserver.observe(item));
	} else {
		revealItems.forEach((item) => item.classList.add('is-visible'));
	}
})();
