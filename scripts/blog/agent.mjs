#!/usr/bin/env node
// TripGuru blog agent. Run by .github/workflows/blog-agent.yml three times a
// week; publishes straight to the site with no human review, so the checking
// here is what stands between a mistake and a live page.
//
//   1. Research  — searches and reads the web for the topic (Writer).
//   2. Write     — drafts the article from that research only.
//   3. Validate  — mechanical rules: length, links that exist, sources, etc.
//   4. Check     — a second agent that did not write it re-verifies every
//                  claim on the web, independently, and can send it back.
//   5. Publish   — only if the Checker passes it. Otherwise nothing is
//                  published and the topic is marked rejected with the reason.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/blog/agent.mjs
//   node scripts/blog/agent.mjs --topic "Nepal trip in December"

import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import {
  BASE_URL, guidelinesPath, internalLinkCatalog, loadPosts, loadSiteData, postsDir, serializePost, slugify, todayIST, topicsPath,
} from './lib.mjs';
import { ARTICLE_SCHEMA, TOPIC_LIST_SCHEMA, VERDICT_SCHEMA, pickTopic, toPost, validateArticle } from './pipeline.mjs';

const MODEL = process.env.BLOG_MODEL || 'claude-opus-5';
// Server-side fallback: if a safety classifier declines a request, the API
// retries it on Anthropic's recommended model instead of failing the run.
const BETAS = ['server-side-fallback-2026-07-01'];
const PRICES = { 'claude-opus-5': [5, 25], 'claude-sonnet-5': [2, 10], 'claude-opus-5-5': [4, 20] };
const MAX_CRITICAL_ROUNDS = 2;

const args = process.argv.slice(2);
const customTopic = (args.includes('--topic') ? args[args.indexOf('--topic') + 1] : process.env.BLOG_TOPIC || '').trim();

const log = (...m) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0 };

const monthYear = () => new Date(`${todayIST()}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const client = new Anthropic();

function track(message) {
  const u = message.usage || {};
  usage.input += u.input_tokens || 0;
  usage.output += u.output_tokens || 0;
  usage.cacheRead += u.cache_read_input_tokens || 0;
  usage.cacheWrite += u.cache_creation_input_tokens || 0;
  usage.searches += u.server_tool_use?.web_search_requests || 0;
  usage.fetches += u.server_tool_use?.web_fetch_requests || 0;
}

function costUSD() {
  const [inp, out] = PRICES[MODEL] || PRICES['claude-opus-5'];
  return (usage.input * inp + usage.cacheWrite * inp * 1.25 + usage.cacheRead * inp * 0.1 + usage.output * out) / 1e6 + usage.searches * 0.01;
}

function checkStop(message, step) {
  if (message.stop_reason === 'refusal') throw new Error(`${step}: the model declined (${message.stop_details?.category || 'no category'}).`);
  if (message.stop_reason === 'max_tokens') throw new Error(`${step}: ran out of output tokens.`);
}

const textOf = (message) => message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');

/** One call with web search + fetch, resuming if the server-side loop pauses. */
async function researchCall({ system, prompt, step, searches = 10, fetches = 8 }) {
  const messages = [{ role: 'user', content: prompt }];
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: searches, user_location: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata' } },
    { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: fetches },
  ];
  let text = '';
  for (let turn = 0; turn < 6; turn++) {
    const message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        betas: BETAS,
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        system,
        tools,
        messages,
      })
      .finalMessage();
    track(message);
    checkStop(message, step);
    text += textOf(message);
    if (message.stop_reason !== 'pause_turn') return text;
    messages.push({ role: 'assistant', content: message.content });
  }
  throw new Error(`${step}: did not finish after 6 continuations.`);
}

/** One call that must return JSON matching `schema`. No tools. */
async function jsonCall({ system, prompt, schema, step }) {
  const message = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      betas: BETAS,
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: prompt }],
    })
    .finalMessage();
  track(message);
  checkStop(message, step);
  return JSON.parse(textOf(message));
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveTopics(topicsFile) {
  fs.writeFileSync(topicsPath, `${JSON.stringify(topicsFile, null, 2)}\n`, 'utf8');
}

async function imageCatalog() {
  const { DESTINATIONS, packageLandingPages } = await loadSiteData();
  return [
    ...DESTINATIONS.map((d) => ({ id: `dest-${d.slug}`, url: d.image, label: `${d.name} — destination photo` })),
    ...packageLandingPages.flatMap((p) => p.gallery.map((g, i) => ({ id: `pkg-${p.slug}-${i + 1}`, url: g.src, label: g.alt }))),
    { id: 'nepal-hero', url: `${BASE_URL}/nepal_hero.png`, label: 'Nepal — Himalayan panorama' },
    { id: 'nepal-nagarkot', url: `${BASE_URL}/nepal_nagarkot.png`, label: 'Nagarkot, Nepal — mountain view' },
    { id: 'nepal-safari', url: `${BASE_URL}/nepal_safari.png`, label: 'Chitwan, Nepal — jungle safari' },
    { id: 'nepal-glimpse', url: `${BASE_URL}/nepal_glimpse.png`, label: 'Nepal — temples and city' },
  ];
}

function brief({ guidelines, links, images, posts }) {
  return [
    `Today's date is ${todayIST()}.`,
    '',
    '<editorial_rules>',
    guidelines,
    '</editorial_rules>',
    '',
    '<tripguru_pages>',
    'These are the only TripGuru pages that exist. Link only to these paths.',
    ...links.map((l) => `${l.path} — ${l.label}`),
    ...posts.map((p) => `/blog/${p.slug} — blog article: ${p.title}`),
    '</tripguru_pages>',
    '',
    '<images>',
    'Choose a hero image only if it genuinely shows the article\'s destination. Otherwise use "none".',
    ...images.map((i) => `${i.id} — ${i.label}`),
    '</images>',
  ].join('\n');
}

