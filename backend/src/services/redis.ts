import { Redis } from 'ioredis';

// Connect to Memurai on localhost:6379
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

redis.on('connect', () => {
    console.log('✅ Connected to Memurai (Redis)');
});

redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err);
});

export default redis;