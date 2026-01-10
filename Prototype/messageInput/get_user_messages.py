import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()


# Print contents of messages table only
print("Contents of messages table:")
cur.execute("SELECT * FROM messages ORDER BY created_at DESC;")
rows = cur.fetchall()
for row in rows:
    print(row)

cur.close()
conn.close()