async function proposeTopics({ topicsFile, posts }) {
  log('Topic list used up — researching new topics.');
  const covered = [...topicsFile.topics.map((t) => `${t.category}: ${t.keyword}`), ...posts.map((p) => `${p.category}: ${p.title}`)];
  const notes = await researchCall({
    step: 'topic research',
    searches: 6,
    fetches: 2,
    system: `You plan content for TripGuru, a Gorakhpur (India) travel agency. Today's date is ${todayIST()}.`,
    prompt: `Find 12 blog topics that Indian travellers are actively searching for right now, 4 in each category: nepal (Nepal travel from India), international (holidays abroad from India), india (domestic trips). Favour questions with clear search demand and upcoming seasons (the next 2-4 months). Do not repeat or closely overlap anything already covered:\n${covered.join('\n')}`,
  });
  const { topics } = await jsonCall({
    step: 'topic list',
    schema: TOPIC_LIST_SCHEMA,
    system: 'Turn research notes into a clean topic list. ids are short lowercase-hyphenated and unique.',
    prompt: `${notes}\n\nReturn the 12 topics. Existing ids you must not reuse: ${topicsFile.topics.map((t) => t.id).join(', ')}`,
  });
  const known = new Set(topicsFile.topics.map((t) => t.id));
  for (const t of topics) {
    const id = slugify(t.id);
    if (!known.has(id)) topicsFile.topics.push({ ...t, id, status: 'todo', addedBy: 'blog-agent' });
  }
  saveTopics(topicsFile);
}

// External sources must actually open. A 404 or a dead domain means the Writer
// misremembered a URL; a 403 is usually a site blocking bots and is let through.
async function deadLinks(urls) {
  const dead = [];
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (TripGuru link check)' } });
        if (res.status === 404 || res.status === 410) dead.push(url);
      } catch (error) {
        if (error.cause?.code === 'ENOTFOUND' || error.cause?.code === 'ERR_INVALID_URL') dead.push(url);
      }
    })
  );
  return dead;
}

function articleForReview(a) {
  return [
    `TITLE: ${a.title}`,
    `DESCRIPTION: ${a.description}`,
    `CATEGORY: ${a.category}`,
    `QUICK ANSWER: ${a.summary}`,
    `KEY FACTS:\n${a.keyFacts.map((f) => `- ${f.label}: ${f.value}`).join('\n')}`,
    `BODY:\n${a.body}`,
    `FAQ:\n${a.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n')}`,
    `CALL TO ACTION: ${a.cta.heading} — ${a.cta.text} (${a.cta.path || 'WhatsApp only'})`,
    `SOURCES:\n${a.sources.map((s) => `- ${s.title}: ${s.url}`).join('\n')}`,
  ].join('\n\n');
}

