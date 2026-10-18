// Throwaway measurement harness — times each route the way a user experiences it.
// Warms every route once, then reports the median of several runs so JIT and
// connection-pool warm-up do not flatter or punish a measurement.
import { createServerClient } from '@supabase/ssr';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const domain = process.env.TRACK_EMAIL_DOMAIN;
const password = process.env.TRACK_DEFAULT_PASSWORD;
const RUNS = Number(process.env.RUNS ?? 5);

/** Signs in and returns the Cookie header @supabase/ssr would have written. */
async function signIn(email) {
  const jar = new Map();
  const supabase = createServerClient(url, publishable, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value } of list) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function once(path, cookie) {
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  const body = await res.text();
  return {
    ms: performance.now() - started,
    status: res.status,
    bytes: body.length,
    location: res.headers.get('location'),
  };
}

async function measure(label, path, cookie) {
  const samples = [];
  for (let i = 0; i < RUNS + 1; i += 1) {
    const sample = await once(path, cookie);
    if (i > 0) samples.push(sample); // discard the warm-up run
  }
  const sorted = [...samples].sort((a, b) => a.ms - b.ms);
  const median = sorted[Math.floor(sorted.length / 2)];
  const note = median.status >= 300 && median.status < 400 ? ` → ${median.location}` : '';
  console.log(
    `  ${label.padEnd(20)} ${String(Math.round(median.ms)).padStart(6)} ms  [${median.status}${note}]  ${(
      median.bytes / 1024
    ).toFixed(0)} kB`,
  );
  return Math.round(median.ms);
}

const results = [];
async function group(name, cookie, routes) {
  console.log(`\n${name}:`);
  for (const [label, path] of routes) results.push([label, await measure(label, path, cookie)]);
}

console.log(`Measuring ${BASE} (${RUNS} runs, median)\n`);

await group('anonymous', null, [
  ['/', '/'],
  ['/login', '/login'],
  ['/register', '/register'],
]);

const adminCookie = await signIn(`admin@${domain}`);
await group('as admin', adminCookie, [
  ['/admin', '/admin'],
  ['/admin/tracks', '/admin/tracks'],
  ['/admin/members', '/admin/members'],
  ['/admin/members?q=a', '/admin/members?q=a'],
  ['/admin/history', '/admin/history'],
]);

const boardCookie = await signIn(`agentic-ai@${domain}`);
await group('as track board', boardCookie, [['/board', '/board']]);

const adminOnly = results.filter(([label]) => label.startsWith('/admin'));
const mean = Math.round(adminOnly.reduce((sum, [, ms]) => sum + ms, 0) / adminOnly.length);
console.log(
  `\n  admin mean: ${mean} ms   (${adminOnly.map(([l, ms]) => `${l}=${ms}`).join(', ')})`,
);
