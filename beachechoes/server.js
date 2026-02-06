import express from 'express'
import { neon } from '@neondatabase/serverless'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const sql = neon(process.env.DATABASE_URL)

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const users = await sql`SELECT user_id AS id, name, email, password_hash, created_at FROM users WHERE email = ${email}`
    
    if (users.length && users[0].password_hash === password) {
      const { password_hash, ...userWithoutPassword } = users[0]
      res.json({ success: true, user: userWithoutPassword })
    } else {
      res.json({ success: false, error: 'Invalid credentials' })
    }
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
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

app.post('/api/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body
    const result = await sql `
      SELECT * FROM users WHERE email = ${email} 
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
    
    const result = await sql`
      INSERT INTO messages (message, created_at)
      VALUES (${message}, NOW())
      RETURNING id, message, created_at
    `
    
    res.json({ success: true, message: result[0] })
  } catch (error) {
    res.json({ success: false, error: error.message })
  }
})

// -------------------- LEADERBOARD (INLINE IN server.js) --------------------

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
function normCategory(c) {
  const s = String(c ?? "all").toLowerCase();
  return ALLOWED_CATEGORIES.has(s) ? s : "all";
}
function clampLimit(n) {
  const x = Number.parseInt(n ?? "20", 10);
  return Number.isFinite(x) ? Math.max(1, Math.min(x, 100)) : 20;
}

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
  const params = [];
  const whereParts = ["WHERE 1=1"];
  addCategory(whereParts, params, category);
  addPeriod(whereParts, params, "r.created_at", period);

  params.push(limit);

  const q = `
    SELECT
      u.email,
      COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) AS score,
      RANK() OVER (
        ORDER BY
          COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) DESC,
          u.user_id ASC
      ) AS rank
    FROM users u
    LEFT JOIN echoes e ON e.author_user_id = u.user_id
    LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
    ${whereParts.join("\n")}
    GROUP BY u.user_id, u.email
    ORDER BY rank
    LIMIT $${params.length};
  `;

  const rows = await sql.query(q, params);
  return rows.map((r) => ({ rank: +r.rank, email: r.email, score: +r.score }));
}

async function queryEchoLeaderboard({ period, category, limit }) {
  const params = [];
  const whereParts = ["WHERE 1=1"];
  addCategory(whereParts, params, category);
  addPeriod(whereParts, params, "r.created_at", period);

  params.push(limit);

  const q = `
    SELECT
      e.echo_id,
      u.email AS author_email,
      e.category,
      LEFT(e.content, 120) AS preview,
      COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 1 ELSE 0 END), 0) AS appraises,
      RANK() OVER (
        ORDER BY
          COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 1 ELSE 0 END), 0) DESC,
          e.echo_id ASC
      ) AS rank
    FROM echoes e
    JOIN users u ON u.user_id = e.author_user_id
    LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
    ${whereParts.join("\n")}
    GROUP BY e.echo_id, u.email, e.category, e.content
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


app.listen(3000, () => console.log('Server running on http://localhost:3000'))