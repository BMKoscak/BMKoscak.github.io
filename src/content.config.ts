import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), url: z.string().url() });
const fact = z.object({ label: z.string(), value: z.string() });

const work = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/work' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			seoTitle: z.string().max(60),
			description: z.string().max(160),
			summary: z.string(),
			kind: z.string(),
			schemaType: z.enum(['VideoGame', 'SoftwareSourceCode', 'CreativeWork', 'SoftwareApplication']),
			year: z.number().optional(),
			status: z.string(),
			role: z.string(),
			stack: z.array(z.string()),
			links: z.array(link).default([]),
			facts: z.array(fact),
			cover: image().optional(),
			coverAlt: z.string().optional(),
			gallery: z
				.array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
				.default([]),
			widget: z.enum(['none', 'timeline', 'alphabeta', 'dialogue']).default('none'),
			order: z.number(),
			published: z.coerce.date(),
			updated: z.coerce.date().optional(),
		}),
});

const lab = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/lab' }),
	schema: z.object({
		title: z.string(),
		seoTitle: z.string().max(60),
		description: z.string().max(160),
		summary: z.string(),
		widget: z.enum(['scope', 'pads', 'mixer', 'viewfinder', 'leds']),
		scope: z.string().default('1:1'),
		order: z.number(),
		published: z.coerce.date(),
	}),
});

export const collections = { work, lab };
