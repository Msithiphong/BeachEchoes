import psycopg2
import os
from dotenv import load_dotenv

# 1. Load connection details from the .env file
load_dotenv()

def main():
    print("--------------------------------------------------")
    print("Attempting to connect to the database...")
    
    try:
        # 2. Connect using the variables found in .env
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            port=os.getenv("DB_PORT")
        )
        
        cur = conn.cursor()
        print(f"Success! Connected to {os.getenv('DB_HOST')}")
        
        # 3. Fetch the data
        cur.execute("SELECT user_id, email, password_hash FROM users;")
        rows = cur.fetchall()

        # 4. Print the data securely
        print("--------------------------------------------------")
        print(f"{'ID':<5} | {'Email':<30} | {'Password Hash'}")
        print("--------------------------------------------------")
        
        for row in rows:
            print(f"{row[0]:<5} | {row[1]:<30} | {row[2]}")
            
        cur.close()
        conn.close()
        print("--------------------------------------------------")
        print("Connection closed.")

    except Exception as e:
        print("\n!!! CONNECTION ERROR !!!")
        print(f"Could not connect to host: {os.getenv('DB_HOST')}")
        print(f"Error details: {e}")
        print("--------------------------------------------------")
        print("TROUBLESHOOTING:")
        print("1. Check if the ngrok tunnel is still running.")
        print("2. Check if the DB_HOST and DB_PORT in your .env file match the current ngrok screen.")

if __name__ == "__main__":
    main()