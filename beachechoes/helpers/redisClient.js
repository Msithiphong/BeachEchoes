import { createClient } from 'redis'

// Redis client singleton
let redisClient = null
let isConnected = false

/**
 * Initialize Redis client connection
 * Call this once at server startup
 */
export async function initRedis() {
  if (redisClient) {
    return redisClient
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached')
            return new Error('Redis reconnection failed')
          }
          // Exponential backoff: 50ms, 100ms, 200ms, etc.
          return Math.min(retries * 50, 3000)
        },
      },
    })

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err)
      isConnected = false
    })

    redisClient.on('connect', () => {
      console.log('Redis client connected')
      isConnected = true
    })

    redisClient.on('disconnect', () => {
      console.log('Redis client disconnected')
      isConnected = false
    })

    await redisClient.connect()
    console.log('Redis initialized successfully')
    
    return redisClient
  } catch (error) {
    console.error('Failed to initialize Redis:', error.message)
    console.warn('Server will continue without caching')
    redisClient = null
    isConnected = false
    return null
  }
}

/**
 * Generic cache get helper
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed JSON object or null if not found/error
 */
export async function cacheGet(key) {
  if (!redisClient || !isConnected) {
    return null
  }

  try {
    const value = await redisClient.get(key)
    if (!value) {
      console.log(`[Cache MISS] ${key}`)
      return null
    }
    
    console.log(`[Cache HIT] ${key}`)
    return JSON.parse(value)
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error.message)
    return null
  }
}

/**
 * Generic cache set helper
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttlSeconds - Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success status
 */
export async function cacheSet(key, value, ttlSeconds = null) {
  if (!redisClient || !isConnected) {
    return false
  }

  try {
    const serialized = JSON.stringify(value)
    
    if (ttlSeconds) {
      await redisClient.setEx(key, ttlSeconds, serialized)
      console.log(`[Cache SET] ${key} (TTL: ${ttlSeconds}s)`)
    } else {
      await redisClient.set(key, serialized)
      console.log(`[Cache SET] ${key} (no TTL)`)
    }
    
    return true
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error.message)
    return false
  }
}

/**
 * Generic cache delete helper
 * @param {string} key - Cache key to delete
 * @returns {Promise<boolean>} Success status
 */
export async function cacheDel(key) {
  if (!redisClient || !isConnected) {
    return false
  }

  try {
    await redisClient.del(key)
    console.log(`[Cache DEL] ${key}`)
    return true
  } catch (error) {
    console.error(`Cache del error for key ${key}:`, error.message)
    return false
  }
}

/**
 * Delete multiple cache keys matching a pattern
 * @param {string} pattern - Redis key pattern (e.g., "posts:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export async function cacheDelPattern(pattern) {
  if (!redisClient || !isConnected) {
    return 0
  }

  try {
    const keys = await redisClient.keys(pattern)
    if (keys.length === 0) {
      return 0
    }
    
    await redisClient.del(keys)
    console.log(`[Cache DEL Pattern] ${pattern} (${keys.length} keys)`)
    return keys.length
  } catch (error) {
    console.error(`Cache del pattern error for ${pattern}:`, error.message)
    return 0
  }
}

/**
 * Close Redis connection
 * Call this on server shutdown
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit()
    console.log('Redis connection closed')
    redisClient = null
    isConnected = false
  }
}

/**
 * Check if Redis is available
 * @returns {boolean}
 */
export function isRedisAvailable() {
  return isConnected
}

// Cache key builders (for consistency)
export const CacheKeys = {
  profile: (firebaseUid) => `profile:${firebaseUid}`,
  postsMap: (category = 'all') => `posts:map:${category}`,
  postsMuted: (viewerUserId) => `posts:muted:${viewerUserId}`,
  postsUser: (neonUserId) => `posts:user:${neonUserId}`,
  postsFeed: () => 'posts:feed',
}

// Cache TTLs in seconds
export const CacheTTL = {
  PROFILE: 15 * 60, // 15 minutes
  POSTS_MAP: 5 * 60, // 5 minutes (posts can expire)
  POSTS_USER: 10 * 60, // 10 minutes
  POSTS_FEED: 3 * 60, // 3 minutes (most dynamic)
}
