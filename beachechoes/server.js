import express from 'express'
import { neon } from '@neondatabase/serverless'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { createRequire } from 'module'
import { VALID_CAMPUS_POLYGON } from './config/campusMap.js'
import {
  DEFAULT_POST_CATEGORY,
  isValidPostCategory,
} from './config/postCategories.js'

const require = createRequire(import.meta.url)

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

const sql = neon(process.env.DATABASE_URL)

const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
})

const bucket = admin.storage().bucket()

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}

async function requireFirebaseAuth(req, res, next) {
  try {
    const token = getBearerToken(req)

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Missing bearer token',
      })
    }

    const decoded = await admin.auth().verifyIdToken(token)
    req.firebase = decoded
    next()
  } catch (error) {
    console.error('Auth verification error:', error)

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    })
  }
}

async function resolveUserId(firebaseUid) {
  const rows = await sql`
    SELECT user_id
    FROM users
    WHERE firebase_uid = ${firebaseUid}
  `

  return rows.length ? rows[0].user_id : null
}

async function resolveViewerUserId(req) {
  const token = getBearerToken(req)

  if (!token) return null

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    return await resolveUserId(decoded.uid)
  } catch {
    return null
  }
}

function pointInPolygon(point, polygon = VALID_CAMPUS_POLYGON) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) {
    return false
  }

  const x = Number(point.x)
  const y = Number(point.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false
  }

  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersects) inside = !inside
  }

  return inside
}

function normalizeMapPoint(mapX, mapY) {
  const x = Number(mapX)
  const y = Number(mapY)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null
  }

  return { x, y }
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

