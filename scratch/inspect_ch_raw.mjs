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

  const chRes = await fetch('https://passionmathstudy.in/api/content/chapters/6af5a60c08433111d960668b?scope=admin', {
    headers: { Cookie: cookie, 'x-csrf-token': csrf }
  });
  const chData = await chRes.json();
  console.log('Chapter raw:', JSON.stringify(chData, null, 2));
}

run().catch(console.error);
