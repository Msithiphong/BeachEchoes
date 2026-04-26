import express from 'express'
import { neon } from '@neondatabase/serverless'
import cors from 'cors'
import dotenv from 'dotenv'
<<<<<<< Updated upstream
=======
import admin from 'firebase-admin'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const leoProfanity = require('leo-profanity')
>>>>>>> Stashed changes

dotenv.config()

const app = express()
app.use(cors())
<<<<<<< Updated upstream
app.use(express.json())

const sql = neon(process.env.DATABASE_URL)

<<<<<<< Updated upstream
app.post('/api/login', async (req, res) => {
=======
// Init Firebase Admin & Bucket
=======
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

const sql = neon(process.env.DATABASE_URL)

>>>>>>> Stashed changes
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const bucket = admin.storage().bucket()

<<<<<<< Updated upstream
// -------------------- MESSAGE MODERATION --------------------

// Add any extra custom blocked words here.
=======
// -------------------- BAD WORD MODERATION --------------------

const leoProfanity = require('leo-profanity')

>>>>>>> Stashed changes
const CUSTOM_BLOCKED_WORDS = [
  'hell',
  'exampleword'
]

<<<<<<< Updated upstream
// Add custom blocked words into leo-profanity's internal dictionary.
=======
>>>>>>> Stashed changes
leoProfanity.add(CUSTOM_BLOCKED_WORDS)

function sanitizeMessage(text) {
  let cleaned = leoProfanity.clean(text)
<<<<<<< Updated upstream

  cleaned = cleaned.replace(/\*+/g, '******')

  return cleaned
}

// ------------------ END MESSAGE MODERATION ------------------

// Auth middleware helpers
=======
  cleaned = cleaned.replace(/\*+/g, '******')
  return cleaned
}

// ------------------ END BAD WORD MODERATION ------------------

>>>>>>> Stashed changes
function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}

