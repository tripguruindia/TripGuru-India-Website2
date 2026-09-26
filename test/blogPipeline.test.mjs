// ---------------------------------------------------------------------------
// The blog agent's mechanical checks, and the page it renders.
//
// Run with:  npm test
//
// Articles are published with no human review, so these checks are one of the
// two things (the other is the Checker agent) standing between a bad draft and
// a live page. The property that matters most: a link to a page that does not
// exist, or a reused slug, can never pass.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickTopic, validateArticle, toPost } from '../scripts/blog/pipeline.mjs';
import { renderBlog } from '../scripts/blog/render.mjs';

let passed = 0;
let failed = 0;
function ok(c, label, detail = '') {
  if (c) { passed += 1; console.log('  \x1b[32mPASS\x1b[0m  ' + label); }
  else { failed += 1; console.log('  \x1b[31mFAIL\x1b[0m  ' + label + (detail ? '   -> ' + detail : '')); }
}

const para = 'Sunauli is the border crossing most travellers from Gorakhpur use, about ninety kilometres north of the city by road, and the formalities for Indian citizens are short. ';
const section = (h) => `## ${h}\n\n${para.repeat(10)}\n\n`;
const goodArticle = () => ({
  title: 'Gorakhpur to Nepal by Road: Route, Border and Costs',
  slug: 'gorakhpur-to-nepal-by-road',
  description: 'How to drive from Gorakhpur to Kathmandu or Pokhara through the Sunauli border — route, documents, drive times and what it costs in 2026.',
  category: 'nepal',
  tags: ['Nepal', 'Sunauli', 'Road trip'],
  summary: 'Drive north from Gorakhpur to the Sunauli border, then on to Pokhara or Kathmandu.',
  keyFacts: [{ label: 'Border', value: 'Sunauli' }, { label: 'ID', value: 'Passport or Voter ID' }, { label: 'Best time', value: 'October–April' }],
  body: `Intro paragraph. See our [Nepal trip planner](/nepal) and [Nepal holidays](/destinations/nepal).\n\n${section('How far is the border?')}${section('Which documents do you need?')}${section('How long does the drive take?')}${section('What does it cost?')}${section('When should you go?')}`,
  faqs: [1, 2, 3, 4, 5].map((n) => ({ q: `Question ${n}?`, a: `Answer ${n}.` })),
  sources: [{ title: 'Nepal Tourism Board', url: 'https://ntb.gov.np/' }, { title: 'Embassy of India, Kathmandu', url: 'https://www.indembkathmandu.gov.in/' }],
  imageId: 'dest-nepal',
  heroAlt: 'Mountains in Nepal',
  cta: { heading: 'Plan it with us', text: 'Message us your dates.', path: '/nepal', label: 'Open the planner' },
});
const context = {
  allowedPaths: ['/nepal', '/destinations/nepal', '/contact', '/blog/existing-post'],
  existingSlugs: ['existing-post'],
  imageIds: ['dest-nepal'],
};
const critical = (a) => validateArticle(a, context).filter((p) => p.severity === 'critical');

console.log('\nA well-formed article passes');
const clean = critical(goodArticle());
ok(clean.length === 0, 'no critical problems', clean.map((p) => p.problem).join(' | '));

