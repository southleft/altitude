// Content collections — mirrors southleft-v5's `src/content.config.ts`
// schema exactly (spec 2026-08-20-southleft-example-app, T4), with one
// addition: `hero` passes through `resolveMedia()`. The markdown files
// themselves were already rewritten once (`scripts/rewrite-media-base.mjs`)
// to point `/media/<file>` references at the deployed v5 media host — this
// transform is now a defensive no-op (resolveMedia is idempotent on an
// already-absolute URL) that only matters if a future post is authored with
// a bare `/media/...` path again.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { resolveMedia } from './lib/media.mjs';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    categoryName: z.string(),
    excerpt: z.string().default(''),
    hero: z
      .string()
      .optional()
      .transform((v) => (v ? resolveMedia(v) : v)),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    client: z.string(),
    date: z.coerce.date(),
    oneLiner: z.string().default(''),
    summary: z.string().default(''),
    capabilities: z.array(z.string()).default([]),
    industry: z.string().default(''),
    hero: z
      .string()
      .optional()
      .transform((v) => (v ? resolveMedia(v) : v)),
    showHero: z.boolean().default(true),
    featured: z.boolean().default(false),
  }),
});

export const collections = { insights, work };
