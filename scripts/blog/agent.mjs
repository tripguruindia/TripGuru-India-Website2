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
// It runs on Claude Code through the Agent SDK, signed in with Tanmay's own
// Claude plan (CLAUDE_CODE_OAUTH_TOKEN, made with `claude setup-token`), so
// articles cost nothing beyond the plan he already pays for. An
// ANTHROPIC_API_KEY in the environment would take precedence and be billed per
// token — the workflow deliberately passes only the OAuth token.
//
// Usage:
//   CLAUDE_CODE_OAUTH_TOKEN=... node scripts/blog/agent.mjs
//   node scripts/blog/agent.mjs --topic "Nepal trip in December"

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  BASE_URL, guidelinesPath, internalLinkCatalog, loadPosts, loadSiteData, postsDir, serializePost, slugify, todayIST, topicsPath,
} from './lib.mjs';
import { ARTICLE_SCHEMA, TOPIC_LIST_SCHEMA, VERDICT_SCHEMA, pickTopic, recordFailure, toPost, validateArticle } from './pipeline.mjs';

// Unset means the plan's own default model. BLOG_MODEL=opus / sonnet overrides.
const MODEL = process.env.BLOG_MODEL || undefined;
// Each Checker pass reads the whole article afresh and tends to find a little
// less: the Bali run (3 Oct) went 2 -> 3 -> 1 critical issues and was rejected
// with one wrong date left. Four rounds lets a converging draft finish; one
// that is still wrong after four is not going to be fixed by a fifth.
const MAX_CRITICAL_ROUNDS = 4;

const args = process.argv.slice(2);
const customTopic = (args.includes('--topic') ? args[args.indexOf('--topic') + 1] : process.env.BLOG_TOPIC || '').trim();

const log = (...m) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
// On a Claude plan nothing is billed per token; this is the SDK's estimate of
// what the same work would cost on the API, kept as a measure of plan usage.
const usage = { estimateUSD: 0, turns: 0 };

