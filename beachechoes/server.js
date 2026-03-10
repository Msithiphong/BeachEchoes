import express from 'express'
import { neon } from '@neondatabase/serverless'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { createRequire } from 'module'

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

    // Echoes = total messages by this user
    const echoesResult = await sql`
      SELECT COUNT(*)::int AS count FROM messages WHERE user_id = ${neonId}
    `

    // Following = accepted requests this user sent (user_id = me)
    const followingResult = await sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE user_id = ${neonId} AND status = 'accepted'
    `

    // Followers = accepted requests sent TO this user (friend_id = me)
    const followersResult = await sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE friend_id = ${neonId} AND status = 'accepted'
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
      SET name = ${name}, bio = ${bio}, avatar_url = ${avatarUrl || null}
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

// GET friendship status between the authed user and another user
app.get('/api/friendships/status/:friendUid', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(req.params.friendUid)

    if (!myId || !friendId) {
      return res.json({ success: true, status: null })
    }

    // Check both directions (I sent, or they sent)
    const rows = await sql`
      SELECT user_id, friend_id, status
      FROM friendships
      WHERE (user_id = ${myId} AND friend_id = ${friendId})
         OR (user_id = ${friendId} AND friend_id = ${myId})
      LIMIT 1
    `

    if (!rows.length) {
      return res.json({ success: true, status: null })
    }

    const row = rows[0]
    // Determine who initiated: if I sent it, direction = 'outgoing'
    const direction = row.user_id === myId ? 'outgoing' : 'incoming'

    res.json({ success: true, status: row.status, direction })
  } catch (error) {
    console.error('Friendship status error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST follow (send a friend/follow request)
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

    // Insert pending friendship (ignore if already exists)
    await sql`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES (${myId}, ${friendId}, 'pending')
      ON CONFLICT (user_id, friend_id) DO NOTHING
    `

    res.json({ success: true, status: 'pending' })
  } catch (error) {
    console.error('Follow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE unfollow (remove the friendship row)
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

    // Remove friendship in both directions
    await sql`
      DELETE FROM friendships
      WHERE (user_id = ${myId} AND friend_id = ${friendId})
         OR (user_id = ${friendId} AND friend_id = ${myId})
    `

    res.json({ success: true })
  } catch (error) {
    console.error('Unfollow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT accept a pending incoming request
app.put('/api/friendships/accept', requireFirebaseAuth, async (req, res) => {
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

    // Only accept requests that were sent TO me (friend_id = myId)
    const result = await sql`
      UPDATE friendships
      SET status = 'accepted'
      WHERE user_id = ${friendId} AND friend_id = ${myId} AND status = 'pending'
      RETURNING *
    `

    if (!result.length) {
      return res.status(404).json({ success: false, error: 'No pending request found' })
    }

    res.json({ success: true, status: 'accepted' })
  } catch (error) {
    console.error('Accept friendship error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ------------------ END FRIENDSHIPS ------------------

// -------------------- FOLLOWERS / FOLLOWING LISTS --------------------

// GET /api/friendships/following/:firebaseUid  — users this person follows
app.get('/api/friendships/following/:firebaseUid', async (req, res) => {
  try {
    const uid = req.params.firebaseUid
    const meId = await resolveUserId(uid)
    if (!meId) return res.json({ success: true, users: [] })

    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u ON u.user_id = f.friend_id
      WHERE f.user_id = ${meId} AND f.status = 'accepted'
      ORDER BY u.name ASC
    `
    res.json({ success: true, users: rows })
  } catch (err) {
    console.error('Following list error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/friendships/followers/:firebaseUid  — users who follow this person
app.get('/api/friendships/followers/:firebaseUid', async (req, res) => {
  try {
    const uid = req.params.firebaseUid
    const meId = await resolveUserId(uid)
    if (!meId) return res.json({ success: true, users: [] })

    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u ON u.user_id = f.user_id
      WHERE f.friend_id = ${meId} AND f.status = 'accepted'
      ORDER BY u.name ASC
    `
    res.json({ success: true, users: rows })
  } catch (err) {
    console.error('Followers list error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// -------------------- LEADERBOARD (MESSAGES + UPVOTES ONLY) --------------------

const ALLOWED_PERIODS = { day: "1 day", week: "7 days", month: "30 days", all: null };
const ALLOWED_VIEWS = new Set(["users", "messages"]);

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
// Top Users = SUM of upvotes across their messages
async function queryUserLeaderboard({ period, limit }) {
  const params = [];
  let paramIndex = 1;

  // IMPORTANT: for LEFT JOIN, put time filter in JOIN condition
  const pf = buildPeriodFilter(period, "m.created_at", paramIndex);
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

      COALESCE(SUM(COALESCE(m.upvote, 0)), 0)::int AS total_upvotes,

      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(SUM(COALESCE(m.upvote, 0)), 0) DESC,
          u.user_id ASC
      ) AS rank

    FROM users u
    LEFT JOIN messages m
      ON m.user_id = u.user_id
      ${joinPeriodSql}

    GROUP BY u.user_id, u.name, u.bio, u.avatar_url
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

// -------------------- MESSAGES LEADERBOARD --------------------
// Top Messages = messages ordered by upvotes, tie-break by message id
async function queryMessageLeaderboard({ period, limit }) {
  const params = [];
  let paramIndex = 1;

  // For messages view, WHERE filter is correct (no LEFT JOIN needed)
  const pf = buildPeriodFilter(period, "m.created_at", paramIndex);
  params.push(...pf.params);
  paramIndex = pf.nextIndex;

  params.push(limit);
  const limitParam = paramIndex;

  const whereSql = pf.sql ? `WHERE ${pf.sql}` : "";

  const q = `
    SELECT
      m.id,
      m.message,
      m.created_at,
      COALESCE(m.upvote, 0)::int AS upvotes,

      u.user_id AS author_user_id,
      u.name AS author_name,
      u.bio AS author_bio,
      u.avatar_url AS author_avatar_url,

      ROW_NUMBER() OVER (
        ORDER BY
          COALESCE(m.upvote, 0) DESC,
          m.id ASC
      ) AS rank

    FROM messages m
    JOIN users u
      ON u.user_id = m.user_id
    ${whereSql}
    ORDER BY rank
    LIMIT $${limitParam};
  `;

  const rows = await sql.query(q, params);

  return rows.map((r) => ({
    rank: Number(r.rank),
    id: Number(r.id),
    message: r.message,
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

// GET /api/leaderboard?view=users|messages&period=day|week|month|all&limit=20
app.get("/api/leaderboard", async (req, res) => {
  try {
    const view = normView(req.query.view);
    const period = normPeriod(req.query.period);
    const limit = clampLimit(req.query.limit);

    const data =
      view === "users"
        ? await queryUserLeaderboard({ period, limit })
        : await queryMessageLeaderboard({ period, limit });

    res.json({ success: true, view, period, limit, data });
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ------------------ END LEADERBOARD ------------------

//app.listen(3000, '0.0.0.0', () => {
//  console.log("Server running on http://0.0.0.0:3000");
//});

app.listen(3000, () => console.log('Server running on http://localhost:3000'))