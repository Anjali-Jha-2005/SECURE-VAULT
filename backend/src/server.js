import { createApp } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './utils/logger.js';

const server = createApp().listen(config.port, () =>
  logger.info('server_started', { port: config.port, env: config.env }));

async function shutdown(signal) {
  logger.info('shutdown', { signal });
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
