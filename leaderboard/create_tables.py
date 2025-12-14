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

        # 1) USERS
        print("Creating table: users")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2) ECHOES
        print("Creating table: echoes")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS echoes (
                echo_id SERIAL PRIMARY KEY,
                author_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                category VARCHAR(50) NOT NULL DEFAULT 'general',
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3) REACTIONS
        print("Creating table: echo_reactions")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS echo_reactions (
                reaction_id SERIAL PRIMARY KEY,
                echo_id INT NOT NULL REFERENCES echoes(echo_id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                reaction_type VARCHAR(30) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (echo_id, user_id, reaction_type)
            );
        """)

        # 4) COMMENTS
        print("Creating table: echo_comments")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS echo_comments (
                comment_id SERIAL PRIMARY KEY,
                echo_id INT NOT NULL REFERENCES echoes(echo_id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5) FRIENDS (FOLLOW)
        print("Creating table: user_friends")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_friends (
                follower_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                following_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_user_id, following_user_id)
            );
        """)

        # Indexes
        print("Creating indexes")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_echo_author ON echoes(author_user_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_reactions_echo ON echo_reactions(echo_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_comments_echo ON echo_comments(echo_id);")

        # Sample users
        print("Inserting sample users")
        cur.execute("""
            INSERT INTO users (email, password_hash)
            VALUES
                ('cloud_alice@example.com', 'cloud_pass_123'),
                ('cloud_bob@test.com', 'stormy_skies_456'),
                ('cloud_carla@csulb.edu', 'pass'),
                ('cloud_diego@csulb.edu', 'pass')
            ON CONFLICT (email) DO NOTHING;
        """)

        # Sample echoes (safe re-run via NOT EXISTS)
        print("Inserting sample echoes")
        cur.execute("""
            INSERT INTO echoes (author_user_id, category, content)
            SELECT u.user_id, 'helpful', 'USU study rooms fill up fast during finals'
            FROM users u
            WHERE u.email = 'cloud_alice@example.com'
              AND NOT EXISTS (
                SELECT 1 FROM echoes e
                WHERE e.content = 'USU study rooms fill up fast during finals'
              );
        """)

        cur.execute("""
            INSERT INTO echoes (author_user_id, category, content)
            SELECT u.user_id, 'funny', 'Parking structure is a daily boss fight'
            FROM users u
            WHERE u.email = 'cloud_bob@test.com'
              AND NOT EXISTS (
                SELECT 1 FROM echoes e
                WHERE e.content = 'Parking structure is a daily boss fight'
              );
        """)

        cur.execute("""
            INSERT INTO echoes (author_user_id, category, content)
            SELECT u.user_id, 'academic', 'Library 2nd floor is quiet if you need focus'
            FROM users u
            WHERE u.email = 'cloud_carla@csulb.edu'
              AND NOT EXISTS (
                SELECT 1 FROM echoes e
                WHERE e.content = 'Library 2nd floor is quiet if you need focus'
              );
        """)

        cur.execute("""
            INSERT INTO echoes (author_user_id, category, content)
            SELECT u.user_id, 'helpful', 'Bring a jacket—some classrooms are freezing'
            FROM users u
            WHERE u.email = 'cloud_diego@csulb.edu'
              AND NOT EXISTS (
                SELECT 1 FROM echoes e
                WHERE e.content = 'Bring a jacket—some classrooms are freezing'
              );
        """)

        # Sample reactions (safe via UNIQUE + ON CONFLICT)
        print("Inserting sample reactions")
        cur.execute("""
            INSERT INTO echo_reactions (echo_id, user_id, reaction_type)
            SELECT e.echo_id, u.user_id, 'appraise'
            FROM echoes e
            JOIN users u ON u.email = 'cloud_bob@test.com'
            WHERE e.content = 'USU study rooms fill up fast during finals'
            ON CONFLICT DO NOTHING;
        """)

        cur.execute("""
            INSERT INTO echo_reactions (echo_id, user_id, reaction_type)
            SELECT e.echo_id, u.user_id, 'appraise'
            FROM echoes e
            JOIN users u ON u.email = 'cloud_carla@csulb.edu'
            WHERE e.content = 'USU study rooms fill up fast during finals'
            ON CONFLICT DO NOTHING;
        """)

        cur.execute("""
            INSERT INTO echo_reactions (echo_id, user_id, reaction_type)
            SELECT e.echo_id, u.user_id, 'appraise'
            FROM echoes e
            JOIN users u ON u.email = 'cloud_alice@example.com'
            WHERE e.content = 'Parking structure is a daily boss fight'
            ON CONFLICT DO NOTHING;
        """)

        # Sample comment (safe re-run via NOT EXISTS)
        print("Inserting sample comments")
        cur.execute("""
            INSERT INTO echo_comments (echo_id, user_id, content)
            SELECT e.echo_id, u.user_id, 'This saved me time, thanks!'
            FROM echoes e
            JOIN users u ON u.email = 'cloud_bob@test.com'
            WHERE e.content = 'USU study rooms fill up fast during finals'
              AND NOT EXISTS (
                SELECT 1 FROM echo_comments c
                WHERE c.content = 'This saved me time, thanks!'
              );
        """)

        # Sample friend relations (safe via PRIMARY KEY)
        print("Creating sample friend relationships")
        cur.execute("""
            INSERT INTO user_friends (follower_user_id, following_user_id)
            SELECT u2.user_id, u1.user_id
            FROM users u1, users u2
            WHERE u1.email = 'cloud_alice@example.com'
              AND u2.email = 'cloud_bob@test.com'
            ON CONFLICT (follower_user_id, following_user_id) DO NOTHING;
        """)

        cur.execute("""
            INSERT INTO user_friends (follower_user_id, following_user_id)
            SELECT u2.user_id, u1.user_id
            FROM users u1, users u2
            WHERE u1.email = 'cloud_carla@csulb.edu'
              AND u2.email = 'cloud_alice@example.com'
            ON CONFLICT (follower_user_id, following_user_id) DO NOTHING;
        """)

        conn.commit()
        cur.close()
        conn.close()

        print("SUCCESS: All tables created and sample data inserted.")

    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    create_tables()
