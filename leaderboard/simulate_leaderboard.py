import os
import psycopg2
import random
from dotenv import load_dotenv

load_dotenv()

def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL missing in .env")
        return

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Get all echo IDs + user IDs
    cur.execute("SELECT echo_id FROM echoes;")
    echo_ids = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT user_id FROM users;")
    user_ids = [r[0] for r in cur.fetchall()]

    if not echo_ids:
        print("No echoes found. Run create_tables.py first.")
        return
    if not user_ids:
        print("No users found. Run create_tables.py first.")
        return

    echo_id = random.choice(echo_ids)
    user_id = random.choice(user_ids)

    # Add an appraise; duplicates blocked by UNIQUE + ON CONFLICT DO NOTHING
    cur.execute("""
        INSERT INTO echo_reactions (echo_id, user_id, reaction_type)
        VALUES (%s, %s, 'appraise')
        ON CONFLICT DO NOTHING;
    """, (echo_id, user_id))

    conn.commit()
    cur.close()
    conn.close()

    print(f"Added appraise reaction: user_id={user_id} -> echo_id={echo_id}")

if __name__ == "__main__":
    main()
