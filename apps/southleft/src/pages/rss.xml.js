// /rss.xml — spec 2026-08-20-southleft-example-app, T4-1. Mirrors v5's feed.
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';

export async function GET(context) {
  const posts = (await getCollection('insights')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: `${SITE.name} — Insights`,
    description: 'Design systems, AI, and the craft of building for the web.',
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      categories: [post.data.categoryName],
      link: `/insights/${post.data.category}/${post.id.replace(/\.md$/, '')}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
