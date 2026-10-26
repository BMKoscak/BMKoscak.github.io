import type { APIRoute } from 'astro';

// Search engines and AI crawlers are all welcome; the site is public by design.
export const GET: APIRoute = () =>
	new Response(
		[
			'User-agent: *',
			'Allow: /',
			'',
			'User-agent: Googlebot',
			'Allow: /',
			'',
			'User-agent: Bingbot',
			'Allow: /',
			'',
			'User-agent: GPTBot',
			'Allow: /',
			'',
			'User-agent: OAI-SearchBot',
			'Allow: /',
			'',
			'User-agent: ClaudeBot',
			'Allow: /',
			'',
			'User-agent: Claude-SearchBot',
			'Allow: /',
			'',
			'User-agent: PerplexityBot',
			'Allow: /',
			'',
			'User-agent: Google-Extended',
			'Allow: /',
			'',
			'Sitemap: https://thebenn.me/sitemap-index.xml',
			'',
		].join('\n'),
		{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
	);
