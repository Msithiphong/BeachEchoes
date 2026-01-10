import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    """Helper function to get a database connection."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("!!! ERROR: DATABASE_URL is missing from your .env file !!!")
        return None
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"Connection Error: {e}")
        return None

def list_users():
    conn = get_connection()
    if not conn: return

    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id, email, password_hash FROM users ORDER BY user_id;")
        rows = cur.fetchall()

        print("\n" + "=" * 60)
        print(f"{'ID':<5} | {'Email':<30} | {'Password Hash'}")
        print("-" * 60)
        
        if not rows:
            print("No users found.")
        else:
            for row in rows:
                print(f"{row[0]:<5} | {row[1]:<30} | {row[2]}")
        print("=" * 60 + "\n")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error listing users: {e}")

def add_user():
    email = input("Enter email: ").strip()
    password = input("Enter password: ").strip()
    
    conn = get_connection()
    if not conn: return

    try:
        cur = conn.cursor()
        # Using %s placeholders prevents SQL Injection
        cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s)", (email, password))
        conn.commit() # Important: Save changes!
        print(f"\nSUCCESS: Added user {email}")
        cur.close()
        conn.close()
    except psycopg2.errors.UniqueViolation:
        print(f"\nERROR: The email '{email}' already exists.")
    except Exception as e:
        print(f"\nError adding user: {e}")

def delete_user():
    email = input("Enter the email of the user to delete: ").strip()
    
    conn = get_connection()
    if not conn: return

    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
        
        if cur.rowcount == 0:
            print(f"\nWARNING: No user found with email '{email}'")
        else:
            conn.commit() # Important: Save changes!
            print(f"\nSUCCESS: Deleted user {email}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"\nError deleting user: {e}")

def main():
    while True:
        print("--- USER MANAGER ---")
        print("1. List Users")
        print("2. Add User")
        print("3. Delete User")
        print("4. Exit")
        
        choice = input("Select an option (1-4): ")

        if choice == '1':
            list_users()
        elif choice == '2':
            add_user()
        elif choice == '3':
            delete_user()
        elif choice == '4':
            print("Exiting...")
            break
        else:
            print("Invalid choice, please try again.\n")

if __name__ == "__main__":
    main()