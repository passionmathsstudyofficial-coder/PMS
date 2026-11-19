import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const email = process.env.SEED_ADMIN_EMAIL || 'passionmathsstudyofficial@gmail.com';
const password = (process.env.SEED_ADMIN_PASSWORD || '').replace(/^"|"$/g, '');

async function run() {
  const loginRes = await fetch('https://passionmathstudy.in/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  const csrf = loginData.csrfToken;

  for (const slug of ['rs-aggarwal', 'rd-sharma', 'ml-aggarwal', 'kc-sinha-maths']) {
    const res = await fetch(`https://passionmathstudy.in/api/content/books?slug=${slug}&scope=admin`, {
      headers: { Cookie: cookie, 'x-csrf-token': csrf }
    });
    const d = await res.json();
    const b = d.items?.[0];
    console.log(`Book ${slug}:`, b ? {
      _id: b._id,
      title: b.title,
      author: b.author,
      slug: b.slug,
      availableClasses: b.availableClasses
    } : 'NOT FOUND');
  }
}

run().catch(console.error);
