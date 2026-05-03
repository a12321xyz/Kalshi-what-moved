const t0 = Date.now();
fetch('http://localhost:3000/api/digest')
  .then(async (res) => {
    const elapsed = Date.now() - t0;
    console.log(`Status: ${res.status}`);
    console.log(`Time: ${elapsed}ms`);
    const text = await res.text();
    console.log(`Body: ${text.slice(0, 500)}`);
  })
  .catch(err => console.error(err));
