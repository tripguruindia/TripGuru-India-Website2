// The parts of the blog agent that need no AI: choosing the next topic and the
// mechanical checks every draft must pass before the Checker agent even sees
// it. Kept free of network calls so test/blogPipeline.test.mjs can cover them.

import { BASE_URL, CATEGORIES, wordCount } from './lib.mjs';

/** The article shape both agents read and write. */
export const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slug', 'description', 'category', 'tags', 'summary', 'keyFacts', 'body', 'faqs', 'sources', 'imageId', 'heroAlt', 'cta'],
  properties: {
    title: { type: 'string', description: 'The H1. 40-65 characters, contains the main keyword, no brand name.' },
    slug: { type: 'string', description: 'lowercase-words-with-hyphens, 3-8 words, from the keyword.' },
    description: { type: 'string', description: 'Meta description, 120-160 characters, answers the query and invites the click.' },
    category: { type: 'string', enum: Object.keys(CATEGORIES) },
    tags: { type: 'array', items: { type: 'string' }, description: '3-6 short tags.' },
    summary: { type: 'string', description: 'Quick answer in 2-3 sentences (40-80 words) that an AI assistant could quote as-is.' },
    keyFacts: {
      type: 'array',
      description: '4-6 facts.',
      items: { type: 'object', additionalProperties: false, required: ['label', 'value'], properties: { label: { type: 'string' }, value: { type: 'string' } } },
    },
    body: { type: 'string', description: 'The article in Markdown. Starts with an intro paragraph, then ## sections. No # H1, no FAQ section, no sources list (those are separate fields).' },
    faqs: {
      type: 'array',
      description: '5-8 questions.',
      items: { type: 'object', additionalProperties: false, required: ['q', 'a'], properties: { q: { type: 'string' }, a: { type: 'string' } } },
    },
    sources: {
      type: 'array',
      description: 'Every external page a fact came from.',
      items: { type: 'object', additionalProperties: false, required: ['title', 'url'], properties: { title: { type: 'string' }, url: { type: 'string' } } },
    },
    imageId: { type: 'string', description: 'An id from the image list, or "none".' },
    heroAlt: { type: 'string', description: 'Alt text describing the chosen image; empty when imageId is "none".' },
    cta: {
      type: 'object',
      additionalProperties: false,
      required: ['heading', 'text', 'path', 'label'],
      properties: {
        heading: { type: 'string' },
        text: { type: 'string', description: 'One or two sentences. No invented prices or offers.' },
        path: { type: 'string', description: 'The most relevant TripGuru page from the list, or "" for WhatsApp only.' },
        label: { type: 'string', description: 'Button text for that page, or "".' },
      },
    },
  },
};

export const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'issues'],
  properties: {
    verdict: { type: 'string', enum: ['publish', 'revise', 'reject'] },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'quote', 'problem', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'minor'] },
          quote: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
};

export const TOPIC_LIST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topics'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'category', 'keyword', 'angle'],
        properties: {
          id: { type: 'string' },
          category: { type: 'string', enum: Object.keys(CATEGORIES) },
          keyword: { type: 'string' },
          angle: { type: 'string' },
        },
      },
    },
  },
};

const HYPE = ['breathtaking', 'nestled', 'hidden gem', 'tapestry', 'embark on', 'unforgettable experience', 'a paradise', "traveler's paradise", 'look no further', 'in conclusion'];

/**
 * Next topic: the first unused one, preferring a different category from the
 * last post so the blog does not run three Nepal articles in a row.
 */
export function pickTopic(topics, posts, { skipIds = [] } = {}) {
  const open = topics.filter((t) => (t.status || 'todo') === 'todo' && !skipIds.includes(t.id));
  if (!open.length) return null;
  const lastCategory = posts[0]?.category;
  return open.find((t) => t.category !== lastCategory) || open[0];
}

/**
 * A topic that failed the checks goes to the back of the queue for another
 * try, and is only given up on after `maxAttempts` failures. The first live
 * run lost the most important topic of all (Gorakhpur to Nepal by road) to
 * one wrong date — a problem with that draft, not with the topic.
 */
export function recordFailure(topicsFile, id, reason, { date, maxAttempts = 2 } = {}) {
  const index = topicsFile.topics.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const [entry] = topicsFile.topics.splice(index, 1);
  entry.attempts = (entry.attempts || 0) + 1;
  entry.lastFailure = { date, reason: reason.slice(0, 500) };
  entry.status = entry.attempts >= maxAttempts ? 'rejected' : 'todo';
  topicsFile.topics.push(entry);
  return entry;
}

function internalPath(href) {
  if (href.startsWith(BASE_URL)) return href.slice(BASE_URL.length) || '/';
  if (href.startsWith('/')) return href;
  return null;
}

/**
 * Mechanical checks. Returns a list of problems in the same shape the Checker
 * agent uses, so the Writer fixes both the same way. Empty means it passes.
 */
