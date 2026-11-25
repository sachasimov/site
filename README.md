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

The site is hosted on GitHub Pages. `.github/workflows/pages.yml` builds and deploys it on every push to `main`.

`url` in `site.json` is the live address. It makes feed links absolute, adds canonical tags, and sets the path prefix: `https://sachasimov.github.io/site` serves everything under `/site/`, while a bare domain like `https://2s2a1h.com` serves from `/`. `npm run serve` mirrors that prefix locally.

To switch to a custom domain: set `url` to the domain, add `static/CNAME` containing the bare domain (e.g. `2s2a1h.com`), push, and point DNS at GitHub Pages.

`vercel.json` and `netlify.toml` are kept as alternatives. Both run `npm run build` and publish `dist/`. Set `url` to the matching address if you switch hosts.
