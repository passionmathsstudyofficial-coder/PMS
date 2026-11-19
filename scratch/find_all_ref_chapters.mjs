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

  const chRes = await fetch('https://passionmathstudy.in/api/content/chapters?limit=100', {
    headers: { Cookie: cookie, 'x-csrf-token': csrf }
  });
  const chData = await chRes.json();
  console.log('Total live chapters:', chData.total);
  for (const c of chData.items || []) {
    if (c.book) {
      console.log(`Ch ID: ${c._id} num: ${c.number} slug: ${c.slug} book: ${c.book?.slug || c.book} title:`, JSON.stringify(c.title));
    }
  }
}

run().catch(console.error);
