# Redis Setup Instructions for BeachEchoes

## Overview

Redis has been integrated into the BeachEchoes backend to improve performance by caching frequently accessed data. The caching system is designed to be resilient - the server will continue to function normally if Redis is unavailable, it just won't benefit from caching.

## What's Cached

1. **User Profiles** - 15 minute TTL
   - Cache key: `profile:{firebaseUid}`
   - Includes user data, post counts, following/followers counts
   - Automatically invalidated when profile is updated

2. **Map Posts** - 5 minute TTL
   - Cache key: `posts:map:{category}` (e.g., `posts:map:all`, `posts:map:sports`)
   - All active posts visible on the Map screen
   - Shorter TTL since posts expire after 24 hours

3. **User Posts** - 10 minute TTL
   - Cache key: `posts:user:{neonUserId}`
   - All posts by a specific user (for profile views)
   - Not cached for own profile to ensure live updates

## Development Setup

### 1. Install Redis

**macOS (via Homebrew):**
```bash
brew install redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
```

**Windows:**
- Download and install from: https://redis.io/docs/install/install-redis/install-redis-on-windows/
- Or use WSL2 and follow Linux instructions

### 2. Start Redis Server

**macOS/Linux:**
```bash
redis-server
```

Or run as a background service:
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should respond with: PONG
```

### 3. Install Dependencies

From the `beachechoes/` directory:
```bash
npm install
```

This will install the `redis` package (already added to package.json).

### 4. Configure Environment (Optional)

By default, the app connects to `redis://localhost:6379`. To use a different Redis instance, set the `REDIS_URL` environment variable:

```bash
# In beachechoes/.env or your environment
REDIS_URL=redis://your-redis-host:6379
```

### 5. Start the Backend Server

```bash
cd beachechoes
node server.js
```

You should see in the logs:
```
Redis client connected
Redis initialized successfully
Server running on http://localhost:3000
```

If Redis connection fails, you'll see:
```
Failed to initialize Redis: <error message>
Server will continue without caching
```

## Production Setup

### Option 1: Managed Redis Services

**Recommended services:**
- **Upstash** - Serverless Redis (free tier available)
- **Redis Cloud** - Managed by Redis Labs
- **AWS ElastiCache** - If hosting on AWS
- **Google Cloud Memorystore** - If hosting on Google Cloud
- **DigitalOcean Managed Redis** - Simple and affordable

**Setup steps:**
1. Create a Redis instance on your chosen provider
2. Copy the connection URL (usually starts with `redis://` or `rediss://` for TLS)
3. Set the `REDIS_URL` environment variable in your production environment

### Option 2: Self-Hosted Redis

If you're running your own server:

```bash
# Install Redis
sudo apt update && sudo apt install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Key settings to update:
# - Set a password: requirepass your_strong_password_here
# - Bind to localhost only (if backend is on same server): bind 127.0.0.1
# - Enable persistence: appendonly yes

# Restart Redis
sudo systemctl restart redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server
```

**Connection URL with password:**
```bash
REDIS_URL=redis://:your_password@localhost:6379
```

## Monitoring Cache Performance

The backend logs cache hits and misses:
- `[Cache HIT] profile:abc123` - Data served from cache
- `[Cache MISS] profile:abc123` - Data fetched from database and cached
- `[Cache SET] posts:map:all (TTL: 300s)` - New cache entry created
- `[Cache DEL Pattern] posts:* (5 keys)` - Cache invalidation

## Troubleshooting

### Server starts but Redis fails to connect

**Issue:** You see "Failed to initialize Redis" in logs

**Solution:**
1. Verify Redis is running: `redis-cli ping`
2. Check the `REDIS_URL` is correct
3. Ensure Redis port (6379) is not blocked by firewall

**Note:** The server will continue without caching - this is expected behavior.

### Cache not updating after profile/post changes

**Issue:** Old data is still being served

**Solution:**
1. Check server logs for cache invalidation messages
2. Manually flush Redis cache:
   ```bash
   redis-cli FLUSHALL
   ```
3. Restart the backend server

### High memory usage in Redis

**Issue:** Redis consuming too much memory

**Solution:**
1. Check cache size: `redis-cli INFO memory`
2. Reduce TTLs in `helpers/redisClient.js` (CacheTTL constants)
3. Set a maxmemory limit in redis.conf:
   ```
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

## Cache Key Reference

All cache keys are defined in `helpers/redisClient.js`:

```javascript
CacheKeys = {
  profile: (firebaseUid) => `profile:{firebaseUid}`,
  postsMap: (category = 'all') => `posts:map:{category}`,
  postsMuted: (viewerUserId) => `posts:muted:{viewerUserId}`,
  postsUser: (neonUserId) => `posts:user:{neonUserId}`,
  postsFeed: () => 'posts:feed',
}
```

## Cache TTLs

Configured in `helpers/redisClient.js`:

```javascript
CacheTTL = {
  PROFILE: 15 * 60,      // 15 minutes
  POSTS_MAP: 5 * 60,     // 5 minutes
  POSTS_USER: 10 * 60,   // 10 minutes
  POSTS_FEED: 3 * 60,    // 3 minutes
}
```

To adjust these values, edit the constants in `helpers/redisClient.js`.

## Manual Cache Management

Useful Redis CLI commands:

```bash
# View all cache keys
redis-cli KEYS '*'

# View specific key
redis-cli GET 'profile:abc123'

# Delete specific key
redis-cli DEL 'profile:abc123'

# Delete all keys matching pattern
redis-cli KEYS 'posts:*' | xargs redis-cli DEL

# Flush entire cache
redis-cli FLUSHALL

# Check Redis stats
redis-cli INFO stats
redis-cli INFO memory
```

## Next Steps

After completing this setup:
1. Monitor cache hit rates in server logs
2. Adjust TTLs based on usage patterns
3. Consider adding more caching for other slow endpoints
4. Set up Redis persistence for production use

For questions or issues, refer to the [Redis documentation](https://redis.io/docs/) or the implementation in `helpers/redisClient.js`.
