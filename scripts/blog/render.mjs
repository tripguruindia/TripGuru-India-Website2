// Renders the blog as plain HTML files into dist/.
//
// Why static HTML and not React routes: Google renders JavaScript eventually,
// but ChatGPT, Perplexity, Claude and Bing's AI crawlers mostly do not — they
// read the HTML they are served. A blog rendered by the SPA would be an empty
// <div id="root"> to them. Vercel serves a real file before applying the SPA
// rewrite, so dist/blog/<slug>/index.html is what /blog/<slug> returns.

import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import { BASE_URL, CATEGORIES, loadPosts, loadSiteData, wordCount } from './lib.mjs';

const GA_ID = 'G-QFVXF6FNGK';
const AUTHOR = 'TripGuru Travel Desk';

const esc = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const readingMinutes = (post) => Math.max(3, Math.round(wordCount(post.body) / 220));

function headingId(text, used) {
  let id = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'section';
  let unique = id;
  for (let n = 2; used.has(unique); n++) unique = `${id}-${n}`;
  used.add(unique);
  return unique;
}

function renderMarkdown(markdown) {
  const used = new Set();
  const toc = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      // Articles are written by a model from web research; never let raw HTML
      // from the source material through as markup.
      html({ text }) {
        return esc(text);
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = headingId(inner, used);
        if (depth === 2) toc.push({ id, text: inner.replace(/<[^>]+>/g, '') });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href) && !href.startsWith(BASE_URL);
        const attrs = external ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${attrs}>${text}</a>`;
      },
      table(token) {
        // marked's default table, wrapped so wide tables scroll on a phone
        // instead of pushing the page sideways.
        const header = token.header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('');
        const rows = token.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
          .join('');
        return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
      },
    },
  });
  const html = marked.parse(markdown);
  return { html, toc };
}

const STYLE = `
:root{--bg:#0D0B08;--bg-2:#121009;--surface:#1A1710;--surface-2:#221E14;--gold:#C9A84C;--gold-light:#DFC479;--gold-dim:rgba(201,168,76,.12);--border:rgba(201,168,76,.2);--text:#F0EAE0;--text-2:#B8AE9C;--muted:#8A8070;--wa:#128C7E;color-scheme:dark}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 17px/1.75 "DM Sans",system-ui,sans-serif}
a{color:var(--gold-light)}
img{max-width:100%;display:block}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.site-header{position:sticky;top:0;z-index:10;background:rgba(13,11,8,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.site-header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:68px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);font:500 24px/1 "Cormorant Garamond",serif}
.brand img{width:38px;height:38px;object-fit:contain}
.nav{display:flex;align-items:center;gap:26px}
.nav a{color:var(--text);text-decoration:none;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.nav a:hover,.nav a[aria-current]{color:var(--gold)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 22px;border-radius:4px;background:var(--gold);color:#0D0B08!important;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none}
.btn:hover{background:var(--gold-light)}
.btn.wa{background:var(--wa);color:#fff!important}
@media (max-width:760px){.nav a:not(.btn){display:none}.nav .btn{padding:0 14px}}
.eyebrow{color:var(--gold);font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase}
h1,h2,h3{font-family:"Cormorant Garamond",serif;font-weight:600;line-height:1.15;color:var(--text)}
.page-hero{padding:56px 0 28px;border-bottom:1px solid var(--border)}
.page-hero h1{font-size:clamp(38px,6vw,60px);margin:10px 0 12px}
.page-hero p{color:var(--text-2);max-width:640px;margin:0}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 0}
.chips a{border:1px solid var(--border);border-radius:999px;padding:8px 16px;color:var(--text-2);text-decoration:none;font-size:13px;min-height:40px;display:inline-flex;align-items:center}
.chips a[aria-current]{background:var(--gold-dim);color:var(--gold-light);border-color:var(--gold)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:26px;padding:40px 0 70px}
.card{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--gold);transform:translateY(-2px)}
.card .thumb{position:relative;aspect-ratio:16/9;background:linear-gradient(135deg,#2a2314,#0D0B08 70%);display:flex;align-items:flex-end;padding:16px;overflow:hidden}
.card .thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.card .thumb span{font:italic 600 28px/1 "Cormorant Garamond",serif;color:var(--gold)}
.card .body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h2{font-size:25px;margin:0}
.card p{margin:0;color:var(--text-2);font-size:15px;line-height:1.6}
.card .meta{margin-top:auto;padding-top:8px;color:var(--muted);font-size:13px}
.empty{padding:60px 0;color:var(--text-2)}
.crumbs{font-size:13px;color:var(--muted);padding-top:28px}
.crumbs a{color:var(--text-2);text-decoration:none}
.article-head{max-width:780px;margin:0 auto;padding:18px 0 8px}
.article-head h1{font-size:clamp(36px,5.4vw,56px);margin:12px 0 14px}
.article-head .dek{font-size:19px;color:var(--text-2);margin:0 0 16px}
.byline{color:var(--muted);font-size:14px}
.hero-img{max-width:1000px;margin:26px auto 0;border-radius:6px;overflow:hidden;aspect-ratio:16/8;background:var(--surface)}
.hero-img img{width:100%;height:100%;object-fit:cover}
.article{max-width:720px;margin:0 auto;padding:30px 0 20px}
.answer{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:6px;padding:20px 24px;margin:0 0 26px}
.answer strong{display:block;color:var(--gold);font-size:12px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px}
.answer p{margin:0}
.facts{width:100%;border-collapse:collapse;margin:0 0 30px;font-size:15px}
.facts th,.facts td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:top}
.facts th{color:var(--muted);font-weight:500;width:38%}
.toc{border:1px solid var(--border);border-radius:6px;padding:18px 24px;margin:0 0 34px}
.toc strong{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
.toc ol{margin:10px 0 0;padding-left:20px}
.toc li{margin:4px 0}
.toc a{color:var(--text-2);text-decoration:none}
.toc a:hover{color:var(--gold-light)}
.prose h2{font-size:34px;margin:46px 0 12px;scroll-margin-top:84px}
.prose h3{font-size:25px;margin:32px 0 8px;scroll-margin-top:84px}
.prose p,.prose ul,.prose ol{margin:0 0 18px}
.prose li{margin:6px 0}
.prose strong{color:#fff}
.prose blockquote{margin:24px 0;padding:4px 20px;border-left:3px solid var(--gold);color:var(--text-2)}
.table-wrap{overflow-x:auto;margin:0 0 24px;border:1px solid var(--border);border-radius:6px}
.prose table{border-collapse:collapse;width:100%;font-size:15px;line-height:1.5}
.prose th,.prose td{padding:10px 14px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.prose th{background:var(--surface-2);color:var(--gold-light);font-weight:600}
.prose tr:last-child td{border-bottom:0}
.cta{background:linear-gradient(135deg,var(--surface-2),var(--surface));border:1px solid var(--gold);border-radius:8px;padding:28px;margin:44px 0}
.cta h2{margin:0 0 8px;font-size:30px}
.cta p{color:var(--text-2);margin:0 0 18px}
.cta .row{display:flex;flex-wrap:wrap;gap:12px}
.cta .btn.ghost{background:transparent;border:1px solid var(--gold);color:var(--gold-light)!important}
.faq h2{font-size:34px;margin:46px 0 16px}
.faq h3{font-size:22px;margin:24px 0 6px}
.faq p{margin:0;color:var(--text-2)}
.sources{margin:40px 0 0;padding-top:20px;border-top:1px solid var(--border);font-size:14px;color:var(--muted)}
.sources h2{font-family:"DM Sans",sans-serif;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.sources ol{padding-left:20px;margin:0}
.sources a{color:var(--text-2);word-break:break-word}
.related{border-top:1px solid var(--border);margin-top:40px}
.related h2{font-size:32px;margin:40px 0 0}
.related .grid{padding-top:24px}
.site-footer{border-top:1px solid var(--border);padding:34px 0;color:var(--muted);font-size:14px}
.site-footer .wrap{display:flex;flex-wrap:wrap;gap:12px 28px;justify-content:space-between}
.site-footer a{color:var(--text-2);text-decoration:none}
`;

function layout({ title, description, canonical, image, imageAlt, ogType = 'website', head = '', body, current, publishedTime, modifiedTime, siteData }) {
  const { LOGO_URL } = siteData;
  const ogImage = image || `https://res.cloudinary.com/dnty2fhxp/image/upload/w_1200,h_630,c_pad,b_auto/v1773128212/TripGuru_Logo_WITHOUT_BACKGROUND_WITHOUT_INDIA_kjgdbk.png`;
  const icon = (size) => LOGO_URL.replace('/upload/', `/upload/w_${size},h_${size},c_scale/`);
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="TripGuru">
<meta property="og:locale" content="en_IN">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:alt" content="${esc(imageAlt || title)}">
${publishedTime ? `<meta property="article:published_time" content="${publishedTime}">\n<meta property="article:modified_time" content="${modifiedTime}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#0D0B08">
<link rel="icon" type="image/png" sizes="64x64" href="${icon(64)}">
<link rel="apple-touch-icon" sizes="180x180" href="${icon(180)}">
<link rel="alternate" type="application/rss+xml" title="TripGuru Blog" href="${BASE_URL}/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<style>${STYLE}</style>
${head}
</head>
<body>
<header class="site-header"><div class="wrap">
<a class="brand" href="/"><img src="${icon(96)}" alt="" width="38" height="38">TripGuru</a>
<nav class="nav" aria-label="Main">
<a href="/destinations">Destinations</a>
<a href="/offers">Offers</a>
<a href="/blog"${current === 'blog' ? ' aria-current="page"' : ''}>Blog</a>
<a href="/contact">Contact</a>
<a class="btn wa" href="${siteData.CONTACT_INFO.whatsapp}" target="_blank" rel="noopener">Plan my trip</a>
</nav>
</div></header>
<main>
${body}
</main>
<footer class="site-footer"><div class="wrap">
<span>© ${new Date().getFullYear()} TripGuru · Gorakhpur, Uttar Pradesh</span>
<span><a href="/">Home</a> · <a href="/destinations">Destinations</a> · <a href="/blog">Blog</a> · <a href="/contact">Contact</a> · <a href="/privacy-policy">Privacy</a></span>
<span>WhatsApp <a href="${siteData.CONTACT_INFO.whatsapp}">${esc(siteData.CONTACT_INFO.phone)}</a> · <a href="mailto:${siteData.CONTACT_INFO.email}">${esc(siteData.CONTACT_INFO.email)}</a></span>
</div></footer>
</body>
</html>
`;
}

function card(post) {
  const thumb = post.heroImage
    ? `<img src="${esc(post.heroImage)}" alt="${esc(post.heroAlt || post.title)}" loading="lazy">`
    : `<span>${esc(CATEGORIES[post.category].name)}</span>`;
  return `<a class="card" href="/blog/${post.slug}">
<div class="thumb">${thumb}</div>
<div class="body">
<div class="eyebrow">${esc(CATEGORIES[post.category].name)}</div>
<h2>${esc(post.title)}</h2>
<p>${esc(post.description)}</p>
<div class="meta">${formatDate(post.updated)} · ${readingMinutes(post)} min read</div>
</div>
</a>`;
}

function listingPage({ posts, category, siteData }) {
  const cat = category && CATEGORIES[category];
  const canonical = `${BASE_URL}/blog${category ? `/category/${category}` : ''}`;
  const heading = cat ? `${cat.name} travel guides` : 'Travel guides from TripGuru';
  const title = cat ? `${cat.name} Travel Guides & Tips | TripGuru Blog` : 'Travel Blog — Guides, Costs & Tips from India | TripGuru';
  const description = cat
    ? `${cat.blurb} Practical, up-to-date guides from TripGuru, Gorakhpur.`
    : 'Practical travel guides for Indian travellers: Nepal from India, international holidays, visas, budgets, itineraries and the best time to go — from TripGuru, Gorakhpur.';
  const chips = [['', 'All'], ...Object.entries(CATEGORIES).map(([key, c]) => [key, c.name])]
    .map(([key, name]) => `<a href="/blog${key ? `/category/${key}` : ''}"${(category || '') === key ? ' aria-current="page"' : ''}>${name}</a>`)
    .join('');
  const list = posts.length
    ? `<div class="grid">${posts.map(card).join('\n')}</div>`
    : `<p class="empty">New guides are on their way. Meanwhile, <a href="${siteData.CONTACT_INFO.whatsapp}">ask us anything on WhatsApp</a>.</p>`;
  const schema = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: heading,
    url: canonical,
    description,
    isPartOf: { '@type': 'WebSite', name: 'TripGuru', url: BASE_URL },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE_URL}/blog/${p.slug}`, name: p.title })),
    },
  });
  return layout({
    title,
    description,
    canonical,
    current: 'blog',
    head: schema,
    siteData,
    body: `<section class="page-hero"><div class="wrap">
<div class="eyebrow">TripGuru Blog</div>
<h1>${esc(heading)}</h1>
<p>${esc(cat ? cat.blurb : 'Honest, practical guides for travellers from India — what it costs, how to get there, and what to know before you go.')}</p>
<nav class="chips" aria-label="Categories">${chips}</nav>
</div></section>
<div class="wrap">${list}</div>`,
  });
}

function postPage({ post, posts, siteData }) {
  const url = `${BASE_URL}/blog/${post.slug}`;
  const cat = CATEGORIES[post.category];
  const { html, toc } = renderMarkdown(post.body);
  const faqs = post.faqs || [];
  const facts = post.keyFacts || [];
  const sources = post.sources || [];
  const related = posts.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const fill = posts.filter((p) => p.slug !== post.slug && !related.includes(p)).slice(0, 3 - related.length);
  const relatedPosts = [...related, ...fill];

  const cta = post.cta || {};
  const ctaLink = cta.path
    ? `<a class="btn ghost" href="${esc(cta.path)}">${esc(cta.label || 'See the package')}</a>`
    : '';
  const waText = encodeURIComponent(`Hi TripGuru, I read "${post.title}" on your blog and would like help planning this trip.`);

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url,
      mainEntityOfPage: url,
      datePublished: post.date,
      dateModified: post.updated,
      inLanguage: 'en-IN',
      articleSection: cat.name,
      keywords: (post.tags || []).join(', '),
      wordCount: wordCount(post.body),
      ...(post.heroImage ? { image: post.heroImage } : {}),
      author: { '@type': 'Organization', name: AUTHOR, url: BASE_URL },
      publisher: { '@type': 'Organization', name: 'TripGuru', url: BASE_URL, logo: { '@type': 'ImageObject', url: siteData.LOGO_URL } },
      ...(sources.length ? { citation: sources.map((s) => s.url) } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: cat.name, item: `${BASE_URL}/blog/category/${post.category}` },
        { '@type': 'ListItem', position: 4, name: post.title, item: url },
      ],
    },
  ];
  if (faqs.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  const body = `<div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/blog">Blog</a> › <a href="/blog/category/${post.category}">${esc(cat.name)}</a></nav>
<header class="article-head">
<div class="eyebrow">${esc(cat.name)}</div>
<h1>${esc(post.title)}</h1>
<p class="dek">${esc(post.description)}</p>
<div class="byline">By ${AUTHOR} · Updated <time datetime="${post.updated}">${formatDate(post.updated)}</time> · ${readingMinutes(post)} min read</div>
</header>
${post.heroImage ? `<figure class="hero-img"><img src="${esc(post.heroImage)}" alt="${esc(post.heroAlt || post.title)}" fetchpriority="high"></figure>` : ''}
<article class="article">
${post.summary ? `<div class="answer"><strong>Quick answer</strong><p>${esc(post.summary)}</p></div>` : ''}
${facts.length ? `<table class="facts"><caption class="eyebrow" style="text-align:left;padding-bottom:8px">Key facts</caption><tbody>${facts.map((f) => `<tr><th scope="row">${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`).join('')}</tbody></table>` : ''}
${toc.length > 2 ? `<nav class="toc" aria-label="In this guide"><strong>In this guide</strong><ol>${toc.map((t) => `<li><a href="#${t.id}">${t.text}</a></li>`).join('')}</ol></nav>` : ''}
<div class="prose">
${html}
</div>
<aside class="cta">
<h2>${esc(cta.heading || 'Want us to plan this trip for you?')}</h2>
<p>${esc(cta.text || 'Tell us your dates, city and budget on WhatsApp — our Gorakhpur team replies with a day-by-day plan and a clear price.')}</p>
<div class="row"><a class="btn wa" href="https://wa.me/${siteData.CONTACT_INFO.whatsapp.replace(/\D/g, '')}?text=${waText}" target="_blank" rel="noopener">Chat on WhatsApp</a>${ctaLink}</div>
</aside>
${faqs.length ? `<section class="faq"><h2 id="faq">Frequently asked questions</h2>${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n')}</section>` : ''}
${sources.length ? `<section class="sources"><h2>Sources</h2><ol>${sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.title || s.url)}</a></li>`).join('')}</ol><p>Rules, fees and timings change. We checked these facts on ${formatDate(post.updated)}; confirm visa and entry rules with the official source before you travel.</p></section>` : ''}
</article>
${relatedPosts.length ? `<section class="related"><h2>Keep reading</h2><div class="grid">${relatedPosts.map(card).join('\n')}</div></section>` : ''}
</div>`;

  return layout({
    title: post.seoTitle || `${post.title} | TripGuru`,
    description: post.description,
    canonical: url,
    image: post.heroImage,
    imageAlt: post.heroAlt,
    ogType: 'article',
    publishedTime: post.date,
    modifiedTime: post.updated,
    current: 'blog',
    head: schemas.map(jsonLd).join('\n'),
    siteData,
    body,
  });
}

function rss(posts) {
  const items = posts
    .slice(0, 30)
    .map(
      (p) => `<item><title>${esc(p.title)}</title><link>${BASE_URL}/blog/${p.slug}</link><guid>${BASE_URL}/blog/${p.slug}</guid><pubDate>${new Date(`${p.date}T04:00:00Z`).toUTCString()}</pubDate><category>${esc(CATEGORIES[p.category].name)}</category><description>${esc(p.description)}</description></item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>TripGuru Blog</title><link>${BASE_URL}/blog</link>
<description>Travel guides for Indian travellers from TripGuru, Gorakhpur.</description>
<language>en-in</language>
${items}
</channel></rss>
`;
}

// llms.txt is the emerging convention for telling AI assistants what a site is
// and which pages are worth reading. It costs nothing and is read by some.
async function llmsTxt(posts, siteData) {
  const { packageLandingPages, DESTINATIONS, CONTACT_INFO } = siteData;
  const lines = [
    '# TripGuru',
    '',
    '> TripGuru is a travel agency based in Gorakhpur, Uttar Pradesh, India. It plans and books holidays for Indian travellers: Nepal tours from India (by road through the Sunauli/Bhairahawa and Raxaul/Birgunj borders, or by air), international holidays (flights, hotels, visas) and trips within India.',
    '',
    `Contact: WhatsApp ${CONTACT_INFO.phone} · ${CONTACT_INFO.email} · ${BASE_URL}/contact`,
    '',
    '## Key pages',
    `- [Nepal trip planner](${BASE_URL}/nepal): build and price a Nepal tour online`,
    `- [All destinations](${BASE_URL}/destinations)`,
    ...packageLandingPages.map((p) => `- [${p.name}](${BASE_URL}${p.path}): ${p.description}`),
    '',
    '## Destinations',
    ...DESTINATIONS.map((d) => `- [${d.name}](${BASE_URL}/destinations/${d.slug})`),
    '',
    '## Travel guides',
    ...posts.map((p) => `- [${p.title}](${BASE_URL}/blog/${p.slug}): ${p.description}`),
    '',
  ];
  return lines.join('\n');
}

function write(distDir, relPath, content) {
  if (!distDir) return;
  const file = path.join(distDir, relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

/**
 * Writes the blog into distDir and returns its routes with their last-modified
 * dates, for the sitemap. With no distDir it only returns the routes.
 */
export async function renderBlog(distDir, { posts = loadPosts() } = {}) {
  const siteData = await loadSiteData();
  const newest = posts[0]?.updated;

  write(distDir, 'blog/index.html', listingPage({ posts, siteData }));
  const routes = [{ path: '/blog', lastmod: newest }];
  for (const category of Object.keys(CATEGORIES)) {
    const inCategory = posts.filter((p) => p.category === category);
    write(distDir, `blog/category/${category}/index.html`, listingPage({ posts: inCategory, category, siteData }));
    if (inCategory.length) routes.push({ path: `/blog/category/${category}`, lastmod: inCategory[0].updated });
  }
  for (const post of posts) {
    write(distDir, `blog/${post.slug}/index.html`, postPage({ post, posts, siteData }));
    routes.push({ path: `/blog/${post.slug}`, lastmod: post.updated });
  }
  write(distDir, 'blog/rss.xml', rss(posts));
  write(distDir, 'llms.txt', await llmsTxt(posts, siteData));
  return { routes, count: posts.length };
}
