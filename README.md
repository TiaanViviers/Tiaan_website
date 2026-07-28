# Tiaan Viviers — Personal Website

Monochrome Noir cinematic personal site built with Astro.

## Stack

- Astro + TypeScript
- Tailwind CSS v4
- Content Collections (Markdown/MDX)
- Static output for Cloudflare Pages

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Output lands in `dist/`.

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22` or newer

Connect the GitHub repository and enable production deploys from `main`, with preview deployments for pull requests.

## Content

- Projects: `src/content/projects/`
- Writing: `src/content/writing/`

Edit frontmatter and Markdown bodies; pages update automatically.

## Identity

Configured in `src/data/site.ts` (name, email, social links, canonical URL).