export function validateArticle(article, { allowedPaths, existingSlugs, imageIds }) {
  const problems = [];
  const add = (problem, fix, quote = '') => problems.push({ severity: 'critical', quote, problem, fix });
  const allowed = new Set(allowedPaths);

  if (!/^[a-z0-9]+(-[a-z0-9]+){1,9}$/.test(article.slug || '')) add(`Slug "${article.slug}" is not lowercase-words-with-hyphens.`, 'Use 3-8 lowercase words joined by hyphens.');
  if (existingSlugs.includes(article.slug)) add(`Slug "${article.slug}" is already used by another article.`, 'Choose a different slug and angle.');
  const titleLength = (article.title || '').length;
  if (titleLength < 25 || titleLength > 70) add(`Title is ${titleLength} characters.`, 'Make the title 40-65 characters.', article.title);
  const descLength = (article.description || '').length;
  if (descLength < 100 || descLength > 170) add(`Description is ${descLength} characters.`, 'Make the description 120-160 characters.', article.description);
  if (!CATEGORIES[article.category]) add(`Unknown category "${article.category}".`, `Use one of: ${Object.keys(CATEGORIES).join(', ')}.`);

  const words = wordCount(article.body || '');
  if (words < 1200) add(`Body is only ${words} words.`, 'Expand to 1,400-2,200 words with genuinely useful detail — not padding.');
  if (words > 2800) add(`Body is ${words} words.`, 'Tighten to 1,400-2,200 words.');
  if (/^#\s/m.test(article.body || '')) add('Body contains a # H1 heading.', 'The page supplies the H1; use ## and ### only.');
  if (((article.body || '').match(/^##\s/gm) || []).length < 4) add('Body has fewer than 4 ## sections.', 'Structure the article into at least 4 ## sections phrased as searches.');

  if ((article.faqs || []).length < 4) add('Fewer than 4 FAQs.', 'Add 5-8 real questions with direct answers.');
  if ((article.keyFacts || []).length < 3) add('Fewer than 3 key facts.', 'Add 4-6 key facts.');
  if ((article.sources || []).length < 2) add('Fewer than 2 sources.', 'List the external pages the facts came from.');
  for (const source of article.sources || []) {
    if (!/^https:\/\//.test(source.url)) add(`Source URL "${source.url}" is not an https link.`, 'Use the full https URL of the page.');
  }

  const links = [...(article.body || '').matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
  let internalCount = 0;
  for (const href of links) {
    const p = internalPath(href);
    if (p === null) continue;
    internalCount++;
    if (!allowed.has(p.replace(/\/$/, '') || '/')) add(`Link to "${href}" is not a page on the TripGuru site.`, 'Only link to pages from the provided list.', href);
  }
  if (internalCount < 2) add(`Only ${internalCount} link(s) to TripGuru pages.`, 'Link 2-5 relevant TripGuru pages from the list where they help the reader.');
  if (article.cta?.path && !allowed.has(article.cta.path)) add(`CTA links to "${article.cta.path}", which is not in the page list.`, 'Use a path from the list, or "".');
  if (article.imageId !== 'none' && !imageIds.includes(article.imageId)) add(`Unknown imageId "${article.imageId}".`, 'Use an id from the image list, or "none".');

  // Abroad, the article points readers to the official advisory instead of
  // stating its status. Without this line the Checker blocked a Pokhara
  // article over an advisory it could not confirm either way.
  if (article.category !== 'india' && !/mea\.gov\.in/i.test(`${article.body} ${(article.faqs || []).map((f) => f.a).join(' ')}`)) {
    add('No pointer to the official travel advisory.', 'Near the end of the practical advice, add: "Before you travel, check the latest advisory from India\'s Ministry of External Affairs ([mea.gov.in](https://www.mea.gov.in)) and the Indian Embassy in the country." Do not say whether any advisory is in force.');
  }

  const text = `${article.title} ${article.summary} ${article.body}`.toLowerCase();
  for (const word of HYPE) {
    if (text.includes(word)) problems.push({ severity: 'minor', quote: word, problem: `Uses the stock phrase "${word}".`, fix: 'Rewrite in plain, specific language.' });
  }
  return problems;
}

/** The Markdown file saved for a finished article. */
export function toPost(article, { date, topicId, image }) {
  const data = {
    title: article.title,
    slug: article.slug,
    description: article.description,
    category: article.category,
    tags: article.tags,
    date,
    updated: date,
    ...(image ? { heroImage: image.url, heroAlt: article.heroAlt } : {}),
    summary: article.summary,
    keyFacts: article.keyFacts,
    faqs: article.faqs,
    sources: article.sources,
    cta: article.cta.path ? article.cta : { heading: article.cta.heading, text: article.cta.text },
    ...(topicId ? { topicId } : {}),
    generatedBy: 'blog-agent',
  };
  return { data, body: article.body };
}
