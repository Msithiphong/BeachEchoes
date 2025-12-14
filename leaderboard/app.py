import os
import psycopg2
# added jsonify
from flask import Flask, request, session, redirect, url_for, render_template_string, jsonify 
from dotenv import load_dotenv

# Load database credentials from .env
load_dotenv()

app = Flask(__name__)


app.secret_key = os.getenv("FLASK_SECRET_KEY", "super_secret_key_for_session")

# --- HTML TEMPLATES (Frontend) ---
# Usually these go in a 'templates' folder, but we keep them here for simplicity.

LOGIN_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 flex items-center justify-center h-screen text-white">
    <div class="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 class="text-3xl font-bold mb-6 text-center text-teal-400">Welcome Back</h2>

        {% if error %}
        <div class="bg-red-500 text-white p-3 rounded mb-4 text-center">
            {{ error }}
        </div>
        {% endif %}

        <form method="POST" action="/login">
            <div class="mb-4">
                <label class="block text-gray-300 mb-2">Email Address</label>
                <input type="email" name="email" required
                       class="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-teal-400">
            </div>
            <div class="mb-6">
                <label class="block text-gray-300 mb-2">Password</label>
                <input type="password" name="password" required
                       class="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-teal-400">
            </div>
            <button type="submit"
                    class="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded transition duration-200">
                Sign In
            </button>
        </form>

        <!-- ===== START ADDED: OPTIONAL DEV SHORTCUT LINK ===== -->
        <p class="text-sm text-gray-300 mt-4">
            Dev shortcut:
            <a class="text-teal-300 underline" href="/dev-login?email=cloud_alice@example.com">
                dev-login as Alice
            </a>
        </p>
        <!-- ===== END ADDED: OPTIONAL DEV SHORTCUT LINK ===== -->

    </div>
</body>
</html>
"""

DASHBOARD_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 h-screen flex flex-col items-center pt-20">
    <div class="bg-white p-10 rounded-xl shadow-xl text-center">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Success!</h1>
        <p class="text-xl text-gray-600 mb-8">
            You are logged in as
            <span class="text-teal-600 font-bold">{{ email }}</span>
        </p>

        <!-- ===== START ADDED: LEADERBOARD LINKS ON DASHBOARD ===== -->
        <div class="flex gap-3 justify-center">
            <a href="/leaderboard" class="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded">
                Leaderboard
            </a>
            <a href="/api/leaderboard" class="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded">
                Leaderboard JSON
            </a>
            <a href="/logout" class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded">
                Logout
            </a>
        </div>
        <!-- ===== END ADDED: LEADERBOARD LINKS ON DASHBOARD ===== -->

    </div>
</body>
</html>
"""

# LEADERBOARD PAGE TEMPLATE 
LEADERBOARD_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Leaderboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div class="max-w-3xl mx-auto pt-12 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-teal-400">Leaderboard</h1>
      <div class="flex gap-2">
        <a href="/dashboard" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">Dashboard</a>
        <a href="/logout" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded">Logout</a>
      </div>
    </div>

    <div class="bg-gray-800 rounded-xl shadow p-4">
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
          <tr class="border-b border-gray-700 {% if row.email == me %}bg-gray-700{% endif %}">
            <td class="py-2 font-bold">{{ row.rank }}</td>
            <td class="py-2">{{ row.email }}</td>
            <td class="py-2 text-teal-300 font-semibold">{{ row.score }}</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>

      <p class="text-xs text-gray-400 mt-3">
        Highlighted row = you. Scoring: +10 per “appraise” reaction received on your echoes.
      </p>
    </div>
  </div>
</body>
</html>
"""
# LEADERBOARD PAGE TEMPLATE

# --- DATABASE HELPER ---
def get_db_connection():
    url = os.getenv("DATABASE_URL")
    return psycopg2.connect(url)

# --- ROUTES (Backend Logic) ---

@app.route('/', methods=['GET'])
def index():
    # If already logged in, go to dashboard
    if 'user_email' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

# DEV LOGIN (SKIP LOGIN FORM) 
@app.route('/dev-login', methods=['GET'])
def dev_login():
    # Debug-only bypass. Works best when app.run(debug=True)
    if not app.debug:
        return "Dev login disabled", 403

    email = request.args.get("email", "cloud_alice@example.com")
    session["user_email"] = email
    return redirect(url_for("dashboard"))
# DEV LOGIN (SKIP LOGIN FORM) 

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        try:
            conn = get_db_connection()
            cur = conn.cursor()

            cur.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()

            cur.close()
            conn.close()

            if user:
                db_password = user[0]
                if db_password == password:
                    session['user_email'] = email
                    return redirect(url_for('dashboard'))
                else:
                    error = "Invalid password."
            else:
                error = "User not found."

        except Exception as e:
            error = f"Database error: {e}"

    return render_template_string(LOGIN_PAGE, error=error)

@app.route('/dashboard')
def dashboard():
    if 'user_email' not in session:
        return redirect(url_for('login'))
    return render_template_string(DASHBOARD_PAGE, email=session['user_email'])

@app.route('/logout')
def logout():
    session.pop('user_email', None)
    return redirect(url_for('login'))

#  LEADERBOARD QUERY HELPER 
def compute_user_leaderboard(limit=20):
    """
    Score rule (simple demo):
    +10 points per 'appraise' reaction received on user's echoes.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            u.user_id,
            u.email,
            COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) AS score,
            RANK() OVER (
                ORDER BY COALESCE(SUM(CASE WHEN r.reaction_type='appraise' THEN 10 ELSE 0 END), 0) DESC,
                         u.user_id ASC
            ) AS rank
        FROM users u
        LEFT JOIN echoes e ON e.author_user_id = u.user_id
        LEFT JOIN echo_reactions r ON r.echo_id = e.echo_id
        GROUP BY u.user_id, u.email
        ORDER BY rank
        LIMIT %s;
    """, (limit,))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [{"rank": int(r[3]), "user_id": r[0], "email": r[1], "score": int(r[2])} for r in rows]
# LEADERBOARD QUERY HELPER 

# LEADERBOARD JSON ENDPOINT 
@app.route("/api/leaderboard", methods=["GET"])
def leaderboard_api():
    if "user_email" not in session:
        return jsonify({"error": "not_authenticated"}), 401
    return jsonify(compute_user_leaderboard())
#  LEADERBOARD JSON ENDPOINT 

# LEADERBOARD VISUAL PAGE ENDPOINT 
@app.route("/leaderboard", methods=["GET"])
def leaderboard_page():
    if "user_email" not in session:
        return redirect(url_for("login"))
    rows = compute_user_leaderboard()
    return render_template_string(LEADERBOARD_PAGE, rows=rows, me=session["user_email"])
# LEADERBOARD VISUAL PAGE ENDPOINT # added jsonify

if __name__ == '__main__':
    # Running on port 5000
    app.run(debug=True, port=5000)
