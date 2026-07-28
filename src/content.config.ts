import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    category: z.string(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    image: z.string(),
    imagePosition: z.string().optional(),
    technologies: z.array(z.string()).default([]),
    links: z
      .object({
        repository: z.string().optional(),
        report: z.string().optional(),
        demo: z.string().optional(),
      })
      .optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

export const collections = { projects, writing };
