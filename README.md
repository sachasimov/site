# site

Minimal personal site: essays, links, about, RSS. A single Node script (`build.js`) turns `content/` into static HTML in `dist/`. The only dependency is [marked](https://marked.js.org).

## Use

```sh
npm install
npm run build      # writes dist/
npm run serve      # previews dist/ at http://localhost:4000
npm run dev        # build + serve
```

## Content

| What | Where |
|---|---|
| Essays | `content/essays/<slug>.md` → `/essays/<slug>/` |
| Links | `content/links.json` |
| Home intro | `content/intro.md` |
| About page | `content/about.md` |
| Site settings | `site.json` |
| CSS and other static files | `static/` (copied as-is to `dist/`) |

An essay needs `title` and `date` frontmatter:

```md
---
title: Nobody Cares About Abundance
date: 2026-11-24
---

Body in Markdown…
```

Add `draft: true` to keep an essay out of the build.

A link has `date`, `url`, `title` and an optional one-line `note`:

```json
[
  { "date": "2026-11-24", "url": "https://example.com", "title": "Example", "note": "Why it's worth reading." }
]
```

The home page lists every essay and the 5 most recent links. `/feed.xml` covers both, newest first, capped at 50 items.

## Deploy

Configs for both hosts are included: `vercel.json` and `netlify.toml`. Both run `npm run build` and publish `dist/`.

Before going live, set `url` in `site.json` (for example `"https://example.com"`). It makes the RSS feed links absolute and adds canonical tags. Until it's set, those links are relative.