async function uploadBase64Image(folder, uid, imageBase64, contentType = 'image/jpeg') {
  const imageBuffer = Buffer.from(imageBase64, 'base64')
  const extension = contentType.includes('png') ? 'png' : 'jpg'
  const fileName = `${folder}/${uid}_${Date.now()}.${extension}`
  const file = bucket.file(fileName)

  await file.save(imageBuffer, {
    metadata: {
      contentType,
    },
    public: true,
  })

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`
}

// -------------------- USERS --------------------

app.post('/api/users/sync', requireFirebaseAuth, async (req, res) => {
  try {
    const { uid, email, name } = req.firebase
    const { display_name } = req.body

    const result = await sql`
      INSERT INTO users (firebase_uid, email, name, created_at)
      VALUES (${uid}, ${email}, ${display_name || name || ''}, NOW())
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name
      RETURNING user_id, firebase_uid, email, name, avatar_url, profile_visibility
    `

    res.json({
      success: true,
      user: result[0],
    })
  } catch (error) {
    console.error('User sync error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/users/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()

    if (!q) {
      return res.json({
        success: true,
        users: [],
      })
    }

    const pattern = `${q}%`

    const result = await sql`
      SELECT firebase_uid, name, avatar_url
      FROM users
      WHERE name ILIKE ${pattern}
      ORDER BY name
      LIMIT 10
    `

    res.json({
      success: true,
      users: result,
    })
  } catch (error) {
    console.error('User search error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

// -------------------- POSTS --------------------

app.post('/api/posts', requireFirebaseAuth, async (req, res) => {
  try {
    const { uid } = req.firebase

    const {
      imageBase64,
      contentType = 'image/jpeg',
      overlayText = '',
      category = DEFAULT_POST_CATEGORY,
      isAnonymous = false,
      mapX,
      mapY,
      latitude,
      longitude,
      durationHours = 24,
    } = req.body

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required.',
      })
    }

    const point = normalizeMapPoint(mapX, mapY)

    if (!point) {
      return res.status(400).json({
        success: false,
        error: 'Valid map coordinates are required.',
      })
    }

    if (!pointInPolygon(point)) {
      return res.status(400).json({
        success: false,
        error: 'Post location must be inside the CSULB campus map.',
      })
    }

    const safeCategory = isValidPostCategory(category)
      ? category
      : DEFAULT_POST_CATEGORY

    const lat = normalizeCoordinate(latitude)
    const lng = normalizeCoordinate(longitude)

    if (
      (latitude !== null && latitude !== undefined && latitude !== '' && lat === null) ||
      (longitude !== null && longitude !== undefined && longitude !== '' && lng === null)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude.',
      })
    }

    const userResult = await sql`
      SELECT user_id
      FROM users
      WHERE firebase_uid = ${uid}
    `

    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please log out and log back in.',
      })
    }

    const userId = userResult[0].user_id

    const imageUrl = await uploadBase64Image(
      'posts',
      uid,
      imageBase64,
      contentType
    )

    const safeDurationHours = Math.max(
      1,
      Math.min(Number(durationHours) || 24, 168)
    )

    const result = await sql`
      INSERT INTO posts (
        user_id,
        image_url,
        overlay_text,
        category,
        is_anonymous,
        map_x,
        map_y,
        latitude,
        longitude,
        created_at,
        expires_at,
        is_deleted,
        moderation_status
      )
      VALUES (
        ${userId},
        ${imageUrl},
        ${overlayText},
        ${safeCategory},
        ${!!isAnonymous},
        ${point.x},
        ${point.y},
        ${lat},
        ${lng},
        NOW(),
        NOW() + (${safeDurationHours} || ' hours')::interval,
        FALSE,
        'approved'
      )
      RETURNING *
    `

    res.json({
      success: true,
      post: result[0],
    })
  } catch (error) {
    console.error('Create post error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/posts/map', async (req, res) => {
  try {
    const viewerUserId = await resolveViewerUserId(req)
    const category = req.query.category

    const hasCategory = category && category !== 'All'
    const safeCategory =
      hasCategory && isValidPostCategory(category) ? category : null

    const result = safeCategory
      ? await sql`
          SELECT
            p.id,
            p.user_id,
            p.image_url,
            p.overlay_text,
            p.category,
            p.is_anonymous,
            p.map_x,
            p.map_y,
            p.latitude,
            p.longitude,
            p.created_at,
            p.expires_at,
            COALESCE(p.like_count, 0)::int AS like_count,
            CASE
              WHEN p.is_anonymous THEN 'Anonymous'
              ELSE COALESCE(u.name, 'Unknown User')
            END AS author_name,
            CASE
              WHEN p.is_anonymous THEN NULL
              ELSE u.avatar_url
            END AS author_avatar_url
          FROM posts p
          JOIN users u
            ON u.user_id = p.user_id
          WHERE p.is_deleted = FALSE
            AND p.moderation_status = 'approved'
            AND p.map_x IS NOT NULL
            AND p.map_y IS NOT NULL
            AND p.category = ${safeCategory}
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
            AND (
              ${viewerUserId}::int IS NULL
              OR NOT EXISTS (
                SELECT 1
                FROM user_mutes um
                WHERE um.muter_user_id = ${viewerUserId}
                  AND um.muted_user_id = p.user_id
              )
            )
          ORDER BY p.created_at DESC
          LIMIT 200
        `
      : await sql`
          SELECT
            p.id,
            p.user_id,
            p.image_url,
            p.overlay_text,
            p.category,
            p.is_anonymous,
            p.map_x,
            p.map_y,
            p.latitude,
            p.longitude,
            p.created_at,
            p.expires_at,
            COALESCE(p.like_count, 0)::int AS like_count,
            CASE
              WHEN p.is_anonymous THEN 'Anonymous'
              ELSE COALESCE(u.name, 'Unknown User')
            END AS author_name,
            CASE
              WHEN p.is_anonymous THEN NULL
              ELSE u.avatar_url
            END AS author_avatar_url
          FROM posts p
          JOIN users u
            ON u.user_id = p.user_id
          WHERE p.is_deleted = FALSE
            AND p.moderation_status = 'approved'
            AND p.map_x IS NOT NULL
            AND p.map_y IS NOT NULL
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
            AND (
              ${viewerUserId}::int IS NULL
              OR NOT EXISTS (
                SELECT 1
                FROM user_mutes um
                WHERE um.muter_user_id = ${viewerUserId}
                  AND um.muted_user_id = p.user_id
              )
            )
          ORDER BY p.created_at DESC
          LIMIT 200
        `

    res.json({
      success: true,
      posts: result,
    })
  } catch (error) {
    console.error('Map posts error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/posts/muted', requireFirebaseAuth, async (req, res) => {
  try {
    const viewerUserId = await resolveUserId(req.firebase.uid)

    if (!viewerUserId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    const result = await sql`
      SELECT
        p.id,
        p.user_id,
        p.image_url,
        p.overlay_text,
        p.category,
        p.is_anonymous,
        p.map_x,
        p.map_y,
        p.latitude,
        p.longitude,
        p.created_at,
        p.expires_at,
        COALESCE(p.like_count, 0)::int AS like_count,
        COALESCE(u.name, 'Unknown User') AS author_name,
        u.avatar_url AS author_avatar_url
      FROM posts p
      JOIN users u
        ON u.user_id = p.user_id
      JOIN user_mutes um
        ON um.muted_user_id = p.user_id
      WHERE um.muter_user_id = ${viewerUserId}
        AND p.is_deleted = FALSE
        AND p.moderation_status = 'approved'
        AND p.map_x IS NOT NULL
        AND p.map_y IS NOT NULL
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
      ORDER BY p.created_at DESC
      LIMIT 200
    `

    res.json({
      success: true,
      posts: result,
    })
  } catch (error) {
    console.error('Muted posts error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/posts/:id', async (req, res) => {
  try {
    const postId = Number(req.params.id)

    if (!Number.isFinite(postId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post id',
      })
    }

    const result = await sql`
      SELECT
        p.id,
        p.user_id,
        p.image_url,
        p.overlay_text,
        p.category,
        p.is_anonymous,
        p.map_x,
        p.map_y,
        p.latitude,
        p.longitude,
        p.created_at,
        p.expires_at,
        COALESCE(p.like_count, 0)::int AS like_count,
        CASE
          WHEN p.is_anonymous THEN 'Anonymous'
          ELSE COALESCE(u.name, 'Unknown User')
        END AS author_name,
        CASE
          WHEN p.is_anonymous THEN NULL
          ELSE u.avatar_url
        END AS author_avatar_url,
        CASE
          WHEN p.is_anonymous THEN NULL
          ELSE u.firebase_uid
        END AS author_firebase_uid
      FROM posts p
      JOIN users u
        ON u.user_id = p.user_id
      WHERE p.id = ${postId}
        AND p.is_deleted = FALSE
      LIMIT 1
    `

    if (!result.length) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      })
    }

    res.json({
      success: true,
      post: result[0],
    })
  } catch (error) {
    console.error('Get post error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.post('/api/posts/:id/like', requireFirebaseAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id)
    const userId = await resolveUserId(req.firebase.uid)

    if (!Number.isFinite(postId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post id',
      })
    }

    if (!userId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    await sql`
      INSERT INTO post_likes (post_id, user_id, created_at)
      VALUES (${postId}, ${userId}, NOW())
      ON CONFLICT (post_id, user_id) DO NOTHING
    `

    const result = await sql`
      UPDATE posts
      SET like_count = (
        SELECT COUNT(*)::int
        FROM post_likes
        WHERE post_id = ${postId}
      )
      WHERE id = ${postId}
      RETURNING COALESCE(like_count, 0)::int AS like_count
    `

    res.json({
      success: true,
      like_count: result[0]?.like_count ?? 0,
    })
  } catch (error) {
    console.error('Like post error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.delete('/api/posts/:id/like', requireFirebaseAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id)
    const userId = await resolveUserId(req.firebase.uid)

    if (!Number.isFinite(postId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post id',
      })
    }

    if (!userId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    await sql`
      DELETE FROM post_likes
      WHERE post_id = ${postId}
        AND user_id = ${userId}
    `

    const result = await sql`
      UPDATE posts
      SET like_count = (
        SELECT COUNT(*)::int
        FROM post_likes
        WHERE post_id = ${postId}
      )
      WHERE id = ${postId}
      RETURNING COALESCE(like_count, 0)::int AS like_count
    `

    res.json({
      success: true,
      like_count: result[0]?.like_count ?? 0,
    })
  } catch (error) {
    console.error('Unlike post error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// -------------------- OLD MESSAGES SUPPORT --------------------

app.post('/api/messages', requireFirebaseAuth, async (req, res) => {
  try {
    const { uid } = req.firebase
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      })
    }

    const userId = await resolveUserId(uid)

    if (!userId) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      })
    }

    const result = await sql`
      INSERT INTO messages (user_id, message, created_at)
      VALUES (${userId}, ${message}, NOW())
      RETURNING id, user_id, message, created_at
    `

    res.json({
      success: true,
      message: result[0],
    })
  } catch (error) {
    console.error('Message error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/messages/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10)

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user_id',
      })
    }

    const result = await sql`
      SELECT
        id,
        user_id,
        message,
        COALESCE(upvote, 0)::int AS upvote,
        created_at
      FROM messages
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `

    res.json({
      success: true,
      messages: result,
    })
  } catch (error) {
    console.error('Fetch user messages error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// -------------------- PROFILE --------------------

app.post('/api/profile/:userId/avatar', requireFirebaseAuth, async (req, res) => {
  try {
    const routeUid = req.params.userId
    const authedUid = req.firebase?.uid

    if (!authedUid || authedUid !== routeUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      })
    }

    const { imageBase64, contentType = 'image/jpeg' } = req.body

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
      })
    }

    const publicUrl = await uploadBase64Image(
      'avatars',
      authedUid,
      imageBase64,
      contentType
    )

    await sql`
      UPDATE users
      SET avatar_url = ${publicUrl}
      WHERE firebase_uid = ${authedUid}
    `

    res.json({
      success: true,
      avatarUrl: publicUrl,
    })
  } catch (error) {
    console.error('Avatar upload error:', error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const result = await sql`
      SELECT
        user_id AS id,
        firebase_uid,
        name,
        bio,
        avatar_url,
        profile_visibility
      FROM users
      WHERE firebase_uid = ${userId}
    `

    if (!result.length) {
      return res.json({
        success: false,
        error: 'Profile not found',
      })
    }

    const profile = result[0]
    const neonId = profile.id

    const echoesResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM posts
      WHERE user_id = ${neonId}
        AND is_deleted = FALSE
    `

    const followingResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM friendships
      WHERE user_id = ${neonId}
        AND status = 'accepted'
    `

    const followersResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM friendships
      WHERE friend_id = ${neonId}
        AND status = 'accepted'
    `

    profile.echoes_count = echoesResult[0]?.count ?? 0
    profile.following_count = followingResult[0]?.count ?? 0
    profile.followers_count = followersResult[0]?.count ?? 0

    res.json({
      success: true,
      profile,
    })
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    })
  }
})

