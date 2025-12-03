import psycopg2

# --- CONFIGURATION ---
# Update these with your own details
DB_HOST = "localhost"
DB_NAME = "bechoes_data"       # The name of the database you created (e.g. 'sandbox' or 'my_project')
DB_USER = "postgres"      # The default username is usually 'postgres'
DB_PASS = "cgbe501(ago606)" # The superuser password you created during installation
DB_PORT = "5432"

def get_users():
    conn = None
    try:
        # 1. Establish the connection
        print(f"Connecting to database: {DB_NAME}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )

        # 2. Create a cursor (the tool that executes the SQL)
        cur = conn.cursor()

        # 3. Execute the Query
        print("Fetching users...")
        cur.execute("SELECT user_id, email, password_hash FROM users;")

        # 4. Fetch all results
        rows = cur.fetchall()

        # 5. Print the results nicely
        print("-" * 50)
        print(f"{'ID':<5} | {'Email':<25} | {'Password Hash'}")
        print("-" * 50)

        for row in rows:
            # row is a tuple: (id, email, password)
            user_id = row[0]
            email = row[1]
            password = row[2]
            print(f"{user_id:<5} | {email:<25} | {password}")

        print("-" * 50)

        # Close the cursor
        cur.close()

    except psycopg2.Error as e:
        print("\n--- DATABASE ERROR ---")
        print(e)
        print("----------------------")
        print("Tip: Double check your password and database name variables.")

    finally:
        # 6. Close the connection
        if conn is not None:
            conn.close()
            print("\nDatabase connection closed.")

if __name__ == "__main__":
    get_users()