console.log('\nThe checks that stop a bad article going live');
{
  const a = goodArticle();
  a.body += '\n\nAlso see [our Goa deals](/packages/goa-special).';
  ok(critical(a).some((p) => p.problem.includes('/packages/goa-special')), 'a link to a page that does not exist is caught');
}
{
  const a = goodArticle();
  a.body += `\n\nFull link: [planner](https://www.tripguruindia.com/nepal).`;
  ok(critical(a).length === 0, 'a full https://www.tripguruindia.com link to a real page is allowed');
}
{
  const a = goodArticle();
  a.slug = 'existing-post';
  ok(critical(a).some((p) => p.problem.includes('already used')), 'a slug already taken is caught');
}
{
  const a = goodArticle();
  a.body = section('Only section');
  ok(critical(a).some((p) => p.problem.includes('words')), 'a thin article is caught');
}
{
  const a = goodArticle();
  a.sources = [{ title: 'x', url: 'http://example.com' }];
  const problems = critical(a).map((p) => p.problem).join(' | ');
  ok(problems.includes('Fewer than 2 sources') && problems.includes('not an https'), 'too few / non-https sources are caught', problems);
}
{
  const a = goodArticle();
  a.body = `# A second H1\n\n${a.body}`;
  ok(critical(a).some((p) => p.problem.includes('H1')), 'a # heading inside the body is caught (the page has its own H1)');
}
{
  const a = goodArticle();
  a.cta.path = '/offers/diwali-sale';
  ok(critical(a).some((p) => p.problem.includes('CTA')), 'a call-to-action pointing nowhere is caught');
}
{
  const a = goodArticle();
  a.imageId = 'made-up-photo';
  ok(critical(a).some((p) => p.problem.includes('imageId')), 'an image that is not in the catalogue is caught');
}
{
  const a = goodArticle();
  a.summary = 'Nepal is a breathtaking hidden gem.';
  const all = validateArticle(a, context);
  ok(all.some((p) => p.severity === 'minor' && p.quote === 'breathtaking') && critical(a).length === 0, 'stock phrases are flagged as minor, not blocking');
}

console.log('\nChoosing the next topic');
{
  const topics = [
    { id: 'a', category: 'nepal', status: 'published' },
    { id: 'b', category: 'nepal', status: 'todo' },
    { id: 'c', category: 'india', status: 'todo' },
    { id: 'd', category: 'international', status: 'rejected' },
  ];
  ok(pickTopic(topics, [{ category: 'nepal' }]).id === 'c', 'skips a second Nepal article in a row when another category is waiting');
  ok(pickTopic(topics, [{ category: 'india' }]).id === 'b', 'otherwise takes the first unused topic');
  ok(pickTopic(topics, [], { skipIds: ['b', 'c'] }) === null, 'published and rejected topics are never repeated');
}

console.log('\nThe rendered page');
{
  const { data, body } = toPost(goodArticle(), { date: '2026-09-28', topicId: 'gorakhpur-to-nepal-by-road', image: { url: 'https://example.com/nepal.avif' } });
  const post = { ...data, body, updated: data.updated };
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-test-'));
  try {
    const { routes } = await renderBlog(out, { posts: [post] });
    const html = fs.readFileSync(path.join(out, 'blog/gorakhpur-to-nepal-by-road/index.html'), 'utf8');
    ok(routes.some((r) => r.path === '/blog/gorakhpur-to-nepal-by-road' && r.lastmod === '2026-09-28'), 'the article is in the sitemap routes with its own date');
    ok(html.includes('<h1>Gorakhpur to Nepal by Road'), 'the article text is in the HTML itself — readable without JavaScript');
    ok(html.includes('"@type":"BlogPosting"') && html.includes('"@type":"FAQPage"') && html.includes('"@type":"BreadcrumbList"'), 'carries BlogPosting, FAQPage and Breadcrumb structured data');
    ok(html.includes('rel="canonical" href="https://www.tripguruindia.com/blog/gorakhpur-to-nepal-by-road"'), 'has a canonical URL');
    ok(/href="https:\/\/ntb\.gov\.np\/" target="_blank" rel="noopener nofollow"/.test(html), 'sources open in a new tab');
    ok(fs.readFileSync(path.join(out, 'llms.txt'), 'utf8').includes('/blog/gorakhpur-to-nepal-by-road'), 'llms.txt lists the article for AI assistants');
    ok(fs.readFileSync(path.join(out, 'blog/rss.xml'), 'utf8').includes('<item><title>Gorakhpur to Nepal'), 'the RSS feed carries it');
    ok(fs.readFileSync(path.join(out, 'blog/index.html'), 'utf8').includes('href="/blog/gorakhpur-to-nepal-by-road"'), 'the blog index links to it');

    const withHtml = { ...post, slug: 'raw-html', body: `${post.body}\n\n<script>alert(1)</script>` };
    await renderBlog(out, { posts: [withHtml] });
    ok(!fs.readFileSync(path.join(out, 'blog/raw-html/index.html'), 'utf8').includes('<script>alert(1)'), 'raw HTML in an article is escaped, never run');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