app.put('/api/profile/:userId', requireFirebaseAuth, async (req, res) => {
  try {
    const routeUid = req.params.userId
    const authedUid = req.firebase?.uid

    if (!authedUid || authedUid !== routeUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      })
    }

    const { name, bio, avatarUrl, profileVisibility } = req.body

    if (
      profileVisibility &&
      !['public', 'private'].includes(profileVisibility)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid profile visibility value',
      })
    }

    const result = await sql`
      UPDATE users
      SET
        name = ${name},
        bio = ${bio},
        avatar_url = ${avatarUrl || null},
        profile_visibility = COALESCE(${profileVisibility || null}, profile_visibility)
      WHERE firebase_uid = ${authedUid}
      RETURNING
        user_id AS id,
        firebase_uid,
        name,
        bio,
        avatar_url,
        profile_visibility
    `

    res.json({
      success: true,
      profile: result[0],
    })
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    })
  }
})

// -------------------- FRIENDSHIPS BASIC --------------------

app.get('/api/friendships/status/:friendUid', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(req.params.friendUid)

    if (!myId || !friendId) {
      return res.json({
        success: true,
        relationship: 'none',
      })
    }

    if (myId === friendId) {
      return res.json({
        success: true,
        relationship: 'self',
      })
    }

    const rows = await sql`
      SELECT user_id, friend_id, status
      FROM friendships
      WHERE (user_id = ${myId} AND friend_id = ${friendId})
         OR (user_id = ${friendId} AND friend_id = ${myId})
      LIMIT 1
    `

    if (!rows.length) {
      return res.json({
        success: true,
        relationship: 'none',
      })
    }

    const row = rows[0]
    const iSent = row.user_id === myId

    let relationship = 'none'

    if (iSent) {
      if (row.status === 'accepted') relationship = 'following'
      else if (row.status === 'pending') relationship = 'requested'
      else if (row.status === 'declined') relationship = 'declined'
    } else {
      if (row.status === 'accepted') relationship = 'following'
      else if (row.status === 'pending') relationship = 'incoming_request'
    }

    res.json({
      success: true,
      relationship,
    })
  } catch (error) {
    console.error('Friendship status error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

app.post('/api/friendships/follow', requireFirebaseAuth, async (req, res) => {
  try {
    const { friendUid } = req.body

    if (!friendUid) {
      return res.status(400).json({
        success: false,
        error: 'friendUid is required',
      })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(friendUid)

    if (!myId || !friendId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    if (myId === friendId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself',
      })
    }

    const targetUser = await sql`
      SELECT profile_visibility
      FROM users
      WHERE user_id = ${friendId}
    `

    const profileVisibility = targetUser[0]?.profile_visibility || 'public'
    const initialStatus = profileVisibility === 'private' ? 'pending' : 'accepted'

    await sql`
      INSERT INTO friendships (user_id, friend_id, status, created_at, updated_at)
      VALUES (${myId}, ${friendId}, ${initialStatus}, NOW(), NOW())
      ON CONFLICT (user_id, friend_id)
      DO UPDATE SET
        status = CASE
          WHEN friendships.status = 'declined' THEN ${initialStatus}
          ELSE friendships.status
        END,
        updated_at = CASE
          WHEN friendships.status = 'declined' THEN NOW()
          ELSE friendships.updated_at
        END
    `

    res.json({
      success: true,
      status: initialStatus,
    })
  } catch (error) {
    console.error('Follow error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

app.delete('/api/friendships/unfollow', requireFirebaseAuth, async (req, res) => {
  try {
    const { friendUid } = req.body

    if (!friendUid) {
      return res.status(400).json({
        success: false,
        error: 'friendUid is required',
      })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const friendId = await resolveUserId(friendUid)

    if (!myId || !friendId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    await sql`
      DELETE FROM friendships
      WHERE user_id = ${myId}
        AND friend_id = ${friendId}
        AND status = 'accepted'
    `

    res.json({
      success: true,
    })
  } catch (error) {
    console.error('Unfollow error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

app.get('/api/friendships/following/:firebaseUid', async (req, res) => {
  try {
    const userId = await resolveUserId(req.params.firebaseUid)

    if (!userId) {
      return res.json({
        success: true,
        users: [],
      })
    }

    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u
        ON u.user_id = f.friend_id
      WHERE f.user_id = ${userId}
        AND f.status = 'accepted'
      ORDER BY u.name ASC
    `

    res.json({
      success: true,
      users: rows,
    })
  } catch (error) {
    console.error('Following list error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

app.get('/api/friendships/followers/:firebaseUid', async (req, res) => {
  try {
    const userId = await resolveUserId(req.params.firebaseUid)

    if (!userId) {
      return res.json({
        success: true,
        users: [],
      })
    }

    const rows = await sql`
      SELECT u.firebase_uid, u.name, u.avatar_url
      FROM friendships f
      JOIN users u
        ON u.user_id = f.user_id
      WHERE f.friend_id = ${userId}
        AND f.status = 'accepted'
      ORDER BY u.name ASC
    `

    res.json({
      success: true,
      users: rows,
    })
  } catch (error) {
    console.error('Followers list error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

// -------------------- USER MUTES --------------------

app.get('/api/users/:targetUid/mute-status', requireFirebaseAuth, async (req, res) => {
  try {
    const myId = await resolveUserId(req.firebase.uid)
    const targetId = await resolveUserId(req.params.targetUid)

    if (!myId || !targetId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    if (myId === targetId) {
      return res.json({
        success: true,
        muted: false,
      })
    }

    const rows = await sql`
      SELECT 1
      FROM user_mutes
      WHERE muter_user_id = ${myId}
        AND muted_user_id = ${targetId}
      LIMIT 1
    `

    res.json({
      success: true,
      muted: rows.length > 0,
    })
  } catch (error) {
    console.error('Get mute status error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

app.put('/api/users/:targetUid/mute', requireFirebaseAuth, async (req, res) => {
  try {
    const { muted } = req.body

    if (typeof muted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'muted boolean is required',
      })
    }

    const myId = await resolveUserId(req.firebase.uid)
    const targetId = await resolveUserId(req.params.targetUid)

    if (!myId || !targetId) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      })
    }

    if (myId === targetId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot mute yourself',
      })
    }

    if (muted) {
      await sql`
        INSERT INTO user_mutes (muter_user_id, muted_user_id)
        VALUES (${myId}, ${targetId})
        ON CONFLICT (muter_user_id, muted_user_id)
        DO NOTHING
      `
    } else {
      await sql`
        DELETE FROM user_mutes
        WHERE muter_user_id = ${myId}
          AND muted_user_id = ${targetId}
      `
    }

    res.json({
      success: true,
      muted,
    })
  } catch (error) {
    console.error('Set mute status error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

// -------------------- LEADERBOARD --------------------

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await sql`
      SELECT
        u.user_id,
        u.firebase_uid,
        u.name,
        u.avatar_url,
        COALESCE(SUM(COALESCE(p.like_count, 0)), 0)::int AS total_likes,
        COUNT(p.id)::int AS post_count
      FROM users u
      LEFT JOIN posts p
        ON p.user_id = u.user_id
        AND p.is_deleted = FALSE
      GROUP BY u.user_id, u.firebase_uid, u.name, u.avatar_url
      ORDER BY total_likes DESC, post_count DESC
      LIMIT 50
    `

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})