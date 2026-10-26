import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, SERVICES, SOCIAL } from '../data/site';

export const GET: APIRoute = async () => {
	const work = (await getCollection('work')).sort((a, b) => a.data.order - b.data.order);
	const lab = (await getCollection('lab')).sort((a, b) => a.data.order - b.data.order);
	const out = [
		'# The Benn',
		'',
		`> ${SITE.description}`,
		'',
		'The Benn (Ben) is a freelance creative web developer based in Ljubljana, Slovenia. He studies computer science at the Faculty of Computer and Information Science (FRI), University of Ljubljana, helps cover live soccer for SNL and NZS broadcasts and helps with the software behind them, and previously made short films, photography and drill beats (released as The Benn on Spotify).',
		'',
		'## Services',
		'',
		...SERVICES.map((s) => `- ${s.title}: ${s.body}`),
		'',
		'## Case studies',
		'',
		...work.map((w) => `- [${w.data.title}](${SITE.url}/work/${w.id}.md): ${w.data.description}`),
		'',
		'## Lab (interactive experiments)',
		'',
		...lab.map((l) => `- [${l.data.title}](${SITE.url}/lab/${l.id}.md): ${l.data.description}`),
		'',
		'## Pages',
		'',
		`- [About](${SITE.url}/about/): background, story and tools`,
		`- [Contact](${SITE.url}/contact/): project enquiry form`,
		'',
		'## Profiles',
		'',
		...SOCIAL.map((s) => `- ${s.label}: ${s.url}`),
		'',
	];
	return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
