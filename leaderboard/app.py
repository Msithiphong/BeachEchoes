import os
import psycopg2
from flask import Flask, request, render_template_string, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_secret")  # not used for auth now

LEADERBOARD_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Leaderboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div class="max-w-5xl mx-auto pt-10 px-4">

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-teal-400">Leaderboard</h1>
      <div class="text-sm text-gray-300">
        Use Case #14 • BeachEchoes
      </div>
    </div>

    <!-- Filters -->
    <form method="GET" action="/leaderboard" class="bg-gray-800 rounded-xl p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="text-sm text-gray-300">View</label>
          <select name="view" class="w-full mt-1 p-2 rounded bg-gray-700">
            <option value="users" {% if view=='users' %}selected{% endif %}>Top Users</option>
            <option value="echoes" {% if view=='echoes' %}selected{% endif %}>Top Echoes</option>
          </select>
        </div>

        <div>
          <label class="text-sm text-gray-300">Period</label>
          <select name="period" class="w-full mt-1 p-2 rounded bg-gray-700">
            <option value="day" {% if period=='day' %}selected{% endif %}>Today</option>
            <option value="week" {% if period=='week' %}selected{% endif %}>This Week</option>
            <option value="month" {% if period=='month' %}selected{% endif %}>This Month</option>
            <option value="all" {% if period=='all' %}selected{% endif %}>All Time</option>
          </select>
        </div>

        <div>
          <label class="text-sm text-gray-300">Category</label>
          <select name="category" class="w-full mt-1 p-2 rounded bg-gray-700">
            <option value="all" {% if category=='all' %}selected{% endif %}>All</option>
            <option value="general" {% if category=='general' %}selected{% endif %}>General</option>
            <option value="helpful" {% if category=='helpful' %}selected{% endif %}>Helpful</option>
            <option value="funny" {% if category=='funny' %}selected{% endif %}>Funny</option>
            <option value="academic" {% if category=='academic' %}selected{% endif %}>Academic</option>
          </select>
        </div>

        <div class="flex items-end">
          <button class="w-full bg-teal-500 hover:bg-teal-600 font-bold py-2 rounded">
            Apply Filters
          </button>
        </div>
      </div>
    </form>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4">
        <div class="text-gray-300 text-sm">Echoes ({{ stats.period }})</div>
        <div class="text-3xl font-bold text-teal-300">{{ stats.echoes }}</div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <div class="text-gray-300 text-sm">Appraises ({{ stats.period }})</div>
        <div class="text-3xl font-bold text-teal-300">{{ stats.appraises }}</div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <div class="text-gray-300 text-sm">Comments ({{ stats.period }})</div>
        <div class="text-3xl font-bold text-teal-300">{{ stats.comments }}</div>
      </div>
    </div>

    <!-- Leaderboard -->
    <div class="bg-gray-800 rounded-xl shadow p-4">
      {% if view == 'users' %}
        <h2 class="text-xl font-bold mb-3 text-gray-100">Top Users</h2>
        <table class="w-full text-left">
          <thead>
            <tr class="text-gray-300 border-b border-gray-700">
              <th class="py-2">Rank</th>
              <th class="py-2">User</th>
              <th class="py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {% for row in rows %}
            <tr class="border-b border-gray-700">
              <td class="py-2 font-bold">{{ row.rank }}</td>
              <td class="py-2">{{ row.email }}</td>
              <td class="py-2 text-teal-300 font-semibold">{{ row.score }}</td>
            </tr>
            {% endfor %}
          </tbody>
        </table>
      {% else %}
        <h2 class="text-xl font-bold mb-3 text-gray-100">Top Echoes</h2>
        <table class="w-full text-left">
          <thead>
            <tr class="text-gray-300 border-b border-gray-700">
              <th class="py-2">Rank</th>
              <th class="py-2">Echo</th>
              <th class="py-2">Author</th>
              <th class="py-2">Category</th>
              <th class="py-2">Appraises</th>
            </tr>
          </thead>
          <tbody>
            {% for row in rows %}
            <tr class="border-b border-gray-700">
              <td class="py-2 font-bold">{{ row.rank }}</td>
              <td class="py-2">{{ row.preview }}</td>
              <td class="py-2">{{ row.author }}</td>
              <td class="py-2">{{ row.category }}</td>
              <td class="py-2 text-teal-300 font-semibold">{{ row.appraises }}</td>
            </tr>
            {% endfor %}
          </tbody>
        </table>
      {% endif %}
    </div>

    <div class="text-xs text-gray-400 mt-4">
      Scoring demo: +10 points per “appraise” reaction received on a user's echoes.
    </div>

  </div>
