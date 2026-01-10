import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Delete all rows from messages table
cur.execute("DELETE FROM messages;")
conn.commit()
print("All data in messages table has been deleted.")

cur.close()
conn.close()