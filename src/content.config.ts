// Content collections. Format reference: docs/CONTENT.md
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Trilingual text; Japanese is the main language. */
const tri = z.looseObject({ ja: z.string().optional(), zh: z.string().optional(), en: z.string().optional() });
const list = <T extends z.ZodType>(item: T) => z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(item));
const source = z.union([z.string().transform((url) => ({ title: url, url })), z.looseObject({ title: z.string().optional(), url: z.string().optional() })]);
const word = { ja: z.string(), ruby: z.string().optional(), kana: z.string().optional(), romaji: z.string().optional(), tts: z.string().optional() };

const tabs = defineCollection({
  loader: glob({ base: './src/content/tabs', pattern: '*.{yaml,yml}' }),
  schema: z.looseObject({ ...word, order: z.number().default(99), zh: z.string().optional(), en: z.string().optional() }),
});

const groups = defineCollection({
  loader: glob({ base: './src/content/groups', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    order: z.number().default(99),
    ja: z.string(),
    zh: z.string().optional(),
    en: z.string().optional(),
    note: tri.optional(),
    items: list(
      z.looseObject({
        id: z.string(),
        ...word,
        mean: tri.optional(),
        part: tri.optional(),
        note: tri.optional(),
        sources: list(source).default([]),
      }),
    ).default([]),
  }),
});

const chains = defineCollection({
  loader: glob({ base: './src/content/chains', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    ...word,
    cuisine: z.string().default('yakiniku'),
    url: z.string().optional(),
    note: tri.optional(),
    order: z.number().default(99),
    items: list(
      z.looseObject({
        id: z.string(),
        ...word,
        rows: list(z.string()).optional(),
        cuts: list(z.string()).optional(), // older files
        mean: tri.optional(),
        name: tri.optional(), // older files
        signature: z.boolean().default(false),
        image: z.string().optional(),
      }),
    ).default([]),
  }),
});

export const collections = { tabs, groups, chains };
