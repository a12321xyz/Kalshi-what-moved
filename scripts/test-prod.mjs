const t0 = Date.now();
console.log('Fetching from https://kalshi-what-moved.vercel.app/api/digest ...');
fetch('https://kalshi-what-moved.vercel.app/api/digest', { cache: 'no-store' })
  .then(async (res) => {
    const elapsed = Date.now() - t0;
    console.log(`Status: ${res.status}`);
    console.log(`Time: ${elapsed}ms`);
    const text = await res.text();
    console.log(`Body excerpt: ${text.slice(0, 300)}`);
  })
  .catch(err => console.error(err));
