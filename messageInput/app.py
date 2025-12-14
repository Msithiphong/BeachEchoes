import os
import psycopg2
from flask import Flask, request, session, render_template_string, redirect, url_for, flash
from messageInput import insert_message
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a secure key in production



HTML_FORM = '''
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Message Input</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: #f8fafc; }
    .container { max-width: 500px; margin-top: 60px; background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.07); padding: 32px; }
    h2 { font-weight: 700; margin-bottom: 24px; }
    .form-control, .btn { border-radius: 6px; }
    .messages-list { margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <h2 class="text-center">Send a Message</h2>
    <form method="post" class="mb-3">
      <div class="input-group">
        <input type="text" name="message" class="form-control" placeholder="Type your message..." required>
        <button class="btn btn-primary" type="submit">Send</button>
      </div>
    </form>
    {% with messages = get_flashed_messages() %}
      {% if messages %}
        <div class="alert alert-info" role="alert">
          {% for message in messages %}
            <div>{{ message }}</div>
          {% endfor %}
        </div>
      {% endif %}
    {% endwith %}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
'''

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        message = request.form.get('message')
        if message:
            success = insert_message(message)
            if success:
                flash('Message saved!')
            else:
                flash('Error saving message.')
        return redirect(url_for('index'))
    return render_template_string(HTML_FORM)

if __name__ == '__main__':
    app.run(debug=True)
