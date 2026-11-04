import express from 'express';
import cors from 'cors';
import { createMiddleware } from '@mswjs/http-middleware';
import { handlers } from './handlers';
import { seedDatabase } from './seed';

async function start() {
  await seedDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // ❗️ Без монтирования по '/api' — MSW видит полный путь запроса
  // и корректно матчит handler '/api/templates/roots'
  app.use(createMiddleware(...handlers));

  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`✅ Mock API server: http://localhost:${PORT}/api`);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start mock server:', err);
  process.exit(1);
});