async function check(article, { system }) {
  log('Checker: verifying every claim independently…');
  const report = await researchCall({
    step: 'fact check',
    searches: 12,
    fetches: 10,
    system: `${system}\n\nYou are TripGuru's fact-checker. You did not write this article and you do not trust it. It will be published with no other human review, so you are the last line of defence against a wrong visa rule, a wrong fee, a made-up price or a broken promise reaching customers.`,
    prompt: `Fact-check this draft.\n\n<draft>\n${articleForReview(article)}\n</draft>\n\nDo this:\n1. List every claim that could be wrong: rules, documents, visas, permits, fees, prices, distances, travel times, opening seasons, names, dates, transport options.\n2. Verify each one yourself with web_search and web_fetch. Prefer official sources (governments, embassies, tourism boards, airports, railways, park authorities). Do not accept a claim just because the draft cites a source — open the source and confirm it says that.\n3. Check the draft against every hard rule in the editorial rules (invented TripGuru prices/offers/reviews/statistics, undated prices, unsafe advice, etc.).\n4. Report each problem with: severity (CRITICAL if wrong, unsupported and risky, outdated, or it breaks a hard rule; MINOR for wording/clarity), the exact quote, what is wrong, and the corrected wording with the source URL.\nSay plainly at the end whether the article is safe to publish.`,
  });
  return jsonCall({
    step: 'verdict',
    schema: VERDICT_SCHEMA,
    system: 'Convert a fact-check report into a verdict. "publish" only if there are no critical issues. "revise" if the problems can be fixed by editing. "reject" only if the topic itself cannot be written accurately (e.g. the facts are too uncertain or the premise is wrong).',
    prompt: report,
  });
}

