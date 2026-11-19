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
  console.log('Logged in to live admin:', loginRes.status, 'role:', loginData.admin?.role);

  // Fetch books
  const booksRes = await fetch('https://passionmathstudy.in/api/content/books?category=reference', {
    headers: { Cookie: cookie, 'x-csrf-token': csrf }
  });
  const booksData = await booksRes.json();
  console.log('Live reference books count:', booksData.items?.length);
  for (const b of booksData.items || []) {
    console.log(` - Book: ${b.slug} (${b._id}) title:`, b.title, 'author:', b.author);
  }

  // Fetch chapters for RS Aggarwal
  const rsBook = booksData.items?.find(b => b.slug === 'rs-aggarwal');
  if (rsBook) {
    const chRes = await fetch(`https://passionmathstudy.in/api/content/chapters?book=${rsBook._id}`, {
      headers: { Cookie: cookie, 'x-csrf-token': csrf }
    });
    const chData = await chRes.json();
    console.log('Live chapters for RS Aggarwal:', chData.items?.length);
    for (const c of chData.items || []) {
      console.log(`   * Ch #${c.number} (${c._id}) slug:${c.slug} title:`, c.title);
    }
  }
}

run().catch(console.error);
