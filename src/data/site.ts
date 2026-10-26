export const SITE = {
	name: 'The Benn',
	url: 'https://thebenn.me',
	tagline: 'Creative web developer in Slovenia',
	description:
		'The Benn is a freelance creative web developer in Ljubljana, Slovenia. Fast websites, interactive 3D for the web and custom tools, built by someone who also works live TV.',
	locale: 'en',
	city: 'Ljubljana',
	country: 'Slovenia',
	timeZone: 'Europe/Ljubljana',
	formAction: 'https://formspree.io/f/xzzjdgzb',
	ogDefault: '/og/home.jpg',
};

export const SOCIAL = [
	{ label: 'Instagram', handle: '@bmkoscak', url: 'https://www.instagram.com/bmkoscak/' },
	{ label: 'X', handle: '@the999benn', url: 'https://x.com/the999benn' },
	{ label: 'GitHub', handle: 'BMKoscak', url: 'https://github.com/BMKoscak' },
	{ label: 'Spotify', handle: 'The Benn', url: 'https://open.spotify.com/artist/4gLTa6LUi720DnEUWjt76C' },
	{ label: 'SoundCloud', handle: 'The Benn', url: 'https://on.soundcloud.com/kClOV6PSCE6bn2VOWU' },
];

// Canonical profile URLs for the Person entity (short links left out on purpose).
export const SAME_AS = [
	'https://www.instagram.com/bmkoscak/',
	'https://x.com/the999benn',
	'https://github.com/BMKoscak',
	'https://open.spotify.com/artist/4gLTa6LUi720DnEUWjt76C',
];

export const NAV = [
	{ label: 'Work', href: '/work/' },
	{ label: 'Lab', href: '/lab/' },
	{ label: 'About', href: '/about/' },
	{ label: 'Contact', href: '/contact/' },
];

export const SERVICES = [
	{
		id: 'websites',
		title: 'Websites that load fast and feel alive',
		body: 'Portfolios, studio sites and landing pages built with Astro. Static HTML that search engines and AI crawlers can read, with motion and sound layered on top only where it helps.',
		deliverables: ['Design and build', 'SEO and structured data', 'Core Web Vitals in the green', 'Hosting setup'],
	},
	{
		id: 'interactive',
		title: 'Interactive 3D and creative coding',
		body: 'Three.js and WebGL scenes, browser games, audio-reactive visuals and small interactive pieces that make people stay on a page and play.',
		deliverables: ['Three.js and raw WebGL', 'Web Audio synthesis', 'Browser games', 'Product and brand experiences'],
	},
	{
		id: 'tools',
		title: 'Custom tools, automation and AI',
		body: 'Python and JavaScript tools that save someone an hour a day: dashboards, converters, MCP servers and AI integrations wired into the software a team already uses.',
		deliverables: ['Python and FastAPI', 'MCP servers and AI agents', 'Data and file automation', 'Internal dashboards'],
	},
];
