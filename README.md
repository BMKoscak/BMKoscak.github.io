# thebenn.me

Personal site of **The Benn**, a creative web developer in Ljubljana, Slovenia.

Built with [Astro](https://astro.build) as a multi-page static site: every page is plain, crawlable HTML, with motion, WebGL and sound layered on top.

## Branches

- `source` holds this Astro project.
- `main` holds the built site. GitHub Pages serves it at https://thebenn.me. Don't edit `main` by hand.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # output in dist/
npm run deploy     # build and publish dist/ to main (run from the source branch)
```

Needs Node 22.12 or newer.

## Where things live

| Path | What it is |
| --- | --- |
| `src/content/work/*.md` | Case studies. Front matter holds the facts, stack, links and images. |
| `src/content/lab/*.md` | Lab experiments. `widget` picks which instrument the page shows. |
| `src/data/site.ts` | Name, social links, services, form endpoint. |
| `src/pages/` | Home, work, lab, about, contact, 404, plus `llms.txt`, `robots.txt` and a Markdown copy of every case study (`/work/<slug>.md`). |
| `src/scripts/scope.ts` | The persistent WebGL XY-scope trace drawn into any `[data-scope]` box. Falls back to SVG on machines without a GPU. |
| `src/scripts/audio.ts` | Every sound on the site, synthesized with the Web Audio API. |
| `src/scripts/motion.ts` | Lenis smooth scroll + GSAP ScrollTrigger on one shared ticker, torn down and rebuilt on each page swap. Loaded after the page is idle. |
| `src/scripts/widgets/` | The interactive pieces (pads, mixer, viewfinder, LED stepper, alpha-beta demo, dialogue). |
| `src/styles/global.css` | Design tokens and shared styles. |
| `public/fonts/` | Subset variable fonts: Archivo, Bricolage Grotesque, Fraunces Italic, Shantell Sans (all SIL OFL). |
| `public/og/` | Social preview images, made with `npm run og` (needs Python with Playwright). |

## Adding a case study

1. Add images to `src/assets/work/`.
2. Copy one of `src/content/work/*.md`, change the front matter and write the text.
3. Run `npm run og` to make its preview image, then `npm run deploy`.

## Analytics and Search Console

Copy `.env.example` to `.env`, fill in your GoatCounter code and/or Search Console verification value, then deploy. Nothing is loaded until these are set.

## SEO built in

- JSON-LD graph on every page: Person, ProfessionalService, WebSite, WebPage, BreadcrumbList, plus VideoGame / SoftwareSourceCode / CreativeWork / WebApplication on project pages.
- Canonical URLs, Open Graph and X cards with 1200×630 images.
- `sitemap-index.xml` with `lastmod` taken from git history, not the build date.
- `robots.txt` that allows search and AI crawlers, and `/llms.txt` that indexes the Markdown copies.

## Credits

Fonts under the SIL Open Font License (see `public/fonts/`). Chains of Hera and MCP Nexus screenshots come from their own repositories.
