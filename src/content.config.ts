// Content collections. Format reference: docs/CONTENT.md
// Schemas check the essentials (Japanese + name) and stay lenient elsewhere,
// so a contributor's extra field never breaks the build.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.looseObject({ zh: z.string().optional(), en: z.string().optional() });
/** Accept a single value or a list; always yield a list. */
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(item));
const source = z.union([z.string().transform((url) => ({ title: url, url })), z.looseObject({ title: z.string().optional(), url: z.string().optional() })]);
const kanjiPart = z.looseObject({ char: z.string(), reading: z.string().optional(), zh: z.string().optional(), en: z.string().optional() });
const example = z.looseObject({ ja: z.string(), ruby: z.string().optional(), kana: z.string().optional(), zh: z.string().optional(), en: z.string().optional() });

const word = {
  ja: z.string(),
  kana: z.string().optional(),
  romaji: z.string().optional(),
  ruby: z.string().optional(),
  tts: z.string().optional(),
};

const cuts = defineCollection({
  loader: glob({ base: './src/content/cuts', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    ...word,
    kanji: z.string().optional(),
    animal: z.string().optional(),
    kind: z.string().optional(),
    cuisines: list(z.string()).default([]),
    order: z.number().default(999),
    name: text,
    aka: z.looseObject({ ja: list(z.string()).optional(), zh: list(z.string()).optional(), en: list(z.string()).optional() }).optional(),
    variants: list(z.union([z.string(), z.looseObject({ ja: z.string() })])).default([]),
    summary: text.optional(),
    location: text.optional(),
    texture: text.optional(),
    etymology: text.optional(),
    grill: text.optional(),
    profile: z.looseObject({ fat: z.number().optional(), tenderness: z.number().optional(), chew: z.number().optional(), richness: z.number().optional() }).optional(),
    rarity: z.string().optional(),
    seasoning: list(z.string()).default([]),
    yakitori: z.looseObject({ seasoning: z.string().optional() }).optional(),
    example: example.optional(),
    related: list(z.string()).default([]),
    sources: list(source).default([]),
  }),
});

const dishes = defineCollection({
  loader: glob({ base: './src/content/dishes', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    ...word,
    category: z.string().default('other'),
    cuisines: list(z.string()).default([]),
    order: z.number().default(999),
    name: text,
    summary: text.optional(),
    etymology: text.optional(),
    kanjiParts: list(kanjiPart).default([]),
    cuts: list(z.string()).default([]),
    example: example.optional(),
    sources: list(source).default([]),
  }),
});

const terms = defineCollection({
  loader: glob({ base: './src/content/terms', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    ...word,
    category: z.string().default('other'),
    position: z.string().optional(),
    cuisines: list(z.string()).default([]),
    order: z.number().default(999),
    name: text,
    summary: text.optional(),
    kanjiParts: list(kanjiPart).default([]),
    pitfall: text.optional(),
    examples: list(z.union([z.string(), z.looseObject({ ja: z.string() })])).default([]),
    sources: list(source).default([]),
  }),
});

const phrases = defineCollection({
  loader: glob({ base: './src/content/phrases', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    order: z.number().default(999),
    title: text,
    phrases: list(
      z.looseObject({
        id: z.string(),
        ...word,
        zh: z.string().optional(),
        en: z.string().optional(),
        note: text.optional(),
      }),
    ).default([]),
  }),
});

const chainItem = z.looseObject({
  id: z.string(),
  ...word,
  name: text.optional(),
  summary: text.optional(),
  cuts: list(z.string()).default([]),
  terms: list(z.string()).default([]),
  signature: z.boolean().default(false),
  image: z.string().optional(),
});

const chains = defineCollection({
  loader: glob({ base: './src/content/chains', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    ...word,
    brand: z.string().optional(),
    cuisine: z.string().default('yakiniku'),
    format: z.string().optional(),
    url: z.string().optional(),
    summary: text.optional(),
    courses: list(z.looseObject({ ja: z.string(), name: text.optional(), price: z.number().optional(), minutes: z.number().optional() })).default([]),
    items: list(chainItem).default([]),
    vocab: list(z.looseObject({ ja: z.string(), kana: z.string().optional(), romaji: z.string().optional(), ruby: z.string().optional(), zh: z.string().optional(), en: z.string().optional() })).default([]),
    sources: list(source).default([]),
  }),
});

const maps = defineCollection({
  loader: glob({ base: './src/content/maps', pattern: '**/[^_]*.{yaml,yml}' }),
  schema: z.looseObject({
    title: z.looseObject({ ja: z.string().optional(), zh: z.string().optional(), en: z.string().optional() }).optional(),
    source: source.optional(),
    markers: list(
      z.looseObject({ n: z.union([z.number(), z.string()]), label: z.string().optional(), x: z.number(), y: z.number(), cuts: list(z.string()).default([]) }),
    ).default([]),
    regions: list(z.looseObject({ id: z.string(), label: z.string().optional(), cuts: list(z.string()).default([]) })).default([]),
  }),
});

export const collections = { cuts, dishes, terms, phrases, chains, maps };
