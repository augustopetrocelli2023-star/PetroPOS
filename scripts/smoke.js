// Lightweight smoke checks: verify businessService.getState and login
const service = require('../services/businessService');

async function run() {
  console.log('Smoke: checking getState and login...');
  try {
    const state = await service.getState();
    console.log('getState -> business name:', state.business?.nombre || state.business?.nombre || '<no-name>');
  } catch (err) {
    console.error('getState failed', err);
    process.exit(3);
  }

  try {
    const login = await service.login({ usuario: 'admin', clave: 'admin123' });
    if (!login || !login.ok) {
      console.error('Smoke login failed', login);
      process.exit(4);
    }
    console.log('Smoke login OK - user:', login.user?.usuario || login.user?.id);
  } catch (err) {
    console.error('Smoke login exception', err);
    process.exit(5);
  }

  console.log('Smoke checks passed');
}

run();
