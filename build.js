// Static site builder. Only dependency: marked.
// Reads site.json, content/essays/*.md, content/links.json, content/*.md pages
// and static/, and writes the finished site to dist/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(ROOT, 'content');
const DIST = path.join(ROOT, 'dist');

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const baseUrl = (site.url || '').replace(/\/+$/, '');

// ---------- helpers ----------

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(value, where) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!m) throw new Error(`${where}: date must be YYYY-MM-DD, got "${value}"`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) throw new Error(`${where}: invalid date "${value}"`);
  return d;
}

const isoDay = (d) => d.toISOString().slice(0, 10);
const humanDate = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const shortDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const abs = (p) => (baseUrl ? baseUrl + p : p);

// Minimal frontmatter: `key: value` lines between --- fences.
function parseFrontmatter(src, where) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) throw new Error(`${where}: missing frontmatter (--- title / date ---)`);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i === -1) throw new Error(`${where}: bad frontmatter line "${line}"`);
    let v = line.slice(i + 1).trim();
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    data[line.slice(0, i).trim()] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

function write(rel, html) {
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else {
      fs.mkdirSync(to, { recursive: true });
      fs.copyFileSync(a, b);
    }
  }
}

// ---------- content ----------

function loadEssays() {
  const dir = path.join(CONTENT, 'essays');
  if (!fs.existsSync(dir)) return [];
  const essays = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const where = `content/essays/${file}`;
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf8'), where);
      if (!data.title) throw new Error(`${where}: missing title`);
      if (!data.date) throw new Error(`${where}: missing date`);
      if (data.draft === 'true') return null;
      const slug = file.replace(/\.md$/, '');
      return {
        title: data.title,
        date: parseDate(data.date, where),
        slug,
        path: `/essays/${slug}/`,
        html: marked.parse(body),
      };
    })
    .filter(Boolean);
  return essays.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
}

function loadLinks() {
  const file = path.join(CONTENT, 'links.json');
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('content/links.json must be an array');
  return raw
    .map((l, i) => {
      const where = `content/links.json[${i}]`;
      if (!l.url || !l.title || !l.date) throw new Error(`${where}: needs url, title and date`);
      return { url: l.url, title: l.title, note: l.note || '', date: parseDate(l.date, where) };
    })
    .sort((a, b) => b.date - a.date);
}

function loadPage(name) {
  const file = path.join(CONTENT, `${name}.md`);
  return fs.existsSync(file) ? marked.parse(fs.readFileSync(file, 'utf8')) : '';
}

// ---------- templates ----------

const NAV = [
  ['/essays/', 'Essays'],
  ['/links/', 'Links'],
  ['/about/', 'About'],
];

