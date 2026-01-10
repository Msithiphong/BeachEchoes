import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def insert_message(message):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env file")
        return False
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO messages (message) VALUES (%s)
        """, (message,))
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error inserting message: {e}")
        return False
