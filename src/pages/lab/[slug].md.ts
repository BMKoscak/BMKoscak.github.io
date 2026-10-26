import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () =>
	(await getCollection('lab')).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));

export const GET: APIRoute = ({ props }) => {
	const { entry } = props as { entry: CollectionEntry<'lab'> };
	const d = entry.data;
	const text = [
		`# ${d.title}`,
		'',
		`> ${d.summary}`,
		'',
		`Interactive version: https://thebenn.me/lab/${entry.id}/`,
		'',
		(entry.body || '').trim(),
		'',
		'---',
		'Author: The Benn, creative web developer in Ljubljana, Slovenia. https://thebenn.me/about/',
		'',
	].join('\n');
	return new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