async function revise(article, issues, { system, research, step }) {
  log(`Writer: fixing ${issues.length} issue(s)…`);
  return jsonCall({
    step,
    schema: ARTICLE_SCHEMA,
    system,
    prompt: `Revise this article to fix every issue below. Apply each fix exactly. Where a claim cannot be verified, remove it or point the reader to the official source instead. Keep everything else as it is.\n\n<issues>\n${issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.problem}\n   Text: ${i.quote}\n   Fix: ${i.fix}`).join('\n')}\n</issues>\n\n<article_json>\n${JSON.stringify(article)}\n</article_json>\n\n<research_notes>\n${research}\n</research_notes>`,
  });
}

function setOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([k, v]) => `${k}=${String(v).replace(/\n/g, ' ')}\n`).join(''));
}

function summaryLine(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
}

async function main() {
  const guidelines = fs.readFileSync(guidelinesPath, 'utf8');
  const topicsFile = readJSON(topicsPath);
  const posts = loadPosts({ includeFuture: true });
  const links = await internalLinkCatalog();
  const images = await imageCatalog();

  if (!customTopic && posts.some((p) => p.date === todayIST())) {
    summaryLine('An article was already published today — nothing to do.');
    setOutput({ published: 'false' });
    return;
  }

  let topic;
  if (customTopic) {
    topic = { id: slugify(customTopic), category: null, keyword: customTopic, angle: customTopic };
  } else {
    topic = pickTopic(topicsFile.topics, posts);
    if (!topic) {
      await proposeTopics({ topicsFile, posts });
      topic = pickTopic(topicsFile.topics, posts);
    }
    if (!topic) throw new Error('No topic available.');
  }
  log(`Topic: ${topic.keyword}${topic.category ? ` (${topic.category})` : ''}`);

  const allowedPaths = [...links.map((l) => l.path), ...posts.map((p) => `/blog/${p.slug}`)];
  const context = {
    allowedPaths,
    existingSlugs: posts.map((p) => p.slug),
    imageIds: images.map((i) => i.id),
  };
  const system = brief({ guidelines, links, images, posts });

  let article;
  let research = '';
  let checkerNote = '';

  log('Writer: researching…');
  research = await researchCall({
    step: 'research',
    system: `${system}\n\nYou are the research desk for TripGuru's blog.`,
    prompt: `Research this topic for a TripGuru article.\nKeyword: ${topic.keyword}\nAngle: ${topic.angle}\n${topic.category ? `Category: ${topic.category}` : ''}\n\nUse web_search and web_fetch. Official sources for rules, documents, visas, permits and fees; recent reputable sources for prices and practical detail. Write research notes with:\n1. Verified facts, each with its source URL.\n2. Current price ranges in INR (convert and say so), with source and date.\n3. Rules and requirements for Indian travellers, from official sources.\n4. The questions people most often ask about this (from search results, "People also ask", forums).\n5. Anything recently changed, conflicting between sources, or uncertain — say so explicitly.\nEnd with a numbered SOURCES list (title — URL) of pages you actually read.`,
  });

  log('Writer: drafting…');
  article = await jsonCall({
    step: 'draft',
    schema: ARTICLE_SCHEMA,
    system: `${system}\n\nYou are TripGuru's travel writer.`,
    prompt: `Write the article.\nKeyword: ${topic.keyword}\nAngle: ${topic.angle}\n${topic.category ? `Category: ${topic.category}` : 'Choose the category.'}\nMonth for dating prices: ${monthYear()}\n\nUse only facts from the research notes below; if something the reader needs is not in the notes, say to check with us or the official source rather than guessing.\n\n<research_notes>\n${research}\n</research_notes>`,
  });

  let criticalRounds = 0;
  for (let round = 1; ; round++) {
    const problems = validateArticle(article, context);
    const dead = await deadLinks(article.sources.map((s) => s.url));
    for (const url of dead) problems.push({ severity: 'critical', quote: url, problem: `Source URL does not open (404 or no such site): ${url}`, fix: 'Replace with a working URL from the research notes or remove the source and any claim that relied only on it.' });
    // Minor problems (stock phrases) ride along with the Checker's own wording
    // fixes; only critical ones hold the draft back here.
    if (problems.some((p) => p.severity === 'critical')) {
      if (round > 4) {
        return reject(topic, topicsFile, `Draft still failed the rule checks after ${round - 1} rounds: ${problems.map((p) => p.problem).join(' | ')}`);
      }
      article = await revise(article, problems, { system, research, step: `rule fixes ${round}` });
      continue;
    }

    const verdict = await check(article, { system: brief({ guidelines, links, images, posts }) });
    const critical = verdict.issues.filter((i) => i.severity === 'critical');
    log(`Checker verdict: ${verdict.verdict} — ${critical.length} critical, ${verdict.issues.length - critical.length} minor.`);

    if (verdict.verdict === 'reject') {
      return reject(topic, topicsFile, `Checker rejected the topic: ${verdict.summary}`);
    }
    if (verdict.verdict === 'publish' && !critical.length) {
      checkerNote = verdict.summary;
      const minor = [...verdict.issues.filter((i) => i.severity === 'minor'), ...problems];
      if (minor.length) {
        // Wording only; the facts were just verified. Re-run the mechanical
        // checks on the result rather than the full fact-check.
        const polished = await revise(article, minor, { system, research, step: 'polish' });
        if (!validateArticle(polished, context).some((p) => p.severity === 'critical')) article = polished;
      }
      break;
    }
    criticalRounds++;
    if (criticalRounds > MAX_CRITICAL_ROUNDS) {
      return reject(topic, topicsFile, `Still had critical problems after ${MAX_CRITICAL_ROUNDS} rounds of corrections: ${critical.map((i) => i.problem).join(' | ')}`);
    }
    article = await revise(article, verdict.issues, { system, research, step: `checker fixes ${criticalRounds}` });
  }

  const image = images.find((i) => i.id === article.imageId) || null;
  const { data, body } = toPost(article, { date: todayIST(), topicId: customTopic ? undefined : topic.id, image });
  fs.mkdirSync(postsDir, { recursive: true });
  const file = path.join(postsDir, `${article.slug}.md`);
  fs.writeFileSync(file, serializePost(data, body), 'utf8');

  const entry = topicsFile.topics.find((t) => t.id === topic.id);
  if (entry) {
    entry.status = 'published';
    entry.slug = article.slug;
    entry.publishedOn = todayIST();
    saveTopics(topicsFile);
  }

  const url = `${BASE_URL}/blog/${article.slug}`;
  summaryLine(`✅ Published: **${article.title}** — ${url}`);
  summaryLine(`Checker: ${checkerNote}`);
  summaryLine(`Cost: about $${costUSD().toFixed(2)} (${usage.searches} searches, ${usage.fetches} page reads, ${usage.input + usage.cacheRead + usage.cacheWrite} input / ${usage.output} output tokens, model ${MODEL}).`);
  setOutput({ published: 'true', slug: article.slug, url, title: article.title });
}

function reject(topic, topicsFile, reason) {
  const entry = topicsFile.topics.find((t) => t.id === topic.id);
  if (entry) {
    entry.status = 'rejected';
    entry.reason = reason.slice(0, 500);
    saveTopics(topicsFile);
  }
  summaryLine(`⛔ Not published — ${topic.keyword}. ${reason}`);
  summaryLine(`Cost: about $${costUSD().toFixed(2)}.`);
  setOutput({ published: 'false', rejected: 'true' });
}

main().catch((error) => {
  console.error(error);
  summaryLine(`❌ Blog agent failed: ${error.message}`);
  if (usage.input) summaryLine(`Cost so far: about $${costUSD().toFixed(2)}.`);
  process.exit(1);
});