const monthYear = () => new Date(`${todayIST()}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * One Claude Code session. With `web`, it may search and read the web; with
 * `schema`, it must answer with JSON matching it. It gets no file, shell or
 * edit tools and runs in an empty temp directory, so all it can do is read
 * the web and answer.
 */
async function claude({ system, prompt, step, web = false, schema }) {
  const tools = web ? ['WebSearch', 'WebFetch'] : [];
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-agent-'));
  try {
    for await (const message of query({
      prompt,
      options: {
        systemPrompt: system,
        tools,
        allowedTools: tools,
        permissionMode: 'dontAsk',
        settingSources: [],
        cwd: workdir,
        maxTurns: web ? 60 : 6,
        ...(MODEL ? { model: MODEL } : {}),
        ...(schema ? { outputFormat: { type: 'json_schema', schema } } : {}),
      },
    })) {
      if (message.type !== 'result') continue;
      usage.estimateUSD = Math.max(0, usage.estimateUSD) + (message.total_cost_usd || 0);
      usage.turns += message.num_turns || 0;
      if (message.subtype !== 'success' || message.is_error) {
        throw new Error(`${step}: Claude stopped (${message.subtype}${message.result ? `: ${String(message.result).slice(0, 300)}` : ''}).`);
      }
      if (!schema) return message.result;
      return message.structured_output ?? JSON.parse(message.result);
    }
    throw new Error(`${step}: Claude ended without a result.`);
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
}

const researchCall = ({ system, prompt, step }) => claude({ system, prompt, step, web: true });
const jsonCall = ({ system, prompt, schema, step }) => claude({ system, prompt, step, schema });

function costNote() {
  return `Charged to the Claude plan, not billed (API-equivalent estimate $${usage.estimateUSD.toFixed(2)}, ${usage.turns} turns${MODEL ? `, model ${MODEL}` : ''}).`;
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
    system: `You plan content for TripGuru, a Gorakhpur (India) travel agency. Today's date is ${todayIST()}.`,
    prompt: `Find 12 blog topics that Indian travellers are actively searching for right now, 4 in each category: nepal (Nepal travel from India), international (holidays abroad from India), india (domestic trips). At least 3 of the 4 in each category must be about exploring a place — things to do, places to see, food, culture, day trips, scenic routes, itineraries, lesser-known spots; at most 1 may be purely practical (visas, documents, currency, costs). Favour topics with clear search demand and upcoming seasons (the next 2-4 months). Do not repeat or closely overlap anything already covered:\n${covered.join('\n')}`,
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
    system: `${system}\n\nYou are TripGuru's fact-checker. You did not write this article and you do not trust it. It will be published with no other human review, so you are the last line of defence against a wrong visa rule, a wrong fee, a made-up price or a broken promise reaching customers.`,
    prompt: `Fact-check this draft.\n\n<draft>\n${articleForReview(article)}\n</draft>\n\nDo this:\n1. List every claim that could be wrong: rules, documents, visas, permits, fees, prices, distances, travel times, opening seasons, names, dates, transport options.\n2. Verify each one yourself with WebSearch and WebFetch. Prefer official sources (governments, embassies, tourism boards, airports, railways, park authorities). Do not accept a claim just because the draft cites a source — open the source and confirm it says that.\n3. Check the draft against every hard rule in the editorial rules (invented TripGuru prices/offers/reviews/statistics, undated prices, unsafe advice, etc.).\n4. Report each problem with: severity, the exact quote, what is wrong, and the corrected wording with the source URL.\n   CRITICAL = something the article STATES AS FACT that is wrong, outdated, or unsupported and risky to a traveller; or a hard-rule break.\n   NOT critical: something you could not confirm (a site blocked you, sources are unclear) that the article does not assert, or that it already sends the reader to the official source for. Travel advisories are handled this way by rule — the article must carry the standard "check the latest advisory from MEA and the Indian Embassy" line and must not claim any advisory status; if that line is present, an advisory is not an issue.\n   MINOR = wording or clarity.\n   For every CRITICAL issue, make the fix something the Writer can apply without research: give the exact corrected wording with its source, or say "delete this sentence".\nSay plainly at the end whether the article is safe to publish.`,
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
    // The first live run was rejected because the Writer twice "corrected" a
    // wrong date to another unverified date. Deleting beats rewording.
    prompt: `Revise this article to fix every issue below. Keep everything else as it is.\n\nFor each CRITICAL issue: use the corrected wording only if the research notes or the Checker's fix prove it beyond doubt. Otherwise DELETE the claim — and anything that depends on it — rather than rewording it. If readers need that information, send them to the official source instead. A shorter correct article is always better than a longer one with a doubtful fact.\n\nMINOR issues: apply the fix.\n\n<issues>\n${issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.problem}\n   Text: ${i.quote}\n   Fix: ${i.fix}`).join('\n')}\n</issues>\n\n<article_json>\n${JSON.stringify(article)}\n</article_json>\n\n<research_notes>\n${research}\n</research_notes>`,
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
    prompt: `Research this topic for a TripGuru article.\nKeyword: ${topic.keyword}\nAngle: ${topic.angle}\n${topic.category ? `Category: ${topic.category}` : ''}\n\nUse WebSearch and WebFetch. Official sources for rules, documents, visas, permits and fees; recent reputable sources for prices and practical detail. Write research notes with:\n1. Verified facts, each with its source URL.\n2. Current price ranges in INR (convert and say so), with source and date.\n3. Rules and requirements for Indian travellers, from official sources.\n4. The questions people most often ask about this (from search results, "People also ask", forums).\n5. Anything recently changed, conflicting between sources, or uncertain — say so explicitly.\nEnd with a numbered SOURCES list (title — URL) of pages you actually read.`,
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
    // Each critical issue, so a draft that stalls (Kerala, 3 Oct: 2 -> 2 -> 2)
    // shows whether the Writer is failing to fix the same thing or the
    // Checker is finding new things each pass.
    for (const issue of critical) {
      log(`  ✗ "${issue.quote.slice(0, 120)}" — ${issue.problem.slice(0, 240)} → fix: ${issue.fix.slice(0, 160)}`);
    }
    if (critical.length && process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Check ${criticalRounds + 1}** — ${critical.length} critical:\n${critical.map((i) => `- ${i.problem}`).join('\n')}\n\n`);
    }

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
  summaryLine(costNote());
  setOutput({ published: 'true', slug: article.slug, url, title: article.title });
}

function reject(topic, topicsFile, reason) {
  const entry = recordFailure(topicsFile, topic.id, reason, { date: todayIST() });
  if (entry) saveTopics(topicsFile);
  const next = !entry ? '' : entry.status === 'todo' ? ' It will be tried again later.' : ' Given up after repeated failures.';
  summaryLine(`⛔ Not published — ${topic.keyword}. ${reason}${next}`);
  summaryLine(costNote());
  setOutput({ published: 'false', rejected: 'true' });
}

main().catch((error) => {
  console.error(error);
  summaryLine(`❌ Blog agent failed: ${error.message}`);
  if (usage.turns) summaryLine(costNote());
  process.exit(1);
});
