import ora from 'ora';
import { createClient } from 'redis';
import { ENV } from './env.js';

const spinner = ora('Connecting to Redis...').start();

const redisClient = createClient({
  socket: {
    host: ENV.REDIS_HOST || 'localhost',
    port: ENV.REDIS_PORT || 6379,
  },
  password: ENV.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => {
  spinner.fail(`Redis Client Error: ${err.message}`);
});

redisClient.on('connect', () => {
  spinner.succeed('Redis Connected');
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export default redisClient;
