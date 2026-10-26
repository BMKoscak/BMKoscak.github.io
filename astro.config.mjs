// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const SITE = 'https://thebenn.me';

// lastmod for each URL comes from the git history of the file(s) that produce it,
// not from the build date, so search engines only see a change when something changed.
function gitDate(paths) {
	const files = paths.filter((p) => existsSync(p));
	if (!files.length) return undefined;
	try {
		const out = execSync(`git log -1 --format=%cI -- ${files.map((f) => `"${f}"`).join(' ')}`, {
			stdio: ['ignore', 'pipe', 'ignore'],
		})
			.toString()
			.trim();
		return out || undefined;
	} catch {
		return undefined;
	}
}

function sourcesFor(pathname) {
	const p = pathname.replace(/\/$/, '');
	const parts = p.split('/').filter(Boolean);
	if (parts[0] === 'work' && parts[1]) return [`src/content/work/${parts[1]}.md`];
	if (parts[0] === 'lab' && parts[1]) return [`src/content/lab/${parts[1]}.md`, `src/components/lab`];
	if (parts[0] === 'work') return ['src/pages/work/index.astro', 'src/content/work'];
	if (parts[0] === 'lab') return ['src/pages/lab/index.astro', 'src/content/lab'];
	if (parts[0]) return [`src/pages/${parts[0]}.astro`];
	return ['src/pages/index.astro', 'src/content'];
}

export default defineConfig({
	site: SITE,
	trailingSlash: 'always',
	build: { format: 'directory', inlineStylesheets: 'always' },
	prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
	image: { responsiveStyles: false },
	integrations: [
		sitemap({
			filter: (page) => !page.includes('/og/') && !page.endsWith('/404/'),
			serialize(item) {
				const { pathname } = new URL(item.url);
				const lastmod = gitDate(sourcesFor(pathname));
				if (lastmod) item.lastmod = lastmod;
				return item;
			},
		}),
	],
});
