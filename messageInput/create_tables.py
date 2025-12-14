import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def create_tables():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env file")
        return
    try:
        print("Connecting to Neon Cloud Database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        print("Creating table 'messages'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("Success! Table 'messages' created.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_tables()