async function requireFirebaseAuth(req, res, next) {
>>>>>>> Stashed changes
  try {
    const { email, password } = req.body
    const users = await sql`SELECT user_id AS id, name, email, password_hash, created_at FROM users WHERE email = ${email}`
    
    if (users.length && users[0].password_hash === password) {
      const { password_hash, ...userWithoutPassword } = users[0]
      res.json({ success: true, user: userWithoutPassword })
    } else {
      res.json({ success: false, error: 'Invalid credentials' })
    }
<<<<<<< Updated upstream
=======

    const decoded = await admin.auth().verifyIdToken(token)
    req.firebase = decoded
    next()
>>>>>>> Stashed changes
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

<<<<<<< Updated upstream
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
=======
app.post('/api/users/sync', requireFirebaseAuth, async (req, res) => {
  try {
    const { uid, email, name } = req.firebase
    const { display_name } = req.body

>>>>>>> Stashed changes
    const result = await sql`
      INSERT INTO users (name, email, password_hash, created_at)
      VALUES (${name}, ${email}, ${password}, NOW())
      RETURNING user_id AS id, name, email, created_at
    `
    res.json({ success: true, user: result[0] })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

<<<<<<< Updated upstream
app.post('/api/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body
    const result = await sql `
      SELECT * FROM users WHERE email = ${email} 
=======
app.get('/api/users/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()

    if (!q) {
      return res.json({ success: true, users: [] })
    }

    const pattern = `${q}%`
    const result = await sql`
      SELECT firebase_uid, name, avatar_url
      FROM users
      WHERE name ILIKE ${pattern}
      ORDER BY name
      LIMIT 10
>>>>>>> Stashed changes
    `
    
    if (result.length > 0) {
      // User found - send success response
      // In production, you'd send and actual email here
      res.json({ success: true, message: 'Password reset instructions sent to email' })
    } else {
      res.json({ success: false, error: 'Email not found'})
    }
  } catch (error) {
    res.json({ success: false, error: error.message})
  }
})

app.post('/api/messages', async (req, res) => {
  try {
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.json({ success: false, error: 'Message is required' })
    }

    const cleanedMessage = sanitizeMessage(message.trim())

<<<<<<< Updated upstream
    console.log('Original:', message)
    console.log('Cleaned:', cleanedMessage)
    
    const result = await sql`
<<<<<<< Updated upstream
      INSERT INTO messages (message, created_at)
      VALUES (${message}, NOW())
      RETURNING id, message, created_at
=======
      INSERT INTO messages (user_id, message, created_at)
      VALUES (${userId}, ${cleanedMessage}, NOW())
      RETURNING id, user_id, message, created_at
>>>>>>> Stashed changes
=======
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

    const result = await sql`
      INSERT INTO messages (user_id, message, created_at, status)
      VALUES (${userId}, ${cleanedMessage}, NOW(), 'approved')
      RETURNING id, user_id, message, created_at, status
>>>>>>> Stashed changes
    `

    res.json({ success: true, message: result[0] })
  } catch (error) {
<<<<<<< Updated upstream
=======
    console.error('Message error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/messages/public', async (req, res) => {
  try {
    const result = await sql`
      SELECT
        m.id,
        m.user_id,
        m.message,
        m.created_at,
        COALESCE(m.status, 'approved') AS status,
        u.name,
        u.avatar_url,
        COUNT(r.id)::int AS flag_count
      FROM messages m
      LEFT JOIN users u ON u.user_id = m.user_id
      LEFT JOIN message_reports r ON r.message_id = m.id
      WHERE COALESCE(m.status, 'approved') != 'removed'
      GROUP BY m.id, m.user_id, m.message, m.created_at, m.status, u.name, u.avatar_url
      ORDER BY m.created_at DESC
    `

    res.json({ success: true, messages: result })
  } catch (error) {
    console.error('GET /api/messages/public error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

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

app.post('/api/profile/:userId/avatar', requireFirebaseAuth, async (req, res) => {
  try {
    const routeUid = req.params.userId
    const authedUid = req.firebase?.uid

    if (!authedUid || authedUid !== routeUid) {
      return res.status(403).json({ success: false, error: 'Forbidden' })
    }

    const { imageBase64, contentType = 'image/jpeg' } = req.body

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Image data is required' })
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const fileName = `avatars/${authedUid}_${Date.now()}.jpg`
    const file = bucket.file(fileName)

    await file.save(imageBuffer, {
      metadata: { contentType },
      public: true,
    })

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`

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

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params

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

    const echoesResult = await sql`
      SELECT COUNT(*)::int AS count FROM messages WHERE user_id = ${neonId}
    `

    const followingResult = await sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE user_id = ${neonId} AND status = 'accepted'
    `

    const followersResult = await sql`
      SELECT COUNT(*)::int AS count FROM friendships
      WHERE friend_id = ${neonId} AND status = 'accepted'
    `

    profile.echoes_count = echoesResult[0]?.count ?? 0
    profile.following_count = followingResult[0]?.count ?? 0
    profile.followers_count = followersResult[0]?.count ?? 0

    res.json({ success: true, profile })
  } catch (error) {
>>>>>>> Stashed changes
    res.json({ success: false, error: error.message })
  }
})

<<<<<<< Updated upstream
// -------------------- LEADERBOARD (INLINE IN server.js) --------------------
=======
app.put('/api/profile/:userId', requireFirebaseAuth, async (req, res) => {
  try {
    const routeUid = req.params.userId
    const authedUid = req.firebase?.uid

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

async function resolveUserId(firebaseUid) {
  const rows = await sql`SELECT user_id FROM users WHERE firebase_uid = ${firebaseUid}`
  return rows.length ? rows[0].user_id : null
}

app.get('/api/friendships/status/:friendUid', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(req.params.friendUid)

    if (!myId || !friendId) {
      return res.json({ success: true, status: null })
    }

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
    const direction = row.user_id === myId ? 'outgoing' : 'incoming'

    res.json({ success: true, status: row.status, direction })
  } catch (error) {
    console.error('Friendship status error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

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

app.get('/api/friendships/pending', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    if (!myId) return res.json({ success: true, requests: [] })

    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u ON u.user_id = f.user_id
      WHERE f.friend_id = ${myId} AND f.status = 'pending'
    `

    res.json({ success: true, requests: rows })
  } catch (err) {
    console.error('Pending requests error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

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
>>>>>>> Stashed changes

const ALLOWED_PERIODS = { day: "1 day", week: "7 days", month: "30 days", all: null };
const ALLOWED_VIEWS = new Set(["users", "echoes"]);
const ALLOWED_CATEGORIES = new Set(["all", "general", "helpful", "funny", "academic"]);

function normPeriod(p) {
  const v = String(p ?? "week").toLowerCase();
  return Object.prototype.hasOwnProperty.call(ALLOWED_PERIODS, v) ? v : "week";
}

function normView(v) {
  const s = String(v ?? "users").toLowerCase();
  return ALLOWED_VIEWS.has(s) ? s : "users";
}
<<<<<<< Updated upstream
function normCategory(c) {
  const s = String(c ?? "all").toLowerCase();
  return ALLOWED_CATEGORIES.has(s) ? s : "all";
}
=======

>>>>>>> Stashed changes
function clampLimit(n) {
  const x = Number.parseInt(n ?? "20", 10);
  return Number.isFinite(x) ? Math.max(1, Math.min(x, 100)) : 20;
}

<<<<<<< Updated upstream
function addCategory(whereParts, params, category) {
  if (category === "all") return;
  params.push(category);
  whereParts.push(`AND e.category = $${params.length}`);
}
function addPeriod(whereParts, params, col, period) {
  const interval = ALLOWED_PERIODS[period];
  if (!interval) return; // "all"
  params.push(interval);
  whereParts.push(`AND ${col} >= NOW() - $${params.length}::interval`);
}

async function queryUserLeaderboard({ period, category, limit }) {
=======
function buildPeriodFilter(period, col, startIndex = 1) {
  const interval = ALLOWED_PERIODS[period];
  if (!interval) {
    return { sql: "", params: [], nextIndex: startIndex };
  }

  return {
    sql: `${col} >= NOW() - $${startIndex}::interval`,
    params: [interval],
    nextIndex: startIndex + 1,
  };
}

async function queryUserLeaderboard({ period, limit }) {
>>>>>>> Stashed changes
  const params = [];
  const whereParts = ["WHERE 1=1"];
  addCategory(whereParts, params, category);
  addPeriod(whereParts, params, "r.created_at", period);

<<<<<<< Updated upstream
=======
  const pf = buildPeriodFilter(period, "m.created_at", paramIndex);
  params.push(...pf.params);
  paramIndex = pf.nextIndex;

>>>>>>> Stashed changes
  params.push(limit);

  const q = `
    SELECT
<<<<<<< Updated upstream
      u.email,
      COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) AS score,
      RANK() OVER (
=======
      u.user_id AS user_id,
      u.name,
      u.bio,
      u.avatar_url,
      COALESCE(SUM(COALESCE(m.upvote, 0)), 0)::int AS total_upvotes,
      ROW_NUMBER() OVER (
>>>>>>> Stashed changes
        ORDER BY
          COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) DESC,
          u.user_id ASC
      ) AS rank
    FROM users u
<<<<<<< Updated upstream
    LEFT JOIN echoes e ON e.author_user_id = u.user_id
    LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
    ${whereParts.join("\n")}
    GROUP BY u.user_id, u.email
=======
    LEFT JOIN messages m
      ON m.user_id = u.user_id
      ${joinPeriodSql}
    GROUP BY u.user_id, u.name, u.bio, u.avatar_url
>>>>>>> Stashed changes
    ORDER BY rank
    LIMIT $${params.length};
  `;

  const rows = await sql.query(q, params);
  return rows.map((r) => ({ rank: +r.rank, email: r.email, score: +r.score }));
}

<<<<<<< Updated upstream
async function queryEchoLeaderboard({ period, category, limit }) {
  const params = [];
  const whereParts = ["WHERE 1=1"];
  addCategory(whereParts, params, category);
  addPeriod(whereParts, params, "r.created_at", period);
=======
async function queryMessageLeaderboard({ period, limit }) {
  const params = [];
  let paramIndex = 1;

  const pf = buildPeriodFilter(period, "m.created_at", paramIndex);
  params.push(...pf.params);
  paramIndex = pf.nextIndex;
>>>>>>> Stashed changes

  params.push(limit);

  const q = `
    SELECT
<<<<<<< Updated upstream
      e.echo_id,
      u.email AS author_email,
      e.category,
      LEFT(e.content, 120) AS preview,
      COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 1 ELSE 0 END), 0) AS appraises,
      RANK() OVER (
=======
      m.id,
      m.message,
      m.created_at,
      COALESCE(m.upvote, 0)::int AS upvotes,
      u.user_id AS author_user_id,
      u.name AS author_name,
      u.bio AS author_bio,
      u.avatar_url AS author_avatar_url,
      ROW_NUMBER() OVER (
>>>>>>> Stashed changes
        ORDER BY
          COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 1 ELSE 0 END), 0) DESC,
          e.echo_id ASC
      ) AS rank
<<<<<<< Updated upstream
    FROM echoes e
    JOIN users u ON u.user_id = e.author_user_id
    LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
    ${whereParts.join("\n")}
    GROUP BY e.echo_id, u.email, e.category, e.content
=======
    FROM messages m
    JOIN users u
      ON u.user_id = m.user_id
    ${whereSql}
>>>>>>> Stashed changes
    ORDER BY rank
    LIMIT $${params.length};
  `;

  const rows = await sql.query(q, params);
  return rows.map((r) => ({
    rank: +r.rank,
    echo_id: +r.echo_id,
    author: r.author_email,
    category: r.category,
    preview: r.preview,
    appraises: +r.appraises,
  }));
}

<<<<<<< Updated upstream
async function queryStats({ period, category }) {
  // Echoes
  {
    const params = [];
    const whereParts = ["WHERE 1=1"];
    addCategory(whereParts, params, category);
    addPeriod(whereParts, params, "e.created_at", period);
    const q = `SELECT COUNT(*)::int AS c FROM echoes e ${whereParts.join("\n")};`;
    var echoes = (await sql.query(q, params))[0]?.c ?? 0;
  }

  // Appraises
  {
    const params = [];
    const whereParts = ["WHERE r.reaction_type='appraise'"];
    addCategory(whereParts, params, category);
    addPeriod(whereParts, params, "r.created_at", period);
    const q = `
      SELECT COUNT(*)::int AS c
      FROM echo_reactions r
      JOIN echoes e ON e.echo_id = r.echo_id
      ${whereParts.join("\n")};
    `;
    var appraises = (await sql.query(q, params))[0]?.c ?? 0;
  }

  // Comments
  {
    const params = [];
    const whereParts = ["WHERE 1=1"];
    addCategory(whereParts, params, category);
    addPeriod(whereParts, params, "c.created_at", period);
    const q = `
      SELECT COUNT(*)::int AS c
      FROM echo_comments c
      JOIN echoes e ON e.echo_id = c.echo_id
      ${whereParts.join("\n")};
    `;
    var comments = (await sql.query(q, params))[0]?.c ?? 0;
  }

  return { period, category, echoes: +echoes, appraises: +appraises, comments: +comments };
}

// GET /api/leaderboard
=======
>>>>>>> Stashed changes
app.get("/api/leaderboard", async (req, res) => {
  try {
    const view = normView(req.query.view);
    const period = normPeriod(req.query.period);
    const category = normCategory(req.query.category);
    const limit = clampLimit(req.query.limit);

    const data =
      view === "users"
        ? await queryUserLeaderboard({ period, category, limit })
        : await queryEchoLeaderboard({ period, category, limit });

    res.json(data);
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

<<<<<<< Updated upstream
// GET /api/stats
app.get("/api/stats", async (req, res) => {
  try {
    const period = normPeriod(req.query.period);
    const category = normCategory(req.query.category);
    res.json(await queryStats({ period, category }));
  } catch (err) {
    console.error("GET /api/stats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ------------------ END LEADERBOARD ------------------

=======
// -------------------- MODERATION / REPORTS --------------------

const VALID_MODERATION_STATUSES = ['pending', 'flagged', 'removed', 'approved']

app.get('/api/moderation', async (req, res) => {
  try {
    const status = String(req.query.status || 'all').toLowerCase()
    const search = String(req.query.search || '').trim()

    const result = await sql`
      SELECT
        m.id,
        m.user_id,
        m.message,
        m.created_at,
        COALESCE(m.status, 'approved') AS status,
        u.name,
        u.avatar_url,
        COUNT(r.id)::int AS flag_count
      FROM messages m
      LEFT JOIN users u ON u.user_id = m.user_id
      LEFT JOIN message_reports r ON r.message_id = m.id
      WHERE
        (${status} = 'all' OR COALESCE(m.status, 'approved') = ${status})
        AND (${search} = '' OR u.name ILIKE ${'%' + search + '%'})
      GROUP BY m.id, m.user_id, m.message, m.created_at, m.status, u.name, u.avatar_url
      ORDER BY m.created_at DESC
    `

    res.json({ success: true, messages: result })
  } catch (error) {
    console.error('GET /api/moderation error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.patch('/api/moderation/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    const status = String(req.body.status || '').toLowerCase()

    if (!VALID_MODERATION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }

    const result = await sql`
      UPDATE messages
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, status
    `

    res.json({ success: true, message: result[0] })
  } catch (error) {
    console.error('PATCH /api/moderation/:id error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/messages/:id/report', requireFirebaseAuth, async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.id, 10)
    const reason = String(req.body.reason || '').trim()
    const details = String(req.body.details || '').trim()
    const firebaseUid = req.firebase.uid

    if (!Number.isInteger(messageId)) {
      return res.status(400).json({ success: false, error: 'Invalid message id' })
    }

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason is required' })
    }

    const messageResult = await sql`
      SELECT id, user_id
      FROM messages
      WHERE id = ${messageId}
    `

    if (!messageResult.length) {
      return res.status(404).json({ success: false, error: 'Message not found' })
    }

    const userResult = await sql`
      SELECT user_id
      FROM users
      WHERE firebase_uid = ${firebaseUid}
    `

    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please log out and log back in to sync your account.'
      })
    }

    const userId = userResult[0].user_id

    const report = await sql`
      INSERT INTO message_reports (message_id, user_id, reason, details, created_at)
      VALUES (${messageId}, ${userId}, ${reason}, ${details || null}, NOW())
      ON CONFLICT (message_id, user_id)
      DO UPDATE SET
        reason = EXCLUDED.reason,
        details = EXCLUDED.details,
        created_at = NOW()
      RETURNING *
    `

    const countResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM message_reports
      WHERE message_id = ${messageId}
    `

    const reportCount = countResult[0]?.count ?? 0
    const newStatus = reportCount >= 3 ? 'removed' : 'flagged'

    await sql`
      UPDATE messages
      SET status = ${newStatus}
      WHERE id = ${messageId}
    `

    res.json({
      success: true,
      report: report[0],
      report_count: reportCount,
      status: newStatus,
    })
  } catch (error) {
    console.error('POST /api/messages/:id/report error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/messages/:id/reports', async (req, res) => {
  try {
    const messageId = Number.parseInt(req.params.id, 10)

    const result = await sql`
      SELECT
        r.id,
        r.message_id,
        r.user_id,
        r.reason,
        r.details,
        r.created_at,
        u.name,
        u.avatar_url
      FROM message_reports r
      LEFT JOIN users u ON u.user_id = r.user_id
      WHERE r.message_id = ${messageId}
      ORDER BY r.created_at DESC
    `

    res.json({ success: true, reports: result })
  } catch (error) {
    console.error('GET /api/messages/:id/reports error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ------------------ END MODERATION / REPORTS ------------------
>>>>>>> Stashed changes

app.listen(3000, () => console.log('Server running on http://localhost:3000'))