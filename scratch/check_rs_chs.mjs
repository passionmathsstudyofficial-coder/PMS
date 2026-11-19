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

  for (const id of ['6afc70cf0215ace190bb34a0', '6af5a60c08433111d960668b', '6af0036a515f3bf9c5b0c1a6']) {
    const res = await fetch(`https://passionmathstudy.in/api/content/chapters/${id}?scope=admin`, {
      headers: { Cookie: cookie, 'x-csrf-token': csrf }
    });
    const c = await res.json();
    console.log(`Ch ${id}: class:`, c.class?.number, 'title:', JSON.stringify(c.title));
  }
}

run().catch(console.error);