function layout({ title, description, current, body, canonical }) {
  const fullTitle = title ? `${title} — ${site.title}` : site.title;
  const nav = NAV.map(
    ([href, label]) =>
      `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('\n        ');
  return `<!doctype html>
<html lang="${esc(site.language || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description || site.description || '')}">
  <meta name="color-scheme" content="light dark">
  ${baseUrl && canonical ? `<link rel="canonical" href="${esc(abs(canonical))}">` : ''}
  <link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/feed.xml">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="wrap">
    <header class="site-header">
      <a class="site-title" href="/">${esc(site.title)}</a>
      <nav>
        ${nav}
      </nav>
    </header>
    <main>
${body}
    </main>
    <footer class="site-footer">
      <a href="/feed.xml">RSS</a>
    </footer>
  </div>
</body>
</html>
`;
}

const essayList = (essays) =>
  essays.length
    ? `<ul class="list">
${essays
  .map(
    (e) =>
      `  <li><a href="${e.path}">${esc(e.title)}</a> <time datetime="${isoDay(e.date)}">${humanDate(e.date)}</time></li>`
  )
  .join('\n')}
</ul>`
    : '<p class="muted">Nothing here yet.</p>';

const linkList = (links) =>
  links.length
    ? `<ul class="list links">
${links
  .map(
    (l) =>
      `  <li><time datetime="${isoDay(l.date)}">${shortDate(l.date)}</time> <a href="${esc(l.url)}">${esc(l.title)}</a>${
        l.note ? `<span class="note">${esc(l.note)}</span>` : ''
      }</li>`
  )
  .join('\n')}
</ul>`
    : '<p class="muted">No links yet.</p>';

// Links page groups by year so long lists stay scannable.
function linksByYear(links) {
  if (!links.length) return linkList(links);
  const years = [...new Set(links.map((l) => l.date.getUTCFullYear()))];
  return years
    .map((y) => `<h2>${y}</h2>\n${linkList(links.filter((l) => l.date.getUTCFullYear() === y))}`)
    .join('\n');
}

// ---------- RSS ----------

function rss(essays, links) {
  const items = [
    ...essays.map((e) => ({
      title: e.title,
      link: abs(e.path),
      date: e.date,
      content: e.html,
    })),
    ...links.map((l) => ({
      title: `Link: ${l.title}`,
      link: l.url,
      guid: `${abs('/links/')}#${isoDay(l.date)}-${encodeURIComponent(l.url)}`,
      date: l.date,
      content: `<p><a href="${esc(l.url)}">${esc(l.title)}</a>${l.note ? ` — ${esc(l.note)}` : ''}</p>`,
    })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 50);

  const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${esc(site.title)}</title>
  <link>${esc(abs('/'))}</link>
  <description>${esc(site.description || '')}</description>
  <language>${esc(site.language || 'en')}</language>
  ${baseUrl ? `<atom:link href="${esc(abs('/feed.xml'))}" rel="self" type="application/rss+xml"/>` : ''}
${items
  .map(
    (it) => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.link)}</link>
    <guid isPermaLink="${it.guid ? 'false' : 'true'}">${esc(it.guid || it.link)}</guid>
    <pubDate>${it.date.toUTCString()}</pubDate>
    <content:encoded>${cdata(it.content)}</content:encoded>
  </item>`
  )
  .join('\n')}
</channel>
</rss>
`;
}

// ---------- build ----------

function build() {
  const essays = loadEssays();
  const links = loadLinks();

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(path.join(ROOT, 'static'), DIST);

  write(
    'index.html',
    layout({
      current: '/',
      canonical: '/',
      body: `<section class="intro">
${loadPage('intro')}
</section>
<section>
<h2>Essays</h2>
${essayList(essays)}
</section>
<section>
<h2>Recent links</h2>
${linkList(links.slice(0, 5))}
${links.length > 5 ? '<p class="more"><a href="/links/">All links →</a></p>' : ''}
</section>`,
    })
  );

  write(
    'essays/index.html',
    layout({ title: 'Essays', current: '/essays/', canonical: '/essays/', body: `<h1>Essays</h1>\n${essayList(essays)}` })
  );

  for (const e of essays) {
    write(
      `essays/${e.slug}/index.html`,
      layout({
        title: e.title,
        current: '/essays/',
        canonical: e.path,
        body: `<article>
<header class="essay-header">
<h1>${esc(e.title)}</h1>
<time datetime="${isoDay(e.date)}">${humanDate(e.date)}</time>
</header>
<div class="prose">
${e.html}
</div>
</article>`,
      })
    );
  }

  write(
    'links/index.html',
    layout({ title: 'Links', current: '/links/', canonical: '/links/', body: `<h1>Links</h1>\n${linksByYear(links)}` })
  );

  write(
    'about/index.html',
    layout({
      title: 'About',
      current: '/about/',
      canonical: '/about/',
      body: `<h1>About</h1>\n<div class="prose">\n${loadPage('about')}\n</div>`,
    })
  );

  write(
    '404.html',
    layout({ title: 'Not found', body: '<h1>Not found</h1>\n<p>That page doesn’t exist. <a href="/">Go home</a>.</p>' })
  );

  write('feed.xml', rss(essays, links));

  console.log(`Built ${essays.length} essay(s), ${links.length} link(s) → dist/`);
  if (!baseUrl) console.log('Note: site.json "url" is empty, so feed links are relative until you set it.');
}

build();
