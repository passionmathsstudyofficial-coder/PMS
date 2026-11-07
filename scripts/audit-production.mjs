// Read-only HTTP audit. No authentication, database writes or deployment changes.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Resolver } from 'node:dns/promises';
const base = process.env.PMS_AUDIT_URL || 'https://passionmathstudy.in';
const output = resolve(process.env.PMS_AUDIT_OUTPUT || 'test-results/production-http.json');
const max = Number(process.env.PMS_AUDIT_MAX || 180);
const evidence = { startedAt: new Date().toISOString(), base, limit: max, checks: [], dns: {} };
async function read(url, redirect = 'follow') {
  try {
    const response = await fetch(url, { redirect, signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    let body; try { body = JSON.parse(text); } catch {}
    return { status: response.status, url: response.url, headers: Object.fromEntries(['content-type', 'cache-control', 'server', 'platform', 'location'].map(key => [key, response.headers.get(key)])), body, text };
  } catch (error) { return { error: error.message }; }
}
const resolver = new Resolver();
for (const type of ['A', 'AAAA', 'NS', 'CNAME']) {
  for (const host of [new URL(base).hostname, `www.${new URL(base).hostname}`]) {
    try { evidence.dns[`${host}:${type}`] = await resolver.resolve(host, type); }
    catch (error) { evidence.dns[`${host}:${type}`] = { error: error.code }; }
  }
}
const paths = new Set(['/', '/reference-solutions/ncert/class-6', '/reference-solutions', '/api/health', '/api/public/site', '/api/public/home', '/api/public/revision', '/search', '/this-page-does-not-exist-audit']);
function collect(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (['url', 'linkUrl', 'targetUrl'].includes(key) && typeof item === 'string' && item.startsWith('/') && !item.startsWith('//') && !item.startsWith('/api/') && !item.startsWith('/uploads/') && !/\.(png|jpg|pdf|webp|svg)$/i.test(item)) paths.add(item.split(/[?#]/)[0] || '/');
    else if (item && typeof item === 'object') collect(item);
  }
}
const site = await read(`${base}/api/public/site`);
collect(site.body);
collect((await read(`${base}/api/public/home`)).body);
for (const book of site.body?.referenceBooks || []) {
  for (const number of book.availableClasses || []) paths.add(`/reference-solutions/${book.slug}/class-${number}`);
}
for (const url of [`http://${new URL(base).hostname}/`, `https://www.${new URL(base).hostname}/`]) {
  const result = await read(url, 'manual');
  evidence.checks.push({ requested: url, ...result, text: undefined, body: undefined });
}
for (const path of paths) {
  if (evidence.checks.filter(check => check.path).length >= max) break;
  const result = await read(`${base}${path}`);
  const check = { path, status: result.status, error: result.error, headers: result.headers };
  if (path === '/') {
    evidence.liveAssets = [...(result.text || '').matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
  }
  if (!path.startsWith('/api/') && !['/', '/search', '/this-page-does-not-exist-audit'].includes(path)) {
    const api = await read(`${base}/api/public/resolve?${new URLSearchParams({ path, lang: 'en' })}`);
    check.resolverStatus = api.status;
    check.type = api.body?.type;
    check.apiError = api.body?.error?.message || api.error;
    check.redirect = api.body?.redirect;
    collect(api.body?.data);
    collect(api.body?.breadcrumbs);
  }
  evidence.checks.push(check);
}
evidence.assets = [];
for (const asset of evidence.liveAssets || []) {
  const response = await read(`${base}${asset}`);
  evidence.assets.push({ path: asset, status: response.status, headers: response.headers });
}
evidence.finishedAt = new Date().toISOString();
evidence.discovered = paths.size;
evidence.truncated = paths.size > evidence.checks.filter(check => check.path).length;
evidence.summary = { checked: evidence.checks.length, httpErrors: evidence.checks.filter(check => check.status >= 400 || check.error).length, resolverErrors: evidence.checks.filter(check => check.resolverStatus >= 400).length };
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ output, ...evidence.summary, discovered: evidence.discovered, truncated: evidence.truncated }));
