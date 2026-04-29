import express from 'express'
import { neon } from '@neondatabase/serverless'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { createRequire } from 'module'
import { VALID_CAMPUS_POLYGON } from './config/campusMap.js'
import { DEFAULT_POST_CATEGORY, isValidPostCategory } from './config/postCategories.js'

const require = createRequire(import.meta.url)

dotenv.config()


const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' })) // Increased limit for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Neon db
const sql = neon(process.env.DATABASE_URL)

// Init Firebase Admin & Bucket
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const bucket = admin.storage().bucket()

// Auth middleware helpers
function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}

async function requireFirebaseAuth(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing bearer token' })
    }

    const decoded = await admin.auth().verifyIdToken(token)
    req.firebase = decoded // contains uid, email, name, etc.
    next()
  } catch (error) {
    console.error('Auth verification error:', error)
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

// Sync Firebase user to Neon DB
app.post('/api/users/sync', requireFirebaseAuth, async (req, res) => {
  try {
    const { uid, email, name } = req.firebase
    const { display_name } = req.body

    // Upsert: insert if not exists, update if exists
    const result = await sql`
      INSERT INTO users (firebase_uid, email, name, created_at)
      VALUES (${uid}, ${email}, ${display_name || name || ''}, now())
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name
      RETURNING user_id, firebase_uid, email, name, avatar_url
    `

    res.json({ success: true, user: result[0] })
  } catch (error) {
    console.error('User sync error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Search users by name prefix (for autocomplete)
app.get('/api/users/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()

    if (!q) {
      return res.json({ success: true, users: [] })
    }

    // ILIKE = case-insensitive prefix search in PostgreSQL.
    // The pattern is parameterized via tagged template, so it's injection-safe.
    const pattern = `${q}%`
    const result = await sql`
      SELECT firebase_uid, name, avatar_url
      FROM users
      WHERE name ILIKE ${pattern}
      ORDER BY name
      LIMIT 10
    `

    res.json({ success: true, users: result })
  } catch (error) {
    console.error('User search error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

app.post('/api/messages', requireFirebaseAuth, async (req, res) => {
  try {
    const { uid } = req.firebase
    const { message } = req.body
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' })
    }
    
    // Get the user_id from Neon based on firebase_uid
    const userResult = await sql`
      SELECT user_id FROM users WHERE firebase_uid = ${uid}
    `
    
    if (!userResult.length) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found. Please log out and log back in to sync your account.' 
      })
    }
    
    const userId = userResult[0].user_id
    
    if (!userId) {
      return res.status(500).json({ 
        success: false, 
        error: 'User record is invalid. Please contact support.' 
      })
    }
    
    // Insert message with user_id foreign key
    const result = await sql`
      INSERT INTO messages (user_id, message, created_at)
      VALUES (${userId}, ${message}, NOW())
      RETURNING id, user_id, message, created_at
    `
    
    res.json({ success: true, message: result[0] })
  } catch (error) {
    console.error('Message error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET messages by Neon user_id (current user)
app.get('/api/messages/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user_id' })
    }

    const result = await sql`
      SELECT id, user_id, message, COALESCE(upvote, 0)::int AS upvote, created_at
      FROM messages
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `

    res.json({ success: true, messages: result })
  } catch (error) {
    console.error('Fetch user messages error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Upload avatar to Firebase Storage
app.post('/api/profile/:userId/avatar', requireFirebaseAuth, async (req, res) => {
  try {
    const routeUid = req.params.userId // Firebase uid from route
    const authedUid = req.firebase?.uid // Firebase uid from verified token

    // Ensure user can only upload their own avatar
    if (!authedUid || authedUid !== routeUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    const { imageBase64, contentType = 'image/jpeg' } = req.body

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Image data is required' })
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    
    // Create unique filename
    const fileName = `avatars/${authedUid}_${Date.now()}.jpg`
    const file = bucket.file(fileName)

    // Upload to Firebase Storage
    await file.save(imageBuffer, {
      metadata: {
        contentType: contentType,
      },
      public: true,
    })

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`

    // Update user's avatar URL in database using firebase_uid
    await sql`
      UPDATE users
      SET avatar_url = ${publicUrl}
      WHERE firebase_uid = ${authedUid}
    `

    res.json({ success: true, avatarUrl: publicUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET user profile (includes echoes, following, followers counts)
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params // This is firebase_uid

    const result = await sql`
      SELECT user_id AS id, firebase_uid, name, bio, avatar_url
      FROM users
      WHERE firebase_uid = ${userId}
    `

    if (!result.length) {
      return res.json({ success: false, error: 'Profile not found' })
    }

    const profile = result[0]
    const neonId = profile.id

    // Echoes = total posts by this user (excluding deleted)
    const echoesResult = await sql`
      SELECT COUNT(*)::int AS count FROM posts WHERE user_id = ${neonId} AND is_deleted = FALSE
    `

    // Following = people this user follows
    const followingResult = await sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE user_id = ${neonId}
    `

    // Followers = people who follow this user
    const followersResult = await sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE friend_id = ${neonId}
    `

    profile.echoes_count = echoesResult[0]?.count ?? 0
    profile.following_count = followingResult[0]?.count ?? 0
    profile.followers_count = followersResult[0]?.count ?? 0

    res.json({ success: true, profile })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

app.put('/api/profile/:userId', requireFirebaseAuth, async (req, res) => {
  try {
    const routeUid = req.params.userId
    const authedUid = req.firebase?.uid

    // Ensure user can only update their own profile
    if (!authedUid || authedUid !== routeUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    const { name, bio, avatarUrl } = req.body

    const result = await sql`
      UPDATE users
      SET 
        name = ${name}, 
        bio = ${bio}, 
        avatar_url = ${avatarUrl || null}
      WHERE firebase_uid = ${authedUid}
      RETURNING user_id AS id, firebase_uid, name, bio, avatar_url
    `

    res.json({ success: true, profile: result[0] })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

// -------------------- LEADERBOARD (MESSAGES + UPVOTES ONLY) --------------------

// -------------------- FRIENDSHIPS --------------------

// Helper: resolve firebase_uid → neon user_id
async function resolveUserId(firebaseUid) {
  const rows = await sql`SELECT user_id FROM users WHERE firebase_uid = ${firebaseUid}`
  return rows.length ? rows[0].user_id : null
}

async function resolveViewerUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice(7)
    const decodedToken = await admin.auth().verifyIdToken(token)
    return await resolveUserId(decodedToken.uid)
  } catch {
    return null
  }
}

// -------------------- NOTIFICATIONS --------------------

// Notification types (extensible for future use)
const NOTIFICATION_TYPES = {
  POST_LIKED: 'post_liked',
  POST_EXPIRED: 'post_expired',
  NEW_FOLLOWER: 'new_follower'
}

const MAX_NOTIFICATIONS_PER_USER = 15

/**
 * Create a notification for a user (modular, WebSocket-ready)
 * @param {number} userId - Recipient user ID
 * @param {string} type - Notification type (from NOTIFICATION_TYPES)
 * @param {object} data - Notification-specific data (JSON)
 * @param {number} fromUserId - (Optional) Sender user ID for friend request notifications
 */
async function createNotification(userId, type, data, fromUserId = null) {
  try {
    // Insert new notification
    await sql`
      INSERT INTO notifications (user_id, type, data, created_at, read, from_user_id)
      VALUES (${userId}, ${type}, ${JSON.stringify(data)}, NOW(), FALSE, ${fromUserId})
    `

    // Enforce max 15 notifications per user (delete oldest if over limit)
    await sql`
      DELETE FROM notifications
      WHERE id IN (
        SELECT id FROM notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        OFFSET ${MAX_NOTIFICATIONS_PER_USER}
      )
    `

    // Future WebSocket hook: emit event here when WebSocket server is added
    // Example: notificationEmitter.emit('new_notification', { userId, type, data })
  } catch (error) {
    console.error('Create notification error:', error)
    // Don't throw - notifications should not break core functionality
  }
}

// GET /api/notifications — fetch latest notifications for authenticated user
app.get('/api/notifications', requireFirebaseAuth, async (req, res) => {
  try {
    const userId = await resolveUserId(req.firebase.uid)
    if (!userId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const notifications = await sql`
      SELECT id, type, data, created_at, read
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_NOTIFICATIONS_PER_USER}
    `

    res.json({ success: true, notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/notifications/read — mark notifications as read
app.post('/api/notifications/read', requireFirebaseAuth, async (req, res) => {
  try {
    const userId = await resolveUserId(req.firebase.uid)
    if (!userId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const { notificationIds } = req.body
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ success: false, error: 'notificationIds array required' })
    }

    if (notificationIds.length === 0) {
      return res.json({ success: true, updated: 0 })
    }

    // Mark as read only if owned by this user (security)
    const result = await sql`
      UPDATE notifications
      SET read = TRUE
      WHERE user_id = ${userId}
        AND id = ANY(${notificationIds})
        AND read = FALSE
      RETURNING id
    `

    res.json({ success: true, updated: result.length })
  } catch (error) {
    console.error('Mark notifications read error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ------------------ END NOTIFICATIONS ------------------

// GET friendship status between the authed user and another user
// Returns relationship state: self, none, following
// This is a ONE-WAY check: current user → target user
app.get('/api/friendships/status/:friendUid', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(req.params.friendUid)

    if (!myId || !friendId) {
      return res.json({ success: true, relationship: 'none' })
    }

    // Check if viewing own profile
    if (myId === friendId) {
      return res.json({ success: true, relationship: 'self' })
    }

    // Check for relationship from me (auth user) to them (target user) only
    const rows = await sql`
      SELECT 1
      FROM friendships
      WHERE user_id = ${myId} AND friend_id = ${friendId}
    `

    const relationship = rows.length ? 'following' : 'none'

    res.json({ success: true, relationship })
  } catch (error) {
    console.error('Friendship status error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST follow (instant follow without approval)
app.post('/api/friendships/follow', requireFirebaseAuth, async (req, res) => {
  try {
    const { friendUid } = req.body
    if (!friendUid) {
      return res.status(400).json({ success: false, error: 'friendUid is required' })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(friendUid)

    if (!myId || !friendId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }
    if (myId === friendId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' })
    }

    // Insert friendship (instant follow, no approval needed)
    const insertResult = await sql`
      INSERT INTO friendships (user_id, friend_id, created_at, updated_at)
      VALUES (${myId}, ${friendId}, NOW(), NOW())
      ON CONFLICT (user_id, friend_id) DO NOTHING
      RETURNING user_id, (xmax = 0) AS inserted
    `

    // Create notification for the target user if this is a new follow
    if (insertResult.length > 0 && insertResult[0].inserted) {
      const senderInfo = await sql`
        SELECT name, avatar_url FROM users WHERE user_id = ${myId}
      `
      
      if (senderInfo.length > 0) {
        await createNotification(friendId, NOTIFICATION_TYPES.NEW_FOLLOWER, {
          from_user_id: myId,
          from_firebase_uid: req.firebase.uid,
          from_name: senderInfo[0].name || 'Someone',
          from_avatar_url: senderInfo[0].avatar_url || null
        }, myId)
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Follow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE unfollow (remove the friendship row where I am the follower)
// This only removes the relationship where current user follows target user
app.delete('/api/friendships/unfollow', requireFirebaseAuth, async (req, res) => {
  try {
    const { friendUid } = req.body
    if (!friendUid) {
      return res.status(400).json({ success: false, error: 'friendUid is required' })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(friendUid)

    if (!myId || !friendId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Remove friendship where I follow them (user_id = me, friend_id = them)
    await sql`
      DELETE FROM friendships
      WHERE user_id = ${myId} 
        AND friend_id = ${friendId}
    `

    res.json({ success: true })
  } catch (error) {
    console.error('Unfollow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})



// DELETE remove follower (remove someone from my followers list)
app.delete('/api/friendships/remove-follower', requireFirebaseAuth, async (req, res) => {
  try {
    const { followerUid } = req.body
    if (!followerUid) {
      return res.status(400).json({ success: false, error: 'followerUid is required' })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const followerId = await resolveUserId(followerUid)

    if (!myId || !followerId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    // Remove the relationship where they follow me (user_id = them, friend_id = me)
    await sql`
      DELETE FROM friendships
      WHERE user_id = ${followerId} 
        AND friend_id = ${myId}
    `

    res.json({ success: true })
  } catch (error) {
    console.error('Remove follower error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ------------------ END FRIENDSHIPS ------------------



// -------------------- FOLLOWERS / FOLLOWING LISTS --------------------

// GET /api/friendships/following/:firebaseUid — people this user follows
app.get('/api/friendships/following/:firebaseUid', async (req, res) => {
  try {
    const uid = req.params.firebaseUid
    const userId = await resolveUserId(uid)
    if (!userId) return res.json({ success: true, users: [] })

    // Get all users where user_id = this user (they follow others)
    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u ON u.user_id = f.friend_id
      WHERE f.user_id = ${userId}
      ORDER BY u.name ASC
    `
    res.json({ success: true, users: rows })
  } catch (err) {
    console.error('Following list error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/friendships/followers/:firebaseUid — users who follow this person
app.get('/api/friendships/followers/:firebaseUid', async (req, res) => {
  try {
    const uid = req.params.firebaseUid
    const userId = await resolveUserId(uid)
    if (!userId) return res.json({ success: true, users: [] })

    // Get all users where friend_id = this user (others follow them)
    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u ON u.user_id = f.user_id
      WHERE f.friend_id = ${userId}
      ORDER BY u.name ASC
    `
    res.json({ success: true, users: rows })
  } catch (err) {
    console.error('Followers list error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// -------------------- USER MUTES --------------------

// GET mute status for a target user
app.get('/api/users/:targetUid/mute-status', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    const targetId = await resolveUserId(req.params.targetUid)

    if (!myId || !targetId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    if (myId === targetId) {
      return res.json({ success: true, muted: false })
    }

    const rows = await sql`
      SELECT 1
      FROM user_mutes
      WHERE muter_user_id = ${myId} AND muted_user_id = ${targetId}
      LIMIT 1
    `
    res.json({ success: true, muted: rows.length > 0 })
  } catch (error) {
    console.error('Get mute status error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT mute status for a target user
app.put('/api/users/:targetUid/mute', requireFirebaseAuth, async (req, res) => {
  try {
    const { muted } = req.body
    if (typeof muted !== 'boolean') {
      return res.status(400).json({ success: false, error: 'muted boolean is required' })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const targetId = await resolveUserId(req.params.targetUid)

    if (!myId || !targetId) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    if (myId === targetId) {
      return res.status(400).json({ success: false, error: 'Cannot mute yourself' })
    }

    if (muted) {
      await sql`
        INSERT INTO user_mutes (muter_user_id, muted_user_id)
        VALUES (${myId}, ${targetId})
        ON CONFLICT (muter_user_id, muted_user_id) DO NOTHING
      `
    } else {
      await sql`
        DELETE FROM user_mutes
        WHERE muter_user_id = ${myId}
          AND muted_user_id = ${targetId}
      `
    }

    res.json({ success: true, muted })
  } catch (error) {
    console.error('Set mute status error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// -------------------- LEADERBOARD (POSTS + LIKES) --------------------

const ALLOWED_PERIODS = { day: "1 day", week: "7 days", month: "30 days", all: null };
const ALLOWED_VIEWS = new Set(["users", "posts"]);

function normPeriod(p) {
  const v = String(p ?? "week").toLowerCase();
  return Object.prototype.hasOwnProperty.call(ALLOWED_PERIODS, v) ? v : "week";
}
function normView(v) {
  const s = String(v ?? "users").toLowerCase();
  return ALLOWED_VIEWS.has(s) ? s : "users";
}
function clampLimit(n) {
  const x = Number.parseInt(n ?? "20", 10);
  return Number.isFinite(x) ? Math.max(1, Math.min(x, 100)) : 20;
}

/**
 * Returns:
 *  - joinSql: extra SQL to add to JOIN ... ON ... (keeps LEFT JOIN behavior intact)
 *  - whereSql: extra SQL to add to WHERE ... (used for messages view)
 *  - params: array of params for prepared statement
 */
function buildPeriodFilter(period, col, startIndex = 1) {
  const interval = ALLOWED_PERIODS[period];
  if (!interval) {
    return { sql: "", params: [], nextIndex: startIndex };
  }
  // We parametrize the interval string and cast to interval.
  return {
    sql: `${col} >= NOW() - $${startIndex}::interval`,
    params: [interval],
    nextIndex: startIndex + 1,
  };
}

// -------------------- USERS LEADERBOARD --------------------
// Top Users = COUNT of likes across their non-anonymous, non-deleted posts
async function queryUserLeaderboard({ period, limit }) {
  const params = [];
  let paramIndex = 1;

  // IMPORTANT: for LEFT JOIN, put time filter in JOIN condition
  const pf = buildPeriodFilter(period, "p.created_at", paramIndex);
  params.push(...pf.params);
  paramIndex = pf.nextIndex;

  // limit param
  params.push(limit);
  const limitParam = paramIndex;

  const joinPeriodSql = pf.sql ? `AND ${pf.sql}` : "";

  const q = `
    SELECT
      u.user_id AS user_id,
      u.name,
      u.bio,
      u.avatar_url,

      COALESCE(COUNT(pl.user_id), 0)::int AS total_upvotes,

      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(COUNT(pl.user_id), 0) DESC,
          u.user_id ASC
      ) AS rank

    FROM users u
    LEFT JOIN posts p
      ON p.user_id = u.user_id
      AND p.is_deleted = FALSE
      AND p.is_anonymous = FALSE
      ${joinPeriodSql}
    LEFT JOIN post_likes pl
      ON pl.post_id = p.id

    GROUP BY u.user_id, u.name, u.bio, u.avatar_url
    HAVING COALESCE(COUNT(pl.user_id), 0) >= 1
    ORDER BY rank
    LIMIT $${limitParam};
  `;

  const rows = await sql.query(q, params);

  return rows.map((r) => ({
    rank: Number(r.rank),
    user_id: Number(r.user_id),
    name: r.name ?? "",
    bio: r.bio ?? "",
    avatar_url: r.avatar_url ?? null,
    total_upvotes: Number(r.total_upvotes),
  }));
}

// -------------------- POSTS LEADERBOARD --------------------
// Top Posts = posts ordered by like count, tie-break by post id
async function queryPostLeaderboard({ period, limit }) {
  const params = [];
  let paramIndex = 1;

  // For posts view, WHERE filter is correct (no LEFT JOIN needed)
  const pf = buildPeriodFilter(period, "p.created_at", paramIndex);
  params.push(...pf.params);
  paramIndex = pf.nextIndex;

  params.push(limit);
  const limitParam = paramIndex;

  const whereSql = pf.sql ? `AND ${pf.sql}` : "";

  const q = `
    SELECT
      p.id,
      p.overlay_text,
      p.created_at,
      COALESCE(l.like_count, 0)::int AS upvotes,

      u.user_id AS author_user_id,
      u.name AS author_name,
      u.bio AS author_bio,
      u.avatar_url AS author_avatar_url,

      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(l.like_count, 0) DESC,
          p.id ASC
      ) AS rank

    FROM posts p
    JOIN users u
      ON u.user_id = p.user_id
    LEFT JOIN (
      SELECT post_id, COUNT(*)::int AS like_count
      FROM post_likes
      GROUP BY post_id
    ) l ON l.post_id = p.id
    WHERE p.is_deleted = FALSE
      AND p.is_anonymous = FALSE
      AND COALESCE(l.like_count, 0) >= 1
      ${whereSql}
    ORDER BY rank
    LIMIT $${limitParam};
  `;

  const rows = await sql.query(q, params);

  return rows.map((r) => ({
    rank: Number(r.rank),
    id: Number(r.id),
    message: r.overlay_text,
    created_at: r.created_at,
    upvotes: Number(r.upvotes),
    author: {
      user_id: Number(r.author_user_id),
      name: r.author_name ?? "",
      bio: r.author_bio ?? "",
      avatar_url: r.author_avatar_url ?? null,
    },
  }));
}

// GET /api/leaderboard?view=users|posts&period=day|week|month|all&limit=20
app.get("/api/leaderboard", async (req, res) => {
  try {
    const view = normView(req.query.view);
    const period = normPeriod(req.query.period);
    const limit = clampLimit(req.query.limit);

    const data =
      view === "users"
        ? await queryUserLeaderboard({ period, limit })
        : await queryPostLeaderboard({ period, limit });

    res.json({ success: true, view, period, limit, data });
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ------------------ END LEADERBOARD ------------------

// -------------------- POSTS (MAP MVP) --------------------
const POST_TTL_INTERVAL = '1 day'
const EXPIRED_POST_CLEANUP_INTERVAL_MS = 15 * 60 * 1000
let postsHasAnonymousColumn = null

async function ensurePostsAnonymousColumnKnown() {
  if (postsHasAnonymousColumn !== null) return postsHasAnonymousColumn

  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'posts'
        AND column_name = 'is_anonymous'
    ) AS has_column
  `
  postsHasAnonymousColumn = !!rows?.[0]?.has_column
  return postsHasAnonymousColumn
}

function getDatabaseUrlSummary() {
  const raw = process.env.DATABASE_URL || ''
  if (!raw) return { configured: false }
  try {
    const parsed = new URL(raw)
    return {
      configured: true,
      host: parsed.host,
      database: parsed.pathname?.replace(/^\//, '') || null,
    }
  } catch {
    return { configured: true, parseError: true }
  }
}

function getStoragePathFromPublicUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null
  const expectedPrefix = `https://storage.googleapis.com/${bucket.name}/`
  if (!imageUrl.startsWith(expectedPrefix)) return null
  return decodeURIComponent(imageUrl.slice(expectedPrefix.length))
}

async function cleanupExpiredPosts() {
  const expiredPosts = await sql`
    DELETE FROM posts
    WHERE created_at < NOW() - ${POST_TTL_INTERVAL}::interval
    RETURNING id, user_id, image_url, overlay_text, is_anonymous
  `

  if (!expiredPosts.length) return

  for (const post of expiredPosts) {
    // Delete image from Firebase Storage
    const storagePath = getStoragePathFromPublicUrl(post.image_url)
    if (storagePath) {
      try {
        await bucket.file(storagePath).delete({ ignoreNotFound: true })
      } catch (error) {
        console.error(`Storage cleanup failed for post ${post.id}:`, error)
      }
    }

    // Create notification for post owner (if not anonymous)
    if (!post.is_anonymous && post.user_id) {
      await createNotification(post.user_id, NOTIFICATION_TYPES.POST_EXPIRED, {
        post_id: post.id,
        overlay_text: post.overlay_text || 'Your post'
      })
    }
  }

  console.log(`Expired posts cleaned up: ${expiredPosts.length}`)
}

// Ray-casting point-in-polygon (mirrors helpers/mapUtils.js for backend validation)
function pointInPolygon(point, polygon) {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    const intersects =
      (yi > point.y) !== (yj > point.y) &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

// POST /api/posts — create a new post (authenticated)
app.post('/api/posts', requireFirebaseAuth, async (req, res) => {
  try {
    const userId = await resolveUserId(req.firebase.uid)
    if (!userId) return res.status(404).json({ success: false, error: 'User not found' })

    const {
      imageBase64,
      overlayText = '',
      category = DEFAULT_POST_CATEGORY,
      isAnonymous = false,
      mapX,
      mapY,
      contentType = 'image/jpeg',
    } = req.body

    if (!imageBase64) return res.status(400).json({ success: false, error: 'imageBase64 is required' })

    const text = String(overlayText).slice(0, 2000)
    const normalizedCategory = String(category || '').trim()
    if (!isValidPostCategory(normalizedCategory)) {
      return res.status(400).json({ success: false, error: 'Invalid category' })
    }

    const x = parseFloat(mapX)
    const y = parseFloat(mapY)
    const anonymous = Boolean(isAnonymous)
    if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      return res.status(400).json({ success: false, error: 'map_x and map_y must be between 0 and 1' })
    }
    if (!pointInPolygon({ x, y }, VALID_CAMPUS_POLYGON)) {
      return res.status(400).json({ success: false, error: 'Location is outside the campus boundary' })
    }

    // Upload image to Firebase Storage
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const fileName = `posts/${userId}_${Date.now()}.jpg`
    const file = bucket.file(fileName)
    await file.save(imageBuffer, { metadata: { contentType }, public: true })
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
    const hasAnonymousColumn = await ensurePostsAnonymousColumnKnown()

    if (anonymous && !hasAnonymousColumn) {
      return res.status(500).json({
        success: false,
        error: 'Database migration required: add posts.is_anonymous column before posting anonymously.',
      })
    }

    const result = hasAnonymousColumn
      ? await sql`
          INSERT INTO posts (user_id, image_url, overlay_text, category, is_anonymous, map_x, map_y)
          VALUES (${userId}, ${imageUrl}, ${text}, ${normalizedCategory}, ${anonymous}, ${x}, ${y})
          RETURNING
            id,
            image_url,
            overlay_text,
            category,
            is_anonymous,
            map_x,
            map_y,
            created_at,
            created_at + ${POST_TTL_INTERVAL}::interval AS expires_at
        `
      : await sql`
          INSERT INTO posts (user_id, image_url, overlay_text, category, map_x, map_y)
          VALUES (${userId}, ${imageUrl}, ${text}, ${normalizedCategory}, ${x}, ${y})
          RETURNING
            id,
            image_url,
            overlay_text,
            category,
            FALSE AS is_anonymous,
            map_x,
            map_y,
            created_at,
            created_at + ${POST_TTL_INTERVAL}::interval AS expires_at
        `

    res.status(201).json({ success: true, post: result[0] })
  } catch (err) {
    if (err?.code === '42703' && String(err?.message || '').includes('is_anonymous')) {
      postsHasAnonymousColumn = false
      return res.status(500).json({
        success: false,
        error: 'Database migration required: add posts.is_anonymous column and restart the server.',
      })
    }
    console.error('POST /api/posts error:', err)
    const details = err?.message ? String(err.message) : 'Unknown server error'
    res.status(500).json({
      success: false,
      error: `Internal server error: ${details}`,
      code: err?.code || null,
    })
  }
})

// GET /api/posts/map — active visible posts for the Map tab
app.get('/api/posts/map', async (req, res) => {
  try {
    const rawCategory = String(req.query.category || '').trim()
    const showMutedOnly = rawCategory.toLowerCase() === 'muted'
    const shouldFilterCategory = rawCategory.length > 0 && !showMutedOnly
    if (shouldFilterCategory && !isValidPostCategory(rawCategory)) {
      return res.status(400).json({ success: false, error: 'Invalid category' })
    }

    const viewerUserId = await resolveViewerUserId(req)

    let rows
    if (showMutedOnly) {
      if (!viewerUserId) {
        rows = []
      } else {
        rows = await sql`
          SELECT p.id, p.map_x, p.map_y
          FROM posts p
          WHERE p.is_deleted = FALSE
            AND p.created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
            AND p.user_id IN (
              SELECT muted_user_id
              FROM user_mutes
              WHERE muter_user_id = ${viewerUserId}::int
            )
          ORDER BY p.created_at DESC
        `
      }
    } else {
      rows = await sql`
        SELECT p.id, p.map_x, p.map_y
        FROM posts p
        WHERE p.is_deleted = FALSE
          AND p.created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
          AND (${!shouldFilterCategory} OR p.category = ${rawCategory})
          AND (
            ${viewerUserId}::int IS NULL
            OR p.user_id NOT IN (
              SELECT muted_user_id
              FROM user_mutes
              WHERE muter_user_id = ${viewerUserId}::int
            )
          )
        ORDER BY p.created_at DESC
      `
    }
    res.json({ success: true, posts: rows })
  } catch (err) {
    console.error('GET /api/posts/map error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/posts/muted — active posts from muted users for the authed user
app.get('/api/posts/muted', requireFirebaseAuth, async (req, res) => {
  try {
    const viewerUserId = await resolveUserId(req.firebase.uid)
    if (!viewerUserId) return res.json({ success: true, posts: [] })

    const rows = await sql`
      SELECT p.id, p.map_x, p.map_y
      FROM posts p
      WHERE p.is_deleted = FALSE
        AND p.created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
        AND p.user_id IN (
          SELECT muted_user_id
          FROM user_mutes
          WHERE muter_user_id = ${viewerUserId}
        )
      ORDER BY p.created_at DESC
    `

    res.json({ success: true, posts: rows })
  } catch (err) {
    console.error('GET /api/posts/muted error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/posts/feed — public feed of all posts with user info and like data
app.get('/api/posts/feed', async (req, res) => {
  try {
    const viewerUserId = await resolveViewerUserId(req)

    const hasAnonymousColumn = await ensurePostsAnonymousColumnKnown()
    const rows = hasAnonymousColumn
      ? await sql`
          SELECT
            p.id,
            p.image_url,
            p.overlay_text,
            p.created_at,
            COALESCE(l.like_count, 0)::int AS like_count,
            CASE WHEN ${viewerUserId}::int IS NOT NULL AND ul.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS liked,
            CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.name END AS username,
            CASE WHEN p.is_anonymous THEN NULL ELSE u.avatar_url END AS user_avatar_url,
            CASE WHEN p.is_anonymous THEN NULL ELSE u.firebase_uid END AS owner_firebase_uid,
            p.is_anonymous
          FROM posts p
          LEFT JOIN users u ON u.user_id = p.user_id
          LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS like_count
            FROM post_likes
            GROUP BY post_id
          ) l ON l.post_id = p.id
          LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = ${viewerUserId}::int
          WHERE p.is_deleted = FALSE
            AND (
              ${viewerUserId}::int IS NULL
              OR p.user_id NOT IN (
                SELECT muted_user_id
                FROM user_mutes
                WHERE muter_user_id = ${viewerUserId}::int
              )
            )
          ORDER BY p.created_at DESC
        `
      : await sql`
          SELECT
            p.id,
            p.image_url,
            p.overlay_text,
            p.created_at,
            COALESCE(l.like_count, 0)::int AS like_count,
            CASE WHEN ${viewerUserId}::int IS NOT NULL AND ul.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS liked,
            u.name AS username,
            u.avatar_url AS user_avatar_url,
            u.firebase_uid AS owner_firebase_uid,
            FALSE AS is_anonymous
          FROM posts p
          LEFT JOIN users u ON u.user_id = p.user_id
          LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS like_count
            FROM post_likes
            GROUP BY post_id
          ) l ON l.post_id = p.id
          LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = ${viewerUserId}::int
          WHERE p.is_deleted = FALSE
            AND (
              ${viewerUserId}::int IS NULL
              OR p.user_id NOT IN (
                SELECT muted_user_id
                FROM user_mutes
                WHERE muter_user_id = ${viewerUserId}::int
              )
            )
          ORDER BY p.created_at DESC
        `

    res.json({ success: true, posts: rows })
  } catch (err) {
    console.error('GET /api/posts/feed error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/posts/user/:userId — fetch all posts by a user with like data
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (!Number.isFinite(userId)) return res.status(400).json({ success: false, error: 'Invalid user id' })

    const viewerUserId = await resolveViewerUserId(req)

    const hasAnonymousColumn = await ensurePostsAnonymousColumnKnown()
    const rows = hasAnonymousColumn
      ? await sql`
          SELECT
            p.id,
            p.image_url,
            p.overlay_text,
            p.is_anonymous,
            p.created_at,
            COALESCE(l.like_count, 0)::int AS like_count,
            CASE WHEN ${viewerUserId}::int IS NOT NULL AND ul.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS liked
          FROM posts p
          LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS like_count
            FROM post_likes
            GROUP BY post_id
          ) l ON l.post_id = p.id
          LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = ${viewerUserId}::int
          WHERE p.user_id = ${userId}
            AND p.is_deleted = FALSE
            AND (
              ${viewerUserId}::int IS NULL
              OR p.user_id NOT IN (
                SELECT muted_user_id
                FROM user_mutes
                WHERE muter_user_id = ${viewerUserId}::int
              )
            )
          ORDER BY p.created_at DESC
        `
      : await sql`
          SELECT
            p.id,
            p.image_url,
            p.overlay_text,
            FALSE AS is_anonymous,
            p.created_at,
            COALESCE(l.like_count, 0)::int AS like_count,
            CASE WHEN ${viewerUserId}::int IS NOT NULL AND ul.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS liked
          FROM posts p
          LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS like_count
            FROM post_likes
            GROUP BY post_id
          ) l ON l.post_id = p.id
          LEFT JOIN post_likes ul ON ul.post_id = p.id AND ul.user_id = ${viewerUserId}::int
          WHERE p.user_id = ${userId}
            AND p.is_deleted = FALSE
            AND (
              ${viewerUserId}::int IS NULL
              OR p.user_id NOT IN (
                SELECT muted_user_id
                FROM user_mutes
                WHERE muter_user_id = ${viewerUserId}::int
              )
            )
          ORDER BY p.created_at DESC
        `

    res.json({ success: true, posts: rows })
  } catch (err) {
    console.error('GET /api/posts/user/:userId error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/posts/detail?ids=1,2,3 — posts for a tapped cluster, newest first
app.get('/api/posts/detail', async (req, res) => {
  try {
    const raw = String(req.query.ids || '')
    const ids = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (!ids.length) return res.status(400).json({ success: false, error: 'ids are required' })

    const viewerUserId = await resolveViewerUserId(req)
    const includeMuted = String(req.query.includeMuted || '0') === '1'
    const hasAnonymousColumn = await ensurePostsAnonymousColumnKnown()
    const rows = hasAnonymousColumn
      ? await sql`
          SELECT
            p.id,
            p.image_url,
            p.overlay_text,
            p.category,
            p.is_anonymous,
            p.map_x,
            p.map_y,
            p.created_at,
            p.created_at + ${POST_TTL_INTERVAL}::interval AS expires_at,
            COALESCE(l.like_count, 0)::int AS like_count,
            CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.name END AS username,
            CASE WHEN p.is_anonymous THEN NULL ELSE u.firebase_uid END AS owner_firebase_uid
          FROM posts p
          LEFT JOIN users u ON u.user_id = p.user_id
          LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS like_count
            FROM post_likes
            GROUP BY post_id
          ) l ON l.post_id = p.id
          WHERE p.id = ANY(${ids})
            AND p.is_deleted = FALSE
            AND p.created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
            AND (
              ${viewerUserId}::int IS NULL
              OR (
                ${includeMuted}
                AND p.user_id IN (
                  SELECT muted_user_id
                  FROM user_mutes
                  WHERE muter_user_id = ${viewerUserId}::int
                )
              )
              OR (
                ${!includeMuted}
                AND p.user_id NOT IN (
                  SELECT muted_user_id
                  FROM user_mutes
                  WHERE muter_user_id = ${viewerUserId}::int
                )
              )
            )
          ORDER BY p.created_at DESC
        `
      : await sql`
          SELECT
            p.id,
            p.image_url,
            p.overlay_text,
            p.category,
            FALSE AS is_anonymous,
            p.map_x,
            p.map_y,
            p.created_at,
            p.created_at + ${POST_TTL_INTERVAL}::interval AS expires_at,
            COALESCE(l.like_count, 0)::int AS like_count,
            u.name AS username,
            u.firebase_uid AS owner_firebase_uid
          FROM posts p
          LEFT JOIN users u ON u.user_id = p.user_id
          LEFT JOIN (
            SELECT post_id, COUNT(*)::int AS like_count
            FROM post_likes
            GROUP BY post_id
          ) l ON l.post_id = p.id
          WHERE p.id = ANY(${ids})
            AND p.is_deleted = FALSE
            AND p.created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
            AND (
              ${viewerUserId}::int IS NULL
              OR (
                ${includeMuted}
                AND p.user_id IN (
                  SELECT muted_user_id
                  FROM user_mutes
                  WHERE muter_user_id = ${viewerUserId}::int
                )
              )
              OR (
                ${!includeMuted}
                AND p.user_id NOT IN (
                  SELECT muted_user_id
                  FROM user_mutes
                  WHERE muter_user_id = ${viewerUserId}::int
                )
              )
            )
          ORDER BY p.created_at DESC
        `
    res.json({ success: true, posts: rows })
  } catch (err) {
    console.error('GET /api/posts/detail error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE /api/posts/:id — owner-only soft delete
app.delete('/api/posts/:id', requireFirebaseAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10)
    if (!Number.isFinite(postId)) return res.status(400).json({ success: false, error: 'Invalid post id' })

    const userId = await resolveUserId(req.firebase.uid)
    if (!userId) return res.status(404).json({ success: false, error: 'User not found' })

    const result = await sql`
      UPDATE posts
      SET is_deleted = TRUE
      WHERE id = ${postId} AND user_id = ${userId} AND is_deleted = FALSE
      RETURNING id
    `
    if (!result.length) return res.status(404).json({ success: false, error: 'Post not found or not yours' })

    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/posts/:id error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/posts/:id/like — toggle like (insert or delete)
app.post('/api/posts/:id/like', requireFirebaseAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10)
    if (!Number.isFinite(postId)) return res.status(400).json({ success: false, error: 'Invalid post id' })

    const userId = await resolveUserId(req.firebase.uid)
    if (!userId) return res.status(404).json({ success: false, error: 'User not found' })

    // Check if post exists and is active
    const postRows = await sql`
      SELECT id, user_id
      FROM posts
      WHERE id = ${postId}
        AND is_deleted = FALSE
        AND created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
    `
    if (!postRows.length) return res.status(404).json({ success: false, error: 'Post not found' })

    const postOwnerId = postRows[0].user_id

    // Check for existing like
    const existing = await sql`
      SELECT id FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}
    `

    let liked
    if (existing.length) {
      await sql`DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}`
      liked = false
    } else {
      await sql`INSERT INTO post_likes (post_id, user_id) VALUES (${postId}, ${userId})`
      liked = true

      // Create notification for post owner (if not liking own post)
      if (userId !== postOwnerId) {
        const likerInfo = await sql`
          SELECT name, avatar_url FROM users WHERE user_id = ${userId}
        `
        if (likerInfo.length > 0) {
          await createNotification(postOwnerId, NOTIFICATION_TYPES.POST_LIKED, {
            post_id: postId,
            liker_user_id: userId,
            liker_name: likerInfo[0].name || 'Someone',
            liker_avatar_url: likerInfo[0].avatar_url || null
          })
        }
      }
    }

    // Get updated like count
    const countRows = await sql`
      SELECT COUNT(*)::int AS like_count
      FROM post_likes
      WHERE post_id = ${postId}
    `
    const likeCount = countRows[0]?.like_count ?? 0

    res.json({ success: true, liked, likeCount })
  } catch (err) {
    console.error('POST /api/posts/:id/like error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/posts/:id/report — file a report
app.post('/api/posts/:id/report', requireFirebaseAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10)
    if (!Number.isFinite(postId)) return res.status(400).json({ success: false, error: 'Invalid post id' })

    const userId = await resolveUserId(req.firebase.uid)
    if (!userId) return res.status(404).json({ success: false, error: 'User not found' })

    const { reason, details } = req.body
    const allowedReasons = ['spam', 'offensive', 'other']
    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({ success: false, error: `reason must be one of: ${allowedReasons.join(', ')}` })
    }
    if (reason === 'other' && (!details || !String(details).trim())) {
      return res.status(400).json({ success: false, error: 'details are required for reason=other' })
    }

    // Check for post existence
    const postRows = await sql`
      SELECT id
      FROM posts
      WHERE id = ${postId}
        AND is_deleted = FALSE
        AND created_at >= NOW() - ${POST_TTL_INTERVAL}::interval
    `
    if (!postRows.length) return res.status(404).json({ success: false, error: 'Post not found' })

    await sql`
      INSERT INTO post_reports (post_id, user_id, reason, details)
      VALUES (${postId}, ${userId}, ${reason}, ${details ? String(details).trim() : null})
    `

    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/posts/:id/report error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// -------------------- END POSTS --------------------

app.get('/api/debug/db-status', async (req, res) => {
  try {
    const dbSummary = getDatabaseUrlSummary()
    const currentDb = await sql`SELECT current_database() AS current_database`
    const hasAnonymousColumn = await ensurePostsAnonymousColumnKnown()
    res.json({
      success: true,
      database_url: dbSummary,
      current_database: currentDb?.[0]?.current_database ?? null,
      posts_has_is_anonymous: hasAnonymousColumn,
    })
  } catch (err) {
    console.error('GET /api/debug/db-status error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})


cleanupExpiredPosts().catch((error) => {
  console.error('Initial expired-post cleanup failed:', error)
})

setInterval(() => {
  cleanupExpiredPosts().catch((error) => {
    console.error('Scheduled expired-post cleanup failed:', error)
  })
}, EXPIRED_POST_CLEANUP_INTERVAL_MS)

app.listen(3000, async () => {
  console.log('Server running on http://localhost:3000')
  try {
    const dbSummary = getDatabaseUrlSummary()
    const currentDb = await sql`SELECT current_database() AS current_database`
    const hasAnonymousColumn = await ensurePostsAnonymousColumnKnown()
    console.log('DB status:', {
      host: dbSummary.host || null,
      databaseFromUrl: dbSummary.database || null,
      currentDatabase: currentDb?.[0]?.current_database ?? null,
      postsHasIsAnonymous: hasAnonymousColumn,
    })
  } catch (error) {
    console.error('DB status check failed on startup:', error)
  }
})