</body>
</html>
"""

def get_db_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL missing from .env")
    return psycopg2.connect(url)

ALLOWED_PERIODS = {"day": "1 day", "week": "7 days", "month": "30 days", "all": None}
ALLOWED_VIEWS = {"users", "echoes"}
ALLOWED_CATEGORIES = {"all", "general", "helpful", "funny", "academic"}

def norm_period(p):
    p = (p or "week").lower()
    return p if p in ALLOWED_PERIODS else "week"

def norm_view(v):
    v = (v or "users").lower()
    return v if v in ALLOWED_VIEWS else "users"

def norm_category(c):
    c = (c or "all").lower()
    return c if c in ALLOWED_CATEGORIES else "all"

def period_sql(col, period):
    interval = ALLOWED_PERIODS.get(period)
    if interval is None:
        return ""
    return f" AND {col} >= NOW() - INTERVAL '{interval}' "

def category_sql(category):
    if category == "all":
        return ("", [])
    return (" AND e.category = %s ", [category])

def query_user_leaderboard(period="week", category="all", limit=20):
    period = norm_period(period)
    category = norm_category(category)

    t_sql = period_sql("r.created_at", period)
    c_sql, c_params = category_sql(category)

    sql = f"""
        SELECT
            u.email,
            COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) AS score,
            RANK() OVER (
                ORDER BY COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) DESC,
                         u.user_id ASC
            ) AS rank
        FROM users u
        LEFT JOIN echoes e ON e.author_user_id = u.user_id
        LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
        WHERE 1=1
        {c_sql}
        {t_sql}
        GROUP BY u.user_id, u.email
        ORDER BY rank
        LIMIT %s;
    """
    params = c_params + [limit]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [{"rank": int(r[2]), "email": r[0], "score": int(r[1])} for r in rows]

def query_echo_leaderboard(period="week", category="all", limit=20):
    period = norm_period(period)
    category = norm_category(category)

    t_sql = period_sql("r.created_at", period)
    c_sql, c_params = category_sql(category)

    sql = f"""
        SELECT
            e.echo_id,
            u.email AS author_email,
            e.category,
            LEFT(e.content, 120) AS preview,
            COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 1 ELSE 0 END), 0) AS appraises,
            RANK() OVER (
                ORDER BY COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 1 ELSE 0 END), 0) DESC,
                         e.echo_id ASC
            ) AS rank
        FROM echoes e
        JOIN users u ON u.user_id = e.author_user_id
        LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
        WHERE 1=1
        {c_sql}
        {t_sql}
        GROUP BY e.echo_id, u.email, e.category, e.content
        ORDER BY rank
        LIMIT %s;
    """
    params = c_params + [limit]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [{
        "rank": int(r[5]),
        "echo_id": int(r[0]),
        "author": r[1],
        "category": r[2],
        "preview": r[3],
        "appraises": int(r[4])
    } for r in rows]

def query_stats(period="week", category="all"):
    period = norm_period(period)
    category = norm_category(category)

    echo_t = period_sql("e.created_at", period)
    react_t = period_sql("r.created_at", period)
    comm_t = period_sql("c.created_at", period)

    c_sql, c_params = category_sql(category)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(f"SELECT COUNT(*) FROM echoes e WHERE 1=1 {c_sql} {echo_t}", c_params)
    echoes_count = int(cur.fetchone()[0])

    cur.execute(f"""
        SELECT COUNT(*)
        FROM echo_reactions r
        JOIN echoes e ON e.echo_id = r.echo_id
        WHERE r.reaction_type='appraise'
        {c_sql}
        {react_t}
    """, c_params)
    appraises_count = int(cur.fetchone()[0])

    cur.execute(f"""
        SELECT COUNT(*)
        FROM echo_comments c
        JOIN echoes e ON e.echo_id = c.echo_id
        WHERE 1=1
        {c_sql}
        {comm_t}
    """, c_params)
    comments_count = int(cur.fetchone()[0])

    cur.close()
    conn.close()

    return {"period": period, "category": category, "echoes": echoes_count, "appraises": appraises_count, "comments": comments_count}

@app.route("/", methods=["GET"])
def home():
    return redirect(url_for("leaderboard_page"))

@app.route("/leaderboard", methods=["GET"])
def leaderboard_page():
    view = norm_view(request.args.get("view"))
    period = norm_period(request.args.get("period"))
    category = norm_category(request.args.get("category"))

    stats = query_stats(period=period, category=category)
    rows = query_user_leaderboard(period=period, category=category) if view == "users" else query_echo_leaderboard(period=period, category=category)

    return render_template_string(
        LEADERBOARD_PAGE,
        rows=rows,
        view=view,
        period=period,
        category=category,
        stats=stats
    )

@app.route("/api/leaderboard", methods=["GET"])
def api_leaderboard():
    view = norm_view(request.args.get("view"))
    period = norm_period(request.args.get("period"))
    category = norm_category(request.args.get("category"))

    if view == "users":
        return jsonify(query_user_leaderboard(period=period, category=category))
    return jsonify(query_echo_leaderboard(period=period, category=category))

@app.route("/api/stats", methods=["GET"])
def api_stats():
    period = norm_period(request.args.get("period"))
    category = norm_category(request.args.get("category"))
    return jsonify(query_stats(period=period, category=category))

if __name__ == "__main__":
    app.run(debug=True, port=5000)

