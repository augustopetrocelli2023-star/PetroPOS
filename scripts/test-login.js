const service = require('../services/businessService');

async function run() {
  console.log('Running login unit checks...');
  const tests = [
    { usuario: 'admin', clave: 'admin123', expectOk: true },
    { usuario: 'vendedor', clave: 'venta123', expectOk: true },
    { usuario: 'noexiste', clave: 'x', expectOk: false }
  ];

  let failed = 0;
  for (const t of tests) {
    try {
      const res = await service.login({ usuario: t.usuario, clave: t.clave });
      const ok = !!(res && res.ok);
      console.log(`login(${t.usuario}/${t.clave}) => ok=${ok}`);
      if (ok !== t.expectOk) {
        console.error('  ✖ Unexpected result', res);
        failed++;
      }
    } catch (err) {
      console.error('  ✖ Error during login call', err);
      failed++;
    }
  }

  if (failed) {
    console.error(`${failed} tests failed`);
    process.exit(2);
  }
  console.log('All login tests passed');
}

run();
