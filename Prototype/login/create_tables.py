import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# This script initializes your empty Cloud database with the table structure.

def create_tables():
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("Error: DATABASE_URL not found in .env file")
        return

    try:
        print("Connecting to Neon Cloud Database...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        # 1. Create the Users table
        print("Creating table 'users'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Add some sample data so it's not empty
        print("Adding sample data...")
        # (The ON CONFLICT DO NOTHING part prevents errors if you run this script twice)
        cur.execute("""
            INSERT INTO users (email, password_hash)
            VALUES 
                ('cloud_alice@example.com', 'cloud_pass_123'),
                ('cloud_bob@test.com', 'stormy_skies_456')
            ON CONFLICT (email) DO NOTHING;
        """)

        conn.commit()
        cur.close()
        conn.close()
        print("Success! Table created and data inserted.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_tables()