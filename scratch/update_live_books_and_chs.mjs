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

  const updates = [
    {
      id: '6aef59cdb886514311503af4',
      slug: 'rs-aggarwal',
      data: {
        title: { en: 'R.S. Aggarwal', hi: 'आर. एस. अग्रवाल', mixed: '' },
        author: 'R.S. Aggarwal'
      }
    },
    {
      id: '6aef59ceb886514311503afc',
      slug: 'rd-sharma',
      data: {
        title: { en: 'R.D. Sharma', hi: 'आर. डी. शर्मा', mixed: '' },
        author: 'Dr. R.D. Sharma'
      }
    },
    {
      id: '6aef59ceb886514311503b04',
      slug: 'ml-aggarwal',
      data: {
        title: { en: 'M.L. Aggarwal', hi: 'एम. एल. अग्रवाल', mixed: '' },
        author: 'M.L. Aggarwal'
      }
    },
    {
      id: '6aef59cdb886514311503aec',
      slug: 'kc-sinha-maths',
      data: {
        title: { en: 'K.C. Sinha Mathematics', hi: 'के. सी. सिन्हा गणित', mixed: '' },
        author: 'Prof. K.C. Sinha'
      }
    }
  ];

  for (const item of updates) {
    const res = await fetch(`https://passionmathstudy.in/api/content/books/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        'x-csrf-token': csrf
      },
      body: JSON.stringify(item.data)
    });
    console.log(`Updated book ${item.slug}: status ${res.status}`);
  }

  // Update chapter 6af5a60c08433111d960668b (RS Aggarwal Class 8 Chapter 1)
  const chRes = await fetch('https://passionmathstudy.in/api/content/chapters/6af5a60c08433111d960668b', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      'x-csrf-token': csrf
    },
    body: JSON.stringify({
      title: { hi: 'समानुपातिक तर्कण 2', en: 'Proportional Reasoning 2', mixed: '' }
    })
  });
  console.log(`Updated RS Aggarwal Class 8 Ch 1: status ${chRes.status}`);

  // Update Class 10 RS Aggarwal Chapter 1
  const ch10Res = await fetch('https://passionmathstudy.in/api/content/chapters/6afc70cf0215ace190bb34a0', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      'x-csrf-token': csrf
    },
    body: JSON.stringify({
      title: { hi: 'वास्तविक संख्याएँ', en: 'Real Numbers', mixed: '' }
    })
  });
  console.log(`Updated RS Aggarwal Class 10 Ch 1: status ${ch10Res.status}`);

  // Update Class 12 RS Aggarwal Chapter 1
  const ch12Res = await fetch('https://passionmathstudy.in/api/content/chapters/6af0036a515f3bf9c5b0c1a6', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      'x-csrf-token': csrf
    },
    body: JSON.stringify({
      title: { hi: 'समुच्चय', en: 'Sets', mixed: '' }
    })
  });
  console.log(`Updated RS Aggarwal Class 12 Ch 1: status ${ch12Res.status}`);
}

run().catch(console.error);
