import os
import psycopg2
from flask import Flask, request, session, redirect, url_for, render_template_string
from dotenv import load_dotenv

# Load database credentials from .env
load_dotenv()

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_session'  # Change this in production!

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
        <p class="text-xl text-gray-600 mb-8">You are logged in as <span class="text-teal-600 font-bold">{{ email }}</span></p>
        <a href="/logout" class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded">Logout</a>
    </div>
</body>
</html>
"""

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

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            # Query the database for the user
            # SECURITY NOTE: We are comparing plain text passwords for this demo.
            # In a real app, you MUST use password hashing (e.g., bcrypt).
            cur.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            
            cur.close()
            conn.close()

            if user:
                # user[0] is the password from the database
                db_password = user[0]
                
                if db_password == password:
                    # Success! Save user in session
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

if __name__ == '__main__':
    # Running on port 5000
    app.run(debug=True, port=5000)