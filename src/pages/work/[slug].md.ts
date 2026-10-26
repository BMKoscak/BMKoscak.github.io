import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () =>
	(await getCollection('work')).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));

// A clean Markdown copy of each case study for AI crawlers and agents.
export const GET: APIRoute = ({ props }) => {
	const { entry } = props as { entry: CollectionEntry<'work'> };
	const d = entry.data;
	const lines = [
		`# ${d.title}`,
		'',
		`> ${d.summary}`,
		'',
		`- Type: ${d.kind}`,
		`- Status: ${d.status}`,
		...(d.year ? [`- Year: ${d.year}`] : []),
		`- Role: ${d.role}`,
		`- Built with: ${d.stack.join(', ')}`,
		`- Canonical page: https://thebenn.me/work/${entry.id}/`,
		...d.links.map((l) => `- ${l.label}: ${l.url}`),
		'',
		'## Facts',
		'',
		...d.facts.map((f) => `- ${f.label}: ${f.value}`),
		'',
		(entry.body || '').trim(),
		'',
		'---',
		'Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/',
		'',
	];
	return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
